import { create } from "zustand";
import type { HistoryEntry } from "../lib/types";
import { historyClear, historyDelete, historyList } from "../lib/commands";

interface HistoryState {
  entries: HistoryEntry[];
  refresh: () => Promise<void>;
  remove: (id: string) => Promise<void>;
  clear: () => Promise<void>;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  entries: [],
  refresh: async () => {
    try {
      set({ entries: await historyList() });
    } catch {
      set({ entries: [] });
    }
  },
  remove: async (id) => {
    await historyDelete(id);
    await get().refresh();
  },
  clear: async () => {
    await historyClear();
    await get().refresh();
  },
}));
