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

import { WalletSummary } from '@/components/home/WalletSummary';
import { ResultCard } from '@/components/lottery/ResultCard';
import { RoundGrid } from '@/components/lottery/RoundCard';
import { EmptyState, Skeleton } from '@/components/ui/Feedback';
import { publicEnv } from '@/config/env.public';
import { Link } from '@/i18n/navigation';
import { usePromotions, useResults, useRounds } from '@/lib/api/queries';
import { isBettable } from '@/lib/utils/lottery';
import type { DrawResult, LotteryRound, Promotion } from '@/types';

import { PromotionCard } from '@/components/finance/PromotionCard';

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

  const { data: rounds, isLoading: roundsLoading } = useRounds();
  const { data: results, isLoading: resultsLoading } = useResults();
  const { data: promotions } = usePromotions();

  const openRounds = ((rounds as LotteryRound[] | undefined) ?? [])
    .filter((round) => isBettable(round.status))
    .slice(0, 3);

  const latestResults = ((results as DrawResult[] | undefined) ?? []).slice(0, 2);
  const featured = ((promotions as Promotion[] | undefined) ?? []).slice(0, 2);

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
        <SectionHead
          icon={Ticket}
          title={t('openRounds')}
          href="/lottery"
          seeAllLabel={tCommon('seeAll')}
        />
        {roundsLoading ? (
          <div className={styles.skeletonGrid}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={182} radius={20} />
            ))}
          </div>
        ) : openRounds.length > 0 ? (
          <RoundGrid rounds={openRounds} />
        ) : (
          <EmptyState title={tCommon('noData')} />
        )}
      </section>

      <section className={styles.section}>
        <SectionHead
          icon={Trophy}
          title={t('latestResults')}
          href="/results"
          seeAllLabel={tCommon('seeAll')}
        />
        {resultsLoading ? (
          <div className={styles.resultList}>
            {[0, 1].map((i) => (
              <Skeleton key={i} height={168} radius={20} />
            ))}
          </div>
        ) : (
          <div className={styles.resultList}>
            {latestResults.map((result) => (
              <ResultCard key={result.roundId} result={result} />
            ))}
          </div>
        )}
      </section>

      {publicEnv.features.promotion && featured.length > 0 && (
        <section className={styles.section}>
          <SectionHead
            icon={Gift}
            title={t('activePromotions')}
            href="/promotion"
            seeAllLabel={tCommon('seeAll')}
          />
          <div className={styles.resultList}>
            {featured.map((promotion) => (
              <PromotionCard key={promotion.id} promotion={promotion} compact />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
