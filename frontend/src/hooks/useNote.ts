import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getOrCreateNote, updateNote, setNoteProtection as setNoteProtectionApi, ApiError } from "../lib/apiClient";
import type { Note as NoteType, SaveStatus } from "../lib/types";

const DEBOUNCE_MS = 600;
const POLL_INTERVAL_MS = 4_000;

export function useNote(slug: string) {
  const [note, setNote] = useState<NoteType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [remoteUpdated, setRemoteUpdated] = useState(false);
  const [justSynced, setJustSynced] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const remoteNoteRef = useRef<NoteType | null>(null);
  const saveStatusRef = useRef<SaveStatus>("idle");
  const appliedRemoteRef = useRef(false);
  const passwordRef = useRef<string | null>(null);
  const navigate = useNavigate();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<{ title?: string; content?: string } | null>(null);

  saveStatusRef.current = saveStatus;

  const isLocked = Boolean(
    note?.protected && (note.content === undefined || note.content === null)
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setUnlockError(null);
    setRemoteUpdated(false);
    remoteNoteRef.current = null;
    passwordRef.current = null;
    getOrCreateNote(slug)
      .then((data) => {
        if (!cancelled) {
          setNote(data);
          if (data.slug !== slug) {
            navigate(`/${data.slug}`, { replace: true });
          }
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, navigate]);

  const unlock = useCallback(
    (password: string) => {
      setUnlockError(null);
      getOrCreateNote(slug, password)
        .then((data) => {
          if (data.protected && (data.content === undefined || data.content === null)) {
            setUnlockError("errorsWrongPassword");
            return;
          }
          passwordRef.current = password;
          setNote(data);
        })
        .catch((e) => {
          setUnlockError(e instanceof Error ? e.message : "errorsWrongPassword");
        });
    },
    [slug]
  );

  useEffect(() => {
    if (!note || loading || isLocked) return;
    const t = setInterval(() => {
      getOrCreateNote(note.slug, passwordRef.current ?? undefined)
        .then((fresh) => {
          appliedRemoteRef.current = false;
          setNote((current) => {
            if (!current) return current;
            const currentTime = new Date(current.updated_at).getTime();
            const freshTime = new Date(fresh.updated_at).getTime();
            if (freshTime <= currentTime) return current;
            const hasLocalChanges =
              pendingRef.current !== null || saveStatusRef.current === "saving";
            if (hasLocalChanges) {
              remoteNoteRef.current = fresh;
              setRemoteUpdated(true);
              return current;
            }
            appliedRemoteRef.current = true;
            return fresh;
          });
          setTimeout(() => {
            if (appliedRemoteRef.current) {
              setJustSynced(true);
              setTimeout(() => setJustSynced(false), 2000);
            }
          }, 0);
        })
        .catch(() => {});
    }, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [note?.slug, note?.updated_at, loading, isLocked]);

  const save = useCallback(
    (payload: { title?: string; content?: string }) => {
      if (!note) return;
      if (note.protected && !passwordRef.current) {
        getOrCreateNote(note.slug).then((stub) => {
          if (stub.protected && (stub.content === undefined || stub.content === null)) {
            passwordRef.current = null;
            setNote(stub);
          }
        });
        return;
      }
      setSaveStatus("saving");
      updateNote(note.slug, payload, note.protected ? passwordRef.current ?? undefined : undefined)
        .then((updated) => {
          setNote(updated);
          setSaveStatus("saved");
        })
        .catch((e) => {
          setSaveStatus("error");
          if (note.protected && (e instanceof ApiError ? e.status === 403 : true)) {
            getOrCreateNote(note.slug).then((stub) => {
              if (stub.protected && (stub.content === undefined || stub.content === null)) {
                passwordRef.current = null;
                setNote(stub);
              }
            });
          }
        });
    },
    [note]
  );

  const scheduleSave = useCallback(
    (payload: { title?: string; content?: string }) => {
      pendingRef.current = { ...pendingRef.current, ...payload };
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const p = pendingRef.current;
        pendingRef.current = null;
        debounceRef.current = null;
        if (p && note) save(p);
      }, DEBOUNCE_MS);
    },
    [note, save]
  );

  const setTitle = useCallback(
    (title: string) => {
      setNote((prev) => (prev ? { ...prev, title: title || null } : null));
      scheduleSave({ title: title || undefined });
    },
    [scheduleSave]
  );

  const setContent = useCallback(
    (content: string) => {
      setNote((prev) => (prev ? { ...prev, content } : null));
      scheduleSave({ content });
    },
    [scheduleSave]
  );

  const applyRemote = useCallback(() => {
    const remote = remoteNoteRef.current;
    if (remote) {
      setNote(remote);
      remoteNoteRef.current = null;
      setRemoteUpdated(false);
    }
  }, []);

  const dismissRemote = useCallback(() => {
    remoteNoteRef.current = null;
    setRemoteUpdated(false);
  }, []);

  const setNoteProtection = useCallback(
    async (slug: string, newPassword: string | null, currentPassword?: string) => {
      const current = currentPassword ?? passwordRef.current ?? undefined;
      const body =
        newPassword === null
          ? { password: null, current_password: current ?? undefined }
          : { password: newPassword };
      await setNoteProtectionApi(slug, body, current);
      setNote((prev) => {
        if (!prev || prev.slug !== slug) return prev;
        if (newPassword === null) passwordRef.current = null;
        else if (newPassword) passwordRef.current = newPassword;
        return { ...prev, protected: newPassword !== null };
      });
    },
    []
  );

  return {
    note,
    loading,
    error,
    saveStatus,
    setTitle,
    setContent,
    remoteUpdated,
    applyRemote,
    dismissRemote,
    justSynced,
    isLocked,
    unlock,
    unlockError,
    setNoteProtection,
  };
}
