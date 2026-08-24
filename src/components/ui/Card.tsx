import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

import styles from './Card.module.scss';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'accent';
  interactive?: boolean;
  flush?: boolean;
}

export function Card({
  variant = 'default',
  interactive,
  flush,
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        styles.card,
        variant === 'accent' && styles.accent,
        interactive && styles.interactive,
        flush && styles.flush,
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={styles.header}>
      <div>
        <div className={styles.title}>{title}</div>
        {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
      </div>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
