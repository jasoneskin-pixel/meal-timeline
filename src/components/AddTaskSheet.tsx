"use client";
import { useState } from "react";
import { api } from "./api";
import DurationInput from "./DurationInput";
import { PinControls } from "./StepsEditor";
import { newId } from "@/lib/ids";
import { calendarDaysBetween, resolveTimeZone, wallClock } from "@/lib/zoned";
import type { Meal, MealDish, Step, StepPin } from "@/lib/types";

const TASKS_COLOR = "#78716c";

/** Default pin for a task added mid-cook: today, at the next 5-minute mark. */
function pinForSoon(meal: Meal, now: number): StepPin {
  const tz = resolveTimeZone(meal.timezone);
  const soon = new Date(Math.ceil((now + 60_000) / (5 * 60_000)) * 5 * 60_000);
  const days = Math.max(0, calendarDaysBetween(new Date(meal.serveAt), soon, tz));
  const { h, m } = wallClock(soon, tz);
  const pad = (x: number) => String(x).padStart(2, "0");
  return { daysBefore: days, time: `${pad(h)}:${pad(m)}`, window: null };
}

/** Add an Other task to a meal from cook mode. */
export default function AddTaskSheet({ meal, onSaved, onClose }: { meal: Meal; onSaved: (m: Meal) => void; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [minutes, setMinutes] = useState(0);
  const [pin, setPin] = useState<StepPin>(() => pinForSoon(meal, Date.now()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!title.trim()) return setError("Give the task a name.");
    setBusy(true);
    setError("");
    const step: Step = { id: newId(), title: title.trim(), minutes, kind: "active", ovenTemp: null, phase: "prep", pin };
    const existing = meal.dishes.find((d) => d.isTasks);
    const dishes: MealDish[] = existing
      ? meal.dishes.map((d) => (d.isTasks ? { ...d, steps: [...d.steps, step] } : d))
      : [
          ...meal.dishes,
          { id: newId(), name: "Other tasks", emoji: "📌", color: TASKS_COLOR, steps: [step], mode: "fresh", holdMethod: "fridge", readyAheadMin: 0, serveAt: null, isTasks: true },
        ];
    try {
      onSaved(await api<Meal>(`/api/meals/${meal.id}`, { method: "PUT", json: { ...meal, dishes } }));
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-t-3xl bg-bg p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold">📌 Add a task</h2>
          <button className="text-muted" onClick={onClose}>Cancel</button>
        </div>
        <input
          className="field" autoFocus placeholder="e.g. Set the table" value={title}
          onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()}
        />
        <div>
          <label className="label">How long (optional)</label>
          <DurationInput minutes={minutes} onChange={setMinutes} />
        </div>
        <div className="space-y-2 rounded-xl bg-white p-3">
          <label className="label mb-0">When</label>
          <PinControls pin={pin} onChange={setPin} />
        </div>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button className="btn-primary w-full py-3" disabled={busy} onClick={save}>{busy ? "Adding..." : "Add to timeline"}</button>
        <p className="text-center text-xs text-muted">Saved to this meal&apos;s Other tasks, with a reminder.</p>
      </div>
    </div>
  );
}
