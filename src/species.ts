import type { Day } from "./days";

/**
 * The species of trees. Each has a 3x6 picture for its day in the row of days and a 9x16 one for the tree that grows
 * through a session, both drawn with the letters of PALETTE: the species differ by colour and by silhouette.
 *
 * A picture is one string, its rows separated by spaces, split by rows() where it is drawn: as an array of strings
 * each picture would hold the heap all the time the app runs.
 */

/** The colours of the tree pictures by letter; "." is nothing. */
export const PALETTE = {
  ".": "none",
  t: "#8B4513FF",
  s: "#119A3AFF",
  g: "#9CE048FF",
  w: "#FFFFFFFF",
  k: "#505050FF",
  o: "#30B030FF",
  p: "#FF70B0FF",
  q: "#FFD0E8FF",
  m: "#FF3810FF",
  n: "#FFA020FF",
  l: "#50D050FF",
  u: "#C8945AFF",
  c: "#20B878FF",
  y: "#FFD400FF",
  e: "#7A3E0AFF",
  v: "#40A030FF",
  d: "#A08050FF",
  b: "#604830FF",
};

/** The rows of a picture. */
export const rows = (picture: string) => picture.split(" ");

/** A species: the hours of focus in all sessions that unlock it (null: it grows in December only) and its pictures. */
export type Species = { name: string; hours: number | null; small: string; large: string };

/** The species in the order they unlock, the spruce from the start; the snowy fir comes last. */
export const SPECIES: Species[] = [
  {
    name: "spruce",
    hours: 0,
    small: ".s. .s. sss .s. sss .t.",
    large:
      "....s.... " +
      "....s.... " +
      "...sss... " +
      "..sssss.. " +
      "....s.... " +
      "...sss... " +
      "..sssss.. " +
      ".sssssss. " +
      "...sss... " +
      "..sssss.. " +
      ".sssssss. " +
      "sssssssss " +
      "....t.... " +
      "....t.... " +
      "....t.... " +
      "....t....",
  },
  {
    name: "birch",
    hours: 4,
    small: ".g. ggg ggg .w. .w. .w.",
    large:
      "...ggg... " +
      "..ggggg.. " +
      ".ggggggg. " +
      ".ggggggg. " +
      "ggggggggg " +
      ".ggggggg. " +
      ".gggwggg. " +
      "..ggwgg.. " +
      "....w.... " +
      "....k.... " +
      "....w.... " +
      "....w.... " +
      "....k.... " +
      "....w.... " +
      "....w.... " +
      "....w....",
  },
  {
    name: "oak",
    hours: 10,
    small: "ooo ooo ooo ooo .t. .t.",
    large:
      "..ooooo.. " +
      ".ooooooo. " +
      "ooooooooo " +
      "ooooooooo " +
      "ooooooooo " +
      "ooooooooo " +
      "ooooooooo " +
      ".ooooooo. " +
      "..ootoo.. " +
      "...ttt... " +
      "...ttt... " +
      "...ttt... " +
      "...ttt... " +
      "...ttt... " +
      "..ttttt.. " +
      ".ttt.ttt.",
  },
  {
    name: "sakura",
    hours: 25,
    small: ".p. pqp ppp .p. .t. .t.",
    large:
      "...ppp... " +
      ".ppqpppp. " +
      "pppppqppp " +
      "pqppppppp " +
      "ppppqpppq " +
      ".ppppppp. " +
      "..pptpp.. " +
      "....t.... " +
      "...tt.... " +
      "....t.... " +
      "....tt... " +
      "....t.... " +
      "....t.... " +
      "....t.... " +
      "....t.... " +
      "...ttt...",
  },
  {
    name: "maple",
    hours: 50,
    small: "m.m mnm mmm .m. .t. .t.",
    large:
      "....m.... " +
      ".m..m..m. " +
      ".mm.m.mm. " +
      "..mmnmm.. " +
      "mmmmmmmmm " +
      ".mmnmmmm. " +
      "..mmmmm.. " +
      ".mmmmnmm. " +
      "mmmmtmmmm " +
      "...mtm... " +
      "....t.... " +
      "....t.... " +
      "....t.... " +
      "....t.... " +
      "....t.... " +
      "...ttt...",
  },
  {
    name: "palm",
    hours: 75,
    small: ".l. lll lul .u. .u. .u.",
    large:
      "...lll... " +
      ".lllllll. " +
      "lll.u.lll " +
      "l..lul..l " +
      "l.l.u.l.l " +
      "....u.... " +
      "....u.... " +
      "....u.... " +
      "....u.... " +
      "....u.... " +
      "....u.... " +
      "....u.... " +
      "....u.... " +
      "....u.... " +
      "....u.... " +
      "...uuu...",
  },
  {
    name: "cactus",
    hours: 100,
    small: ".c. cc. ccc .cc .c. .c.",
    large:
      "....p.... " +
      "...ccc... " +
      "...ccc... " +
      "c..ccc... " +
      "c..ccc..c " +
      "c..ccc..c " +
      "cc.ccc..c " +
      ".cccccccc " +
      "...ccc... " +
      "...ccc... " +
      "...ccc... " +
      "...ccc... " +
      "...ccc... " +
      "...ccc... " +
      "...ccc... " +
      "...ccc...",
  },
  {
    name: "sunflower",
    hours: 150,
    small: ".y. yey .y. .v. vv. .v.",
    large:
      "..yyyyy.. " +
      ".yyeeeyy. " +
      "yyeeeeeyy " +
      "yyeeeeeyy " +
      "yyeeeeeyy " +
      ".yyeeeyy. " +
      "..yyyyy.. " +
      "....v.... " +
      "....v.... " +
      ".vv.v.... " +
      "..vvv.... " +
      "....v.vv. " +
      "....vvv.. " +
      "....v.... " +
      "....v.... " +
      "....v....",
  },
  {
    name: "snowy fir",
    hours: null,
    small: ".w. .s. wsw .s. wsw .t.",
    large:
      "....w.... " +
      "....w.... " +
      "...wsw... " +
      "..wsssw.. " +
      "....w.... " +
      "...wsw... " +
      "..wsssw.. " +
      ".wsssssw. " +
      "...wsw... " +
      "..wsssw.. " +
      ".wsssssw. " +
      "wsssssssw " +
      "....t.... " +
      "....t.... " +
      "....t.... " +
      "....t....",
  },
];

