import Link from "next/link";
import DishForm from "@/components/DishForm";

export default function NewDishPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/library" className="text-sm font-semibold text-accent">‹ Library</Link>
      <h1 className="text-2xl font-bold">New dish</h1>
      <DishForm />
    </div>
  );
}
