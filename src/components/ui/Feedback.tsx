'use client';

import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Inbox,
  X,
  XCircle,
} from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';
import { useUiStore } from '@/store/ui-store';

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

/* --------------------------------- Toaster ------------------------------- */

const toneIcon = {
  success: CheckCircle2,
  danger: XCircle,
  warning: AlertTriangle,
  info: Info,
} as const;

export function Toaster() {
  const toasts = useUiStore((s) => s.toasts);
  const dismiss = useUiStore((s) => s.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div className={styles.toaster} role="status" aria-live="polite">
      {toasts.map((toast) => {
        const Icon = toneIcon[toast.tone];
        return (
          <div key={toast.id} className={cn(styles.toast, styles[toast.tone])}>
            <span className={styles.toastIcon}>
              <Icon size={19} aria-hidden />
            </span>
            <div className={styles.toastBody}>
              <div className={styles.toastTitle}>{toast.title}</div>
              {toast.description && (
                <div className={styles.toastText}>{toast.description}</div>
              )}
            </div>
            <button
              type="button"
              className={styles.toastClose}
              onClick={() => dismiss(toast.id)}
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
