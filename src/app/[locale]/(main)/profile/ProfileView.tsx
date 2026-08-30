'use client';

import { KeyRound, Landmark, ShieldCheck, User as UserIcon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { BankAccountCard } from '@/components/finance/BankAccountCard';
import { WalletSummary } from '@/components/home/WalletSummary';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState, Skeleton } from '@/components/ui/Feedback';
import { useRouter } from '@/i18n/navigation';
import { useBankAccounts, useMe } from '@/lib/api/queries';
import { cn } from '@/lib/utils/cn';
import { formatDate } from '@/lib/utils/intl';
import type { BankAccount, User } from '@/types';

import styles from './profile.module.scss';

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | undefined;
  mono?: boolean;
}) {
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      <span className={cn(styles.rowValue, mono && styles.mono)}>
        {value || '—'}
      </span>
    </div>
  );
}

export function ProfileView() {
  const t = useTranslations('profile');
  const tWallet = useTranslations('wallet');
  const locale = useLocale();
  const router = useRouter();

  const { data, isLoading } = useMe();
  const { data: accountsData, isLoading: accountsLoading } = useBankAccounts();

  const user = data as User | undefined;
  const accounts = (accountsData as BankAccount[] | undefined) ?? [];

  // The real `member/profile` payload doesn't carry `created_at` at all
  // (lotto-seed-app's own profile page never reads it either) — guard
  // against the empty string so `formatDate` doesn't throw on `new Date('')`.
  const memberSince = user?.createdAt && !Number.isNaN(Date.parse(user.createdAt))
    ? t('memberSince', { date: formatDate(user.createdAt, locale) })
    : undefined;

  return (
    <div className={styles.page}>
      <PageHeader icon={<UserIcon size={22} />} title={t('title')} subtitle={memberSince} />

      <WalletSummary showActions={false} />

      <div className={styles.layout}>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            <span className={styles.cardIcon} aria-hidden>
              <UserIcon size={18} />
            </span>
            {t('accountInfo')}
          </h2>

          {isLoading ? (
            <Skeleton height={180} radius={14} />
          ) : (
            <div className={styles.rows}>
              <Row label={t('username')} value={user?.username} />
              <Row
                label={t('fullName')}
                value={user ? `${user.firstName} ${user.lastName}` : undefined}
              />
              <Row label={t('phone')} value={user?.phone} mono />
              <Row label={t('referralCode')} value={user?.referralCode} mono />
            </div>
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
          ) : accounts.length === 0 ? (
            <EmptyState title={tWallet('addBankAccount')} />
          ) : (
            <div className={styles.accountList}>
              {accounts.map((account) => (
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

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>
          <span className={styles.cardIcon} aria-hidden>
            <ShieldCheck size={18} />
          </span>
          {t('security')}
        </h2>
        <Button
          variant="secondary"
          leftIcon={<KeyRound size={17} />}
          onClick={() => router.push('/profile/change-password')}
        >
          {t('changePasswordTitle')}
        </Button>
      </div>
    </div>
  );
}
