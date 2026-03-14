from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.password import hash_password, verify_password
from app.domain.note import Note
from app.infrastructure.sqlalchemy_note_repository import SQLAlchemyNoteRepository
from app.use_cases import create_random_note as create_random_note_uc
from app.use_cases import get_or_create_note as get_or_create_note_uc
from app.use_cases import update_note as update_note_uc
from app.use_cases.get_or_create_note import InvalidSlugError as GetInvalidSlugError
from app.use_cases.update_note import InvalidSlugError as UpdateInvalidSlugError, NoteNotFoundError

from .schemas import NoteResponse, NoteUpdateRequest, NoteProtectionRequest, ProtectedNoteResponse

router = APIRouter(prefix="/api/notes", tags=["notes"])


def _note_to_response(note: Note, protected: bool = False) -> NoteResponse:
    return NoteResponse(
        id=note.id,
        slug=note.slug,
        title=note.title,
        content=note.content,
        created_at=note.created_at,
        updated_at=note.updated_at,
        protected=protected,
    )


def _get_repo(db: Session) -> SQLAlchemyNoteRepository:
    return SQLAlchemyNoteRepository(db)


@router.post("/random", response_model=NoteResponse, status_code=201)
def post_notes_random(db: Session = Depends(get_db)):
    repo = _get_repo(db)
    note = create_random_note_uc.create_random_note(repo)
    return _note_to_response(note)


@router.get("/{slug}", response_model=NoteResponse | ProtectedNoteResponse)
def get_note_by_slug(
    slug: str,
    db: Session = Depends(get_db),
    x_note_password: str | None = Header(None, alias="X-Note-Password"),
):
    repo = _get_repo(db)
    try:
        note = get_or_create_note_uc.get_or_create_note_by_slug(repo, slug)
    except GetInvalidSlugError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    pwd_hash = repo.get_password_hash(slug)
    if pwd_hash:
        if not x_note_password or not verify_password(x_note_password, pwd_hash):
            # Nunca devolver title/content: el schema usa title=None, content=None
            return ProtectedNoteResponse(
                id=note.id,
                slug=note.slug,
                created_at=note.created_at,
                updated_at=note.updated_at,
            )
    return _note_to_response(note, protected=bool(pwd_hash))


@router.put("/{slug}", response_model=NoteResponse)
def put_note_by_slug(
    slug: str,
    body: NoteUpdateRequest,
    db: Session = Depends(get_db),
    x_note_password: str | None = Header(None, alias="X-Note-Password"),
):
    repo = _get_repo(db)
    pwd_hash = repo.get_password_hash(slug)
    if pwd_hash and (not x_note_password or not verify_password(x_note_password, pwd_hash)):
        raise HTTPException(status_code=403, detail="Password required")
    try:
        note = update_note_uc.update_note(
            repo, slug, title=body.title, content=body.content
        )
    except UpdateInvalidSlugError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except NoteNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    return _note_to_response(note)


@router.put("/{slug}/protection")
def put_note_protection(
    slug: str,
    body: NoteProtectionRequest,
    db: Session = Depends(get_db),
    x_note_password: str | None = Header(None, alias="X-Note-Password"),
):
    repo = _get_repo(db)
    note = repo.get_by_slug(slug)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    pwd_hash = repo.get_password_hash(slug)
    if body.password is None:
        if pwd_hash and (not x_note_password or not verify_password(x_note_password, pwd_hash)):
            raise HTTPException(status_code=403, detail="Current password required to remove")
        if pwd_hash:
            repo.clear_password_hash(slug)
    elif body.password == "":
        if pwd_hash and (not x_note_password or not verify_password(x_note_password, pwd_hash)):
            raise HTTPException(status_code=403, detail="Current password required to remove")
        repo.clear_password_hash(slug)
    else:
        if pwd_hash and (not x_note_password or not verify_password(x_note_password, pwd_hash)):
            raise HTTPException(status_code=403, detail="Current password required to change")
        repo.set_password_hash(slug, hash_password(body.password))
    return {"ok": True}
