import { device } from "@shared/device";

/** One display element in the firmware's own shape (POST /api/display/draw), addressed by its id. */
export type Element = Record<string, unknown> & { id: string };

/**
 * Whether two elements have the same fields with the same values; the app's elements hold plain values only. Compared
 * so, not as JSON: a copy of each large picture of the back display, kept to compare, does not fit the heap.
 */
function same(a: Element, b: Element): boolean {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((key) => a[key] === b[key]);
}

/** A picture with nothing in it: what an xpmbitmap is turned into to hide it. */
const NOTHING = ["! XPM2", "1 1 1 1", ". c none", "."].join("\n");

/**
 * The element made invisible, keeping its id and type: the firmware refuses to change the type under an id. Text and
 * countdowns become fully transparent, pictures empty.
 */
function hidden(e: Element): Element {
  return e.type === "xpmbitmap" ? { ...e, data: NOTHING } : { ...e, color: "#00000000" };
}

/**
 * Draws frames by sending only the elements that changed since the last frame and clearing the ones that are gone.
 * One request is in flight at a time; a frame asked for meanwhile replaces the one waiting.
 */
export function createScreen(app: string, report: (err: unknown) => void) {
  /** What is on the displays now: element id → the element as sent; null when unknown. */
  let shown: Map<string, Element> | null = new Map();
  /** Set by forget(): a frame in flight meanwhile does not make the screen known again. */
  let forgotten = false;
  let busy = false;
  let next: Element[] | null = null;

  async function send(elements: Element[]): Promise<void> {
    const before = shown;
    // Until the request is answered the screen is unknown: a failed one leaves it so, and the next frame starts over.
    shown = null;
    forgotten = false;
    // Clearing by ids the display may not have would be refused whole: an unknown screen is cleared all at once.
    if (!before) await device.DisplayClear({ application_name: app });
    const present = new Set(elements.map((e) => e.id));
    const gone = before ? [...before.values()].filter((e) => !present.has(e.id)) : [];
    const changed = before ? elements.filter((e) => !same(before.get(e.id) ?? { id: "" }, e)) : elements;
    // Drawn before the old ones are cleared: clearing all of them first would close the app's screen for a moment.
    // The old ones are hidden in the same request, so that the new frame never shows over the remains of the last.
    // busy-lib's element types are stricter than the firmware about optional fields; these follow the firmware.
    const sent = [...changed, ...gone.map(hidden)];
    if (sent.length > 0) await device.DisplayDraw({ application_name: app, priority: 50, elements: sent } as never);
    if (gone.length > 0) await device.DisplayClear({ application_name: app, element_ids: gone.map((e) => e.id) });
    if (!forgotten) shown = new Map(elements.map((e): [string, Element] => [e.id, e]));
  }

  return {
    /** Shows exactly these elements. Errors are reported, not thrown. */
    draw(elements: Element[]): void {
      next = elements;
      if (busy) return;
      busy = true;
      void (async () => {
        while (next) {
          const frame = next;
          next = null;
          await send(frame).catch(report);
        }
        busy = false;
      })();
    },
    /** Forgets what is on the screen: the next frame clears it and is sent whole. */
    forget(): void {
      shown = null;
      forgotten = true;
    },
  };
}
