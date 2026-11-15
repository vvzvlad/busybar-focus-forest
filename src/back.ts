import { generateXpm2, scaleGrid } from "@busy-app/busy-lib";
import type { Element } from "./screen";
import { type Day, type DayOf, daysAgo } from "./days";
import { DRY_LARGE, DRY_SMALL, PALETTE, SPECIES, dayTree, rows } from "./species";

/** The back display, 160x80 in 16 grays, without the firmware's status bar on its right 12 px. */
const WIDTH = 148;
const WHITE = "#FFFFFFFF";
const GRAY = "#909090FF";

/** The colours of the back display's pictures: the trees', and the ground under a day in the month (x a past day, z today, f a day to come). */
const BACK_PALETTE = { ...PALETTE, x: "#505050FF", z: "#D0D0D0FF", f: "#202020FF" };
/** The grays of the year: a day by its minutes of focus, A the fewest to D the most; x the dots of a dry day and of a day without. */
const YEAR_PALETTE = { ".": "none", A: "#505050FF", B: "#909090FF", C: "#C8C8C8FF", D: "#FFFFFFFF", x: "#505050FF" };

/** Letters 5x7 for the large words of the session, # lit, each a picture as in species.ts. */
const LETTERS: Record<string, string> = {
  B: "####. #...# #...# ####. #...# #...# ####.",
  U: "#...# #...# #...# #...# #...# #...# .###.",
  S: ".#### #.... #.... .###. ....# ....# ####.",
  Y: "#...# #...# .#.#. ..#.. ..#.. ..#.. ..#..",
  M: "#...# ##.## #.#.# #.#.# #...# #...# #...#",
  I: ".###. ..#.. ..#.. ..#.. ..#.. ..#.. .###.",
  N: "#...# ##..# #.#.# #..## #...# #...# #...#",
  " ": "..... ..... ..... ..... ..... ..... .....",
  "0": ".###. #...# #..## #.#.# ##..# #...# .###.",
  "1": "..#.. .##.. ..#.. ..#.. ..#.. ..#.. .###.",
  "2": ".###. #...# ....# ...#. ..#.. .#... #####",
  "3": "##### ...#. ..#.. ...#. ....# #...# .###.",
  "4": "...#. ..##. .#.#. #..#. ##### ...#. ...#.",
  "5": "##### #.... ####. ....# ....# #...# .###.",
  "6": "..##. .#... #.... ####. #...# #...# .###.",
  "7": "##### ....# ...#. ..#.. .#... .#... .#...",
  "8": ".###. #...# #...# .###. #...# #...# .###.",
  "9": ".###. #...# #...# .#### ....# ...#. .##..",
};

/** The text in LETTERS as one white picture, a pixel between the letters, each pixel `scale` px square. */
function largeText(text: string, scale: number): string {
  const grid = ["", "", "", "", "", "", ""];
  for (let i = 0; i < text.length; i++) {
    const letter = rows(LETTERS[text[i]]);
    for (let r = 0; r < grid.length; r++) grid[r] += (i > 0 ? "." : "") + letter[r];
  }
  return generateXpm2({ palette: { ".": "none", "#": WHITE }, grid: scaleGrid(grid, scale) });
}

/** During a session the back display tells the people around: BUSY, and the minutes left, rounded up so that the last one shows 1. */
export function sessionBack(end: number): Element[] {
  const minutes = Math.ceil((end - Date.now()) / 60000);
  return [
    { id: "bbusy", type: "xpmbitmap", data: largeText("BUSY", 6), x: WIDTH / 2, y: 5, align: "top_mid", display: "back" },
    { id: "bleft", type: "xpmbitmap", data: largeText(`${minutes} MIN`, 3), x: WIDTH / 2, y: 54, align: "top_mid", display: "back" },
  ];
}

/** The hours of focus in all and the days in a row with a grown tree. */
export type Stats = { hours: number; streak: number };

const MONTHS = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function text(id: string, value: string, font: string, x: number, y: number, align: string, color = WHITE): Element {
  return { id, type: "text", text: value, font, color, x, y, align, display: "back" };
}

