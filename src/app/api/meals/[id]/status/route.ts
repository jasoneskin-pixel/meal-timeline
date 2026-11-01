import { NextResponse } from "next/server";
import { db, OWNER } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

/** { action: "start" } marks a timeline as started; { action: "finish" } ends it (one-off cooks are deleted). */
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const { action } = (await req.json()) as { action?: "start" | "finish" };
  const now = new Date().toISOString();
  const client = db();

  if (action === "start") {
    const { error } = await client.from("meals").update({ started_at: now }).eq("id", id).eq("owner", OWNER).is("started_at", null);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "finish") {
    const { data } = await client.from("meals").select("is_quick").eq("id", id).eq("owner", OWNER).maybeSingle();
    if (data?.is_quick) {
      await client.from("meals").delete().eq("id", id).eq("owner", OWNER);
    } else {
      const { error } = await client.from("meals").update({ finished_at: now }).eq("id", id).eq("owner", OWNER);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      // Stop any reminders that have not gone out yet.
      await client.from("scheduled_notifications").delete().eq("meal_id", id).is("sent_at", null);
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
