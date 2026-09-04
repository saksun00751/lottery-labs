'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import { useSubmitYeekeeShoot } from '@/lib/api/queries';
import { cn } from '@/lib/utils/cn';
import { pushToast } from '@/lib/toast';

import styles from './YeekeeShootPanel.module.scss';

const MAX_DIGITS = 5;
const AUTO_SUBMIT_DELAY_MS = 500;
const COOLDOWN_SECONDS = 5;

export function YeekeeShootPanel({ roundId, disabled }: { roundId: string; disabled?: boolean }) {
  const t = useTranslations('lottery.yeekee');
  const [digits, setDigits] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const submit = useSubmitYeekeeShoot(roundId);
  const autoSubmitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const locked = disabled || submit.isPending || cooldown > 0;

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1_000);
    return () => clearInterval(id);
  }, [cooldown]);

  useEffect(
    () => () => {
      if (autoSubmitTimer.current) clearTimeout(autoSubmitTimer.current);
    },
    [],
  );

  const clearAutoSubmitTimer = () => {
    if (autoSubmitTimer.current) {
      clearTimeout(autoSubmitTimer.current);
      autoSubmitTimer.current = null;
    }
  };

  // Defense-in-depth: if a caller reuses this component instance across two
  // different rounds without remounting it (no `key={roundId}`), reset any
  // in-flight state so a stale pending timer can never submit a shoot bound
  // to the previous round.
  useEffect(() => {
    clearAutoSubmitTimer();
    setDigits('');
    setCooldown(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundId]);

  const doSubmit = (value: string) => {
    submit.mutate(value, {
      onSuccess: () => {
        setDigits('');
        setCooldown(COOLDOWN_SECONDS);
      },
      onError: () => {
        pushToast({ tone: 'danger', title: t('shootFailed') });
        setDigits('');
      },
    });
  };

  const appendDigit = (digit: string) => {
    if (locked || digits.length >= MAX_DIGITS) return;
    const next = digits + digit;
    setDigits(next);
    if (next.length === MAX_DIGITS) {
      clearAutoSubmitTimer();
      autoSubmitTimer.current = setTimeout(() => doSubmit(next), AUTO_SUBMIT_DELAY_MS);
    }
  };

  const backspace = () => {
    if (locked) return;
    clearAutoSubmitTimer();
    setDigits((d) => d.slice(0, -1));
  };

  const randomFill = () => {
    if (locked) return;
    clearAutoSubmitTimer();
    const random = Array.from({ length: MAX_DIGITS }, () => String(Math.floor(Math.random() * 10))).join('');
    setDigits(random);
    autoSubmitTimer.current = setTimeout(() => doSubmit(random), AUTO_SUBMIT_DELAY_MS);
  };

  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <h3>{t('shootTitle')}</h3>
      </div>

      <div className={styles.body}>
        <div className={styles.digitWrap}>
          <div className={styles.ticket}>
            <div className={styles.digitRow}>
              {Array.from({ length: MAX_DIGITS }).map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    styles.digitSlot,
                    digits[i] && styles.filled,
                    !digits[i] && i === digits.length && !locked && styles.next,
                  )}
                >
                  {digits[i] ?? '0'}
                </span>
              ))}
            </div>
            <p className={styles.serial}>YEEKEE · #{roundId.slice(-6).toUpperCase()}</p>
          </div>
          <p className={styles.hint}>{t('shootHint')}</p>
        </div>

        <div className={styles.numpad}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              className={styles.key}
              disabled={locked}
              onClick={() => appendDigit(digit)}
            >
              {digit}
            </button>
          ))}
          <button type="button" className={cn(styles.key, styles.random)} disabled={locked} onClick={randomFill}>
            {t('randomFill')}
          </button>
          <button type="button" className={styles.key} disabled={locked} onClick={() => appendDigit('0')}>
            0
          </button>
          <button type="button" className={cn(styles.key, styles.del)} disabled={locked} onClick={backspace}>
            {'⌫'}
          </button>
        </div>

        {submit.isPending && <p className={styles.status}>{t('shootSubmitting')}</p>}
        {!submit.isPending && cooldown > 0 && (
          <p className={styles.status}>{t('shootCooldown', { seconds: cooldown })}</p>
        )}
      </div>
    </section>
  );
}
