import { generateXpm2 } from "@busy-app/busy-lib";
import { createScreen, type Element } from "./screen";
import manifest from "./appmeta/manifest.json";

/** The name the app draws under; the device clears elements by this id. */
const APP = manifest.id;

/** Session lengths the wheel steps through, minutes, and the one picked at the start. */
const LENGTHS = [15, 25, 50, 90];
const DEFAULT_LENGTH = 1;

/** The tree grows in this many steps over a session, one pixel of height each. */
const STEPS = 14;

/** localStorage: the trees of each day, {"2026-11-13": {grown, dead}, …}, for the last DAYS_KEPT days; and the session under way, {end}. */
const DAYS_KEY = "days";
const DAYS_KEPT = 31;
const SESSION_KEY = "session";

/** The idle row of days: a 1 px gap and a 3 px tree per day, today at the right edge of the 72 px display. */
const SLOTS = 18;
/** A day's tree, 3x6: c the crown, t the trunk, . nothing. */
const TREE = [".c.", "ccc", "ccc", "ccc", ".t.", ".t."];
/** The same tree dried out: d the crown, b the trunk. */
const DRY_TREE = TREE.map((row) => row.replace(/c/g, "d").replace(/t/g, "b"));

const WHITE = "#FFFFFFFF";
const TRUNK = "#8B4513FF";
const CROWN = "#20C020FF";
const DRY_TRUNK = "#604830FF";
const DRY_CROWN = "#A08050FF";
const ROW_PALETTE = { ".": "none", c: CROWN, t: TRUNK, d: DRY_CROWN, b: DRY_TRUNK };

/** The pet, a fox 6x5 facing right, o its fur, w its tail tip and muzzle: two steps of its walk, and sad with its head down. */
const FOX_WALK = [
  ["...o.o", "w..ooo", "ooooow", ".oooo.", ".o..o."],
  ["...o.o", "w..ooo", "ooooow", ".oooo.", "..oo.."],
];
const FOX_SAD = ["......", "....o.", ".ooooo", "oooooo", "w.o..w"];
const PET_PALETTE = { ".": "none", o: "#FF7000FF", w: WHITE };
const PET_W = 6;
/** The pet walks in front of the row, its feet on the bottom line, a pixel a step, PET_MS apart; it stays sad SAD_STEPS steps. */
const PET_Y = 11;
const PET_MS = 300;
const SAD_STEPS = 5;
const mirror = (grid: string[]) => grid.map((row) => row.split("").reverse().join(""));
/** The pet's pictures, built once: the two steps and the sad one facing right, and the same facing left. */
const PET_RIGHT = [...FOX_WALK, FOX_SAD].map((grid) => generateXpm2({ palette: PET_PALETTE, grid }));
const PET_LEFT = [...FOX_WALK, FOX_SAD].map((grid) => generateXpm2({ palette: PET_PALETTE, grid: mirror(grid) }));

/** The pet on the idle screen: its left x, the way it faces (1 right, -1 left), its steps so far, and the steps it stays sad. */
type Pet = { x: number; dir: 1 | -1; steps: number; sad: number };

type Day = { grown: number; dead: number };
type DayLog = Record<string, Day>;

const pad = (n: number) => (n < 10 ? `0${n}` : String(n));

/** A local date as the log keys it, "2026-11-13". */
function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The local date `back` days before today. */
function daysAgo(back: number): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - back);
}

/** The trees of the last days; an unreadable log counts as empty. */
function readDays(): DayLog {
  try {
    const raw = localStorage.getItem(DAYS_KEY);
    if (raw) return JSON.parse(raw) as DayLog;
  } catch {
    // An unreadable log counts as empty.
  }
  return {};
}

/** Adds one tree, grown or dead, to the day its session began, drops the days older than DAYS_KEPT, and forgets the session. */
function addTree(kind: "grown" | "dead", began: Date): void {
  const log = readDays();
  const key = dateKey(began);
  const day = log[key] ?? { grown: 0, dead: 0 };
  day[kind] += 1;
  log[key] = day;
  const oldest = dateKey(daysAgo(DAYS_KEPT - 1));
  for (const k of Object.keys(log)) if (k < oldest) delete log[k];
  localStorage.setItem(DAYS_KEY, JSON.stringify(log));
  localStorage.removeItem(SESSION_KEY);
}

