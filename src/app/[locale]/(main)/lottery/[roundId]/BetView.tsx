'use client';

import { AlertTriangle, Ticket } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import { BetSlipPanel } from '@/components/lottery/BetSlipPanel';
import { NumberBoard } from '@/components/lottery/NumberBoard';
import { Countdown } from '@/components/ui/Countdown';
import { EmptyState, Skeleton } from '@/components/ui/Feedback';
import { Tabs } from '@/components/ui/Tabs';
import { useRates, useRound } from '@/lib/api/queries';
import { isBettable, sortBetTypes } from '@/lib/utils/lottery';
import { useBetSlipStore } from '@/store/bet-slip-store';
import type { BetTypeId, LotteryRound, RoundRates } from '@/types';

import styles from '../lottery.module.scss';

export function BetView({ roundId }: { roundId: string }) {
  const t = useTranslations('lottery');
  const tCommon = useTranslations('common');

  const { data: roundData, isLoading: roundLoading } = useRound(roundId);
  const { data: ratesData, isLoading: ratesLoading } = useRates(roundId);
  const setRound = useBetSlipStore((s) => s.setRound);

  const round = roundData as LotteryRound | undefined;
  const rates = ratesData as RoundRates | undefined;

  const [activeType, setActiveType] = useState<BetTypeId | null>(null);

  // Switching rounds clears the slip — rates and restrictions do not carry over.
  useEffect(() => {
    setRound(roundId);
  }, [roundId, setRound]);

  const availableTypes = useMemo(() => {
    if (!round || !rates) return [];
    const offered = new Set(round.betTypes);
    return sortBetTypes(
      rates.betTypes.filter((type) => offered.has(type.id)).map((type) => type.id),
    );
  }, [round, rates]);

  useEffect(() => {
    if (!activeType && availableTypes.length > 0) setActiveType(availableTypes[0]);
  }, [activeType, availableTypes]);

  if (roundLoading || ratesLoading) {
    return (
      <div className={styles.page}>
        <Skeleton height={92} radius={20} />
        <Skeleton height={420} radius={20} />
      </div>
    );
  }

  if (!round || !rates) {
    return <EmptyState title={tCommon('notFound')} description={tCommon('notFoundHint')} />;
  }

  const bettable = isBettable(round.status);
  const betType = rates.betTypes.find((type) => type.id === activeType);

  return (
    <div className={styles.page}>
      <div className={styles.roundHeader}>
        <span className={styles.roundEmblem} aria-hidden>
          <Ticket size={24} />
        </span>
        <div className={styles.roundInfo}>
          <div className={styles.roundName}>{round.name}</div>
          <div className={styles.roundLabel}>
            {t('roundLabel')} {round.label}
          </div>
        </div>
        {bettable && (
          <div className={styles.roundTimer}>
            <span className={styles.roundTimerLabel}>{t('closesIn')}</span>
            <Countdown target={round.closesAt} size="lg" />
          </div>
        )}
      </div>

      {!bettable ? (
        <div className={styles.closedNotice}>
          <AlertTriangle size={18} aria-hidden />
          {t('slip.roundClosed')}
        </div>
      ) : (
        <>
          <div className={styles.boardArea}>
            <Tabs
              className={styles.betTabs}
              variant="bordered"
              items={availableTypes.map((id) => ({
                value: id,
                label: t(`betTypes.${id}`),
              }))}
              value={activeType ?? availableTypes[0]}
              onChange={setActiveType}
              ariaLabel={t('board.pickNumbers')}
            />

            {betType && (
              <NumberBoard betType={betType} restricted={rates.restricted} />
            )}
          </div>

          <BetSlipPanel round={round} />
        </>
      )}
    </div>
  );
}
