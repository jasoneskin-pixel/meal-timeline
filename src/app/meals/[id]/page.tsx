"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/components/api";
import { useMeal } from "@/components/useMeal";
import Timeline, { DishLegend } from "@/components/Timeline";
import NotificationSetup from "@/components/NotificationSetup";
import { computeSchedule } from "@/lib/schedule";
import { formatDateTime, fromLocalInputs } from "@/lib/format";
import type { Meal } from "@/lib/types";

export default function MealPage() {
  const router = useRouter();
  const { meal, error } = useMeal();
  const [dupOpen, setDupOpen] = useState(false);
  const [dupDate, setDupDate] = useState("");
  const [dupTime, setDupTime] = useState("");

  if (error) return <p className="text-red-700">{error}</p>;
  if (!meal) return <p className="text-muted">Loading...</p>;
  const sched = computeSchedule(meal);

  async function duplicate() {
    const serveAt = fromLocalInputs(dupDate, dupTime);
    if (!serveAt || !meal) return;
    const copy = await api<Meal>(`/api/meals/${meal.id}/duplicate`, { method: "POST", json: { serveAt } });
    router.push(`/meals/${copy.id}`);
  }

  async function remove() {
    if (!meal || !confirm(`Delete "${meal.name}"?`)) return;
    await api(`/api/meals/${meal.id}`, { method: "DELETE" });
    router.push("/meals");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/meals" className="text-sm font-semibold text-accent">‹ Meals</Link>
      <header>
        <h1 className="text-2xl font-bold">{meal.inLibrary ? "⭐ " : ""}{meal.name}</h1>
        <p className="text-muted">Serve {formatDateTime(meal.serveAt)}{meal.deadlineMode === "individual" ? " (dishes have their own times)" : ""}</p>
        {sched.firstStart && <p className="text-muted">Start cooking {formatDateTime(sched.firstStart)}</p>}
      </header>
      <div className="grid grid-cols-2 gap-3">
        <Link href={`/meals/${meal.id}/cook`} className="btn-primary">👩‍🍳 Cook mode</Link>
        <Link href={`/meals/${meal.id}/edit`} className="btn-ghost">✏️ Edit</Link>
      </div>
      {meal.remindersOn && <NotificationSetup compact />}
      <DishLegend meal={meal} />
      <Timeline meal={meal} />
      <div className="card space-y-3">
        <button className="font-semibold" onClick={() => setDupOpen(!dupOpen)}>🔁 Plan this meal again on another date</button>
        {dupOpen && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input type="date" className="field flex-1" value={dupDate} onChange={(e) => setDupDate(e.target.value)} />
              <input type="time" className="field w-36" value={dupTime} onChange={(e) => setDupTime(e.target.value)} />
            </div>
            <button className="btn-primary w-full" disabled={!dupDate || !dupTime} onClick={duplicate}>Create copy</button>
          </div>
        )}
      </div>
      <button className="btn-danger w-full" onClick={remove}>Delete meal</button>
    </div>
  );
}
