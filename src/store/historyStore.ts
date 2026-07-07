import { create } from "zustand";
import type { HistoryEntry } from "../lib/types";
import { historyClear, historyDelete, historyList } from "../lib/commands";
import { toast } from "../components/ui/Toast";

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
    try {
      await historyDelete(id);
    } catch (e) {
      toast.error(String(e));
    }
    await get().refresh();
  },
  clear: async () => {
    try {
      await historyClear();
    } catch (e) {
      toast.error(String(e));
    }
    await get().refresh();
  },
}));
