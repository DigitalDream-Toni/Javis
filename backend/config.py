"""Environment-backed settings for the Jarvis server."""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]


def load_dotenv() -> None:
    """Load simple KEY=VALUE pairs locally without adding a runtime dependency."""
    env_file = PROJECT_ROOT / ".env"
    if not env_file.exists():
        return
    for raw_line in env_file.read_text(encoding="utf-8-sig").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip().lstrip("\ufeff")
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


load_dotenv()


@dataclass(frozen=True)
class Settings:
    groq_api_key: str = os.getenv("GROQ_API_KEY", "")
    text_model: str = os.getenv("TEXT_MODEL", "llama-3.3-70b-versatile")
    vision_model: str = os.getenv("VISION_MODEL", "qwen/qwen3.6-27b")
    fine_tuned_model: str = os.getenv("FINE_TUNED_MODEL", "")
    database_path: Path = PROJECT_ROOT / os.getenv("DATABASE_PATH", "data/jarvis.db")

    def model_for(self, uses_vision: bool) -> str:
        if uses_vision:
            return self.vision_model
        return self.fine_tuned_model or self.text_model


settings = Settings()

