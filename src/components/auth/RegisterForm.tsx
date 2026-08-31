'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Landmark, Loader2, UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import { BankSelect } from '@/components/finance/BankSelect';
import { Button } from '@/components/ui/Button';
import { Input, PasswordInput } from '@/components/ui/Field';
import { publicEnv } from '@/config/env.public';
import { Link } from '@/i18n/navigation';
import { ApiError } from '@/lib/api/client';
import { authApi } from '@/lib/api/endpoints';
import { useBanks } from '@/lib/api/queries';
import {
  PASSWORD_MAX,
  REFERRAL_CODE_MAX,
  ACCOUNT_NUMBER_MAX,
  ACCOUNT_NUMBER_MIN,
  registerSchema,
  type RegisterValues,
} from '@/lib/validators/auth';
import type { Bank } from '@/types';

import styles from '../../app/[locale]/(auth)/auth.module.scss';

/** Wallet accounts have no name lookup upstream — the member types their own. */
const NO_NAME_LOOKUP_BANK = '18';

/** Where the campaign code from `?market=` survives a page reload. */
const MARKETING_STORAGE_KEY = 'marketing_code';

/** Thai letters, Lao, Khmer, Latin and digits — everything else is dropped. */
const NAME_ALLOWED = /[^a-zA-Z฀-๿຀-໿ក-៿0-9\s]/g;
const PASSWORD_ALLOWED = /[^a-zA-Z0-9]/g;
const REFERRAL_ALLOWED = /[^A-Z0-9]/g;

/**
 * Formats a mobile number as the member types: 0XX-XXX-XXXX(XX). Capped at
 * 12 digits (0 + 11) to fit Myanmar numbers, which run longer than TH/KH's.
 */
