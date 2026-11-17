"use client";
import { useSyncExternalStore, type ComponentProps } from "react";
import Timeline from "./Timeline";
import SimpleTimeline from "./SimpleTimeline";

export type TimelineMode = "detailed" | "simple";
const KEY = "timelineView";
const listeners = new Set<() => void>();

function readMode(): TimelineMode {
  try {
    return localStorage.getItem(KEY) === "simple" ? "simple" : "detailed";
  } catch {
    return "detailed";
  }
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

/** Detailed / Simple switch; the choice is remembered on this device and shared by every page. */
export function useTimelineMode(): [TimelineMode, (m: TimelineMode) => void] {
  const mode = useSyncExternalStore(subscribe, readMode, () => "detailed" as TimelineMode);
  return [
    mode,
    (m) => {
      try { localStorage.setItem(KEY, m); } catch {}
      listeners.forEach((l) => l());
    },
  ];
}

export function TimelineModeSwitch({ mode, onChange }: { mode: TimelineMode; onChange: (m: TimelineMode) => void }) {
  return (
    <div className="inline-flex overflow-hidden rounded-xl border border-line text-sm font-semibold">
      {(["detailed", "simple"] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={`px-3.5 py-1.5 ${mode === m ? "bg-ink text-white" : "bg-white text-muted"}`}
        >
          {m === "detailed" ? "Detailed" : "Simple"}
        </button>
      ))}
    </div>
  );
}

/** The timeline with a Detailed / Simple switch above it. */
export default function TimelineView(props: ComponentProps<typeof Timeline> & { title?: string }) {
  const [mode, setMode] = useTimelineMode();
  const { title, ...rest } = props;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {title ? <h2 className="text-lg font-bold md:text-xl">{title}</h2> : <span />}
        <TimelineModeSwitch mode={mode} onChange={setMode} />
      </div>
      {mode === "simple" ? (
        <SimpleTimeline meal={rest.meal} done={rest.done} onToggleDone={rest.onToggleDone} />
      ) : (
        <Timeline {...rest} />
      )}
    </div>
  );
}
