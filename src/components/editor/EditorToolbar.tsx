import {
  MousePointer2,
  ArrowUpRight,
  Square,
  Circle,
  Pen,
  Type,
  Highlighter,
  Droplets,
  Grid2x2,
  Undo2,
  Redo2,
  Trash2,
  Copy,
  Save,
  ArrowLeft,
  Plus,
} from "lucide-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useEditorStore, type Tool } from "../../store/editorStore";
import { Tooltip } from "../ui/Tooltip";
import { cn } from "../../lib/utils";

const COLORS = ["#f0556d", "#f5a623", "#23d5ab", "#6d5efc", "#3b82f6", "#ffffff", "#111318"];

const TOOLS: { tool: Tool; icon: React.ReactNode; label: string; shortcut: string }[] = [
  { tool: "select", icon: <MousePointer2 size={18} />, label: "selectMove", shortcut: "V" },
  { tool: "arrow", icon: <ArrowUpRight size={18} />, label: "arrow", shortcut: "A" },
  { tool: "rect", icon: <Square size={18} />, label: "rectangle", shortcut: "R" },
  { tool: "ellipse", icon: <Circle size={18} />, label: "ellipse", shortcut: "O" },
  { tool: "pen", icon: <Pen size={18} />, label: "freeDraw", shortcut: "P" },
  { tool: "text", icon: <Type size={18} />, label: "text", shortcut: "T" },
  { tool: "highlighter", icon: <Highlighter size={18} />, label: "highlighter", shortcut: "H" },
  { tool: "blur", icon: <Droplets size={18} />, label: "blur", shortcut: "B" },
  { tool: "pixelate", icon: <Grid2x2 size={18} />, label: "pixelate", shortcut: "X" },
];

/** Shared icon-button base for rail controls. */
const railBtn =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60";
const railBtnIdle = "text-fg-muted hover:bg-hover hover:text-fg";

/** Floating rail shell: glassy rounded card that hovers over the canvas edge.
    Dark mode needs a lighter surface, stronger edge and deeper shadow so the
    card clearly detaches from the (always dark) canvas backdrop. */
function Rail({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-0 w-[52px] flex-col items-center rounded-2xl border border-hairline bg-bg-elevated/90 py-1.5 shadow-panel backdrop-blur-xl dark:border-white/10 dark:bg-panel-2/85 dark:shadow-[0_18px_44px_-12px_rgba(0,0,0,0.9),0_4px_16px_-6px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.07)]">
      {children}
    </div>
  );
}

function RailDivider() {
  return <div className="my-1.5 h-px w-7 shrink-0 bg-hairline" />;
}

/** Brush size preview dot shown above the slider. */
function BrushPreview({ size }: { size: number }) {
  const clamped = Math.max(3, Math.min(size, 26));
  return (
    <div className="flex h-8 shrink-0 items-center justify-center">
      <div
        className="rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 transition-all duration-150"
        style={{ width: clamped, height: clamped }}
      />
    </div>
  );
}

/** Contextual slider that appears between color palette and undo/redo. */
function ContextSlider({ label, value, min, max, onChange, showPreview }: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void; showPreview?: boolean;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex shrink-0 flex-col items-center gap-1.5 py-1">
      {showPreview && <BrushPreview size={value} />}
      <div className="flex items-center gap-0.5">
        {/* The rail is too narrow for a horizontal label — longer words
            ("Strength", "Intensidad") were clipped. Run the label vertically
            beside the track so it always displays in full, in every locale. */}
        <span
          className="max-h-28 overflow-hidden text-ellipsis whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.14em] text-fg-subtle"
          style={{ writingMode: "vertical-rl" }}
        >
          {label}
        </span>
        {/* Recessed track container */}
        <div className="rounded-full bg-sunken p-[2px] ring-1 ring-inset ring-hairline">
          <div className="relative h-28 w-[20px]">
            <input
              type="range"
              min={min}
              max={max}
              value={value}
              onChange={(e) => onChange(Number(e.target.value))}
              aria-label={label}
              className="snap-slider absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-full"
              style={{
                writingMode: "vertical-lr",
                direction: "rtl",
                background: `linear-gradient(to top, var(--color-brand) ${pct}%, var(--color-border) ${pct}%)`,
              }}
            />
          </div>
        </div>
      </div>
      <span className="rounded-md bg-sunken px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-fg ring-1 ring-inset ring-hairline">
        {value}
      </span>
    </div>
  );
}

