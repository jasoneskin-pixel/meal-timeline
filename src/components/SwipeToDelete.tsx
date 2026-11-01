"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

const OPEN = -92; // how far a swipe slides the row to reveal the button

/**
 * Touch (iPhone, iPad): swipe a row left to reveal an action (Delete by default).
 * Mouse (desktop): a ⋯ button beside the row, or right-click the row, opens a menu with the action.
 */
export default function SwipeToDelete({
  children, onDelete, label = "🗑️ Delete", color = "#dc2626", menuLabel,
}: { children: ReactNode; onDelete: () => void; label?: string; color?: string; menuLabel?: string }) {
  const [x, setX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const xRef = useRef(0);
  const start = useRef<{ x: number; y: number; base: number } | null>(null);
  const swiped = useRef(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const setPos = (v: number) => {
    xRef.current = v;
    setX(v);
  };

  // Close the desktop menu on outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const [icon, ...rest] = label.split(" ");
  const text = rest.join(" ");
  const run = () => {
    setPos(0);
    setMenuOpen(false);
    onDelete();
  };

  return (
    <div className="flex items-start gap-2">
      <div
        className="relative min-w-0 flex-1 overflow-hidden rounded-2xl"
        onContextMenu={(e) => {
          if (window.matchMedia("(pointer: fine)").matches) {
            e.preventDefault();
            setMenuOpen(true);
          }
        }}
      >
        <button
          type="button"
          aria-label={text || label}
          onClick={run}
          className="absolute inset-y-0 right-0 flex items-center justify-end gap-1.5 pr-3.5 font-semibold text-white"
          style={{ width: -OPEN + 24, opacity: x < 0 ? 1 : 0, backgroundColor: color }}
          tabIndex={x < 0 ? 0 : -1}
        >
          <span>{icon}</span>
          {text && <span>{text}</span>}
        </button>
        <div
          className="relative"
          style={{
            transform: `translateX(${x}px)`,
            transition: dragging ? "none" : "transform 200ms ease",
            touchAction: "pan-y",
            WebkitUserSelect: "none",
            userSelect: "none",
          }}
          // Links inside the row would otherwise start a native drag and cancel the swipe.
          onDragStart={(e) => e.preventDefault()}
          onPointerDown={(e) => {
            if (e.pointerType === "mouse") return; // mouse users get the ⋯ menu
            start.current = { x: e.clientX, y: e.clientY, base: xRef.current };
            swiped.current = false;
          }}
          onPointerMove={(e) => {
            const s = start.current;
            if (!s) return;
            const dx = e.clientX - s.x;
            const dy = e.clientY - s.y;
            if (!swiped.current) {
              if (Math.abs(dx) < 8) return;
              if (Math.abs(dy) > Math.abs(dx)) {
                start.current = null; // vertical scroll: let it be
                return;
              }
              swiped.current = true;
              setDragging(true);
              e.currentTarget.setPointerCapture(e.pointerId);
            }
            setPos(Math.max(OPEN * 1.6, Math.min(0, s.base + dx)));
          }}
          onPointerUp={() => {
            if (!start.current) return;
            start.current = null;
            setDragging(false);
            if (swiped.current) setPos(xRef.current < OPEN / 2 ? OPEN : 0);
          }}
          onPointerCancel={() => {
            start.current = null;
            setDragging(false);
            setPos(xRef.current < OPEN / 2 ? OPEN : 0);
          }}
          onClickCapture={(e) => {
            // A swipe, or a tap on an open row, should not open the item.
            if (swiped.current || xRef.current !== 0) {
              e.preventDefault();
              e.stopPropagation();
              if (!swiped.current) setPos(0);
              swiped.current = false;
            }
          }}
        >
          {children}
        </div>
      </div>

      {/* Desktop only: ⋯ menu beside the row. */}
      <div ref={menuRef} className="relative hidden shrink-0 pt-3 pointer-fine:block">
        <button
          type="button"
          aria-label="More options"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
          className={`flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold text-muted transition hover:bg-white hover:text-ink ${menuOpen ? "bg-white text-ink shadow-sm" : ""}`}
        >
          ⋯
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full z-30 mt-1 min-w-44 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-lg">
            <button
              type="button"
              onClick={run}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold hover:bg-bg"
              style={{ color }}
            >
              <span>{icon}</span> {menuLabel ?? text ?? label}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