function formatPhone(raw: string) {
  const digits = raw.replace(/\D/g, '').slice(0, 12);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function RegisterForm() {
  const t = useTranslations('auth');
  const tv = useTranslations('validation');
  const tc = useTranslations('common');
  const mode = publicEnv.loginMode;

  const { data: banks, isLoading: banksLoading } = useBanks();
  const [formError, setFormError] = useState<string | null>(null);
  const [marketingCode, setMarketingCode] = useState('');
  const [lookupPending, setLookupPending] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const schema = useMemo(() => registerSchema(mode), [mode]);
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      bankCode: '',
      bankAccountNumber: '',
      firstName: '',
      lastName: '',
      identifier: '',
      password: '',
      confirmPassword: '',
      phone: '',
      referralCode: '',
    },
  });

  // `?ref=` prefills the referral code, `?market=` tags the signup with the
  // campaign that brought the member here and is remembered until they finish.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const ref = params.get('ref');
    if (ref) setValue('referralCode', ref.toUpperCase().slice(0, REFERRAL_CODE_MAX));

    const market = params.get('market');
    if (market) {
      localStorage.setItem(MARKETING_STORAGE_KEY, market);
      setMarketingCode(market);
      return;
    }
    setMarketingCode(localStorage.getItem(MARKETING_STORAGE_KEY) ?? '');
  }, [setValue]);

  const bankCode = watch('bankCode');
  const accountNumber = watch('bankAccountNumber');

  // Once the account number looks complete, ask the backend who owns it and
  // fill the name in. The member can still overwrite what comes back.
  useEffect(() => {
    setLookupError(null);

    const digits = (accountNumber ?? '').replace(/\D/g, '');
    if (
      !bankCode ||
      bankCode === NO_NAME_LOOKUP_BANK ||
      digits.length < ACCOUNT_NUMBER_MIN
    ) {
      setLookupPending(false);
      return;
    }

    let cancelled = false;
    setLookupPending(true);

    const timer = setTimeout(async () => {
      try {
        const result = await authApi.lookupBankAccountName(bankCode, digits);
        if (cancelled) return;
        if (result.firstName || result.lastName) {
          setValue('firstName', result.firstName, { shouldValidate: true });
          setValue('lastName', result.lastName, { shouldValidate: true });
        } else {
          setLookupError(result.message || t('accountNameNotFound'));
        }
      } catch (error) {
        if (cancelled) return;
        setLookupError(
          error instanceof ApiError ? error.message : t('accountNameNotFound'),
        );
      } finally {
        if (!cancelled) setLookupPending(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [bankCode, accountNumber, setValue, t]);

  const identifierLabel = mode === 'phone' ? t('phone') : t('username');

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const phone = (mode === 'phone' ? values.identifier : values.phone) ?? '';
      await authApi.register({
        bankCode: values.bankCode,
        bankAccountNumber: values.bankAccountNumber,
        firstName: values.firstName,
        lastName: values.lastName,
        identifier: values.identifier,
        password: values.password,
        phone,
        referralCode: values.referralCode || undefined,
        marketingCode: marketingCode || undefined,
      });
      // The campaign has been credited — don't tag a second signup with it.
      localStorage.removeItem(MARKETING_STORAGE_KEY);
      window.location.href = '/';
    } catch (error) {
      if (error instanceof ApiError && error.fields) {
        // Field-level errors from the backend land on the right inputs.
        for (const [field, code] of Object.entries(error.fields)) {
          setError(field as keyof RegisterValues, { message: code });
        }
      }
      setFormError(
        error instanceof ApiError ? error.message : t('registerButton'),
      );
    }
  });

  /**
   * Field messages are `validation` keys, except server-side ones which the
   * backend already localised and the route marked with a leading `!`.
   */
  const message = (key?: string, field = '') => {
    if (!key) return undefined;
    if (key.startsWith('!')) return key.slice(1);
    return tv(key, {
      field,
      min: ACCOUNT_NUMBER_MIN,
      max: ACCOUNT_NUMBER_MAX,
      amount: 0,
    });
  };

  /** Runs the typed value through `clean` before react-hook-form sees it. */
  const sanitized = (
    field: keyof RegisterValues,
    clean: (value: string) => string,
  ) => {
    const bound = register(field);
    return {
      ...bound,
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
        event.target.value = clean(event.target.value);
        return bound.onChange(event);
      },
    };
  };

  const bankList = (banks as Bank[] | undefined) ?? [];

  const accountNumberError =
    message(errors.bankAccountNumber?.message, t('bankAccountNumber')) ??
    lookupError ??
    undefined;

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      {formError && (
        <div className={styles.formError} role="alert">
          <AlertCircle size={17} aria-hidden />
          {formError}
        </div>
      )}

      <div className={styles.groupTitle}>
        <Landmark size={13} aria-hidden />
        {t('stepBank')}
      </div>

      {/* Registered as a hidden field so the picker below drives the form. */}
      <input type="hidden" {...register('bankCode')} />
      <BankSelect
        banks={bankList}
        value={bankCode}
        onChange={(code) => setValue('bankCode', code, { shouldValidate: true })}
        label={t('bank')}
        placeholder={banksLoading ? tc('loading') : t('bankPlaceholder')}
        emptyLabel={banksLoading ? tc('loading') : tc('noData')}
        disabled={banksLoading}
        error={message(errors.bankCode?.message, t('bank'))}
      />

      <Input
        {...sanitized('bankAccountNumber', (v) =>
          v.replace(/\D/g, '').slice(0, ACCOUNT_NUMBER_MAX),
        )}
        label={t('bankAccountNumber')}
        placeholder={t('bankAccountNumberPlaceholder')}
        inputMode="numeric"
        autoComplete="off"
        error={accountNumberError}
        hint={
          lookupPending ? (
            <>
              <Loader2 size={13} aria-hidden /> {t('accountNameChecking')}
            </>
          ) : undefined
        }
      />

      <div className={styles.row}>
        <Input
          {...sanitized('firstName', (v) => v.replace(NAME_ALLOWED, ''))}
          label={t('firstName')}
          autoComplete="given-name"
          error={message(errors.firstName?.message, t('firstName'))}
        />
        <Input
          {...sanitized('lastName', (v) => v.replace(NAME_ALLOWED, ''))}
          label={t('lastName')}
          autoComplete="family-name"
          error={message(errors.lastName?.message, t('lastName'))}
        />
      </div>

      <div className={styles.groupTitle}>
        <UserPlus size={13} aria-hidden />
        {t('stepAccount')}
      </div>

      <Input
        {...(mode === 'phone'
          ? sanitized('identifier', formatPhone)
          : register('identifier'))}
        label={identifierLabel}
        placeholder={
          mode === 'phone' ? t('phonePlaceholder') : t('usernamePlaceholder')
        }
        type={mode === 'phone' ? 'tel' : 'text'}
        inputMode={mode === 'phone' ? 'numeric' : 'text'}
        autoComplete="username"
        autoCapitalize="none"
        error={message(errors.identifier?.message, identifierLabel)}
      />

      <div className={styles.row}>
        <PasswordInput
          {...sanitized('password', (v) =>
            v.replace(PASSWORD_ALLOWED, '').slice(0, PASSWORD_MAX),
          )}
          label={t('password')}
          autoComplete="new-password"
          showLabel={t('showPassword')}
          hideLabel={t('hidePassword')}
          error={message(errors.password?.message, t('password'))}
        />
        <PasswordInput
          {...sanitized('confirmPassword', (v) =>
            v.replace(PASSWORD_ALLOWED, '').slice(0, PASSWORD_MAX),
          )}
          label={t('confirmPassword')}
          autoComplete="new-password"
          showLabel={t('showPassword')}
          hideLabel={t('hidePassword')}
          error={message(errors.confirmPassword?.message, t('confirmPassword'))}
        />
      </div>

      {/* In phone mode the identifier above already is the phone number. */}
      {mode !== 'phone' && (
        <Input
          {...sanitized('phone', formatPhone)}
          label={t('phone')}
          placeholder={t('phonePlaceholder')}
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          error={message(errors.phone?.message, t('phone'))}
        />
      )}

      <Input
        {...sanitized('referralCode', (v) =>
          v.toUpperCase().replace(REFERRAL_ALLOWED, '').slice(0, REFERRAL_CODE_MAX),
        )}
        label={t('referralCode')}
        optionalLabel={t('referralCodePlaceholder')}
        autoComplete="off"
        autoCapitalize="characters"
        error={message(errors.referralCode?.message, t('referralCode'))}
      />

      <Button
        type="submit"
        size="lg"
        block
        loading={isSubmitting}
        className={styles.submit}
        leftIcon={<UserPlus size={19} />}
      >
        {t('registerButton')}
      </Button>

      <p className={styles.notice}>{t('ageNotice')}</p>

      <p className={styles.switch}>
        {t('hasAccount')}
        <Link href="/login" className={styles.switchLink}>
          {t('loginTitle')}
        </Link>
      </p>
    </form>
  );
}