function picture(id: string, grid: string[], x: number, y: number): Element {
  return { id, type: "xpmbitmap", data: generateXpm2({ palette: BACK_PALETTE, grid }), x, y, align: "top_left", display: "back" };
}

/** An empty picture to draw into with put(). */
function blank(width: number, height: number): string[] {
  const grid: string[] = [];
  for (let r = 0; r < height; r++) grid.push(".".repeat(width));
  return grid;
}

/** Draws a picture into the grid with its top left at x, y. */
function put(grid: string[], picture: string, x: number, y: number): void {
  const lines = rows(picture);
  for (let r = 0; r < lines.length; r++) grid[y + r] = grid[y + r].slice(0, x) + lines[r] + grid[y + r].slice(x + lines[r].length);
}

/** The trees of a day, at most `room`: the grown ones by species in the order they grew, then the dead ones; small or large. */
function treesOf(day: Day | undefined, room: number, large: boolean): string[] {
  const trees: string[] = [];
  if (!day) return trees;
  for (const s of day.species) trees.push(large ? SPECIES[Number(s)].large : SPECIES[Number(s)].small);
  for (let i = 0; i < day.dead; i++) trees.push(large ? DRY_LARGE : DRY_SMALL);
  return trees.slice(0, room);
}

/** Today: its trees large, the pet beside them, and how many trees and minutes. */
function todayPage(dayOf: DayOf, today: Date, pet: string): Element[] {
  const day = dayOf(today);
  const trees = treesOf(day, 13, true);
  const out: Element[] = [];
  if (trees.length > 0) {
    const grid = blank(trees.length * 10 - 1, 16);
    trees.forEach((tree, i) => put(grid, tree, i * 10, 0));
    out.push(picture("bpic", grid, 0, 14));
  }
  out.push({ id: "bpet", type: "xpmbitmap", data: pet, x: trees.length * 10 + 1, y: 25, align: "top_left", display: "back" });
  const grown = day ? day.species.length : 0;
  const parts: string[] = [];
  if (grown > 0) parts.push(`${grown} ${grown === 1 ? "TREE" : "TREES"}, ${day?.minutes} MIN`);
  if (day && day.dead > 0) parts.push(`${day.dead} DRY`);
  out.push(text("bsum", parts.length > 0 ? parts.join(", ") : "NO TREES YET", "small", 0, 36, "top_left"));
  if (grown === 0) out.push(text("bhint", "START GROWS ONE", "small", 0, 48, "top_left", GRAY));
  return out;
}

/** The last 7 days, a row each, today at the bottom: the day of the week, its trees, its minutes. */
function weekPage(dayOf: DayOf): Element[] {
  const week: string[][] = [];
  const out: Element[] = [];
  let widest = 0;
  for (let i = 0; i < 7; i++) {
    const date = daysAgo(6 - i);
    const day = dayOf(date);
    const trees = treesOf(day, 25, false);
    week.push(trees);
    widest = Math.max(widest, trees.length);
    const color = i === 6 ? WHITE : GRAY;
    out.push(text(`bl${i}`, WEEKDAYS[date.getDay()], "tiny", 0, 12 + i * 8, "top_left", color));
    if (day && day.minutes > 0) out.push(text(`bm${i}`, `${day.minutes} MIN`, "tiny", WIDTH, 12 + i * 8, "top_right", color));
  }
  if (widest > 0) {
    const grid = blank(widest * 4 - 1, 7 * 8 - 2);
    week.forEach((trees, i) => trees.forEach((tree, k) => put(grid, tree, k * 4, i * 8)));
    out.push(picture("bpic", grid, 16, 12));
  }
  return out;
}

/**
 * This month as a calendar from Monday, the tree that stands for each day so far on its ground, today's ground the
 * brightest; beside it the month's grown trees, their hours and the dry trees. A tree a day keeps the picture small.
 */
