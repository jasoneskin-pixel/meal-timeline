"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/** Screen-only bar above a printable page. Opens the print dialog once the content is ready. */
export default function PrintToolbar({ ready }: { ready: boolean }) {
  const router = useRouter();
  const printed = useRef(false);
  useEffect(() => {
    if (!ready || printed.current) return;
    printed.current = true;
    const t = setTimeout(() => window.print(), 500);
    return () => clearTimeout(t);
  }, [ready]);
  return (
    <div className="mb-6 space-y-2 print:hidden">
      <div className="flex items-center justify-between gap-3">
        <button className="text-sm font-semibold text-accent" onClick={() => router.back()}>‹ Back</button>
        <button className="btn-primary" onClick={() => window.print()}>🖨️ Print / Save as PDF</button>
      </div>
      <p className="text-xs text-muted">
        In the print dialog choose a printer, or <b>Save as PDF</b>. On iPhone or iPad, if no dialog appears, tap Share → Print, then pinch out on the preview to get a PDF.
      </p>
    </div>
  );
}
