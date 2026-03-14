import { useI18n } from "../i18n/context";

interface Props {
  onRecargar: () => void;
  onDescartar: () => void;
}

export function RemoteUpdateBanner({ onRecargar, onDescartar }: Props) {
  const { t } = useI18n();
  return (
    <div className="max-w-3xl mx-auto px-4 pt-4">
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center justify-between gap-4">
        <span className="text-sm text-amber-800 font-sans">
          {t("remoteUpdatedElsewhere")}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onRecargar}
            className="text-xs font-medium text-amber-800 hover:text-amber-900 underline"
          >
            {t("remoteReload")}
          </button>
          <span className="text-amber-400">·</span>
          <button
            type="button"
            onClick={onDescartar}
            className="text-xs text-amber-600 hover:text-amber-800"
          >
            {t("remoteDismiss")}
          </button>
        </div>
      </div>
    </div>
  );
}
