"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "./api";
import DurationInput from "./DurationInput";
import { formatDateTime, formatDuration, fromLocalInputs, toLocalInputs } from "@/lib/format";
import { computeSchedule, totalMinutes } from "@/lib/schedule";
import { HOLD_LABELS, type Dish, type DishMode, type HoldMethod, type Meal } from "@/lib/types";

type DishLike = Omit<Dish, "id"> & { id?: string };

/** Bottom sheet: pick a ready-by time for one dish, then jump straight into cook mode. */
export default function CookDishSheet({ dish, onClose }: { dish: DishLike; onClose: () => void }) {
  const router = useRouter();
  const total = totalMinutes(dish.steps);
  // Default to the earliest possible ready time, rounded up to the next 5 minutes.
  const [initial] = useState(() => {
    const t = new Date(Date.now() + total * 60_000);
    t.setSeconds(0, 0);
    t.setMinutes(Math.ceil(t.getMinutes() / 5) * 5);
    return toLocalInputs(t.toISOString());
  });
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<DishMode>("fresh");
  const [holdMethod, setHoldMethod] = useState<HoldMethod>("fridge");
  const [readyAheadMin, setReadyAheadMin] = useState(120);
  const hasFinish = dish.steps.some((s) => s.phase === "finish");

  const serveAt = fromLocalInputs(date, time);
  const start = serveAt
    ? computeSchedule({
        id: "preview", name: dish.name, serveAt, deadlineMode: "all", timezone: "", reminderLeadMin: 5,
        remindersOn: false, inLibrary: false,
        dishes: [{ id: "d", name: dish.name, emoji: dish.emoji, color: dish.color, steps: dish.steps, mode, holdMethod, readyAheadMin, serveAt: null }],
      }).firstStart
    : null;
  const [now] = useState(() => Date.now());
  const late = start ? start.getTime() < now - 60_000 : false;

  async function go() {
    if (!serveAt) return;
    setBusy(true);
    setError("");
    try {
      const meal = await api<Meal>("/api/quick-cook", {
        method: "POST",
        json: { dish, serveAt, mode, holdMethod, readyAheadMin, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      });
      router.push(`/meals/${meal.id}/cook`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-t-3xl bg-bg p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">{dish.emoji} Cook {dish.name || "this dish"}</h2>
            <p className="text-sm text-muted">{dish.steps.length} steps · {formatDuration(total)} total</p>
          </div>
          <button className="text-muted" onClick={onClose}>Close</button>
        </div>
        <div>
          <label className="label">Ready by</label>
          <div className="flex gap-2">
            <input type="date" className="field flex-1" value={date} onChange={(e) => setDate(e.target.value)} />
            <input type="time" className="field w-36" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>
        <div className="space-y-3 rounded-xl bg-white p-3">
          <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-line text-sm font-semibold">
            {(["fresh", "make_ahead"] as const).map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)} className={`py-2.5 ${mode === m ? "bg-ink text-white" : "bg-white text-muted"}`}>
                {m === "fresh" ? "🍳 Serve fresh" : "📦 Make ahead"}
              </button>
            ))}
          </div>
          {mode === "make_ahead" && (
            <>
              <div>
                <label className="label">Keep it in the meantime</label>
                <select className="field" value={holdMethod} onChange={(e) => setHoldMethod(e.target.value as HoldMethod)}>
                  {Object.entries(HOLD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Have it done this long before the ready-by time</label>
                <DurationInput minutes={readyAheadMin} onChange={setReadyAheadMin} />
              </div>
              {hasFinish && <p className="text-xs text-muted">Finishing steps (like reheating) still happen right before the ready-by time.</p>}
            </>
          )}
        </div>
        {start && (
          <p className={`rounded-xl p-3 text-sm ${late ? "bg-amber-50 text-amber-900" : "bg-white text-ink"}`}>
            {late
              ? `⚠️ You'd need to have started at ${formatDateTime(start)}. Pick a later time, or go ahead and catch up.`
              : `Start cooking at ${formatDateTime(start)}. You'll get a reminder 5 min before each step.`}
          </p>
        )}
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button className="btn-primary w-full py-3.5 text-lg" disabled={!serveAt || busy || !dish.steps.length} onClick={go}>
          {busy ? "Starting..." : "👩‍🍳 Start timeline"}
        </button>
        <p className="text-center text-xs text-muted">One-off cooks aren&apos;t saved to your meals.</p>
      </div>
    </div>
  );
}
