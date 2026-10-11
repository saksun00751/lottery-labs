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

const POSITIONS: Record<HanoiChannel, Record<HanoiDigits, number>> = {
  A: { 2: 4, 3: 3 },
  B: { 2: 1, 3: 1 },
  C: { 2: 1, 3: 1 },
  D: { 2: 1, 3: 1 },
  ABCD: { 2: 7, 3: 6 },
};

/** Draw positions a number is checked against: A2 → 4, A3 → 3, ABCD → all four channels. */
export const positionCount = (channel: HanoiChannel, digits: HanoiDigits) =>
  POSITIONS[channel][digits];

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

export function expandSelection(sel: Omit<HanoiSelection, 'amount'>): Expansion {
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

  const positions = positionCount(sel.channel, digits);
  if (numbers.length * positions > HANOI_MAX_LINES) return { ok: false, problem: 'tooMany' };
  return { ok: true, numbers, positions, units: numbers.length * positions };
}

/** What the member typed, as one short label for list rows. */
export function sourceLabel(sel: HanoiSelection): string {
  if (sel.method === 'cross') return `${sel.left} × ${sel.right}`;
  if (sel.method === 'range') return `${sel.rangeStart} – ${sel.rangeEnd}`;
  return sel.number ?? '';
}
