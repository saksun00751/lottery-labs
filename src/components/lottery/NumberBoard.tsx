'use client';

import { Delete } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';

import { cn } from '@/lib/utils/cn';
import {
  buildRestrictionMap,
  doubles,
  evenNumbers,
  highNumbers,
  leadingRun,
  lookupRestriction,
  lowNumbers,
  nineteenGate,
  oddNumbers,
  permutations,
  trailingRun,
  triples,
} from '@/lib/utils/lottery';
import { useBetSlipStore } from '@/store/bet-slip-store';
import { pushToast } from '@/lib/toast';
import type { BetType, RestrictedNumber } from '@/types';

import styles from './NumberBoard.module.scss';

/** Beat before a completed number commits to the slip — lets the player see
 * the full number and back out with backspace before it's added. */
const SUBMIT_DELAY_MS = 500;

type RunFn = 'leadingRun' | 'trailingRun' | 'nineteenGate';

const RUN_FN: Record<RunFn, (digit: string) => string[]> = {
  leadingRun,
  trailingRun,
  nineteenGate,
};

export function NumberBoard({
  types,
  restricted,
}: {
  /** Every currently-checked bet type — 1 or 2 members of the same group, e.g. [3top, 3tod]. */
  types: BetType[];
  restricted: RestrictedNumber[];
}) {
  const t = useTranslations('lottery.board');
  const tTypes = useTranslations('lottery.betTypes');
  const [manual, setManual] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);
  const [runFn, setRunFn] = useState<RunFn | null>(null);
  const [reverseMode, setReverseMode] = useState(false);
  const pendingSubmitRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pendingSubmitRef.current) clearTimeout(pendingSubmitRef.current);
    };
  }, []);

  const entries = useBetSlipStore((s) => s.entries);
  const addMany = useBetSlipStore((s) => s.addMany);

  const restrictionMap = useMemo(
    () => buildRestrictionMap(restricted),
    [restricted],
  );

  const digits = types[0]?.digits;

  const isSelected = (typeId: BetType['id'], number: string) =>
    entries.some((entry) => entry.betType === typeId && entry.number === number);

  // e.g. "2 ตัวบน : 20, 21, 22 อยู่ในรายการแล้ว" — one toast per bet type that
  // had at least one duplicate, listing every number skipped for that type.
  const notifyDuplicates = (dupByType: Map<BetType['id'], string[]>) => {
    for (const [typeId, numbers] of dupByType) {
      pushToast({
        tone: 'warning',
        title: t('duplicateInType', { type: tTypes(typeId), numbers: numbers.join(', ') }),
      });
    }
  };

  // Same shape as `notifyDuplicates` — a number restriction can close the
  // number for one bet type but not another (e.g. blocked as 3top, still open
  // as 3tod), so this stays per-type rather than an all-or-nothing message.
  const notifyClosed = (closedByType: Map<BetType['id'], string[]>) => {
    for (const [typeId, numbers] of closedByType) {
      pushToast({
        tone: 'danger',
        title: t('closedInType', { type: tTypes(typeId), numbers: numbers.join(', ') }),
      });
    }
  };

  // A completed number goes to every checked type in the group at once.
  // Typing the same number again is a no-op, not a removal: with the number
  // grid gone there's no visual cue
  // that a re-entry would toggle it back out, so that would silently drop a
  // bet the player meant to keep. Removal only happens via the slip's trash icon.
  // A toast flags the no-op so it doesn't look like the tap did nothing.
  const onToggle = (number: string) => {
    const dupByType = new Map<BetType['id'], string[]>();
    const closedByType = new Map<BetType['id'], string[]>();
    for (const type of types) {
      const restriction = lookupRestriction(restrictionMap, type.id, number);
      if (restriction.closed) {
        closedByType.set(type.id, [number]);
        continue;
      }
      if (isSelected(type.id, number)) {
        dupByType.set(type.id, [number]);
        continue;
      }
      addMany(type.id, [number], type.payout);
    }
    notifyClosed(closedByType);
    notifyDuplicates(dupByType);
  };

  const addGroup = (values: string[]) => {
    const dupByType = new Map<BetType['id'], string[]>();
    for (const type of types) {
      const open = values.filter(
        (value) => !lookupRestriction(restrictionMap, type.id, value).closed,
      );
      for (const value of open) {
        if (isSelected(type.id, value)) {
          const list = dupByType.get(type.id) ?? [];
          list.push(value);
          dupByType.set(type.id, list);
          continue;
        }
        addMany(type.id, [value], type.payout);
      }
    }
    notifyDuplicates(dupByType);
  };

  const submitManual = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (!digits || cleaned.length !== digits) {
      setManualError(t('manualHint', { digits: digits ?? 0 }));
      return;
    }
    setManualError(null);
    setManual('');
    pendingSubmitRef.current = null;
    if (reverseMode) {
      addGroup(permutations(cleaned));
      return;
    }
    onToggle(cleaned);
  };

  // With "รูดหน้า/รูดหลัง/19 ประตู" active, the numpad no longer builds up a
  // full number — each tap is itself the one digit that function runs on.
  const handleNumpadPress = (digit: string) => {
    if (runFn) {
      addGroup(RUN_FN[runFn](digit));
      return;
    }
    if (!digits || manual.length >= digits) return;
    const next = manual + digit;
    setManual(next);
    setManualError(null);
    if (next.length === digits) {
      pendingSubmitRef.current = setTimeout(() => submitManual(next), SUBMIT_DELAY_MS);
    }
  };

  const handleBackspace = () => {
    if (pendingSubmitRef.current) {
      clearTimeout(pendingSubmitRef.current);
      pendingSubmitRef.current = null;
    }
    setManual((v) => v.slice(0, -1));
    setManualError(null);
  };

  if (!digits) return null;

  return (
    <div className={styles.board}>
      <Helpers
        digits={digits}
        runFn={runFn}
        onSetRunFn={setRunFn}
        onAddGroup={addGroup}
        reverseMode={reverseMode}
        onToggleReverse={() => setReverseMode((v) => !v)}
      />

      <Numpad
        digits={runFn ? 1 : digits}
        value={runFn ? '' : manual}
        error={manualError}
        onPress={handleNumpadPress}
        onBackspace={handleBackspace}
      />

    </div>
  );
}

