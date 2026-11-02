"use client";
import PrintToolbar from "@/components/PrintToolbar";
import { useMeal } from "@/components/useMeal";
import { computeSchedule, type TimelineItem } from "@/lib/schedule";
import { formatDateTime, formatDuration, formatTime } from "@/lib/format";
import { HOLD_LABELS, WINDOW_LABELS } from "@/lib/types";

const dayLabel = (d: Date) => d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
const timeOf = (i: TimelineItem) => (i.type === "step" ? i.sortAt ?? i.start : i.at);

/** Kitchen-friendly printout of a meal's (or one-off cook's) timeline. */
export default function PrintMealPage() {
  const { meal, error } = useMeal();
  if (error) return <p className="text-red-700">{error}</p>;
  const sched = meal ? computeSchedule(meal) : null;
  const done = new Set(meal?.doneKeys ?? []);

  // Group items by calendar day.
  const days: { label: string; items: TimelineItem[] }[] = [];
  for (const item of sched?.items ?? []) {
    const label = dayLabel(timeOf(item));
    if (days[days.length - 1]?.label !== label) days.push({ label, items: [] });
    days[days.length - 1].items.push(item);
  }

  return (
    <div className="print-sheet mx-auto max-w-3xl">
      <PrintToolbar ready={!!meal} />
      {!meal || !sched ? (
        <p className="text-muted">Loading...</p>
      ) : (
        <article className="space-y-5 rounded-2xl bg-white p-6 shadow-sm print:rounded-none print:p-0 print:shadow-none">
          <header className="border-b-2 border-ink pb-3">
            <h1 className="text-3xl font-bold">{meal.name}</h1>
            <p className="mt-1 text-base">
              <b>Serve:</b> {formatDateTime(meal.serveAt)}
              {sched.firstStart && <> · <b>Start:</b> {formatDateTime(sched.firstStart)}</>}
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {meal.dishes.map((d) => (
                <span key={d.id} className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: d.color }} />
                  {d.emoji} {d.name}
                </span>
              ))}
            </div>
          </header>

          {sched.conflicts.length > 0 && (
            <div className="rounded-lg border border-red-300 p-3 text-sm">
              <b>Heads up:</b>
              <ul className="ml-5 list-disc">{sched.conflicts.map((c, i) => <li key={i}>{c.message}</li>)}</ul>
            </div>
          )}

          {days.map((day) => (
            <section key={day.label} className="break-inside-auto">
              <h2 className="mb-2 border-b border-line pb-1 text-lg font-bold uppercase tracking-wide">{day.label}</h2>
              <table className="w-full border-collapse text-[15px]">
                <tbody>
                  {day.items.map((item) => {
                    const color = item.dish.color;
                    if (item.type !== "step") {
                      return (
                        <tr key={item.key} className="break-inside-avoid">
                          <td className="w-7" />
                          <td className="w-24 py-1.5 pr-3 align-top font-semibold tabular-nums">{formatTime(item.at)}</td>
                          <td colSpan={2} className="py-1.5 font-semibold" style={{ color }}>
                            {item.type === "serve"
                              ? `🍽️ SERVE ${item.dish.emoji} ${item.dish.name}`
                              : `${item.dish.emoji} ${item.dish.name} done. Hold: ${HOLD_LABELS[item.dish.holdMethod].toLowerCase()}`}
                          </td>
                        </tr>
                      );
                    }
                    const s = item.step;
                    const tags = [
                      s.kind === "active" ? "hands-on" : "hands-off",
                      s.ovenTemp ? `${s.ovenTemp}°F` : "",
                      s.background && !s.pin ? "background" : "",
                      item.flexible ? `anytime before ${formatTime(item.flexible.until)}` : "",
                    ].filter(Boolean);
                    return (
                      <tr key={item.key} className="break-inside-avoid border-b border-line/70">
                        <td className="w-7 py-2 align-top">
                          <span className="inline-block h-4 w-4 rounded border-2 border-ink text-center text-[10px] leading-3">
                            {done.has(item.key) ? "✓" : ""}
                          </span>
                        </td>
                        <td className="w-24 py-2 pr-3 align-top font-semibold tabular-nums">
                          {item.flexible ? WINDOW_LABELS[item.flexible.window].replace(" that day", "") : formatTime(item.start)}
                        </td>
                        <td className="py-2 align-top">
                          <div className="flex gap-2">
                            <span className="mt-0.5 w-1.5 shrink-0 self-stretch rounded-full" style={{ backgroundColor: color }} />
                            <div>
                              <div className="font-semibold">{item.dish.emoji} {s.title || "Untitled step"}</div>
                              <div className="text-xs text-muted">{item.dish.name} · {tags.join(" · ")}</div>
                            </div>
                          </div>
                        </td>
                        <td className="w-28 py-2 text-right align-top text-sm tabular-nums">
                          {s.minutes > 0 ? formatDuration(s.minutes) : ""}
                          {s.minutes > 0 && !item.flexible && <div className="text-xs text-muted">until {formatTime(item.end)}</div>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          ))}
          <footer className="pt-2 text-center text-xs text-muted">Printed {formatDateTime(new Date())} · Meal Timeline</footer>
        </article>
      )}
    </div>
  );
}