// ---- Left rail: back / tool grid / copy + save ----

interface LeftProps {
  onBack: () => void;
  onCopy: () => void;
  onSave: () => void;
  busy?: boolean;
}

export function LeftToolbar({ onBack, onCopy, onSave, busy }: LeftProps) {
  const { t } = useTranslation();
  const tool = useEditorStore((s) => s.tool);
  const setTool = useEditorStore((s) => s.setTool);

  return (
    <aside className="z-50 flex h-full w-[68px] shrink-0 flex-col items-start py-2 pl-2">
      <Rail>
        {/* Back */}
        <div className="flex shrink-0 flex-col items-center px-1.5">
          <Tooltip label={t("editor.backToCapture")} side="right">
            <button
              type="button"
              onClick={onBack}
              className={cn(railBtn, railBtnIdle)}
            >
              <ArrowLeft size={18} />
            </button>
          </Tooltip>
        </div>

        <RailDivider />

        {/* Tool grid */}
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-1.5 scrollbar-thin">
          <nav className="flex flex-col items-center gap-1 py-0.5">
            {TOOLS.map((td) => {
              const active = tool === td.tool;
              return (
                <Tooltip
                  key={td.tool}
                  label={t(`editor.${td.label}`)}
                  shortcut={td.shortcut}
                  side="right"
                >
                  <button
                    type="button"
                    onClick={() => setTool(td.tool)}
                    aria-pressed={active}
                    className={cn(
                      railBtn,
                      "relative",
                      active
                        ? "bg-gradient-to-br from-violet-500 to-cyan-400 text-white ring-1 ring-inset ring-white/25 shadow-[0_4px_16px_-4px_rgba(124,58,237,0.6),0_0_14px_-2px_rgba(6,182,212,0.35)]"
                        : railBtnIdle,
                    )}
                  >
                    {/* Active indicator notch on the rail edge */}
                    <span
                      aria-hidden
                      className={cn(
                        "absolute -left-1.5 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-violet-500 to-cyan-400 transition-opacity duration-150",
                        active ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {td.icon}
                  </button>
                </Tooltip>
              );
            })}
          </nav>
        </div>

        <RailDivider />

        {/* Export actions — Save carries the primary gradient */}
        <div className="flex shrink-0 flex-col items-center gap-1 px-1.5">
          <Tooltip label={t("editor.copy")} side="right">
            <button
              type="button"
              onClick={onCopy}
              disabled={busy}
              className={cn(railBtn, railBtnIdle, "disabled:pointer-events-none disabled:opacity-30")}
            >
              <Copy size={17} />
            </button>
          </Tooltip>
          <Tooltip label={t("editor.save")} side="right">
            <button
              type="button"
              onClick={onSave}
              disabled={busy}
              className={cn(
                railBtn,
                // Solid brand (not the gradient) so Save stays primary without
                // competing with the active tool — one gradient accent per rail.
                "bg-brand text-white shadow-[0_4px_14px_-4px_rgba(124,58,237,0.6)] hover:bg-brand-hover disabled:pointer-events-none disabled:opacity-40",
              )}
            >
              <Save size={17} />
            </button>
          </Tooltip>
        </div>
      </Rail>
    </aside>
  );
}

// ---- Right rail: colors / slider / undo-redo / delete ----

export function RightToolbar() {
  const { t } = useTranslation();
  const tool = useEditorStore((s) => s.tool);
  const color = useEditorStore((s) => s.color);
  const setColor = useEditorStore((s) => s.setColor);
  const strokeWidth = useEditorStore((s) => s.strokeWidth);
  const setStrokeWidth = useEditorStore((s) => s.setStrokeWidth);
  const fontSize = useEditorStore((s) => s.fontSize);
  const setFontSize = useEditorStore((s) => s.setFontSize);
  const redactStrength = useEditorStore((s) => s.redactStrength);
  const setRedactStrength = useEditorStore((s) => s.setRedactStrength);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const past = useEditorStore((s) => s.past);
  const future = useEditorStore((s) => s.future);
  const removeSelected = useEditorStore((s) => s.removeSelected);
  const selectedId = useEditorStore((s) => s.selectedId);

  const showStrength = tool === "blur" || tool === "pixelate";
  const showFont = tool === "text";
  const isCustomColor = !COLORS.some((c) => c.toLowerCase() === color.toLowerCase());

  return (
    <aside className="z-50 flex h-full w-[68px] shrink-0 flex-col items-end py-2 pr-2">
      <Rail>
        <div className="flex min-h-0 w-full flex-1 flex-col items-center overflow-y-auto overflow-x-hidden px-1.5 scrollbar-thin">
          {/* Color palette */}
          <div className="flex shrink-0 flex-col items-center gap-2 py-1.5">
            {COLORS.map((c) => {
              const selected = color.toLowerCase() === c.toLowerCase();
              return (
                <Tooltip key={c} label={c.toUpperCase()} side="left">
                  <button
                    type="button"
                    onClick={() => setColor(c)}
                    aria-label={`Color ${c}`}
                    aria-pressed={selected}
                    className={cn(
                      "h-6 w-6 rounded-full transition-transform duration-150 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60",
                      selected
                        ? "scale-110 animate-ring-pop"
                        : "ring-1 ring-inset ring-hairline",
                    )}
                    style={{ background: c }}
                  />
                </Tooltip>
              );
            })}
            <Tooltip label={t("editor.customColor")} side="left">
              <label
                className={cn(
                  "relative flex h-6 w-6 cursor-pointer items-center justify-center rounded-full transition-all duration-150 hover:scale-110",
                  isCustomColor
                    ? "scale-110 animate-ring-pop text-white"
                    : "bg-hover text-fg-muted ring-1 ring-inset ring-hairline hover:text-fg",
                )}
                style={isCustomColor ? { background: color } : undefined}
              >
                <Plus size={12} className={isCustomColor ? "mix-blend-difference" : undefined} />
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  aria-label={t("editor.customColor")}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
              </label>
            </Tooltip>
          </div>

          <RailDivider />

          {/* Contextual slider */}
          {showStrength ? (
            <ContextSlider label={t("editor.strength")} value={redactStrength} min={4} max={40} onChange={setRedactStrength} />
          ) : showFont ? (
            <ContextSlider label={t("editor.font")} value={fontSize} min={10} max={96} onChange={setFontSize} />
          ) : (
            <ContextSlider label={t("editor.size")} value={strokeWidth} min={1} max={60} onChange={setStrokeWidth} showPreview />
          )}
        </div>

        <RailDivider />

        {/* History */}
        <div className="flex shrink-0 flex-col items-center gap-1 px-1.5">
          <Tooltip label={t("editor.undo")} shortcut="Ctrl+Z" side="left">
            <button
              type="button"
              disabled={past.length === 0}
              onClick={undo}
              className={cn(railBtn, railBtnIdle, "disabled:pointer-events-none disabled:opacity-30")}
            >
              <Undo2 size={17} />
            </button>
          </Tooltip>
          <Tooltip label={t("editor.redo")} shortcut="Ctrl+Y" side="left">
            <button
              type="button"
              disabled={future.length === 0}
              onClick={redo}
              className={cn(railBtn, railBtnIdle, "disabled:pointer-events-none disabled:opacity-30")}
            >
              <Redo2 size={17} />
            </button>
          </Tooltip>
        </div>

        <RailDivider />

        {/* Danger zone */}
        <div className="flex shrink-0 flex-col items-center px-1.5">
          <Tooltip label={t("editor.delete")} shortcut="Del" side="left">
            <button
              type="button"
              disabled={!selectedId}
              onClick={removeSelected}
              className={cn(
                railBtn,
                "text-fg-muted hover:bg-danger/15 hover:text-danger focus-visible:ring-danger/60 disabled:pointer-events-none disabled:opacity-30",
              )}
            >
              <Trash2 size={17} />
            </button>
          </Tooltip>
        </div>
      </Rail>
    </aside>
  );
}
