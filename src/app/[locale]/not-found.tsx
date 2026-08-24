import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';

import styles from './not-found.module.scss';

export default async function NotFound() {
  const t = await getTranslations('common');

  return (
    <div className={styles.wrap}>
      <div className={styles.code}>404</div>
      <h1 className={styles.title}>{t('notFound')}</h1>
      <p className={styles.text}>{t('notFoundHint')}</p>
      <Link href="/" className={styles.button}>
        {t('goHome')}
      </Link>
    </div>
  );
}
