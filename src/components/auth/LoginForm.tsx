'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, LogIn } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/Button';
import { Input, PasswordInput } from '@/components/ui/Field';
import { publicEnv } from '@/config/env.public';
import { Link } from '@/i18n/navigation';
import { ApiError } from '@/lib/api/client';
import { authApi } from '@/lib/api/endpoints';
import { loginSchema, type LoginValues } from '@/lib/validators/auth';

import styles from '../../app/[locale]/(auth)/auth.module.scss';

/**
 * The identifier field is `username` or `phone` depending on
 * NEXT_PUBLIC_LOGIN_MODE — one form, one submit path, the label, keyboard and
 * validation rule all follow the flag.
 */
export function LoginForm() {
  const t = useTranslations('auth');
  const tv = useTranslations('validation');
  const mode = publicEnv.loginMode;
  const searchParams = useSearchParams();

  const [formError, setFormError] = useState<string | null>(null);
  const sessionExpired = searchParams.get('expired') === '1';

  const schema = useMemo(() => loginSchema(mode), [mode]);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: '', password: '' },
  });

  const fieldLabel = mode === 'phone' ? t('phone') : t('username');

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await authApi.login(values.identifier, values.password);
      // Full reload so the proxy sees the new session cookie on the next route.
      const next = searchParams.get('next');
      window.location.href = next && next.startsWith('/') ? next : '/';
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.message : t('loginFailed'),
      );
    }
  });

  const message = (key?: string) =>
    key ? tv(key, { field: fieldLabel, min: 6, max: 24, amount: 0 }) : undefined;

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      {(formError || sessionExpired) && (
        <div className={styles.formError} role="alert">
          <AlertCircle size={17} aria-hidden />
          {formError || t('sessionExpired')}
        </div>
      )}

      <Input
        {...register('identifier')}
        label={fieldLabel}
        placeholder={
          mode === 'phone' ? t('phonePlaceholder') : t('usernamePlaceholder')
        }
        type={mode === 'phone' ? 'tel' : 'text'}
        inputMode={mode === 'phone' ? 'numeric' : 'text'}
        autoComplete={mode === 'phone' ? 'tel' : 'username'}
        autoCapitalize="none"
        error={message(errors.identifier?.message)}
      />

      <PasswordInput
        {...register('password')}
        label={t('password')}
        placeholder={t('passwordPlaceholder')}
        autoComplete="current-password"
        showLabel={t('showPassword')}
        hideLabel={t('hidePassword')}
        error={message(errors.password?.message)}
      />

      <Button
        type="submit"
        size="lg"
        block
        loading={isSubmitting}
        className={styles.submit}
        leftIcon={<LogIn size={19} />}
      >
        {t('loginButton')}
      </Button>

      <p className={styles.switch}>
        {t('noAccount')}
        <Link href="/register" className={styles.switchLink}>
          {t('registerTitle')}
        </Link>
      </p>
    </form>
  );
}
