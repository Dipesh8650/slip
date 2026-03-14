import type { Note } from "./types";

const BASE = "/api";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { password?: string } = {}
): Promise<T> {
  const { password, ...init } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (password) headers["X-Note-Password"] = password;
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(
      (err as { detail?: string }).detail ?? res.statusText,
      res.status
    );
  }
  return res.json() as Promise<T>;
}

export async function createRandomNote(): Promise<Note> {
  return request<Note>("/notes/random", { method: "POST" });
}

export async function getOrCreateNote(slug: string, password?: string): Promise<Note> {
  return request<Note>(`/notes/${encodeURIComponent(slug)}`, { password });
}

export async function updateNote(
  slug: string,
  data: { title?: string | null; content?: string },
  password?: string
): Promise<Note> {
  return request<Note>(`/notes/${encodeURIComponent(slug)}`, {
    method: "PUT",
    body: JSON.stringify(data),
    password,
  });
}

export async function setNoteProtection(
  slug: string,
  body: { password?: string | null; current_password?: string | null },
  currentPassword?: string
): Promise<void> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (currentPassword) headers["X-Note-Password"] = currentPassword;
  const res = await fetch(`${BASE}/notes/${encodeURIComponent(slug)}/protection`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error((err as { detail?: string }).detail ?? res.statusText);
  }
}
