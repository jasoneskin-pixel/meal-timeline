"use client";
import Link from "next/link";
import MealEditor from "@/components/MealEditor";
import { useMeal } from "@/components/useMeal";

export default function EditMealPage() {
  const { id, meal, error } = useMeal();
  if (error) return <p className="text-red-700">{error}</p>;
  if (!meal) return <p className="text-muted">Loading...</p>;
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <Link href={`/meals/${id}`} className="text-sm font-semibold text-accent">‹ Timeline</Link>
      <h1 className="text-2xl font-bold">Edit meal</h1>
      <MealEditor initial={meal} />
    </div>
  );
}
