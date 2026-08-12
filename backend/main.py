"""FastAPI gateway for Jarvis chat, memory, profiles, and safe tools."""
from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .config import PROJECT_ROOT, settings
from .database import Database
from .tools import TOOL_MANIFEST, ToolError, execute_tool


database = Database(settings.database_path)


@asynccontextmanager
async def lifespan(_: FastAPI):
    database.initialize()
    yield


app = FastAPI(title="Jarvis API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5500", "http://127.0.0.1:5500"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    session_id: str = Field(min_length=8, max_length=128)
    messages: list[dict[str, Any]]
    uses_vision: bool = False
    profile_id: str | None = Field(default=None, max_length=128)


class ProfileRequest(BaseModel):
    display_name: str | None = Field(default=None, max_length=80)
    preferences: dict[str, Any] = Field(default_factory=dict)


class ToolRequest(BaseModel):
    name: str
    arguments: dict[str, Any] = Field(default_factory=dict)


@app.get("/api/health")
async def health() -> dict[str, Any]:
    return {"status": "ok", "text_model": settings.text_model, "vision_model": settings.vision_model, "fine_tuned_model": settings.fine_tuned_model or None}


@app.get("/api/tools")
async def list_tools() -> dict[str, Any]:
    return {"tools": TOOL_MANIFEST}


@app.post("/api/tools/execute")
async def run_tool(request: ToolRequest) -> dict[str, Any]:
    try:
        return {"tool": request.name, "output": execute_tool(request.name, request.arguments)}
    except ToolError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@app.get("/api/profiles/{profile_id}")
async def get_profile(profile_id: str) -> dict[str, Any]:
    profile = database.get_profile(profile_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found.")
    return profile


@app.put("/api/profiles/{profile_id}")
async def put_profile(profile_id: str, request: ProfileRequest) -> dict[str, str]:
    database.save_profile(profile_id, request.display_name, request.preferences)
    return {"status": "saved"}


@app.post("/api/chat")
async def chat(request: ChatRequest) -> JSONResponse:
    if not settings.openai_api_key or settings.openai_api_key == "YOUR_API_KEY_HERE":
        raise HTTPException(status_code=503, detail="The server is missing OPENAI_API_KEY. Add it to .env before chatting.")
    if not request.messages:
        raise HTTPException(status_code=400, detail="A chat message is required.")

    model = settings.model_for(request.uses_vision)
    payload: dict[str, Any] = {"model": model, "messages": request.messages, "temperature": 0.7, "max_tokens": 700}

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.openai_api_key}", "Content-Type": "application/json"},
                json=payload,
            )
        if response.is_error:
            detail = response.json().get("error", {}).get("message", "The AI service could not complete the request.")
            raise HTTPException(status_code=response.status_code, detail=detail)
        reply = response.json()["choices"][0]["message"]["content"]
        if isinstance(reply, list):
            reply = "".join(part.get("text", "") for part in reply if isinstance(part, dict))
        reply = str(reply).strip()
    except httpx.HTTPError as error:
        raise HTTPException(status_code=502, detail="Jarvis could not reach the AI service.") from error
    database.ensure_session(request.session_id, request.profile_id)
    database.add_message(request.session_id, "user", request.messages[-1].get("content", ""))
    database.add_message(request.session_id, "assistant", reply)
    return JSONResponse({"reply": reply, "model": model})


app.mount("/", StaticFiles(directory=Path(PROJECT_ROOT), html=True), name="frontend")

