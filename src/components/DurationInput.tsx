"use client";

export default function DurationInput({ minutes, onChange, compact }: { minutes: number; onChange: (m: number) => void; compact?: boolean }) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const set = (hh: number, mm: number) => onChange(Math.max(0, (isNaN(hh) ? 0 : hh) * 60 + (isNaN(mm) ? 0 : mm)));
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number" inputMode="numeric" min={0} aria-label="Hours"
        className={`field text-center ${compact ? "w-14 px-1" : "w-16"}`}
        value={h || ""} placeholder="0"
        onChange={(e) => set(parseInt(e.target.value), m)}
      />
      <span className="text-sm text-muted">hr</span>
      <input
        type="number" inputMode="numeric" min={0} max={59} aria-label="Minutes"
        className={`field text-center ${compact ? "w-14 px-1" : "w-16"}`}
        value={m || ""} placeholder="0"
        onChange={(e) => set(h, parseInt(e.target.value))}
      />
      <span className="text-sm text-muted">min</span>
    </div>
  );
}
