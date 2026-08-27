'use client';

import { ChevronRight, Ticket } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Feedback';
import { Link } from '@/i18n/navigation';
import { useLotteryGroups } from '@/lib/api/queries';

import styles from './LotteryGroups.module.scss';

export function LotteryGroups() {
  const t = useTranslations('lottery');
  const tCommon = useTranslations('common');
  const { data, isLoading } = useLotteryGroups();
  const groups = data ?? [];

  if (isLoading) {
    return (
      <div className={styles.grid}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} height={110} radius={20} />
        ))}
      </div>
    );
  }

  if (groups.length === 0) return null;

  return (
    <div className={styles.grid}>
      {groups.map((group) => (
        <Link
          key={group.id}
          href={{ pathname: '/lottery', query: { group: group.id } }}
          className={styles.card}
        >
          <span className={styles.emblem} aria-hidden>
            {group.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={group.logoUrl} alt="" className={styles.logo} />
            ) : (
              <Ticket size={20} />
            )}
          </span>

          <span className={styles.name}>{group.name}</span>

          <span className={styles.foot}>
            <span className={styles.playNow}>
              {t('playNow')}
              <ChevronRight size={14} aria-hidden />
            </span>
            {group.openCount > 0 && (
              <Badge tone="success" dot pulse>
                {group.openCount} {tCommon('live')}
              </Badge>
            )}
          </span>
        </Link>
      ))}
    </div>
  );
}