/** The tree in a slot of the row: a green tree for a day with a grown one, a dry tree for a day with dead ones only, none for a day without sessions. */
function slotTree(log: DayLog, slot: number): string[] | null {
  const day = log[dateKey(daysAgo(SLOTS - 1 - slot))];
  return !day ? null : day.grown > 0 ? TREE : day.dead > 0 ? DRY_TREE : null;
}

/** The row of the last SLOTS days as one XPM picture, an empty slot for a day without a tree. */
function dayRow(log: DayLog): string {
  const grid = TREE.map(() => "");
  for (let slot = 0; slot < SLOTS; slot++) {
    const tree = slotTree(log, slot);
    for (let r = 0; r < grid.length; r++) grid[r] += `.${tree ? tree[r] : "..."}`;
  }
  return generateXpm2({ palette: ROW_PALETTE, grid });
}

/** The x of the trunk of each dry tree in the row. */
function dryTrunks(log: DayLog): number[] {
  const trunks: number[] = [];
  for (let slot = 0; slot < SLOTS; slot++) if (slotTree(log, slot) === DRY_TREE) trunks.push(slot * 4 + 2);
  return trunks;
}

/** Idle: the session length on top, the row of days under it. */
function idleFrame(minutes: number, log: DayLog): Element[] {
  return [
    { id: "length", type: "text", text: `${minutes} MIN`, font: "small", color: WHITE, x: 36, y: 0, align: "top_mid" },
    { id: "days", type: "xpmbitmap", data: dayRow(log), x: 0, y: 10, align: "top_left", z_index: 0 },
  ];
}

/**
 * Moves the pet a pixel on, turning it round at the ends of the display. With its head a pixel short of a dry tree's
 * trunk it stops there, sad, for SAD_STEPS steps.
 */
function walk(pet: Pet, dry: number[]): void {
  if (pet.sad > 0) {
    pet.sad -= 1;
    return;
  }
  if (pet.x + pet.dir < 0 || pet.x + pet.dir > 72 - PET_W) pet.dir = pet.dir > 0 ? -1 : 1;
  pet.x += pet.dir;
  pet.steps += 1;
  const head = pet.dir > 0 ? pet.x + PET_W - 1 : pet.x;
  if (dry.indexOf(head + pet.dir) >= 0) pet.sad = SAD_STEPS;
}

/** The pet over the row, in front of the trees. */
function petElement(pet: Pet): Element {
  const pictures = pet.dir > 0 ? PET_RIGHT : PET_LEFT;
  const data = pet.sad > 0 ? pictures[2] : pictures[pet.steps % 2];
  // Its z_index keeps it over the row when the row is sent again, at midnight: on the emulator a bitmap without one
  // was drawn over what was there before it.
  return { id: "pet", type: "xpmbitmap", data, x: pet.x, y: PET_Y, align: "top_left", z_index: 1 };
}

/** A session: a tree of two rectangles on the left, as tall as the part of the session done, and the time left. */
function sessionFrame(end: number, progress: number): Element[] {
  const height = 2 + Math.floor(Math.min(1, progress) * STEPS);
  const trunk = Math.max(1, Math.round(height / 3));
  const crown = height - trunk;
  return [
    { id: "trunk", type: "rectangle", x: 4, y: 16 - trunk, width: 2, height: trunk, fill: "solid", fill_colors: [TRUNK], border_width: 0 },
    { id: "crown", type: "rectangle", x: 1, y: 16 - height, width: 8, height: crown, fill: "solid", fill_colors: [CROWN], border_width: 0 },
    // The firmware counts the time down by itself: no redraw each second.
    { id: "left", type: "countdown", timestamp: String(Math.round(end / 1000)), direction: "time_left", show_hours: "when_non_zero", color: WHITE, x: 42, y: 8, align: "center" },
  ];
}

/**
 * Entry point, called at the end of the file: the device runs this script from top to bottom and starts nothing by itself.
 */
