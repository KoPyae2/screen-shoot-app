import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Github } from "lucide-react";
import { CaptureToolbar } from "./components/capture/CaptureToolbar";
import { HistoryPanel } from "./components/history/HistoryPanel";
import { Toaster } from "./components/ui/Toast";
import { Header } from "./components/ui/Header";
import { onCaptureReady, onCaptureRequest, onHistoryChanged } from "./lib/events";
import { useCapture } from "./hooks/useCapture";
import { useHistoryStore } from "./store/historyStore";
import { failedShortcuts } from "./lib/commands";
import { toast } from "./components/ui/Toast";
import type { CaptureResult } from "./lib/types";

type View = "capture" | "editor" | "snippet";

const EditorLazy = React.lazy(() => import("./components/editor/Editor"));
const SnippetEditorLazy = React.lazy(() => import("./components/snippet/SnippetEditor"));

export default function App() {
  const { t } = useTranslation();
  const [view, setView] = useState<View>("capture");
  const [capture, setCapture] = useState<CaptureResult | null>(null);
  const { fullscreen, region, activeWindow } = useCapture();

  // A new capture (from any mode) opens the editor.
  useEffect(() => {
    const un = onCaptureReady((r) => {
      setCapture(r);
      setView("editor");
    });
    return () => {
      un.then((f) => f());
    };
  }, []);

  // Auto-stored captures → refresh the history panel live.
  useEffect(() => {
    const un = onHistoryChanged(() => {
      useHistoryStore.getState().refresh();
    });
    return () => {
      un.then((f) => f());
    };
  }, []);

  // Global-shortcut / tray capture requests. `fullscreen()` with no argument
  // already resolves the primary monitor and reports errors via toast.
  useEffect(() => {
    const un = onCaptureRequest((kind) => {
      if (kind === "fullscreen") {
        fullscreen();
      } else if (kind === "region") {
        region();
      } else if (kind === "window") {
        activeWindow();
      }
    });
    return () => {
      un.then((f) => f());
    };
  }, [fullscreen, region, activeWindow]);

  // Warn once if any global hotkey couldn't be registered (e.g. taken by
  // another app) — otherwise they silently do nothing.
  useEffect(() => {
    failedShortcuts()
      .then((keys) => {
        if (keys.length) toast.error(t("toast.shortcutError", { keys: keys.join(", ") }));
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openFromHistory = (c: CaptureResult) => {
    setCapture(c);
    setView("editor");
  };

  return (
    <div className="flex h-screen w-screen flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="flex w-72 shrink-0 flex-col border-r border-violet-500/10 bg-bg-elevated/60 backdrop-blur">
        <div className="flex items-center gap-2.5 px-4 py-4">
          <img src="/icon.png" alt="Snapture" className="h-9 w-9 rounded-lg shadow-[0_6px_18px_-4px_rgba(124,58,237,0.5)]" draggable={false} />
          <div>
            <p className="text-sm font-semibold leading-tight">{t("app.name")}</p>
            <p className="text-[11px] text-fg-subtle">{t("app.tagline")}</p>
          </div>
        </div>
        <div className="h-px bg-border" />
        <HistoryPanel onOpen={openFromHistory} />
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-[11px] text-fg-subtle">
          <div className="flex items-center gap-1.5">
            <span>{t("app.version")}</span>
          </div>
          <a href="https://github.com/KoPyae2/screen-shoot-app" target="_blank" rel="noreferrer" className="opacity-60 hover:opacity-100 transition-opacity">
            <Github size={14} />
          </a>
        </div>
      </aside>

        {/* Main content */}
        <main className="relative flex flex-1 flex-col overflow-hidden">
        {view === "snippet" ? (
          <React.Suspense fallback={<div className="flex-1" />}>
            <SnippetEditorLazy onBack={() => setView("capture")} />
          </React.Suspense>
        ) : view === "capture" || !capture ? (
          <div className="flex-1 overflow-y-auto px-8 py-7">
            <CaptureToolbar onCodeSnippet={() => setView("snippet")} />
          </div>
        ) : (
          <React.Suspense fallback={<div className="flex-1" />}>
            <EditorLazy capture={capture} onBack={() => setView("capture")} />
          </React.Suspense>
        )}
        </main>
      </div>

      <Toaster />
    </div>
  );
}
