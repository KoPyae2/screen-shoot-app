import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X } from "lucide-react";

const appWindow = getCurrentWindow();

export function Titlebar() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    appWindow.isMaximized().then(setMaximized);
    const unlisten = appWindow.onResized(() => {
      appWindow.isMaximized().then(setMaximized);
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  return (
    <div className="flex h-10 shrink-0 items-stretch bg-bg-elevated/80 backdrop-blur border-b border-border select-none">
      <div className="flex flex-1 items-center gap-2.5 pl-4" data-tauri-drag-region>
        <img src="/icon.png" alt="Snapture" className="h-4 w-4" draggable={false} />
        <span className="text-sm font-semibold text-fg">Snapture</span>
      </div>
      <div className="flex">
        <button
          onClick={() => appWindow.minimize()}
          className="flex h-full w-11 items-center justify-center text-fg-muted transition-colors hover:bg-hover hover:text-fg"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={() => appWindow.toggleMaximize()}
          className="flex h-full w-11 items-center justify-center text-fg-muted transition-colors hover:bg-hover hover:text-fg"
        >
          <Square size={12} className={maximized ? "" : "scale-90"} />
        </button>
        <button
          onClick={() => appWindow.close()}
          className="flex h-full w-11 items-center justify-center text-fg-muted transition-colors hover:bg-danger hover:text-white"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
