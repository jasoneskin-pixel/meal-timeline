import type { Meal } from "./types";

const MIN = 60_000;

/** Pause the given dishes (or every dish) at `now`. Already-paused dishes are left as they are. */
export function pauseDishes(meal: Meal, dishIds: string[] | "all", now: number = Date.now()): Meal {
  const at = new Date(now).toISOString();
  return {
    ...meal,
    dishes: meal.dishes.map((d) => ((dishIds === "all" || dishIds.includes(d.id)) && !d.pausedAt ? { ...d, pausedAt: at } : d)),
  };
}

/** Resume the given dishes: the time they spent paused is added to their delay. */
export function resumeDishes(meal: Meal, dishIds: string[] | "all", now: number = Date.now()): Meal {
  return {
    ...meal,
    dishes: meal.dishes.map((d) => {
      if (!d.pausedAt || (dishIds !== "all" && !dishIds.includes(d.id))) return d;
      const paused = Math.max(0, (now - new Date(d.pausedAt).getTime()) / MIN); // exact, so short pauses count too
      return { ...d, pausedAt: null, delayMin: (d.delayMin ?? 0) + paused };
    }),
  };
}

/** Dishes that can be paused (Other tasks are all pinned, so pausing them does nothing). */
export const pausableDishes = (meal: Meal) => meal.dishes.filter((d) => !d.isTasks);
export const isAllPaused = (meal: Meal) => pausableDishes(meal).length > 0 && pausableDishes(meal).every((d) => d.pausedAt);