/* --------------------------------- numpad -------------------------------- */

const NUMPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'backspace', '0', 'none'] as const;

function Numpad({
  digits,
  value,
  error,
  onPress,
  onBackspace,
}: {
  digits: number;
  value: string;
  error: string | null;
  onPress: (digit: string) => void;
  onBackspace: () => void;
}) {
  const t = useTranslations('lottery.board');

  return (
    <div className={styles.numpad}>
      <div className={styles.numpadDisplay} aria-label={t('manualEntry')}>
        {Array.from({ length: digits }).map((_, i) => (
          <span
            key={i}
            className={cn(styles.numpadSlot, value[i] !== undefined && styles.numpadSlotFilled)}
          >
            {value[i] ?? ''}
          </span>
        ))}
      </div>

      {error && <p className={styles.numpadError} role="alert">{error}</p>}

      <div className={styles.numpadGrid}>
        {NUMPAD_KEYS.map((key, i) => {
          if (key === 'backspace') {
            return (
              <button
                key="backspace"
                type="button"
                className={cn(styles.numpadKey, styles.numpadKeyAction)}
                onClick={onBackspace}
                disabled={value.length === 0}
                aria-label="delete"
              >
                <Delete size={20} />
              </button>
            );
          }
          if (key === 'none') {
            return <span key="none" />;
          }
          return (
            <button
              key={key}
              type="button"
              className={styles.numpadKey}
              onClick={() => onPress(key)}
              disabled={value.length >= digits}
            >
              {key}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------ number helpers --------------------------- */

function Helpers({
  digits,
  runFn,
  onSetRunFn,
  onAddGroup,
  reverseMode,
  onToggleReverse,
}: {
  digits: 1 | 2 | 3;
  runFn: RunFn | null;
  onSetRunFn: (fn: RunFn | null) => void;
  onAddGroup: (values: string[]) => void;
  reverseMode: boolean;
  onToggleReverse: () => void;
}) {
  const t = useTranslations('lottery.board');

  if (digits === 1) return null;

  return (
    <>
      <div className={styles.specialCard}>
        <div className={styles.specialHead}>{t('specialMode')}</div>
        <div className={styles.specialGrid}>
          {digits === 3 && (
            <button
              type="button"
              className={styles.helperChip}
              onClick={() => onAddGroup(triples())}
            >
              {t('triples')}
            </button>
          )}
          {digits === 2 && (
            <>
              <button
                type="button"
                className={styles.helperChip}
                onClick={() => onAddGroup(doubles())}
              >
                {t('doubles')}
              </button>
              <button
                type="button"
                className={styles.helperChip}
                onClick={() => onAddGroup(highNumbers())}
              >
                {t('high')}
              </button>
              <button
                type="button"
                className={styles.helperChip}
                onClick={() => onAddGroup(lowNumbers())}
              >
                {t('low')}
              </button>
              <button
                type="button"
                className={styles.helperChip}
                onClick={() => onAddGroup(oddNumbers())}
              >
                {t('odd')}
              </button>
              <button
                type="button"
                className={styles.helperChip}
                onClick={() => onAddGroup(evenNumbers())}
              >
                {t('even')}
              </button>
            </>
          )}
        </div>
      </div>

      {digits === 3 && (
        <div className={styles.specialCard}>
          <div className={styles.specialHead}>{t('helpers')}</div>
          <div className={styles.specialGrid}>
            <button
              type="button"
              className={cn(styles.helperChip, reverseMode && styles.helperChipActive)}
              onClick={onToggleReverse}
            >
              {t('reverse')}
            </button>
          </div>
          {reverseMode && <p className={styles.runHint}>{t('reverseHint')}</p>}
        </div>
      )}

      {digits === 2 && (
        <div className={styles.specialCard}>
          <div className={styles.specialHead}>{t('helpers')}</div>
          <div className={styles.specialGrid}>
            {(['leadingRun', 'trailingRun', 'nineteenGate'] as const).map((fn) => (
              <button
                key={fn}
                type="button"
                className={cn(styles.helperChip, runFn === fn && styles.helperChipActive)}
                onClick={() => onSetRunFn(runFn === fn ? null : fn)}
              >
                {t(fn)}
              </button>
            ))}
          </div>
          {runFn && <p className={styles.runHint}>{t('runHint')}</p>}
        </div>
      )}
    </>
  );
}
