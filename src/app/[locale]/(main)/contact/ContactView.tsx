'use client';

import { Headphones } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ContactChannels } from '@/components/contact/ContactChannels';
import { PageHeader } from '@/components/layout/PageHeader';

import styles from './contact.module.scss';

export function ContactView() {
  const t = useTranslations('contact');

  return (
    <div className={styles.page}>
      <PageHeader icon={<Headphones size={22} />} title={t('title')} subtitle={t('subtitle')} />
      <ContactChannels />
    </div>
  );
}
