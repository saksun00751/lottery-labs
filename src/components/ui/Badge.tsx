import type { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

import styles from './Badge.module.scss';

export type BadgeTone =
  | 'neutral'
  | 'accent'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info';

export function Badge({
  tone = 'neutral',
  dot = false,
  pulse = false,
  className,
  children,
}: {
  tone?: BadgeTone;
  dot?: boolean;
  pulse?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span className={cn(styles.badge, styles[tone], className)}>
      {dot && <span className={cn(styles.dot, pulse && styles.pulse)} aria-hidden />}
      {children}
    </span>
  );
}
