import type { HanoiChannel, HanoiDigits, HanoiMethod, HanoiSelection } from '@/types';

/**
 * Client-side mirror of the Hanoi A/B/C/D expansion rules. It only drives the
 * live preview while the member types — the amounts that are charged always
 * come from `POST lotto/hanoi-abcd/quote` and `/bet`.
 */

export const HANOI_CHANNELS: HanoiChannel[] = ['A', 'B', 'C', 'D', 'ABCD'];
export const HANOI_METHODS: HanoiMethod[] = ['straight', 'mix', 'cross', 'range'];

/** Default server limits (`hanoi-abcd.php`); the server is still the judge. */
export const HANOI_MAX_SELECTIONS = 50;
export const HANOI_MAX_LINES = 500;
export const HANOI_MAX_RANGE = 1000;

/**
 * Channel A reads different prizes per round: the 18:30 Hanoi ABCD round (XSMB)
 * uses G7 ×4 for 2 digits and G6 ×3 for 3 digits; the 13:30 / 16:30 / 17:30
 * rounds use a single G8 / G7 value. B, C and D are one value in every round.
 */
const A_POSITIONS: Record<'wide' | 'narrow', Record<HanoiDigits, number>> = {
  wide: { 2: 4, 3: 3 },
  narrow: { 2: 1, 3: 1 },
};

/** Draw positions a number is checked against: A → per round, B/C/D → 1, ABCD → all four channels. */
export function positionCount(channel: HanoiChannel, digits: HanoiDigits, wideA = true): number {
  const a = A_POSITIONS[wideA ? 'wide' : 'narrow'][digits];
  if (channel === 'A') return a;
  if (channel === 'ABCD') return a + 3;
  return 1;
}

/** True for the 18:30 (UTC+7) round, the only one where channel A covers several prizes. */
export function hasWideA(drawsAt: string): boolean {
  const t = new Date(drawsAt).getTime();
  if (Number.isNaN(t)) return true; // unknown → keep the previous behaviour
  const minutes = Math.floor(((t / 60000 + 7 * 60) % 1440 + 1440) % 1440);
  return minutes >= 18 * 60;
}

/** Bet types behind a channel, e.g. (ABCD, 2) → hanoi_a2 … hanoi_d2. */
export function betTypesFor(channel: HanoiChannel, digits: HanoiDigits): string[] {
  const channels = channel === 'ABCD' ? ['a', 'b', 'c', 'd'] : [channel.toLowerCase()];
  return channels.map((c) => `hanoi_${c}${digits}`);
}

export const onlyDigits = (value: string) => value.replace(/\D/g, '');

export type ExpandProblem = 'incomplete' | 'mixLength' | 'rangeOrder' | 'rangeTooLarge' | 'tooMany';

export type Expansion =
  | { ok: true; numbers: string[]; positions: number; units: number }
  | { ok: false; problem: ExpandProblem };

/** Every distinct ordered arrangement of `size` digits taken from `source`. */
function arrangements(source: string, size: number): string[] {
  const seen = new Set<string>();
  const walk = (prefix: string, used: number[]) => {
    if (prefix.length === size) {
      seen.add(prefix);
      return;
    }
    for (let i = 0; i < source.length; i++) {
      if (!used.includes(i)) walk(prefix + source[i], [...used, i]);
    }
  };
  walk('', []);
  return [...seen];
}

export function expandSelection(sel: Omit<HanoiSelection, 'amount'>, wideA = true): Expansion {
  const { digits, method } = sel;
  let numbers: string[];

  if (method === 'straight') {
    if ((sel.number ?? '').length !== digits) return { ok: false, problem: 'incomplete' };
    numbers = [sel.number as string];
  } else if (method === 'mix') {
    const n = sel.number ?? '';
    if (n.length < 3) return { ok: false, problem: n.length === 0 ? 'incomplete' : 'mixLength' };
    numbers = arrangements(n, digits);
  } else if (method === 'cross') {
    const l = sel.left ?? '';
    const r = sel.right ?? '';
    if (digits !== 2 || l.length !== 2 || r.length !== 2) return { ok: false, problem: 'incomplete' };
    const set = new Set<string>();
    for (const a of l) for (const b of r) set.add(a + b);
    numbers = [...set];
  } else {
    const start = sel.rangeStart ?? '';
    const end = sel.rangeEnd ?? '';
    if (start.length !== digits || end.length !== digits) return { ok: false, problem: 'incomplete' };
    const from = Number(start);
    const to = Number(end);
    if (to < from) return { ok: false, problem: 'rangeOrder' };
    if (to - from + 1 > HANOI_MAX_RANGE) return { ok: false, problem: 'rangeTooLarge' };
    numbers = Array.from({ length: to - from + 1 }, (_, i) => String(from + i).padStart(digits, '0'));
  }

  const positions = positionCount(sel.channel, digits, wideA);
  if (numbers.length * positions > HANOI_MAX_LINES) return { ok: false, problem: 'tooMany' };
  return { ok: true, numbers, positions, units: numbers.length * positions };
}

/** What the member typed, as one short label for list rows. */
export function sourceLabel(sel: HanoiSelection): string {
  if (sel.method === 'cross') return `${sel.left} × ${sel.right}`;
  if (sel.method === 'range') return `${sel.rangeStart} – ${sel.rangeEnd}`;
  return sel.number ?? '';
}
