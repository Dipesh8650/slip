import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n/context";

interface Props {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

function useScrollFade(containerRef: React.RefObject<HTMLTextAreaElement | null>, value: string) {
  const [showFade, setShowFade] = useState(false);

  const update = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const hasMore = el.scrollHeight > el.clientHeight;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
    setShowFade(hasMore && !atBottom);
  }, [containerRef]);

  useEffect(() => {
    update();
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [value, update, containerRef]);

  return { showFade, onScroll: update };
}

export function ContentEditor({
  value,
  onChange,
  readOnly = false,
}: Props) {
  const { t } = useI18n();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { showFade, onScroll } = useScrollFade(textareaRef, value);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={onScroll}
        readOnly={readOnly}
        placeholder={t("notePlaceholder")}
        className="w-full min-h-[40vh] font-sans text-neutral-700 placeholder:text-neutral-400 bg-transparent border-0 resize-none focus:outline-none focus:ring-0 text-[15px] leading-relaxed"
      />
      {showFade && (
        <div
          aria-hidden
          className="absolute bottom-0 left-0 right-0 h-14 pointer-events-none bg-gradient-to-t from-white via-white/90 to-transparent"
        />
      )}
    </div>
  );
}
