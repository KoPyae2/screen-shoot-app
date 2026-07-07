import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Check, ChevronDown, Globe, Minus, Moon, Square, Sun, X } from "lucide-react";
import { useThemeStore } from "../../store/themeStore";
const LANGUAGES = [
  { code: "en", label: "English", short: "EN" },
  { code: "zh", label: "中文", short: "中文" },
  { code: "es", label: "Español", short: "ES" },
  { code: "hi", label: "हिन्दी", short: "HI" },
  { code: "my", label: "မြန်မာဘာသာ", short: "မြန်" },
] as const;

const appWindow = getCurrentWindow();

export function Header() {
  const { i18n } = useTranslation();
  const { resolved, setPref } = useThemeStore();
  const [langOpen, setLangOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!langOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      ) {
        setLangOpen(false);
      }
    };
    // The menu's fixed position is computed from the button's rect at render
    // time, so close it on resize rather than let it detach from the button.
    const onResize = () => setLangOpen(false);
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("resize", onResize);
    };
  }, [langOpen]);

  const currentLang = LANGUAGES.find((l) => i18n.language.startsWith(l.code)) ?? LANGUAGES[0];

  const toggleTheme = () => {
    const next = resolved === "dark" ? "light" : "dark";
    setPref(next);
  };

  const ThemeIcon = resolved === "dark" ? Moon : Sun;

  return (
    <div className="flex h-10 shrink-0 items-stretch bg-bg-elevated/80 backdrop-blur border-b border-border select-none">
      <div className="flex flex-1 items-center gap-2.5 pl-4" data-tauri-drag-region>
        <img src="/icon.png" alt="Snapture" className="h-10 w-10 ms-[-16px]" draggable={false} />
        <span className="text-sm font-semibold text-fg -mt-1 -ms-1">Snapture</span>
      </div>
      <div className="flex items-center gap-3 pr-3">
        <button
          type="button"
          onClick={toggleTheme}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-fg transition-colors hover:bg-hover"
        >
          <ThemeIcon size={14} />
        </button>
        <button
          ref={btnRef}
          type="button"
          onClick={() => setLangOpen((v) => !v)}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-fg transition-colors hover:bg-hover"
        >
          <Globe size={13} className="shrink-0" />
          {currentLang.short}
          <ChevronDown size={12} className="opacity-60" />
        </button>
        {langOpen &&
          createPortal(
            <div
              ref={menuRef}
              className="fixed z-[9999] min-w-[160px] overflow-hidden rounded-lg border border-border bg-bg-elevated p-1 shadow-panel animate-fade-in"
              style={{
                top: (btnRef.current?.getBoundingClientRect().bottom ?? 0) + 6,
                right: window.innerWidth - (btnRef.current?.getBoundingClientRect().right ?? 0),
              }}
            >
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-fg-muted transition-colors hover:bg-panel-2 hover:text-fg"
                  onClick={() => {
                    i18n.changeLanguage(l.code);
                    setLangOpen(false);
                  }}
                >
                  <span className="w-3.5">
                    {l.code === currentLang.code && <Check size={14} className="text-brand" />}
                  </span>
                  {l.label}
                </button>
              ))}
            </div>,
            document.body,
          )}
        <div className="h-4 w-px bg-border" />
        <button
          onClick={() => appWindow.minimize()}
          className="flex h-7 w-7 items-center justify-center rounded-md text-fg transition-colors hover:bg-hover"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={() => appWindow.toggleMaximize()}
          className="flex h-7 w-7 items-center justify-center rounded-md text-fg transition-colors hover:bg-hover"
        >
          <Square size={12} />
        </button>
        <button
          onClick={() => appWindow.close()}
          className="flex h-7 w-7 items-center justify-center rounded-md text-fg transition-colors hover:bg-danger hover:text-white"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
