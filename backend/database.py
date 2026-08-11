"""Small SQLite persistence layer for anonymous chat sessions and profiles."""
from __future__ import annotations

import json
import sqlite3
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


class Database:
    def __init__(self, path: Path) -> None:
        self.path = path

    def connect(self) -> sqlite3.Connection:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(self.path)
        connection.row_factory = sqlite3.Row
        return connection

    def initialize(self) -> None:
        with self.connect() as connection:
            connection.executescript(
                """
                PRAGMA foreign_keys = ON;
                CREATE TABLE IF NOT EXISTS profiles (
                    profile_id TEXT PRIMARY KEY,
                    display_name TEXT,
                    preferences_json TEXT NOT NULL DEFAULT '{}',
                    updated_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS chat_sessions (
                    session_id TEXT PRIMARY KEY,
                    profile_id TEXT REFERENCES profiles(profile_id),
                    title TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS chat_messages (
                    message_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT NOT NULL REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
                    role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
                    content_json TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                """
            )

    @staticmethod
    def now() -> str:
        return datetime.now(UTC).isoformat()

    def ensure_session(self, session_id: str, profile_id: str | None = None) -> None:
        now = self.now()
        with self.connect() as connection:
            connection.execute(
                """INSERT INTO chat_sessions(session_id, profile_id, created_at, updated_at)
                   VALUES (?, ?, ?, ?)
                   ON CONFLICT(session_id) DO UPDATE SET updated_at = excluded.updated_at""",
                (session_id, profile_id, now, now),
            )

    def add_message(self, session_id: str, role: str, content: Any) -> None:
        with self.connect() as connection:
            connection.execute(
                "INSERT INTO chat_messages(session_id, role, content_json, created_at) VALUES (?, ?, ?, ?)",
                (session_id, role, json.dumps(content), self.now()),
            )
            connection.execute("UPDATE chat_sessions SET updated_at = ? WHERE session_id = ?", (self.now(), session_id))

    def save_profile(self, profile_id: str, display_name: str | None, preferences: dict[str, Any]) -> None:
        with self.connect() as connection:
            connection.execute(
                """INSERT INTO profiles(profile_id, display_name, preferences_json, updated_at)
                   VALUES (?, ?, ?, ?)
                   ON CONFLICT(profile_id) DO UPDATE SET
                     display_name = excluded.display_name,
                     preferences_json = excluded.preferences_json,
                     updated_at = excluded.updated_at""",
                (profile_id, display_name, json.dumps(preferences), self.now()),
            )

    def get_profile(self, profile_id: str) -> dict[str, Any] | None:
        with self.connect() as connection:
            row = connection.execute("SELECT * FROM profiles WHERE profile_id = ?", (profile_id,)).fetchone()
        if row is None:
            return None
        return {"profile_id": row["profile_id"], "display_name": row["display_name"], "preferences": json.loads(row["preferences_json"])}

