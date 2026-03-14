import { useState } from "react";
import { useI18n } from "../i18n/context";

interface Props {
  onUnlock: (password: string) => void;
  error?: string | null;
}

export function PasswordGate({ onUnlock, error }: Props) {
  const { t } = useI18n();
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) onUnlock(password.trim());
  };

  const errorMessage = error ? (error === "errorsWrongPassword" ? t("errorsWrongPassword") : error) : null;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-neutral-100">
      <div className="w-full max-w-sm">
        <p className="text-sm text-neutral-500 font-sans mb-4 text-center">
          {t("passwordProtected")}
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("passwordPlaceholder")}
            autoFocus
            className="w-full px-4 py-2.5 text-sm font-sans border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-400 focus:border-transparent"
          />
          {errorMessage && (
            <p className="text-xs text-red-600 font-sans">{errorMessage}</p>
          )}
          <button
            type="submit"
            className="w-full py-2.5 text-sm font-sans text-neutral-700 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            {t("passwordSubmit")}
          </button>
        </form>
      </div>
    </div>
  );
}