function main(): void {
  const report = (err: unknown) => console.error(`${APP}: ${err instanceof Error ? err.message : String(err)}`);
  const screen = createScreen(APP, report);

  let length = DEFAULT_LENGTH;
  /** The session under way: when it began and when it ends (Date.now() ms); null when idle. */
  let session: { start: number; end: number } | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  const pet: Pet = { x: 0, dir: 1, steps: 0, sad: 0 };
  let petTimer: ReturnType<typeof setInterval> | undefined;
  /** The idle screen without the pet and the trunks of its dry trees, built at each idle draw for the pet's steps. */
  let idle: { frame: Element[]; dry: number[] } = { frame: [], dry: [] };

  // A session still marked as running was left before its end: it is a dead tree.
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      // Left by the mode switch, the session is only found at the next launch: its tree goes to the day it began.
      const saved = JSON.parse(raw) as { start?: number };
      addTree("dead", typeof saved.start === "number" ? new Date(saved.start) : new Date());
    }
  } catch (err) {
    report(err);
  }

  // Clearing a timer that was never set makes the firmware log a warning, so only a pending one is cleared.
  const stopTimer = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };

  function draw(): void {
    if (stopped) return;
    if (session) {
      screen.draw(sessionFrame(session.end, (Date.now() - session.start) / (session.end - session.start)));
      return;
    }
    // Read at each idle draw; the row is laid out from today's date, so after midnight the days move one slot left.
    const log = readDays();
    idle = { frame: idleFrame(LENGTHS[length], log), dry: dryTrunks(log) };
    screen.draw([...idle.frame, petElement(pet)]);
  }

  /** The pet walks only on the idle screen: its steps send the pet alone, the rest of the idle screen stays as drawn. */
  function startPet(): void {
    if (petTimer !== undefined) return;
    petTimer = setInterval(() => {
      walk(pet, idle.dry);
      screen.draw([...idle.frame, petElement(pet)]);
    }, PET_MS);
  }

  function stopPet(): void {
    if (petTimer !== undefined) clearInterval(petTimer);
    petTimer = undefined;
  }

  /** Idle: the row is redrawn just after the next local midnight, so a new day starts with an empty slot. */
  function idleUntilMidnight(): void {
    stopTimer();
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
    timer = setTimeout(() => {
      timer = undefined;
      if (session || stopped) return;
      draw();
      idleUntilMidnight();
    }, midnight - now.getTime() + 1000);
  }

  /** Ends the session with a tree of this kind and goes back to idle. */
  function finish(kind: "grown" | "dead"): void {
    stopTimer();
    const began = session ? new Date(session.start) : new Date();
    session = null;
    try {
      addTree(kind, began);
    } catch (err) {
      report(err);
    }
    draw();
    idleUntilMidnight();
    startPet();
  }

  /** Grows the tree one step at a time; at the end the tree takes the slot of the day the session began. */
  function tick(): void {
    timer = undefined;
    if (!session) return;
    const now = Date.now();
    if (now >= session.end) {
      finish("grown");
      return;
    }
    draw();
    const step = (session.end - session.start) / STEPS;
    timer = setTimeout(tick, Math.min(session.end - now, step - ((now - session.start) % step)) + 50);
  }

  function begin(): void {
    // The idle midnight timer gives way to the session's own, and the pet leaves.
    stopTimer();
    stopPet();
    const start = Date.now();
    session = { start, end: start + LENGTHS[length] * 60 * 1000 };
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ start: session.start, end: session.end }));
    } catch (err) {
      report(err);
    }
    tick();
  }

  // The listener keeps the app alive; a long Back is handled by the firmware and quits it.
  const unbind = listen("input", (event) => {
    if (stopped) return;
    if (event.key === "encoder") {
      if (session) return;
      length = Math.min(LENGTHS.length - 1, Math.max(0, length + event.delta));
      draw();
    } else if (event.action !== "short") {
      return;
    } else if (event.key === "start") {
      if (!session) begin();
    } else if (event.key === "back") {
      if (session) {
        // Giving up kills the tree. A short Back clears the app's screen on firmware 1.3.1: draw it all again.
        screen.forget();
        finish("dead");
        return;
      }
      // Back in idle leaves the app: with the timers cleared and the handler detached, nothing keeps it alive.
      stopped = true;
      stopTimer();
      stopPet();
      // Not detached from inside the handler itself: the unbind would stop the app while this handler still runs.
      setTimeout(unbind, 0);
    }
  });

  draw();
  idleUntilMidnight();
  startPet();
}

main();
