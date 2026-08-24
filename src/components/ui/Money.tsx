'use client';

import { useLocale } from 'next-intl';

import { cn } from '@/lib/utils/cn';
import { intlLocale } from '@/lib/utils/intl';
import { toMajor } from '@/lib/utils/money';
import type { Minor } from '@/types';

import styles from './Money.module.scss';

export interface MoneyProps {
  value: Minor;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  tone?: 'default' | 'accent' | 'success' | 'danger' | 'muted';
  showSign?: boolean;
  /** Drops the ".00" tail on whole amounts. */
  compact?: boolean;
  suffix?: string;
  className?: string;
}

export function Money({
  value,
  size = 'md',
  tone = 'default',
  showSign = false,
  compact = false,
  suffix,
  className,
}: MoneyProps) {
  const locale = useLocale();
  const fraction = compact && value % 100 === 0 ? 0 : 2;

  const formatted = new Intl.NumberFormat(intlLocale(locale), {
    minimumFractionDigits: fraction,
    maximumFractionDigits: 2,
  }).format(toMajor(Math.abs(value)));

  const sign = value < 0 ? '−' : showSign ? '+' : '';

  return (
    <span className={cn(styles.money, styles[size], styles[tone], className)}>
      {sign}
      {formatted}
      {suffix && <span className={styles.suffix}>{suffix}</span>}
    </span>
  );
}
