import Link from "next/link";
import MealEditor from "@/components/MealEditor";

export default function NewMealPage() {
  return (
    <div className="space-y-4">
      <Link href="/" className="text-sm font-semibold text-accent">‹ Meals</Link>
      <h1 className="text-2xl font-bold">New meal</h1>
      <MealEditor />
    </div>
  );
}
