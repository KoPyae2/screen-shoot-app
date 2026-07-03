import { create } from "zustand";

export type Tool =
  | "select"
  | "arrow"
  | "rect"
  | "ellipse"
  | "pen"
  | "text"
  | "highlighter"
  | "blur"
  | "pixelate";

export interface BaseShape {
  id: string;
  type: Exclude<Tool, "select">;
  stroke: string;
  strokeWidth: number;
}

export interface ArrowShape extends BaseShape {
  type: "arrow";
  points: number[]; // [x1,y1,x2,y2]
}
export interface RectShape extends BaseShape {
  type: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface EllipseShape extends BaseShape {
  type: "ellipse";
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface PenShape extends BaseShape {
  type: "pen";
  points: number[];
}
export interface HighlighterShape extends BaseShape {
  type: "highlighter";
  points: number[];
}
export interface TextShape extends BaseShape {
  type: "text";
  x: number;
  y: number;
  text: string;
  fontSize: number;
}
export interface RedactShape extends BaseShape {
  type: "blur" | "pixelate";
  x: number;
  y: number;
  width: number;
  height: number;
  strength: number;
}

export type Shape =
  | ArrowShape
  | RectShape
  | EllipseShape
  | PenShape
  | HighlighterShape
  | TextShape
  | RedactShape;

interface EditorState {
  shapes: Shape[];
  selectedId: string | null;
  tool: Tool;
  color: string;
  strokeWidth: number;
  fontSize: number;
  redactStrength: number;

  past: Shape[][];
  future: Shape[][];

  setTool: (t: Tool) => void;
  setColor: (c: string) => void;
  setStrokeWidth: (n: number) => void;
  setFontSize: (n: number) => void;
  setRedactStrength: (n: number) => void;
  select: (id: string | null) => void;

  reset: () => void;
  commit: (updater: (shapes: Shape[]) => Shape[]) => void; // records history
  addShape: (s: Shape) => void;
  updateShape: (id: string, patch: Partial<Shape>) => void; // no history (live drag)
  updateShapeCommit: (id: string, patch: Partial<Shape>) => void;
  removeSelected: () => void;
  undo: () => void;
  redo: () => void;
}

const HISTORY_CAP = 60;

export const useEditorStore = create<EditorState>((set, get) => ({
  shapes: [],
  selectedId: null,
  tool: "select",
  color: "#f0556d",
  strokeWidth: 4,
  fontSize: 28,
  redactStrength: 16,

  past: [],
  future: [],

  setTool: (tool) => set({ tool, selectedId: tool === "select" ? get().selectedId : null }),
  setColor: (color) => set({ color }),
  setStrokeWidth: (strokeWidth) => set({ strokeWidth }),
  setFontSize: (fontSize) => set({ fontSize }),
  setRedactStrength: (redactStrength) => set({ redactStrength }),
  select: (selectedId) => set({ selectedId }),

  reset: () => set({ shapes: [], selectedId: null, past: [], future: [] }),

  commit: (updater) => {
    const { shapes, past } = get();
    set({
      past: [...past.slice(-HISTORY_CAP), shapes],
      future: [],
      shapes: updater(shapes),
    });
  },

  addShape: (s) => {
    get().commit((shapes) => [...shapes, s]);
    set({ selectedId: s.id });
  },

  updateShape: (id, patch) =>
    set((st) => ({
      shapes: st.shapes.map((s) => (s.id === id ? ({ ...s, ...patch } as Shape) : s)),
    })),

  updateShapeCommit: (id, patch) =>
    get().commit((shapes) =>
      shapes.map((s) => (s.id === id ? ({ ...s, ...patch } as Shape) : s)),
    ),

  removeSelected: () => {
    const { selectedId } = get();
    if (!selectedId) return;
    get().commit((shapes) => shapes.filter((s) => s.id !== selectedId));
    set({ selectedId: null });
  },

  undo: () => {
    const { past, future, shapes } = get();
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    set({
      past: past.slice(0, -1),
      future: [shapes, ...future],
      shapes: prev,
      selectedId: null,
    });
  },

  redo: () => {
    const { past, future, shapes } = get();
    if (future.length === 0) return;
    const next = future[0];
    set({
      past: [...past, shapes],
      future: future.slice(1),
      shapes: next,
      selectedId: null,
    });
  },
}));
