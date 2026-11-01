"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import EmojiColorPicker from "./EmojiColorPicker";
import StepsEditor, { blankStep } from "./StepsEditor";
import CookDishSheet from "./CookDishSheet";
import { api } from "./api";
import type { Dish } from "@/lib/types";
import { DISH_COLORS } from "@/lib/palette";

export function blankDish(): Omit<Dish, "id"> {
  return { name: "", emoji: "🍲", color: DISH_COLORS[0], steps: [blankStep()], notes: "" };
}

export default function DishForm({ initial }: { initial?: Dish }) {
  const router = useRouter();
  const [dish, setDish] = useState<Omit<Dish, "id"> & { id?: string }>(initial ?? blankDish());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [cooking, setCooking] = useState(false);
  const canCook = dish.steps.length > 0;

  async function save(thenCook = false) {
    setSaving(true);
    setError("");
    try {
      const saved = dish.id
        ? await api<Dish>(`/api/dishes/${dish.id}`, { method: "PUT", json: dish })
        : await api<Dish>("/api/dishes", { method: "POST", json: dish });
      if (thenCook) {
        setDish(saved);
        setSaving(false);
        setCooking(true);
        return;
      }
      router.push("/library");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  async function remove() {
    if (!dish.id || !confirm(`Delete "${dish.name}" from your library? Meals that already use it keep their copy.`)) return;
    await api(`/api/dishes/${dish.id}`, { method: "DELETE" });
    router.push("/library");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {dish.id && (
        <button className="btn-primary w-full py-3" disabled={!canCook} onClick={() => setCooking(true)}>
          👩‍🍳 Cook this dish
        </button>
      )}
      <div className="card space-y-4">
        <div>
          <label className="label">Dish name</label>
          <input className="field" placeholder="e.g. Garlic mashed potatoes" value={dish.name} onChange={(e) => setDish({ ...dish, name: e.target.value })} />
        </div>
        <div>
          <label className="label">Emoji and color (shown on every step of this dish)</label>
          <EmojiColorPicker emoji={dish.emoji} color={dish.color} onEmoji={(emoji) => setDish({ ...dish, emoji })} onColor={(color) => setDish({ ...dish, color })} />
        </div>
      </div>
      <div className="card">
        <StepsEditor steps={dish.steps} color={dish.color} onChange={(steps) => setDish({ ...dish, steps })} />
      </div>
      <div className="card">
        <label className="label">Notes (optional)</label>
        <textarea className="field min-h-20" placeholder="Recipe link, tips, serving size..." value={dish.notes ?? ""} onChange={(e) => setDish({ ...dish, notes: e.target.value })} />
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <button className="btn-primary flex-1" disabled={saving} onClick={() => save()}>{saving ? "Saving..." : "Save to library"}</button>
        <button className="btn-ghost flex-1" disabled={saving || !canCook} onClick={() => save(true)}>Save &amp; cook</button>
        {dish.id && <button className="btn-danger" onClick={remove}>Delete</button>}
      </div>
      {cooking && <CookDishSheet dish={dish} onClose={() => setCooking(false)} />}
    </div>
  );
}
