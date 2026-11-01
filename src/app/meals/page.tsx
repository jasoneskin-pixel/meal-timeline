"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/components/api";
import SwipeToDelete from "@/components/SwipeToDelete";
import { useUndoToast } from "@/components/UndoToast";
import { computeSchedule } from "@/lib/schedule";
import { formatDateTime, formatTime } from "@/lib/format";
import type { Meal } from "@/lib/types";

function MealCard({ meal }: { meal: Meal }) {
  const sched = computeSchedule(meal);
  return (
    <Link href={`/meals/${meal.id}`} className="card block">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold">{meal.inLibrary ? "⭐ " : ""}{meal.name}</p>
          <p className="text-sm text-muted">Serve {formatDateTime(meal.serveAt)}</p>
          {sched.firstStart && <p className="text-sm text-muted">Start cooking {formatTime(sched.firstStart)}</p>}
        </div>
        <span className="text-xl">{meal.dishes.map((d) => d.emoji).join("")}</span>
      </div>
    </Link>
  );
}

export default function Home() {
  const [meals, setMeals] = useState<Meal[] | null>(null);
  const [error, setError] = useState("");
  const { toast, show } = useUndoToast();
  const load = () => api<Meal[]>("/api/meals").then(setMeals).catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  async function remove(meal: Meal) {
    setMeals((list) => (list ?? []).filter((m) => m.id !== meal.id));
    try {
      await api(`/api/meals/${meal.id}`, { method: "DELETE" });
      show({
        label: meal.name,
        undo: async () => {
          await api("/api/meals", { method: "POST", json: meal });
          await load();
        },
      });
    } catch (e) {
      setError((e as Error).message);
      load();
    }
  }
  const row = (m: Meal) => (
    <SwipeToDelete key={m.id} onDelete={() => remove(m)}>
      <MealCard meal={m} />
    </SwipeToDelete>
  );
  const [cutoff] = useState(() => Date.now() - 6 * 3600_000);
  const upcoming = (meals ?? []).filter((m) => new Date(m.serveAt).getTime() >= cutoff).reverse();
  const past = (meals ?? []).filter((m) => new Date(m.serveAt).getTime() < cutoff);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Meals</h1>
        <Link href="/meals/new" className="btn-primary">+ New meal</Link>
      </header>
      {error && <p className="text-red-700">{error}</p>}
      {meals === null && !error && <p className="text-muted">Loading...</p>}
      {meals?.length === 0 && (
        <div className="card text-center">
          <p className="text-4xl">🍽️</p>
          <p className="mt-2 font-semibold">No meals yet</p>
          <p className="text-sm text-muted">Plan a meal, add dishes, and get a step-by-step timeline.</p>
        </div>
      )}
      {upcoming.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Upcoming</h2>
          {upcoming.map(row)}
        </section>
      )}
      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Past</h2>
          {past.map(row)}
        </section>
      )}
      {toast}
    </div>
  );
}
