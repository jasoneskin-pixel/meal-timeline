"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";

/** Slim top bar with a refresh button, since home-screen web apps have no browser reload. */
export default function TopBar() {
  const path = usePathname();
  const [spinning, setSpinning] = useState(false);
  if (path.startsWith("/login")) return null;
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/95 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-2">
        <span className="text-sm font-bold text-muted">⏲️ Meal Timeline</span>
        <button
          type="button"
          aria-label="Refresh"
          onClick={() => {
            setSpinning(true);
            window.location.reload();
          }}
          className="flex h-9 items-center gap-1.5 rounded-full border border-line bg-white px-3 text-sm font-semibold text-ink active:bg-line"
        >
          <span className={`inline-block text-base leading-none ${spinning ? "animate-spin" : ""}`}>↻</span>
          Refresh
        </button>
      </div>
    </header>
  );
}
