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
import { Button } from "../ui/Button";
import { Tooltip } from "../ui/Tooltip";
import { Slider } from "../ui/Slider";
import { cn } from "../../lib/utils";

const COLORS = ["#f0556d", "#f5a623", "#23d5ab", "#6d5efc", "#3b82f6", "#ffffff", "#111318"];

/** Recessed pill that groups a set of related controls (segmented-control style). */
function Segment({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex h-11 shrink-0 items-center gap-0.5 rounded-xl bg-sunken px-1.5 ring-1 ring-inset ring-hairline",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Hairline divider used inside a Segment to separate sub-groups of tools. */
function InnerDivider() {
  return <div className="mx-1 h-5 w-px shrink-0 bg-hairline" />;
}

interface ToolButtonProps {
  label: string;
  active?: boolean;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

/** Square 36px icon button with a crisp solid-fill active state. */
function ToolButton({ label, active, disabled, danger, onClick, children }: ToolButtonProps) {
  return (
    <Tooltip label={label} side="bottom">
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        aria-pressed={active}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 disabled:pointer-events-none disabled:opacity-30",
          active
            ? "bg-gradient-to-br from-violet-500 to-cyan-400 text-white shadow-[0_4px_14px_-4px_rgba(124,58,237,0.5)]"
            : danger
              ? "text-fg-muted hover:bg-danger/15 hover:text-danger"
              : "text-fg-muted hover:bg-hover hover:text-fg",
        )}
      >
        {children}
      </button>
    </Tooltip>
  );
}

interface LabeledSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}

function LabeledSlider({ label, value, min, max, onChange }: LabeledSliderProps) {
  return (
    <Segment className="gap-2.5 px-3">
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">
        {label}
      </span>
      <Slider className="w-24" min={min} max={max} value={value} onChange={onChange} />
      <span className="min-w-[2.25rem] shrink-0 rounded-md bg-hover px-1.5 py-0.5 text-center text-xs font-semibold tabular-nums text-fg">
        {value}
      </span>
    </Segment>
  );
}

interface Props {
  onBack: () => void;
  onCopy: () => void;
  onSave: () => void;
  busy?: boolean;
}

const TOOL_GROUPS: { tools: { tool: Tool; icon: React.ReactNode; label: string }[] }[] = [
  {
    tools: [{ tool: "select", icon: <MousePointer2 size={18} />, label: "selectMove" }],
  },
  {
    tools: [
      { tool: "arrow", icon: <ArrowUpRight size={18} />, label: "arrow" },
      { tool: "rect", icon: <Square size={18} />, label: "rectangle" },
      { tool: "ellipse", icon: <Circle size={18} />, label: "ellipse" },
      { tool: "pen", icon: <Pen size={18} />, label: "freeDraw" },
    ],
  },
  {
    tools: [{ tool: "text", icon: <Type size={18} />, label: "text" }],
  },
  {
    tools: [
      { tool: "highlighter", icon: <Highlighter size={18} />, label: "highlighter" },
      { tool: "blur", icon: <Droplets size={18} />, label: "blur" },
      { tool: "pixelate", icon: <Grid2x2 size={18} />, label: "pixelate" },
    ],
  },
];

export function EditorToolbar({ onBack, onCopy, onSave, busy }: Props) {
  const { t } = useTranslation();
  const {
    tool,
    setTool,
    color,
    setColor,
    strokeWidth,
    setStrokeWidth,
    fontSize,
    setFontSize,
    redactStrength,
    setRedactStrength,
    undo,
    redo,
    past,
    future,
    removeSelected,
    selectedId,
  } = useEditorStore();

  const isRedact = tool === "blur" || tool === "pixelate";
  const isText = tool === "text";

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border bg-bg-elevated/80 px-4 py-3 backdrop-blur">
      {/* Back */}
      <Tooltip label={t("editor.backToCapture")} side="bottom">
        <button
          type="button"
          onClick={onBack}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sunken text-fg-muted ring-1 ring-inset ring-hairline transition-colors hover:bg-hover hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
        >
          <ArrowLeft size={18} />
        </button>
      </Tooltip>

      {/* Tools — all drawing tools in one segmented control with hairline sub-dividers */}
      <Segment>
        {TOOL_GROUPS.map((group, gi) => (
          <React.Fragment key={gi}>
            {gi > 0 && <InnerDivider />}
            {group.tools.map((td) => (
              <ToolButton
                key={td.tool}
                label={t(`editor.${td.label}`)}
                active={tool === td.tool}
                onClick={() => setTool(td.tool)}
              >
                {td.icon}
              </ToolButton>
            ))}
          </React.Fragment>
        ))}
      </Segment>

      {/* Color palette */}
      <Segment className="gap-1.5 px-2">
        {COLORS.map((c) => {
          const selected = color.toLowerCase() === c.toLowerCase();
          return (
            <Tooltip key={c} label={c.toUpperCase()} side="bottom">
              <button
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Color ${c}`}
                aria-pressed={selected}
                className={cn(
                  "h-6 w-6 rounded-full transition-transform duration-150 hover:scale-110 focus-visible:outline-none",
                  selected
                    ? "scale-110 shadow-[0_0_0_2px_var(--color-bg-elevated),0_0_0_4px_var(--color-brand)]"
                    : "ring-1 ring-inset ring-hairline",
                )}
                style={{ background: c }}
              />
            </Tooltip>
          );
        })}
        <Tooltip label={t("editor.customColor")} side="bottom">
          <label className="relative flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-hover text-fg-muted ring-1 ring-inset ring-hairline transition-all hover:scale-110 hover:text-fg">
            <Plus size={13} />
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </label>
        </Tooltip>
      </Segment>

      {/* Contextual size / strength control */}
      {isRedact ? (
        <LabeledSlider
          label={t("editor.strength")}
          value={redactStrength}
          min={4}
          max={40}
          onChange={setRedactStrength}
        />
      ) : isText ? (
        <LabeledSlider label={t("editor.font")} value={fontSize} min={10} max={96} onChange={setFontSize} />
      ) : (
        <LabeledSlider label={t("editor.size")} value={strokeWidth} min={1} max={60} onChange={setStrokeWidth} />
      )}

      {/* History + delete */}
      <Segment>
        <ToolButton label={t("editor.undo")} disabled={past.length === 0} onClick={undo}>
          <Undo2 size={17} />
        </ToolButton>
        <ToolButton label={t("editor.redo")} disabled={future.length === 0} onClick={redo}>
          <Redo2 size={17} />
        </ToolButton>
        <InnerDivider />
        <ToolButton
          label={t("editor.delete")}
          danger
          disabled={!selectedId}
          onClick={removeSelected}
        >
          <Trash2 size={17} />
        </ToolButton>
      </Segment>

      {/* Primary actions */}
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <Button
          variant="outline"
          onClick={onCopy}
          disabled={busy}
          className="h-11 rounded-xl px-4 text-sm"
        >
          <Copy size={16} /> {t("editor.copy")}
        </Button>
        <Button
          variant="primary"
          onClick={onSave}
          disabled={busy}
          className="h-11 rounded-xl px-5 text-sm"
        >
          <Save size={16} /> {t("editor.save")}
        </Button>
      </div>
    </div>
  );
}
