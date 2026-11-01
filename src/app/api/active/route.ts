import { connection, NextResponse } from "next/server";
import { db, mealFromRow, OWNER } from "@/lib/db";
import { isActive } from "@/lib/active";

export async function GET() {
  await connection();
  // Per-dish serve times can differ from the main one, so look back generously and filter precisely below.
  const since = new Date(Date.now() - 3 * 24 * 3600_000).toISOString();
  const { data, error } = await db().from("meals").select("*").eq("owner", OWNER).gte("serve_at", since).order("serve_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const now = Date.now();
  return NextResponse.json(data.map(mealFromRow).filter((m) => isActive(m, now)));
}
