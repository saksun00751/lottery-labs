'use client';

import { Check, Gift } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useClaimPromotion } from '@/lib/api/queries';
import { formatMoney } from '@/lib/utils/money';
import { useUiStore } from '@/store/ui-store';
import type { Promotion } from '@/types';

import styles from './PromotionCard.module.scss';

export function PromotionCard({
  promotion,
  compact = false,
}: {
  promotion: Promotion;
  /** Home page variant: hides the terms list to keep the card short. */
  compact?: boolean;
}) {
  const t = useTranslations('promotion');
  const locale = useLocale();
  const claim = useClaimPromotion();
  const pushToast = useUiStore((s) => s.pushToast);

  const onClaim = () => {
    claim.mutate(promotion.id, {
      onSuccess: () => pushToast({ tone: 'success', title: t('claimSuccess') }),
      onError: (error) =>
        pushToast({ tone: 'danger', title: (error as Error).message }),
    });
  };

  return (
    <article className={styles.card}>
      <div className={styles.banner}>
        <span className={styles.bannerIcon} aria-hidden>
          <Gift size={24} />
        </span>
        {promotion.badge && <span className={styles.badge}>{promotion.badge}</span>}
      </div>

      <div className={styles.body}>
        <h3 className={styles.title}>{promotion.title}</h3>
        <p className={styles.description}>{promotion.description}</p>

        <div className={styles.meta}>
          {promotion.minDeposit > 0 && (
            <Badge tone="neutral">
              {t('minDeposit', {
                amount: formatMoney(promotion.minDeposit, {
                  locale,
                  compactDecimals: true,
                }),
              })}
            </Badge>
          )}
          {promotion.turnoverMultiplier > 1 && (
            <Badge tone="accent">
              {t('turnover', { multiplier: promotion.turnoverMultiplier })}
            </Badge>
          )}
        </div>

        {!compact && promotion.terms.length > 0 && (
          <div>
            <div className={styles.termsTitle}>{t('terms')}</div>
            <ul className={styles.terms}>
              {promotion.terms.map((term, index) => (
                <li key={index}>{term}</li>
              ))}
            </ul>
          </div>
        )}

        <div className={styles.footer}>
          <Button
            block
            variant={promotion.claimed ? 'secondary' : 'primary'}
            disabled={promotion.claimed || !promotion.claimable}
            loading={claim.isPending && claim.variables === promotion.id}
            leftIcon={promotion.claimed ? <Check size={17} /> : <Gift size={17} />}
            onClick={onClaim}
          >
            {promotion.claimed ? t('claimed') : t('claim')}
          </Button>
        </div>
      </div>
    </article>
  );
}

export function PromotionGrid({ promotions }: { promotions: Promotion[] }) {
  return (
    <div className={styles.grid}>
      {promotions.map((promotion) => (
        <PromotionCard key={promotion.id} promotion={promotion} />
      ))}
    </div>
  );
}
