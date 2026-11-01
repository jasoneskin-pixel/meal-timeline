"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/components/api";
import SwipeToDelete from "@/components/SwipeToDelete";
import { useUndoToast } from "@/components/UndoToast";
import { computeSchedule } from "@/lib/schedule";
import { lastServe } from "@/lib/active";
import { formatCountdown, formatDateTime, formatTime } from "@/lib/format";
import type { Meal } from "@/lib/types";

function ActiveCard({ meal, now }: { meal: Meal; now: number }) {
  const sched = computeSchedule(meal);
  const done = new Set(meal.doneKeys ?? []);
  const current = sched.steps.filter((s) => !done.has(s.key) && s.start.getTime() <= now && now < (s.flexible ? s.flexible.until : s.end).getTime());
  const next = sched.steps.find((s) => !done.has(s.key) && s.start.getTime() > now);
  const serve = lastServe(meal).getTime();
  const colors = meal.dishes.map((d) => d.color);
  return (
    <Link
      href={`/meals/${meal.id}/cook`}
      className="block overflow-hidden rounded-2xl border border-line bg-white shadow-sm active:scale-[0.99]"
    >
      <div className="flex h-1.5">
        {colors.map((c, i) => <span key={i} className="flex-1" style={{ backgroundColor: c }} />)}
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted">{meal.isQuick ? "Dish" : "Meal"}</p>
            <p className="text-lg font-bold">{meal.dishes.map((d) => d.emoji).join("")} {meal.name}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted">{serve > now ? "Ready in" : "Ready"}</p>
            <p className="font-mono text-lg font-bold tabular-nums">{serve > now ? formatCountdown(serve - now) : "🎉"}</p>
          </div>
        </div>
        {current.length > 0 ? (
          current.map((s) => (
            <p key={s.key} className="text-sm">
              <span className="font-semibold">Now:</span> {s.dish.emoji} {s.step.title}{" "}
              <span className="text-muted">
                ({s.flexible ? `anytime before ${formatTime(s.flexible.until)}` : `${formatCountdown(s.end.getTime() - now)} left`})
              </span>
            </p>
          ))
        ) : (
          <p className="text-sm text-muted">Nothing in progress right now.</p>
        )}
        {next && (
          <p className="text-sm">
            <span className="font-semibold">Next:</span> {next.dish.emoji} {next.step.title}{" "}
            <span className="text-muted">at {next.start.getTime() - now < 86_400_000 ? formatTime(next.start) : formatDateTime(next.start)}</span>
          </p>
        )}
        <p className="pt-1 text-sm font-semibold text-accent">Open cook mode ›</p>
      </div>
    </Link>
  );
}

export default function ActivePage() {
  const [meals, setMeals] = useState<Meal[] | null>(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const { toast, show } = useUndoToast();
  const load = () => api<Meal[]>("/api/active").then(setMeals).catch((e) => setError(e.message));

  async function finish(m: Meal) {
    setMeals((list) => (list ?? []).filter((x) => x.id !== m.id));
    try {
      await api(`/api/meals/${m.id}/status`, { method: "POST", json: { action: "finish" } });
      show({
        label: m.name,
        message: `Finished ${m.name}`,
        undo: async () => {
          await api(`/api/meals/${m.id}/status`, { method: "POST", json: { action: "resume" } });
          await load();
        },
      });
    } catch (e) {
      setError((e as Error).message);
      load();
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="text-2xl font-bold">🔥 Active</h1>
      {error && <p className="text-red-700">{error}</p>}
      {meals === null && !error && <p className="text-muted">Loading...</p>}
      {meals?.length === 0 && (
        <div className="card text-center">
          <p className="text-4xl">🍳</p>
          <p className="mt-2 font-semibold">Nothing cooking right now</p>
          <p className="text-sm text-muted">
            Timelines show up here once you start them (▶ Cook on a dish, or Cook mode on a meal) and stay until you tap Done cooking.
          </p>
        </div>
      )}
      {meals?.map((m) => (
        <SwipeToDelete key={m.id} label="✅ Done" menuLabel="Done cooking" color="#2a9d8f" onDelete={() => finish(m)}>
          <ActiveCard meal={m} now={now} />
        </SwipeToDelete>
      ))}
      {meals && meals.length > 0 && <p className="text-center text-xs text-muted">Tip: swipe left on a card when you&apos;re done cooking (on a computer, use the ⋯ button).</p>}
      {toast}
    </div>
  );
}
