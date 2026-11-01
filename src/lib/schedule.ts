import { HOLD_LABELS, WINDOW_HOURS, WINDOW_LABELS, type Meal, type MealDish, type PinWindow, type Step } from "./types";
import { formatTime } from "./format";
import { resolveTimeZone, wallTimeDaysBefore } from "./zoned";

export interface ScheduledStep {
  type: "step";
  key: string;
  dishIndex: number;
  dish: MealDish;
  step: Step;
  start: Date;
  end: Date;
  /** Pinned to a time the user chose. */
  pinned?: boolean;
  /** Flexible pin: can happen any time in the window, until `until`. */
  flexible?: { window: PinWindow; until: Date };
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
  kind: "active_overlap" | "oven_temp" | "order";
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
  const iso = meal.deadlineMode === "individual" && dish.serveAt && !dish.isTasks ? dish.serveAt : meal.serveAt;
  return new Date(iso);
}

type Placed = { step: Step; start: Date; end: Date; pinned?: boolean; flexible?: { window: PinWindow; until: Date } };

/** Where a pinned step starts, relative to the dish's serving time. */
export function pinPlacement(step: Step, target: Date, timeZone: string): Placed | null {
  const pin = step.pin;
  if (!pin) return null;
  const days = Math.max(0, Math.round(pin.daysBefore || 0));
  const dur = Math.max(0, step.minutes) * MIN;
  if (pin.time && /^\d{1,2}:\d{2}$/.test(pin.time)) {
    const [h, m] = pin.time.split(":").map(Number);
    const start = wallTimeDaysBefore(target, days, h, m, timeZone);
    return { step, start, end: new Date(start.getTime() + dur), pinned: true };
  }
  const window = pin.window ?? "anytime";
  const [h0, h1] = WINDOW_HOURS[window];
  const start = wallTimeDaysBefore(target, days, h0, 0, timeZone);
  const windowEnd = wallTimeDaysBefore(target, days, h1, 0, timeZone);
  return { step, start, end: new Date(start.getTime() + dur), pinned: true, flexible: { window, until: windowEnd } };
}

/**
 * Lay out an ordered list of steps that must be finished by `end`.
 * Pinned steps sit at their chosen times; unpinned steps before the first pin lead up to it,
 * steps between pins follow the earlier pin, and steps after the last pin work backward from `end`.
 */
function layout(steps: Step[], end: Date, timeZone: string): Placed[] {
  const out: (Placed | null)[] = steps.map((s) => pinPlacement(s, end, timeZone));
  const pins = out.map((p, i) => (p ? i : -1)).filter((i) => i >= 0);

  const back = (from: number, to: number, finish: number) => {
    let cursor = finish;
    for (let i = to; i >= from; i--) {
      const start = cursor - Math.max(0, steps[i].minutes) * MIN;
      out[i] = { step: steps[i], start: new Date(start), end: new Date(cursor) };
      cursor = start;
    }
  };
  const forward = (from: number, to: number, begin: number) => {
    let cursor = begin;
    for (let i = from; i <= to; i++) {
      const fin = cursor + Math.max(0, steps[i].minutes) * MIN;
      out[i] = { step: steps[i], start: new Date(cursor), end: new Date(fin) };
      cursor = fin;
    }
  };

  if (!pins.length) {
    back(0, steps.length - 1, end.getTime());
  } else {
    const first = pins[0];
    const last = pins[pins.length - 1];
    if (first > 0) back(0, first - 1, out[first]!.start.getTime());
    for (let k = 0; k < pins.length - 1; k++) {
      const a = pins[k];
      const b = pins[k + 1];
      if (b - a > 1) forward(a + 1, b - 1, out[a]!.end.getTime());
    }
    if (last < steps.length - 1) back(last + 1, steps.length - 1, end.getTime());
  }
  return out as Placed[];
}

