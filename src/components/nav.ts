"use client";
import { useEffect, useState } from "react";

export const TABS = [
  { href: "/active", label: "Active", icon: "🔥", match: (p: string) => p.startsWith("/active") || p.endsWith("/cook") },
  { href: "/library", label: "Library", icon: "📚", match: (p: string) => p.startsWith("/library") || p.startsWith("/dishes") },
  { href: "/meals", label: "Meals", icon: "🗓️", match: (p: string) => p.startsWith("/meals") && !p.endsWith("/cook") },
  { href: "/settings", label: "Settings", icon: "⚙️", match: (p: string) => p.startsWith("/settings") },
];

/** Number of active timelines, refreshed whenever the page changes. */
export function useActiveCount(path: string, enabled: boolean): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetch("/api/active")
      .then((r) => (r.ok ? r.json() : []))
      .then((list: unknown[]) => !cancelled && setCount(Array.isArray(list) ? list.length : 0))
      .catch(() => {});
    return () => { cancelled = true; };
  }, [path, enabled]);
  return count;
}
