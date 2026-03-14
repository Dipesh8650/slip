from __future__ import annotations

import random
from collections.abc import Callable

ADJECTIVES = [
    "silent", "quick", "bold", "calm", "bright", "deep", "fair", "gentle",
    "happy", "keen", "lively", "mild", "noble", "odd", "pure", "quiet",
    "rapid", "soft", "tender", "urban", "vivid", "warm", "young",
]
NOUNS = [
    "river", "forest", "cloud", "stone", "field", "bridge", "shadow", "flame",
    "wave", "path", "star", "wind", "brook", "hill", "dawn", "frost",
    "glade", "haven", "ledge", "marsh", "ridge", "shore", "vale", "grove",
]

RESERVED_SLUGS = frozenset({
    "api", "docs", "openapi.json", "health", "assets", "favicon.ico",
})

MAX_ATTEMPTS = 10


def normalize_slug(slug: str) -> str:
    return slug.strip().lower()


def is_valid_slug(slug: str) -> bool:
    import re
    if not slug or len(slug) < 3 or len(slug) > 80:
        return False
    if not re.fullmatch(r"^[a-z0-9-]{3,80}$", slug):
        return False
    if slug in RESERVED_SLUGS:
        return False
    return True


def generate_random_slug() -> str:
    adj = random.choice(ADJECTIVES)
    noun = random.choice(NOUNS)
    num = random.randint(100, 999)
    return f"{adj}-{noun}-{num}"


def generate_unique_slug(exists_fn: Callable[[str], bool]) -> str:
    for _ in range(MAX_ATTEMPTS):
        slug = generate_random_slug()
        if not exists_fn(slug):
            return slug
    raise RuntimeError("Could not generate unique slug after maximum attempts")
