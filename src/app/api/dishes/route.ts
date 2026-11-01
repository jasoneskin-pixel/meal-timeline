import { connection, NextResponse } from "next/server";
import { db, dishFromRow, dishToRow, OWNER } from "@/lib/db";

export async function GET() {
  await connection();
  const { data, error } = await db().from("dishes").select("*").eq("owner", OWNER).order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data.map(dishFromRow));
}

export async function POST(req: Request) {
  const body = await req.json();
  const { data, error } = await db().from("dishes").insert(dishToRow(body)).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(dishFromRow(data));
}
