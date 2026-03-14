from __future__ import annotations

from app.domain.note import Note
from app.repositories.note_repository import NoteRepository
from app.services.slug_service import is_valid_slug, normalize_slug


class InvalidSlugError(ValueError):
    pass


class NoteNotFoundError(ValueError):
    pass


def update_note(
    repo: NoteRepository,
    slug: str,
    *,
    title: str | None = None,
    content: str | None = None,
) -> Note:
    normalized = normalize_slug(slug)
    if not is_valid_slug(normalized):
        raise InvalidSlugError(f"Invalid slug: {slug}")
    note = repo.update(normalized, title=title, content=content)
    if note is None:
        raise NoteNotFoundError(f"Note not found: {normalized}")
    return note
