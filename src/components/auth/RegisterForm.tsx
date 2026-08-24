'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Landmark, UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/Button';
import { Input, PasswordInput, Select } from '@/components/ui/Field';
import { publicEnv } from '@/config/env.public';
import { Link } from '@/i18n/navigation';
import { ApiError } from '@/lib/api/client';
import { authApi } from '@/lib/api/endpoints';
import { useBanks } from '@/lib/api/queries';
import { registerSchema, type RegisterValues } from '@/lib/validators/auth';
import type { Bank } from '@/types';

import styles from '../../app/[locale]/(auth)/auth.module.scss';

export function RegisterForm() {
  const t = useTranslations('auth');
  const tv = useTranslations('validation');
  const mode = publicEnv.loginMode;

  const { data: banks, isLoading: banksLoading } = useBanks();
  const [formError, setFormError] = useState<string | null>(null);

  const schema = useMemo(() => registerSchema(mode), [mode]);
  const {
    register,
    handleSubmit,
    setError,
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

  const identifierLabel = mode === 'phone' ? t('phone') : t('username');

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await authApi.register({
        bankCode: values.bankCode,
        bankAccountNumber: values.bankAccountNumber,
        firstName: values.firstName,
        lastName: values.lastName,
        identifier: values.identifier,
        password: values.password,
        phone: values.phone,
        referralCode: values.referralCode || undefined,
      });
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

  const message = (key?: string, field = '') =>
    key ? tv(key, { field, min: 6, max: 60, amount: 0 }) : undefined;

  const bankOptions = ((banks as Bank[] | undefined) ?? []).map((bank) => ({
    value: bank.code,
    label: bank.name,
  }));

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

      <Select
        {...register('bankCode')}
        label={t('bank')}
        placeholder={banksLoading ? '…' : t('bankPlaceholder')}
        options={bankOptions}
        defaultValue=""
        error={message(errors.bankCode?.message, t('bank'))}
      />

      <Input
        {...register('bankAccountNumber')}
        label={t('bankAccountNumber')}
        placeholder={t('bankAccountNumberPlaceholder')}
        inputMode="numeric"
        autoComplete="off"
        error={message(errors.bankAccountNumber?.message, t('bankAccountNumber'))}
      />

      <div className={styles.row}>
        <Input
          {...register('firstName')}
          label={t('firstName')}
          autoComplete="given-name"
          error={message(errors.firstName?.message, t('firstName'))}
        />
        <Input
          {...register('lastName')}
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
        {...register('identifier')}
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
          {...register('password')}
          label={t('password')}
          autoComplete="new-password"
          showLabel={t('showPassword')}
          hideLabel={t('hidePassword')}
          error={message(errors.password?.message, t('password'))}
        />
        <PasswordInput
          {...register('confirmPassword')}
          label={t('confirmPassword')}
          autoComplete="new-password"
          showLabel={t('showPassword')}
          hideLabel={t('hidePassword')}
          error={message(errors.confirmPassword?.message, t('confirmPassword'))}
        />
      </div>

      <Input
        {...register('phone')}
        label={t('phone')}
        placeholder={t('phonePlaceholder')}
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        error={message(errors.phone?.message, t('phone'))}
      />

      <Input
        {...register('referralCode')}
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
