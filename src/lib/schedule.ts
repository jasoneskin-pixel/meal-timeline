import { HOLD_LABELS, UNTIL_SERVE, WINDOW_HOURS, WINDOW_LABELS, type Meal, type MealDish, type PinWindow, type Step } from "./types";
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
 *
 * - Steps pinned to an exact time are fixed and split the list into regions.
 *   Before the first exact pin and after the last one, steps work backward (as late as possible);
 *   between two exact pins, steps follow the earlier pin.
 * - Flexible pins sit in their window and do not move other steps.
 * - Background steps (hands-off, e.g. sous vide, marinating) don't block the steps after them:
 *   each one ends exactly when its "until" step starts (by default the next regular step).
 */
function layout(steps: Step[], end: Date, timeZone: string): Placed[] {
  const n = steps.length;
  const out: (Placed | null)[] = steps.map((s) => pinPlacement(s, end, timeZone));
  const dur = (i: number) => Math.max(0, steps[i].minutes) * MIN;
  const isFlex = (i: number) => !!out[i]?.flexible;
  const isExactPin = (i: number) => !!out[i] && !out[i]!.flexible;
  const isBg = (i: number) => !steps[i].pin && !!steps[i].background;

  const anchorOf = (i: number): number | "end" => {
    const u = steps[i].until;
    if (u === UNTIL_SERVE) return "end";
    if (u) {
      const j = steps.findIndex((s, k) => k > i && s.id === u);
      if (j >= 0) return j;
    }
    for (let j = i + 1; j < n; j++) {
      if (isFlex(j) || isBg(j)) continue;
      return j;
    }
    return "end";
  };
  const anchorStart = (a: number | "end"): number | null => (a === "end" ? end.getTime() : out[a] ? out[a]!.start.getTime() : null);
  const place = (i: number, start: number, finish: number) => {
    out[i] = { step: steps[i], start: new Date(start), end: new Date(finish) };
  };

  // Regions between exact pins (flexible-pinned steps are already placed and skipped).
  const pins = steps.map((_, i) => i).filter(isExactPin);
  const bounds = [-1, ...pins, n];
  const regions: { idx: number[]; mode: "back" | "forward"; limit: number }[] = [];
  for (let r = 0; r + 1 < bounds.length; r++) {
    const a = bounds[r];
    const b = bounds[r + 1];
    const idx: number[] = [];
    for (let i = a + 1; i < b; i++) if (!out[i]) idx.push(i);
    if (!idx.length) continue;
    if (b === n) regions.push({ idx, mode: "back", limit: end.getTime() });
    else if (a === -1) regions.push({ idx, mode: "back", limit: out[b]!.start.getTime() });
    else regions.push({ idx, mode: "forward", limit: out[a]!.end.getTime() });
  }

  // Later regions first, so anchors further along are already placed.
  for (const reg of regions.reverse()) {
    if (reg.mode === "back") {
      let minLater = reg.limit;
      for (const i of [...reg.idx].reverse()) {
        if (isBg(i)) {
          const fin = anchorStart(anchorOf(i)) ?? reg.limit;
          place(i, fin - dur(i), fin);
          minLater = Math.min(minLater, fin - dur(i));
        } else {
          place(i, minLater - dur(i), minLater);
          minLater -= dur(i);
        }
      }
    } else {
      let cursor = reg.limit;
      let pending: { i: number; kick: number }[] = [];
      for (const i of reg.idx) {
        if (isBg(i)) {
          pending.push({ i, kick: cursor });
          continue;
        }
        const waiting = pending.filter((p) => anchorOf(p.i) === i);
        const start = Math.max(cursor, ...waiting.map((p) => p.kick + dur(p.i)));
        for (const p of waiting) place(p.i, start - dur(p.i), start);
        pending = pending.filter((p) => !waiting.includes(p));
        place(i, start, start + dur(i));
        cursor = start + dur(i);
      }
      for (const p of pending) {
        const fin = anchorStart(anchorOf(p.i)) ?? p.kick + dur(p.i);
        place(p.i, fin - dur(p.i), fin);
      }
    }
  }
  return out as Placed[];
}

/** How long a dish takes from first step to last, accounting for background steps (pins ignored). */
export function dishSpanMinutes(steps: Step[]): number {
  if (!steps.some((s) => s.background)) return steps.reduce((t, s) => t + (s.minutes || 0), 0);
  const end = new Date(Date.UTC(2000, 0, 10));
  const placed = layout(steps.map((s) => ({ ...s, pin: null })), end, "UTC");
  const first = Math.min(...placed.map((p) => p.start.getTime()));
  return Math.round((end.getTime() - first) / MIN);
}

/** Warn when consecutive steps of a dish end up out of order (usually because of a pin). */
function orderConflicts(dish: MealDish, placed: Placed[]): Conflict[] {
  const out: Conflict[] = [];
  for (let i = 0; i + 1 < placed.length; i++) {
    const a = placed[i];
    const b = placed[i + 1];
    if (a.flexible || b.flexible) continue;
    if (!a.step.pin && a.step.background) continue; // runs alongside what follows
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
      const finishMin = dishSpanMinutes(finish.filter((s) => !s.pin));
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

/** Total time for a list of steps (background steps overlap, so this is the span, not the sum). */
export function totalMinutes(steps: Step[]): number {
  return dishSpanMinutes(steps);
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
