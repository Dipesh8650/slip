import { useCallback, useRef, useState } from "react";
import { useI18n } from "../i18n/context";

const ALPHANUM = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generatePassword(len: number): string {
  let out = "";
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  for (let i = 0; i < len; i++) out += ALPHANUM[buf[i] % ALPHANUM.length];
  return out;
}

const IconRefresh = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
    <path d="M21 21v-5h-5" />
  </svg>
);

const IconEye = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconEyeOff = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const IconCopy = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const IconClose = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

interface Props {
  protected: boolean;
  onSetPassword: (newPassword: string | null, currentPassword?: string) => Promise<void>;
  readOnly?: boolean;
}

export function LockButton({ protected: isProtected, onSetPassword, readOnly }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [current, setCurrent] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(() => {
    const gen = generatePassword(12);
    setPassword(gen);
    setConfirm(gen);
    setShowPassword(true);
    setError(null);
  }, []);

  const handleCopy = useCallback(() => {
    if (!password) return;
    navigator.clipboard.writeText(password);
  }, [password]);

  const handleSet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending.current) return;
    setError(null);
    if (password.length < 1) {
      setError(t("lockWritePassword"));
      return;
    }
    if (password !== confirm) {
      setError(t("lockNoMatch"));
      return;
    }
    pending.current = true;
    setSaving(true);
    try {
      await onSetPassword(password);
      setPassword("");
      setConfirm("");
      setOpen(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error");
    } finally {
      pending.current = false;
      setSaving(false);
    }
  };
  const handleRemove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending.current) return;
    setError(null);
    if (!current) {
      setError(t("lockCurrentRequired"));
      return;
    }
    pending.current = true;
    setSaving(true);
    try {
      await onSetPassword(null, current);
      setCurrent("");
      setOpen(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : t("errorsWrongPassword"));
    } finally {
      pending.current = false;
      setSaving(false);
    }
  };
  const close = useCallback(() => {
    if (pending.current) return;
    setOpen(false);
    setError(null);
    setPassword("");
    setConfirm("");
    setCurrent("");
  }, []);

  if (readOnly) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="p-1.5 text-neutral-400 hover:text-neutral-600 transition-colors rounded"
        title={isProtected ? t("lockProtected") : t("lockProtect")}
        aria-label={isProtected ? t("lockProtected") : t("lockProtect")}
      >
        {isProtected ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 11V7a5 5 0 0 1 9.9-1" />
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          </svg>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && close()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="lock-modal-title"
        >
          <div
            className="w-full max-w-sm bg-white rounded-xl shadow-lg border border-neutral-100 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-neutral-100">
              <h2 id="lock-modal-title" className="text-sm font-sans font-medium text-neutral-800">
                {isProtected ? t("lockUnprotect") : t("lockProtect")}
              </h2>
              <button
                type="button"
                onClick={close}
                disabled={saving}
                className="p-1.5 text-neutral-400 hover:text-neutral-600 rounded transition-colors"
                aria-label={t("lockClose")}
              >
                <IconClose />
              </button>
            </div>

            <div className="p-6">
              <fieldset disabled={saving} aria-busy={saving}>
              {isProtected ? (
                <form onSubmit={handleRemove} className="space-y-4">
                  <div>
                    <label className="sr-only">{t("lockCurrentPlaceholder")}</label>
                    <input
                      type="password"
                      value={current}
                      onChange={(e) => setCurrent(e.target.value)}
                      placeholder={t("lockCurrentPlaceholder")}
                      className="w-full px-4 py-3 text-sm font-sans text-neutral-800 placeholder:text-neutral-400 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-300 focus:border-transparent"
                      autoFocus
                    />
                  </div>
                  {error && <p className="text-sm text-red-600 font-sans">{error}</p>}
                  <button
                    type="submit"
                    className="w-full py-3 text-sm font-sans font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
                  >
                    {t("lockRemove")}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSet} className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t("lockPasswordPlaceholder")}
                        className="flex-1 min-w-0 px-4 py-3 text-sm font-sans text-neutral-800 placeholder:text-neutral-400 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-300 focus:border-transparent"
                        autoFocus
                      />
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => setShowPassword((s) => !s)}
                          className="p-3 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
                          title={showPassword ? t("lockHide") : t("lockShow")}
                          aria-label={showPassword ? t("lockHide") : t("lockShow")}
                        >
                          {showPassword ? <IconEyeOff /> : <IconEye />}
                        </button>
                        <button
                          type="button"
                          onClick={handleGenerate}
                          className="p-3 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
                          title={t("lockGenerate")}
                          aria-label={t("lockGenerate")}
                        >
                          <IconRefresh />
                        </button>
                        {password ? (
                          <button
                            type="button"
                            onClick={handleCopy}
                            className="p-3 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
                            title={t("lockCopy")}
                            aria-label={t("lockCopy")}
                          >
                            <IconCopy />
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder={t("lockConfirmPlaceholder")}
                      className="w-full px-4 py-3 text-sm font-sans text-neutral-800 placeholder:text-neutral-400 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-300 focus:border-transparent"
                    />
                  </div>
                  {error && <p className="text-sm text-red-600 font-sans">{error}</p>}
                  <button
                    type="submit"
                    className="w-full py-3 text-sm font-sans font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
                  >
                    {t("lockSet")}
                  </button>
                </form>
              )}
              </fieldset>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
