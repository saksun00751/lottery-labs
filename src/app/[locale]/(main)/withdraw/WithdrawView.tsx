'use client';

import { AlertTriangle, ArrowUpFromLine, Check, Info, Landmark, Wallet } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import { AmountQuickPick, BankAccountCard } from '@/components/finance/BankAccountCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState, Skeleton } from '@/components/ui/Feedback';
import { Input } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Money } from '@/components/ui/Money';
import { ApiError } from '@/lib/api/client';
import { useBankAccounts, useWallet, useWithdraw } from '@/lib/api/queries';
import { formatAccountNumber, maskAccountNumber } from '@/lib/utils/bank';
import { cn } from '@/lib/utils/cn';
import { formatAmountInput, formatMoney, parseAmountInput } from '@/lib/utils/money';
import { pushToast } from '@/lib/toast';
import type { BankAccount, Wallet as WalletType } from '@/types';

import styles from '../finance.module.scss';

/** 100 / 300 / 500 baht in minor units. */
const QUICK_AMOUNTS = [10_000, 30_000, 50_000];
const MIN_WITHDRAW = 10_000;

interface WithdrawResult {
  amount: number;
  bank: BankAccount;
}

export function WithdrawView() {
  const t = useTranslations('withdraw');
  const tWallet = useTranslations('wallet');
  const tCommon = useTranslations('common');
  const locale = useLocale();

  const { data: walletData, isLoading: walletLoading } = useWallet();
  const { data: accounts, isLoading: accountsLoading } = useBankAccounts();
  const withdraw = useWithdraw();

  const wallet = walletData as WalletType | undefined;
  const bankAccounts = (accounts as BankAccount[] | undefined) ?? [];
  const primary = bankAccounts.find((a) => a.isPrimary) ?? bankAccounts[0];

  const [amountText, setAmountText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<WithdrawResult | null>(null);

  const amount = parseAmountInput(amountText);
  const balance = wallet?.balance ?? 0;

  const validate = () => {
    if (amount < MIN_WITHDRAW) {
      setError(
        t('minAmount', {
          amount: formatMoney(MIN_WITHDRAW, { locale, compactDecimals: true }),
        }),
      );
      return false;
    }
    if (amount > balance) {
      setError(t('insufficient'));
      return false;
    }
    setError(null);
    return true;
  };

  const onConfirm = () => {
    if (!primary) return;
    withdraw.mutate(
      { amount, bankAccountId: primary.id },
      {
        onSuccess: () => {
          setResult({ amount, bank: primary });
          setAmountText('');
          setConfirming(false);
          pushToast({ tone: 'success', title: t('success') });
        },
        onError: (mutationError) => {
          setConfirming(false);
          pushToast({
            tone: 'danger',
            title:
              mutationError instanceof ApiError
                ? mutationError.message
                : tCommon('error'),
          });
        },
      },
    );
  };

  if (result) {
    return (
      <div className={styles.page}>
        <PageHeader
          icon={<ArrowUpFromLine size={22} />}
          title={t('title')}
          subtitle={t('subtitle')}
        />

        <div className={styles.successWrap}>
          <span className={styles.successIcon} aria-hidden>
            <Check size={32} />
          </span>
          <h2 className={styles.successTitle}>{t('successTitle')}</h2>
          <p className={styles.successDesc}>{t('successDesc')}</p>

          <div className={cn(styles.detailList, styles.successDetails)}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t('rowAmount')}</span>
              <Money
                value={result.amount}
                size="sm"
                tone="accent"
                suffix="THB"
                className={styles.detailHighlight}
              />
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t('rowBank')}</span>
              <span className={styles.detailValue}>{result.bank.bankName}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t('rowAccount')}</span>
              <span className={styles.detailValue}>
                {maskAccountNumber(result.bank.accountNumber)}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t('rowName')}</span>
              <span className={styles.detailValue}>{result.bank.accountName}</span>
            </div>
          </div>

          <Button className={styles.successCta} block onClick={() => setResult(null)}>
            {t('again')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader
        icon={<ArrowUpFromLine size={22} />}
        title={t('title')}
        subtitle={t('subtitle')}
      />

      <div className={styles.layout}>
        <div className={styles.column}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>
              <span className={styles.cardIcon} aria-hidden>
                <ArrowUpFromLine size={18} />
              </span>
              {t('amount')}
            </h2>

            <div className={styles.fieldGroup}>
              {!accountsLoading && primary && (
                <div className={styles.destRow}>
                  <div className={styles.destIdentity}>
                    <span className={styles.destAvatar} aria-hidden>
                      <Landmark size={18} />
                    </span>
                    <div>
                      <div className={styles.destName}>{primary.accountName}</div>
                      <div className={styles.destBank}>{primary.bankName}</div>
                    </div>
                  </div>
                  <span className={styles.destNumber}>
                    {formatAccountNumber(primary.accountNumber)}
                  </span>
                </div>
              )}

              <Input
                amount
                value={amountText}
                onChange={(event) => {
                  setAmountText(formatAmountInput(event.target.value));
                  setError(null);
                }}
                placeholder="0.00"
                inputMode="decimal"
                error={error ?? undefined}
                hint={t('minAmount', {
                  amount: formatMoney(MIN_WITHDRAW, { locale, compactDecimals: true }),
                })}
              />

              <div>
                <div className={styles.subLabel}>{t('quickAmount')}</div>
                <AmountQuickPick
                  amounts={QUICK_AMOUNTS}
                  value={amount}
                  onSelect={(value) => {
                    setAmountText(formatAmountInput(String(value / 100)));
                    setError(null);
                  }}
                  allLabel={t('amountAll')}
                  allValue={balance}
                />
              </div>

              {!error && amount > 0 && primary && (
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>{t('transferTo')}</span>
                  <span className={styles.summaryValue}>
                    {primary.accountName} · {maskAccountNumber(primary.accountNumber)}
                  </span>
                </div>
              )}

              <Button
                size="lg"
                block
                disabled={!primary || amount <= 0}
                onClick={() => {
                  if (validate()) setConfirming(true);
                }}
              >
                {t('submit')}
              </Button>

              {!accountsLoading && !primary && (
                <div className={styles.warning}>
                  <AlertTriangle size={16} aria-hidden />
                  {t('noBankAccount')}
                </div>
              )}
            </div>
          </div>

          <div className={styles.noteCard}>
            <div className={styles.noteHead}>
              <span className={styles.noteIcon} aria-hidden>
                <Info size={14} />
              </span>
              <span className={styles.noteTitle}>{t('notesTitle')}</span>
            </div>
            <div className={styles.noteList}>
              <div className={styles.noteItem}>
                {t('noteMin', {
                  amount: formatMoney(MIN_WITHDRAW, { locale, compactDecimals: true }),
                })}
              </div>
              <div className={styles.noteItem}>{t('noteAccount')}</div>
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
              <Money value={balance} size="xl" tone="accent" suffix="THB" />
            )}
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>
              <span className={styles.cardIcon} aria-hidden>
                <Landmark size={18} />
              </span>
              {tWallet('myBankAccount')}
            </h2>
            {accountsLoading ? (
              <Skeleton height={80} radius={14} />
            ) : bankAccounts.length === 0 ? (
              <EmptyState title={t('noBankAccount')} />
            ) : (
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
            )}
          </div>
        </div>
      </div>

      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title={t('confirmTitle')}
        closeLabel={tCommon('close')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              {tCommon('cancel')}
            </Button>
            <Button loading={withdraw.isPending} onClick={onConfirm}>
              {tCommon('confirm')}
            </Button>
          </>
        }
      >
        {primary && (
          <div className={styles.detailList}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t('rowAmount')}</span>
              <Money
                value={amount}
                size="sm"
                tone="danger"
                suffix="THB"
                className={styles.detailHighlight}
              />
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t('rowBank')}</span>
              <span className={styles.detailValue}>{primary.bankName}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t('rowAccount')}</span>
              <span className={styles.detailValue}>
                {maskAccountNumber(primary.accountNumber)}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t('rowName')}</span>
              <span className={styles.detailValue}>{primary.accountName}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
