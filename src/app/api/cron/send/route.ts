import { connection, NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { sendToAll } from "@/lib/push";

// Called every minute by Supabase (pg_cron + pg_net). Sends reminders that are due.

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return given.length === want.length && timingSafeEqual(given, want);
}

async function handle(req: NextRequest) {
  await connection();
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const now = new Date();
  const staleCutoff = new Date(now.getTime() - 15 * 60_000).toISOString();
  const { data: due, error } = await db()
    .from("scheduled_notifications")
    .select("*")
    .is("sent_at", null)
    .lte("fire_at", now.toISOString())
    .order("fire_at")
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let sent = 0;
  for (const n of due ?? []) {
    // Mark first so a slow run never double-sends.
    await db().from("scheduled_notifications").update({ sent_at: now.toISOString() }).eq("id", n.id).is("sent_at", null);
    if (n.fire_at < staleCutoff) continue; // too old to be useful
    await sendToAll({ title: n.title, body: n.body, url: n.url ?? "/", tag: n.id });
    sent++;
  }
  return NextResponse.json({ checked: due?.length ?? 0, sent });
}

export const GET = handle;
export const POST = handle;