function monthPage(dayOf: DayOf, today: Date): Element[] {
  const year = today.getFullYear();
  const month = today.getMonth();
  const lead = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const grid = blank(7 * 9 - 2, Math.ceil((lead + days) / 7) * 8 - 1);
  let grown = 0;
  let minutes = 0;
  let dead = 0;
  for (let d = 1; d <= days; d++) {
    const x = ((lead + d - 1) % 7) * 9;
    const y = Math.floor((lead + d - 1) / 7) * 8;
    put(grid, (d < today.getDate() ? "x" : d === today.getDate() ? "z" : "f").repeat(7), x, y + 6);
    const day = d <= today.getDate() ? dayOf(new Date(year, month, d)) : undefined;
    const tree = dayTree(day);
    if (!day || !tree) continue;
    put(grid, tree, x + 2, y);
    grown += day.species.length;
    minutes += day.minutes;
    dead += day.dead;
  }
  const out = "MTWTFSS".split("").map((letter, i) => text(`bl${i}`, letter, "tiny", i * 9 + 3, 11, "top_mid", GRAY));
  out.push(picture("bpic", grid, 0, 19));
  out.push(text("bm0", `${grown} ${grown === 1 ? "TREE" : "TREES"}`, "small", 72, 19, "top_left"));
  out.push(text("bm1", `${Math.floor(minutes / 60)} H ${minutes % 60} MIN`, "small", 72, 31, "top_left"));
  if (dead > 0) out.push(text("bm2", `${dead} DRY`, "small", 72, 43, "top_left", GRAY));
  return out;
}

/**
 * The last 12 months, a row each, this one at the bottom, every third one named: a day 2x3 px, with grown trees lit by
 * its minutes, a dry day dotted, a dot for a day without. Its rows are built cell by cell, not drawn in with put().
 */
function yearPage(dayOf: DayOf, today: Date): Element[] {
  const grid: string[] = [];
  const out: Element[] = [];
  for (let i = 0; i < 12; i++) {
    const first = new Date(today.getFullYear(), today.getMonth() - 11 + i, 1);
    const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const lines = ["", "", ""];
    for (let d = 1; d <= 31; d++) {
      const date = new Date(first.getFullYear(), first.getMonth(), d);
      const past = d <= days && date <= today;
      const day = past ? dayOf(date) : undefined;
      const m = day ? day.minutes : 0;
      const level = m > 100 ? "D" : m > 50 ? "C" : m > 25 ? "B" : m > 0 ? "A" : "";
      const cell = level ? [level + level, level + level, level + level] : day && day.dead > 0 ? ["x.", ".x", "x."] : past ? ["..", "..", "x."] : ["..", "..", ".."];
      for (let r = 0; r < 3; r++) lines[r] += cell[r] + (d < 31 ? "." : "");
    }
    grid.push(...lines);
    if (i < 11) grid.push(".".repeat(lines[0].length));
    if (i % 3 === 2) out.push(text(`bl${i}`, MONTHS[first.getMonth()].slice(0, 3), "tiny", 0, 9 + i * 4, "top_left", GRAY));
  }
  out.push({ id: "bpic", type: "xpmbitmap", data: generateXpm2({ palette: YEAR_PALETTE, grid }), x: 20, y: 11, align: "top_left", display: "back" });
  return out;
}

/** The pages of the back display in idle, turned by OK. */
export const PAGES = 4;

/**
 * The back display in idle, for the person at the bar: a page of the forest (today, the week, the month, the year)
 * under its title and the pet's name, and the days in a row and the hours of focus at the bottom.
 */
export function idleBack(page: number, dayOf: DayOf, stats: Stats, name: string, pet: string): Element[] {
  const today = new Date();
  const titles = ["TODAY", "WEEK", MONTHS[today.getMonth()], "YEAR"];
  const content =
    page === 0 ? todayPage(dayOf, today, pet) : page === 1 ? weekPage(dayOf) : page === 2 ? monthPage(dayOf, today) : yearPage(dayOf, today);
  return [
    text("btitle", titles[page], "small", 0, 0, "top_left"),
    text("bname", name, "small", WIDTH, 0, "top_right"),
    ...content,
    text("bstreak", `${stats.streak} ${stats.streak === 1 ? "DAY" : "DAYS"} IN A ROW`, "small", 0, 71, "top_left"),
    text("bhours", `${stats.hours} H`, "small", WIDTH, 71, "top_right"),
  ];
}
