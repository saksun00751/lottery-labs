'use client';

import { Check, Copy } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import { Badge } from '@/components/ui/Badge';
import { formatAccountNumber } from '@/lib/utils/bank';
import { cn } from '@/lib/utils/cn';
import { formatNumber } from '@/lib/utils/intl';
import { pushToast } from '@/lib/toast';

import styles from './BankAccountCard.module.scss';

export interface BankAccountCardProps {
  bankName: string;
  accountNumber: string;
  accountName: string;
  color?: string;
  isPrimary?: boolean;
  copyable?: boolean;
}

export function BankAccountCard({
  bankName,
  accountNumber,
  accountName,
  color = 'var(--accent)',
  isPrimary,
  copyable = false,
}: BankAccountCardProps) {
  const t = useTranslations('common');
  const tWallet = useTranslations('wallet');
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(accountNumber);
      setCopied(true);
      pushToast({ tone: 'success', title: t('copied') });
      setTimeout(() => setCopied(false), 2_000);
    } catch {
      pushToast({ tone: 'danger', title: t('error') });
    }
  };

  const initials = bankName.replace(/^ธนาคาร/, '').slice(0, 3);

  return (
    <div className={styles.account}>
      <span className={styles.logo} style={{ background: color }} aria-hidden>
        {initials}
      </span>
      <div className={styles.info}>
        <div className={styles.bankName}>{bankName}</div>
        <div className={styles.number}>{formatAccountNumber(accountNumber)}</div>
        <div className={styles.holder}>{accountName}</div>
      </div>
      <div className={styles.side}>
        {isPrimary && <Badge tone="accent">{tWallet('primaryAccount')}</Badge>}
        {copyable && (
          <button type="button" className={styles.copy} onClick={onCopy}>
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? t('copied') : t('copy')}
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------------------------- amount quick pick -------------------------- */

export function AmountQuickPick({
  amounts,
  value,
  onSelect,
  allLabel,
  allValue,
}: {
  /** Minor units. */
  amounts: number[];
  value: number | null;
  onSelect: (amount: number) => void;
  allLabel?: string;
  allValue?: number;
}) {
  const locale = useLocale();

  return (
    <div className={styles.quickGrid}>
      {amounts.map((amount) => (
        <button
          key={amount}
          type="button"
          className={cn(styles.quickButton, value === amount && styles.quickActive)}
          onClick={() => onSelect(amount)}
        >
          {formatNumber(amount / 100, locale)}
        </button>
      ))}
      {allLabel !== undefined && allValue !== undefined && (
        <button
          type="button"
          className={cn(
            styles.quickButton,
            styles.quickAll,
            value === allValue && allValue > 0 && styles.quickActive,
          )}
          onClick={() => onSelect(allValue)}
        >
          {allLabel}
        </button>
      )}
    </div>
  );
}
