import { useI18n } from "../i18n/context";
import type { SaveStatus } from "../lib/types";

const labelKeys: Record<SaveStatus, string> = {
  idle: "",
  saving: "saveSaving",
  saved: "saveSaved",
  error: "saveError",
};

interface Props {
  status: SaveStatus;
}

export function SaveStatusIndicator({ status }: Props) {
  const { t } = useI18n();
  if (status === "idle") return null;
  return (
    <span
      className="text-xs font-sans text-neutral-500 transition-opacity"
      role="status"
    >
      {t(labelKeys[status])}
    </span>
  );
}
