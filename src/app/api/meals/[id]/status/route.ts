import { NextResponse } from "next/server";
import { db, mealFromRow, OWNER } from "@/lib/db";
import { syncMealReminders } from "@/lib/reminders";

type Ctx = { params: Promise<{ id: string }> };

/** "start" marks a timeline started, "finish" ends it (cancelling reminders), "resume" undoes a finish. */
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const { action } = (await req.json()) as { action?: "start" | "finish" | "resume" };
  const now = new Date().toISOString();
  const client = db();

  if (action === "start") {
    const { error } = await client.from("meals").update({ started_at: now }).eq("id", id).eq("owner", OWNER).is("started_at", null);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "finish") {
    // One-off cooks stay hidden and are cleaned up a day after serving, so a finish can still be undone.
    const { error } = await client.from("meals").update({ finished_at: now }).eq("id", id).eq("owner", OWNER);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    // Stop any reminders that have not gone out yet.
    await client.from("scheduled_notifications").delete().eq("meal_id", id).is("sent_at", null);
    return NextResponse.json({ ok: true });
  }

  if (action === "resume") {
    const { data, error } = await client.from("meals").update({ finished_at: null }).eq("id", id).eq("owner", OWNER).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await syncMealReminders(mealFromRow(data)).catch((e) => console.error("reminder sync failed", e));
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
