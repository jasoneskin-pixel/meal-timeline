"use client";
import { computeSchedule, type TimelineItem } from "@/lib/schedule";
import { formatTime } from "@/lib/format";
import { WINDOW_LABELS, type Meal } from "@/lib/types";

const dayLabel = (d: Date) => d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

/** A plain checklist grouped by day and time, like a notes-app timeline. */
export default function SimpleTimeline({
  meal, done, onToggleDone, printable, hideDone,
}: { meal: Meal; done?: Set<string>; onToggleDone?: (key: string) => void; printable?: boolean; hideDone?: boolean }) {
  const sched = computeSchedule(meal);
  const timeOf = (i: TimelineItem) => (i.type === "step" ? i.sortAt ?? i.start : i.at);
  const items = sched.items.filter((i) => i.type !== "hold" && !(hideDone && i.type === "step" && done?.has(i.key)));
  if (!items.length) return <p className="text-muted">Add dishes with steps to see the timeline.</p>;

  // day -> time label -> items
  const days: { day: string; groups: { label: string; items: TimelineItem[] }[] }[] = [];
  for (const item of items) {
    const day = dayLabel(timeOf(item));
    const label = item.type === "step" && item.flexible ? WINDOW_LABELS[item.flexible.window].replace(" that day", "") : formatTime(timeOf(item));
    if (days[days.length - 1]?.day !== day) days.push({ day, groups: [] });
    const groups = days[days.length - 1].groups;
    if (groups[groups.length - 1]?.label !== label) groups.push({ label, items: [] });
    groups[groups.length - 1].items.push(item);
  }

  return (
    <div className="space-y-7">
      {days.map((d) => (
        <section key={d.day} className="break-inside-avoid-page">
          <h3 className="mb-3 text-2xl font-bold underline decoration-2 underline-offset-4">{d.day}</h3>
          <div className="space-y-4">
            {d.groups.map((g, gi) => (
              <div key={`${g.label}-${gi}`} className="break-inside-avoid">
                <p className="mb-1.5 text-sm font-bold uppercase tracking-wide text-muted">{g.label}</p>
                <ul className="space-y-2">
                  {g.items.map((item) => {
                    if (item.type === "serve") {
                      return (
                        <li key={item.key} className="pl-9 font-bold" style={{ color: item.dish.color }}>
                          🍽️ Serve {item.dish.emoji} {item.dish.name}
                        </li>
                      );
                    }
                    if (item.type !== "step") return null;
                    const checked = !!done?.has(item.key);
                    const text = (
                      <span className={checked ? "text-muted line-through" : ""}>
                        <span className="mr-1">{item.dish.emoji}</span>
                        {!item.dish.isTasks && <span className="font-semibold">{item.dish.name} · </span>}
                        {item.step.title || "Untitled step"}
                      </span>
                    );
                    return (
                      <li key={item.key} className="flex items-start gap-3 text-[17px] leading-6">
                        {onToggleDone && !printable ? (
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={checked}
                            aria-label={checked ? `Mark "${item.step.title}" not done` : `Mark "${item.step.title}" done`}
                            onClick={() => onToggleDone(item.key)}
                            className="mt-0 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold text-white"
                            style={{ borderColor: item.dish.color, backgroundColor: checked ? item.dish.color : "white" }}
                          >
                            {checked ? "✓" : ""}
                          </button>
                        ) : (
                          <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-ink text-[10px]">
                            {checked ? "✓" : ""}
                          </span>
                        )}
                        {text}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
