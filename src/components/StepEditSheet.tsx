"use client";
import { useState } from "react";
import { api } from "./api";
import DurationInput from "./DurationInput";
import { PinControls } from "./StepsEditor";
import type { Meal, Step } from "@/lib/types";

/** Edit one step of a meal from its timeline or cook mode. Changes apply to this meal; optionally to the Library dish too. */
export default function StepEditSheet({
  meal, dishId, step, onSaved, onClose,
}: { meal: Meal; dishId: string; step: Step; onSaved: (m: Meal) => void; onClose: () => void }) {
  const dish = meal.dishes.find((d) => d.id === dishId)!;
  const isTask = !!dish.isTasks;
  const [draft, setDraft] = useState<Step>(step);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [askLibrary, setAskLibrary] = useState<Meal | null>(null);
  const set = (patch: Partial<Step>) => setDraft((d) => ({ ...d, ...patch }));

  async function save(remove = false) {
    if (remove && !confirm(`Remove "${step.title || "this step"}" from this meal?`)) return;
    setBusy(true);
    setError("");
    const steps = remove ? dish.steps.filter((s) => s.id !== step.id) : dish.steps.map((s) => (s.id === step.id ? draft : s));
    const updated: Meal = { ...meal, dishes: meal.dishes.map((d) => (d.id === dishId ? { ...d, steps } : d)) };
    try {
      const saved = await api<Meal>(`/api/meals/${meal.id}`, { method: "PUT", json: updated });
      onSaved(saved);
      if (dish.sourceDishId && !isTask) {
        setAskLibrary(saved);
        setBusy(false);
      } else {
        onClose();
      }
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  async function updateLibrary() {
    const d = askLibrary?.dishes.find((x) => x.id === dishId);
    if (!d?.sourceDishId) return onClose();
    setBusy(true);
    try {
      await api(`/api/dishes/${d.sourceDishId}`, { method: "PUT", json: { name: d.name, emoji: d.emoji, color: d.color, steps: d.steps } });
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
        {askLibrary ? (
          <>
            <h2 className="text-lg font-bold">Saved to this meal ✓</h2>
            <p className="text-sm">
              Also update <b>{dish.emoji} {dish.name}</b> in your Library so future meals get this version of its steps?
            </p>
            {error && <p className="text-sm text-red-700">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              <button className="btn-ghost" disabled={busy} onClick={onClose}>This meal only</button>
              <button className="btn-primary" disabled={busy} onClick={updateLibrary}>{busy ? "Updating..." : "Update Library too"}</button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-bold">✏️ Edit {isTask ? "task" : "step"} <span className="text-muted">· {dish.emoji} {dish.name}</span></h2>
              <button className="text-muted" onClick={onClose}>Cancel</button>
            </div>
            <input className="field" value={draft.title} placeholder="Step name" onChange={(e) => set({ title: e.target.value })} />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <DurationInput minutes={draft.minutes} onChange={(minutes) => set({ minutes })} />
              <div className="flex overflow-hidden rounded-xl border border-line text-sm font-semibold">
                {(["active", "passive"] as const).map((k) => (
                  <button key={k} type="button" onClick={() => set({ kind: k })} className={`px-3 py-2 ${draft.kind === k ? "bg-ink text-white" : "bg-white text-muted"}`}>
                    {k === "active" ? "✋ Hands-on" : "⏳ Hands-off"}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2 rounded-xl bg-white p-3">
              {!isTask && (
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox" className="h-4 w-4 accent-[var(--accent)]" checked={!!draft.pin}
                    onChange={(e) => set({ pin: e.target.checked ? { daysBefore: 0, time: "12:00", window: null } : null })}
                  />
                  📌 Pin to a time
                </label>
              )}
              {(isTask || draft.pin) && (
                <PinControls pin={draft.pin ?? { daysBefore: 0, time: "12:00" }} onChange={(pin) => set({ pin })} />
              )}
              {!isTask && !draft.pin && <p className="text-xs text-muted">Unpinned steps are scheduled automatically around serving time.</p>}
            </div>
            {!isTask && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <label className="flex items-center gap-2">
                  <span className="text-muted">🔥 Oven</span>
                  <input
                    type="number" inputMode="numeric" className="field w-20 px-2 py-1.5" placeholder="°F"
                    value={draft.ovenTemp ?? ""} onChange={(e) => set({ ovenTemp: e.target.value ? parseInt(e.target.value) : null })}
                  />
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="h-4 w-4 accent-[var(--accent)]" checked={draft.phase === "finish"} onChange={(e) => set({ phase: e.target.checked ? "finish" : "prep" })} />
                  Finishing step
                </label>
              </div>
            )}
            {error && <p className="text-sm text-red-700">{error}</p>}
            <div className="flex gap-3">
              <button className="btn-danger" disabled={busy} onClick={() => save(true)}>Remove</button>
              <button className="btn-primary flex-1" disabled={busy} onClick={() => save()}>{busy ? "Saving..." : "Save"}</button>
            </div>
            <p className="text-center text-xs text-muted">Changes apply to this meal and update its reminders.</p>
          </>
        )}
      </div>
    </div>
  );
}
