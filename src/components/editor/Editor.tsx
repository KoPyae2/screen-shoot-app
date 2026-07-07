import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import Konva from "konva";
import { Stage, Layer, Image as KonvaImage, Transformer } from "react-konva";
import useImage from "use-image";
import { copyBytesToClipboard, readImageDataUrl, saveImageBytes } from "../../lib/commands";
import { dataUrlToBase64 } from "../../lib/export";
import { useEditorStore, type Shape } from "../../store/editorStore";
import type { CaptureResult } from "../../lib/types";
import { LeftToolbar, RightToolbar } from "./EditorToolbar";
import { ShapeNode } from "./shapes/ShapeNode";
import { toast } from "../ui/Toast";

interface Props {
  capture: CaptureResult;
  onBack: () => void;
}

let idCounter = 1;
const newId = () => `s${idCounter++}_${Math.floor(performance.now())}`;

export function Editor({ capture, onBack }: Props) {
  const { t } = useTranslation();
  const [dataUrl, setDataUrl] = useState<string | undefined>(undefined);
  const [image] = useImage(dataUrl ?? "");
  const shapes = useEditorStore((s) => s.shapes);
  const tool = useEditorStore((s) => s.tool);
  const color = useEditorStore((s) => s.color);
  const strokeWidth = useEditorStore((s) => s.strokeWidth);
  const fontSize = useEditorStore((s) => s.fontSize);
  const redactStrength = useEditorStore((s) => s.redactStrength);
  const selectedId = useEditorStore((s) => s.selectedId);
  const select = useEditorStore((s) => s.select);
  const addShape = useEditorStore((s) => s.addShape);
  const updateShape = useEditorStore((s) => s.updateShape);
  const updateShapeCommit = useEditorStore((s) => s.updateShapeCommit);
  const removeSelected = useEditorStore((s) => s.removeSelected);
  const discardShape = useEditorStore((s) => s.discardShape);
  const reset = useEditorStore((s) => s.reset);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const setTool = useEditorStore((s) => s.setTool);

  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const drawingId = useRef<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Live shape ref for batched updates during drawing.
  const liveShapeRef = useRef<Shape | null>(null);
  // Throttle Zustand writes to once per animation frame.
  const rafScheduledRef = useRef(false);
  const [scale, setScale] = useState(1);
  const [busy, setBusy] = useState(false);
  const [editingText, setEditingText] = useState<{ id: string; x: number; y: number } | null>(null);

  // New capture → clear the canvas.
  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capture.id]);

  // Load the base image as a data URL so the canvas stays untainted (toDataURL works).
  useEffect(() => {
    let alive = true;
    setDataUrl(undefined);
    readImageDataUrl(capture.path)
      .then((url) => {
        if (alive) setDataUrl(url);
      })
      .catch((e) => {
        if (alive) toast.error(String(e));
      });
    return () => {
      alive = false;
    };
  }, [capture.path]);

  // Fit the image into the available viewport.
  useEffect(() => {
    const fit = () => {
      const el = containerRef.current;
      if (!el || !capture.width) return;
      const pad = 48;
      const sw = (el.clientWidth - pad) / capture.width;
      const sh = (el.clientHeight - pad) / capture.height;
      setScale(Math.min(1, sw, sh));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [capture.width, capture.height]);

  // Attach transformer to the selected node (only in select mode).
  useEffect(() => {
    const tr = trRef.current;
    const stage = stageRef.current;
    if (!tr || !stage) return;
    if (selectedId && tool === "select") {
      const node = stage.findOne(`#${selectedId}`);
      tr.nodes(node ? [node] : []);
    } else {
      tr.nodes([]);
    }
    tr.getLayer()?.batchDraw();
  }, [selectedId, tool, shapes]);

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editingText) return;
      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
        return;
      }
      if (meta && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId) {
          e.preventDefault();
          removeSelected();
        }
        return;
      }
      const map: Record<string, typeof tool> = {
        v: "select",
        a: "arrow",
        r: "rect",
        o: "ellipse",
        p: "pen",
        t: "text",
        h: "highlighter",
        b: "blur",
        x: "pixelate",
      };
      if (!meta && map[e.key.toLowerCase()]) setTool(map[e.key.toLowerCase()]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editingText, redo, undo, selectedId, removeSelected, setTool]);

  const relPos = () => {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };
    const p = stage.getPointerPosition();
    if (!p) return { x: 0, y: 0 };
    // Use Konva's inverse transform to correctly map pointer position into
    // the stage's logical coordinate space, accounting for scale/offset.
    const transform = stage.getAbsoluteTransform().copy();
    transform.invert();
    const pos = transform.point(p);
    return { x: pos.x, y: pos.y };
  };

  const onMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // If a text editor is open, commit it and let this click through normally
    // on the NEXT click. This prevents the "stuck editingText" bug where one
    // failed text attempt blocks all future canvas interaction.
    if (editingText) {
      commitText();
      return;
    }
    // Clicking empty canvas in select mode clears selection.
    if (tool === "select") {
      if (e.target === e.target.getStage() || e.target.hasName("base-image")) {
        select(null);
      }
      return;
    }
    const { x, y } = relPos();
    const id = newId();
    drawingId.current = id;
    // Slider values are perceived (on-screen) sizes; store them in canvas
    // coordinates by dividing by the display scale so they look consistent
    // whether the capture is shown at 30% or 100%.
    const sw = strokeWidth / scale;
    const fs = fontSize / scale;

    if (tool === "arrow") {
      addShape({ id, type: "arrow", points: [x, y, x, y], stroke: color, strokeWidth: sw });
    } else if (tool === "rect") {
      addShape({ id, type: "rect", x, y, width: 0, height: 0, stroke: color, strokeWidth: sw });
    } else if (tool === "ellipse") {
      addShape({ id, type: "ellipse", x, y, width: 0, height: 0, stroke: color, strokeWidth: sw });
    } else if (tool === "pen") {
      addShape({ id, type: "pen", points: [x, y], stroke: color, strokeWidth: sw });
    } else if (tool === "highlighter") {
      addShape({ id, type: "highlighter", points: [x, y], stroke: color, strokeWidth: Math.max(14, strokeWidth * 3) / scale });
    } else if (tool === "blur" || tool === "pixelate") {
      addShape({ id, type: tool, x, y, width: 0, height: 0, stroke: color, strokeWidth: 0, strength: redactStrength });
    } else if (tool === "text") {
      addShape({ id, type: "text", x, y, text: "", fontSize: fs, stroke: color, strokeWidth: 0 });
      drawingId.current = null;
      setEditingText({ id, x, y });
      // Do NOT switch to "select" here — doing so triggers the transformer
      // effect which calls batchDraw() and steals focus from the <textarea>,
      // causing its onBlur to fire with empty text and delete the shape.
    }
  };

  const onMouseMove = useCallback(() => {
    const id = drawingId.current;
    if (!id) return;
    const { x, y } = relPos();
    const shape = useEditorStore.getState().shapes.find((s) => s.id === id);
    if (!shape) return;

    let patch: Partial<Shape> | null = null;
    if (shape.type === "arrow") {
      patch = { points: [shape.points[0], shape.points[1], x, y] } as Partial<Shape>;
    } else if (shape.type === "pen" || shape.type === "highlighter") {
      patch = { points: [...shape.points, x, y] } as Partial<Shape>;
    } else if (shape.type === "rect" || shape.type === "ellipse" || shape.type === "blur" || shape.type === "pixelate") {
      patch = { width: x - shape.x, height: y - shape.y } as Partial<Shape>;
    }
    if (!patch) return;

    // Normalize geometry so the component never sees negative width/height.
    let normalized = { ...shape, ...patch } as Shape;
    if ("width" in normalized && (normalized.type === "rect" || normalized.type === "ellipse" || normalized.type === "blur" || normalized.type === "pixelate")) {
      let { x: nx, y: ny, width, height } = normalized;
      if (width < 0) { nx += width; width = -width; }
      if (height < 0) { ny += height; height = -height; }
      normalized = { ...normalized, x: nx, y: ny, width, height } as Shape;
    }
    liveShapeRef.current = normalized;

    // Throttle Zustand writes to once per animation frame to keep drawing smooth.
    if (!rafScheduledRef.current) {
      rafScheduledRef.current = true;
      requestAnimationFrame(() => {
        rafScheduledRef.current = false;
        if (liveShapeRef.current) {
          updateShape(liveShapeRef.current.id, liveShapeRef.current);
        }
      });
    }
  }, [updateShape]);

  const onMouseUp = useCallback(() => {
    const id = drawingId.current;
    drawingId.current = null;
    if (!id) return;

    // Use the live shape ref as source of truth (may be fresher than the store).
    const live = liveShapeRef.current;
    liveShapeRef.current = null;
    const shape = (live && live.id === id) ? live : useEditorStore.getState().shapes.find((s) => s.id === id);
    if (!shape) return;

    if ("width" in shape && (shape.type === "rect" || shape.type === "ellipse" || shape.type === "blur" || shape.type === "pixelate")) {
      let { x, y, width, height } = shape;
      if (width < 0) { x += width; width = -width; }
      if (height < 0) { y += height; height = -height; }
      if (width < 5 || height < 5) {
        discardShape(id);
        return;
      }
      updateShapeCommit(id, { x, y, width, height } as Partial<Shape>);
    } else if (shape.type === "arrow") {
      // A click without a drag leaves an invisible zero-length arrow.
      const [x1, y1, x2, y2] = shape.points;
      if (Math.hypot(x2 - x1, y2 - y1) < 5) {
        discardShape(id);
        return;
      }
    } else if (shape.type === "pen" || shape.type === "highlighter") {
      // A single-point line renders nothing but pollutes undo history.
      if (shape.points.length < 4) {
        discardShape(id);
        return;
      }
    }
    select(id);
  }, [discardShape, select, updateShapeCommit]);

  const editingShape = editingText
    ? (shapes.find((s) => s.id === editingText.id) as Extract<Shape, { type: "text" }> | undefined)
    : undefined;

  // Reliably focus the textarea when it appears. autoFocus is unreliable in
  // WebView2 because the Konva canvas retains focus — we must explicitly steal
  // it after mount. Without this, the textarea never gets focus, the user
  // can't type, and if onBlur never fires, editingText stays set forever
  // (blocking all future canvas clicks via the `if (editingText) return` guard).
  useEffect(() => {
    if (editingText && textareaRef.current) {
      const ta = textareaRef.current;
      // Defer to next tick so the element is fully painted.
      requestAnimationFrame(() => {
        ta.focus();
        ta.select();
      });
    }
  }, [editingText]);

  // Commit the text editing: save the value (or delete if empty) and clear
  // the editing state so the canvas is interactive again.
  const commitText = () => {
    if (!editingText) return;
    const ta = textareaRef.current;
    const val = ta?.value ?? "";
    const store = useEditorStore.getState();
    const shape = store.shapes.find((s) => s.id === editingText.id);
    if (val.trim() === "") {
      if (shape && "text" in shape && shape.text === "") {
        // Never had content → drop it and its addShape undo step entirely.
        store.discardShape(editingText.id);
      } else {
        // Existing text emptied by the user → a real, undoable deletion.
        store.select(editingText.id);
        store.removeSelected();
      }
    } else {
      updateShapeCommit(editingText.id, { text: val } as Partial<Shape>);
    }
    setEditingText(null);
  };

  // Escape cancels the edit: a brand-new empty shape is discarded (it would
  // otherwise linger invisibly forever); an existing shape keeps its old text.
  const cancelText = () => {
    if (!editingText) return;
    const store = useEditorStore.getState();
    const shape = store.shapes.find((s) => s.id === editingText.id);
    if (shape && "text" in shape && shape.text === "") {
      store.discardShape(editingText.id);
    }
    setEditingText(null);
  };

  const flatten = (): string | null => {
    const stage = stageRef.current;
    if (!stage) return null;
    select(null);
    trRef.current?.nodes([]);
    trRef.current?.getLayer()?.batchDraw();
    // Stage is displayed at `scale`; render at 1/scale to recover native pixels.
    const dataUrl = stage.toDataURL({ pixelRatio: 1 / scale, mimeType: "image/png" });
    return dataUrlToBase64(dataUrl);
  };

  const onCopy = async () => {
    setBusy(true);
    try {
      const b64 = flatten();
      if (!b64) return;
      await copyBytesToClipboard(b64);
      toast.success(t("editor.copiedToClipboard"));
    } catch (e) {
      toast.error(String(e));
    } finally {
      setBusy(false);
    }
  };

  const onSave = async () => {
    setBusy(true);
    try {
      const b64 = flatten();
      if (!b64) return;
      // The native save dialog runs Rust-side; a null path means cancelled.
      const path = await saveImageBytes(b64, 92, {
        title: t("editor.saveDialogTitle"),
        defaultName: t("editor.saveDialogDefaultName", { timestamp: Date.now() }),
        pngLabel: t("editor.pngImage"),
        jpegLabel: t("editor.jpegImage"),
      });
      if (path) toast.success(t("editor.saved"));
    } catch (e) {
      toast.error(String(e));
    } finally {
      setBusy(false);
    }
  };

  // Stable callbacks shared by every ShapeNode — inline closures here would
  // defeat their React.memo and re-render all shapes on every rAF tick while
  // drawing. Reading tool/shapes via getState() keeps the identities stable.
  const handleShapeSelect = useCallback((id: string) => {
    const store = useEditorStore.getState();
    if (store.tool === "select") store.select(id);
  }, []);
  const handleShapeChange = useCallback(
    (id: string, patch: Partial<Shape>) => updateShapeCommit(id, patch),
    [updateShapeCommit],
  );
  const handleTextEdit = useCallback((id: string) => {
    const shape = useEditorStore.getState().shapes.find((x) => x.id === id);
    if (shape && shape.type === "text") setEditingText({ id, x: shape.x, y: shape.y });
  }, []);

  const cursor = tool === "select" ? "default" : "crosshair";

  const stageW = capture.width * scale;
  const stageH = capture.height * scale;

  return (
    <div className="flex h-full">
      <LeftToolbar onBack={onBack} onCopy={onCopy} onSave={onSave} busy={busy} />
      <div
        ref={containerRef}
        className="relative z-10 flex flex-1 items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_center,#1a1b2e_0%,#0a0a12_100%)]"
      >
        <div
          className="relative"
          style={{ width: stageW, height: stageH, cursor }}
        >
          <Stage
            ref={stageRef}
            width={stageW}
            height={stageH}
            scaleX={scale}
            scaleY={scale}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
          >
            <Layer>
              {image && (
                <KonvaImage
                  image={image}
                  width={capture.width}
                  height={capture.height}
                  name="base-image"
                  listening={tool === "select"}
                />
              )}
              {shapes.map((s) => (
                <ShapeNode
                  key={s.id}
                  shape={s}
                  image={image}
                  draggable={tool === "select"}
                  onSelect={handleShapeSelect}
                  onChange={handleShapeChange}
                  onTextEdit={handleTextEdit}
                />
              ))}
              <Transformer
                ref={trRef}
                rotateEnabled={false}
                borderStroke="#7c3aed"
                anchorStroke="#7c3aed"
                anchorFill="#fff"
                anchorSize={9}
                ignoreStroke
              />
            </Layer>
          </Stage>

          {/* Inline text editor overlay */}
          {editingText && editingShape && (
            <textarea
              key={editingText.id}
              ref={textareaRef}
              defaultValue={editingShape.text}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onBlur={commitText}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Escape") {
                  e.preventDefault();
                  cancelText();
                }
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  commitText();
                }
              }}
              style={{
                position: "absolute",
                left: editingText.x * scale,
                top: editingText.y * scale,
                fontSize: Math.max(14, editingShape.fontSize * scale),
                color: editingShape.stroke,
                fontWeight: 600,
                lineHeight: 1.2,
                background: "rgba(0,0,0,0.55)",
                border: "2px solid #7c3aed",
                borderRadius: 4,
                outline: "none",
                padding: "4px 6px",
                minWidth: 80,
                minHeight: 32,
                resize: "none",
                overflow: "hidden",
                fontFamily: "'Inter Variable', Inter, sans-serif",
                zIndex: 100,
                boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
              }}
            />
          )}
        </div>

        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-md bg-bg-elevated/80 px-2.5 py-1 text-xs text-fg-subtle backdrop-blur">
          {capture.width}×{capture.height} · {Math.round(scale * 100)}%
        </div>
      </div>
      <RightToolbar />
    </div>
  );
}

export default Editor;
