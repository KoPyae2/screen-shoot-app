import { Trash2 } from "lucide-react";
import type { HistoryEntry } from "../../lib/types";
import { assetUrl } from "../../lib/commands";
import { formatRelativeTime } from "../../lib/utils";

interface Props {
  entry: HistoryEntry;
  onOpen: () => void;
  onDelete: () => void;
}

export function Thumbnail({ entry, onOpen, onDelete }: Props) {
  return (
    <div className="group relative overflow-hidden rounded-lg border border-border bg-panel transition-all hover:border-cyan-400/40 hover:shadow-cyan-glow">
      <button onClick={onOpen} className="block w-full">
        <div className="aspect-video w-full overflow-hidden bg-bg">
          <img
            src={assetUrl(entry.thumb)}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </div>
        <div className="flex items-center justify-between px-2.5 py-1.5">
          <span className="text-[11px] text-fg-subtle">{formatRelativeTime(entry.created_at)}</span>
          <span className="text-[11px] text-fg-subtle">
            {entry.width}×{entry.height}
          </span>
        </div>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md bg-backdrop text-fg-muted opacity-0 backdrop-blur transition-all hover:bg-danger/80 hover:text-white group-hover:opacity-100"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
