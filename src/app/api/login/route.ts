import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { createSessionToken, SESSION_COOKIE, SESSION_DAYS } from "@/lib/session";

const PER_IP_LIMIT = 5;
const PER_IP_LOCK_MIN = 15;
const GLOBAL_LIMIT = 25;
const GLOBAL_LOCK_MIN = 60;

async function getAttempt(key: string) {
  const { data } = await db().from("login_attempts").select("*").eq("key", key).maybeSingle();
  return data as { key: string; failures: number; locked_until: string | null } | null;
}

async function recordFailure(key: string, limit: number, lockMin: number) {
  const cur = await getAttempt(key);
  const failures = (cur?.failures ?? 0) + 1;
  const locked_until = failures >= limit ? new Date(Date.now() + lockMin * 60_000).toISOString() : null;
  await db()
    .from("login_attempts")
    .upsert({ key, failures: failures >= limit ? 0 : failures, locked_until, updated_at: new Date().toISOString() });
}

function isLocked(a: { locked_until: string | null } | null) {
  return !!a?.locked_until && new Date(a.locked_until).getTime() > Date.now();
}

export async function POST(req: NextRequest) {
  const expected = process.env.APP_PASSCODE;
  if (!expected) return NextResponse.json({ error: "APP_PASSCODE is not set on the server." }, { status: 500 });

  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  const ipKey = `ip:${ip}`;
  const [ipAttempt, globalAttempt] = await Promise.all([getAttempt(ipKey), getAttempt("global")]);
  if (isLocked(ipAttempt) || isLocked(globalAttempt)) {
    return NextResponse.json({ error: "Too many wrong tries. Please wait a while and try again." }, { status: 429 });
  }

  const { passcode } = (await req.json().catch(() => ({}))) as { passcode?: string };
  const given = Buffer.from(String(passcode ?? ""));
  const want = Buffer.from(expected);
  const match = given.length === want.length && timingSafeEqual(given, want);

  if (!match) {
    await Promise.all([recordFailure(ipKey, PER_IP_LIMIT, PER_IP_LOCK_MIN), recordFailure("global", GLOBAL_LIMIT, GLOBAL_LOCK_MIN)]);
    return NextResponse.json({ error: "Wrong passcode." }, { status: 401 });
  }

  await db().from("login_attempts").delete().eq("key", ipKey);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
  return res;
}
