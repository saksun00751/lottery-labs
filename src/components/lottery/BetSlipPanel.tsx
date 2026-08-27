'use client';

import { AlertTriangle, ScrollText, Trash2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { Input } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Money } from '@/components/ui/Money';
import { useRouter } from '@/i18n/navigation';
import { ApiError } from '@/lib/api/client';
import { useSelectedPackage, useSubmitSlip, useWallet } from '@/lib/api/queries';
import { cn } from '@/lib/utils/cn';
import { formatAmountInput, parseAmountInput, toMajor } from '@/lib/utils/money';
import { useBetSlipStore } from '@/store/bet-slip-store';
import { pushToast } from '@/lib/toast';
import type { LotteryRound, Wallet } from '@/types';

import styles from './BetSlipPanel.module.scss';

/** Quick stake buttons, in minor units: 5 / 10 / 20 / 50 / 100 ฿. */
const QUICK_STAKES = [500, 1_000, 2_000, 5_000, 10_000];

export function BetSlipPanel({ round }: { round: LotteryRound }) {
  const t = useTranslations('lottery.slip');
  const tTypes = useTranslations('lottery.betTypes');
  const tCommon = useTranslations('common');
  const router = useRouter();

  const entries = useBetSlipStore((s) => s.entries);
  const defaultStake = useBetSlipStore((s) => s.defaultStake);
  const applyStakeToAll = useBetSlipStore((s) => s.applyStakeToAll);
  const setDefaultStake = useBetSlipStore((s) => s.setDefaultStake);
  const updateStake = useBetSlipStore((s) => s.updateStake);
  const remove = useBetSlipStore((s) => s.remove);
  const clear = useBetSlipStore((s) => s.clear);

  const { data } = useWallet();
  const wallet = data as Wallet | undefined;
  const submit = useSubmitSlip();
  const { data: selectedPackage } = useSelectedPackage(round.groupId);

  const [open, setOpen] = useState(false);
  const [stakeText, setStakeText] = useState(String(toMajor(defaultStake)));

  const totalStake = entries.reduce((sum, entry) => sum + entry.stake, 0);

  // ส่วนลดจากแพ็กเกจที่เลือก — per-bet-type, same lookup lotto-seed-app's
  // `BetSlipSidebar` does against its merged betting context.
  const discountByType = new Map(
    (selectedPackage?.betSettings ?? []).map((row) => [row.betType, row.discountPercent]),
  );
  const discountAmount = entries.reduce(
    (sum, entry) => sum + Math.round((entry.stake * (discountByType.get(entry.betType) ?? 0)) / 100),
    0,
  );
  const discountPct = totalStake > 0 ? (discountAmount / totalStake) * 100 : 0;
  const netStake = Math.max(0, totalStake - discountAmount);

  const insufficient = totalStake > (wallet?.balance ?? 0);

  const onConfirm = () => {
    if (!round.drawId) {
      pushToast({ tone: 'danger', title: tCommon('error'), description: tCommon('errorHint') });
      return;
    }
    submit.mutate(
      {
        roundId: round.id,
        roundName: round.name,
        roundLabel: round.label,
        drawId: round.drawId,
        packageId: selectedPackage?.id ?? null,
        items: entries.map((entry) => ({
          betType: entry.betType,
          number: entry.number,
          stake: entry.stake,
          payout: entry.payout,
        })),
      },
      {
        onSuccess: (ticket) => {
          clear();
          setOpen(false);
          pushToast({
            tone: 'success',
            title: t('submitted', { reference: ticket.reference }),
          });
          router.push('/slip');
        },
        onError: (error) => {
          pushToast({
            tone: 'danger',
            title:
              error instanceof ApiError ? error.message : tCommon('error'),
            description:
              error instanceof ApiError ? undefined : tCommon('errorHint'),
          });
        },
      },
    );
  };

  const applyStake = () => {
    const minor = parseAmountInput(stakeText);
    if (minor <= 0) return;
    applyStakeToAll(minor);
  };

  const slipBody = entries.length === 0 ? (
    <EmptyState title={t('empty')} description={t('emptyHint')} />
  ) : (
    <>
      <div className={styles.stakeRow}>
        <Input
          className={styles.stakeInput}
          label={t('stakePerNumber')}
          value={stakeText}
          inputMode="decimal"
          onChange={(event) => setStakeText(formatAmountInput(event.target.value))}
        />
        <Button size="lg" variant="secondary" onClick={applyStake}>
          {t('applyToAll')}
        </Button>
      </div>

      <div className={styles.quickStakes}>
        {QUICK_STAKES.map((stake) => (
          <button
            key={stake}
            type="button"
            className={styles.quickStake}
            onClick={() => {
              setStakeText(String(toMajor(stake)));
              setDefaultStake(stake);
              applyStakeToAll(stake);
            }}
          >
            {toMajor(stake)}
          </button>
        ))}
      </div>

      <div className={styles.list}>
        {entries.map((entry) => (
          <div key={entry.key} className={styles.entry}>
            <span className={styles.entryNumber}>{entry.number}</span>
            <div className={styles.entryInfo}>
              <div className={styles.entryType}>{tTypes(entry.betType)}</div>
              <div className={styles.entryPayout}>× {entry.payout}</div>
            </div>
            <div className={styles.entryStake}>
              <input
                className={styles.entryStakeInput}
                inputMode="decimal"
                value={toMajor(entry.stake)}
                aria-label={t('stake')}
                onChange={(event) => updateStake(entry.key, parseAmountInput(event.target.value))}
              />
            </div>
            <button
              type="button"
              className={styles.entryRemove}
              onClick={() => remove(entry.key)}
              aria-label={tCommon('cancel')}
            >
              <Trash2 size={17} />
            </button>
          </div>
        ))}
      </div>

      <div className={styles.totals}>
        <div className={styles.totalRow}>
          <span>{t('items', { count: entries.length })}</span>
        </div>
        <div className={styles.totalRow}>
          <span>{t('totalStake')}</span>
          <Money value={totalStake} size="md" className={styles.totalStrong} />
        </div>
        {discountAmount > 0 && (
          <>
            <div className={styles.totalRow}>
              <span>{t('discount', { percent: discountPct.toFixed(2) })}</span>
              <Money value={-discountAmount} size="md" tone="danger" />
            </div>
            <div className={cn(styles.totalRow, styles.totalRowStrong)}>
              <span>{t('netStake')}</span>
              <Money value={netStake} size="md" className={styles.totalStrong} />
            </div>
          </>
        )}
      </div>

      {insufficient && (
        <div className={styles.warning}>
          <AlertTriangle size={16} aria-hidden />
          {t('insufficient')}
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Persistent sidebar — desktop only (see .sidebar in the module). */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHead}>
          <span className={styles.sidebarTitle}>
            <ScrollText size={16} aria-hidden />
            {t('current')}
          </span>
          <span className={styles.headCount}>{t('items', { count: entries.length })}</span>
        </div>

        <div className={styles.sidebarBody}>{slipBody}</div>

        {entries.length > 0 && (
          <div className={styles.sidebarFooter}>
            <Button
              loading={submit.isPending}
              disabled={entries.length === 0 || insufficient}
              onClick={onConfirm}
              leftIcon={<ScrollText size={18} />}
            >
              {t('confirmSlip')}
            </Button>
            <Button variant="ghost" onClick={clear} leftIcon={<X size={16} />}>
              {t('clearAll')}
            </Button>
          </div>
        )}
      </aside>

      {/* Compact summary bar → full-screen modal — mobile only. */}
      <div className={styles.bar}>
        <span className={styles.count}>{entries.length}</span>
        <div className={styles.barInfo}>
          <span className={styles.barLabel}>{t('totalStake')}</span>
          <span className={styles.barValue}>
            <Money value={totalStake} size="md" />
          </span>
        </div>
        <Button
          disabled={entries.length === 0}
          onClick={() => setOpen(true)}
          leftIcon={<ScrollText size={18} />}
        >
          {t('confirmSlip')}
        </Button>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('confirmTitle')}
        description={t('confirmHint')}
        closeLabel={tCommon('close')}
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              loading={submit.isPending}
              disabled={entries.length === 0 || insufficient}
              onClick={onConfirm}
            >
              {tCommon('confirm')}
            </Button>
          </>
        }
      >
        {slipBody}
      </Modal>
    </>
  );
}
