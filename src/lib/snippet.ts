import { toPng } from "html-to-image";
import { createHighlighter, type Highlighter } from "shiki";
import type { SnippetLang, SnippetTheme } from "../store/snippetStore";
import { dataUrlToBase64 } from "./export";

/** Themes offered in the snippet editor (must match SnippetTheme). */
export const THEMES: { id: SnippetTheme; label: string }[] = [
  { id: "github-dark", label: "GitHub Dark" },
  { id: "github-light", label: "GitHub Light" },
  { id: "dracula", label: "Dracula" },
  { id: "nord", label: "Nord" },
  { id: "one-dark-pro", label: "One Dark Pro" },
  { id: "monokai", label: "Monokai" },
  { id: "vitesse-dark", label: "Vitesse Dark" },
  { id: "vitesse-light", label: "Vitesse Light" },
];

/** Languages offered (must match SnippetLang, minus "auto"). */
export const LANGUAGES: { id: Exclude<SnippetLang, "auto">; label: string }[] = [
  { id: "javascript", label: "JavaScript" },
  { id: "typescript", label: "TypeScript" },
  { id: "jsx", label: "JSX" },
  { id: "tsx", label: "TSX" },
  { id: "python", label: "Python" },
  { id: "rust", label: "Rust" },
  { id: "go", label: "Go" },
  { id: "java", label: "Java" },
  { id: "c", label: "C" },
  { id: "cpp", label: "C++" },
  { id: "csharp", label: "C#" },
  { id: "php", label: "PHP" },
  { id: "ruby", label: "Ruby" },
  { id: "html", label: "HTML" },
  { id: "css", label: "CSS" },
  { id: "json", label: "JSON" },
  { id: "yaml", label: "YAML" },
  { id: "sql", label: "SQL" },
  { id: "bash", label: "Shell" },
  { id: "markdown", label: "Markdown" },
];

const THEME_IDS = THEMES.map((t) => t.id);
const LANG_IDS = LANGUAGES.map((l) => l.id);

/** Backgrounds shown in the editor. Each is a CSS `background` value. */
export interface Background {
  label: string;
  css: string;
}

export const BACKGROUNDS: Background[] = [
  { label: "Sunset", css: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)" },
  { label: "Ocean", css: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" },
  { label: "Violet", css: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
  { label: "Aurora", css: "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)" },
  { label: "Mint", css: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)" },
  { label: "Peach", css: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)" },
  { label: "Midnight", css: "linear-gradient(135deg, #2b5876 0%, #4e4376 100%)" },
  { label: "Ember", css: "linear-gradient(135deg, #f83600 0%, #f9d423 100%)" },
  { label: "Steel", css: "linear-gradient(135deg, #757f9a 0%, #d7dde8 100%)" },
  { label: "Charcoal", css: "linear-gradient(135deg, #232526 0%, #414345 100%)" },
  { label: "Transparent", css: "transparent" },
];

/** Resolve the current background CSS from the store selection. */
export function resolveBackground(index: number, custom: string): string {
  if (index < 0 || index >= BACKGROUNDS.length) return custom;
  return BACKGROUNDS[index].css;
}

// ---- Shiki highlighter (lazy singleton) ----

let highlighterPromise: Promise<Highlighter> | null = null;

export function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: THEME_IDS,
      langs: LANG_IDS,
    });
  }
  return highlighterPromise;
}

/**
 * Highlight code to an HTML string. Returns Shiki's `<pre class="shiki">…`
 * markup with inline theme colors. Falls back to plain text on failure.
 */
export async function highlightCode(
  code: string,
  lang: Exclude<SnippetLang, "auto">,
  theme: SnippetTheme,
): Promise<string> {
  const hl = await getHighlighter();
  try {
    return hl.codeToHtml(code, { lang, theme });
  } catch {
    // Unknown token / lang edge cases — degrade to a plaintext render so the
    // preview still shows the code (Shiki's "text" grammar never throws).
    try {
      return hl.codeToHtml(code, { lang: "text" as never, theme });
    } catch {
      return "";
    }
  }
}

/**
 * Best-effort language detection from a code sample. Deliberately simple —
 * covers the common cases so "auto" feels smart without a heavy dependency.
 */
export function detectLanguage(code: string): Exclude<SnippetLang, "auto"> {
  const c = code.trim();
  if (!c) return "javascript";

  // Structured formats first (unambiguous shapes).
  if (/^\s*[{[]/.test(c) && /["}\]]\s*$/.test(c) && /"\s*:/.test(c)) return "json";
  if (/^\s*<(!doctype|html|div|span|p|body|head|section)\b/i.test(c)) return "html";
  if (/^\s*(#!\/.*sh|#!\/usr\/bin\/env (ba)?sh)/.test(c) || /\b(apt-get|sudo|echo|chmod|export )\b/.test(c) && /\$\w/.test(c)) return "bash";

  // Keyword signatures.
  if (/\bfn\s+\w+\s*\(|\blet\s+mut\b|::|impl\s+\w+|println!/.test(c)) return "rust";
  if (/\bfunc\s+\w+\s*\(|\bpackage\s+main\b|:=|import\s+"/.test(c)) return "go";
  if (/\bdef\s+\w+\s*\(|\bimport\s+\w+|\bprint\(|elif\b|^\s*@\w+/m.test(c) && !/;/.test(c)) return "python";
  if (/\b(public|private|protected)\s+(static\s+)?(void|class|int|String)\b|System\.out\.println/.test(c)) return "java";
  if (/#include\s*<|std::|int\s+main\s*\(|::\w/.test(c)) return "cpp";
  if (/\busing\s+System\b|namespace\s+\w+|Console\.WriteLine/.test(c)) return "csharp";
  if (/<\?php|\$\w+\s*=|->\w+\(/.test(c)) return "php";
  if (/\bdef\s+\w+|puts\s+|end\s*$|\brequire\s+['"]/.test(c) && !/;/.test(c)) return "ruby";
  if (/\bSELECT\b.*\bFROM\b|\bINSERT\s+INTO\b|\bCREATE\s+TABLE\b/i.test(c)) return "sql";
  if (/[.#][\w-]+\s*\{[^}]*:/.test(c) && /;/.test(c)) return "css";

  // JS/TS family — refine by TS-only syntax and JSX.
  const hasJsx = /<[A-Za-z][\w]*[\s/>]/.test(c) && /return\s*\(?\s*</.test(c);
  const hasTs = /:\s*(string|number|boolean|any|void|unknown)\b|\binterface\s+\w+|\btype\s+\w+\s*=|<\w+>/.test(c);
  if (hasTs && hasJsx) return "tsx";
  if (hasJsx) return "jsx";
  if (hasTs) return "typescript";
  return "javascript";
}

// ---- Export ----

/**
 * Render a DOM node to a base64-encoded PNG (no data-URL prefix), ready for
 * the `copy_bytes_to_clipboard` / `save_image_bytes` Rust commands.
 * `pixelRatio: 2` yields crisp, retina-quality output.
 */
export async function nodeToPngBase64(node: HTMLElement): Promise<string> {
  const dataUrl = await toPng(node, {
    pixelRatio: 2,
    cacheBust: true,
    // Skip any element opting out of capture (e.g. hover affordances).
    filter: (el) => !(el instanceof HTMLElement && el.dataset.snapshotIgnore === "true"),
  });
  return dataUrlToBase64(dataUrl);
}
