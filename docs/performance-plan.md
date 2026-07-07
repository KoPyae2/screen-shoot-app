# Snapture — Performance Optimization Plan

**Date:** 2026-07-06  
**App:** Tauri 2 + React 19 desktop screenshot studio  
**Strategy:** tiered fixes — biggest wins first, each independently shippable.

---

## Architecture Summary

```
main.tsx ──► App ──┬── Header (titlebar, lang, theme)
                   ├── HistoryPanel (sidebar, thumbnails)
                   └── main area ──┬── CaptureToolbar (capture modes)
                                    └── Editor ──┬── EditorToolbar
                                                  └── Konva Stage (shapes, image, transformer)
overlay-main.tsx ──► RegionOverlay (canvas + selection rect)
```

State: Zustand (`editorStore`, `historyStore`, `captureStore`, `themeStore`)  
Canvas: `konva` + `react-konva`  
i18n: `i18next` + `react-i18next` + `i18next-browser-languagedetector`  
IPC: `@tauri-apps/api` invoke/listen  
Styling: Tailwind CSS v4 (`@theme inline` tokens)

---

## TIER 1 — Immediate High-Impact (10–20 min each)

### 1. Remove unused `framer-motion` dependency
- **Finding:** `framer-motion@12.x` is in `package.json` but **zero imports** in `src/`. Dead weight ≈ 140 KB min+gzip.
- **Fix:** `npm uninstall framer-motion`, delete from `package.json`.
- **Impact:** ~140 KB off the initial bundle. No code changes needed.

### 2. Slim `@fontsource/geist` to used weights
- **Finding:** All 9 weights (100–900) × multiple language subsets are shipped — ~100+ CSS files. The app only uses Inter-family defaults with `font-semibold`, `font-medium`, `font-bold` etc.
- **Fix A:** Replace with a single Google Fonts `<link>` in `index.html` for Inter (400, 500, 600, 700).
- **Fix B:** Or import only the needed weights: `@fontsource/geist/400.css`, `500.css`, `600.css`.
- **Impact:** ~60–80 KB off bundle, faster font swap on first paint.

### 3. Use Zustand selectors everywhere
- **Finding:** Components call `useEditorStore()` and `useHistoryStore()` with no selector — they subscribe to the **entire** store and re-render on every state change.
- **Current hotspots:**
  - `Editor.tsx` destructures 13 values from `useEditorStore()` → re-renders on any store change.
  - `EditorToolbar.tsx` destructures 12 values → same problem.
  - `HistoryPanel.tsx` uses `entries, refresh, remove, clear` → re-renders when any entry changes.
- **Fix:**
  ```tsx
  // Editor.tsx
  const shapes     = useEditorStore(s => s.shapes);
  const tool       = useEditorStore(s => s.tool);
  const color      = useEditorStore(s => s.color);
  // ... etc
  ```
- **Impact:** Eliminates cascading re-renders during Konva shape updates. Biggest perceived-performance win.

### 4. Memoize `ShapeNode` and `RedactNode`
- **Finding:** Every `shapes.map()` in the `<Stage>` renders a new `ShapeNode`. When `shapes` updates during `onMouseMove`, **all** nodes re-render even if only one changed.
- **Fix:**
  ```tsx
  export const ShapeNode = React.memo(ShapeNodeImpl);
  export const RedactNode = React.memo(RedactNodeImpl);
  ```
- **Caveat:** The `image` prop is the same HTMLImageElement reference, so `React.memo` will correctly skip re-renders when only another shape changes.
- **Impact:** Dramatically reduces Konva node reconciliation during drawing.

