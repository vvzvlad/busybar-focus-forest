/** A day of the forest: its dead trees, the minutes of its grown ones, and the species of each grown tree as a digit, an index in SPECIES; the grown trees are as many as the digits. */
export type Day = { dead: number; minutes: number; species: string };
/** The day of the log for a local date, undefined for a day without sessions. */
export type DayOf = (date: Date) => Day | undefined;

/**
 * The log as localStorage keeps it: a string per month, {"2026-11": "…", …}, with a field per day separated by commas,
 * "0123/1/75" — the species of the day's grown trees, its dead trees, its minutes — or empty for a day without
 * sessions. A string per month, not an object per day: a year of objects parsed at once does not fit the heap.
 */
export type DayLog = Record<string, string>;

const pad = (n: number) => (n < 10 ? `0${n}` : String(n));

/** The month of a local date as the log keys it, "2026-11". */
export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/** The local date `back` days before today. */
export function daysAgo(back: number): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - back);
}

/** The days of the log by local date; a month's string is split once for the days of that month asked in a row. */
export function dayLookup(log: DayLog): DayOf {
  let month = "";
  let fields: string[] = [];
  return (date) => {
    const key = monthKey(date);
    if (key !== month) {
      month = key;
      fields = (log[key] ?? "").split(",");
    }
    const field = fields[date.getDate() - 1];
    if (!field) return undefined;
    const [species, dead, minutes] = field.split("/");
    return { species, dead: Number(dead), minutes: Number(minutes) };
  };
}

/** Writes the day into the log. */
export function setDay(log: DayLog, date: Date, day: Day): void {
  const key = monthKey(date);
  const fields = (log[key] ?? "").split(",");
  while (fields.length < date.getDate()) fields.push("");
  fields[date.getDate() - 1] = `${day.species}/${day.dead}/${day.minutes}`;
  log[key] = fields.join(",");
}

/** The minutes of all the days in a month's string. */
export function monthMinutes(month: string): number {
  let minutes = 0;
  for (const field of month.split(",")) if (field) minutes += Number(field.split("/")[2]);
  return minutes;
}
