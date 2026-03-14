from __future__ import annotations

from app.domain.note import Note
from app.repositories.note_repository import NoteRepository
from app.services.slug_service import generate_unique_slug


def create_random_note(repo: NoteRepository) -> Note:
    slug = generate_unique_slug(repo.exists_by_slug)
    return repo.create(slug=slug, title=None, content="")
