// Shared by proxy.ts and route handlers. Uses Node's crypto (the proxy runs on the Node.js runtime).
import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "mt_session";
export const SESSION_DAYS = 180;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("SESSION_SECRET is missing or too short.");
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionToken(): string {
  const exp = Date.now() + SESSION_DAYS * 86_400_000;
  const payload = `owner.${exp}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const payload = `${parts[0]}.${parts[1]}`;
  const exp = Number(parts[1]);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  try {
    const expected = Buffer.from(sign(payload));
    const given = Buffer.from(parts[2]);
    return expected.length === given.length && timingSafeEqual(expected, given);
  } catch {
    return false;
  }
}
