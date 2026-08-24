'use client';

import { Coins, Delete } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { memo, useMemo, useState } from 'react';

import { cn } from '@/lib/utils/cn';
import {
  allNumbers,
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
} from '@/lib/utils/lottery';
import { useBetSlipStore } from '@/store/bet-slip-store';
import type { BetType, RestrictedNumber } from '@/types';

import styles from './NumberBoard.module.scss';

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

interface CellProps {
  number: string;
  selected: boolean;
  closed: boolean;
  reduced: boolean;
  onToggle: (number: string) => void;
}

/**
 * Memoised so that selecting one number does not re-render the other 999 on
 * the 3-digit board.
 */
const Cell = memo(function Cell({
  number,
  selected,
  closed,
  reduced,
  onToggle,
}: CellProps) {
  return (
    <button
      type="button"
      disabled={closed}
      aria-pressed={selected}
      className={cn(
        styles.cell,
        selected && styles.selected,
        reduced && styles.reduced,
        closed && styles.closed,
      )}
      onClick={() => onToggle(number)}
    >
      {number}
    </button>
  );
});

export function NumberBoard({
  betType,
  restricted,
}: {
  betType: BetType;
  restricted: RestrictedNumber[];
}) {
  const t = useTranslations('lottery.board');
  const [manual, setManual] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);

  const entries = useBetSlipStore((s) => s.entries);
  const toggle = useBetSlipStore((s) => s.toggle);
  const addMany = useBetSlipStore((s) => s.addMany);

  const restrictionMap = useMemo(
    () => buildRestrictionMap(restricted),
    [restricted],
  );

  const numbers = useMemo(() => allNumbers(betType.digits), [betType.digits]);

  const rows = useMemo(() => {
    const chunks: string[][] = [];
    for (let i = 0; i < numbers.length; i += 10) {
      chunks.push(numbers.slice(i, i + 10));
    }
    return chunks;
  }, [numbers]);

  const selectedSet = useMemo(() => {
    const set = new Set<string>();
    for (const entry of entries) {
      if (entry.betType === betType.id) set.add(entry.number);
    }
    return set;
  }, [entries, betType.id]);

  const effectivePayout = (number: string) =>
    lookupRestriction(restrictionMap, betType.id, number, betType.payout).payout ??
    betType.payout;

  const onToggle = (number: string) => {
    toggle(betType.id, number, effectivePayout(number));
  };

  const addGroup = (values: string[]) => {
    const open = values.filter(
      (value) =>
        !lookupRestriction(restrictionMap, betType.id, value, betType.payout).closed,
    );
    // Every number in the group keeps its own (possibly reduced) rate.
    for (const value of open) {
      if (!selectedSet.has(value)) {
        addMany(betType.id, [value], effectivePayout(value));
      }
    }
  };

  const submitManual = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length !== betType.digits) {
      setManualError(t('manualHint', { digits: betType.digits }));
      return;
    }
    setManualError(null);
    setManual('');
    onToggle(cleaned);
  };

  const handleNumpadPress = (digit: string) => {
    if (manual.length >= betType.digits) return;
    const next = manual + digit;
    if (next.length === betType.digits) {
      submitManual(next);
    } else {
      setManual(next);
      setManualError(null);
    }
  };

  return (
    <div className={styles.board}>
      <div className={styles.rateBar}>
        <span className={styles.rateLabel}>
          <Coins size={15} aria-hidden />
          {t('payoutRate')}
        </span>
        <span className={styles.rateValue}>× {betType.payout}</span>
      </div>

      <Helpers
        digits={betType.digits}
        manualValue={manual}
        onAddGroup={addGroup}
        onPermute={() => {
          const value = manual.replace(/\D/g, '');
          if (value.length === betType.digits) addGroup(permutations(value));
        }}
      />

      <Numpad
        digits={betType.digits}
        value={manual}
        error={manualError}
        onPress={handleNumpadPress}
        onBackspace={() => { setManual((v) => v.slice(0, -1)); setManualError(null); }}
      />

      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.legendSwatch} aria-hidden />
          {t('restricted')}
        </span>
        <span className={styles.legendItem}>
          <span
            className={cn(styles.legendSwatch, styles.legendSwatchClosed)}
            aria-hidden
          />
          {t('closedNumber')}
        </span>
      </div>

      <div className={styles.gridWrap}>
        {rows.map((row) => (
          <div key={row[0]} className={styles.row}>
            {row.map((number) => {
              const restriction = lookupRestriction(
                restrictionMap,
                betType.id,
                number,
                betType.payout,
              );
              return (
                <Cell
                  key={number}
                  number={number}
                  selected={selectedSet.has(number)}
                  closed={restriction.closed}
                  reduced={restriction.reduced}
                  onToggle={onToggle}
                />
              );
            })}
          </div>
        ))}
      </div>
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
  manualValue,
  onAddGroup,
  onPermute,
}: {
  digits: 1 | 2 | 3;
  manualValue: string;
  onAddGroup: (values: string[]) => void;
  onPermute: () => void;
}) {
  const t = useTranslations('lottery.board');
  const [runDigit, setRunDigit] = useState<string | null>(null);

  if (digits === 1) return null;

  return (
    <div className={styles.helpers}>
      <div className={styles.helperRow}>
        {digits === 3 && (
          <button
            type="button"
            className={styles.helperChip}
            onClick={onPermute}
            disabled={manualValue.length !== 3}
          >
            {t('reverse')}
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

      {digits === 2 && (
        <>
          <div className={styles.digitPicker}>
            <span className={styles.digitLabel}>{t('helpers')}</span>
            {DIGITS.map((digit) => (
              <button
                key={digit}
                type="button"
                className={cn(styles.digit, runDigit === digit && styles.digitActive)}
                onClick={() => setRunDigit(digit === runDigit ? null : digit)}
              >
                {digit}
              </button>
            ))}
          </div>

          {runDigit && (
            <div className={styles.helperRow}>
              <button
                type="button"
                className={styles.helperChip}
                onClick={() => onAddGroup(leadingRun(runDigit))}
              >
                {t('leadingRun')} {runDigit}x
              </button>
              <button
                type="button"
                className={styles.helperChip}
                onClick={() => onAddGroup(trailingRun(runDigit))}
              >
                {t('trailingRun')} x{runDigit}
              </button>
              <button
                type="button"
                className={styles.helperChip}
                onClick={() => onAddGroup(nineteenGate(runDigit))}
              >
                {t('nineteenGate')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
