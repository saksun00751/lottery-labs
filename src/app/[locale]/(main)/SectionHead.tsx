import { ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Link } from '@/i18n/navigation';

import styles from './home.module.scss';

export function SectionHead({
  icon: Icon,
  title,
  href,
  seeAllLabel,
}: {
  icon: LucideIcon;
  title: string;
  href?: string;
  seeAllLabel?: string;
}) {
  return (
    <div className={styles.sectionHead}>
      <h2 className={styles.sectionTitle}>
        <span className={styles.sectionIcon} aria-hidden>
          <Icon size={19} />
        </span>
        {title}
      </h2>
      {href && seeAllLabel && (
        <Link href={href} className={styles.seeAll}>
          {seeAllLabel}
          <ChevronRight size={15} aria-hidden />
        </Link>
      )}
    </div>
  );
}
