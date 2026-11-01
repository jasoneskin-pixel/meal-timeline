"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "./api";
import type { Meal } from "@/lib/types";

export function useMeal() {
  const { id } = useParams<{ id: string }>();
  const [meal, setMeal] = useState<Meal | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api<Meal>(`/api/meals/${id}`).then(setMeal).catch((e) => setError(e.message));
  }, [id]);
  return { id, meal, error, setMeal };
}
