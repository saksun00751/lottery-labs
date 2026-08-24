'use client';

import { AlertCircle, ChevronDown, Eye, EyeOff } from 'lucide-react';
import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';

import { cn } from '@/lib/utils/cn';

import styles from './Field.module.scss';

interface FieldShellProps {
  label?: ReactNode;
  optionalLabel?: string;
  error?: string;
  hint?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
}

function FieldShell({
  label,
  optionalLabel,
  error,
  hint,
  htmlFor,
  children,
}: FieldShellProps) {
  return (
    <div className={styles.field}>
      {label && (
        <label className={styles.label} htmlFor={htmlFor}>
          {label}
          {optionalLabel && <span className={styles.optional}>{optionalLabel}</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className={styles.message} role="alert">
          <AlertCircle size={15} aria-hidden />
          {error}
        </p>
      ) : (
        hint && <p className={styles.hint}>{hint}</p>
      )}
    </div>
  );
}

/* ---------------------------------- Input -------------------------------- */

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: ReactNode;
  optionalLabel?: string;
  error?: string;
  hint?: ReactNode;
  prefix?: ReactNode;
  suffix?: ReactNode;
  /** Renders the value in the tabular numeric face — used for money. */
  amount?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, optionalLabel, error, hint, prefix, suffix, amount, className, ...rest },
  ref,
) {
  const generatedId = useId();
  const id = rest.id ?? generatedId;

  return (
    <FieldShell
      label={label}
      optionalLabel={optionalLabel}
      error={error}
      hint={hint}
      htmlFor={id}
    >
      <div className={styles.control}>
        {prefix && <span className={styles.prefix}>{prefix}</span>}
        <input
          {...rest}
          id={id}
          ref={ref}
          aria-invalid={error ? true : undefined}
          className={cn(
            styles.input,
            amount && styles.amount,
            prefix && styles.withPrefix,
            suffix && styles.withSuffix,
            error && styles.error,
            className,
          )}
        />
        {suffix && <span className={styles.suffix}>{suffix}</span>}
      </div>
    </FieldShell>
  );
});

/* ------------------------------ PasswordInput ---------------------------- */

export interface PasswordInputProps extends Omit<InputProps, 'type' | 'suffix'> {
  showLabel: string;
  hideLabel: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ showLabel, hideLabel, ...rest }, ref) {
    const [visible, setVisible] = useState(false);

    return (
      <Input
        {...rest}
        ref={ref}
        type={visible ? 'text' : 'password'}
        suffix={
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? hideLabel : showLabel}
          >
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        }
      />
    );
  },
);

/* --------------------------------- Select -------------------------------- */

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  error?: string;
  hint?: ReactNode;
  placeholder?: string;
  options: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, placeholder, options, className, ...rest },
  ref,
) {
  const generatedId = useId();
  const id = rest.id ?? generatedId;

  return (
    <FieldShell label={label} error={error} hint={hint} htmlFor={id}>
      <div className={styles.control}>
        <select
          {...rest}
          id={id}
          ref={ref}
          aria-invalid={error ? true : undefined}
          className={cn(styles.select, error && styles.error, className)}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className={styles.selectChevron}>
          <ChevronDown size={18} aria-hidden />
        </span>
      </div>
    </FieldShell>
  );
});
