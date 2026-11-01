"use client";
import NotificationSetup from "@/components/NotificationSetup";

export default function SettingsPage() {
  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.assign("/login");
  }
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Settings</h1>
      <section className="space-y-2">
        <h2 className="font-bold">Reminders on this device</h2>
        <NotificationSetup />
        <p className="text-sm text-muted">
          Reminders are sent from the server, so they arrive even when the app is closed or your phone is locked.
          Turn them on separately on each device you want alerts on.
        </p>
      </section>
      <section className="card space-y-2 text-sm">
        <h2 className="font-bold">How timing works</h2>
        <p><b>Serve fresh:</b> steps are scheduled backwards so the last one finishes right at serving time.</p>
        <p><b>Make ahead:</b> prep steps finish early (you choose how early) and the dish is held in the fridge, at room temp, in a warm oven, or frozen. Steps marked &quot;Finishing step&quot; are scheduled right before serving.</p>
        <p><b>✋ Hands-on vs ⏳ hands-off:</b> the timeline warns you if two hands-on steps overlap, or if two dishes need the oven at different temperatures at once. Hands-off steps get a timer alert when they finish.</p>
      </section>
      <button className="btn-ghost w-full" onClick={logout}>Lock app (sign out)</button>
    </div>
  );
}
