'use client';

import { Check, Monitor, Moon, Palette, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';

import { useClickOutside } from '@/lib/hooks/use-click-outside';
import { cn } from '@/lib/utils/cn';
import { themeLabels, useThemeStore, type ColorMode } from '@/store/theme-store';

import styles from './Navbar.module.scss';

const MODES: { value: ColorMode; icon: typeof Sun }[] = [
  { value: 'dark', icon: Moon },
  { value: 'light', icon: Sun },
  { value: 'system', icon: Monitor },
];

export function ThemeSwitcher() {
  const t = useTranslations('settings');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false), open);

  const { theme, mode, availableThemes, setTheme, setMode } = useThemeStore();

  return (
    <div className={styles.popWrap} ref={ref}>
      <button
        type="button"
        className={styles.iconButton}
        aria-label={t('appearance')}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Palette size={20} />
      </button>

      {open && (
        <div className={styles.pop} role="menu">
          <div className={styles.popTitle}>{t('theme')}</div>
          {availableThemes.map((id) => {
            const meta = themeLabels[id];
            return (
              <button
                key={id}
                type="button"
                role="menuitemradio"
                aria-checked={id === theme}
                className={cn(styles.popItem, id === theme && styles.popItemActive)}
                onClick={() => setTheme(id)}
              >
                <span className={styles.swatch} aria-hidden>
                  <span style={{ background: meta?.swatch[0] ?? '#111' }} />
                  <span style={{ background: meta?.swatch[1] ?? '#888' }} />
                </span>
                {meta?.name ?? id}
                {id === theme && (
                  <span className={styles.check}>
                    <Check size={16} />
                  </span>
                )}
              </button>
            );
          })}

          <div className={styles.divider} />

          <div className={styles.popTitle}>{t('colorMode')}</div>
          {MODES.map(({ value, icon: Icon }) => (
            <button
              key={value}
              type="button"
              role="menuitemradio"
              aria-checked={value === mode}
              className={cn(styles.popItem, value === mode && styles.popItemActive)}
              onClick={() => setMode(value)}
            >
              <Icon size={17} />
              {t(`modes.${value}`)}
              {value === mode && (
                <span className={styles.check}>
                  <Check size={16} />
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
