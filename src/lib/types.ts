export type StepKind = "active" | "passive";
export type StepPhase = "prep" | "finish";

export interface Step {
  id: string;
  title: string;
  minutes: number;
  kind: StepKind;
  /** Oven temperature in °F, if this step uses the oven. */
  ovenTemp?: number | null;
  /** "finish" steps are done right before serving when a dish is made ahead. */
  phase: StepPhase;
}

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
  /** Individual serve time (ISO). Used only when the meal's deadlineMode is "individual". */
  serveAt?: string | null;
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