### 5. Batch / throttle Konva redraws during mouse move
- **Finding:** `onMouseMove` calls `updateShape(id, patch)` on **every** mouse event, which writes to Zustand, which re-renders `Editor`, which calls the `useEffect([selectedId, tool, shapes])` → `tr.getLayer()?.batchDraw()` on every frame.
- **Fix A:** Replace the `onMouseMove` Zustand write with a `useRef` holding the live shape data, and only commit to Zustand on `onMouseUp`:
  ```tsx
  const liveShape = useRef<Shape | null>(null);
  
  const onMouseMove = () => {
    // ... compute new geometry
    liveShape.current = { ...shape, ...patch };
    // Direct Konva node update without Zustand round-trip:
    const node = stageRef.current?.findOne(`#${id}`);
    node?.setAttrs(patch);
    node?.getLayer()?.batchDraw();
  };
  
  const onMouseUp = () => {
    if (liveShape.current) {
      updateShapeCommit(id, liveShape.current);
    }
    liveShape.current = null;
  };
  ```
- **Fix B (lighter):** Wrap `updateShape` calls in `requestAnimationFrame` to cap at 60fps writes.
- **Impact:** Eliminates 100+ Zustand writes/second during freehand drawing. Smoothness improves immediately.

---

## TIER 2 — Quick Wins (15–30 min each)

### 6. Lazy-load the Editor (Konva) bundle
- **Finding:** `konva` (≈ 300 KB) + `react-konva` are loaded on **every** app launch, even when the user is on the capture screen.
- **Fix:**
  ```tsx
  // App.tsx
  const Editor = React.lazy(() => import("./components/editor/Editor"));
  
  // In render:
  <React.Suspense fallback={<div className="flex-1" />}>
    {view === "editor" && capture && (
      <Editor capture={capture} onBack={() => setView("capture")} />
    )}
  </React.Suspense>
  ```
- **Impact:** Faster cold start. Konva only loads when the user actually captures.

### 7. Memoize the `TOOLS` array and `COLORS` in EditorToolbar
- **Finding:** `TOOLS` contains JSX `<Icon />` elements created at module scope — they're fine. But `COLORS.map()` with inline `selected` calculations runs every render. The `ContextSlider` is re-created conditionally each render.
- **Fix:**
  ```tsx
  const tools = useMemo(() => TOOLS, []); // already constant, but clarifies intent
  const colorSelected = useMemo(
    () => new Set(COLORS.map(c => c.toLowerCase())),
    []
  );
  ```
- **Impact:** Marginal but clean.

### 8. Clean up toast timeouts
- **Finding:** `Toast.tsx` push creates `setTimeout(() => dismiss(id), 3200)` with no cleanup. If the user navigates away, the timeout still fires and mutates Zustand on an unmounted tree.
- **Fix:** Track timeouts in a `useRef<Map>()` and cancel in a `useEffect` cleanup.
- **Impact:** Prevents minor memory leak and potential React warnings.

### 9. Optimize RedactNode re-caching
- **Finding:** `RedactNode`'s `useEffect` calls `node.cache()` on every `[image, shape.x, shape.y, shape.width, shape.height, shape.strength, shape.type]` change. During drag, `x/y/width/height` change every frame → expensive canvas bitmap re-render.
- **Fix:** Only re-cache when `strength` or `type` changes, or when the node is first mounted. During drag, update the Konva node attrs directly (the cache is already valid at the same strength).
  ```tsx
  useEffect(() => {
    const node = ref.current;
    if (!node || !image) return;
    // Only re-cache when the filter parameters change, not on every drag frame.
    if (shape.type === "blur") {
      node.cache();
      node.filters([Konva.Filters.Blur]);
      node.blurRadius(shape.strength);
    } else {
      node.cache();
      node.filters([Konva.Filters.Pixelate]);
      node.pixelSize(Math.max(2, shape.strength));
    }
    node.getLayer()?.batchDraw();
  }, [image, shape.strength, shape.type]); // drop x/y/width/height
  ```
- **Impact:** Smooth blur/pixelate drag; cache only regenerates when strength slider changes.

### 10. Memoize inline callbacks in HistoryPanel
- **Finding:** `onOpen` and `onDelete` arrow functions are re-created every render, causing all `Thumbnail` children to re-render.
- **Fix:** Wrap with `useCallback` or lift handlers to the store.
  ```tsx
  const handleOpen = useCallback((entry: HistoryEntry) => () => {
    onOpen({ id: entry.id, path: entry.path, width: entry.width, height: entry.height });
  }, [onOpen]);
  
  const handleDelete = useCallback((id: string) => () => remove(id), [remove]);
  ```
- **Impact:** Thumbnails only re-render when their own entry changes.

---

## TIER 3 — Medium Effort (30–60 min each)

### 11. Lazy-load i18n locales
- **Finding:** All 5 locale JSON files (`en`, `ch`, `es`, `hi`, `my`) are imported synchronously in `i18n.ts` and bundled into the main chunk. Most users only need one.
- **Fix:** Use i18next's `backend` plugin with lazy loading, or a custom dynamic import:
  ```ts
  // i18n.ts
  const loadLocale = async (lng: string) => {
    const mod = await import(`./locales/${lng}.json`);
    i18n.addResourceBundle(lng, "translation", mod.default);
  };
  // Detect language, then load only that locale + english fallback
  ```
- **Impact:** ~15–20 KB off initial bundle (locale JSON totals).

### 12. Simplify pen/highlighter points during drawing
- **Finding:** Freehand `onMouseMove` does `points: [...shape.points, x, y]` on every event — the `points` array grows unbounded during a single stroke. Each spread creates a new array, triggering Zustand write + re-render.
- **Fix A:** Store points in a `useRef` during drawing, push to Zustand only on `onMouseUp`.
- **Fix B:** Simplify the polyline: only add a point if it's > 2px from the last (Douglas-Peucker lite).
- **Impact:** Smoother freehand, fewer array allocations.

### 13. Add `will-change` hints for Konva animations
- **Finding:** The Stage container and text overlay use `transition-transform` and `hover:scale-105` but lack `will-change` hints.
- **Fix:** Add `will-change: transform` to `.group-hover:scale-105` targets (thumbnails, cards).
- **Impact:** GPU-composited hover animations, smoother on lower-end hardware.

### 14. Optimize export (`flatten`)
- **Finding:** `flatten()` calls `stage.toDataURL({ pixelRatio: 1/scale })` which renders the entire canvas at native resolution. For a 4K screenshot with 50 shapes, this blocks the main thread for 200–500ms.
- **Fix:** Show a "Rendering…" busy state and use `stage.toBlob()` (async) instead of `toDataURL` (sync):
  ```ts
  const flatten = async (): Promise<string | null> => {
    // ... select(null), clear transformer
    return new Promise((resolve) => {
      stageRef.current?.toBlob((blob) => {
        if (!blob) return resolve(null);
        const reader = new FileReader();
        reader.onload = () => resolve(dataUrlToBase64(reader.result as string));
        reader.readAsDataURL(blob);
      }, "image/png", 1 / scale);
    });
  };
  ```
- **Impact:** Non-blocking export; UI stays responsive.

### 15. Cache `formatRelativeTime` results
- **Finding:** `utils.ts:formatRelativeTime` calls `i18n.t()` on **every render** of every `Thumbnail`. With 20 thumbnails, that's 20 i18n lookups per render cycle.
- **Fix:** Memoize by `(iso, lng)` key, or pre-compute in `historyStore.refresh()`:
  ```ts
  refresh: async () => {
    const entries = await historyList();
    set({ entries: entries.map(e => ({ ...e, relativeTime: formatRelativeTime(e.created_at) })) });
  }
  ```
- **Impact:** Reduces i18n calls from O(n) per render to O(n) per refresh.

---

## TIER 4 — Polish (as time permits)

### 16. Add Vite build analysis
- **Fix:** Add `rollup-plugin-visualizer` to `vite.config.ts` build to see bundle composition.
- **Impact:** Ongoing visibility into bundle size regressions.

### 17. Enable Vite CSS code splitting
- **Fix:** Ensure `cssCodeSplit: true` (default in Vite 7, but verify).
- **Impact:** CSS for lazy-loaded components loads on demand.

### 18. Rust-side thumbnail compression
- **Finding:** Thumbnails are stored as-is from the capture pipeline. Large PNGs as thumbnails waste disk and slow list rendering.
- **Fix:** In `src-tauri/src/history.rs`, resize + compress thumbnails to 320px wide JPEG at 70% quality before saving.
- **Impact:** Smaller history directory, faster thumbnail loading.

### 19. Virtualize the HistoryPanel
- **Finding:** `entries.map()` renders all thumbnails. With 200+ captures, this is a real DOM cost.
- **Fix:** Use `@tanstack/react-virtual` (5 KB) or a simple windowed list.
- **Impact:** Constant DOM node count regardless of history size.

### 20. Add `loading="lazy"` verification + decoding hints
- **Finding:** Thumbnails already have `loading="lazy"`. Add `decoding="async"` and `fetchpriority="low"`.
- **Impact:** Marginal — better browser scheduling for offscreen images.

---

## Quick-Reference: Recommended Implementation Order

| # | Task | Tier | Est. Time | Bundle Saved | Perf Gain |
|---|------|------|-----------|-------------|-----------|
| 1 | Remove framer-motion | 1 | 5 min | ~140 KB | Startup |
| 2 | Slim fontsource/geist | 1 | 10 min | ~60 KB | Startup |
| 3 | Zustand selectors | 1 | 15 min | — | Render |
| 4 | React.memo on ShapeNode | 1 | 5 min | — | Render |
| 5 | Batch Konva updates | 1 | 20 min | — | Drawing |
| 6 | Lazy-load Editor | 2 | 15 min | ~250 KB | Startup |
| 7 | Memoize TOOLS/COLORS | 2 | 5 min | — | Render |
| 8 | Toast timeout cleanup | 2 | 10 min | — | Memory |
| 9 | Optimize RedactNode cache | 2 | 15 min | — | Drawing |
| 10 | Memoize HistoryPanel callbacks | 2 | 10 min | — | Render |
| 11 | Lazy-load i18n locales | 3 | 30 min | ~15 KB | Startup |
| 12 | Simplify pen points | 3 | 20 min | — | Drawing |
| 13 | will-change hints | 3 | 10 min | — | Animation |
| 14 | Async export (toBlob) | 3 | 25 min | — | Export |
| 15 | Cache relative time | 3 | 10 min | — | Render |
| 16 | Vite bundle analysis | 4 | 15 min | — | Tooling |
| 17 | CSS code split verify | 4 | 5 min | — | Startup |
| 18 | Rust thumb compression | 4 | 30 min | — | Disk/IO |
| 19 | Virtualize history | 4 | 45 min | — | Render |
| 20 | Decode hints | 4 | 5 min | — | Render |

**Total estimated time for Tiers 1–3:** ~3 hours  
**Total estimated bundle reduction (Tiers 1–3):** ~465 KB off initial load

---

## Files to Modify

| File | Changes |
|------|---------|
| `package.json` | Remove framer-motion, slim fontsource |
| `src/App.tsx` | Lazy-load Editor, add Suspense |
| `src/components/editor/Editor.tsx` | Selectors, batch draw, memo callbacks |
| `src/components/editor/EditorToolbar.tsx` | Selectors, memo TOOLS |
| `src/components/editor/shapes/ShapeNode.tsx` | Add React.memo |
| `src/components/editor/shapes/RedactNode.tsx` | Fix cache deps |
| `src/components/history/HistoryPanel.tsx` | Selectors, useCallback, lazy time |
| `src/components/history/Thumbnail.tsx` | decode hints |
| `src/components/ui/Toast.tsx` | Timeout cleanup |
| `src/i18n/i18n.ts` | Lazy locale loading |
| `src/lib/utils.ts` | Cache formatRelativeTime |
| `src/store/editorStore.ts` | (no changes — just usage) |
| `src/store/historyStore.ts` | Pre-compute relative time |
| `vite.config.ts` | Add visualizer plugin |
| `index.html` | Google Fonts link (if switching from fontsource) |
| `src-tauri/src/history.rs` | Thumbnail compression |