/** Warn when consecutive steps of a dish end up out of order (usually because of a pin). */
function orderConflicts(dish: MealDish, placed: Placed[]): Conflict[] {
  const out: Conflict[] = [];
  for (let i = 0; i + 1 < placed.length; i++) {
    const a = placed[i];
    const b = placed[i + 1];
    if (a.flexible || b.flexible) continue;
    if (b.start.getTime() < a.end.getTime() - 1000) {
      out.push({
        kind: "order",
        keys: [`${dish.id}:${a.step.id}`, `${dish.id}:${b.step.id}`],
        message: `${dish.emoji} ${b.step.title || "A step"} is set for ${formatTime(b.start)}, before ${a.step.title || "the step before it"} finishes (${formatTime(a.end)}).`,
      });
    }
  }
  return out;
}

export function computeSchedule(meal: Meal): MealSchedule {
  const steps: ScheduledStep[] = [];
  const markers: ScheduledMarker[] = [];
  const extra: Conflict[] = [];
  const tz = resolveTimeZone(meal.timezone);

  meal.dishes.forEach((dish, dishIndex) => {
    const target = dishTarget(meal, dish);
    if (isNaN(target.getTime())) return;
    const push = (list: Placed[]) => {
      for (const p of list) steps.push({ type: "step", key: `${dish.id}:${p.step.id}`, dishIndex, dish, ...p });
      extra.push(...orderConflicts(dish, list));
    };

    if (dish.mode === "make_ahead" && !dish.isTasks) {
      const prep = dish.steps.filter((s) => s.phase !== "finish");
      const finish = dish.steps.filter((s) => s.phase === "finish");
      const finishMin = finish.filter((s) => !s.pin).reduce((t, s) => t + s.minutes, 0);
      // Prep must be done readyAheadMin before serving, but never later than when finishing steps begin.
      const ahead = Math.max(dish.readyAheadMin, finishMin);
      const prepEnd = new Date(target.getTime() - ahead * MIN);
      push(layout(prep, prepEnd, tz));
      if (prep.length) {
        markers.push({
          type: "hold",
          key: `${dish.id}:hold`,
          dishIndex,
          dish,
          at: prepEnd,
          label: `Hold ${dish.name}: ${HOLD_LABELS[dish.holdMethod].toLowerCase()} until ${finish.length ? "finishing" : "serving"}`,
        });
      }
      push(layout(finish, target, tz));
    } else {
      push(layout(dish.steps, target, tz));
    }
    if (!dish.isTasks) {
      markers.push({ type: "serve", key: `${dish.id}:serve`, dishIndex, dish, at: target, label: `Serve ${dish.name}` });
    }
  });

  const timeOf = (i: TimelineItem) => (i.type === "step" ? i.start : i.at).getTime();
  const order = (i: TimelineItem) => (i.type === "hold" ? 0 : i.type === "step" ? 1 : 2);
  const items: TimelineItem[] = [...steps, ...markers].sort(
    (a, b) => timeOf(a) - timeOf(b) || order(a) - order(b) || a.dishIndex - b.dishIndex,
  );

  return {
    items,
    steps: [...steps].sort((a, b) => a.start.getTime() - b.start.getTime()),
    conflicts: [...extra, ...findConflicts(steps)],
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
      // Flexible steps can be moved within their window, so they never count as clashing.
      if (a.dish.id === b.dish.id || a.flexible || b.flexible || !overlaps(a, b)) continue;
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

export function describePin(step: Step): string | null {
  const p = step.pin;
  if (!p) return null;
  const day = p.daysBefore === 0 ? "Serving day" : p.daysBefore === 1 ? "1 day before" : `${p.daysBefore} days before`;
  if (p.time) {
    const [h, m] = p.time.split(":").map(Number);
    const d = new Date(2000, 0, 1, h, m);
    return `${day}, ${formatTime(d)}`;
  }
  return `${day}, ${WINDOW_LABELS[p.window ?? "anytime"].toLowerCase()}`;
}
