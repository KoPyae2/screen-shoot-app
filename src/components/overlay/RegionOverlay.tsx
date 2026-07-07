import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import type { RegionInitPayload } from "../../lib/types";
import {
  cancelRegionCapture,
  finishRegionCapture,
  regionImageBytes,
  regionPayload,
} from "../../lib/commands";

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function RegionOverlay() {
  const { t } = useTranslation();
  const [payload, setPayload] = useState<RegionInitPayload | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const fetchPayload = async () => {
    const label = getCurrentWindow().label;
    const p = await regionPayload(label);
    if (!p) return;
    setPayload(p);
    setRect(null);
    setDragging(false);
    start.current = null;

    // Binary fast path: raw RGBA bytes over Tauri's binary IPC channel.
    // Skips PNG encode + disk write + asset-protocol fetch + PNG decode
    // entirely. The bytes paint straight to a canvas via putImageData.
    try {
      const buf = await regionImageBytes(label);
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = p.phys_w;
      canvas.height = p.phys_h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      // Uint8ClampedArray view over the ArrayBuffer is zero-copy.
      const imgData = new ImageData(new Uint8ClampedArray(buf), p.phys_w, p.phys_h);
      ctx.putImageData(imgData, 0, 0);
    } catch {
      // Image not ready yet — the dim layer still shows; user can retry.
    }
  };

  // Initial fetch (covers first-ever creation, before the listener is ready).
  useEffect(() => {
    fetchPayload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the backend reuses this window for a new capture it emits
  // "region-refresh"; reload the frozen image and reset the selection.
  useEffect(() => {
    // Hold the promise, not the resolved fn: if the component unmounts before
    // listen() resolves, the unsubscriber would be lost and the listener leaked.
    const un = listen("region-refresh", () => fetchPayload());
    return () => {
      un.then((f) => f());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancelRegionCapture().catch(() => {});
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onMouseDown = (e: React.MouseEvent) => {
    start.current = { x: e.clientX, y: e.clientY };
    setRect({ x: e.clientX, y: e.clientY, w: 0, h: 0 });
    setDragging(true);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!start.current) return;
    const sx = start.current.x;
    const sy = start.current.y;
    setRect({
      x: Math.min(sx, e.clientX),
      y: Math.min(sy, e.clientY),
      w: Math.abs(e.clientX - sx),
      h: Math.abs(e.clientY - sy),
    });
  };

  const onMouseUp = async () => {
    setDragging(false);
    start.current = null;
    if (!payload || !rect || rect.w < 4 || rect.h < 4) {
      // Too small to capture — clear the leftover selection box.
      setRect(null);
      return;
    }
    // Map CSS pixels → physical image pixels using the real rendered viewport
    // size vs. the frozen image size. This is exact regardless of DPI scaling.
    const rx = payload.phys_w / window.innerWidth;
    const ry = payload.phys_h / window.innerHeight;
    const x = Math.round(rect.x * rx);
    const y = Math.round(rect.y * ry);
    const w = Math.round(rect.w * rx);
    const h = Math.round(rect.h * ry);
    try {
      await finishRegionCapture(payload.monitor_id, x, y, w, h);
    } catch {
      cancelRegionCapture();
    }
  };

  return (
    <div
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      style={{ position: "fixed", inset: 0, overflow: "hidden" }}
    >
      {payload && (
        <canvas
          ref={canvasRef}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        />
      )}
      {/* Dim layer */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(8,10,16,0.55)" }} />

      {/* Selection window (clear "hole" + border) */}
      {rect && (
        <>
          <div
            style={{
              position: "absolute",
              left: rect.x,
              top: rect.y,
              width: rect.w,
              height: rect.h,
              boxShadow: "0 0 0 9999px rgba(8,10,16,0.55)",
              border: "1.5px solid #8577ff",
              borderRadius: 2,
            }}
          />
          {rect.w > 40 && rect.h > 24 && (
            <div
              style={{
                position: "absolute",
                left: rect.x,
                top: Math.max(0, rect.y - 26),
                background: "#161a24",
                color: "#e7eaf0",
                fontSize: 11,
                padding: "3px 8px",
                borderRadius: 6,
                fontFamily: "Inter, sans-serif",
                border: "1px solid #262c3a",
              }}
            >
              {payload ? Math.round(rect.w * (payload.phys_w / window.innerWidth)) : rect.w} ×{" "}
              {payload ? Math.round(rect.h * (payload.phys_h / window.innerHeight)) : rect.h}
            </div>
          )}
        </>
      )}

      {!dragging && (
        <div
          style={{
            position: "absolute",
            top: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(22,26,36,0.9)",
            color: "#9aa3b2",
            fontSize: 13,
            padding: "8px 16px",
            borderRadius: 999,
            fontFamily: "Inter, sans-serif",
            border: "1px solid #262c3a",
            backdropFilter: "blur(6px)",
          }}
        >
          {t("overlay.dragHint", { esc: t("overlay.esc") })}
        </div>
      )}
    </div>
  );
}
