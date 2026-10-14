# Slip — URL-First Minimalist Online Notepad

[![GitHub stars](https://img.shields.io/github/stars/martinezpascualdani/slip?style=flat)](https://github.com/martinezpascualdani/slip)
[![GitHub forks](https://img.shields.io/github/forks/martinezpascualdani/slip?style=flat)](https://github.com/martinezpascualdani/slip)
[![GitHub issues](https://img.shields.io/github/issues/martinezpascualdani/slip?style=flat)](https://github.com/martinezpascualdani/slip)
[![Docker](https://img.shields.io/badge/docker-ready-2496ed?style=flat&logo=docker)](https://www.docker.com/)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat)](LICENSE)
[![Backend](https://img.shields.io/badge/backend-FastAPI-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Frontend](https://img.shields.io/badge/frontend-React-61dafb?style=flat&logo=react)](https://react.dev/)

> **The URL is the note.**

Slip is a minimalist **online notepad** where every note is a URL.

Open `/` to create a note instantly.  
Open `/<slug>` to create or edit that note.

No accounts. No dashboards. No friction.

Inspired by pastebins and ephemeral note apps, Slip removes friction between opening a link and writing.

![Slip — URL-first minimalist online notepad](docs/main_page.png)

---

## Live demo

*A public demo will be available soon.*

---

## Why Slip?

Most note apps start with an account, dashboards, and note lists.

Slip takes the opposite approach:

- The **URL is the note**
- No accounts
- No friction
- No navigation

If you have the link, you have the note.

---

## Features

- **URL-first notes**  
  Every note lives at its own URL. No accounts, no dashboards.

- **Instant auto-save**  
  Your content is saved automatically as you type.

- **Shareable links**  
  Send a link and others can read your note instantly.

- **Viewing mode**
  Share `/v/<slug>` to hide editing controls. This is a presentation mode, not an access restriction: recipients can remove `/v/` to edit. Note passwords apply to both modes.

- **Password protection**  
  Protect individual notes with a password.

- **Concurrent edit detection**  
  Detect remote changes and reload if someone else edits the note.

- **Bilingual interface**  
  English and Spanish UI.

---

## Use cases

Slip is useful for:

- sharing quick notes
- temporary pastebin content
- collaborative drafts
- simple documentation links

---

## Quick start

You can run Slip locally in under a minute using Docker.

**Requirements:** Docker and Docker Compose.

```bash
git clone https://github.com/martinezpascualdani/slip.git
cd Slip
cp .env.example .env
docker compose up --build
```

Open **http://localhost:3000**. Go to `/` to create a note, `/<slug>` to create or edit, `/v/<slug>` for viewing mode, which hides editing controls without restricting editing access.

---

## Architecture

Slip follows a clean layered architecture:

```
React SPA
   │
   ▼
Nginx (reverse proxy)
   │
   ▼
FastAPI backend
   │
   ▼
PostgreSQL
```

---

## Tech stack

| Layer | Stack |
|-------|--------|
| **Frontend** | React, TypeScript, Vite, Tailwind CSS |
| **Backend** | Python, FastAPI, SQLAlchemy |
| **Database** | PostgreSQL |
| **Deploy** | Docker Compose, Nginx (reverse proxy for `/api`) |

---

## API overview

The app serves the API under `/api/` (proxied to the backend).

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/notes/random` | Create a note with a random slug (201). |
| `GET`  | `/api/notes/{slug}` | Get or create note by slug (200). Send `X-Note-Password` for protected notes. |
| `PUT`  | `/api/notes/{slug}` | Update title and/or content. 403 if protected and missing/invalid password. |
| `PUT`  | `/api/notes/{slug}/protection` | Set or remove note password. |
| `GET`  | `/api/health` | Health check (no DB). |

Slugs: `^[a-z0-9-]{3,80}$`, lowercase. Reserved slugs (e.g. `api`, `health`) are rejected.

---

## Development

**Backend (local)**

```bash
cd backend
python -m venv .venv && source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
cp ../.env.example .env  # set POSTGRES_HOST=localhost etc.
alembic upgrade head
uvicorn app.main:app --reload
```

**Frontend (local)**

```bash
cd frontend
npm install
npm run dev
```

Vite proxies `/api` to `http://localhost:8000`.

**Migrations**

- Applied automatically when the backend container starts.
- Manual: `docker compose exec backend alembic upgrade head`
- New revision: `docker compose exec backend alembic revision --autogenerate -m "description"`

---

## Project structure (backend)

| Layer | Role |
|-------|------|
| `core/` | Config, DB session, password hashing |
| `domain/` | `Note` entity (no ORM) |
| `repositories/` | `NoteRepository` interface |
| `infrastructure/` | SQLAlchemy model and repository implementation |
| `services/` | Slug generation and validation |
| `use_cases/` | Create random note, get-or-create, update, protection |
| `api/` | Pydantic schemas, routes, health |

---

## Contributing

Contributions are welcome.  
Open an issue to discuss ideas or improvements.

---

## License

MIT © [WHOAMI](https://whoamicorp.com)

---

📄 **[README en español](README.es.md)**
