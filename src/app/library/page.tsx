"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/components/api";
import { formatDateTime, formatDuration } from "@/lib/format";
import { totalMinutes } from "@/lib/schedule";
import type { Dish, Meal } from "@/lib/types";

export default function LibraryPage() {
  const [tab, setTab] = useState<"dishes" | "meals">("dishes");
  const [dishes, setDishes] = useState<Dish[] | null>(null);
  const [meals, setMeals] = useState<Meal[] | null>(null);
  useEffect(() => {
    api<Dish[]>("/api/dishes").then(setDishes).catch(() => setDishes([]));
    api<Meal[]>("/api/meals").then((m) => setMeals(m.filter((x) => x.inLibrary))).catch(() => setMeals([]));
  }, []);

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Library</h1>
        {tab === "dishes" && <Link href="/dishes/new" className="btn-primary">+ New dish</Link>}
      </header>
      <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-line text-sm font-semibold">
        <button onClick={() => setTab("dishes")} className={`py-2.5 ${tab === "dishes" ? "bg-ink text-white" : "bg-white text-muted"}`}>Dishes</button>
        <button onClick={() => setTab("meals")} className={`py-2.5 ${tab === "meals" ? "bg-ink text-white" : "bg-white text-muted"}`}>Saved meals</button>
      </div>

      {tab === "dishes" && (
        <div className="space-y-2">
          {dishes === null && <p className="text-muted">Loading...</p>}
          {dishes?.length === 0 && <p className="text-muted">No saved dishes yet. Add one here, or save one while planning a meal.</p>}
          {dishes?.map((d) => (
            <Link key={d.id} href={`/dishes/${d.id}`} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3" style={{ borderLeft: `6px solid ${d.color}` }}>
              <span className="text-2xl">{d.emoji}</span>
              <span className="flex-1">
                <span className="block font-semibold">{d.name}</span>
                <span className="text-sm text-muted">{d.steps.length} steps · {formatDuration(totalMinutes(d.steps))}</span>
              </span>
              <span className="text-muted">›</span>
            </Link>
          ))}
        </div>
      )}

      {tab === "meals" && (
        <div className="space-y-2">
          {meals === null && <p className="text-muted">Loading...</p>}
          {meals?.length === 0 && <p className="text-muted">No saved meals yet. Turn on &quot;Save this meal to the library&quot; when editing a meal.</p>}
          {meals?.map((m) => (
            <Link key={m.id} href={`/meals/${m.id}`} className="card block">
              <p className="font-bold">⭐ {m.name} <span className="ml-1">{m.dishes.map((d) => d.emoji).join("")}</span></p>
              <p className="text-sm text-muted">Last planned for {formatDateTime(m.serveAt)} · {m.dishes.length} dishes</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
