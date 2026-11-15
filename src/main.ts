import { generateXpm2 } from "@busy-app/busy-lib";
import { device } from "@shared/device";
import { idleBack, PAGES, sessionBack, type Stats } from "./back";
import { type DayLog, type DayOf, dayLookup, daysAgo, monthKey, monthMinutes, setDay } from "./days";
import { createScreen, type Element } from "./screen";
import { loadValues } from "./settings";
import { DRY_SMALL, PALETTE, SPECIES, dayTree, rows, shrink, unlocked } from "./species";
import manifest from "./appmeta/manifest.json";

/** The name the app draws under; the device clears elements by this id. */
const APP = manifest.id;

/** Session lengths the wheel steps through, minutes, and the one picked at the start when the bar returns no settings: the default of settings.json. */
const LENGTHS = [15, 25, 50, 90];
const DEFAULT_LENGTH = 1;
/** The pet's name when the bar returns no settings: the default of settings.json. */
const DEFAULT_NAME = "FOXY";

/** The tree grows in this many steps over a session, one pixel of height each, to the full 16 px of a species' large picture, LARGE_W px wide. */
const STEPS = 14;
const LARGE_W = 9;

/**
 * localStorage: the days of the forest, a DayLog, as far back as the first of the month 11 months ago (the year page
 * of the back display); the minutes of focus of the days dropped from it; and the session under way, {start, end}.
 */
const DAYS_KEY = "log";
const EARLIER_KEY = "earlier";
const SESSION_KEY = "session";

/** What plays when a tree has grown. */
const GROWN_SOUND = "sounds/grown.snd";

/** The idle row of days: a 1 px gap and a 3 px tree per day, today at the right edge of the 72 px display. */
const SLOTS = 18;

const WHITE = "#FFFFFFFF";

/** The pet, a fox 6x5 facing right, o its fur, w its tail tip and muzzle: two steps of its walk, sad with its head down, and jumping for joy. */
const FOX_WALK = [
  ["...o.o", "w..ooo", "ooooow", ".oooo.", ".o..o."],
  ["...o.o", "w..ooo", "ooooow", ".oooo.", "..oo.."],
];
const FOX_SAD = ["......", "....o.", ".ooooo", "oooooo", "w.o..w"];
const FOX_JOY = ["w..o.o", "w..ooo", "ooooow", ".oooo.", "o....o"];
const PET_PALETTE = { ".": "none", o: "#FF7000FF", w: WHITE };
const PET_W = 6;
/** The pet walks in front of the row, its feet on the bottom line, a pixel a step, PET_MS apart; it stays sad SAD_STEPS steps. */
const PET_Y = 11;
const PET_MS = 300;
const SAD_STEPS = 5;
/** When a tree has grown the pet jumps JUMP px up at every other step for JOY_STEPS steps, starting in the air. */
const JOY_STEPS = 9;
const JUMP = 2;
const mirror = (grid: string[]) => grid.map((row) => row.split("").reverse().join(""));
/** The pet's pictures, built once: the two steps, the sad one and the jump facing right, and the same facing left. */
const PET_RIGHT = [...FOX_WALK, FOX_SAD, FOX_JOY].map((grid) => generateXpm2({ palette: PET_PALETTE, grid }));
const PET_LEFT = [...FOX_WALK, FOX_SAD, FOX_JOY].map((grid) => generateXpm2({ palette: PET_PALETTE, grid: mirror(grid) }));

/** The pet on the idle screen: its left x, the way it faces (1 right, -1 left), its steps so far, the steps it stays sad and the steps it rejoices. */
type Pet = { x: number; dir: 1 | -1; steps: number; sad: number; joy: number };

type Settings = { length: number; sound: boolean; name: string };

