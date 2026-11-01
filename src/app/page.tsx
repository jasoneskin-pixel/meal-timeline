import { connection } from "next/server";
import { redirect } from "next/navigation";
import { db, mealFromRow, OWNER } from "@/lib/db";
import { isActive } from "@/lib/active";

/** App entry: open Active if anything is cooking, otherwise the Library. */
export default async function Home() {
  await connection();
  let hasActive = false;
  try {
    const since = new Date(Date.now() - 3 * 24 * 3600_000).toISOString();
    const { data } = await db().from("meals").select("*").eq("owner", OWNER).gte("serve_at", since);
    const now = Date.now();
    hasActive = (data ?? []).some((r) => isActive(mealFromRow(r), now));
  } catch {
    // If the database is unreachable, fall back to the Library.
  }
  redirect(hasActive ? "/active" : "/library");
}
