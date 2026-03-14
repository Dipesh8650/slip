import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createRandomNote } from "../lib/apiClient";

export function RedirectPage() {
  const navigate = useNavigate();

  useEffect(() => {
    createRandomNote()
      .then((note) => navigate(`/${note.slug}`, { replace: true }))
      .catch(() => navigate("/", { replace: true }));
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <p className="text-sm text-neutral-500 font-sans">Creando nota…</p>
    </div>
  );
}
