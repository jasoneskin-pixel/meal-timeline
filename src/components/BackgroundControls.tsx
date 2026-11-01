"use client";
import { UNTIL_SERVE, type Step } from "@/lib/types";

/** "Runs in the background" switch for hands-off steps, plus which later step it runs until. */
export default function BackgroundControls({
  step, later, onChange,
}: { step: Step; later: Step[]; onChange: (patch: Partial<Step>) => void }) {
  if (step.kind !== "passive" || step.pin) return null;
  return (
    <div className="space-y-2 text-sm">
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
      {step.background && (
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
