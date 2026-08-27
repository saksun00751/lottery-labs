'use client';

import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronRight,
  Gift,
  History,
  ScrollText,
  Ticket,
  Trophy,
  Users,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { LucideIcon } from 'lucide-react';

import { LotteryGroups } from '@/components/home/LotteryGroups';
import { TodayLottery } from '@/components/home/TodayLottery';
import { WalletSummary } from '@/components/home/WalletSummary';
import { publicEnv } from '@/config/env.public';
import { Link } from '@/i18n/navigation';

import styles from './home.module.scss';

interface QuickAction {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  enabled?: boolean;
}

const QUICK_ACTIONS: QuickAction[] = [
  { href: '/deposit', labelKey: 'deposit', icon: ArrowDownToLine },
  { href: '/withdraw', labelKey: 'withdraw', icon: ArrowUpFromLine },
  { href: '/lottery', labelKey: 'lottery', icon: Ticket },
  { href: '/slip', labelKey: 'slip', icon: ScrollText },
  { href: '/results', labelKey: 'results', icon: Trophy },
  { href: '/history', labelKey: 'history', icon: History },
  {
    href: '/promotion',
    labelKey: 'promotion',
    icon: Gift,
    enabled: publicEnv.features.promotion,
  },
  {
    href: '/referral',
    labelKey: 'referral',
    icon: Users,
    enabled: publicEnv.features.referral,
  },
];

function SectionHead({
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

export function HomeView() {
  const t = useTranslations('home');
  const tNav = useTranslations('nav');
  const tCommon = useTranslations('common');

  const actions = QUICK_ACTIONS.filter((action) => action.enabled !== false);

  return (
    <div className={styles.page}>
      <WalletSummary />

      <section className={styles.section}>
        <SectionHead icon={Ticket} title={t('quickActions')} />
        <div className={styles.quickGrid}>
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href} className={styles.quickItem}>
                <span className={styles.quickIcon} aria-hidden>
                  <Icon size={20} />
                </span>
                <span className={styles.quickLabel}>{tNav(action.labelKey)}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className={styles.section}>
        <SectionHead icon={Ticket} title={t('lotteryGroups')} href="/lottery" seeAllLabel={tCommon('seeAll')} />
        <LotteryGroups />
      </section>

      <section className={styles.section}>
        <SectionHead icon={Trophy} title={t('todayLottery')} />
        <TodayLottery />
      </section>
    </div>
  );
}
