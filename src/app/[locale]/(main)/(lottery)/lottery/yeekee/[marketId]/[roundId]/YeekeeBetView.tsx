'use client';

import { AlertTriangle, Ticket } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import { BetSlipPanel } from '@/components/lottery/BetSlipPanel';
import { BetTypeGrid } from '@/components/lottery/BetTypeGrid';
import { NumberBoard } from '@/components/lottery/NumberBoard';
import { RestrictedNumbersPanel } from '@/components/lottery/RestrictedNumbersPanel';
import { SelectedPackageCard } from '@/components/lottery/SelectedPackageCard';
import { YeekeeShootPanel } from '@/components/lottery/yeekee/YeekeeShootPanel';
import { YeekeeShootsList } from '@/components/lottery/yeekee/YeekeeShootsList';
import { Countdown } from '@/components/ui/Countdown';
import { EmptyState, Skeleton } from '@/components/ui/Feedback';
import { Tabs } from '@/components/ui/Tabs';
import { useRouter } from '@/i18n/navigation';
import { useRates, useRound, useSelectedPackage, useYeekeeRounds } from '@/lib/api/queries';
import { useCountdown } from '@/lib/hooks/use-countdown';
import { pushToast } from '@/lib/toast';
import { BET_TYPE_ORDER, betTypeGroup, isBettable, mergePackageRates } from '@/lib/utils/lottery';
import { useBetSlipStore } from '@/store/bet-slip-store';
import type { BetTypeId, LotteryPackage, LotteryRound, RoundRates } from '@/types';

import styles from '../../../lottery.module.scss';

type BetTab = 'bet' | 'shoot';

export function YeekeeBetView({ marketId, roundId }: { marketId: string; roundId: string }) {
  const t = useTranslations('lottery');
  const tYeekee = useTranslations('lottery.yeekee');
  const tCommon = useTranslations('common');
  const router = useRouter();

  const { data: roundData, isLoading: roundLoading } = useRound(marketId);
  const { data: ratesData, isLoading: ratesLoading } = useRates(marketId);
  const { data: yeekeeRoundsData, isLoading: yeekeeRoundsLoading } = useYeekeeRounds(marketId);
  const setRound = useBetSlipStore((s) => s.setRound);

  const round = roundData as LotteryRound | undefined;
  const rates = ratesData as RoundRates | undefined;
  const yeekeeRound = yeekeeRoundsData?.find((r) => r.id === roundId);

  const statusBettable = !!round && isBettable(round.status);
  const countdown = useCountdown(statusBettable ? (round as LotteryRound).closesAt : null);
  const expired = statusBettable && (countdown?.expired ?? false);
  const bettable = statusBettable && !expired;

  const { data: selectedPackageData, isLoading: selectedPackageLoading } = useSelectedPackage(
    round?.groupId,
  );
  const selectedPackage = selectedPackageData as LotteryPackage | null | undefined;

  useEffect(() => {
    if (!round?.groupId || selectedPackageLoading || selectedPackageData) return;
    pushToast({ tone: 'warning', title: t('package.required') });
    router.replace(`/lottery/yeekee/${marketId}`);
  }, [round?.groupId, selectedPackageLoading, selectedPackageData, router, t, marketId]);

  const [selectedTypes, setSelectedTypes] = useState<BetTypeId[]>([]);
  const [tab, setTab] = useState<BetTab>('bet');

  const toggleType = (id: BetTypeId) => {
    setSelectedTypes((prev) => {
      const currentGroup = prev.length > 0 ? betTypeGroup(prev[0]) : null;
      if (currentGroup && currentGroup !== betTypeGroup(id)) return [id];
      return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
    });
  };

  useEffect(() => {
    setRound(marketId);
    setSelectedTypes([]);
  }, [marketId, setRound]);

  const availableTypes = useMemo(() => {
    if (!rates) return [];
    const merged = mergePackageRates(rates.betTypes, selectedPackage ?? null);
    return [...merged].sort(
      (a, b) => BET_TYPE_ORDER.indexOf(a.id) - BET_TYPE_ORDER.indexOf(b.id),
    );
  }, [rates, selectedPackage]);

  const gatingOnPackage = !!round?.groupId && (selectedPackageLoading || !selectedPackageData);

  if (roundLoading || ratesLoading || yeekeeRoundsLoading || gatingOnPackage) {
    return (
      <div className={styles.page}>
        <Skeleton height={92} radius={20} />
        <Skeleton height={420} radius={20} />
      </div>
    );
  }

  if (!round || !rates || !yeekeeRound) {
    return <EmptyState title={tCommon('notFound')} description={tCommon('notFoundHint')} />;
  }

  const boardTypes = availableTypes.filter((type) => selectedTypes.includes(type.id));
  const shootOpen = new Date(yeekeeRound.shootClosesAt).getTime() > Date.now();

  return (
    <div className={styles.page}>
      <div className={styles.roundHeader}>
        <span className={styles.roundEmblem} aria-hidden>
          <Ticket size={24} />
        </span>
        <div className={styles.roundInfo}>
          <div className={styles.roundName}>{round.name}</div>
          <div className={styles.roundLabel}>
            {tYeekee('roundNumber', { no: yeekeeRound.roundNo })}
          </div>
        </div>
        {bettable && (
          <div className={styles.roundTimer}>
            <span className={styles.roundTimerLabel}>{t('closesIn')}</span>
            <Countdown target={round.closesAt} size="lg" />
          </div>
        )}
      </div>

      <Tabs
        items={[
          { value: 'bet', label: t('title') },
          { value: 'shoot', label: tYeekee('shootTab') },
        ]}
        value={tab}
        onChange={setTab}
        ariaLabel={tYeekee('shootTab')}
        className={styles.centerTabs}
      />

      {tab === 'bet' ? (
        !bettable ? (
          <div className={styles.closedNotice}>
            <AlertTriangle size={18} aria-hidden />
            {t('slip.roundClosed')}
          </div>
        ) : (
          <div className={styles.betLayout}>
            <div className={styles.leftColumn}>
              <SelectedPackageCard groupId={round.groupId} />
              <RestrictedNumbersPanel restricted={rates.restricted} />
            </div>

            <div className={styles.boardArea}>
              <BetTypeGrid types={availableTypes} value={selectedTypes} onToggle={toggleType} />
              {boardTypes.length > 0 && (
                <NumberBoard types={boardTypes} restricted={rates.restricted} />
              )}
            </div>

            <BetSlipPanel round={round} />
          </div>
        )
      ) : !shootOpen ? (
        <div className={styles.closedNotice}>
          <AlertTriangle size={18} aria-hidden />
          {tYeekee('shootClosed')}
        </div>
      ) : (
        <div className={styles.shootLayout}>
          <YeekeeShootPanel roundId={yeekeeRound.id} />
          <YeekeeShootsList roundId={yeekeeRound.id} />
        </div>
      )}
    </div>
  );
}
