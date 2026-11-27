import { useTranslations } from 'next-intl';

import type { HanoiResultNumbers } from '@/types';

import styles from './HanoiResultTable.module.scss';

const DIGITS = [
  { count: 2, key: 'two' },
  { count: 3, key: 'three' },
  { count: 4, key: 'four' },
] as const;

export function HanoiResultTable({ result }: { result: HanoiResultNumbers }) {
  const t = useTranslations('lottery');

  return (
    <div className={styles.wrap}>
      <div className={styles.special}>
        <span className={styles.specialLabel}>{t('results.hanoiSpecial')}</span>
        <span className={styles.specialValue}>{result.special || '—'}</span>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">{t('hanoi.channel')}</th>
            {DIGITS.map(({ count }) => (
              <th key={count} scope="col">
                {t('hanoi.digitsValue', { count })}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.channels.map((row) => (
            <tr key={row.channel}>
              <th scope="row">{row.channel}</th>
              {DIGITS.map(({ key }) => (
                <td key={key}>
                  {row[key].length > 0 ? (
                    <div className={styles.values}>
                      {row[key].map((value, index) => (
                        <span key={index}>{value}</span>
                      ))}
                    </div>
                  ) : (
                    '—'
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
