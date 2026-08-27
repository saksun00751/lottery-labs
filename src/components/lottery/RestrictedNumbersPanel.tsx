'use client';

import { Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { cn } from '@/lib/utils/cn';
import { toMajor } from '@/lib/utils/money';
import type { BetTypeId, RestrictedNumber } from '@/types';

import styles from './RestrictedNumbersPanel.module.scss';

type Group = 'three' | 'two' | 'run';

const GROUP_TYPES: Record<Group, [BetTypeId, BetTypeId]> = {
  three: ['3top', '3tod'],
  two: ['2top', '2bottom'],
  run: ['run_top', 'run_bottom'],
};

const GROUPS: Group[] = ['three', 'two', 'run'];

export function RestrictedNumbersPanel({ restricted }: { restricted: RestrictedNumber[] }) {
  const t = useTranslations('lottery.board');
  const tTypes = useTranslations('lottery.betTypes');
  const [group, setGroup] = useState<Group>('three');

  const [colA, colB] = GROUP_TYPES[group];

  const rows = useMemo(() => {
    const map = new Map<string, Map<BetTypeId, RestrictedNumber>>();
    for (const item of restricted) {
      if (item.betType !== colA && item.betType !== colB) continue;
      const byType = map.get(item.number) ?? new Map<BetTypeId, RestrictedNumber>();
      byType.set(item.betType, item);
      map.set(item.number, byType);
    }
    return Array.from(map, ([number, byType]) => ({ number, byType })).sort((a, b) =>
      a.number.localeCompare(b.number),
    );
  }, [restricted, colA, colB]);

  return (
    <aside className={styles.panel}>
      <div className={styles.head}>
        <Lock size={15} aria-hidden />
        <span className={styles.title}>{t('restricted')}</span>
        {restricted.length > 0 && (
          <span className={styles.count}>{t('itemsCount', { count: restricted.length })}</span>
        )}
      </div>

      <div className={styles.tabs} role="tablist" aria-label={t('restricted')}>
        {GROUPS.map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={group === value}
            className={cn(styles.tab, group === value && styles.tabActive)}
            onClick={() => setGroup(value)}
          >
            {t(`group.${value}`)}
          </button>
        ))}
      </div>

      <div className={styles.tableWrap}>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t('numberColumn')}</th>
                <th>{tTypes(colA)}</th>
                <th>{tTypes(colB)}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={3} className={styles.empty}>
                    {t('noRestrictedNumbers')}
                  </td>
                </tr>
              ) : (
                rows.map(({ number, byType }) => (
                  <tr key={number}>
                    <td className={styles.number}>{number}</td>
                    <td>
                      <LimitBadge item={byType.get(colA)} closedLabel={t('closedLabel')} />
                    </td>
                    <td>
                      <LimitBadge item={byType.get(colB)} closedLabel={t('closedLabel')} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </aside>
  );
}

function LimitBadge({
  item,
  closedLabel,
}: {
  item: RestrictedNumber | undefined;
  closedLabel: string;
}) {
  if (!item) return <span className={styles.dash}>—</span>;
  if (item.closed) return <span className={cn(styles.badge, styles.badgeClosed)}>{closedLabel}</span>;
  return (
    <span className={cn(styles.badge, styles.badgeLimit)}>
      ≤{item.maxAmount != null ? toMajor(item.maxAmount).toLocaleString() : ''}
    </span>
  );
}
