import { HOLD_LABELS, type Meal, type MealDish, type Step } from "./types";
import { formatTime } from "./format";

export interface ScheduledStep {
  type: "step";
  key: string;
  dishIndex: number;
  dish: MealDish;
  step: Step;
  start: Date;
  end: Date;
}

export interface ScheduledMarker {
  type: "hold" | "serve";
  key: string;
  dishIndex: number;
  dish: MealDish;
  at: Date;
  label: string;
}

export type TimelineItem = ScheduledStep | ScheduledMarker;

export interface Conflict {
  kind: "active_overlap" | "oven_temp";
  message: string;
  keys: string[];
}

export interface MealSchedule {
  items: TimelineItem[];
  steps: ScheduledStep[];
  conflicts: Conflict[];
  firstStart: Date | null;
  lastEnd: Date | null;
}

const MIN = 60_000;

export function dishTarget(meal: Meal, dish: MealDish): Date {
  const iso = meal.deadlineMode === "individual" && dish.serveAt ? dish.serveAt : meal.serveAt;
  return new Date(iso);
}

/** Lay steps end-to-end so the last one finishes exactly at `end`. */
function backSchedule(steps: Step[], end: Date): { step: Step; start: Date; end: Date }[] {
  const out: { step: Step; start: Date; end: Date }[] = [];
  let cursor = end.getTime();
  for (let i = steps.length - 1; i >= 0; i--) {
    const s = steps[i];
    const start = cursor - Math.max(0, s.minutes) * MIN;
    out.unshift({ step: s, start: new Date(start), end: new Date(cursor) });
    cursor = start;
  }
  return out;
}

export function computeSchedule(meal: Meal): MealSchedule {
  const steps: ScheduledStep[] = [];
  const markers: ScheduledMarker[] = [];

  meal.dishes.forEach((dish, dishIndex) => {
    const target = dishTarget(meal, dish);
    if (isNaN(target.getTime())) return;

    if (dish.mode === "make_ahead") {
      const prep = dish.steps.filter((s) => s.phase !== "finish");
      const finish = dish.steps.filter((s) => s.phase === "finish");
      const finishMin = finish.reduce((t, s) => t + s.minutes, 0);
      // Prep must be done readyAheadMin before serving, but never later than when finishing steps begin.
      const ahead = Math.max(dish.readyAheadMin, finishMin);
      const prepEnd = new Date(target.getTime() - ahead * MIN);
      for (const p of backSchedule(prep, prepEnd)) {
        steps.push({ type: "step", key: `${dish.id}:${p.step.id}`, dishIndex, dish, ...p });
      }
      if (prep.length) {
        markers.push({
          type: "hold",
          key: `${dish.id}:hold`,
          dishIndex,
          dish,
          at: prepEnd,
          label: `Hold ${dish.name}: ${HOLD_LABELS[dish.holdMethod].toLowerCase()} until ${
            finish.length ? "finishing" : "serving"
          }`,
        });
      }
      for (const f of backSchedule(finish, target)) {
        steps.push({ type: "step", key: `${dish.id}:${f.step.id}`, dishIndex, dish, ...f });
      }
    } else {
      for (const p of backSchedule(dish.steps, target)) {
        steps.push({ type: "step", key: `${dish.id}:${p.step.id}`, dishIndex, dish, ...p });
      }
    }
    markers.push({ type: "serve", key: `${dish.id}:serve`, dishIndex, dish, at: target, label: `Serve ${dish.name}` });
  });

  const timeOf = (i: TimelineItem) => (i.type === "step" ? i.start : i.at).getTime();
  const order = (i: TimelineItem) => (i.type === "hold" ? 0 : i.type === "step" ? 1 : 2);
  const items: TimelineItem[] = [...steps, ...markers].sort(
    (a, b) => timeOf(a) - timeOf(b) || order(a) - order(b) || a.dishIndex - b.dishIndex,
  );

  return {
    items,
    steps: [...steps].sort((a, b) => a.start.getTime() - b.start.getTime()),
    conflicts: findConflicts(steps),
    firstStart: steps.length ? new Date(Math.min(...steps.map((s) => s.start.getTime()))) : null,
    lastEnd: steps.length ? new Date(Math.max(...steps.map((s) => s.end.getTime()))) : null,
  };
}

function overlaps(a: ScheduledStep, b: ScheduledStep): boolean {
  return a.start < b.end && b.start < a.end && a.step.minutes > 0 && b.step.minutes > 0;
}

export function findConflicts(steps: ScheduledStep[]): Conflict[] {
  const conflicts: Conflict[] = [];
  for (let i = 0; i < steps.length; i++) {
    for (let j = i + 1; j < steps.length; j++) {
      const a = steps[i];
      const b = steps[j];
      if (a.dish.id === b.dish.id || !overlaps(a, b)) continue;
      const at = formatTime(a.start > b.start ? a.start : b.start);
      if (a.step.kind === "active" && b.step.kind === "active") {
        conflicts.push({
          kind: "active_overlap",
          keys: [a.key, b.key],
          message: `Two hands-on steps overlap around ${at}: ${a.dish.emoji} ${a.step.title} and ${b.dish.emoji} ${b.step.title}.`,
        });
      }
      if (a.step.ovenTemp && b.step.ovenTemp && a.step.ovenTemp !== b.step.ovenTemp) {
        conflicts.push({
          kind: "oven_temp",
          keys: [a.key, b.key],
          message: `Oven conflict around ${at}: ${a.dish.emoji} ${a.step.title} needs ${a.step.ovenTemp}°F but ${b.dish.emoji} ${b.step.title} needs ${b.step.ovenTemp}°F.`,
        });
      }
    }
  }
  return conflicts;
}

export function totalMinutes(steps: Step[]): number {
  return steps.reduce((t, s) => t + (s.minutes || 0), 0);
}
