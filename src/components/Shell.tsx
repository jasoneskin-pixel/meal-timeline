"use client";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import TopBar from "./TopBar";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";

/**
 * Responsive app frame:
 * - Phone and iPad portrait (< 1024px): top bar with refresh + bottom tabs.
 * - iPad landscape and desktop (>= 1024px): left sidebar.
 */
export default function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const bare = path.startsWith("/login");
  return (
    <>
      {!bare && <TopBar />}
      {!bare && <Sidebar />}
      <main
        className={`mx-auto w-full max-w-2xl px-4 pb-28 pt-4 md:max-w-3xl md:px-6 ${
          bare ? "" : "lg:ml-60 lg:w-auto lg:max-w-none lg:px-10 lg:pb-12 lg:pt-8"
        }`}
      >
        {children}
      </main>
      {!bare && <BottomNav />}
    </>
  );
}
