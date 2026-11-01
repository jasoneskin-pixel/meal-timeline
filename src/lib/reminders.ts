import "server-only";
import { db, OWNER } from "./db";
import { computeSchedule } from "./schedule";
import { formatDuration, formatTime } from "./format";
import { HOLD_LABELS, type Meal } from "./types";

interface NotificationRow {
  owner: string;
  meal_id: string;
  fire_at: string;
  title: string;
  body: string;
  url: string;
  kind: string;
}

export function buildNotifications(meal: Meal, now = new Date()): NotificationRow[] {
  if (!meal.remindersOn) return [];
  const sched = computeSchedule(meal);
  const lead = meal.reminderLeadMin;
  const tz = meal.timezone;
  const url = `/meals/${meal.id}/cook`;
  const rows: NotificationRow[] = [];
  const add = (fire: Date, kind: string, title: string, body: string) => {
    if (fire.getTime() > now.getTime()) {
      rows.push({ owner: OWNER, meal_id: meal.id, fire_at: fire.toISOString(), title, body, url, kind });
    }
  };

  for (const s of sched.steps) {
    const label = `${s.dish.emoji} ${s.step.title}`;
    const detail = `${s.dish.name} · ${formatDuration(s.step.minutes)}${s.step.ovenTemp ? ` · ${s.step.ovenTemp}°F` : ""}`;
    add(
      new Date(s.start.getTime() - lead * 60_000),
      "step_start",
      lead > 0 ? `In ${lead} min: ${label}` : `Start now: ${label}`,
      `Starts at ${formatTime(s.start, tz)}. ${detail}`,
    );
    if (s.step.kind === "passive" && s.step.minutes > 0) {
      add(s.end, "timer_end", `⏰ Done: ${label}`, `${s.dish.name}: ${s.step.title} timer is up.`);
    }
  }
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
    const ins = await client.from("scheduled_notifications").insert(rows);
    if (ins.error) throw ins.error;
  }
}
