"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "./api";
import DurationInput from "./DurationInput";
import EmojiColorPicker from "./EmojiColorPicker";
import StepsEditor, { blankStep } from "./StepsEditor";
import Timeline, { DishLegend } from "./Timeline";
import { newId } from "@/lib/ids";
import { pickUnusedColor } from "@/lib/palette";
import { formatDuration, fromLocalInputs, toLocalInputs } from "@/lib/format";
import { totalMinutes } from "@/lib/schedule";
import { HOLD_LABELS, type Dish, type HoldMethod, type Meal, type MealDish } from "@/lib/types";

type Draft = Omit<Meal, "id"> & { id?: string };

function blankMeal(): Draft {
  return {
    name: "",
    serveAt: "",
    deadlineMode: "all",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    reminderLeadMin: 5,
    remindersOn: true,
    inLibrary: false,
    notes: "",
    dishes: [],
  };
}

function DateTimeInputs({ iso, onChange }: { iso: string | null | undefined; onChange: (iso: string | null) => void }) {
  const init = toLocalInputs(iso);
  const [date, setDate] = useState(init.date);
  const [time, setTime] = useState(init.time);
  const update = (d: string, t: string) => {
    setDate(d);
    setTime(t);
    onChange(fromLocalInputs(d, t));
  };
  return (
    <div className="flex gap-2">
      <input type="date" className="field flex-1" value={date} onChange={(e) => update(e.target.value, time)} />
      <input type="time" className="field w-36" value={time} onChange={(e) => update(date, e.target.value)} />
    </div>
  );
}

