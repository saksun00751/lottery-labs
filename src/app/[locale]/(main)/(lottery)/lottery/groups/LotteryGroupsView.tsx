'use client';

import { Layers } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { PageHeader } from '@/components/layout/PageHeader';
import { LotteryGroups } from '@/components/home/LotteryGroups';

import styles from './groups.module.scss';

export function LotteryGroupsView() {
  const t = useTranslations('nav');

  return (
    <div className={styles.page}>
      <PageHeader icon={<Layers size={22} />} title={t('lotteryGroups')} />
      <LotteryGroups />
    </div>
  );
}
