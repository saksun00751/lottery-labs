'use client';

import { Clock, Headphones, Mail, MessageCircle, Phone, Send } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { LucideIcon } from 'lucide-react';

import { EmptyState, Skeleton } from '@/components/ui/Feedback';
import { useContactChannels } from '@/lib/api/queries';
import type { ContactChannel } from '@/types';

import styles from './ContactChannels.module.scss';

/** Icon + accent + CTA copy per channel `type` — mirrors lotto-seed-app's `getChannelMeta`. */
function channelMeta(
  type: string,
  t: ReturnType<typeof useTranslations<'contact'>>,
): { icon: LucideIcon; accent: string; btnLabel: string } {
  switch (type) {
    case 'line':
      return { icon: MessageCircle, accent: '#06c755', btnLabel: t('lineBtn') };
    case 'telegram':
      return { icon: Send, accent: '#229ed9', btnLabel: t('telegramBtn') };
    case 'phone':
      return { icon: Phone, accent: 'var(--accent)', btnLabel: t('defaultBtn') };
    case 'email':
      return { icon: Mail, accent: 'var(--accent)', btnLabel: t('defaultBtn') };
    default:
      return { icon: Headphones, accent: 'var(--accent)', btnLabel: t('defaultBtn') };
  }
}

const KNOWN_TYPE_KEYS = new Set(['line', 'telegram', 'phone', 'email']);

function ChannelCard({
  channel,
  title,
  t,
}: {
  channel: ContactChannel;
  title: string;
  t: ReturnType<typeof useTranslations<'contact'>>;
}) {
  const { icon: Icon, accent, btnLabel } = channelMeta(channel.type, t);

  return (
    <div className={styles.channel}>
      <div className={styles.channelHead}>
        <span className={styles.channelIcon} style={{ background: accent, color: '#fff' }} aria-hidden>
          <Icon size={22} />
        </span>
        <span className={styles.channelTitle}>{title}</span>
      </div>

      <div className={styles.channelId}>
        <span className={styles.channelIdLabel}>ID</span>
        <span className={styles.channelIdValue}>{channel.label}</span>
      </div>

      <a
        className={styles.channelBtn}
        style={{ background: accent }}
        href={channel.link}
        target="_blank"
        rel="noopener noreferrer"
      >
        {btnLabel}
      </a>
    </div>
  );
}

/**
 * The hours banner + channel grid shared by the member-area `/contact` page
 * and the signed-out `/contact-public` page — both hit the same
 * guest-accessible `meta/contact-channels` endpoint.
 */
export function ContactChannels() {
  const t = useTranslations('contact');

  const { data, isLoading, isError } = useContactChannels();
  const channels = data ?? [];

  return (
    <>
      <div className={styles.hours}>
        <Clock size={17} aria-hidden />
        <span>
          {t('hours')}: <strong>{t('hoursValue')}</strong>
        </span>
      </div>

      {isLoading ? (
        <div className={styles.channelGrid}>
          {[0, 1].map((i) => (
            <Skeleton key={i} height={150} radius={16} />
          ))}
        </div>
      ) : isError || channels.length === 0 ? (
        <EmptyState title={t('noChannels')} />
      ) : (
        <div className={styles.channelGrid}>
          {channels.map((channel) => (
            <ChannelCard
              key={channel.code}
              channel={channel}
              title={KNOWN_TYPE_KEYS.has(channel.type) ? t(channel.type) : channel.type}
              t={t}
            />
          ))}
        </div>
      )}
    </>
  );
}
