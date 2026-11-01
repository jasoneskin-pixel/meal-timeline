"use client";
import { useCallback, useEffect, useRef, useState } from "react";

interface Pending {
  label: string;
  undo: () => Promise<void> | void;
}

/** "Deleted X · Undo" bar shown for a few seconds after a delete. */
export function useUndoToast() {
  const [pending, setPending] = useState<Pending | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((p: Pending) => {
    if (timer.current) clearTimeout(timer.current);
    setPending(p);
    timer.current = setTimeout(() => setPending(null), 6000);
  }, []);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const toast = pending ? (
    <div className="fixed inset-x-0 bottom-24 z-40 flex justify-center px-4">
      <div className="flex w-full max-w-md items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-white shadow-lg">
        <span className="flex-1 truncate text-sm">Deleted {pending.label}</span>
        <button
          className="text-sm font-bold text-orange-300"
          onClick={async () => {
            const p = pending;
            setPending(null);
            await p.undo();
          }}
        >
          Undo
        </button>
      </div>
    </div>
  ) : null;

  return { toast, show };
}
