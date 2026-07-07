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

/** Brush size preview dot shown above the slider. */
function BrushPreview({ size }: { size: number }) {
  const clamped = Math.max(3, Math.min(size, 30));
  return (
    <div className="flex h-8 items-center justify-center">
      <div
        className="rounded-full bg-brand transition-all duration-150"
        style={{ width: clamped, height: clamped }}
      />
    </div>
  );
}

/** Contextual slider that appears between color palette and undo/redo. */
function ContextSlider({ label, value, min, max, onChange, showPreview }: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void; showPreview?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1 py-1">
      {showPreview && <BrushPreview size={value} />}
      <span className="text-[9px] font-semibold uppercase tracking-widest text-fg-subtle">{label}</span>
      <div className="relative h-32 w-7">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="snap-slider absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-full"
          style={{
            writingMode: "vertical-lr",
            direction: "rtl",
            background: `linear-gradient(to top, var(--color-brand) ${((value - min) / (max - min)) * 100}%, var(--color-border) ${((value - min) / (max - min)) * 100}%)`,
          }}
        />
      </div>
      <span className="text-[10px] font-semibold tabular-nums text-fg">{value}</span>
    </div>
  );
}

// ---- Left sidebar: back / copy / save + tool grid ----

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
    <aside className="flex h-full w-[60px] shrink-0 flex-col items-center border-r border-border bg-bg-elevated/95 z-50 backdrop-blur">
      {/* Top actions */}
      <div className="flex shrink-0 flex-col items-center gap-1.5 py-3">
        <Tooltip label={t("editor.backToCapture")} side="right">
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-fg-muted ring-1 ring-inset ring-hairline transition-colors hover:bg-hover hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
          >
            <ArrowLeft size={18} />
          </button>
        </Tooltip>
        <Tooltip label={t("editor.copy")} side="right">
          <button
            type="button"
            onClick={onCopy}
            disabled={busy}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-fg-muted ring-1 ring-inset ring-hairline transition-colors hover:bg-hover hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 disabled:opacity-30"
          >
            <Copy size={17} />
          </button>
        </Tooltip>
        <Tooltip label={t("editor.save")} side="right">
          <button
            type="button"
            onClick={onSave}
            disabled={busy}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-brand ring-1 ring-inset ring-brand/20 transition-colors hover:bg-brand/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 disabled:opacity-30"
          >
            <Save size={17} />
          </button>
        </Tooltip>
      </div>

      <div className="w-6 h-px bg-hairline shrink-0" />

      {/* Tool grid */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 scrollbar-thin">
        <nav className="flex flex-col items-center gap-1">
          {TOOLS.map((td) => (
            <Tooltip key={td.tool} label={t(`editor.${td.label}`)} side="right">
              <button
                type="button"
                onClick={() => setTool(td.tool)}
                aria-pressed={tool === td.tool}
                title={td.shortcut}
                className={cn(
                  "group relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60",
                  tool === td.tool
                    ? "bg-gradient-to-br from-violet-500 to-cyan-400 text-white shadow-[0_4px_14px_-4px_rgba(124,58,237,0.5)]"
                    : "text-fg-muted hover:bg-hover hover:text-fg",
                )}
              >
                {td.icon}
                <span className="absolute -bottom-0.5 -right-0.5 rounded-md bg-panel-2 px-1 py-[1px] text-[8px] font-medium text-fg-subtle ring-1 ring-hairline">
                  {td.shortcut}
                </span>
              </button>
            </Tooltip>
          ))}
        </nav>
      </div>
    </aside>
  );
}

// ---- Right sidebar: colors + slider + undo/redo/delete ----

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

  return (
    <aside className="flex h-full w-[60px] shrink-0 flex-col items-center border-l border-border bg-bg-elevated/95 z-50 backdrop-blur">
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 scrollbar-thin">
        {/* Color palette */}
        <div className="flex flex-col items-center gap-1.5">
          {COLORS.map((c) => {
            const selected = color.toLowerCase() === c.toLowerCase();
            return (
              <Tooltip key={c} label={c.toUpperCase()} side="left">
                <button
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Color ${c}`}
                  title={c.toUpperCase()}
                  className={cn(
                    "h-5 w-5 rounded-full transition-transform duration-150 hover:scale-110 focus-visible:outline-none",
                    selected
                      ? "scale-110 shadow-[0_0_0_2px_var(--color-bg-elevated),0_0_0_3.5px_var(--color-brand)]"
                      : "ring-1 ring-inset ring-hairline",
                  )}
                  style={{ background: c }}
                />
              </Tooltip>
            );
          })}
          <Tooltip label={t("editor.customColor")} side="left">
            <label className="relative flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-hover text-fg-muted ring-1 ring-inset ring-hairline transition-all hover:scale-110 hover:text-fg">
              <Plus size={11} />
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
          </Tooltip>
        </div>

        {/* Context slider */}
        <div className="mt-4">
          {showStrength ? (
            <ContextSlider label={t("editor.strength")} value={redactStrength} min={4} max={40} onChange={setRedactStrength} />
          ) : showFont ? (
            <ContextSlider label={t("editor.font")} value={fontSize} min={10} max={96} onChange={setFontSize} />
          ) : (
            <ContextSlider label={t("editor.size")} value={strokeWidth} min={1} max={60} onChange={setStrokeWidth} showPreview />
          )}
        </div>
      </div>

      {/* Bottom actions */}
      <div className="flex shrink-0 flex-col items-center gap-1 py-3">
        <Tooltip label={t("editor.undo")} side="left">
          <button
            type="button"
            disabled={past.length === 0}
            onClick={undo}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-fg-muted ring-1 ring-inset ring-hairline transition-colors hover:bg-hover hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 disabled:pointer-events-none disabled:opacity-30"
          >
            <Undo2 size={17} />
          </button>
        </Tooltip>
        <Tooltip label={t("editor.redo")} side="left">
          <button
            type="button"
            disabled={future.length === 0}
            onClick={redo}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-fg-muted ring-1 ring-inset ring-hairline transition-colors hover:bg-hover hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 disabled:pointer-events-none disabled:opacity-30"
          >
            <Redo2 size={17} />
          </button>
        </Tooltip>

        <div className="my-1 h-px w-6 bg-hairline" />

        <Tooltip label={t("editor.delete")} side="left">
          <button
            type="button"
            disabled={!selectedId}
            onClick={removeSelected}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-fg-muted ring-1 ring-inset ring-hairline transition-colors hover:bg-danger/15 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 disabled:pointer-events-none disabled:opacity-30"
          >
            <Trash2 size={17} />
          </button>
        </Tooltip>
      </div>
    </aside>
  );
}
