import "server-only";
import { db, OWNER } from "./db";
import { computeSchedule } from "./schedule";
import { formatDuration, formatTime } from "./format";
import { HOLD_LABELS, WINDOW_LABELS, type Meal } from "./types";

interface NotificationRow {
  owner: string;
  meal_id: string;
  fire_at: string;
  title: string;
  body: string;
  url: string;
  kind: string;
  step_key?: string;
}

export function buildNotifications(meal: Meal, now = new Date()): NotificationRow[] {
  if (!meal.remindersOn) return [];
  const sched = computeSchedule(meal);
  const lead = meal.reminderLeadMin;
  const tz = meal.timezone;
  const url = `/meals/${meal.id}/cook`;
  const rows: NotificationRow[] = [];
  const done = new Set(meal.doneKeys ?? []);
  let stepKey: string | undefined;
  const add = (fire: Date, kind: string, title: string, body: string) => {
    if (fire.getTime() > now.getTime()) {
      rows.push({ owner: OWNER, meal_id: meal.id, fire_at: fire.toISOString(), title, body, url, kind, ...(stepKey ? { step_key: stepKey } : {}) });
    }
  };

  for (const s of sched.steps) {
    if (done.has(s.key)) continue; // already checked off
    stepKey = s.key;
    const label = `${s.dish.emoji} ${s.step.title}`;
    const detail = `${s.dish.name} · ${formatDuration(s.step.minutes)}${s.step.ovenTemp ? ` · ${s.step.ovenTemp}°F` : ""}`;
    if (s.flexible) {
      // Flexible: one heads-up when the window opens.
      add(
        s.start,
        "step_window",
        `${WINDOW_LABELS[s.flexible.window]}: ${label}`,
        `Anytime before ${formatTime(s.flexible.until, tz)}. ${detail}`,
      );
      continue;
    }
    add(
      new Date(s.start.getTime() - lead * 60_000),
      "step_start",
      lead > 0 ? `In ${lead} min: ${label}` : `Now: ${label}`,
      s.step.minutes > 0 ? `Starts at ${formatTime(s.start, tz)}. ${detail}` : `At ${formatTime(s.start, tz)}. ${s.dish.name}`,
    );
    if (s.step.kind === "passive" && s.step.minutes > 0) {
      add(s.end, "timer_end", `⏰ Done: ${label}`, `${s.dish.name}: ${s.step.title} timer is up.`);
    }
  }
  stepKey = undefined;
  for (const item of sched.items) {
    if (item.type === "hold") {
      add(item.at, "hold", `${item.dish.emoji} ${item.dish.name} is ready`, `Move it to: ${HOLD_LABELS[item.dish.holdMethod].toLowerCase()}.`);
    }
  }
  return rows;
}

/** Replace all future, unsent reminders for a meal with a freshly computed set. */
export async function syncMealReminders(meal: Meal): Promise<void> {
  const client = db();
  const del = await client.from("scheduled_notifications").delete().eq("meal_id", meal.id).is("sent_at", null);
  if (del.error) throw del.error;
  const rows = buildNotifications(meal);
  if (rows.length) {
    let ins = await client.from("scheduled_notifications").insert(rows);
    if (ins.error && /step_key/.test(ins.error.message)) {
      // Database not updated yet: save reminders without step links.
      ins = await client.from("scheduled_notifications").insert(rows.map((r) => { const copy = { ...r }; delete copy.step_key; return copy; }));
    }
    if (ins.error) throw ins.error;
  }
}
