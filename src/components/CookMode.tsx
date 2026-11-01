"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import NotificationSetup from "./NotificationSetup";
import { DishLegend } from "./Timeline";
import { computeSchedule, type ScheduledStep } from "@/lib/schedule";
import { formatCountdown, formatDuration, formatTime } from "@/lib/format";
import type { Meal } from "@/lib/types";

function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    const onVis = () => setNow(Date.now());
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVis); };
  }, [ms]);
  return now;
}

function useWakeLock() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as unknown as { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    const get = async () => {
      try { lock = (await nav.wakeLock?.request("screen")) ?? null; setOn(!!lock); } catch { setOn(false); }
    };
    get();
    const onVis = () => document.visibilityState === "visible" && get();
    document.addEventListener("visibilitychange", onVis);
    return () => { document.removeEventListener("visibilitychange", onVis); lock?.release().catch(() => {}); };
  }, []);
  return on;
}

export default function CookMode({ meal }: { meal: Meal }) {
  const now = useNow();
  const awake = useWakeLock();
  const sched = useMemo(() => computeSchedule(meal), [meal]);
  const storeKey = `done:${meal.id}`;
  const [done, setDone] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(storeKey) || "[]")); } catch { return new Set(); }
  });
  const toggle = (k: string) => {
    const next = new Set(done);
    if (next.has(k)) next.delete(k); else next.add(k);
    setDone(next);
    try { localStorage.setItem(storeKey, JSON.stringify([...next])); } catch {}
  };

  const current = sched.steps.filter((s) => s.start.getTime() <= now && now < s.end.getTime() && !done.has(s.key));
  const overdue = sched.steps.filter((s) => s.end.getTime() <= now && !done.has(s.key));
  const upcoming = sched.steps.filter((s) => s.start.getTime() > now).slice(0, 4);
  const serveMs = new Date(meal.serveAt).getTime() - now;

  const renderStep = (s: ScheduledStep, mode: "now" | "next" | "late") => {
    const pct = Math.min(100, Math.max(0, ((now - s.start.getTime()) / (s.end.getTime() - s.start.getTime() || 1)) * 100));
    return (
      <div key={s.key} className="rounded-2xl border border-line bg-white p-3" style={{ borderLeft: `6px solid ${s.dish.color}` }}>
        <div className="flex items-start gap-3">
          <button
            aria-label="Mark done" onClick={() => toggle(s.key)}
            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2"
            style={{ borderColor: s.dish.color }}
          >
            {done.has(s.key) ? "✓" : ""}
          </button>
          <div className="flex-1">
            <p className="font-semibold">{s.dish.emoji} {s.step.title}</p>
            <p className="text-sm text-muted">
              {s.dish.name} · {s.step.kind === "active" ? "✋ hands-on" : "⏳ hands-off"}
              {s.step.ovenTemp ? ` · 🔥 ${s.step.ovenTemp}°F` : ""} · {formatTime(s.start)} to {formatTime(s.end)}
            </p>
            {mode === "now" && (
              <div className="mt-2">
                <div className="h-2 overflow-hidden rounded-full bg-line">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: s.dish.color }} />
                </div>
                <p className="mt-1 text-right font-mono text-lg font-bold tabular-nums">{formatCountdown(s.end.getTime() - now)} left</p>
              </div>
            )}
            {mode === "next" && <p className="mt-1 text-sm font-semibold">Starts in {formatCountdown(s.start.getTime() - now)} · {formatDuration(s.step.minutes)}</p>}
            {mode === "late" && <p className="mt-1 text-sm font-semibold text-red-700">Should be done. Tap the circle when finished.</p>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 pb-10">
      <div className="flex items-center justify-between">
        <Link href={`/meals/${meal.id}`} className="text-sm font-semibold text-accent">‹ Back</Link>
        <span className="text-xs text-muted">{awake ? "☀️ Screen stays on" : ""}</span>
      </div>
      <div className="rounded-3xl bg-ink p-5 text-white">
        <p className="text-sm opacity-70">{meal.name}</p>
        <p className="text-sm opacity-70">Serving at {formatTime(meal.serveAt)}</p>
        <p className="mt-1 font-mono text-4xl font-bold tabular-nums">{serveMs > 0 ? formatCountdown(serveMs) : "Time to eat! 🎉"}</p>
      </div>
      <DishLegend meal={meal} />
      <NotificationSetup compact />

      {overdue.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-bold text-red-700">Running behind</h2>
          {overdue.map((s) => renderStep(s, "late"))}
        </section>
      )}
      <section className="space-y-2">
        <h2 className="font-bold">Now</h2>
        {current.length ? current.map((s) => renderStep(s, "now")) : <p className="text-muted">Nothing in progress right now.</p>}
      </section>
      <section className="space-y-2">
        <h2 className="font-bold">Up next</h2>
        {upcoming.length ? upcoming.map((s) => renderStep(s, "next")) : <p className="text-muted">No more steps. 🎉</p>}
      </section>
    </div>
  );
}
