"use client";
import { useRef, useState, type ReactNode } from "react";

const OPEN = -92; // how far a swipe slides the row to reveal the button
const HOVER = -56; // desktop: how far hovering with a mouse slides the row to reveal the icon

/**
 * Touch: swipe a row left to reveal an action (Delete by default). Vertical scrolling is left to the browser.
 * Mouse: hovering slides the row slightly to reveal the action's icon.
 */
export default function SwipeToDelete({
  children, onDelete, label = "🗑️ Delete", color = "#dc2626",
}: { children: ReactNode; onDelete: () => void; label?: string; color?: string }) {
  const [x, setX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [hover, setHover] = useState(false);
  const xRef = useRef(0);
  const start = useRef<{ x: number; y: number; base: number } | null>(null);
  const swiped = useRef(false);

  const setPos = (v: number) => {
    xRef.current = v;
    setX(v);
  };

  const [icon, ...rest] = label.split(" ");
  const text = rest.join(" ");
  const shown = x !== 0 ? x : hover ? HOVER : 0;

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      onPointerEnter={(e) => e.pointerType === "mouse" && setHover(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setHover(false)}
    >
      <button
        type="button"
        aria-label={text || label}
        title={text || label}
        onClick={() => {
          setPos(0);
          setHover(false);
          onDelete();
        }}
        className="absolute inset-y-0 right-0 flex items-center justify-end gap-1.5 font-semibold text-white"
        style={{
          width: -OPEN + 24,
          paddingRight: x !== 0 ? 14 : 18,
          opacity: shown < 0 ? 1 : 0,
          backgroundColor: color,
        }}
        tabIndex={shown < 0 ? 0 : -1}
      >
        <span>{icon}</span>
        {x !== 0 && text && <span>{text}</span>}
      </button>
      <div
        className="relative"
        style={{
          transform: `translateX(${shown}px)`,
          transition: dragging ? "none" : "transform 200ms ease",
          touchAction: "pan-y",
          WebkitUserSelect: "none",
          userSelect: "none",
        }}
        // Links inside the row would otherwise start a native drag and cancel the swipe.
        onDragStart={(e) => e.preventDefault()}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse") return; // mouse users get the hover action
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
