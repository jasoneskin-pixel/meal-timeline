"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/active", label: "Active", icon: "🔥", match: (p: string) => p.startsWith("/active") || p.endsWith("/cook") },
  { href: "/library", label: "Library", icon: "📚", match: (p: string) => p.startsWith("/library") || p.startsWith("/dishes") },
  { href: "/", label: "Meals", icon: "🗓️", match: (p: string) => p === "/" || (p.startsWith("/meals") && !p.endsWith("/cook")) },
  { href: "/settings", label: "Settings", icon: "⚙️", match: (p: string) => p.startsWith("/settings") },
];

export default function BottomNav() {
  const path = usePathname();
  const [activeCount, setActiveCount] = useState(0);
  const onLogin = path.startsWith("/login");

  useEffect(() => {
    if (onLogin) return;
    let cancelled = false;
    fetch("/api/active")
      .then((r) => (r.ok ? r.json() : []))
      .then((list: unknown[]) => !cancelled && setActiveCount(Array.isArray(list) ? list.length : 0))
      .catch(() => {});
    return () => { cancelled = true; };
  }, [path, onLogin]);

  if (onLogin) return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-2xl">
        {TABS.map((t) => {
          const active = t.match(path);
          return (
            <Link key={t.href} href={t.href} className={`relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-semibold ${active ? "text-accent" : "text-muted"}`}>
              <span className="text-xl leading-none">{t.icon}</span>
              {t.label}
              {t.href === "/active" && activeCount > 0 && (
                <span className="absolute left-1/2 top-1 ml-2 min-w-5 rounded-full bg-accent px-1.5 text-center text-[11px] font-bold leading-5 text-white">
                  {activeCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
