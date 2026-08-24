'use client';

import {
  Clock,
  Headphones,
  Mail,
  MessageCircle,
  Phone,
  Send,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { LucideIcon } from 'lucide-react';

import { PageHeader } from '@/components/layout/PageHeader';
import { publicEnv } from '@/config/env.public';

import styles from './contact.module.scss';

interface Channel {
  icon: LucideIcon;
  labelKey: string;
  value: string;
  href?: string;
  accent?: string;
}

function ChannelCard({ channel, label }: { channel: Channel; label: string }) {
  const Icon = channel.icon;

  const content = (
    <>
      <span
        className={styles.channelIcon}
        style={channel.accent ? { background: channel.accent, color: '#fff' } : undefined}
        aria-hidden
      >
        <Icon size={22} />
      </span>
      <span className={styles.channelText}>
        <span className={styles.channelLabel}>{label}</span>
        <span className={styles.channelValue}>{channel.value}</span>
      </span>
    </>
  );

  if (channel.href) {
    return (
      <a
        className={styles.channel}
        href={channel.href}
        target="_blank"
        rel="noopener noreferrer"
      >
        {content}
      </a>
    );
  }
  return <div className={styles.channel}>{content}</div>;
}

export function ContactView() {
  const t = useTranslations('contact');

  const channels: Channel[] = [
    {
      icon: MessageCircle,
      labelKey: 'line',
      value: publicEnv.contact.line,
      href: publicEnv.contact.line
        ? `https://line.me/R/ti/p/${encodeURIComponent(publicEnv.contact.line)}`
        : undefined,
      accent: '#06c755',
    },
    {
      icon: Send,
      labelKey: 'telegram',
      value: publicEnv.contact.telegram,
      href: publicEnv.contact.telegram || undefined,
      accent: '#229ed9',
    },
    {
      icon: Phone,
      labelKey: 'phone',
      value: publicEnv.contact.phone,
      href: publicEnv.contact.phone ? `tel:${publicEnv.contact.phone}` : undefined,
    },
    {
      icon: Mail,
      labelKey: 'email',
      value: publicEnv.contact.email,
      href: publicEnv.contact.email ? `mailto:${publicEnv.contact.email}` : undefined,
    },
  ].filter((channel) => channel.value);

  const faqs = [
    { q: t('faqDepositQ'), a: t('faqDepositA') },
    { q: t('faqWithdrawQ'), a: t('faqWithdrawA') },
    { q: t('faqBankQ'), a: t('faqBankA') },
  ];

  return (
    <div className={styles.page}>
      <PageHeader
        icon={<Headphones size={22} />}
        title={t('title')}
        subtitle={t('subtitle')}
      />

      <div className={styles.hours}>
        <Clock size={17} aria-hidden />
        <span>
          {t('hours')}: <strong>{t('hoursValue')}</strong>
        </span>
      </div>

      <div className={styles.channelGrid}>
        {channels.map((channel) => (
          <ChannelCard
            key={channel.labelKey}
            channel={channel}
            label={t(channel.labelKey)}
          />
        ))}
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>{t('faq')}</h2>
        <div className={styles.faqList}>
          {faqs.map((faq) => (
            <details key={faq.q} className={styles.faq}>
              <summary className={styles.faqQuestion}>{faq.q}</summary>
              <p className={styles.faqAnswer}>{faq.a}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
