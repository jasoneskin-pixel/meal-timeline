"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/components/api";
import CookDishSheet from "@/components/CookDishSheet";
import SwipeToDelete from "@/components/SwipeToDelete";
import { useUndoToast } from "@/components/UndoToast";
import { formatDateTime, formatDuration } from "@/lib/format";
import { totalMinutes } from "@/lib/schedule";
import type { Dish, Meal } from "@/lib/types";

export default function LibraryPage() {
  const [tab, setTab] = useState<"dishes" | "meals">("dishes");
  const [dishes, setDishes] = useState<Dish[] | null>(null);
  const [meals, setMeals] = useState<Meal[] | null>(null);
  const [cookDish, setCookDish] = useState<Dish | null>(null);
  const [error, setError] = useState("");
  const { toast, show } = useUndoToast();
  const loadDishes = () => api<Dish[]>("/api/dishes").then(setDishes).catch(() => setDishes([]));
  const loadMeals = () => api<Meal[]>("/api/meals").then((m) => setMeals(m.filter((x) => x.inLibrary))).catch(() => setMeals([]));
  useEffect(() => {
    loadDishes();
    loadMeals();
  }, []);

  async function removeDish(d: Dish) {
    setDishes((list) => (list ?? []).filter((x) => x.id !== d.id));
    try {
      await api(`/api/dishes/${d.id}`, { method: "DELETE" });
      show({ label: d.name, undo: async () => { await api("/api/dishes", { method: "POST", json: d }); await loadDishes(); } });
    } catch (e) {
      setError((e as Error).message);
      loadDishes();
    }
  }

  async function removeMeal(m: Meal) {
    setMeals((list) => (list ?? []).filter((x) => x.id !== m.id));
    try {
      await api(`/api/meals/${m.id}`, { method: "DELETE" });
      show({ label: m.name, undo: async () => { await api("/api/meals", { method: "POST", json: m }); await loadMeals(); } });
    } catch (e) {
      setError((e as Error).message);
      loadMeals();
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
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
            <SwipeToDelete key={d.id} onDelete={() => removeDish(d)}>
            <div className="flex items-center gap-2 rounded-2xl border border-line bg-white p-2 pl-3" style={{ borderLeft: `6px solid ${d.color}` }}>
              <Link href={`/dishes/${d.id}`} className="flex flex-1 items-center gap-3 py-1">
                <span className="text-2xl">{d.emoji}</span>
                <span className="flex-1">
                  <span className="block font-semibold">{d.name}</span>
                  <span className="text-sm text-muted">{d.steps.length} steps · {formatDuration(totalMinutes(d.steps))}</span>
                </span>
              </Link>
              <button className="btn-ghost px-3 py-2 text-sm" disabled={!d.steps.length} onClick={() => setCookDish(d)}>▶ Cook</button>
            </div>
            </SwipeToDelete>
          ))}
        </div>
      )}

      {tab === "meals" && (
        <div className="space-y-2">
          {meals === null && <p className="text-muted">Loading...</p>}
          {meals?.length === 0 && <p className="text-muted">No saved meals yet. Turn on &quot;Save this meal to the library&quot; when editing a meal.</p>}
          {meals?.map((m) => (
            <SwipeToDelete key={m.id} onDelete={() => removeMeal(m)}>
              <Link href={`/meals/${m.id}`} className="card block">
                <p className="font-bold">⭐ {m.name} <span className="ml-1">{m.dishes.map((d) => d.emoji).join("")}</span></p>
                <p className="text-sm text-muted">Last planned for {formatDateTime(m.serveAt)} · {m.dishes.length} dishes</p>
              </Link>
            </SwipeToDelete>
          ))}
        </div>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
      {dishes && dishes.length > 0 && tab === "dishes" && <p className="text-center text-xs text-muted">Tip: swipe left on an item to delete it (on a computer, use the ⋯ button).</p>}
      {cookDish && <CookDishSheet dish={cookDish} onClose={() => setCookDish(null)} />}
      {toast}
    </div>
  );
}
