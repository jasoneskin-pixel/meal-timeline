import { NextResponse } from "next/server";
import { sendToAll } from "@/lib/push";

export async function POST() {
  try {
    const sent = await sendToAll({ title: "🔔 Test reminder", body: "Notifications are working. Happy cooking!", url: "/settings", tag: "test" });
    return NextResponse.json({ sent });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
