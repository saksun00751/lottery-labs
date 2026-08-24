'use client';

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

import styles from './Tabs.module.scss';

export interface TabItem<T extends string> {
  value: T;
  label: ReactNode;
  count?: number;
}

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  variant = 'pill',
  className,
  ariaLabel,
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  variant?: 'pill' | 'bordered';
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        styles.tabs,
        variant === 'pill' ? styles.pillList : styles.bordered,
        className,
      )}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={cn(styles.tab, active && styles.active)}
            onClick={() => onChange(item.value)}
          >
            {item.label}
            {item.count !== undefined && (
              <span className={styles.count}>{item.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
