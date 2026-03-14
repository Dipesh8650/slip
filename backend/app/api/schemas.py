from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class NoteResponse(BaseModel):
    id: int
    slug: str
    title: str | None
    content: str
    created_at: datetime
    updated_at: datetime
    protected: bool = False


class ProtectedNoteResponse(BaseModel):
    """Respuesta para nota protegida: nunca incluir title ni content."""

    id: int
    slug: str
    protected: bool = True
    title: None = None
    content: None = None
    created_at: datetime
    updated_at: datetime


class NoteUpdateRequest(BaseModel):
    title: str | None = None
    content: str | None = None


class NoteProtectionRequest(BaseModel):
    password: str | None = None
    current_password: str | None = None


class HealthResponse(BaseModel):
    status: str = "ok"
