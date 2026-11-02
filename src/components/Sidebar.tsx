"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TABS, useActiveCount } from "./nav";

/** Left sidebar for iPad landscape and desktop. */
export default function Sidebar() {
  const path = usePathname();
  const activeCount = useActiveCount(path, true);
  const [spinning, setSpinning] = useState(false);
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-white/70 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] backdrop-blur lg:flex print:hidden">
      <Link href="/" className="mb-6 flex items-center gap-2 px-3 text-lg font-bold">
        <span className="text-2xl">⏲️</span> Meal Timeline
      </Link>
      <nav className="flex flex-col gap-1">
        {TABS.map((t) => {
          const active = t.match(path);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 font-semibold transition ${active ? "bg-accent/10 text-accent" : "text-ink hover:bg-bg"}`}
            >
              <span className="text-xl leading-none">{t.icon}</span>
              <span className="flex-1">{t.label}</span>
              {t.href === "/active" && activeCount > 0 && (
                <span className="min-w-6 rounded-full bg-accent px-2 text-center text-xs font-bold leading-6 text-white">{activeCount}</span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto space-y-2 px-1">
        <Link href="/meals/new" className="btn-primary w-full">+ New meal</Link>
        <Link href="/dishes/new" className="btn-ghost w-full">+ New dish</Link>
        <button
          type="button"
          onClick={() => { setSpinning(true); window.location.reload(); }}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-muted hover:bg-bg"
        >
          <span className={`inline-block ${spinning ? "animate-spin" : ""}`}>↻</span> Refresh
        </button>
      </div>
    </aside>
  );
}
