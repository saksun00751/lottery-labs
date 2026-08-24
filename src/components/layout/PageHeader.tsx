import type { ReactNode } from 'react';

import styles from './PageHeader.module.scss';

export function PageHeader({
  icon,
  title,
  subtitle,
  actions,
}: {
  /** Rendered inside an accent tile beside the title. */
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className={styles.header}>
      <div className={styles.titleGroup}>
        {icon && (
          <span className={styles.icon} aria-hidden>
            {icon}
          </span>
        )}
        <div className={styles.titleText}>
          <h1 className={styles.title}>{title}</h1>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}
