'use client';

import { Ticket, Trophy } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { LotteryGroups } from '@/components/home/LotteryGroups';
import { TodayLottery } from '@/components/home/TodayLottery';

import { SectionHead } from './SectionHead';
import styles from './home.module.scss';

export function LotteryHomeSection() {
  const t = useTranslations('home');
  const tCommon = useTranslations('common');

  return (
    <>
      <section className={styles.section}>
        <SectionHead
          icon={Ticket}
          title={t('lotteryGroups')}
          href="/lottery"
          seeAllLabel={tCommon('seeAll')}
        />
        <LotteryGroups />
      </section>

      <section className={styles.section}>
        <SectionHead icon={Trophy} title={t('todayLottery')} />
        <TodayLottery />
      </section>
    </>
  );
}
