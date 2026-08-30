'use client';

import { CalendarDays } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { PageHeader } from '@/components/layout/PageHeader';
import { TodayLottery } from '@/components/home/TodayLottery';

import styles from './today.module.scss';

export function TodayLotteryView() {
  const t = useTranslations('nav');

  return (
    <div className={styles.page}>
      <PageHeader icon={<CalendarDays size={22} />} title={t('todayLottery')} />
      <TodayLottery />
    </div>
  );
}