/** The snowy fir's index in SPECIES. */
const SNOWY_FIR = SPECIES.length - 1;

/** A tree that died, in the row and large: d its crown, b its trunk. */
export const DRY_SMALL = ".d. ddd ddd ddd .b. .b.";
export const DRY_LARGE = SPECIES[2].large.replace(/o/g, "d").replace(/t/g, "b");

/** The tree that stands for a day: the species of its last grown tree, a dry tree for a day with dead ones only, none for a day without sessions. */
export function dayTree(day: Day | undefined): string | null {
  if (!day) return null;
  if (day.species.length > 0) return SPECIES[Number(day.species[day.species.length - 1])].small;
  return day.dead > 0 ? DRY_SMALL : null;
}

/** The species a tree can be after this many hours of focus in all, in this month (0 January): the snowy fir in December. */
export function unlocked(hours: number, month: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < SNOWY_FIR; i++) if (hours >= (SPECIES[i].hours ?? Infinity)) out.push(i);
  if (month === 11) out.push(SNOWY_FIR);
  return out;
}

/**
 * The picture shrunk to `height` rows and as many columns as keep its proportions, an odd number so that it stays
 * centred; each pixel is the nearest one of the full picture.
 */
export function shrink(picture: string, height: number): string[] {
  const grid = rows(picture);
  const columns = grid[0].length;
  const width = Math.max(1, 2 * Math.round(((columns * height) / grid.length - 1) / 2) + 1);
  const out: string[] = [];
  for (let r = 0; r < height; r++) {
    const row = grid[Math.floor(((r + 0.5) * grid.length) / height)];
    let line = "";
    for (let c = 0; c < width; c++) line += row[Math.floor(((c + 0.5) * columns) / width)];
    out.push(line);
  }
  return out;
}
