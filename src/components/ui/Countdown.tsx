'use client';

import { useTranslations } from 'next-intl';

import { useCountdown } from '@/lib/hooks/use-countdown';
import { cn } from '@/lib/utils/cn';
import { pad2 } from '@/lib/utils/lottery';

import styles from './Countdown.module.scss';

export function Countdown({
  target,
  size = 'md',
}: {
  target: string;
  size?: 'md' | 'lg';
}) {
  const t = useTranslations('lottery');
  const countdown = useCountdown(target);

  if (!countdown) {
    // Server render / first paint — reserve the space without guessing a time.
    return <span className={cn(styles.countdown, styles.placeholder)}>--:--:--</span>;
  }

  if (countdown.expired) {
    return <span className={cn(styles.countdown, styles.expired)}>{t('closed')}</span>;
  }

  const segments = countdown.days > 0
    ? [countdown.days, countdown.hours, countdown.minutes]
    : [countdown.hours, countdown.minutes, countdown.seconds];

  return (
    <span
      className={cn(
        styles.countdown,
        size === 'lg' && styles.lg,
        countdown.urgent && styles.urgent,
      )}
      aria-live={countdown.urgent ? 'polite' : 'off'}
    >
      {segments.map((segment, index) => (
        <span key={index} className={styles.segment}>
          {pad2(segment)}
        </span>
      ))}
    </span>
  );
}
