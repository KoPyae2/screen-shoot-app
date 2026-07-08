import * as React from "react";
import { useTranslation } from "react-i18next";
import { useSnippetStore } from "../../store/snippetStore";
import { BACKGROUNDS, LANGUAGES, THEMES } from "../../lib/snippet";
import { Select } from "../ui/Select";
import { cn } from "../../lib/utils";

/** Floating rail shell — mirrors the editor rail styling. */
function Rail({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-0 w-full flex-col rounded-2xl border border-hairline bg-bg-elevated/90 shadow-panel backdrop-blur-xl dark:border-white/10 dark:bg-panel-2/85 dark:shadow-[0_18px_44px_-12px_rgba(0,0,0,0.9),0_4px_16px_-6px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.07)]">
      {children}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 px-3.5 py-3">
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-subtle">
        {label}
      </span>
      {children}
    </div>
  );
}

function Divider() {
  return <div className="h-px w-full bg-hairline" />;
}

/** Horizontal labelled slider. */
function Slider({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-fg-muted">{label}</span>
        <span className="rounded-md bg-sunken px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-fg ring-1 ring-inset ring-hairline">
          {value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="snap-slider h-2 w-full cursor-pointer appearance-none rounded-full"
        style={{
          background: `linear-gradient(to right, var(--color-brand) ${pct}%, var(--color-border) ${pct}%)`,
        }}
      />
    </div>
  );
}

/** Pill toggle. */
function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between rounded-lg px-1 py-0.5 text-left"
    >
      <span className="text-[11px] text-fg-muted">{label}</span>
      <span
        className={cn(
          "relative h-4 w-7 shrink-0 rounded-full transition-colors",
          checked ? "bg-brand" : "bg-border",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform",
            checked ? "translate-x-3.5" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}

export function SnippetToolbar() {
  const { t } = useTranslation();
  const s = useSnippetStore();

  return (
    <aside className="z-50 flex h-full w-[220px] shrink-0 flex-col py-2 pr-2">
      <Rail>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden scrollbar-thin">
          <Section label={t("snippet.language")}>
            <Select
              ariaLabel={t("snippet.language")}
              value={s.language}
              onChange={(v) => s.setLanguage(v as typeof s.language)}
              options={[
                { value: "auto", label: t("snippet.autoDetect") },
                ...LANGUAGES.map((l) => ({ value: l.id, label: l.label })),
              ]}
            />
          </Section>

          <Divider />

          <Section label={t("snippet.theme")}>
            <Select
              ariaLabel={t("snippet.theme")}
              value={s.theme}
              onChange={(v) => s.setTheme(v as typeof s.theme)}
              options={THEMES.map((th) => ({ value: th.id, label: th.label }))}
            />
          </Section>

          <Divider />

          <Section label={t("snippet.background")}>
            <div className="grid grid-cols-5 gap-1.5">
              {BACKGROUNDS.map((bg, i) => {
                const selected = s.backgroundIndex === i;
                return (
                  <button
                    key={bg.label}
                    type="button"
                    title={bg.label}
                    aria-label={bg.label}
                    aria-pressed={selected}
                    onClick={() => s.setBackgroundIndex(i)}
                    className={cn(
                      "h-7 w-full rounded-md transition-transform hover:scale-105",
                      bg.css === "transparent" &&
                        "bg-[repeating-conic-gradient(#888_0_25%,#ccc_0_50%)] bg-[length:8px_8px]",
                      selected
                        ? "ring-2 ring-brand ring-offset-1 ring-offset-bg-elevated"
                        : "ring-1 ring-inset ring-hairline",
                    )}
                    style={bg.css !== "transparent" ? { background: bg.css } : undefined}
                  />
                );
              })}
              <label
                title={t("snippet.customColor")}
                className={cn(
                  "relative flex h-7 w-full cursor-pointer items-center justify-center rounded-md text-[10px] font-bold transition-transform hover:scale-105",
                  s.backgroundIndex === -1
                    ? "ring-2 ring-brand ring-offset-1 ring-offset-bg-elevated"
                    : "ring-1 ring-inset ring-hairline",
                )}
                style={{ background: s.backgroundIndex === -1 ? s.customBackground : undefined }}
              >
                <span className={s.backgroundIndex === -1 ? "mix-blend-difference text-white" : "text-fg-muted"}>
                  +
                </span>
                <input
                  type="color"
                  value={s.customBackground}
                  onChange={(e) => s.setCustomBackground(e.target.value)}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  aria-label={t("snippet.customColor")}
                />
              </label>
            </div>
          </Section>

          <Divider />

          <Section label={t("snippet.window")}>
            <Toggle
              label={t("snippet.windowControls")}
              checked={s.showWindowControls}
              onChange={s.setShowWindowControls}
            />
            <Toggle
              label={t("snippet.lineNumbers")}
              checked={s.showLineNumbers}
              onChange={s.setShowLineNumbers}
            />
            <input
              type="text"
              value={s.title}
              onChange={(e) => s.setTitle(e.target.value)}
              placeholder={t("snippet.titlePlaceholder")}
              className="mt-1 w-full rounded-lg border border-hairline bg-sunken px-2.5 py-1.5 text-xs font-medium text-fg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand/60"
            />
          </Section>

          <Divider />

          <Section label={t("snippet.layout")}>
            <Slider label={t("snippet.padding")} value={s.padding} min={0} max={128} onChange={s.setPadding} />
            <Slider
              label={t("snippet.radius")}
              value={s.borderRadius}
              min={0}
              max={32}
              onChange={s.setBorderRadius}
            />
          </Section>
        </div>
      </Rail>
    </aside>
  );
}
