import { NextResponse } from "next/server";
import { db, mealFromRow, mealToRow, OWNER } from "@/lib/db";
import { syncMealReminders } from "@/lib/reminders";
import { newId } from "@/lib/ids";
import type { Meal } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

/** Plan a saved meal again on a new date. Individual dish times keep their offset from the main serve time. */
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const { serveAt, name } = (await req.json()) as { serveAt?: string; name?: string };
  if (!serveAt) return NextResponse.json({ error: "Pick a date and time." }, { status: 400 });
  const { data, error } = await db().from("meals").select("*").eq("id", id).eq("owner", OWNER).maybeSingle();
  if (error || !data) return NextResponse.json({ error: error?.message ?? "Not found" }, { status: 404 });
  const src = mealFromRow(data);
  const shift = new Date(serveAt).getTime() - new Date(src.serveAt).getTime();
  const copy: Meal = {
    ...src,
    name: name || src.name,
    serveAt,
    inLibrary: false,
    dishes: src.dishes.map((d) => ({
      ...d,
      id: newId(),
      serveAt: d.serveAt ? new Date(new Date(d.serveAt).getTime() + shift).toISOString() : null,
    })),
  };
  const ins = await db().from("meals").insert(mealToRow(copy)).select().single();
  if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });
  const meal = mealFromRow(ins.data);
  await syncMealReminders(meal).catch((e) => console.error("reminder sync failed", e));
  return NextResponse.json(meal);
}
