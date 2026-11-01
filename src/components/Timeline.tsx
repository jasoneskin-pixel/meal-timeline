"use client";
import { useState } from "react";
import { computeSchedule, type TimelineItem } from "@/lib/schedule";
import { dayKey, formatDay, formatDuration, formatTime } from "@/lib/format";
import { HOLD_LABELS, WINDOW_LABELS, type Meal } from "@/lib/types";

const HOLD_ICON = { room_temp: "🌡️", fridge: "🧊", warm_oven: "♨️", freezer: "❄️" } as const;

function itemTime(i: TimelineItem) {
  return i.type === "step" ? i.start : i.at;
}

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

export default function Timeline({ meal }: { meal: Meal }) {
  const sched = computeSchedule(meal);
  const conflictKeys = new Set(sched.conflicts.flatMap((c) => c.keys));
  const [now] = useState(() => Date.now());

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
            <p key={i}>{c.kind === "oven_temp" ? "🔥" : "✋"} {c.message}</p>
          ))}
        </div>
      )}
      <ol className="space-y-2">
        {sched.items.map((item, idx) => {
          const t = itemTime(item);
          const showDay = idx === 0 || dayKey(t) !== dayKey(itemTime(sched.items[idx - 1]));
          const color = item.dish.color;
          return (
            <li key={item.key}>
              {showDay && <div className="mb-2 mt-4 text-xs font-bold uppercase tracking-wide text-muted first:mt-0">{formatDay(t)}</div>}
              <div className="flex gap-3">
                <div className="w-[4.5rem] shrink-0 pt-2.5 text-right text-sm font-semibold tabular-nums">
                  {item.type === "step" && item.flexible ? <span className="text-muted">{WINDOW_LABELS[item.flexible.window].replace(" that day", "")}</span> : formatTime(t)}
                </div>
                {item.type === "step" ? (
                  <div
                    className={`flex-1 rounded-xl border bg-white p-3 ${conflictKeys.has(item.key) ? "border-red-300" : "border-line"}`}
                    style={{ borderLeft: `6px solid ${color}`, backgroundColor: `${color}0d` }}
                  >
                    <div className="flex items-start gap-2">
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
      </ol>
    </div>
  );
}
