"use client";
import DurationInput from "./DurationInput";
import { newId } from "@/lib/ids";
import { formatDuration } from "@/lib/format";
import { totalMinutes } from "@/lib/schedule";
import type { Step } from "@/lib/types";

export function blankStep(): Step {
  return { id: newId(), title: "", minutes: 15, kind: "active", ovenTemp: null, phase: "prep" };
}

export default function StepsEditor({ steps, onChange, color }: { steps: Step[]; onChange: (s: Step[]) => void; color: string }) {
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
        <h3 className="font-semibold">Steps, in order</h3>
        <span className="text-sm text-muted">Total {formatDuration(totalMinutes(steps))}</span>
      </div>
      {steps.length === 0 && <p className="text-sm text-muted">Add each general step from starting the dish to serving it.</p>}
      {steps.map((s, i) => (
        <div key={s.id} className="rounded-xl border border-line bg-white p-3" style={{ borderLeft: `5px solid ${color}` }}>
          <div className="flex items-start gap-2">
            <span className="mt-2.5 w-5 text-sm font-bold text-muted">{i + 1}</span>
            <div className="flex-1 space-y-2.5">
              <input className="field" placeholder="e.g. Chop vegetables" value={s.title} onChange={(e) => update(i, { title: e.target.value })} />
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <DurationInput minutes={s.minutes} onChange={(m) => update(i, { minutes: m })} compact />
                <div className="flex overflow-hidden rounded-xl border border-line text-sm font-semibold">
                  {(["active", "passive"] as const).map((k) => (
                    <button
                      key={k} type="button" onClick={() => update(i, { kind: k })}
                      className={`px-3 py-2 ${s.kind === k ? "bg-ink text-white" : "bg-white text-muted"}`}
                    >
                      {k === "active" ? "✋ Hands-on" : "⏳ Hands-off"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
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
            </div>
            <div className="flex flex-col gap-1">
              <button type="button" aria-label="Move up" onClick={() => move(i, -1)} className="rounded-lg px-2 py-1 text-muted hover:bg-bg">▲</button>
              <button type="button" aria-label="Move down" onClick={() => move(i, 1)} className="rounded-lg px-2 py-1 text-muted hover:bg-bg">▼</button>
              <button type="button" aria-label="Remove step" onClick={() => onChange(steps.filter((_, j) => j !== i))} className="rounded-lg px-2 py-1 text-red-600 hover:bg-red-50">✕</button>
            </div>
          </div>
        </div>
      ))}
      <button type="button" className="btn-ghost w-full" onClick={() => onChange([...steps, blankStep()])}>+ Add step</button>
    </div>
  );
}
