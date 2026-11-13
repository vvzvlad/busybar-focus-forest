import { createScreen, type Element } from "./screen";
import manifest from "./appmeta/manifest.json";

/** The name the app draws under; the device clears elements by this id. */
const APP = manifest.id;

/** Session lengths the wheel steps through, minutes, and the one picked at the start. */
const LENGTHS = [15, 25, 50, 90];
const DEFAULT_LENGTH = 1;

/** The tree grows in this many steps over a session, one pixel of height each. */
const STEPS = 14;

/** localStorage: today's trees, {date, grown, dead}; and the session under way, {end}. */
const FOREST_KEY = "forest";
const SESSION_KEY = "session";

const WHITE = "#FFFFFFFF";
const GRAY = "#A0A0A0FF";
const TRUNK = "#8B4513FF";
const CROWN = "#20C020FF";

type Forest = { date: string; grown: number; dead: number };

const pad = (n: number) => (n < 10 ? `0${n}` : String(n));

/** The bar's local date, "2026-11-13". */
function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Today's tree counts; a record of another day counts as none. */
function readForest(): Forest {
  try {
    const raw = localStorage.getItem(FOREST_KEY);
    const forest = raw ? (JSON.parse(raw) as Forest) : null;
    if (forest && forest.date === today()) return forest;
  } catch {
    // An unreadable record counts as none.
  }
  return { date: today(), grown: 0, dead: 0 };
}

/** Adds one tree, grown or dead, to today's count, and forgets the session. */
function addTree(kind: "grown" | "dead"): Forest {
  const forest = readForest();
  forest[kind] += 1;
  localStorage.setItem(FOREST_KEY, JSON.stringify(forest));
  localStorage.removeItem(SESSION_KEY);
  return forest;
}

/** Idle: the session length on top, today's trees under it. */
function idleFrame(minutes: number, forest: Forest): Element[] {
  return [
    { id: "length", type: "text", text: `${minutes} MIN`, font: "bold", color: WHITE, x: 36, y: -1, align: "top_mid" },
    { id: "trees", type: "text", text: `${forest.grown} grown ${forest.dead} dead`, font: "small", color: GRAY, x: 36, y: 8, align: "top_mid" },
  ];
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

  // A session still marked as running was left before its end: it is a dead tree.
  try {
    if (localStorage.getItem(SESSION_KEY)) addTree("dead");
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
    // Read at each idle draw: after midnight the record of yesterday counts as none.
    screen.draw(idleFrame(LENGTHS[length], readForest()));
  }

  /** Idle: the counts are redrawn just after the next local midnight, so a new day starts with an empty forest. */
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
    session = null;
    try {
      addTree(kind);
    } catch (err) {
      report(err);
    }
    draw();
    idleUntilMidnight();
  }

  /** Grows the tree one step at a time; at the end the tree joins today's forest. */
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
    // The idle midnight timer gives way to the session's own.
    stopTimer();
    const start = Date.now();
    session = { start, end: start + LENGTHS[length] * 60 * 1000 };
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ end: session.end }));
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
      // Back in idle leaves the app: with the timer cleared and the handler detached, nothing keeps it alive.
      stopped = true;
      stopTimer();
      // Not detached from inside the handler itself: the unbind would stop the app while this handler still runs.
      setTimeout(unbind, 0);
    }
  });

  draw();
  idleUntilMidnight();
}

main();
