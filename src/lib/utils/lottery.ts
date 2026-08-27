import type {
  BetType,
  BetTypeId,
  LotteryPackage,
  Minor,
  RestrictedNumber,
  RoundStatus,
} from '@/types';

/* --------------------------- bet type metadata --------------------------- */

export const BET_TYPE_DIGITS: Record<BetTypeId, 1 | 2 | 3> = {
  '3top': 3,
  '3tod': 3,
  '3bottom': 3,
  '2top': 2,
  '2bottom': 2,
  run_top: 1,
  run_bottom: 1,
};

/** Order the tabs appear in on the betting board. */
export const BET_TYPE_ORDER: BetTypeId[] = [
  '3top',
  '3tod',
  '3bottom',
  '2top',
  '2bottom',
  'run_top',
  'run_bottom',
];

export function sortBetTypes(ids: BetTypeId[]) {
  return [...ids].sort(
    (a, b) => BET_TYPE_ORDER.indexOf(a) - BET_TYPE_ORDER.indexOf(b),
  );
}

/**
 * บน/ล่าง ของหลักเดียวกันอยู่กลุ่มเดียวกัน — เลือกได้พร้อมกันหลายประเภทในกลุ่ม
 * เดียวกัน (เช่น 3 ตัวบน + 3 ตัวโต๊ด) แต่ข้ามกลุ่มไม่ได้ (เช่น 3 ตัว + 2 ตัว).
 */
export type BetTypeGroup = 'three' | 'two' | 'run';

const BET_TYPE_GROUP: Record<BetTypeId, BetTypeGroup> = {
  '3top': 'three',
  '3tod': 'three',
  '3bottom': 'three',
  '2top': 'two',
  '2bottom': 'two',
  run_top: 'run',
  run_bottom: 'run',
};

export function betTypeGroup(id: BetTypeId): BetTypeGroup {
  return BET_TYPE_GROUP[id];
}

/* ------------------------------- restrictions ---------------------------- */

export interface NumberRestriction {
  closed: boolean;
  /** Highest stake still accepted when not closed; `null` when closed or uncapped. */
  maxAmount: Minor | null;
}

export function buildRestrictionMap(restricted: RestrictedNumber[]) {
  const map = new Map<string, RestrictedNumber>();
  for (const item of restricted) {
    map.set(`${item.betType}:${item.number}`, item);
  }
  return map;
}

export function lookupRestriction(
  map: Map<string, RestrictedNumber>,
  betType: BetTypeId,
  number: string,
): NumberRestriction {
  const hit = map.get(`${betType}:${number}`);
  if (!hit) return { closed: false, maxAmount: null };
  return { closed: hit.closed, maxAmount: hit.maxAmount };
}

/* ------------------------------ number helpers --------------------------- */

/** Every number of the given width, "00".."99" or "000".."999". */
export function allNumbers(digits: 1 | 2 | 3): string[] {
  const total = 10 ** digits;
  return Array.from({ length: total }, (_, i) => String(i).padStart(digits, '0'));
}

/** กลับตัวเลข — every distinct permutation, e.g. "123" -> 6 numbers. */
export function permutations(value: string): string[] {
  if (value.length <= 1) return [value];
  const result = new Set<string>();

  const walk = (prefix: string, rest: string) => {
    if (!rest) {
      result.add(prefix);
      return;
    }
    for (let i = 0; i < rest.length; i += 1) {
      walk(prefix + rest[i], rest.slice(0, i) + rest.slice(i + 1));
    }
  };

  walk('', value);
  return [...result];
}

/** รูดหน้า — "1" -> 10,11,...,19 (fixed leading digit). */
export function leadingRun(digit: string): string[] {
  return Array.from({ length: 10 }, (_, i) => `${digit}${i}`);
}

/** รูดหลัง — "1" -> 01,11,...,91 (fixed trailing digit). */
export function trailingRun(digit: string): string[] {
  return Array.from({ length: 10 }, (_, i) => `${i}${digit}`);
}

/** 19 ประตู — every 2-digit number containing the given digit. */
export function nineteenGate(digit: string): string[] {
  return [...new Set([...leadingRun(digit), ...trailingRun(digit)])];
}

/** เลขเบิ้ล — 00, 11, 22 … */
export function doubles(): string[] {
  return Array.from({ length: 10 }, (_, i) => `${i}${i}`);
}

/** เลขตอง — 000, 111, 222 … (3-digit triples). */
export function triples(): string[] {
  return Array.from({ length: 10 }, (_, i) => `${i}${i}${i}`);
}

export function highNumbers(): string[] {
  return allNumbers(2).filter((n) => Number(n) >= 50);
}

export function lowNumbers(): string[] {
  return allNumbers(2).filter((n) => Number(n) < 50);
}

export function oddNumbers(): string[] {
  return allNumbers(2).filter((n) => Number(n) % 2 === 1);
}

export function evenNumbers(): string[] {
  return allNumbers(2).filter((n) => Number(n) % 2 === 0);
}

/* --------------------------------- packages ------------------------------ */

/**
 * Overlays a selected package's per-bet-type payout/discount onto the base
 * betting-context rates — same merge lotto-seed-app's `applyPackageBetSettings`
 * does server-side. A bet type the package doesn't mention keeps its base rate.
 */
export function mergePackageRates(betTypes: BetType[], pkg: LotteryPackage | null): BetType[] {
  if (!pkg?.betSettings?.length) return betTypes;
  const overrides = new Map(pkg.betSettings.map((row) => [row.betType, row]));
  return betTypes.map((type) => {
    const override = overrides.get(type.id);
    if (!override) return type;
    return {
      ...type,
      payout: override.payout || type.payout,
      discountPercent: override.discountPercent,
    };
  });
}

/* --------------------------------- rounds -------------------------------- */

export function isBettable(status: RoundStatus) {
  return status === 'open' || status === 'closing';
}

export interface Countdown {
  total: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
  /** Under 10 minutes — the UI turns this urgent. */
  urgent: boolean;
}

export function computeCountdown(target: string | number, now = Date.now()): Countdown {
  const total = Math.max(0, new Date(target).getTime() - now);
  const seconds = Math.floor(total / 1000);
  return {
    total,
    days: Math.floor(seconds / 86_400),
    hours: Math.floor((seconds % 86_400) / 3_600),
    minutes: Math.floor((seconds % 3_600) / 60),
    seconds: seconds % 60,
    expired: total <= 0,
    urgent: total > 0 && total <= 10 * 60_000,
  };
}

export function pad2(value: number) {
  return String(value).padStart(2, '0');
}
