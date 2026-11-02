"use client";
import { useRef, useState } from "react";
import { computeSchedule, type ScheduledStep, type TimelineItem } from "@/lib/schedule";
import { dayKey, formatDay, formatDuration, formatTime } from "@/lib/format";
import { HOLD_LABELS, WINDOW_LABELS, type Meal } from "@/lib/types";

const HOLD_ICON = { room_temp: "🌡️", fridge: "🧊", warm_oven: "♨️", freezer: "❄️" } as const;

function itemTime(i: TimelineItem) {
  return i.type === "step" ? i.sortAt ?? i.start : i.at;
}

/**
 * When a dragged item is dropped at insertion `index`, which time does that spot represent?
 * `side` says whether the pointer was on the lower half of the item above ("after")
 * or the upper half of the item below ("before"), which decides the day at day boundaries.
 */
function dropTime(items: TimelineItem[], index: number, side: "after" | "before", draggedKey: string): Date | null {
  const list = items.filter((i) => i.key !== draggedKey);
  const pos = items.slice(0, index).filter((i) => i.key !== draggedKey).length;
  const prev = list[pos - 1];
  const next = list[pos];
  const MINUTE = 60_000;
  const sameDay = prev && next && dayKey(itemTime(prev)) === dayKey(itemTime(next));
  if (prev && (side === "after" || sameDay || !next)) {
    // Just after the item above (a minute later, so it sorts after it), but not past the item below.
    const t = itemTime(prev).getTime() + MINUTE;
    return new Date(next && sameDay && t >= itemTime(next).getTime() ? itemTime(prev).getTime() : t);
  }
  if (next) return new Date(itemTime(next).getTime() - MINUTE); // top of a day: just before its first item
  return null;
}

type Drag = { key: string; label: string; x: number; y: number; index: number | null; side: "after" | "before" };

export function DishLegend({ meal }: { meal: Meal }) {
  return (
    <div className="flex flex-wrap gap-2">
      {meal.dishes.map((d) => (
        <span key={d.id} className="chip border text-sm" style={{ backgroundColor: `${d.color}18`, borderColor: `${d.color}55`, color: "var(--ink)" }}>
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
          {d.emoji} {d.name}
        </span>
      ))}
    </div>
  );
}

