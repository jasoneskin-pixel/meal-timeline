import { connection, NextResponse } from "next/server";
import { db, mealFromRow, mealToRow, OWNER } from "@/lib/db";
import { syncMealReminders } from "@/lib/reminders";

export async function GET() {
  await connection();
  const { data, error } = await db().from("meals").select("*").eq("owner", OWNER).order("serve_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data.map(mealFromRow));
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body.serveAt) return NextResponse.json({ error: "Pick a date and time for the meal." }, { status: 400 });
  const { data, error } = await db().from("meals").insert(mealToRow(body)).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const meal = mealFromRow(data);
  await syncMealReminders(meal).catch((e) => console.error("reminder sync failed", e));
  return NextResponse.json(meal);
}
