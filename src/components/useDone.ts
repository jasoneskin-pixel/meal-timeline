"use client";
import { useMemo, useState } from "react";
import { api } from "./api";
import type { Meal } from "@/lib/types";

/** Synced checkmarks for a meal: instant on screen, saved to the server for every device. */
export function useDone(meal: Meal | null, setMeal: (m: Meal) => void) {
  const done = useMemo(() => new Set(meal?.doneKeys ?? []), [meal?.doneKeys]);
  const [error, setError] = useState("");
  async function toggle(key: string) {
    if (!meal) return;
    const value = !done.has(key);
    const next = new Set(done);
    if (value) next.add(key); else next.delete(key);
    setMeal({ ...meal, doneKeys: [...next] });
    try {
      const r = await api<{ doneKeys: string[] }>(`/api/meals/${meal.id}/done`, { method: "POST", json: { keys: [key], done: value } });
      setMeal({ ...meal, doneKeys: r.doneKeys });
      setError("");
    } catch (e) {
      setMeal(meal);
      setError((e as Error).message);
    }
  }
  return { done, toggle, error };
}