export default function Timeline({
  meal, onStepClick, onMoveFlexible,
}: {
  meal: Meal;
  onStepClick?: (s: ScheduledStep) => void;
  /** Enables dragging flexible steps; called with the time of the spot they were dropped on. */
  onMoveFlexible?: (s: ScheduledStep, dropAt: Date) => void;
}) {
  const sched = computeSchedule(meal);
  const conflictKeys = new Set(sched.conflicts.flatMap((c) => c.keys));
  const [now] = useState(() => Date.now());
  const [drag, setDrag] = useState<Drag | null>(null);
  const didDrag = useRef(false);

  const hover = (x: number, y: number): { index: number; side: "after" | "before" } | null => {
    let el = document.elementFromPoint(x, y)?.closest("[data-tl-index]") as HTMLElement | null;
    if (!el) {
      // In a gap between rows: use the nearest row.
      let best = Infinity;
      document.querySelectorAll<HTMLElement>("[data-tl-index]").forEach((li) => {
        const r = li.getBoundingClientRect();
        const d = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0;
        if (d < best) { best = d; el = li; }
      });
      if (!el || best > 60) return null;
    }
    const li = el as HTMLElement;
    const idx = Number(li.dataset.tlIndex);
    const r = li.getBoundingClientRect();
    return y < r.top + r.height / 2 ? { index: idx, side: "before" } : { index: idx + 1, side: "after" };
  };

  const handleProps = (item: ScheduledStep) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      didDrag.current = false;
      setDrag({ key: item.key, label: `${item.dish.emoji} ${item.step.title}`, x: e.clientX, y: e.clientY, index: null, side: "after" });
    },
    onPointerMove: (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!drag || drag.key !== item.key) return;
      didDrag.current = true;
      if (e.clientY < 90) window.scrollBy(0, -14);
      else if (e.clientY > window.innerHeight - 110) window.scrollBy(0, 14);
      const h = hover(e.clientX, e.clientY);
      setDrag({ ...drag, x: e.clientX, y: e.clientY, index: h?.index ?? null, side: h?.side ?? "after" });
    },
    onPointerUp: () => {
      if (drag && drag.key === item.key && drag.index !== null && onMoveFlexible) {
        const at = dropTime(sched.items, drag.index, drag.side, item.key);
        if (at) onMoveFlexible(item, at);
      }
      setDrag(null);
    },
    onPointerCancel: () => setDrag(null),
    onClick: (e: React.MouseEvent) => e.stopPropagation(),
  });

  if (!sched.items.length) {
    return <p className="text-muted">Add dishes with steps to see the timeline.</p>;
  }

  return (
    <div className="space-y-4">
      {sched.firstStart && sched.firstStart.getTime() < now && new Date(meal.serveAt).getTime() > now && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          ⚠️ The first step should have started at {formatTime(sched.firstStart)}. Consider pushing the serving time later.
        </div>
      )}
      {sched.conflicts.length > 0 && (
        <div className="space-y-1.5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          <p className="font-semibold">Heads up: {sched.conflicts.length} timing {sched.conflicts.length === 1 ? "conflict" : "conflicts"}</p>
          {sched.conflicts.map((c, i) => (
            <p key={i}>{c.kind === "oven_temp" ? "🔥" : c.kind === "long_step" ? "⏳" : c.kind === "order" ? "↕️" : "✋"} {c.message}</p>
          ))}
        </div>
      )}
      <ol className="space-y-2">
        {sched.items.map((item, idx) => {
          const t = itemTime(item);
          const showDay = idx === 0 || dayKey(t) !== dayKey(itemTime(sched.items[idx - 1]));
          const color = item.dish.color;
          return (
            <li key={item.key} data-tl-index={idx} className={drag?.key === item.key ? "opacity-40" : ""}>
              {drag && drag.index === idx && <div className="mb-2 ml-[5.25rem] h-1 rounded-full bg-accent" />}
              {showDay && <div className="mb-2 mt-4 text-xs font-bold uppercase tracking-wide text-muted first:mt-0">{formatDay(t)}</div>}
              <div className="flex gap-3">
                <div className="w-[4.5rem] shrink-0 pt-2.5 text-right text-sm font-semibold tabular-nums">
                  {item.type === "step" && item.flexible ? <span className="text-muted">{WINDOW_LABELS[item.flexible.window].replace(" that day", "")}</span> : formatTime(t)}
                </div>
                {item.type === "step" ? (
                  <div
                    className={`relative flex-1 rounded-xl border bg-white p-3 ${conflictKeys.has(item.key) ? "border-red-300" : "border-line"} ${onStepClick ? "cursor-pointer transition hover:shadow-sm active:scale-[0.99]" : ""}`}
                    onClick={onStepClick ? () => onStepClick(item) : undefined}
                    role={onStepClick ? "button" : undefined}
                    aria-label={onStepClick ? `Edit ${item.step.title}` : undefined}
                    style={{ borderLeft: `6px solid ${color}`, backgroundColor: `${color}0d` }}
                  >
                    <div className="flex items-start gap-2">
                      {onStepClick && <span className="absolute right-2.5 top-2.5 text-xs text-muted">✏️</span>}
                      {onMoveFlexible && item.flexible && (
                        <button
                          type="button"
                          aria-label={`Drag ${item.step.title}`}
                          title="Drag to move"
                          className="-my-1 -ml-1 flex w-6 shrink-0 cursor-grab touch-none select-none items-center justify-center rounded-md text-lg leading-6 text-muted hover:bg-white/70 active:cursor-grabbing"
                          {...handleProps(item)}
                        >
                          ⠿
                        </button>
                      )}
                      <span className="text-xl leading-6">{item.dish.emoji}</span>
                      <div className="flex-1">
                        <p className="font-semibold leading-6">{item.step.title || "Untitled step"}</p>
                        <p className="text-sm text-muted">
                          {item.dish.name}
                          {item.step.minutes > 0 && <> · {formatDuration(item.step.minutes)}{!item.flexible && <> · until {formatTime(item.end)}</>}</>}
                          {item.flexible && <> · anytime before {formatTime(item.flexible.until)}</>}
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          <span className={`chip ${item.step.kind === "active" ? "bg-ink text-white" : "bg-line text-ink"}`}>
                            {item.step.kind === "active" ? "✋ Hands-on" : "⏳ Hands-off"}
                          </span>
                          {item.step.ovenTemp ? <span className="chip bg-orange-100 text-orange-900">🔥 {item.step.ovenTemp}°F</span> : null}
                          {item.step.phase === "finish" && item.dish.mode === "make_ahead" ? <span className="chip bg-sky-100 text-sky-900">Finishing</span> : null}
                          {item.step.background && !item.step.pin ? <span className="chip bg-teal-100 text-teal-900">↔ Background</span> : null}
                          {item.flexible ? (
                            <span className="chip bg-violet-100 text-violet-900">🕐 Flexible</span>
                          ) : item.pinned ? (
                            <span className="chip bg-stone-200 text-stone-800">📌 Pinned</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : item.type === "hold" ? (
                  <div className="flex-1 rounded-xl border border-dashed p-2.5 text-sm" style={{ borderColor: color }}>
                    {HOLD_ICON[item.dish.holdMethod]} <span className="font-semibold">{item.dish.emoji} {item.dish.name} done.</span>{" "}
                    Hold: {HOLD_LABELS[item.dish.holdMethod].toLowerCase()}
                  </div>
                ) : (
                  <div className="flex-1 rounded-xl p-2.5 font-bold text-white" style={{ backgroundColor: color }}>
                    🍽️ Serve {item.dish.emoji} {item.dish.name}
                  </div>
                )}
              </div>
            </li>
          );
        })}
        {drag && drag.index === sched.items.length && <li className="ml-[5.25rem] h-1 rounded-full bg-accent" />}
      </ol>
      {drag && (
        <div
          className="pointer-events-none fixed z-50 rounded-xl bg-ink px-3 py-2 text-sm font-semibold text-white shadow-xl"
          style={{ left: drag.x + 12, top: drag.y - 18 }}
        >
          {drag.label}
        </div>
      )}
      {onMoveFlexible && sched.steps.some((s) => s.flexible) && !drag && (
        <p className="text-xs text-muted">Tip: drag ⠿ on a flexible step to move it.</p>
      )}
    </div>
  );
}
