/** Time-zone helpers so pinned steps land on the right wall-clock time on server and client alike. */

function tzOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUTC = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUTC - Math.floor(date.getTime() / 1000) * 1000;
}

function ymdIn(date: Date, timeZone: string): [number, number, number] {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return [get("year"), get("month"), get("day")];
}

export function resolveTimeZone(tz?: string | null): string {
  return tz || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

/** The instant that is `hour:minute` local time, `daysBefore` calendar days before `base`'s date, in `timeZone`. */
export function wallTimeDaysBefore(base: Date, daysBefore: number, hour: number, minute: number, timeZone: string): Date {
  const [y, m, d] = ymdIn(base, timeZone);
  const guess = Date.UTC(y, m - 1, d - daysBefore, hour, minute);
  let t = guess - tzOffsetMs(new Date(guess), timeZone);
  t = guess - tzOffsetMs(new Date(t), timeZone); // second pass handles DST changes
  return new Date(t);
}

/** Local wall-clock hour and minute of `date` in `timeZone`. */
export function wallClock(date: Date, timeZone: string): { h: number; m: number } {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", hour: "2-digit", minute: "2-digit" }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { h: get("hour") % 24, m: get("minute") };
}

/** Whole calendar days from `earlier` to `later`, counted in `timeZone` (e.g. Wed to Thu = 1). */
export function calendarDaysBetween(later: Date, earlier: Date, timeZone: string): number {
  const [y1, m1, d1] = ymdIn(later, timeZone);
  const [y0, m0, d0] = ymdIn(earlier, timeZone);
  return Math.round((Date.UTC(y1, m1 - 1, d1) - Date.UTC(y0, m0 - 1, d0)) / 86_400_000);
}
