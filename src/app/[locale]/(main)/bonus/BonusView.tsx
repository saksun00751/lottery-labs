'use client';

import { Award, ChevronRight, Coins, HandCoins, Rocket, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Money } from '@/components/ui/Money';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Feedback';
import { ApiError } from '@/lib/api/client';
import { useBonusSummary, useClaimBonus } from '@/lib/api/queries';
import { pushToast } from '@/lib/toast';
import type { BonusSource, BonusSummary, Minor } from '@/types';

import styles from './bonus.module.scss';

interface ClaimTarget {
  source: BonusSource;
  label: string;
  amount: Minor;
}

export function BonusView() {
  const t = useTranslations('bonus');
  const { data, isLoading } = useBonusSummary();
  const claim = useClaimBonus();
  const [target, setTarget] = useState<ClaimTarget | null>(null);

  const summary: BonusSummary = data ?? { bonus: 0, cashback: 0, faststart: 0, ic: 0 };

  const items: Array<{
    source: BonusSource;
    label: string;
    desc: string;
    amount: Minor;
    icon: ReactNode;
  }> = [
    {
      source: 'bonus',
      label: t('bonusField'),
      desc: t('bonusFieldDesc'),
      amount: summary.bonus,
      icon: <Sparkles size={20} />,
    },
    {
      source: 'cashback',
      label: t('cashback'),
      desc: t('cashbackDesc'),
      amount: summary.cashback,
      icon: <Coins size={20} />,
    },
    {
      source: 'faststart',
      label: t('faststart'),
      desc: t('faststartDesc'),
      amount: summary.faststart,
      icon: <Rocket size={20} />,
    },
    {
      source: 'ic',
      label: t('icField'),
      desc: t('icFieldDesc'),
      amount: summary.ic,
      icon: <HandCoins size={20} />,
    },
  ];

  const steps = [
    { icon: '🎡', title: t('stepSpinTitle'), desc: t('stepSpinDesc') },
    { icon: '💸', title: t('stepCashbackTitle'), desc: t('stepCashbackDesc') },
    { icon: '👥', title: t('stepFriendTitle'), desc: t('stepFriendDesc') },
    { icon: '🤝', title: t('stepReferTitle'), desc: t('stepReferDesc') },
  ];

  const closeModal = () => {
    if (claim.isPending) return;
    setTarget(null);
  };

  const confirmClaim = () => {
    if (!target) return;
    claim.mutate(target.source, {
      onSuccess: () => {
        pushToast({ tone: 'success', title: t('claimSuccess') });
        setTarget(null);
      },
      onError: (error) => {
        pushToast({
          tone: 'danger',
          title: error instanceof ApiError ? error.message : t('claimFailed'),
        });
      },
    });
  };

  return (
    <div className={styles.page}>
      <PageHeader icon={<Award size={22} />} title={t('title')} subtitle={t('subtitle')} />

      {isLoading ? (
        <div className={styles.grid}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={132} radius={20} />
          ))}
        </div>
      ) : (
        <div className={styles.grid}>
          {items.map((item) => (
            <button
              key={item.source}
              type="button"
              className={styles.card}
              disabled={item.amount <= 0 || claim.isPending}
              onClick={() =>
                setTarget({ source: item.source, label: item.label, amount: item.amount })
              }
            >
              <div className={styles.cardTop}>
                <span className={styles.cardIcon} aria-hidden>
                  {item.icon}
                </span>
                <ChevronRight size={16} className={styles.cardChevron} aria-hidden />
              </div>
              <div className={styles.cardBody}>
                <span className={styles.cardLabel}>{item.label}</span>
                <span className={styles.cardDesc}>{item.desc}</span>
              </div>
              <Money
                value={item.amount}
                tone="accent"
                size="lg"
                compact
                suffix={t('unitBaht')}
                className={styles.cardAmount}
              />
            </button>
          ))}
        </div>
      )}

      <div className={styles.howCard}>
        <div className={styles.howHeader}>{t('howTitle')}</div>
        <ul className={styles.howList}>
          {steps.map((step, index) => (
            <li key={index} className={styles.howRow}>
              <span className={styles.howIcon} aria-hidden>
                {step.icon}
              </span>
              <div className={styles.howText}>
                <span className={styles.howStepTitle}>{step.title}</span>
                <span className={styles.howDesc}>{step.desc}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <Modal
        open={target !== null}
        onClose={closeModal}
        title={t('claimModalTitle')}
        description={t('claimModalSubtitle')}
        closeLabel={t('claimModalCancel')}
        footer={
          <div className={styles.modalActions}>
            <Button variant="outline" block onClick={closeModal} disabled={claim.isPending}>
              {t('claimModalCancel')}
            </Button>
            <Button
              variant="primary"
              block
              loading={claim.isPending}
              onClick={confirmClaim}
            >
              {claim.isPending ? t('claiming') : t('claimModalConfirm')}
            </Button>
          </div>
        }
      >
        {target && (
          <div className={styles.modalBody}>
            <div className={styles.modalRow}>
              <span className={styles.modalLabel}>{t('claimModalSourceLabel')}</span>
              <span className={styles.modalValue}>{target.label}</span>
            </div>
            <div className={styles.modalRow}>
              <span className={styles.modalLabel}>{t('claimModalAmountLabel')}</span>
              <Money value={target.amount} tone="success" size="lg" suffix={t('unitBaht')} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
