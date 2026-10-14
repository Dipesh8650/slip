import { ErrorMessage } from "../components/ErrorMessage";
import { NoteLayout } from "../components/NoteLayout";
import { PasswordGate } from "../components/PasswordGate";
import { RemoteUpdateBanner } from "../components/RemoteUpdateBanner";
import { SkeletonLoader } from "../components/SkeletonLoader";
import { useI18n } from "../i18n/context";
import { useNote } from "../hooks/useNote";
import { useParams } from "react-router-dom";

function SyncToast() {
  const { t } = useI18n();
  return (
    <div className="max-w-3xl mx-auto px-4 pt-2">
      <p className="text-xs text-neutral-500 font-sans animate-pulse">
        {t("syncUpdated")}
      </p>
    </div>
  );
}

interface NotePageProps {
  readOnly?: boolean;
}

export function NotePage({ readOnly = false }: NotePageProps = {}) {
  const { slug } = useParams<{ slug: string }>();

  const {
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
  } = useNote(slug ?? "");

  const handleSetPassword = async (newPassword: string | null, currentPassword?: string): Promise<void> => {
    if (!note) throw new Error("Note unavailable");
    await setNoteProtection(note.slug, newPassword, currentPassword);
  };

  if (loading) return <SkeletonLoader />;
  if (error) return <ErrorMessage message={error} />;
  if (!note) return null;

  if (isLocked) {
    return (
      <PasswordGate onUnlock={unlock} error={unlockError} />
    );
  }

  return (
    <>
      {remoteUpdated && (
        <RemoteUpdateBanner onRecargar={applyRemote} onDescartar={dismissRemote} />
      )}
      {justSynced && <SyncToast />}
      <NoteLayout
        note={note}
        saveStatus={saveStatus}
        onTitleChange={setTitle}
        onContentChange={setContent}
        onSetPassword={handleSetPassword}
        readOnly={readOnly}
      />
    </>
  );
}
