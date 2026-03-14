from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class Note:
    id: int
    slug: str
    title: str | None
    content: str
    created_at: datetime
    updated_at: datetime
