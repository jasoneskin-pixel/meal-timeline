import { computeSchedule, dishTarget } from "./schedule";
import type { Meal } from "./types";

const HOURS = 3600_000;
/** How long after the last serving time a forgotten timeline stays in Active. */
export const ACTIVE_GRACE_MS = 6 * HOURS;

export function lastServe(meal: Meal): Date {
  const times = meal.dishes.map((d) => dishTarget(meal, d).getTime()).filter((t) => !isNaN(t));
  return new Date(times.length ? Math.max(...times) : new Date(meal.serveAt).getTime());
}

/** A timeline is active once started (or once its first step is due) until it is finished or well past serving. */
export function isActive(meal: Meal, now = Date.now()): boolean {
  if (meal.finishedAt) return false;
  if (now > lastServe(meal).getTime() + ACTIVE_GRACE_MS) return false;
  if (meal.isQuick || meal.startedAt) return true;
  const first = computeSchedule(meal).firstStart;
  return !!first && now >= first.getTime();
}