function MealDishCard({
  dish, individual, mealServeAt, onChange, onRemove, onMove,
}: {
  dish: MealDish; individual: boolean; mealServeAt: string;
  onChange: (d: MealDish) => void; onRemove: () => void; onMove: (dir: -1 | 1) => void;
}) {
  const [open, setOpen] = useState(!dish.name);
  const [libMsg, setLibMsg] = useState("");
  const set = (patch: Partial<MealDish>) => onChange({ ...dish, ...patch });

  async function saveToLibrary() {
    setLibMsg("Saving...");
    const body = { name: dish.name, emoji: dish.emoji, color: dish.color, steps: dish.steps };
    try {
      if (dish.sourceDishId) {
        await api(`/api/dishes/${dish.sourceDishId}`, { method: "PUT", json: body });
        setLibMsg("Library version updated ✓");
      } else {
        const saved = await api<Dish>("/api/dishes", { method: "POST", json: body });
        set({ sourceDishId: saved.id });
        setLibMsg("Saved to library ✓");
      }
    } catch (e) {
      setLibMsg((e as Error).message);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white" style={{ borderLeft: `6px solid ${dish.color}` }}>
      <button type="button" className="flex w-full items-center gap-3 p-3 text-left" onClick={() => setOpen(!open)}>
        <span className="text-2xl">{dish.emoji}</span>
        <div className="flex-1">
          <p className="font-semibold">{dish.name || "New dish"}</p>
          <p className="text-sm text-muted">
            {dish.steps.length} steps · {formatDuration(totalMinutes(dish.steps))} ·{" "}
            {dish.mode === "fresh" ? "Serve fresh" : `Make ahead (${HOLD_LABELS[dish.holdMethod].toLowerCase()})`}
          </p>
        </div>
        <span className="text-muted">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="space-y-4 border-t border-line p-3">
          <input className="field" placeholder="Dish name" value={dish.name} onChange={(e) => set({ name: e.target.value })} />
          <EmojiColorPicker emoji={dish.emoji} color={dish.color} onEmoji={(emoji) => set({ emoji })} onColor={(color) => set({ color })} />

          <div className="space-y-3 rounded-xl bg-bg p-3">
            <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-line text-sm font-semibold">
              {(["fresh", "make_ahead"] as const).map((m) => (
                <button key={m} type="button" onClick={() => set({ mode: m })} className={`py-2.5 ${dish.mode === m ? "bg-ink text-white" : "bg-white text-muted"}`}>
                  {m === "fresh" ? "🍳 Serve fresh" : "📦 Make ahead"}
                </button>
              ))}
            </div>
            {dish.mode === "fresh" ? (
              <p className="text-sm text-muted">The last step finishes right at serving time.</p>
            ) : (
              <>
                <div>
                  <label className="label">Keep it in the meantime</label>
                  <select className="field" value={dish.holdMethod} onChange={(e) => set({ holdMethod: e.target.value as HoldMethod })}>
                    {Object.entries(HOLD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Have it done this long before serving</label>
                  <DurationInput minutes={dish.readyAheadMin} onChange={(readyAheadMin) => set({ readyAheadMin })} />
                </div>
                <p className="text-sm text-muted">Steps marked &quot;Finishing step&quot; (like reheating) are scheduled right before serving instead.</p>
              </>
            )}
            {individual && (
              <div>
                <label className="label">Serve this dish at</label>
                <DateTimeInputs iso={dish.serveAt ?? mealServeAt} onChange={(serveAt) => set({ serveAt })} />
              </div>
            )}
          </div>

          <StepsEditor steps={dish.steps} color={dish.color} onChange={(steps) => set({ steps })} />

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn-ghost text-sm" onClick={saveToLibrary} disabled={!dish.name}>
              📚 {dish.sourceDishId ? "Update library version" : "Save to library"}
            </button>
            <button type="button" className="btn-ghost px-3 text-sm" onClick={() => onMove(-1)} aria-label="Move dish up">▲</button>
            <button type="button" className="btn-ghost px-3 text-sm" onClick={() => onMove(1)} aria-label="Move dish down">▼</button>
            <button type="button" className="btn-danger ml-auto text-sm" onClick={onRemove}>Remove</button>
          </div>
          {libMsg && <p className="text-sm text-muted">{libMsg}</p>}
        </div>
      )}
    </div>
  );
}

function LibraryPicker({ onPick, onClose }: { onPick: (d: Dish) => void; onClose: () => void }) {
  const [dishes, setDishes] = useState<Dish[] | null>(null);
  const [q, setQ] = useState("");
  useEffect(() => {
    api<Dish[]>("/api/dishes").then(setDishes).catch(() => setDishes([]));
  }, []);
  const shown = (dishes ?? []).filter((d) => d.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-bg p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Add from library</h2>
          <button className="text-muted" onClick={onClose}>Close</button>
        </div>
        <input className="field mb-3" placeholder="Search dishes" value={q} onChange={(e) => setQ(e.target.value)} />
        {dishes === null && <p className="text-muted">Loading...</p>}
        {dishes?.length === 0 && <p className="text-muted">Your library is empty. Add a new dish instead and save it to the library.</p>}
        <div className="space-y-2">
          {shown.map((d) => (
            <button key={d.id} className="flex w-full items-center gap-3 rounded-xl border border-line bg-white p-3 text-left" style={{ borderLeft: `6px solid ${d.color}` }} onClick={() => onPick(d)}>
              <span className="text-2xl">{d.emoji}</span>
              <span className="flex-1">
                <span className="block font-semibold">{d.name}</span>
                <span className="text-sm text-muted">{d.steps.length} steps · {formatDuration(totalMinutes(d.steps))}</span>
              </span>
              <span className="font-bold text-accent">+</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MealEditor({ initial }: { initial?: Meal }) {
  const router = useRouter();
  const [meal, setMeal] = useState<Draft>(initial ?? blankMeal());
  const [picker, setPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (patch: Partial<Draft>) => setMeal((m) => ({ ...m, ...patch }));
  const usedColors = meal.dishes.map((d) => d.color);
  const tasks = meal.dishes.find((d) => d.isTasks);

  function setTasks(steps: MealDish["steps"]) {
    if (tasks) {
      set({ dishes: steps.length ? meal.dishes.map((d) => (d.isTasks ? { ...d, steps } : d)) : meal.dishes.filter((d) => !d.isTasks) });
    } else if (steps.length) {
      const t: MealDish = {
        id: newId(), name: "Other tasks", emoji: "📌", color: "#78716c", steps,
        mode: "fresh", holdMethod: "fridge", readyAheadMin: 0, serveAt: null, isTasks: true,
      };
      set({ dishes: [...meal.dishes, t] });
    }
  }

  function addDish(base?: Dish) {
    const color = base && !usedColors.includes(base.color) ? base.color : pickUnusedColor(usedColors);
    const d: MealDish = {
      id: newId(),
      sourceDishId: base?.id ?? null,
      name: base?.name ?? "",
      emoji: base?.emoji ?? "🍲",
      color,
      steps: base ? base.steps.map((s) => ({ ...s, id: newId() })) : [blankStep()],
      mode: "fresh",
      holdMethod: "fridge",
      readyAheadMin: 120,
      serveAt: null,
    };
    set({ dishes: [...meal.dishes, d] });
  }

  function moveDish(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= meal.dishes.length) return;
    const next = [...meal.dishes];
    [next[i], next[j]] = [next[j], next[i]];
    set({ dishes: next });
  }

  async function save() {
    if (!meal.serveAt) {
      setError("Pick a date and time for when the meal is served.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const saved = meal.id
        ? await api<Meal>(`/api/meals/${meal.id}`, { method: "PUT", json: meal })
        : await api<Meal>("/api/meals", { method: "POST", json: meal });
      router.push(`/meals/${saved.id}`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  const hasPreview = !!meal.serveAt && meal.dishes.length > 0;
  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-8">
    <div className="space-y-5">
      <div className="card space-y-4">
        <div>
          <label className="label">Meal name</label>
          <input className="field" placeholder="e.g. Thanksgiving dinner" value={meal.name} onChange={(e) => set({ name: e.target.value })} />
        </div>
        <div>
          <label className="label">Date and time the meal is served</label>
          <DateTimeInputs iso={meal.serveAt} onChange={(iso) => set({ serveAt: iso ?? "" })} />
        </div>
        <div>
          <label className="label">Deadlines</label>
          <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-line text-sm font-semibold">
            <button type="button" onClick={() => set({ deadlineMode: "all" })} className={`py-2.5 ${meal.deadlineMode === "all" ? "bg-ink text-white" : "bg-white text-muted"}`}>
              Everything at once
            </button>
            <button type="button" onClick={() => set({ deadlineMode: "individual" })} className={`py-2.5 ${meal.deadlineMode === "individual" ? "bg-ink text-white" : "bg-white text-muted"}`}>
              Time per dish
            </button>
          </div>
          <p className="mt-1.5 text-sm text-muted">
            {meal.deadlineMode === "all"
              ? "Every dish is ready at the meal time (make-ahead dishes still finish early)."
              : "Open each dish below to set its own serving time, e.g. appetizers before the main course."}
          </p>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Dishes</h2>
        {meal.dishes.length > 0 && <DishLegend meal={meal as Meal} />}
        {meal.dishes.map((d, i) => d.isTasks ? null : (
          <MealDishCard
            key={d.id}
            dish={d}
            individual={meal.deadlineMode === "individual"}
            mealServeAt={meal.serveAt}
            onChange={(nd) => set({ dishes: meal.dishes.map((x) => (x.id === nd.id ? nd : x)) })}
            onRemove={() => set({ dishes: meal.dishes.filter((x) => x.id !== d.id) })}
            onMove={(dir) => moveDish(i, dir)}
          />
        ))}
        <div className="grid grid-cols-2 gap-3">
          <button type="button" className="btn-ghost" onClick={() => setPicker(true)}>📚 From library</button>
          <button type="button" className="btn-ghost" onClick={() => addDish()}>+ New dish</button>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-bold">📌 Other tasks</h2>
          <p className="text-sm text-muted">Things that aren&apos;t part of a dish, like errands or leaving the house. Each one is pinned to a time you choose.</p>
        </div>
        {tasks ? (
          <div className="rounded-2xl border border-line bg-white p-3" style={{ borderLeft: `6px solid ${tasks.color}` }}>
            <StepsEditor steps={tasks.steps} color={tasks.color} onChange={setTasks} tasksOnly />
          </div>
        ) : (
          <button type="button" className="btn-ghost w-full" onClick={() => setTasks([blankStep(true)])}>+ Add a task</button>
        )}
      </section>

      <div className="card space-y-3">
        <label className="flex items-center justify-between gap-3">
          <span>
            <span className="block font-semibold">🔔 Reminders</span>
            <span className="text-sm text-muted">Phone notifications for each step, plus timers for hands-off steps</span>
          </span>
          <input type="checkbox" className="h-6 w-6 accent-[var(--accent)]" checked={meal.remindersOn} onChange={(e) => set({ remindersOn: e.target.checked })} />
        </label>
        {meal.remindersOn && (
          <label className="flex items-center gap-2 text-sm">
            Remind me
            <input type="number" inputMode="numeric" min={0} className="field w-20 text-center" value={meal.reminderLeadMin} onChange={(e) => set({ reminderLeadMin: Math.max(0, parseInt(e.target.value) || 0) })} />
            minutes before each step
          </label>
        )}
        <label className="flex items-center justify-between gap-3 border-t border-line pt-3">
          <span>
            <span className="block font-semibold">⭐ Save this meal to the library</span>
            <span className="text-sm text-muted">Reuse it later on a new date</span>
          </span>
          <input type="checkbox" className="h-6 w-6 accent-[var(--accent)]" checked={meal.inLibrary} onChange={(e) => set({ inLibrary: e.target.checked })} />
        </label>
      </div>

      {hasPreview && (
        <section className="space-y-3 lg:hidden">
          <h2 className="text-lg font-bold">Preview</h2>
          <Timeline meal={meal as Meal} />
        </section>
      )}

      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="sticky bottom-20 z-20 lg:bottom-4">
        <button className="btn-primary w-full py-3.5 text-lg shadow-lg" disabled={saving} onClick={save}>
          {saving ? "Saving..." : "Save meal"}
        </button>
      </div>
    </div>

      {/* iPad landscape and desktop: the timeline stays visible beside the editor and updates live. */}
      <aside className="hidden lg:sticky lg:top-6 lg:block lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:pr-1">
        <div className="space-y-3">
          <h2 className="text-lg font-bold">Live timeline</h2>
          {hasPreview ? (
            <>
              <DishLegend meal={meal as Meal} />
              <Timeline meal={meal as Meal} />
            </>
          ) : (
            <div className="card text-sm text-muted">Set a serving date and time and add a dish. The timeline appears here and updates as you edit.</div>
          )}
        </div>
      </aside>

      {picker && <LibraryPicker onClose={() => setPicker(false)} onPick={(d) => { addDish(d); setPicker(false); }} />}
    </div>
  );
}
