"use client";
import { useState } from "react";

export default function LoginPage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(full: string) {
    setBusy(true);
    setError("");
    const res = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode: full }) });
    if (res.ok) {
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.assign(next && next.startsWith("/") && !next.startsWith("//") ? next : "/");
      return;
    }
    const data = await res.json().catch(() => ({}));
    setError(data.error || "Something went wrong.");
    setCode("");
    setBusy(false);
  }

  function press(d: string) {
    if (busy) return;
    const next = (code + d).slice(0, 4);
    setCode(next);
    if (next.length === 4) submit(next);
  }

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-8">
      <div className="text-center">
        <div className="text-5xl">⏲️</div>
        <h1 className="mt-2 text-2xl font-bold">Meal Timeline</h1>
        <p className="text-muted">Enter your passcode</p>
      </div>
      <div className="flex gap-4">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`h-4 w-4 rounded-full border-2 border-ink ${i < code.length ? "bg-ink" : ""}`} />
        ))}
      </div>
      <p className="h-5 text-sm text-red-700">{error}</p>
      <div className="grid grid-cols-3 gap-4">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((k, i) =>
          k === "" ? <span key={i} /> : (
            <button
              key={i}
              className="h-18 w-18 rounded-full bg-white text-2xl font-semibold shadow-sm active:bg-line"
              onClick={() => (k === "⌫" ? setCode(code.slice(0, -1)) : press(k))}
              aria-label={k === "⌫" ? "Delete" : k}
            >
              {k}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
