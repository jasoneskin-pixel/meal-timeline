import { connection, NextResponse } from "next/server";

export async function GET() {
  await connection();
  return NextResponse.json({ publicKey: process.env.VAPID_PUBLIC_KEY ?? null });
}
