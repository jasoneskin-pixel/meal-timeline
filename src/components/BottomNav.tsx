"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Meals", icon: "🗓️", match: (p: string) => p === "/" || p.startsWith("/meals") },
  { href: "/library", label: "Library", icon: "📚", match: (p: string) => p.startsWith("/library") || p.startsWith("/dishes") },
  { href: "/settings", label: "Settings", icon: "⚙️", match: (p: string) => p.startsWith("/settings") },
];

export default function BottomNav() {
  const path = usePathname();
  if (path.startsWith("/login") || path.endsWith("/cook")) return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-2xl">
        {TABS.map((t) => {
          const active = t.match(path);
          return (
            <Link key={t.href} href={t.href} className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-semibold ${active ? "text-accent" : "text-muted"}`}>
              <span className="text-xl leading-none">{t.icon}</span>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
