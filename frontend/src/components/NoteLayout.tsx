import { useCallback, useState } from "react";
import { ContentEditor } from "./ContentEditor";
import { LockButton } from "./LockButton";
import { SaveStatusIndicator } from "./SaveStatusIndicator";
import { TitleInput } from "./TitleInput";
import { useI18n } from "../i18n/context";
import type { Note as NoteType, SaveStatus } from "../lib/types";

interface Props {
  note: NoteType;
  saveStatus: SaveStatus;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onSetPassword?: (newPassword: string | null, currentPassword?: string) => void;
  readOnly?: boolean;
}

const VIEW_ONLY_PREFIX = "/v/";

export function NoteLayout({
  note,
  saveStatus,
  onTitleChange,
  onContentChange,
  onSetPassword,
  readOnly = false,
}: Props) {
  const { t } = useI18n();
  const [copyFeedback, setCopyFeedback] = useState<"editable" | "view" | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const editableUrl = `${origin}/${note.slug}`;
  const viewOnlyUrl = `${origin}${VIEW_ONLY_PREFIX}${note.slug}`;

  const copyLink = useCallback(
    (viewOnly: boolean) => {
      const url = viewOnly ? viewOnlyUrl : editableUrl;
      navigator.clipboard.writeText(url).then(() => {
        setCopyFeedback(viewOnly ? "view" : "editable");
        setTimeout(() => setCopyFeedback(null), 2000);
      });
    },
    [editableUrl, viewOnlyUrl]
  );

  const title = note.title ?? "";
  const content = note.content ?? "";

  if (readOnly) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-neutral-50 rounded-lg border border-neutral-200 shadow-sm p-8 max-w-2xl mx-auto">
          <div className="mb-2">
            <span className="inline-block text-[10px] font-sans uppercase tracking-wider text-neutral-400">
              {t("viewOnlyBadge")}
            </span>
          </div>
          <h1 className="text-2xl font-serif text-neutral-800 mb-6 break-words">
            {title || t("titlePlaceholder")}
          </h1>
          <div className="font-sans text-[15px] leading-relaxed text-neutral-700 whitespace-pre-wrap break-words min-h-[20vh]">
            {content || "\u00A0"}
          </div>
          <div className="mt-8 pt-4 border-t border-neutral-200 text-xs text-neutral-400 font-sans">
            <span>{note.slug}</span>
            <span className="mx-2">·</span>
            <time dateTime={note.updated_at}>
              {new Date(note.updated_at).toLocaleString()}
            </time>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="bg-white rounded-xl shadow-md border border-neutral-200 p-8 transition-shadow">
        <div className="flex items-center justify-between gap-4 mb-6">
          <TitleInput
            value={title}
            onChange={onTitleChange}
            placeholder={t("titlePlaceholder")}
          />
          <div className="flex items-center gap-2">
            {onSetPassword && (
              <LockButton
                protected={Boolean(note.protected)}
                onSetPassword={onSetPassword}
              />
            )}
            <SaveStatusIndicator status={saveStatus} />
          </div>
        </div>
        <ContentEditor
          value={content}
          onChange={onContentChange}
        />
        <div className="mt-8 pt-4 border-t border-neutral-200 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-500 font-sans">
            <span>{note.slug}</span>
            <time dateTime={note.updated_at}>
              {new Date(note.updated_at).toLocaleString()}
            </time>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => copyLink(false)}
              className="text-xs font-sans text-neutral-500 hover:text-neutral-700 border border-neutral-200 hover:border-neutral-300 rounded-lg px-3 py-1.5 transition-colors"
            >
              {copyFeedback === "editable" ? t("linkCopied") : t("shareEditable")}
            </button>
            <button
              type="button"
              onClick={() => copyLink(true)}
              className="text-xs font-sans text-neutral-500 hover:text-neutral-700 border border-neutral-200 hover:border-neutral-300 rounded-lg px-3 py-1.5 transition-colors"
            >
              {copyFeedback === "view" ? t("linkCopied") : t("shareViewOnly")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
