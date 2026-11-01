import { NextResponse } from "next/server";
import { db, mealFromRow, OWNER } from "@/lib/db";
import { syncMealReminders } from "@/lib/reminders";

type Ctx = { params: Promise<{ id: string }> };

/** Check or uncheck a cook-mode step. Body: { keys: string[], done: boolean }. Returns the updated list. */
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const { keys, done } = (await req.json()) as { keys?: string[]; done?: boolean };
  if (!Array.isArray(keys) || !keys.length) return NextResponse.json({ error: "No steps given" }, { status: 400 });
  const client = db();

  const { data, error } = await client.from("meals").select("*").eq("id", id).eq("owner", OWNER).maybeSingle();
  if (error || !data) return NextResponse.json({ error: error?.message ?? "Not found" }, { status: 404 });
  if (!("done_keys" in data)) {
    return NextResponse.json({ error: "Database update needed: run supabase/migrations/004_synced_checkmarks.sql in Supabase." }, { status: 500 });
  }

  const set = new Set<string>(Array.isArray(data.done_keys) ? data.done_keys : []);
  for (const k of keys) {
    if (done) set.add(k);
    else set.delete(k);
  }
  const doneKeys = [...set];
  const upd = await client.from("meals").update({ done_keys: doneKeys }).eq("id", id).eq("owner", OWNER);
  if (upd.error) return NextResponse.json({ error: upd.error.message }, { status: 500 });

  const meal = { ...mealFromRow(data), doneKeys };
  if (done) {
    // Cancel reminders for the checked steps (no-op if the step_key column is missing).
    await client.from("scheduled_notifications").delete().eq("meal_id", id).is("sent_at", null).in("step_key", keys);
  } else if (!meal.finishedAt) {
    await syncMealReminders(meal).catch((e) => console.error("reminder sync failed", e));
  }
  return NextResponse.json({ doneKeys });
}
