"use client";
import CookMode from "@/components/CookMode";
import { useMeal } from "@/components/useMeal";

export default function CookPage() {
  const { meal, error, setMeal } = useMeal();
  if (error) return <p className="text-red-700">{error}</p>;
  if (!meal) return <p className="text-muted">Loading...</p>;
  return <CookMode meal={meal} onMealChange={setMeal} />;
}
