import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import i18n from "../i18n/i18n";

/** Merge Tailwind class names with conditional support. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const min = 60_000;
  const hr = 60 * min;
  const day = 24 * hr;
  if (diff < min) return i18n.t("time.justNow");
  if (diff < hr) return i18n.t("time.minutesAgo", { n: Math.floor(diff / min) });
  if (diff < day) return i18n.t("time.hoursAgo", { n: Math.floor(diff / hr) });
  if (diff < 7 * day) return i18n.t("time.daysAgo", { n: Math.floor(diff / day) });
  return new Date(iso).toLocaleDateString();
}
