'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, KeyRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { PasswordInput } from '@/components/ui/Field';
import { ApiError } from '@/lib/api/client';
import { useChangePassword } from '@/lib/api/queries';
import {
  changePasswordSchema,
  type ChangePasswordValues,
} from '@/lib/validators/auth';
import { useUiStore } from '@/store/ui-store';

import styles from '../profile.module.scss';

export function ChangePasswordView() {
  const t = useTranslations('profile');
  const tAuth = useTranslations('auth');
  const tv = useTranslations('validation');
  const tCommon = useTranslations('common');
  const pushToast = useUiStore((s) => s.pushToast);

  const change = useChangePassword();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await change.mutateAsync({
        current: values.currentPassword,
        next: values.newPassword,
      });
      reset();
      pushToast({ tone: 'success', title: t('changePasswordSuccess') });
    } catch (error) {
      if (error instanceof ApiError && error.fields?.currentPassword) {
        setError('currentPassword', { message: 'invalidCurrent' });
      }
      setFormError(
        error instanceof ApiError ? error.message : tCommon('error'),
      );
    }
  });

  const message = (key?: string) => {
    if (!key) return undefined;
    if (key === 'invalidCurrent') return t('wrongCurrentPassword');
    return tv(key, { field: t('currentPassword'), min: 6, max: 60, amount: 0 });
  };

  return (
    <div className={styles.page}>
      <PageHeader
        icon={<KeyRound size={22} />}
        title={t('changePasswordTitle')}
        subtitle={t('security')}
      />

      <div className={styles.card}>
        <form className={styles.form} onSubmit={onSubmit} noValidate>
          {formError && (
            <div className={styles.formError} role="alert">
              <AlertCircle size={17} aria-hidden />
              {formError}
            </div>
          )}

          <PasswordInput
            {...register('currentPassword')}
            label={t('currentPassword')}
            autoComplete="current-password"
            showLabel={tAuth('showPassword')}
            hideLabel={tAuth('hidePassword')}
            error={message(errors.currentPassword?.message)}
          />

          <PasswordInput
            {...register('newPassword')}
            label={t('newPassword')}
            autoComplete="new-password"
            showLabel={tAuth('showPassword')}
            hideLabel={tAuth('hidePassword')}
            error={message(errors.newPassword?.message)}
          />

          <PasswordInput
            {...register('confirmPassword')}
            label={t('confirmNewPassword')}
            autoComplete="new-password"
            showLabel={tAuth('showPassword')}
            hideLabel={tAuth('hidePassword')}
            error={message(errors.confirmPassword?.message)}
          />

          <Button type="submit" size="lg" loading={isSubmitting}>
            {tCommon('save')}
          </Button>
        </form>
      </div>
    </div>
  );
}
