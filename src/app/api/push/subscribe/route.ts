import { NextResponse } from "next/server";
import { db, OWNER } from "@/lib/db";

export async function POST(req: Request) {
  const sub = await req.json();
  if (!sub?.endpoint) return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  const { error } = await db().from("push_subscriptions").upsert({ endpoint: sub.endpoint, owner: OWNER, subscription: sub });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { endpoint } = await req.json();
  await db().from("push_subscriptions").delete().eq("endpoint", endpoint);
  return NextResponse.json({ ok: true });
}
