"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "./api";
import NotificationSetup from "./NotificationSetup";
import StepEditSheet from "./StepEditSheet";
import Timeline, { DishLegend } from "./Timeline";
import { computeSchedule, dishTarget, flexiblePinForDrop, withStepPin, type ScheduledStep } from "@/lib/schedule";
import { formatCountdown, formatDay, formatDuration, formatTime } from "@/lib/format";
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

export default function CookMode({ meal, onMealChange }: { meal: Meal; onMealChange?: (m: Meal) => void }) {
  const router = useRouter();
  const [behindOpen, setBehindOpen] = useState(false);
  const [customMin, setCustomMin] = useState("");
  const [shiftMsg, setShiftMsg] = useState("");
  const [shifting, setShifting] = useState(false);
  async function pushBack(min: number) {
    if (!min || min <= 0) return;
    setShifting(true);
    const ms = min * 60_000;
    const move = (iso: string | null | undefined) => (iso ? new Date(new Date(iso).getTime() + ms).toISOString() : null);
    const updated: Meal = {
      ...meal,
      serveAt: move(meal.serveAt) ?? meal.serveAt,
      dishes: meal.dishes.map((d) => ({ ...d, serveAt: move(d.serveAt), readyAt: move(d.readyAt) })),
    };
    try {
      const saved = await api<Meal>(`/api/meals/${meal.id}`, { method: "PUT", json: updated });
      onMealChange?.(saved);
      setShiftMsg(`Pushed back ${min} min. Now serving at ${formatTime(saved.serveAt)}. Reminders updated.`);
      setBehindOpen(false);
      setCustomMin("");
    } catch (e) {
      setShiftMsg((e as Error).message);
    }
    setShifting(false);
  }
  const [showAll, setShowAll] = useState(false);
  const [editing, setEditing] = useState<ScheduledStep | null>(null);
  async function moveFlexible(s: ScheduledStep, at: Date) {
    const pin = flexiblePinForDrop(s.step, at, dishTarget(meal, s.dish), meal.timezone);
    const updated = withStepPin(meal, s.dish.id, s.step.id, pin);
    onMealChange?.(updated);
    pending.current++;
    try {
      onMealChange?.(await api<Meal>(`/api/meals/${meal.id}`, { method: "PUT", json: updated }));
    } catch {
      onMealChange?.(meal);
    } finally {
      pending.current--;
    }
  }
  // Opening cook mode marks the timeline as started so it shows in the Active tab.
  useEffect(() => {
    if (!meal.startedAt && !meal.finishedAt) {
      api(`/api/meals/${meal.id}/status`, { method: "POST", json: { action: "start" } }).catch(() => {});
    }
  }, [meal.id, meal.startedAt, meal.finishedAt]);
  async function finish() {
    if (!confirm("Done cooking? This removes it from Active and cancels any remaining reminders.")) return;
    await api(`/api/meals/${meal.id}/status`, { method: "POST", json: { action: "finish" } }).catch(() => {});
    router.push(meal.isQuick ? "/library" : "/active");
  }
  const now = useNow();
  const awake = useWakeLock();
  const sched = useMemo(() => computeSchedule(meal), [meal]);
  // Checkmarks live in the database so every device shows the same progress.
  const done = useMemo(() => new Set(meal.doneKeys ?? []), [meal.doneKeys]);
  const [syncError, setSyncError] = useState("");
  const pending = useRef(0);

  async function saveDone(keys: string[], value: boolean) {
    pending.current++;
    try {
      const r = await api<{ doneKeys: string[] }>(`/api/meals/${meal.id}/done`, { method: "POST", json: { keys, done: value } });
      onMealChange?.({ ...meal, doneKeys: r.doneKeys });
      setSyncError("");
    } catch (e) {
      setSyncError((e as Error).message);
    } finally {
      pending.current--;
    }
  }

  const toggle = (k: string) => {
    const value = !done.has(k);
    const next = new Set(done);
    if (value) next.add(k); else next.delete(k);
    onMealChange?.({ ...meal, doneKeys: [...next] }); // instant feedback
    saveDone([k], value);
  };

  // Pull changes made on other devices (checkmarks, running-behind shifts, edits).
  useEffect(() => {
    const refresh = () => {
      if (pending.current > 0 || document.visibilityState !== "visible") return;
      api<Meal>(`/api/meals/${meal.id}`).then((m) => { if (pending.current === 0) onMealChange?.(m); }).catch(() => {});
    };
    const t = setInterval(refresh, 15_000);
    document.addEventListener("visibilitychange", refresh);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", refresh); };
  }, [meal.id, onMealChange]);

  // One-time move of checkmarks saved on this device by the older version of the app.
  useEffect(() => {
    const key = `done:${meal.id}`;
    try {
      const local: string[] = JSON.parse(localStorage.getItem(key) || "[]");
      localStorage.removeItem(key);
      const missing = local.filter((k) => !(meal.doneKeys ?? []).includes(k));
      if (missing.length) setTimeout(() => saveDone(missing, true), 0);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meal.id]);

  const endOf = (s: ScheduledStep) => (s.flexible ? s.flexible.until : s.end).getTime();
  const current = sched.steps.filter((s) => s.start.getTime() <= now && now < endOf(s) && !done.has(s.key));
  const overdue = sched.steps.filter((s) => endOf(s) <= now && !done.has(s.key));
  const upcoming = sched.steps.filter((s) => s.start.getTime() > now).slice(0, 4);
  const serveMs = new Date(meal.serveAt).getTime() - now;

  const renderStep = (s: ScheduledStep, mode: "now" | "next" | "late") => {
    const pct = Math.min(100, Math.max(0, ((now - s.start.getTime()) / (s.end.getTime() - s.start.getTime() || 1)) * 100));
    return (
      <div key={s.key} className="rounded-2xl border border-line bg-white p-3 md:p-4" style={{ borderLeft: `6px solid ${s.dish.color}` }}>
        <div className="flex items-start gap-3">
          <button
            aria-label="Mark done" onClick={() => toggle(s.key)}
            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 md:h-9 md:w-9 md:text-lg"
            style={{ borderColor: s.dish.color }}
          >
            {done.has(s.key) ? "✓" : ""}
          </button>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold md:text-xl">{s.dish.emoji} {s.step.title}</p>
              <button type="button" aria-label="Edit step" onClick={() => setEditing(s)} className="shrink-0 rounded-lg px-1.5 text-sm text-muted hover:bg-bg md:text-base">✏️</button>
            </div>
            <p className="text-sm text-muted md:text-base">
              {s.dish.name} · {s.step.kind === "active" ? "✋ hands-on" : "⏳ hands-off"}
              {s.step.ovenTemp ? ` · 🔥 ${s.step.ovenTemp}°F` : ""} ·{" "}
              {s.flexible
                ? `🕐 anytime ${formatDay(s.start)} before ${formatTime(s.flexible.until)}`
                : s.step.minutes > 0
                  ? `${formatTime(s.start)} to ${formatTime(s.end)}`
                  : `📌 at ${formatTime(s.start)}`}
            </p>
            {mode === "now" && s.flexible && (
              <p className="mt-1 text-sm font-semibold md:text-lg">Do this anytime in the next {formatCountdown(s.flexible.until.getTime() - now)}</p>
            )}
            {mode === "now" && !s.flexible && (
              <div className="mt-2">
                <div className="h-2 overflow-hidden rounded-full bg-line md:h-3">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: s.dish.color }} />
                </div>
                <p className="mt-1 text-right font-mono text-lg font-bold tabular-nums md:text-3xl">{formatCountdown(s.end.getTime() - now)} left</p>
              </div>
            )}
            {mode === "next" && (
              <p className="mt-1 text-sm font-semibold md:text-lg">
                {s.flexible ? "Window opens" : s.step.minutes > 0 ? "Starts" : "Happens"} in {formatCountdown(s.start.getTime() - now)}
                {s.step.minutes > 0 ? ` · ${formatDuration(s.step.minutes)}` : ""}
              </p>
            )}
            {mode === "late" && <p className="mt-1 text-sm font-semibold text-red-700">Should be done. Tap the circle when finished.</p>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-6xl pb-10 lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start lg:gap-10">
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link href="/active" className="text-sm font-semibold text-accent">‹ Active</Link>
        <span className="text-xs text-muted">{awake ? "☀️ Screen stays on" : ""}</span>
      </div>
      <div className="rounded-3xl bg-ink p-5 text-white md:p-7">
        <p className="text-sm opacity-70 md:text-lg">{meal.name}</p>
        <p className="text-sm opacity-70 md:text-lg">Serving at {formatTime(meal.serveAt)}</p>
        <p className="mt-1 font-mono text-4xl font-bold tabular-nums md:text-7xl">{serveMs > 0 ? formatCountdown(serveMs) : "Time to eat! 🎉"}</p>
      </div>
      <div className="space-y-2">
        <button className="btn-ghost w-full" onClick={() => setBehindOpen(!behindOpen)}>⏱️ Running behind?</button>
        {behindOpen && (
          <div className="card space-y-3">
            <p className="text-sm text-muted">Push every remaining step and the serving time back by:</p>
            <div className="grid grid-cols-4 gap-2">
              {[5, 10, 15, 30].map((m) => (
                <button key={m} className="btn-ghost px-2" disabled={shifting} onClick={() => pushBack(m)}>+{m}</button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number" inputMode="numeric" min={1} placeholder="Other" className="field w-24 text-center"
                value={customMin} onChange={(e) => setCustomMin(e.target.value)}
              />
              <span className="text-sm text-muted">min</span>
              <button className="btn-primary ml-auto" disabled={shifting || !(parseInt(customMin) > 0)} onClick={() => pushBack(parseInt(customMin))}>
                Push back
              </button>
            </div>
          </div>
        )}
        {shiftMsg && <p className="text-sm text-muted">{shiftMsg}</p>}
      </div>
      <DishLegend meal={meal} />
      <NotificationSetup compact />
      {syncError && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800">Checkmarks didn&apos;t sync: {syncError}</p>}

      {overdue.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-bold text-red-700 md:text-xl">Running behind</h2>
          {overdue.map((s) => renderStep(s, "late"))}
        </section>
      )}
      <section className="space-y-2">
        <h2 className="font-bold md:text-xl">Now</h2>
        {current.length ? current.map((s) => renderStep(s, "now")) : <p className="text-muted">Nothing in progress right now.</p>}
      </section>
      <section className="space-y-2">
        <h2 className="font-bold md:text-xl">Up next</h2>
        {upcoming.length ? upcoming.map((s) => renderStep(s, "next")) : <p className="text-muted">No more steps. 🎉</p>}
      </section>
      <section className="space-y-3 lg:hidden">
        <button className="font-bold md:text-xl" onClick={() => setShowAll(!showAll)}>{showAll ? "▾" : "▸"} Full timeline</button>
        {showAll && <Timeline meal={meal} onStepClick={setEditing} onMoveFlexible={moveFlexible} />}
      </section>
      {!meal.isQuick && (
        <Link href={`/meals/${meal.id}`} className="btn-ghost w-full">📋 Meal details</Link>
      )}
      <Link href={`/meals/${meal.id}/print`} className="btn-ghost w-full">🖨️ Print timeline</Link>
      <button className="btn-ghost w-full" onClick={finish}>✅ Done cooking</button>
    </div>

      {editing && (
        <StepEditSheet
          meal={meal} dishId={editing.dish.id} step={editing.step}
          onSaved={(m) => onMealChange?.(m)} onClose={() => setEditing(null)}
        />
      )}
      {/* Kitchen display: on iPad landscape and desktop the full timeline is always visible. */}
      <aside className="hidden lg:sticky lg:top-6 lg:block lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:pr-1">
        <div className="space-y-3">
          <h2 className="text-xl font-bold">Full timeline</h2>
          <Timeline meal={meal} onStepClick={setEditing} onMoveFlexible={moveFlexible} />
        </div>
      </aside>
    </div>
  );
}
