"use client";
import DurationInput from "./DurationInput";
import BackgroundControls from "./BackgroundControls";
import { newId } from "@/lib/ids";
import { formatDuration } from "@/lib/format";
import { totalMinutes } from "@/lib/schedule";
import { WINDOW_LABELS, type PinWindow, type Step, type StepPin } from "@/lib/types";

export function blankStep(pinned = false): Step {
  return {
    id: newId(), title: "", minutes: pinned ? 0 : 15, kind: "active", ovenTemp: null, phase: "prep",
    pin: pinned ? { daysBefore: 0, time: "12:00", window: null } : null,
  };
}

const DAY_OPTIONS = Array.from({ length: 15 }, (_, d) => ({
  value: d,
  label: d === 0 ? "Serving day" : d === 1 ? "1 day before" : `${d} days before`,
}));

export function PinControls({ pin, onChange }: { pin: StepPin; onChange: (p: StepPin) => void }) {
  const exact = !!pin.time;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select className="field w-auto py-1.5" value={pin.daysBefore} onChange={(e) => onChange({ ...pin, daysBefore: parseInt(e.target.value), listAt: null })}>
        {DAY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <div className="flex overflow-hidden rounded-xl border border-line text-xs font-semibold">
        <button type="button" onClick={() => onChange({ ...pin, time: pin.time || "12:00", window: null, listAt: null })} className={`px-2.5 py-2 ${exact ? "bg-ink text-white" : "bg-white text-muted"}`}>Exact time</button>
        <button type="button" onClick={() => onChange({ ...pin, time: null, window: pin.window || "anytime", listAt: null })} className={`px-2.5 py-2 ${!exact ? "bg-ink text-white" : "bg-white text-muted"}`}>Flexible</button>
      </div>
      {exact ? (
        <input type="time" className="field w-32 py-1.5" value={pin.time ?? ""} onChange={(e) => onChange({ ...pin, time: e.target.value || "12:00" })} />
      ) : (
        <select className="field w-auto py-1.5" value={pin.window ?? "anytime"} onChange={(e) => onChange({ ...pin, window: e.target.value as PinWindow, listAt: null })}>
          {Object.entries(WINDOW_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      )}
    </div>
  );
}

export default function StepsEditor({
  steps, onChange, color, tasksOnly,
}: { steps: Step[]; onChange: (s: Step[]) => void; color: string; tasksOnly?: boolean }) {
  const update = (i: number, patch: Partial<Step>) => onChange(steps.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= steps.length) return;
    const next = [...steps];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="font-semibold">{tasksOnly ? "Tasks" : "Steps, in order"}</h3>
        <span className="text-sm text-muted">Total {formatDuration(totalMinutes(steps))}</span>
      </div>
      {steps.length === 0 && (
        <p className="text-sm text-muted">
          {tasksOnly ? "Add things like errands or leaving the house, each pinned to a time." : "Add each general step from starting the dish to serving it."}
        </p>
      )}
      {steps.map((s, i) => (
        <div key={s.id} className="rounded-xl border border-line bg-white p-3" style={{ borderLeft: `5px solid ${color}` }}>
          <div className="flex items-start gap-2">
            <span className="mt-2.5 w-5 text-sm font-bold text-muted">{i + 1}</span>
            <div className="flex-1 space-y-2.5">
              <input className="field" placeholder={tasksOnly ? "e.g. Pick up turkey" : "e.g. Chop vegetables"} value={s.title} onChange={(e) => update(i, { title: e.target.value })} />
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <DurationInput minutes={s.minutes} onChange={(m) => update(i, { minutes: m })} compact />
                <div className="flex overflow-hidden rounded-xl border border-line text-sm font-semibold">
                  {(["active", "passive"] as const).map((k) => (
                    <button
                      key={k} type="button" onClick={() => update(i, k === "active" ? { kind: k, background: false, until: null } : { kind: k })}
                      className={`px-3 py-2 ${s.kind === k ? "bg-ink text-white" : "bg-white text-muted"}`}
                    >
                      {k === "active" ? "✋ Hands-on" : "⏳ Hands-off"}
                    </button>
                  ))}
                </div>
              </div>
              {(tasksOnly || s.pin) && (
                <div className="space-y-2 rounded-xl bg-bg p-2.5">
                  {!tasksOnly && (
                    <label className="flex items-center gap-2 text-sm font-semibold">
                      <input type="checkbox" className="h-4 w-4 accent-[var(--accent)]" checked onChange={() => update(i, { pin: null })} />
                      📌 Pinned to a time
                    </label>
                  )}
                  <PinControls pin={s.pin ?? { daysBefore: 0, time: "12:00" }} onChange={(pin) => update(i, { pin })} />
                </div>
              )}
              {!tasksOnly && <BackgroundControls step={s} later={steps.slice(i + 1)} onChange={(patch) => update(i, patch)} />}
              {!tasksOnly && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                {!s.pin && (
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="h-4 w-4 accent-[var(--accent)]" checked={false} onChange={() => update(i, { pin: { daysBefore: 0, time: "12:00", window: null }, background: false, until: null })} />
                    <span>📌 Pin to a time</span>
                  </label>
                )}
                <label className="flex items-center gap-2">
                  <span className="text-muted">🔥 Oven</span>
                  <input
                    type="number" inputMode="numeric" className="field w-20 px-2 py-1.5" placeholder="°F"
                    value={s.ovenTemp ?? ""} onChange={(e) => update(i, { ovenTemp: e.target.value ? parseInt(e.target.value) : null })}
                  />
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="h-4 w-4 accent-[var(--accent)]" checked={s.phase === "finish"} onChange={(e) => update(i, { phase: e.target.checked ? "finish" : "prep" })} />
                  <span>Finishing step <span className="text-muted">(reheat, garnish: done last if made ahead)</span></span>
                </label>
              </div>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <button type="button" aria-label="Move up" onClick={() => move(i, -1)} className="rounded-lg px-2 py-1 text-muted hover:bg-bg">▲</button>
              <button type="button" aria-label="Move down" onClick={() => move(i, 1)} className="rounded-lg px-2 py-1 text-muted hover:bg-bg">▼</button>
              <button type="button" aria-label="Remove step" onClick={() => onChange(steps.filter((_, j) => j !== i))} className="rounded-lg px-2 py-1 text-red-600 hover:bg-red-50">✕</button>
            </div>
          </div>
        </div>
      ))}
      <button type="button" className="btn-ghost w-full" onClick={() => onChange([...steps, blankStep(tasksOnly)])}>{tasksOnly ? "+ Add task" : "+ Add step"}</button>
    </div>
  );
}
