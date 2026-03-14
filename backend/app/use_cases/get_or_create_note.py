from __future__ import annotations

from app.domain.note import Note
from app.repositories.note_repository import NoteRepository
from app.services.slug_service import is_valid_slug, normalize_slug


class InvalidSlugError(ValueError):
    pass


def get_or_create_note_by_slug(repo: NoteRepository, slug: str) -> Note:
    normalized = normalize_slug(slug)
    if not is_valid_slug(normalized):
        raise InvalidSlugError(f"Invalid slug: {slug}")
    existing = repo.get_by_slug(normalized)
    if existing:
        return existing
    return repo.create(slug=normalized, title=None, content="")
