import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Dish, Meal } from "./types";

/** The single owner for now. When multi-user sign-in arrives, this becomes the signed-in user's id. */
export const OWNER = "owner";

let client: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Supabase is not configured (missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).");
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function dishFromRow(r: any): Dish {
  return { id: r.id, name: r.name, emoji: r.emoji, color: r.color, steps: r.steps ?? [], notes: r.notes, updatedAt: r.updated_at };
}

export function dishToRow(d: Partial<Dish>) {
  return {
    name: d.name?.trim() || "Untitled dish",
    emoji: d.emoji || "🍽️",
    color: d.color || "#e4572e",
    steps: d.steps ?? [],
    notes: d.notes ?? null,
    owner: OWNER,
    updated_at: new Date().toISOString(),
  };
}

export function mealFromRow(r: any): Meal {
  return {
    id: r.id,
    name: r.name,
    serveAt: r.serve_at,
    deadlineMode: r.deadline_mode,
    timezone: r.timezone,
    reminderLeadMin: r.reminder_lead_min,
    remindersOn: r.reminders_on,
    inLibrary: r.in_library,
    isQuick: !!r.is_quick,
    startedAt: r.started_at ?? null,
    finishedAt: r.finished_at ?? null,
    notes: r.notes,
    dishes: r.dishes ?? [],
    updatedAt: r.updated_at,
  };
}

export function mealToRow(m: Partial<Meal>) {
  return {
    name: m.name?.trim() || "Untitled meal",
    serve_at: m.serveAt,
    deadline_mode: m.deadlineMode ?? "all",
    timezone: m.timezone || "America/New_York",
    reminder_lead_min: Math.max(0, Math.round(m.reminderLeadMin ?? 5)),
    reminders_on: m.remindersOn ?? true,
    in_library: m.inLibrary ?? false,
    notes: m.notes ?? null,
    dishes: m.dishes ?? [],
    owner: OWNER,
    updated_at: new Date().toISOString(),
    // Only sent when true, so regular meals keep working even before the quick-cook column exists.
    ...(m.isQuick ? { is_quick: true } : {}),
  };
}
