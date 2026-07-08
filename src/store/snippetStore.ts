import { create } from "zustand";

/** Languages Shiki preloads for the snippet editor. Keep in sync with lib/snippet.ts. */
export type SnippetLang =
  | "auto"
  | "javascript"
  | "typescript"
  | "jsx"
  | "tsx"
  | "python"
  | "rust"
  | "go"
  | "java"
  | "c"
  | "cpp"
  | "csharp"
  | "php"
  | "ruby"
  | "html"
  | "css"
  | "json"
  | "yaml"
  | "sql"
  | "bash"
  | "markdown";

export type SnippetTheme =
  | "github-dark"
  | "github-light"
  | "dracula"
  | "nord"
  | "one-dark-pro"
  | "monokai"
  | "vitesse-dark"
  | "vitesse-light";

interface SnippetState {
  code: string;
  language: SnippetLang;
  theme: SnippetTheme;
  /** Index into the BACKGROUNDS preset list, or -1 for a custom solid color. */
  backgroundIndex: number;
  customBackground: string;
  padding: number;
  fontSize: number;
  borderRadius: number;
  showLineNumbers: boolean;
  showWindowControls: boolean;
  title: string;

  setCode: (v: string) => void;
  setLanguage: (v: SnippetLang) => void;
  setTheme: (v: SnippetTheme) => void;
  setBackgroundIndex: (v: number) => void;
  setCustomBackground: (v: string) => void;
  setPadding: (v: number) => void;
  setFontSize: (v: number) => void;
  setBorderRadius: (v: number) => void;
  setShowLineNumbers: (v: boolean) => void;
  setShowWindowControls: (v: boolean) => void;
  setTitle: (v: string) => void;
  reset: () => void;
}

const DEFAULTS = {
  code: "",
  language: "auto" as SnippetLang,
  theme: "github-dark" as SnippetTheme,
  backgroundIndex: 0,
  customBackground: "#1e1e2e",
  padding: 48,
  fontSize: 15,
  borderRadius: 12,
  showLineNumbers: true,
  showWindowControls: true,
  title: "",
};

export const useSnippetStore = create<SnippetState>((set) => ({
  ...DEFAULTS,

  setCode: (code) => set({ code }),
  setLanguage: (language) => set({ language }),
  setTheme: (theme) => set({ theme }),
  setBackgroundIndex: (backgroundIndex) => set({ backgroundIndex }),
  setCustomBackground: (customBackground) => set({ customBackground, backgroundIndex: -1 }),
  setPadding: (padding) => set({ padding }),
  setFontSize: (fontSize) => set({ fontSize }),
  setBorderRadius: (borderRadius) => set({ borderRadius }),
  setShowLineNumbers: (showLineNumbers) => set({ showLineNumbers }),
  setShowWindowControls: (showWindowControls) => set({ showWindowControls }),
  setTitle: (title) => set({ title }),
  reset: () => set({ ...DEFAULTS }),
}));
