from __future__ import annotations

from sqlalchemy.orm import Session

from app.domain.note import Note
from app.infrastructure.models import NoteModel
from app.repositories.note_repository import NoteRepository


class SQLAlchemyNoteRepository(NoteRepository):
    def __init__(self, session: Session) -> None:
        self._session = session

    def get_by_slug(self, slug: str) -> Note | None:
        row = self._session.query(NoteModel).filter(NoteModel.slug == slug).first()
        return self._to_note(row) if row else None

    def create(self, slug: str, title: str | None = None, content: str = "") -> Note:
        normalized_title = (title.strip() or None) if title else None
        row = NoteModel(slug=slug, title=normalized_title, content=content)
        self._session.add(row)
        self._session.commit()
        self._session.refresh(row)
        return self._to_note(row)

    def update(self, slug: str, *, title: str | None = None, content: str | None = None) -> Note | None:
        row = self._session.query(NoteModel).filter(NoteModel.slug == slug).first()
        if not row:
            return None
        if title is not None:
            row.title = title.strip() or None
        if content is not None:
            row.content = content
        self._session.commit()
        self._session.refresh(row)
        return self._to_note(row)

    def exists_by_slug(self, slug: str) -> bool:
        return self._session.query(NoteModel).filter(NoteModel.slug == slug).first() is not None

    def get_password_hash(self, slug: str) -> str | None:
        row = self._session.query(NoteModel).filter(NoteModel.slug == slug).first()
        return row.password_hash if row else None

    def set_password_hash(self, slug: str, password_hash: str) -> None:
        row = self._session.query(NoteModel).filter(NoteModel.slug == slug).first()
        if row:
            row.password_hash = password_hash
            self._session.commit()

    def clear_password_hash(self, slug: str) -> None:
        row = self._session.query(NoteModel).filter(NoteModel.slug == slug).first()
        if row:
            row.password_hash = None
            self._session.commit()

    @staticmethod
    def _to_note(row: NoteModel) -> Note:
        return Note(
            id=row.id,
            slug=row.slug,
            title=row.title,
            content=row.content,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )
