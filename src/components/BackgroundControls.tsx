"use client";
import { UNTIL_SERVE, type Step } from "@/lib/types";

/**
 * Timing options for hands-off steps:
 * - Runs in the background: the next steps can start while it runs.
 * - Stretches to fill the gap: the duration is a minimum (e.g. "soak overnight") and it lasts until the next step.
 */
export default function BackgroundControls({
  step, later, onChange,
}: { step: Step; later: Step[]; onChange: (patch: Partial<Step>) => void }) {
  if (step.kind !== "passive") return null;
  return (
    <div className="space-y-2 text-sm">
      {!step.background && (
        <label className="flex items-start gap-2">
          <input
            type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--accent)]" checked={!!step.stretch}
            onChange={(e) => onChange({ stretch: e.target.checked })}
          />
          <span>
            <span className="font-semibold">⇔ Stretches to fill the gap</span>{" "}
            <span className="text-muted">
              (the time above is a minimum, e.g. &quot;soak overnight&quot;. Pin this or an earlier step to when you&apos;ll start, and it lasts until the next step is due)
            </span>
          </span>
        </label>
      )}
      {!step.pin && !step.stretch && (
        <label className="flex items-start gap-2">
          <input
            type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--accent)]" checked={!!step.background}
            onChange={(e) => onChange({ background: e.target.checked, until: e.target.checked ? step.until ?? null : null })}
          />
          <span>
            <span className="font-semibold">↔ Runs in the background</span>{" "}
            <span className="text-muted">(next steps can start while this runs, like sous vide or marinating)</span>
          </span>
        </label>
      )}
      {step.background && !step.pin && (
        <label className="flex flex-wrap items-center gap-2 pl-6">
          <span className="text-muted">Runs until</span>
          <select className="field w-auto max-w-full py-1.5" value={step.until ?? ""} onChange={(e) => onChange({ until: e.target.value || null })}>
            <option value="">the next regular step starts</option>
            {later.map((s, i) => (
              <option key={s.id} value={s.id}>{s.title || `Step ${i + 1}`} starts</option>
            ))}
            <option value={UNTIL_SERVE}>serving time</option>
          </select>
        </label>
      )}
    </div>
  );
}
