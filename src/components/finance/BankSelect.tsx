'use client';

import { Check, ChevronDown } from 'lucide-react';
import { useCallback, useRef, useState, type ReactNode } from 'react';

import { FieldShell } from '@/components/ui/Field';
import { useClickOutside } from '@/lib/hooks/use-click-outside';
import { cn } from '@/lib/utils/cn';
import type { Bank } from '@/types';

import styles from './BankSelect.module.scss';

/**
 * Bank picker with logos — a native <select> cannot show them, and members
 * recognise their bank by its mark far faster than by its name.
 */
interface BankSelectProps {
  banks: Bank[];
  value: string;
  onChange: (code: string) => void;
  label?: ReactNode;
  placeholder: string;
  emptyLabel: string;
  error?: string;
  hint?: ReactNode;
  disabled?: boolean;
}

export function BankSelect({
  banks,
  value,
  onChange,
  label,
  placeholder,
  emptyLabel,
  error,
  hint,
  disabled,
}: BankSelectProps) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(wrapper, close, open);

  const selected = banks.find((bank) => bank.code === value) ?? null;

  return (
    <FieldShell label={label} error={error} hint={hint}>
      <div className={styles.wrapper} ref={wrapper}>
        <button
          type="button"
          className={cn(styles.trigger, open && styles.open, error && styles.error)}
          onClick={() => setOpen((v) => !v)}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-invalid={error ? true : undefined}
        >
          {selected ? (
            <>
              <BankLogo bank={selected} size={28} />
              <span className={styles.value}>{selected.name}</span>
            </>
          ) : (
            <span className={styles.placeholder}>{placeholder}</span>
          )}
          <ChevronDown size={18} className={styles.chevron} aria-hidden />
        </button>

        {open && (
          <div className={styles.menu} role="listbox">
            {banks.length === 0 && <p className={styles.empty}>{emptyLabel}</p>}
            {banks.map((bank) => {
              const isSelected = bank.code === value;
              return (
                <button
                  key={bank.code}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={cn(styles.option, isSelected && styles.selected)}
                  onClick={() => {
                    onChange(bank.code);
                    setOpen(false);
                  }}
                >
                  <BankLogo bank={bank} size={28} />
                  <span className={styles.optionName}>{bank.name}</span>
                  {isSelected && <Check size={16} className={styles.check} aria-hidden />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </FieldShell>
  );
}

/** Falls back to the bank's initials on its brand colour if the logo 404s. */
function BankLogo({ bank, size }: { bank: Bank; size: number }) {
  const [failed, setFailed] = useState(false);
  const showImage = bank.logoUrl && !failed;

  return (
    <span className={styles.logo} style={{ width: size, height: size }}>
      {showImage ? (
        // Logos come from the backend's storage host, which is not in
        // next.config images.remotePatterns — a plain <img> keeps it simple.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={bank.logoUrl}
          alt=""
          width={size}
          height={size}
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          className={styles.initials}
          style={{ background: bank.color, fontSize: size * 0.34 }}
        >
          {bank.shortName.slice(0, 3).toUpperCase()}
        </span>
      )}
    </span>
  );
}
