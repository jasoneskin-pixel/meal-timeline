export type StepKind = "active" | "passive";
export type StepPhase = "prep" | "finish";

export type PinWindow = "morning" | "afternoon" | "evening" | "anytime";

/** A step pinned to a chosen time instead of being scheduled automatically. */
export interface StepPin {
  /** 0 = the serving day, 1 = the day before, and so on. */
  daysBefore: number;
  /** Exact local time "HH:MM". If absent, the step is flexible within `window`. */
  time?: string | null;
  window?: PinWindow | null;
}

export const WINDOW_HOURS: Record<PinWindow, [number, number]> = {
  morning: [6, 12],
  afternoon: [12, 17],
  evening: [17, 22],
  anytime: [6, 22],
};

export const WINDOW_LABELS: Record<PinWindow, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  anytime: "Anytime that day",
};

export interface Step {
  id: string;
  title: string;
  minutes: number;
  kind: StepKind;
  /** Oven temperature in °F, if this step uses the oven. */
  ovenTemp?: number | null;
  /** "finish" steps are done right before serving when a dish is made ahead. */
  phase: StepPhase;
  pin?: StepPin | null;
  /** Hands-off step that runs alongside the following steps instead of blocking them. */
  background?: boolean;
  /** For background steps: the id of the later step it runs until, UNTIL_SERVE, or empty for "the next regular step". */
  until?: string | null;
}

export const UNTIL_SERVE = "__serve";

export interface Dish {
  id: string;
  name: string;
  emoji: string;
  color: string;
  steps: Step[];
  notes?: string | null;
  updatedAt?: string;
}

export type DishMode = "fresh" | "make_ahead";
export type HoldMethod = "room_temp" | "fridge" | "warm_oven" | "freezer";
export type DeadlineMode = "all" | "individual";

export interface MealDish {
  id: string;
  sourceDishId?: string | null;
  name: string;
  emoji: string;
  color: string;
  steps: Step[];
  mode: DishMode;
  holdMethod: HoldMethod;
  /** For make-ahead dishes: how many minutes before serving the prep should be finished. */
  readyAheadMin: number;
  /** For make-ahead dishes: an exact "prepared ahead by" time (ISO). When set, it is used instead of readyAheadMin. */
  readyAt?: string | null;
  /** Individual serve time (ISO). Used only when the meal's deadlineMode is "individual". */
  serveAt?: string | null;
  /** The meal's "Other tasks" list: pinned items not tied to a dish. */
  isTasks?: boolean;
}

export interface Meal {
  id: string;
  name: string;
  /** Main serving time (ISO). */
  serveAt: string;
  deadlineMode: DeadlineMode;
  timezone: string;
  reminderLeadMin: number;
  remindersOn: boolean;
  inLibrary: boolean;
  /** A one-off cook of a single dish. Hidden from lists and cleaned up after serving. */
  isQuick?: boolean;
  /** When cook mode was first opened. */
  startedAt?: string | null;
  /** When "Done cooking" was tapped. */
  finishedAt?: string | null;
  /** Steps checked off in cook mode (shared across devices). */
  doneKeys?: string[];
  notes?: string | null;
  dishes: MealDish[];
  updatedAt?: string;
}

export const HOLD_LABELS: Record<HoldMethod, string> = {
  room_temp: "Room temp",
  fridge: "Refrigerator",
  warm_oven: "Warm oven",
  freezer: "Freezer",
};
