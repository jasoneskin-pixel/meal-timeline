"use client";
import { useSyncExternalStore, type ComponentProps } from "react";
import Timeline from "./Timeline";
import SimpleTimeline from "./SimpleTimeline";
import { computeSchedule } from "@/lib/schedule";

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

const HIDE_KEY = "timelineHideDone";
function readHide(): boolean {
  try {
    return localStorage.getItem(HIDE_KEY) === "1";
  } catch {
    return false;
  }
}

/** "Hide completed" preference, remembered on this device. */
export function useHideDone(): [boolean, (v: boolean) => void] {
  const hide = useSyncExternalStore(subscribe, readHide, () => false);
  return [
    hide,
    (v) => {
      try { localStorage.setItem(HIDE_KEY, v ? "1" : "0"); } catch {}
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
  const [hideDone, setHideDone] = useHideDone();
  const { title, ...rest } = props;
  const doneCount = rest.done ? computeSchedule(rest.meal).steps.filter((st) => rest.done!.has(st.key)).length : 0;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {title ? <h2 className="text-lg font-bold md:text-xl">{title}</h2> : <span />}
        <div className="flex flex-wrap items-center gap-2">
          {rest.onToggleDone && doneCount > 0 && (
            <button
              type="button"
              onClick={() => setHideDone(!hideDone)}
              className={`rounded-xl border px-3 py-1.5 text-sm font-semibold ${hideDone ? "border-ink bg-ink text-white" : "border-line bg-white text-muted"}`}
            >
              {hideDone ? `Show completed (${doneCount})` : `Hide completed (${doneCount})`}
            </button>
          )}
          <TimelineModeSwitch mode={mode} onChange={setMode} />
        </div>
      </div>
      {mode === "simple" ? (
        <SimpleTimeline meal={rest.meal} done={rest.done} onToggleDone={rest.onToggleDone} hideDone={hideDone} />
      ) : (
        <Timeline {...rest} hideDone={hideDone} />
      )}
    </div>
  );
}
