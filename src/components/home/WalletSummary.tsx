'use client';

import {
  ArrowDownToLine,
  ArrowUpFromLine,
  AtSign,
  Gem,
  RotateCcw,
  TrendingUp,
  User as UserIcon,
  Wallet as WalletIcon,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Feedback';
import { Money } from '@/components/ui/Money';
import { publicEnv } from '@/config/env.public';
import { useRouter } from '@/i18n/navigation';
import { useClaimBonus, useMe, useWallet } from '@/lib/api/queries';
import { cn } from '@/lib/utils/cn';
import { formatNumber } from '@/lib/utils/intl';
import { formatMoney } from '@/lib/utils/money';
import { pushToast } from '@/lib/toast';
import type { User, Wallet } from '@/types';

import styles from './WalletSummary.module.scss';

function Stat({
  icon,
  label,
  children,
  footer,
  variant,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
  footer?: ReactNode;
  variant?: 'balance' | 'diamond' | 'cashback' | 'turnover';
}) {
  return (
    <div className={cn(styles.stat, variant && styles[variant])}>
      <div className={styles.statHead}>
        <span className={styles.statIcon} aria-hidden>
          {icon}
        </span>
        <span className={styles.statLabel}>{label}</span>
      </div>
      <div className={styles.statValue}>{children}</div>
      {footer && <div className={styles.statFoot}>{footer}</div>}
    </div>
  );
}

/**
 * The card that opens both Home and Profile: balance, diamonds, cashback and
 * this month's turnover — the four numbers a member checks first.
 */
export function WalletSummary({ showActions = true }: { showActions?: boolean }) {
  const t = useTranslations('wallet');
  const tHome = useTranslations('home');
  const tNav = useTranslations('nav');
  const locale = useLocale();
  const router = useRouter();

  const { data: user } = useMe();
  const { data, isLoading } = useWallet();
  const wallet = data as Wallet | undefined;
  const claim = useClaimBonus();

  const onClaim = () => {
    claim.mutate('cashback', {
      onSuccess: (result) => {
        pushToast({
          tone: 'success',
          title: t('claimed', { amount: formatMoney(result.claimed, { locale }) }),
        });
      },
      onError: () => {
        pushToast({ tone: 'danger', title: t('nothingToClaim') });
      },
    });
  };

  const member = user as User | undefined;
  const fullName = [member?.firstName, member?.lastName].filter(Boolean).join(' ');
  const displayName = fullName || member?.username || '';
  const initial = displayName.trim().charAt(0).toUpperCase();

  return (
    <section className={styles.card}>
      <div className={styles.top}>
        <div className={styles.identity}>
          <span className={styles.avatar} aria-hidden>
            {initial || <UserIcon size={18} />}
          </span>
          <div className={styles.identityText}>
            <div className={styles.name} title={displayName}>
              {displayName}
            </div>
            {member?.username && (
              <div className={styles.username}>
                <AtSign size={11} aria-hidden />
                {member.username}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* The balance widget leads the row so it reads first, same as the
          other figures, instead of sitting apart as its own hero block. */}
      <div className={styles.stats}>
        <Stat icon={<WalletIcon size={15} />} label={t('balance')} variant="balance">
          {isLoading ? (
            <Skeleton width={100} height={22} />
          ) : (
            <Money value={wallet?.balance ?? 0} size="lg" tone="accent" compact suffix="Credit" />
          )}
        </Stat>

        {publicEnv.features.diamond && (
          <Stat icon={<Gem size={15} />} label={t('diamond')} variant="diamond">
            {isLoading ? (
              <Skeleton width={70} height={22} />
            ) : (
              formatNumber(wallet?.diamond ?? 0, locale)
            )}
          </Stat>
        )}

        <Stat
          icon={<RotateCcw size={15} />}
          label={t('cashback')}
          variant="cashback"
          footer={
            (wallet?.cashback ?? 0) > 0 && (
              <Button
                size="sm"
                variant="outline"
                className={styles.claim}
                loading={claim.isPending}
                onClick={onClaim}
              >
                {t('claimCashback')}
              </Button>
            )
          }
        >
          {isLoading ? (
            <Skeleton width={90} height={22} />
          ) : (
            <Money value={wallet?.cashback ?? 0} size="lg" tone="success" />
          )}
        </Stat>

        <Stat
          icon={<TrendingUp size={15} />}
          label={t('monthlyTurnover')}
          variant="turnover"
        >
          {isLoading ? (
            <Skeleton width={110} height={22} />
          ) : (
            <Money value={wallet?.monthlyTurnover ?? 0} size="lg" compact />
          )}
        </Stat>
      </div>

      {showActions && (
        <div className={styles.actions}>
          <Button
            leftIcon={<ArrowDownToLine size={18} />}
            onClick={() => router.push('/deposit')}
          >
            {tNav('deposit')}
          </Button>
          <Button
            variant="secondary"
            leftIcon={<ArrowUpFromLine size={18} />}
            onClick={() => router.push('/withdraw')}
          >
            {tNav('withdraw')}
          </Button>
        </div>
      )}
    </section>
  );
}
