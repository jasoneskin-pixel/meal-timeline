"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import PrintToolbar from "@/components/PrintToolbar";
import { api } from "@/components/api";
import { computeSchedule, describePin, totalMinutes } from "@/lib/schedule";
import { formatDuration } from "@/lib/format";
import type { Dish, Meal } from "@/lib/types";

/** Printable step list for a library dish, with how long before serving each step starts. */
export default function PrintDishPage() {
  const { id } = useParams<{ id: string }>();
  const [dish, setDish] = useState<Dish | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api<Dish>(`/api/dishes/${id}`).then(setDish).catch((e) => setError(e.message));
  }, [id]);
  if (error) return <p className="text-red-700">{error}</p>;

  // Lay the dish out against a reference serving time to get each step's offset.
  const serve = new Date(Date.UTC(2030, 0, 15, 18));
  const placed = dish
    ? computeSchedule({
        id: "print", name: dish.name, serveAt: serve.toISOString(), deadlineMode: "all", timezone: "UTC",
        reminderLeadMin: 0, remindersOn: false, inLibrary: false,
        dishes: [{ id: "d", name: dish.name, emoji: dish.emoji, color: dish.color, steps: dish.steps, mode: "fresh", holdMethod: "fridge", readyAheadMin: 0, serveAt: null }],
      }).steps
    : [];
  const offsetOf = (stepId: string) => {
    const p = placed.find((s) => s.step.id === stepId);
    if (!p) return "";
    const pin = describePin(p.step);
    if (pin) return pin;
    const min = Math.round((serve.getTime() - p.start.getTime()) / 60_000);
    return min <= 0 ? "At serving" : `${formatDuration(min)} before serving`;
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PrintToolbar ready={!!dish} />
      {!dish ? (
        <p className="text-muted">Loading...</p>
      ) : (
        <article className="space-y-4 rounded-2xl bg-white p-6 shadow-sm print:rounded-none print:p-0 print:shadow-none">
          <header className="border-b-2 pb-3" style={{ borderColor: dish.color }}>
            <h1 className="text-3xl font-bold">{dish.emoji} {dish.name}</h1>
            <p className="mt-1">{dish.steps.length} steps · {formatDuration(totalMinutes(dish.steps))} total</p>
          </header>
          <table className="w-full border-collapse text-[15px]">
            <thead>
              <tr className="border-b border-ink text-left text-xs uppercase tracking-wide text-muted">
                <th className="w-7 py-1.5" />
                <th className="w-8 py-1.5">#</th>
                <th className="py-1.5">Step</th>
                <th className="w-24 py-1.5 text-right">Time</th>
                <th className="w-44 py-1.5 pl-3">When</th>
              </tr>
            </thead>
            <tbody>
              {dish.steps.map((s, i) => (
                <tr key={s.id} className="break-inside-avoid border-b border-line/70">
                  <td className="py-2 align-top"><span className="inline-block h-4 w-4 rounded border-2 border-ink" /></td>
                  <td className="py-2 align-top font-semibold">{i + 1}</td>
                  <td className="py-2 align-top">
                    <div className="font-semibold">{s.title || "Untitled step"}</div>
                    <div className="text-xs text-muted">
                      {[s.kind === "active" ? "hands-on" : "hands-off", s.ovenTemp ? `${s.ovenTemp}°F` : "", s.background && !s.pin ? "runs in background" : "", s.phase === "finish" ? "finishing step" : ""]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </td>
                  <td className="py-2 text-right align-top tabular-nums">{s.minutes > 0 ? formatDuration(s.minutes) : ""}</td>
                  <td className="py-2 pl-3 align-top text-sm">{offsetOf(s.id)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {dish.notes && (
            <section>
              <h2 className="mb-1 font-bold">Notes</h2>
              <p className="whitespace-pre-wrap text-sm">{dish.notes}</p>
            </section>
          )}
        </article>
      )}
    </div>
  );
}
