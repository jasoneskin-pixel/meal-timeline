"use client";
import { useEffect, useState } from "react";
import { api } from "./api";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type State = "loading" | "needs_install" | "unsupported" | "off" | "denied" | "on";

export default function NotificationSetup({ compact }: { compact?: boolean }) {
  const [state, setState] = useState<State>("loading");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setState(isIOS && !standalone ? "needs_install" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        // Re-save in case the server lost it.
        api("/api/push/subscribe", { method: "POST", json: sub.toJSON() }).catch(() => {});
        setState("on");
      } else setState("off");
    })().catch(() => setState("unsupported"));
  }, []);

  async function enable() {
    setMsg("");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return setState(perm === "denied" ? "denied" : "off");
      const { publicKey } = await api<{ publicKey: string | null }>("/api/push/key");
      if (!publicKey) throw new Error("Push keys are not configured on the server yet.");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
      await api("/api/push/subscribe", { method: "POST", json: sub.toJSON() });
      setState("on");
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  async function test() {
    setMsg("Sending...");
    try {
      const r = await api<{ sent: number }>("/api/push/test", { method: "POST" });
      setMsg(r.sent ? "Sent! Lock your phone to see it arrive." : "No devices found. Try turning notifications off and on.");
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  async function disable() {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await api("/api/push/subscribe", { method: "DELETE", json: { endpoint: sub.endpoint } }).catch(() => {});
      await sub.unsubscribe();
    }
    setState("off");
  }

  if (state === "loading") return null;
  if (compact && state === "on") return null;

  return (
    <div className="rounded-2xl border border-line bg-white p-4 text-sm">
      {state === "needs_install" && (
        <div className="space-y-2">
          <p className="font-semibold">📲 Install the app to get reminders</p>
          <ol className="list-decimal space-y-1 pl-5 text-muted">
            <li>Open this page in <b>Safari</b>.</li>
            <li>Tap the <b>Share</b> button (square with an arrow).</li>
            <li>Tap <b>Add to Home Screen</b>, then <b>Add</b>.</li>
            <li>Open Meal Timeline from your home screen and come back here.</li>
          </ol>
          <p className="text-muted">iPhones only allow website notifications from home screen apps (iOS 16.4 or newer).</p>
        </div>
      )}
      {state === "unsupported" && <p>This browser does not support push notifications.</p>}
      {state === "denied" && (
        <p>Notifications are blocked. On iPhone: Settings → Notifications → Meal Timeline → Allow Notifications.</p>
      )}
      {state === "off" && (
        <div className="flex items-center justify-between gap-3">
          <p><span className="font-semibold">🔔 Reminders are off on this device.</span> Turn them on to get alerts even when the app is closed.</p>
          <button className="btn-primary shrink-0" onClick={enable}>Turn on</button>
        </div>
      )}
      {state === "on" && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-semibold">🔔 Reminders are on for this device ✓</p>
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={test}>Send test</button>
            <button className="btn-ghost" onClick={disable}>Turn off</button>
          </div>
        </div>
      )}
      {msg && <p className="mt-2 text-muted">{msg}</p>}
    </div>
  );
}
