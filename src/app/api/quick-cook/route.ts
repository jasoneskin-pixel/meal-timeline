import { NextResponse } from "next/server";
import { db, mealFromRow, mealToRow } from "@/lib/db";
import { syncMealReminders } from "@/lib/reminders";
import { newId } from "@/lib/ids";
import type { Dish, Meal } from "@/lib/types";

/** Start a one-off timeline for a single dish, ready by the given time. */
export async function POST(req: Request) {
  const { dish, serveAt, timezone } = (await req.json()) as { dish?: Dish; serveAt?: string; timezone?: string };
  if (!dish || !dish.steps?.length) return NextResponse.json({ error: "This dish has no steps yet." }, { status: 400 });
  if (!serveAt) return NextResponse.json({ error: "Pick when it should be ready." }, { status: 400 });

  const meal: Meal = {
    id: "",
    name: dish.name || "Quick cook",
    serveAt,
    deadlineMode: "all",
    timezone: timezone || "America/New_York",
    reminderLeadMin: 5,
    remindersOn: true,
    inLibrary: false,
    isQuick: true,
    dishes: [
      {
        id: newId(),
        sourceDishId: dish.id ?? null,
        name: dish.name,
        emoji: dish.emoji,
        color: dish.color,
        steps: dish.steps,
        mode: "fresh",
        holdMethod: "fridge",
        readyAheadMin: 0,
        serveAt: null,
      },
    ],
  };

  const { data, error } = await db().from("meals").insert(mealToRow(meal)).select().single();
  if (error) {
    const missing = /is_quick/.test(error.message);
    return NextResponse.json(
      { error: missing ? "Database update needed: run supabase/migrations/002_quick_cooks.sql in Supabase." : error.message },
      { status: 500 },
    );
  }
  const saved = mealFromRow(data);
  await syncMealReminders(saved).catch((e) => console.error("reminder sync failed", e));
  return NextResponse.json(saved);
}
