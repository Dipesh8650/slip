from __future__ import annotations

from abc import ABC, abstractmethod

from app.domain.note import Note


class NoteRepository(ABC):
    @abstractmethod
    def get_by_slug(self, slug: str) -> Note | None: ...

    @abstractmethod
    def create(self, slug: str, title: str | None = None, content: str = "") -> Note: ...

    @abstractmethod
    def update(self, slug: str, *, title: str | None = None, content: str | None = None) -> Note | None: ...

    @abstractmethod
    def exists_by_slug(self, slug: str) -> bool: ...

    @abstractmethod
    def get_password_hash(self, slug: str) -> str | None: ...

    @abstractmethod
    def set_password_hash(self, slug: str, password_hash: str) -> None: ...

    @abstractmethod
    def clear_password_hash(self, slug: str) -> None: ...
