import { z } from 'zod';

/**
 * Form schemas. Messages are i18n keys under the `validation` namespace —
 * resolved at render time so the same schema works in all five languages.
 */

const THAI_PHONE = /^0\d{8,9}$/;
const USERNAME = /^[a-z0-9_]+$/i;
const REFERRAL_CODE = /^[A-Z0-9]*$/;

/** Backend limits, mirrored here so the form fails fast instead of round-tripping. */
export const PASSWORD_MIN = 6;
export const PASSWORD_MAX = 16;
export const ACCOUNT_NUMBER_MIN = 10;
export const ACCOUNT_NUMBER_MAX = 12;
export const REFERRAL_CODE_MAX = 10;

export const identifierSchema = (mode: 'username' | 'phone') =>
  mode === 'phone'
    ? z
        .string()
        .min(1, 'required')
        .transform((v) => v.replace(/[\s-]/g, ''))
        .refine((v) => THAI_PHONE.test(v), 'phoneInvalid')
    : z
        .string()
        .min(4, 'usernameInvalid')
        .max(24, 'usernameInvalid')
        .refine((v) => USERNAME.test(v), 'usernameInvalid');

export const loginSchema = (mode: 'username' | 'phone') =>
  z.object({
    identifier: identifierSchema(mode),
    password: z.string().min(1, 'required'),
  });

export type LoginValues = { identifier: string; password: string };

export const registerSchema = (mode: 'username' | 'phone') =>
  z
    .object({
      bankCode: z.string().min(1, 'selectBank'),
      bankAccountNumber: z
        .string()
        .min(1, 'required')
        .transform((v) => v.replace(/\D/g, ''))
        .refine(
          (v) => v.length >= ACCOUNT_NUMBER_MIN && v.length <= ACCOUNT_NUMBER_MAX,
          'accountNumberLength',
        ),
      firstName: z.string().min(1, 'required').max(60, 'maxLength'),
      lastName: z.string().min(1, 'required').max(60, 'maxLength'),
      identifier: identifierSchema(mode),
      password: z
        .string()
        .min(PASSWORD_MIN, 'passwordLength')
        .max(PASSWORD_MAX, 'passwordLength'),
      confirmPassword: z.string().min(1, 'required'),
      // In phone mode the identifier IS the phone number: the standalone field
      // is hidden and filled from the identifier on submit.
      phone:
        mode === 'phone'
          ? z.string().optional()
          : z
              .string()
              .min(1, 'required')
              .transform((v) => v.replace(/\D/g, ''))
              .refine((v) => THAI_PHONE.test(v), 'phoneInvalid'),
      referralCode: z
        .string()
        .max(REFERRAL_CODE_MAX, 'referralInvalid')
        .refine((v) => REFERRAL_CODE.test(v), 'referralInvalid')
        .optional()
        .or(z.literal('')),
    })
    .refine((data) => data.password === data.confirmPassword, {
      path: ['confirmPassword'],
      message: 'passwordMismatch',
    });

export interface RegisterValues {
  bankCode: string;
  bankAccountNumber: string;
  firstName: string;
  lastName: string;
  identifier: string;
  password: string;
  confirmPassword: string;
  /** Empty in phone mode, where the identifier carries the number. */
  phone: string | undefined;
  referralCode?: string;
}

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'required'),
    newPassword: z.string().min(6, 'passwordWeak'),
    confirmPassword: z.string().min(1, 'required'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'passwordMismatch',
  });

export interface ChangePasswordValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