/** Reads the default session length (an index in LENGTHS), the sound switch and the pet's name. */
async function loadSettings(): Promise<Settings> {
  const values = (await loadValues()) ?? {};
  const length = LENGTHS.indexOf(Number(values.length));
  return {
    length: length >= 0 ? length : DEFAULT_LENGTH,
    sound: typeof values.sound === "boolean" ? values.sound : true,
    name: typeof values.pet_name === "string" ? values.pet_name : DEFAULT_NAME,
  };
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

/** The minutes of focus of the days dropped from the log. */
function readEarlier(): number {
  return Number(localStorage.getItem(EARLIER_KEY) ?? 0);
}

/**
 * Adds one tree to the day its session began: a grown one of this species with the minutes of its session, or a dead
 * one (null). Drops the days before the first of the month 11 months ago, keeping their minutes, and forgets the session.
 */
function addTree(began: Date, grown: { species: number; minutes: number } | null): void {
  const log = readDays();
  const day = dayLookup(log)(began) ?? { dead: 0, minutes: 0, species: "" };
  if (grown) {
    day.species += String(grown.species);
    day.minutes += grown.minutes;
  } else {
    day.dead += 1;
  }
  setDay(log, began, day);
  const now = new Date();
  const oldest = monthKey(new Date(now.getFullYear(), now.getMonth() - 11, 1));
  let dropped = 0;
  for (const k of Object.keys(log)) {
    if (k >= oldest) continue;
    dropped += monthMinutes(log[k]);
    delete log[k];
  }
  if (dropped > 0) localStorage.setItem(EARLIER_KEY, String(readEarlier() + dropped));
  localStorage.setItem(DAYS_KEY, JSON.stringify(log));
  localStorage.removeItem(SESSION_KEY);
}

/** The hours of focus in all, and the days in a row with a grown tree up to today, or up to yesterday while today has none yet. */
function statsOf(log: DayLog, dayOf: DayOf): Stats {
  let minutes = readEarlier();
  for (const key of Object.keys(log)) minutes += monthMinutes(log[key]);
  const grew = (back: number) => (dayOf(daysAgo(back))?.species.length ?? 0) > 0;
  let streak = 0;
  for (let back = grew(0) ? 0 : 1; grew(back); back++) streak += 1;
  return { hours: Math.floor(minutes / 60), streak };
}

/** The tree in a slot of the row: the tree that stands for its day. */
function slotTree(dayOf: DayOf, slot: number): string | null {
  return dayTree(dayOf(daysAgo(SLOTS - 1 - slot)));
}

/** The row of the last SLOTS days as one XPM picture, an empty slot for a day without a tree. */
function dayRow(dayOf: DayOf): string {
  const grid = rows(DRY_SMALL).map(() => "");
  for (let slot = 0; slot < SLOTS; slot++) {
    const tree = slotTree(dayOf, slot);
    const lines = tree ? rows(tree) : null;
    for (let r = 0; r < grid.length; r++) grid[r] += `.${lines ? lines[r] : "..."}`;
  }
  return generateXpm2({ palette: PALETTE, grid });
}

/** The x of the trunk of each dry tree in the row. */
function dryTrunks(dayOf: DayOf): number[] {
  const trunks: number[] = [];
  for (let slot = 0; slot < SLOTS; slot++) if (slotTree(dayOf, slot) === DRY_SMALL) trunks.push(slot * 4 + 2);
  return trunks;
}

/** Idle: the session length on top, the row of days under it. */
function idleFrame(minutes: number, dayOf: DayOf): Element[] {
  return [
    { id: "length", type: "text", text: `${minutes} MIN`, font: "small", color: WHITE, x: 36, y: 0, align: "top_mid" },
    { id: "days", type: "xpmbitmap", data: dayRow(dayOf), x: 0, y: 10, align: "top_left", z_index: 0 },
  ];
}

/**
 * Moves the pet a pixel on, turning it round at the ends of the display. With its head a pixel short of a dry tree's
 * trunk it stops there, sad, for SAD_STEPS steps. Rejoicing it stays where it is.
 */
function walk(pet: Pet, dry: number[]): void {
  if (pet.joy > 0) {
    pet.joy -= 1;
    return;
  }
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

/** The pet over the row, in front of the trees; rejoicing, in the air at its odd steps. */
function petElement(pet: Pet): Element {
  const pictures = pet.dir > 0 ? PET_RIGHT : PET_LEFT;
  const up = pet.joy % 2 === 1;
  const data = up ? pictures[3] : pet.sad > 0 ? pictures[2] : pictures[pet.steps % 2];
  // Its z_index keeps it over the row when the row is sent again, at midnight: on the emulator a bitmap without one
  // was drawn over what was there before it.
  return { id: "pet", type: "xpmbitmap", data, x: pet.x, y: up ? PET_Y - JUMP : PET_Y, align: "top_left", z_index: 1 };
}

/** A session: the large tree of its species on the left, shrunk to the part of the session done, and the time left. */
function sessionFrame(end: number, progress: number, species: number): Element[] {
  const tree = shrink(SPECIES[species].large, 2 + Math.floor(Math.min(1, progress) * STEPS));
  return [
    // Standing on the bottom line, centred where the full-grown tree, LARGE_W wide, stands.
    { id: "tree", type: "xpmbitmap", data: generateXpm2({ palette: PALETTE, grid: tree }), x: (LARGE_W - tree[0].length) / 2, y: 16 - tree.length, align: "top_left" },
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

  /** Read once, at the start; until then the app draws nothing and takes no input. */
  let settings: Settings | null = null;
  let length = DEFAULT_LENGTH;
  /** The page of the back display in idle, an index in its PAGES. */
  let page = 0;
  /** The session under way: when it began and when it ends (Date.now() ms), and the species of its tree; null when idle. */
  let session: { start: number; end: number; species: number } | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  const pet: Pet = { x: 0, dir: 1, steps: 0, sad: 0, joy: 0 };
  let petTimer: ReturnType<typeof setInterval> | undefined;
  /** The idle screen without the pet and the trunks of its dry trees, built at each idle draw for the pet's steps. */
  let idle: { frame: Element[]; dry: number[] } = { frame: [], dry: [] };

  // A session still marked as running was left before its end: it is a dead tree.
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      // Left by the mode switch, the session is only found at the next launch: its tree goes to the day it began.
      const saved = JSON.parse(raw) as { start?: number };
      addTree(typeof saved.start === "number" ? new Date(saved.start) : new Date(), null);
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
    if (stopped || !settings) return;
    if (session) {
      const progress = (Date.now() - session.start) / (session.end - session.start);
      screen.draw([...sessionFrame(session.end, progress, session.species), ...sessionBack(session.end)]);
      return;
    }
    // Read at each idle draw; the row is laid out from today's date, so after midnight the days move one slot left.
    const log = readDays();
    const dayOf = dayLookup(log);
    const back = idleBack(page, dayOf, statsOf(log, dayOf), settings.name, PET_RIGHT[0]);
    idle = { frame: [...idleFrame(LENGTHS[length], dayOf), ...back], dry: dryTrunks(dayOf) };
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

  /** Ends the session with a tree of this kind and goes back to idle; a grown tree makes the pet rejoice, with a sound. */
  function finish(kind: "grown" | "dead"): void {
    stopTimer();
    const ended = session;
    session = null;
    try {
      const minutes = ended ? Math.round((ended.end - ended.start) / 60000) : 0;
      addTree(ended ? new Date(ended.start) : new Date(), kind === "grown" && ended ? { species: ended.species, minutes } : null);
    } catch (err) {
      report(err);
    }
    if (kind === "grown") {
      // Sadness left from before the session gives way to the joy.
      pet.sad = 0;
      pet.joy = JOY_STEPS;
      if (settings?.sound) void device.AudioPlay({ application_name: APP, path: GROWN_SOUND }).catch(report);
    }
    draw();
    idleUntilMidnight();
    startPet();
  }

  /**
   * Grows the tree one step at a time and turns the minutes left on the back display at each whole minute; at the end
   * the tree takes the slot of the day the session began.
   */
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
    const minute = (session.end - now) % 60000 || 60000;
    timer = setTimeout(tick, Math.min(session.end - now, step - ((now - session.start) % step), minute) + 50);
  }

  /** Starts a session; its tree is a species picked at random among the unlocked ones. */
  function begin(): void {
    // The idle midnight timer gives way to the session's own, and the pet leaves, its joy cut short. The idle screen is
    // let go: its pictures are not needed until the session ends, and the session's own take their room in the heap.
    stopTimer();
    stopPet();
    pet.joy = 0;
    idle = { frame: [], dry: [] };
    const log = readDays();
    const pool = unlocked(statsOf(log, dayLookup(log)).hours, new Date().getMonth());
    const start = Date.now();
    session = { start, end: start + LENGTHS[length] * 60 * 1000, species: pool[Math.floor(Math.random() * pool.length)] };
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ start: session.start, end: session.end }));
    } catch (err) {
      report(err);
    }
    tick();
  }

  // The listener keeps the app alive; a long Back is handled by the firmware and quits it.
  const unbind = listen("input", (event) => {
    if (stopped || !settings) return;
    if (event.key === "encoder") {
      if (session) return;
      length = Math.min(LENGTHS.length - 1, Math.max(0, length + event.delta));
      draw();
    } else if (event.action !== "short") {
      return;
    } else if (event.key === "start") {
      if (!session) begin();
    } else if (event.key === "ok") {
      // OK turns the pages of the back display in idle.
      if (session) return;
      page = (page + 1) % PAGES;
      draw();
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

  void loadSettings()
    .then((loaded) => {
      settings = loaded;
      length = loaded.length;
      draw();
      idleUntilMidnight();
      startPet();
    })
    .catch(report);
}

main();
