from __future__ import annotations

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.routes_notes import router as notes_router
from app.api.schemas import HealthResponse
from app.core.config import get_settings
from app.core.database import get_db
from app.infrastructure.sqlalchemy_note_repository import SQLAlchemyNoteRepository
from app.use_cases import create_random_note as create_random_note_uc

app = FastAPI(title="Slip", description="URL-first note app")
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(notes_router)


@app.get("/api/health", response_model=HealthResponse)
def health(db: Session = Depends(get_db)):
    try:
        db.execute(text(
            "SELECT id, slug, title, content, created_at, updated_at, "
            "password_hash FROM notes LIMIT 0"
        ))
    except SQLAlchemyError:
        return JSONResponse(
            status_code=503,
            content={"detail": "Database unavailable"},
        )
    return HealthResponse()


@app.get("/")
def root_redirect(db: Session = Depends(get_db)):
    repo = SQLAlchemyNoteRepository(db)
    note = create_random_note_uc.create_random_note(repo)
    return RedirectResponse(url=f"/{note.slug}", status_code=307)
