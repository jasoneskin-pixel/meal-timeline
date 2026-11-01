"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TABS, useActiveCount } from "./nav";

/** Phone and iPad-portrait navigation. Larger screens use the Sidebar. */
export default function BottomNav() {
  const path = usePathname();
  const onLogin = path.startsWith("/login");
  const activeCount = useActiveCount(path, !onLogin);
  if (onLogin) return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-2xl md:max-w-3xl">
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
