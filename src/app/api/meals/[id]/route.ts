import { NextResponse } from "next/server";
import { db, mealFromRow, mealToRow, OWNER } from "@/lib/db";
import { syncMealReminders } from "@/lib/reminders";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const { data, error } = await db().from("meals").select("*").eq("id", id).eq("owner", OWNER).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(mealFromRow(data));
}

export async function PUT(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json();
  if (!body.serveAt) return NextResponse.json({ error: "Pick a date and time for the meal." }, { status: 400 });
  const { data, error } = await db().from("meals").update(mealToRow(body)).eq("id", id).eq("owner", OWNER).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const meal = mealFromRow(data);
  await syncMealReminders(meal).catch((e) => console.error("reminder sync failed", e));
  return NextResponse.json(meal);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const { error } = await db().from("meals").delete().eq("id", id).eq("owner", OWNER);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
