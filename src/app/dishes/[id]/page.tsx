"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import DishForm from "@/components/DishForm";
import { api } from "@/components/api";
import type { Dish } from "@/lib/types";

export default function EditDishPage() {
  const { id } = useParams<{ id: string }>();
  const [dish, setDish] = useState<Dish | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api<Dish>(`/api/dishes/${id}`).then(setDish).catch((e) => setError(e.message));
  }, [id]);
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/library" className="text-sm font-semibold text-accent">‹ Library</Link>
      <h1 className="text-2xl font-bold">Edit dish</h1>
      {error && <p className="text-red-700">{error}</p>}
      {dish ? <DishForm initial={dish} /> : !error && <p className="text-muted">Loading...</p>}
    </div>
  );
}
