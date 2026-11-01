import "server-only";
import webpush from "web-push";
import { db, OWNER } from "./db";

let configured = false;
function configure() {
  if (configured) return;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) throw new Error("VAPID keys are not configured.");
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:owner@example.com", pub, priv);
  configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/** Sends to every saved device. Returns how many devices received it. */
export async function sendToAll(payload: PushPayload): Promise<number> {
  configure();
  const { data: subs, error } = await db().from("push_subscriptions").select("endpoint, subscription").eq("owner", OWNER);
  if (error) throw error;
  let sent = 0;
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(s.subscription, JSON.stringify(payload), { TTL: 600, urgency: "high" });
        sent++;
      } catch (e: unknown) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          await db().from("push_subscriptions").delete().eq("endpoint", s.endpoint);
        } else {
          console.error("push failed", code, e);
        }
      }
    }),
  );
  return sent;
}
