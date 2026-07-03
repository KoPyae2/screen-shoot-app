import { create } from "zustand";

export type ThemePref = "system" | "light" | "dark";
type Resolved = "light" | "dark";

const STORAGE_KEY = "snapture-theme";
const mql = () => window.matchMedia("(prefers-color-scheme: dark)");

function readPref(): ThemePref {
  const v = localStorage.getItem(STORAGE_KEY);
  return v === "light" || v === "dark" || v === "system" ? v : "system";
}

function resolve(pref: ThemePref): Resolved {
  if (pref === "system") return mql().matches ? "dark" : "light";
  return pref;
}

/** Apply the resolved theme to <html> (class + native color-scheme). */
function apply(resolved: Resolved) {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.classList.toggle("light", resolved === "light");
  root.style.colorScheme = resolved;
}

interface ThemeState {
  pref: ThemePref;
  resolved: Resolved;
  setPref: (pref: ThemePref) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  pref: readPref(),
  resolved: resolve(readPref()),
  setPref: (pref) => {
    localStorage.setItem(STORAGE_KEY, pref);
    const resolved = resolve(pref);
    apply(resolved);
    set({ pref, resolved });
  },
}));

// Apply once on load, then keep "system" in sync with the OS preference.
apply(useThemeStore.getState().resolved);
mql().addEventListener("change", () => {
  if (useThemeStore.getState().pref !== "system") return;
  const resolved = resolve("system");
  apply(resolved);
  useThemeStore.setState({ resolved });
});
