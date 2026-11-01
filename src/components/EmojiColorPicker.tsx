"use client";
import { useState } from "react";
import { DISH_COLORS, FOOD_EMOJI } from "@/lib/palette";

export default function EmojiColorPicker({
  emoji, color, onEmoji, onColor,
}: { emoji: string; color: string; onEmoji: (e: string) => void; onColor: (c: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <button
          type="button" onClick={() => setOpen(!open)}
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl ring-2"
          style={{ backgroundColor: `${color}22`, ["--tw-ring-color" as string]: color }}
          aria-label="Choose emoji"
        >
          {emoji}
        </button>
        <div className="flex flex-wrap gap-2">
          {DISH_COLORS.map((c) => (
            <button
              key={c} type="button" onClick={() => onColor(c)} aria-label={`Color ${c}`}
              className={`h-8 w-8 rounded-full border-2 ${c === color ? "border-ink scale-110" : "border-white"}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
      {open && (
        <div className="card p-3">
          <div className="grid grid-cols-8 gap-1">
            {FOOD_EMOJI.map((e) => (
              <button key={e} type="button" onClick={() => { onEmoji(e); setOpen(false); }} className="rounded-lg p-1 text-2xl hover:bg-bg">
                {e}
              </button>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm text-muted">Or type any emoji:</span>
            <input className="field w-20 text-center text-xl" maxLength={4} value={emoji} onChange={(e) => onEmoji(e.target.value)} />
          </div>
        </div>
      )}
    </div>
  );
}
