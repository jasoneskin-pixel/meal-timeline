"use client";
import { useRef, useState, type ReactNode } from "react";

const OPEN = -92; // how far the row slides to reveal the button

/** Swipe a row left to reveal a Delete button (iOS-style). Vertical scrolling is left to the browser. */
export default function SwipeToDelete({ children, onDelete }: { children: ReactNode; onDelete: () => void }) {
  const [x, setX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const xRef = useRef(0);
  const start = useRef<{ x: number; y: number; base: number } | null>(null);
  const swiped = useRef(false);

  const setPos = (v: number) => {
    xRef.current = v;
    setX(v);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <button
        type="button"
        aria-label="Delete"
        onClick={() => {
          setPos(0);
          onDelete();
        }}
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-red-600 font-semibold text-white"
        style={{ width: -OPEN + 24, paddingLeft: 24, opacity: x < 0 ? 1 : 0 }}
        tabIndex={x < 0 ? 0 : -1}
      >
        🗑️ Delete
      </button>
      <div
        className="relative"
        style={{
          transform: `translateX(${x}px)`,
          transition: dragging ? "none" : "transform 200ms ease",
          touchAction: "pan-y",
        }}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse" && e.button !== 0) return;
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
  );
}
