'use client';

import { AlertTriangle, ArrowUpFromLine, Check, Crown, Info, Landmark, Wallet } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { AmountQuickPick } from '@/components/finance/BankAccountCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Feedback';
import { Input } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Money } from '@/components/ui/Money';
import { ApiError } from '@/lib/api/client';
import { useBanks, useWallet, useWithdraw, useWithdrawInfo } from '@/lib/api/queries';
import { formatAccountNumber, maskAccountNumber } from '@/lib/utils/bank';
import { cn } from '@/lib/utils/cn';
import { formatAmountInput, formatMoney, parseAmountInput } from '@/lib/utils/money';
import { pushToast } from '@/lib/toast';
import type { Bank, Wallet as WalletType, WithdrawInfo } from '@/types';

import styles from '../finance.module.scss';

/** How long a withdrawal typically takes to land, shown on the success screen. */
const COOLDOWN_MINUTES = 5;

interface WithdrawResult {
  amount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export function WithdrawView() {
  const t = useTranslations('withdraw');
  const tWallet = useTranslations('wallet');
  const tCommon = useTranslations('common');
  const locale = useLocale();

  const { data: walletData, isLoading: walletLoading } = useWallet();
  const { data: infoData, isLoading: infoLoading } = useWithdrawInfo();
  const { data: banksData } = useBanks();
  const withdraw = useWithdraw();

  const wallet = walletData as WalletType | undefined;
  const info = infoData as WithdrawInfo | undefined;
  const banks = (banksData as Bank[] | undefined) ?? [];
  const balance = wallet?.balance ?? 0;

  const bank = info?.bankAccount
    ? banks.find((b) => b.code === info.bankAccount!.bankCode)
    : undefined;

  const [amountText, setAmountText] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<WithdrawResult | null>(null);

  const promo = info?.promo;
  const promoActive = !!promo?.active;
  const min = info?.min ?? 0;
  const max = info?.max ?? 0;
  const remainToday = info?.remainToday ?? 0;
  const maxAllowed = Math.max(0, Math.min(max, balance, remainToday));
  const forcedAmount = promoActive ? Math.max(0, Math.min(maxAllowed, promo!.withdrawLimit)) : 0;
  const manualAmount = parseAmountInput(amountText);
  const amount = promoActive ? forcedAmount : manualAmount;
  const turnoverPassed = balance >= (promo?.turnoverRequired ?? 0);
  const promoShortfall = Math.max(0, (promo?.turnoverRequired ?? 0) - balance);

  // Once a promo locks the amount, keep the hidden field in sync so the
  // confirm/submit path always sees the current forced figure.
  useEffect(() => {
    if (promoActive) setAmountText(forcedAmount > 0 ? String(forcedAmount / 100) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promoActive, forcedAmount]);

  const amountError = (() => {
    if (promoActive || !amountText) return null;
    if (manualAmount < min) {
      return t('errMin', { amount: formatMoney(min, { locale, compactDecimals: true }) });
    }
    if (manualAmount > max) {
      return t('errMax', { amount: formatMoney(max, { locale, compactDecimals: true }) });
    }
    if (manualAmount > remainToday) {
      return t('errExceedToday', {
        amount: formatMoney(remainToday, { locale, compactDecimals: true }),
      });
    }
    if (manualAmount > balance) return t('insufficient');
    return null;
  })();

  const isValid =
    !!info &&
    amount >= min &&
    amount <= maxAllowed &&
    info.canWithdraw &&
    !!info.bankAccount &&
    (!promoActive || turnoverPassed);

  const quickAmounts = min > 0 ? [min, min * 3, min * 5] : [];

  const onConfirm = () => {
    if (!info?.bankAccount) return;
    withdraw.mutate(
      { amount, bankAccountId: info.bankAccount.accountNumber },
      {
        onSuccess: () => {
          setResult({
            amount,
            bankName: bank?.name ?? info.bankAccount!.bankCode,
            accountNumber: info.bankAccount!.accountNumber,
            accountName: info.bankAccount!.accountName,
          });
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
          <p className={styles.successDesc}>{t('successDesc', { minutes: COOLDOWN_MINUTES })}</p>

          <div className={cn(styles.detailList, styles.successDetails)}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t('rowAmount')}</span>
              <Money
                value={result.amount}
                size="sm"
                tone="accent"
                suffix="Credit"
                className={styles.detailHighlight}
              />
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t('rowBank')}</span>
              <span className={styles.detailValue}>{result.bankName}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t('rowAccount')}</span>
              <span className={styles.detailValue}>
                {maskAccountNumber(result.accountNumber)}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t('rowName')}</span>
              <span className={styles.detailValue}>{result.accountName}</span>
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

      <div className={cn(styles.layout, styles.singleColumn)}>
        <div className={styles.column}>
          <div className={styles.balanceCard}>
            <span className={styles.balanceLabel}>
              <Wallet size={15} aria-hidden />
              {tWallet('balance')}
            </span>
            {walletLoading ? (
              <Skeleton width={180} height={38} />
            ) : (
              <Money value={balance} size="xl" tone="accent" suffix="Credit" />
            )}
          </div>

          {!infoLoading && info?.notice && (
            <div className={styles.warning}>
              <Info size={16} aria-hidden />
              {info.notice}
            </div>
          )}

          {!infoLoading && info && !info.canWithdraw && (
            <div className={styles.warning}>
              <AlertTriangle size={16} aria-hidden />
              {t('systemClosed')}
            </div>
          )}

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>
              <span className={styles.cardIcon} aria-hidden>
                <Landmark size={18} />
              </span>
              {t('myAccount')}
            </h2>
            {infoLoading ? (
              <Skeleton height={68} radius={14} />
            ) : info?.bankAccount ? (
              <div className={styles.destRow}>
                <div className={styles.destIdentity}>
                  <span className={styles.destAvatar} aria-hidden>
                    {bank?.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={bank.logoUrl} alt="" width={22} height={22} />
                    ) : (
                      <Landmark size={18} />
                    )}
                  </span>
                  <div>
                    <div className={styles.destName}>{info.bankAccount.accountName}</div>
                    <div className={styles.destBank}>
                      {bank?.name ?? info.bankAccount.bankCode}
                    </div>
                  </div>
                </div>
                <span className={styles.destNumber}>
                  {formatAccountNumber(info.bankAccount.accountNumber)}
                </span>
              </div>
            ) : (
              <div className={styles.warning}>
                <AlertTriangle size={16} aria-hidden />
                {t('noBankAccount')}
              </div>
            )}
          </div>

          {promoActive && promo && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>
                <span className={styles.cardIcon} aria-hidden>
                  <Crown size={18} />
                </span>
                {t('promoTitle')}
                {promo.name && (
                  <Badge tone={turnoverPassed ? 'success' : 'warning'}>
                    {turnoverPassed ? t('promoPassed') : t('promoNotPassed')}
                  </Badge>
                )}
              </h2>

              <div className={styles.detailList}>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>{t('promoStatTurn')}</span>
                  <span className={styles.detailValue}>
                    {formatMoney(promo.turnoverRequired, { locale })}
                  </span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>{t('promoStatLimit')}</span>
                  <span className={styles.detailValue}>
                    {formatMoney(promo.withdrawLimit, { locale })}
                  </span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>{t('promoStatPayout')}</span>
                  <span className={styles.detailValue}>{formatMoney(amount, { locale })}</span>
                </div>
                {!turnoverPassed && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>{t('promoStatShortfall')}</span>
                    <span className={styles.detailValue}>
                      {formatMoney(promoShortfall, { locale })}
                    </span>
                  </div>
                )}
              </div>

              <div className={styles.noteList} style={{ marginTop: 'var(--sp-3)' }}>
                {!turnoverPassed && (
                  <div className={styles.noteItem}>{t('promoTipTurnover')}</div>
                )}
                <div className={styles.noteItem}>
                  {t('promoCalcNote', {
                    req: formatMoney(maxAllowed, { locale }),
                    limit: formatMoney(promo.withdrawLimit, { locale }),
                  })}
                </div>
                <div className={styles.noteItem}>{t('promoForceFull')}</div>
              </div>
            </div>
          )}

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>
              <span className={styles.cardIcon} aria-hidden>
                <ArrowUpFromLine size={18} />
              </span>
              {t('amount')}
            </h2>

            <div className={styles.fieldGroup}>
              {promoActive ? (
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>{t('promoForceInput')}</span>
                  <Money value={forcedAmount} size="sm" tone="accent" suffix="Credit" />
                </div>
              ) : (
                <>
                  <Input
                    amount
                    value={amountText}
                    onChange={(event) => setAmountText(formatAmountInput(event.target.value))}
                    placeholder={t('placeholder', {
                      amount: formatMoney(min, { locale, compactDecimals: true }),
                    })}
                    inputMode="decimal"
                    error={amountError ?? undefined}
                    hint={t('minAmount', {
                      amount: formatMoney(min, { locale, compactDecimals: true }),
                    })}
                  />

                  <div>
                    <div className={styles.subLabel}>{t('quickAmount')}</div>
                    <AmountQuickPick
                      amounts={quickAmounts}
                      value={manualAmount}
                      onSelect={(value) => setAmountText(formatAmountInput(String(value / 100)))}
                      allLabel={t('amountAll')}
                      allValue={maxAllowed}
                    />
                  </div>
                </>
              )}

              {isValid && info?.bankAccount && (
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>{t('transferTo')}</span>
                  <span className={styles.summaryValue}>
                    {info.bankAccount.accountName} ·{' '}
                    {maskAccountNumber(info.bankAccount.accountNumber)}
                  </span>
                </div>
              )}

              <Button
                variant="danger"
                size="lg"
                block
                loading={withdraw.isPending}
                disabled={!isValid || infoLoading}
                onClick={() => setConfirming(true)}
              >
                {!infoLoading && info && !info.bankAccount
                  ? t('noBankAccount')
                  : !infoLoading && info && !info.canWithdraw
                    ? t('systemClosed')
                    : t('submit')}
              </Button>

              {!infoLoading && info && !info.bankAccount && (
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
                  amount: formatMoney(min, { locale, compactDecimals: true }),
                })}
              </div>
              <div className={styles.noteItem}>
                {t('noteMaxDay', {
                  max: formatMoney(max, { locale, compactDecimals: true }),
                  sum: formatMoney(info?.sumToday ?? 0, { locale, compactDecimals: true }),
                })}
              </div>
              <div className={styles.noteItem}>{t('noteAccount')}</div>
            </div>
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
            <Button variant="danger" loading={withdraw.isPending} onClick={onConfirm}>
              {tCommon('confirm')}
            </Button>
          </>
        }
      >
        {info?.bankAccount && (
          <div className={styles.detailList}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t('rowAmount')}</span>
              <Money
                value={amount}
                size="sm"
                tone="danger"
                suffix="Credit"
                className={styles.detailHighlight}
              />
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t('rowBank')}</span>
              <span className={styles.detailValue}>
                {bank?.name ?? info.bankAccount.bankCode}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t('rowAccount')}</span>
              <span className={styles.detailValue}>
                {maskAccountNumber(info.bankAccount.accountNumber)}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t('rowName')}</span>
              <span className={styles.detailValue}>{info.bankAccount.accountName}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
