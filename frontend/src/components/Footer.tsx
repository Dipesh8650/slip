import { useI18n } from "../i18n/context";

export function Footer() {
  const { t, locale, setLocale } = useI18n();

  return (
    <footer className="mt-auto py-6 flex flex-col items-center gap-2">
      <div className="flex items-center gap-2 text-xs font-sans text-neutral-400">
        <button
          type="button"
          onClick={() => setLocale("es")}
          className={locale === "es" ? "text-neutral-700 font-medium" : "text-neutral-400 hover:text-neutral-600"}
        >
          ES
        </button>
        <span className="text-neutral-300">·</span>
        <button
          type="button"
          onClick={() => setLocale("en")}
          className={locale === "en" ? "text-neutral-700 font-medium" : "text-neutral-400 hover:text-neutral-600"}
        >
          EN
        </button>
      </div>
      <span className="text-xs text-neutral-400 font-sans">
        {t("footerPoweredBy")}{" "}
        <a
          href="https://whoamicorp.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-neutral-500 hover:text-neutral-700 transition-colors"
        >
          WHOAMI
        </a>
      </span>
    </footer>
  );
}
