import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Konva from "konva";
import { Stage, Layer, Image as KonvaImage, Transformer } from "react-konva";
import useImage from "use-image";
import { save as saveDialog } from "@tauri-apps/plugin-dialog";
import { copyBytesToClipboard, readImageDataUrl, saveImageBytes } from "../../lib/commands";
import { dataUrlToBase64 } from "../../lib/export";
import { useEditorStore, type Shape } from "../../store/editorStore";
import type { CaptureResult, ImageFormat } from "../../lib/types";
import { EditorToolbar } from "./EditorToolbar";
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
  const {
    shapes,
    tool,
    color,
    strokeWidth,
    fontSize,
    redactStrength,
    selectedId,
    select,
    addShape,
    updateShape,
    updateShapeCommit,
    removeSelected,
    reset,
    undo,
    redo,
    setTool,
  } = useEditorStore();

  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const drawingId = useRef<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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
      .catch(() => {});
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
    return { x: p.x / scale, y: p.y / scale };
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

  const onMouseMove = () => {
    const id = drawingId.current;
    if (!id) return;
    const { x, y } = relPos();
    const shape = useEditorStore.getState().shapes.find((s) => s.id === id);
    if (!shape) return;

    if (shape.type === "arrow") {
      updateShape(id, { points: [shape.points[0], shape.points[1], x, y] } as Partial<Shape>);
    } else if (shape.type === "pen" || shape.type === "highlighter") {
      updateShape(id, { points: [...shape.points, x, y] } as Partial<Shape>);
    } else if (shape.type === "rect" || shape.type === "ellipse" || shape.type === "blur" || shape.type === "pixelate") {
      updateShape(id, { width: x - shape.x, height: y - shape.y } as Partial<Shape>);
    }
  };

  const onMouseUp = () => {
    const id = drawingId.current;
    drawingId.current = null;
    if (!id) return;
    // Normalize negative-size rects/redactions and drop empty shapes.
    const shape = useEditorStore.getState().shapes.find((s) => s.id === id);
    if (!shape) return;
    if ("width" in shape && (shape.type === "rect" || shape.type === "ellipse" || shape.type === "blur" || shape.type === "pixelate")) {
      let { x, y, width, height } = shape;
      if (width < 0) { x += width; width = -width; }
      if (height < 0) { y += height; height = -height; }
      if (width < 5 || height < 5) {
        removeSelected();
        return;
      }
      updateShape(id, { x, y, width, height } as Partial<Shape>);
    }
    select(id);
  };

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
    if (val.trim() === "") {
      // Empty text → remove the shape.
      useEditorStore.getState().select(editingText.id);
      useEditorStore.getState().removeSelected();
    } else {
      updateShapeCommit(editingText.id, { text: val } as Partial<Shape>);
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
      const path = await saveDialog({
        title: t("editor.saveDialogTitle"),
        defaultPath: t("editor.saveDialogDefaultName", { timestamp: Date.now() }),
        filters: [
          { name: t("editor.pngImage"), extensions: ["png"] },
          { name: t("editor.jpegImage"), extensions: ["jpg", "jpeg"] },
        ],
      });
      if (!path) {
        setBusy(false);
        return;
      }
      const ext = path.split(".").pop()?.toLowerCase();
      const format: ImageFormat = ext === "jpg" || ext === "jpeg" ? "jpg" : "png";
      await saveImageBytes(path, b64, format, 92);
      toast.success(t("editor.saved"));
    } catch (e) {
      toast.error(String(e));
    } finally {
      setBusy(false);
    }
  };

  const cursor = tool === "select" ? "default" : "crosshair";

  const stageW = useMemo(() => capture.width * scale, [capture.width, scale]);
  const stageH = useMemo(() => capture.height * scale, [capture.height, scale]);

  return (
    <div className="flex h-full flex-col">
      <EditorToolbar onBack={onBack} onCopy={onCopy} onSave={onSave} busy={busy} />
      <div
        ref={containerRef}
        className="relative flex flex-1 items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_center,#1a1b2e_0%,#0a0a12_100%)]"
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
                  onSelect={() => tool === "select" && select(s.id)}
                  onChange={(patch) => updateShapeCommit(s.id, patch)}
                  onTextEdit={(id) => {
                    const t = shapes.find((x) => x.id === id) as Extract<Shape, { type: "text" }>;
                    if (t) setEditingText({ id, x: t.x, y: t.y });
                  }}
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
                  setEditingText(null);
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
                fontFamily: "Inter, sans-serif",
                zIndex: 100,
                boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
              }}
            />
          )}
        </div>

        <div className="pointer-events-none absolute bottom-3 right-4 rounded-md bg-bg-elevated/80 px-2.5 py-1 text-xs text-fg-subtle backdrop-blur">
          {capture.width}×{capture.height} · {Math.round(scale * 100)}%
        </div>
      </div>
    </div>
  );
}
