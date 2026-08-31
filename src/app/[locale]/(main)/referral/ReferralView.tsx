'use client';

import { Check, Copy, Link2, Share2, Users } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState, Skeleton } from '@/components/ui/Feedback';
import { Money } from '@/components/ui/Money';
import { useMe, useReferral } from '@/lib/api/queries';
import { pushToast } from '@/lib/toast';
import { formatDate, formatNumber } from '@/lib/utils/intl';

import styles from './referral.module.scss';

/** "0891234567" -> "089-XXX-67XX" — same masking lotto-seed-app applies client-side. */
function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 6 ? `${digits.slice(0, 3)}-XXX-${digits.slice(-2)}XX` : phone;
}

export function ReferralView() {
  const t = useTranslations('referral');
  const tCommon = useTranslations('common');
  const locale = useLocale();

  const { data, isLoading, isError } = useReferral();
  const { data: me } = useMe();

  const summary = data?.summary;
  const friends = data?.friends ?? [];
  // `member/contributor` sometimes comes back with an empty code — the
  // member's own profile always has one, so it's a reliable fallback.
  const code = summary?.code || me?.referralCode || '';

  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);
  const link = code ? `${origin}/${locale}/register?ref=${encodeURIComponent(code)}` : '';

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
    if (!link) return;
    if (navigator.share) {
      await navigator.share({ url: link, title: t('title') }).catch(() => undefined);
    } else {
      copy(link, 'link');
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader icon={<Users size={22} />} title={t('title')} />

      <div className={styles.hero}>
        <div className={styles.heroTop}>
          <div>
            <div className={styles.heroLabel}>{t('yourCode')}</div>
            {isLoading ? (
              <Skeleton width={160} height={40} />
            ) : (
              <div className={styles.code}>{code || '—'}</div>
            )}
          </div>
          <Button
            variant="secondary"
            leftIcon={copied === 'code' ? <Check size={17} /> : <Copy size={17} />}
            disabled={!code}
            onClick={() => code && copy(code, 'code')}
          >
            {copied === 'code' ? tCommon('copied') : tCommon('copy')}
          </Button>
        </div>

        <div className={styles.linkRow}>
          <span className={styles.linkIcon} aria-hidden>
            <Link2 size={16} />
          </span>
          <span className={styles.link}>{link || '—'}</span>
          <Button
            size="sm"
            variant="ghost"
            disabled={!link}
            onClick={() => link && copy(link, 'link')}
            aria-label={tCommon('copy')}
          >
            {copied === 'link' ? <Check size={16} /> : <Copy size={16} />}
          </Button>
        </div>

        <Button block leftIcon={<Share2 size={18} />} disabled={!link} onClick={share}>
          {t('share')}
        </Button>
      </div>

      <div className={styles.statGrid}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>{t('totalFriends')}</span>
          <span className={styles.statValue}>
            {formatNumber(summary?.referredCount ?? 0, locale)}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>{t('totalCommission')}</span>
          <Money value={summary?.totalEarned ?? 0} size="lg" tone="success" />
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>{t('promotionBonusIncome')}</span>
          <Money value={summary?.promotionBonusIncome ?? 0} size="lg" tone="accent" />
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>{t('promotionBonusCount')}</span>
          <span className={styles.statValue}>
            {formatNumber(summary?.promotionBonusCount ?? 0, locale)}
          </span>
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

        {isLoading ? (
          <Skeleton height={140} radius={14} />
        ) : isError ? (
          <EmptyState title={t('loadError')} />
        ) : friends.length === 0 ? (
          <EmptyState title={t('noFriends')} />
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t('colMember')}</th>
                  <th>{t('joinedAt')}</th>
                  <th className={styles.alignEnd}>{t('commission')}</th>
                </tr>
              </thead>
              <tbody>
                {friends.map((friend) => (
                  <tr key={friend.id}>
                    <td>{friend.name || (friend.phone ? maskPhone(friend.phone) : t('member'))}</td>
                    <td className={styles.muted}>{formatDate(friend.joinedAt, locale)}</td>
                    <td className={styles.alignEnd}>
                      <Money value={friend.earned} size="sm" tone="success" />
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
