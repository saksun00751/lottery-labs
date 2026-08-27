'use client';

import { Inbox } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

import styles from './Feedback.module.scss';

/* -------------------------------- Skeleton ------------------------------- */

export function Skeleton({
  width,
  height = 16,
  radius,
  className,
}: {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  className?: string;
}) {
  const style: CSSProperties = { width, height };
  if (radius !== undefined) style.borderRadius = radius;
  return <div className={cn(styles.skeleton, className)} style={style} aria-hidden />;
}

/* ------------------------------- EmptyState ------------------------------ */

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon}>{icon ?? <Inbox size={26} />}</div>
      <div className={styles.emptyTitle}>{title}</div>
      {description && <p className={styles.emptyText}>{description}</p>}
      {action}
    </div>
  );
}
