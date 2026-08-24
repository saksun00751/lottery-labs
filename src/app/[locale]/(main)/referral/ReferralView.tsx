'use client';

import { Check, Copy, Link2, Share2, Users } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState, Skeleton } from '@/components/ui/Feedback';
import { Money } from '@/components/ui/Money';
import { useReferral, useReferralFriends } from '@/lib/api/queries';
import { formatDate, formatNumber } from '@/lib/utils/intl';
import { useUiStore } from '@/store/ui-store';
import type { Paginated, ReferralFriend, ReferralSummary } from '@/types';

import styles from './referral.module.scss';

export function ReferralView() {
  const t = useTranslations('referral');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const pushToast = useUiStore((s) => s.pushToast);

  const { data, isLoading } = useReferral();
  const { data: friendsData, isLoading: friendsLoading } = useReferralFriends();

  const summary = data as ReferralSummary | undefined;
  const friends = (friendsData as Paginated<ReferralFriend> | undefined)?.items ?? [];

  const [copied, setCopied] = useState<'code' | 'link' | null>(null);

  const copy = async (value: string, kind: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      pushToast({ tone: 'success', title: tCommon('copied') });
      setTimeout(() => setCopied(null), 2_000);
    } catch {
      pushToast({ tone: 'danger', title: tCommon('error') });
    }
  };

  const share = async () => {
    if (!summary) return;
    if (navigator.share) {
      await navigator.share({ url: summary.link, title: t('title') }).catch(() => undefined);
    } else {
      copy(summary.link, 'link');
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        icon={<Users size={22} />}
        title={t('title')}
        subtitle={t('subtitle')}
      />

      <div className={styles.hero}>
        <div className={styles.heroTop}>
          <div>
            <div className={styles.heroLabel}>{t('yourCode')}</div>
            {isLoading ? (
              <Skeleton width={160} height={40} />
            ) : (
              <div className={styles.code}>{summary?.code}</div>
            )}
          </div>
          <Button
            variant="secondary"
            leftIcon={copied === 'code' ? <Check size={17} /> : <Copy size={17} />}
            onClick={() => summary && copy(summary.code, 'code')}
          >
            {copied === 'code' ? tCommon('copied') : tCommon('copy')}
          </Button>
        </div>

        <div className={styles.linkRow}>
          <span className={styles.linkIcon} aria-hidden>
            <Link2 size={16} />
          </span>
          <span className={styles.link}>{summary?.link ?? '—'}</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => summary && copy(summary.link, 'link')}
            aria-label={tCommon('copy')}
          >
            {copied === 'link' ? <Check size={16} /> : <Copy size={16} />}
          </Button>
        </div>

        <Button block leftIcon={<Share2 size={18} />} onClick={share}>
          {t('share')}
        </Button>

        {summary && (
          <p className={styles.rate}>
            {t('commissionRate', { percent: summary.commissionPercent })}
          </p>
        )}
      </div>

      <div className={styles.statGrid}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>{t('totalFriends')}</span>
          <span className={styles.statValue}>
            {formatNumber(summary?.totalFriends ?? 0, locale)}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>{t('activeFriends')}</span>
          <span className={styles.statValue}>
            {formatNumber(summary?.activeFriends ?? 0, locale)}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>{t('totalCommission')}</span>
          <Money value={summary?.totalCommission ?? 0} size="lg" tone="success" />
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>{t('pendingCommission')}</span>
          <Money value={summary?.pendingCommission ?? 0} size="lg" />
        </div>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>{t('howItWorks')}</h2>
        <ol className={styles.steps}>
          <li>{t('step1')}</li>
          <li>{t('step2')}</li>
          <li>{t('step3')}</li>
        </ol>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>{t('friendList')}</h2>

        {friendsLoading ? (
          <Skeleton height={140} radius={14} />
        ) : friends.length === 0 ? (
          <EmptyState title={t('noFriends')} />
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{tCommon('all')}</th>
                  <th>{t('joinedAt')}</th>
                  <th className={styles.alignEnd}>{t('turnover')}</th>
                  <th className={styles.alignEnd}>{t('commission')}</th>
                </tr>
              </thead>
              <tbody>
                {friends.map((friend) => (
                  <tr key={friend.id}>
                    <td>{friend.maskedName}</td>
                    <td className={styles.muted}>
                      {formatDate(friend.joinedAt, locale)}
                    </td>
                    <td className={styles.alignEnd}>
                      <Money value={friend.turnover} size="sm" compact />
                    </td>
                    <td className={styles.alignEnd}>
                      <Money value={friend.commission} size="sm" tone="success" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
