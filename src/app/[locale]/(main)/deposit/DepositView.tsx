'use client';

import { AlertTriangle, ArrowDownToLine, Gift, Landmark, Wallet } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import { BankAccountCard, AmountQuickPick } from '@/components/finance/BankAccountCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { Money } from '@/components/ui/Money';
import { Skeleton } from '@/components/ui/Feedback';
import { publicEnv } from '@/config/env.public';
import { ApiError } from '@/lib/api/client';
import {
  useBankAccounts,
  useDeposit,
  useDepositChannels,
  usePromotions,
  useWallet,
} from '@/lib/api/queries';
import { cn } from '@/lib/utils/cn';
import { formatAmountInput, formatMoney, parseAmountInput } from '@/lib/utils/money';
import { useUiStore } from '@/store/ui-store';
import type { BankAccount, DepositChannel, Promotion, Wallet as WalletType } from '@/types';

import styles from '../finance.module.scss';

/** 100 / 300 / 500 / 1,000 baht in minor units. */
const QUICK_AMOUNTS = [10_000, 30_000, 50_000, 100_000];

export function DepositView() {
  const t = useTranslations('deposit');
  const tWallet = useTranslations('wallet');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const pushToast = useUiStore((s) => s.pushToast);

  const { data: walletData, isLoading: walletLoading } = useWallet();
  const { data: accounts } = useBankAccounts();
  const { data: channels, isLoading: channelsLoading } = useDepositChannels();
  const { data: promotions } = usePromotions();
  const deposit = useDeposit();

  const wallet = walletData as WalletType | undefined;
  const bankAccounts = (accounts as BankAccount[] | undefined) ?? [];
  const depositChannels = (channels as DepositChannel[] | undefined) ?? [];
  const availablePromotions = ((promotions as Promotion[] | undefined) ?? []).filter(
    (promotion) => promotion.claimable && promotion.minDeposit > 0,
  );

  const [amountText, setAmountText] = useState('');
  const [promotionId, setPromotionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const amount = parseAmountInput(amountText);
  const minAmount = depositChannels[0]?.minAmount ?? 10_000;

  const onSubmit = () => {
    if (amount < minAmount) {
      setError(t('minAmount', { amount: formatMoney(minAmount, { locale, compactDecimals: true }) }));
      return;
    }
    setError(null);

    deposit.mutate(
      {
        amount,
        channelId: depositChannels[0]?.id ?? '',
        promotionId: promotionId ?? undefined,
      },
      {
        onSuccess: () => {
          setAmountText('');
          setPromotionId(null);
          pushToast({ tone: 'success', title: t('success') });
        },
        onError: (mutationError) =>
          pushToast({
            tone: 'danger',
            title:
              mutationError instanceof ApiError
                ? mutationError.message
                : tCommon('error'),
          }),
      },
    );
  };

  return (
    <div className={styles.page}>
      <PageHeader
        icon={<ArrowDownToLine size={22} />}
        title={t('title')}
        subtitle={t('subtitle')}
      />

      <div className={styles.layout}>
        <div className={styles.column}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>
              <span className={styles.cardIcon} aria-hidden>
                <Landmark size={18} />
              </span>
              {t('companyAccount')}
            </h2>

            {channelsLoading ? (
              <Skeleton height={80} radius={14} />
            ) : (
              <div className={styles.channelList}>
                {depositChannels.map((channel) => (
                  <BankAccountCard
                    key={channel.id}
                    bankName={channel.bankName}
                    accountNumber={channel.accountNumber}
                    accountName={channel.accountName}
                    copyable
                  />
                ))}
              </div>
            )}

            <div className={styles.warning} style={{ marginTop: 'var(--sp-4)' }}>
              <AlertTriangle size={16} aria-hidden />
              {t('warning')}
            </div>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>
              <span className={styles.cardIcon} aria-hidden>
                <ArrowDownToLine size={18} />
              </span>
              {t('amount')}
            </h2>

            <div className={styles.fieldGroup}>
              <Input
                amount
                value={amountText}
                onChange={(event) => setAmountText(formatAmountInput(event.target.value))}
                placeholder={t('amountPlaceholder')}
                inputMode="decimal"
                error={error ?? undefined}
                hint={t('minAmount', {
                  amount: formatMoney(minAmount, { locale, compactDecimals: true }),
                })}
              />

              <AmountQuickPick
                amounts={QUICK_AMOUNTS}
                value={amount}
                onSelect={(value) => {
                  setAmountText(formatAmountInput(String(value / 100)));
                  setError(null);
                }}
              />

              {publicEnv.features.promotion && availablePromotions.length > 0 && (
                <div>
                  <div className={styles.subLabel}>{t('selectPromotion')}</div>
                  <div className={styles.promoOptions}>
                    <button
                      type="button"
                      className={cn(
                        styles.promoOption,
                        promotionId === null && styles.promoActive,
                      )}
                      onClick={() => setPromotionId(null)}
                    >
                      <span className={styles.promoRadio} aria-hidden />
                      <span className={styles.promoText}>
                        <span className={styles.promoTitle}>{t('noPromotion')}</span>
                      </span>
                    </button>

                    {availablePromotions.map((promotion) => (
                      <button
                        key={promotion.id}
                        type="button"
                        className={cn(
                          styles.promoOption,
                          promotionId === promotion.id && styles.promoActive,
                        )}
                        onClick={() => setPromotionId(promotion.id)}
                      >
                        <span className={styles.promoRadio} aria-hidden />
                        <span className={styles.promoText}>
                          <span className={styles.promoTitle}>
                            <Gift size={13} aria-hidden /> {promotion.title}
                          </span>
                          <span className={styles.promoMeta}>
                            {formatMoney(promotion.minDeposit, {
                              locale,
                              compactDecimals: true,
                            })}
                            {' · +'}
                            {promotion.bonusPercent}%
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Button
                size="lg"
                block
                loading={deposit.isPending}
                disabled={amount <= 0}
                onClick={onSubmit}
              >
                {t('submit')}
              </Button>
            </div>
          </div>
        </div>

        <div className={styles.column}>
          <div className={styles.balanceCard}>
            <span className={styles.balanceLabel}>
              <Wallet size={15} aria-hidden />
              {tWallet('balance')}
            </span>
            {walletLoading ? (
              <Skeleton width={180} height={38} />
            ) : (
              <Money value={wallet?.balance ?? 0} size="xl" tone="accent" suffix="THB" />
            )}
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>
              <span className={styles.cardIcon} aria-hidden>
                <Landmark size={18} />
              </span>
              {tWallet('myBankAccount')}
            </h2>
            <div className={styles.channelList}>
              {bankAccounts.map((account) => (
                <BankAccountCard
                  key={account.id}
                  bankName={account.bankName}
                  accountNumber={account.accountNumber}
                  accountName={account.accountName}
                  isPrimary={account.isPrimary}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
