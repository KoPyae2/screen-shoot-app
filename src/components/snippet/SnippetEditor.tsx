import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Copy, Save, Code2, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { copyBytesToClipboard, saveImageBytes } from "../../lib/commands";
import {
  detectLanguage,
  highlightCode,
  nodeToPngBase64,
  resolveBackground,
} from "../../lib/snippet";
import { useSnippetStore } from "../../store/snippetStore";
import { Tooltip } from "../ui/Tooltip";
import { toast } from "../ui/Toast";
import { cn } from "../../lib/utils";
import { SnippetToolbar } from "./SnippetToolbar";

interface Props {
  onBack: () => void;
}

const railBtn =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60";
const railBtnIdle = "text-fg-muted hover:bg-hover hover:text-fg";

const SAMPLE = `function greet(name) {
  const msg = \`Hello, \${name}!\`;
  console.log(msg);
  return msg;
}

greet("World");`;

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;

export function SnippetEditor({ onBack }: Props) {
  const { t } = useTranslation();
  const s = useSnippetStore();
  const canvasRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [html, setHtml] = useState<string>("");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [focusCode, setFocusCode] = useState(false);
  const [panning, setPanning] = useState(false);
  // When true, zoom auto-fits the frame to the canvas on every size change.
  // Any manual zoom / pan opts out until the user resets the view.
  const [autoFit, setAutoFit] = useState(true);

  // Refs for the active middle-mouse pan gesture.
  const panActive = useRef(false);
  const panOrigin = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  const hasCode = s.code.trim().length > 0;

  const resolvedLang = useMemo(
    () => (s.language === "auto" ? detectLanguage(s.code) : s.language),
    [s.language, s.code],
  );

  // Re-highlight whenever code / language / theme changes.
  useEffect(() => {
    let alive = true;
    if (!s.code) {
      setHtml("");
      return;
    }
    highlightCode(s.code, resolvedLang, s.theme)
      .then((out) => {
        if (alive) setHtml(out);
      })
      .catch(() => {
        if (alive) setHtml("");
      });
    return () => {
      alive = false;
    };
  }, [s.code, resolvedLang, s.theme]);

  const background = resolveBackground(s.backgroundIndex, s.customBackground);

  // ---- Zoom ----
  const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
  const zoomIn = () => {
    setAutoFit(false);
    setZoom((z) => clampZoom(+(z + ZOOM_STEP).toFixed(2)));
  };
  const zoomOut = () => {
    setAutoFit(false);
    setZoom((z) => clampZoom(+(z - ZOOM_STEP).toFixed(2)));
  };
  // Reset = re-enable auto-fit and recenter.
  const resetView = () => {
    setPan({ x: 0, y: 0 });
    setAutoFit(true);
  };

  // Compute the zoom that fits the frame within the canvas content box (never
  // upscales past 1x). Runs on mount, on frame/content changes, and on canvas
  // resize — so pasting long code immediately fits the screen. The canvas
  // padding (which reserves room for the bottom hint) is subtracted so the
  // fitted frame never slides under the hint.
  const fitToScreen = useCallback(() => {
    const canvas = canvasRef.current;
    const frame = frameRef.current;
    if (!canvas || !frame) return;
    const cs = getComputedStyle(canvas);
    const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    const availW = canvas.clientWidth - padX;
    const availH = canvas.clientHeight - padY;
    // frame is transformed via the stage wrapper; offsetWidth/Height report
    // its untransformed (natural) size.
    const fw = frame.offsetWidth;
    const fh = frame.offsetHeight;
    if (fw === 0 || fh === 0 || availW <= 0 || availH <= 0) return;
    const next = clampZoom(Math.min(1, availW / fw, availH / fh));
    setZoom(next);
    setPan({ x: 0, y: 0 });
  }, []);

  // Auto-fit whenever content or layout that affects frame size changes.
  useLayoutEffect(() => {
    if (!autoFit || !hasCode) return;
    // Defer one frame so the DOM (and Shiki HTML) has laid out.
    const id = requestAnimationFrame(fitToScreen);
    return () => cancelAnimationFrame(id);
  }, [autoFit, hasCode, html, s.padding, s.fontSize, s.borderRadius, s.showLineNumbers, s.showWindowControls, s.title, fitToScreen]);

  // Re-fit on canvas resize (window resize / sidebar changes).
  useEffect(() => {
    if (!autoFit) return;
    const canvas = canvasRef.current;
    if (!canvas || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      if (autoFit) fitToScreen();
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [autoFit, fitToScreen]);

  // Ctrl/Cmd + wheel to zoom. Manual zoom opts out of auto-fit.
  const onWheel = useCallback((e: React.WheelEvent) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    setAutoFit(false);
    const delta = e.deltaY !== 0 ? e.deltaY : e.deltaX;
    setZoom((z) => clampZoom(+(z - Math.sign(delta) * ZOOM_STEP).toFixed(2)));
  }, []);

  // ---- Middle-mouse pan ----
  const onCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 1) return; // middle button only
    e.preventDefault();
    setAutoFit(false);
    panActive.current = true;
    setPanning(true);
    panOrigin.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
  };

  useEffect(() => {
    if (!panning) return;
    const onMove = (e: MouseEvent) => {
      if (!panActive.current) return;
      const { mx, my, px, py } = panOrigin.current;
      setPan({ x: px + (e.clientX - mx), y: py + (e.clientY - my) });
    };
    const onUp = () => {
      panActive.current = false;
      setPanning(false);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [panning]);

  // ---- Export (frame carries no transform, so it renders at true 1x) ----
  const exportPng = async (): Promise<string | null> => {
    if (!frameRef.current || !hasCode) return null;
    return nodeToPngBase64(frameRef.current);
  };

  const onCopy = async () => {
    if (!hasCode) return;
    setBusy(true);
    try {
      const b64 = await exportPng();
      if (!b64) return;
      await copyBytesToClipboard(b64);
      toast.success(t("snippet.copied"));
    } catch (e) {
      toast.error(String(e));
    } finally {
      setBusy(false);
    }
  };

  const onSave = async () => {
    if (!hasCode) return;
    setBusy(true);
    try {
      const b64 = await exportPng();
      if (!b64) return;
      const path = await saveImageBytes(b64, 92, {
        title: t("snippet.saveDialogTitle"),
        defaultName: t("snippet.saveDialogDefaultName", { timestamp: Date.now() }),
        pngLabel: t("editor.pngImage"),
        jpegLabel: t("editor.jpegImage"),
      });
      if (path) toast.success(t("snippet.saved"));
    } catch (e) {
      toast.error(String(e));
    } finally {
      setBusy(false);
    }
  };

  // Tab inserts two spaces instead of moving focus while editing code.
  const onCodeKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const next = s.code.slice(0, start) + "  " + s.code.slice(end);
      s.setCode(next);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
    }
  };

  const hasChrome = s.showWindowControls || !!s.title;

  return (
    <div className="flex h-full">
      {/* Left rail — nav + zoom */}
      <aside className="z-50 flex h-full w-[68px] shrink-0 flex-col items-start py-2 pl-2">
        <div className="flex h-full min-h-0 w-[52px] flex-col items-center rounded-2xl border border-hairline bg-bg-elevated/90 py-1.5 shadow-panel backdrop-blur-xl dark:border-white/10 dark:bg-panel-2/85">
          <div className="flex shrink-0 flex-col items-center px-1.5">
            <Tooltip label={t("snippet.back")} side="right">
              <button type="button" onClick={onBack} className={cn(railBtn, railBtnIdle)}>
                <ArrowLeft size={18} />
              </button>
            </Tooltip>
          </div>

          <div className="my-1.5 h-px w-7 shrink-0 bg-hairline" />

          {/* Zoom controls */}
          <div className="flex shrink-0 flex-col items-center gap-1 px-1.5">
            <Tooltip label={t("snippet.zoomIn")} shortcut="⇧Scroll" side="right">
              <button
                type="button"
                onClick={zoomIn}
                disabled={!hasCode || zoom >= MAX_ZOOM}
                className={cn(railBtn, railBtnIdle, "disabled:pointer-events-none disabled:opacity-30")}
              >
                <ZoomIn size={17} />
              </button>
            </Tooltip>
            <Tooltip label={t("snippet.zoomReset")} side="right">
              <button
                type="button"
                onClick={resetView}
                disabled={!hasCode}
                className={cn(
                  railBtn,
                  railBtnIdle,
                  "text-[10px] font-semibold tabular-nums disabled:pointer-events-none disabled:opacity-30",
                )}
              >
                {Math.round(zoom * 100)}%
              </button>
            </Tooltip>
            <Tooltip label={t("snippet.zoomOut")} shortcut="⇧Scroll" side="right">
              <button
                type="button"
                onClick={zoomOut}
                disabled={!hasCode || zoom <= MIN_ZOOM}
                className={cn(railBtn, railBtnIdle, "disabled:pointer-events-none disabled:opacity-30")}
              >
                <ZoomOut size={17} />
              </button>
            </Tooltip>
            <Tooltip label={t("snippet.zoomFit")} side="right">
              <button
                type="button"
                onClick={resetView}
                disabled={!hasCode}
                className={cn(railBtn, railBtnIdle, "disabled:pointer-events-none disabled:opacity-30")}
              >
                <Maximize2 size={16} />
              </button>
            </Tooltip>
          </div>
        </div>
      </aside>

      {/* Center: canvas (no scrollbars — pan with middle mouse) */}
      <div
        ref={canvasRef}
        onWheel={onWheel}
        onMouseDown={onCanvasMouseDown}
        className={cn(
          "relative z-10 flex flex-1 items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_center,#1a1b2e_0%,#0a0a12_100%)] px-10 pb-14 pt-10",
          panning ? "cursor-grabbing" : "cursor-default",
        )}
      >
        {/* Floating action bar — real, labeled Copy / Save buttons */}
        {hasCode && (
          <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
            <button
              type="button"
              onClick={onCopy}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-bg-elevated/90 px-3 py-2 text-xs font-semibold text-fg shadow-panel backdrop-blur transition-colors hover:bg-hover disabled:pointer-events-none disabled:opacity-40"
            >
              <Copy size={15} /> {t("snippet.copy")}
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white shadow-[0_4px_14px_-4px_rgba(124,58,237,0.6)] transition-colors hover:bg-brand-hover disabled:pointer-events-none disabled:opacity-40"
            >
              <Save size={15} /> {t("snippet.save")}
            </button>
          </div>
        )}

        {!hasCode && !focusCode ? (
          // Empty state — paste prompt
          <div className="flex w-full max-w-2xl flex-col gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-white/80">
              <Code2 size={16} /> {t("snippet.pasteTitle")}
            </div>
            <textarea
              autoFocus
              value={s.code}
              onChange={(e) => s.setCode(e.target.value)}
              onKeyDown={onCodeKeyDown}
              placeholder={t("snippet.pastePlaceholder")}
              spellCheck={false}
              className="h-72 w-full resize-none rounded-xl border border-white/10 bg-black/40 p-4 font-mono text-sm text-white/90 outline-none placeholder:text-white/30 focus-visible:ring-2 focus-visible:ring-brand/60"
            />
            <button
              type="button"
              onClick={() => s.setCode(SAMPLE)}
              className="self-start text-xs text-white/50 underline-offset-2 hover:text-white/80 hover:underline"
            >
              {t("snippet.insertSample")}
            </button>
          </div>
        ) : (
          // Zoom + pan stage. The transform lives on this wrapper so the inner
          // frame stays at 1x for a crisp, offset-free export.
          <div
            className="transition-transform duration-75"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "center center",
            }}
          >
            <div
              ref={frameRef}
              className="inline-block"
              style={{
                background,
                padding: s.padding,
                borderRadius: background === "transparent" ? 0 : Math.min(s.borderRadius + 8, 40),
              }}
            >
              <div
                className="overflow-hidden shadow-[0_24px_60px_-12px_rgba(0,0,0,0.6)]"
                style={{ borderRadius: s.borderRadius }}
              >
                {hasChrome && (
                  <div
                    className="flex items-center gap-2 px-4 py-2.5"
                    style={{ background: "rgba(0,0,0,0.28)" }}
                  >
                    {s.showWindowControls && (
                      <div className="flex gap-1.5">
                        <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
                        <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
                        <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
                      </div>
                    )}
                    {s.title && (
                      <span className="flex-1 truncate text-center text-xs font-medium text-white/70">
                        {s.title}
                      </span>
                    )}
                    {s.showWindowControls && s.title && <div className="w-[52px]" />}
                  </div>
                )}

                {/* Code layer: highlighted HTML underneath, transparent textarea
                    on top for live editing. Both share identical metrics so the
                    caret/glyphs line up. */}
                <div className="relative">
                  <div
                    className={cn("snippet-code", s.showLineNumbers && "snippet-line-numbers")}
                    style={{ fontSize: s.fontSize, lineHeight: 1.6 }}
                    dangerouslySetInnerHTML={{ __html: html }}
                    aria-hidden
                  />
                  <textarea
                    data-snapshot-ignore="true"
                    value={s.code}
                    onChange={(e) => s.setCode(e.target.value)}
                    onKeyDown={onCodeKeyDown}
                    onFocus={() => setFocusCode(true)}
                    onBlur={() => setFocusCode(false)}
                    spellCheck={false}
                    wrap="off"
                    className={cn(
                      "snippet-code-overlay absolute inset-0 h-full w-full resize-none whitespace-pre bg-transparent text-transparent caret-white outline-none",
                      s.showLineNumbers && "snippet-line-numbers-overlay",
                    )}
                    style={{ fontSize: s.fontSize, lineHeight: 1.6 }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer hint */}
        {hasCode && (
          <div
            data-snapshot-ignore="true"
            className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-md bg-bg-elevated/85 px-2.5 py-1 text-xs text-fg-subtle backdrop-blur"
          >
            {t("snippet.canvasHint")} · {resolvedLang} · {Math.round(zoom * 100)}%
          </div>
        )}
      </div>

      <SnippetToolbar />
    </div>
  );
}

export default SnippetEditor;
