import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

import { publicEnv } from '@/config/env.public';
import { serverEnv } from '@/config/env.server';
import { USER } from '@/lib/api/mock/data';
import { callUpstream } from '@/lib/api/upstream';

export const dynamic = 'force-dynamic';

/**
 * Creates the account and signs the new member straight in.
 *
 * The upstream register endpoint speaks snake_case and does NOT return a
 * token, so this handler does three things: translate the form payload into
 * the backend contract, translate any validation failure back onto the form
 * field names, and — on success — log the member in to obtain the session.
 */

interface RegisterBody {
  bankCode?: string;
  bankAccountNumber?: string;
  firstName?: string;
  lastName?: string;
  identifier?: string;
  password?: string;
  phone?: string;
  referralCode?: string;
  marketingCode?: string;
}

/** Maps upstream field names onto the register form's field names. */
const FIELD_MAP: Record<string, string> = {
  user_name: 'identifier',
  password: 'password',
  password_confirm: 'confirmPassword',
  confirmPassword: 'confirmPassword',
  firstname: 'firstName',
  name: 'firstName',
  lastname: 'lastName',
  bank: 'bankCode',
  acc_no: 'bankAccountNumber',
  tel: 'phone',
};

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => ({}))) as RegisterBody;

  if (publicEnv.useMock) {
    await setSession('mock.registered');
    return NextResponse.json({
      user: {
        ...USER,
        username: payload.identifier ?? USER.username,
        firstName: payload.firstName ?? USER.firstName,
        lastName: payload.lastName ?? USER.lastName,
      },
    });
  }

  const userName = (payload.identifier ?? '').trim();
  const password = payload.password ?? '';
  const accNo = (payload.bankAccountNumber ?? '').replace(/\D/g, '');
  const referralCode = (payload.referralCode ?? '').trim();
  const marketingCode = (payload.marketingCode ?? '').trim();

  const upstream = await callUpstream('auth/register', {
    method: 'POST',
    contentType: 'application/json',
    body: JSON.stringify({
      user_name: userName,
      password,
      password_confirm: password,
      name: `${payload.firstName ?? ''} ${payload.lastName ?? ''}`.trim(),
      acc_no: accNo,
      bank: Number(payload.bankCode),
      tel: (payload.phone ?? '').replace(/\D/g, ''),
      refer: 1,
      ...(referralCode ? { referral_code: referralCode } : {}),
      ...(marketingCode ? { marketing: marketingCode } : {}),
    }),
  });

  if (upstream.status >= 400) {
    return NextResponse.json(toErrorShape(upstream.body, upstream.status), {
      status: upstream.status,
    });
  }

  // The register call succeeds without a session, so exchange the same
  // credentials for a token immediately. A failure here is not fatal — the
  // account exists, the member just lands on the login screen.
  const login = await callUpstream('auth/login', {
    method: 'POST',
    contentType: 'application/json',
    body: JSON.stringify({ user_name: userName, password }),
  });

  const session = login.body as {
    access_token?: string;
    member?: Record<string, unknown>;
  };

  if (login.status < 400 && session?.access_token) {
    await setSession(session.access_token);
    return NextResponse.json({ user: session.member ?? null });
  }

  return NextResponse.json({ user: null, requiresLogin: true });
}

async function setSession(token: string) {
  const store = await cookies();
  store.set(serverEnv.sessionCookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: serverEnv.sessionMaxAge,
  });
}

/**
 * Normalises every error dialect the backend uses (`errors`, `details`,
 * `duplicate_fields`) into the `{ code, message, fields }` shape the client
 * `ApiError` understands.
 *
 * Field messages arrive already localised by the backend, so they are marked
 * with a leading `!` — the form renders those verbatim instead of looking them
 * up in the `validation` namespace.
 */
function toErrorShape(body: unknown, status: number) {
  const source = (body ?? {}) as {
    message?: string;
    code?: string;
    errors?: Record<string, unknown>;
    details?: Record<string, { messages?: string[] }>;
    duplicate_fields?: string[];
  };

  const fields: Record<string, string> = {};

  for (const [key, value] of Object.entries(source.errors ?? {})) {
    const field = FIELD_MAP[key];
    const message = Array.isArray(value) ? value[0] : value;
    if (field && typeof message === 'string' && !fields[field]) {
      fields[field] = `!${message}`;
    }
  }

  for (const [key, value] of Object.entries(source.details ?? {})) {
    const field = FIELD_MAP[key];
    const message = value?.messages?.[0];
    if (field && message && !fields[field]) fields[field] = `!${message}`;
  }

  // Conflicts the backend reports separately from validation errors.
  for (const key of source.duplicate_fields ?? []) {
    const field = FIELD_MAP[key];
    if (!field || fields[field]) continue;
    fields[field] =
      key === 'acc_no' ? 'accountNumberDuplicate' : 'identifierTaken';
  }

  if (!Object.keys(fields).length && status === 409) {
    fields.identifier = 'identifierTaken';
  }

  return {
    code: source.code ?? 'register_failed',
    message: safeMessage(source.message),
    ...(Object.keys(fields).length ? { fields } : {}),
  };
}

/** Guards against a raw JSON body leaking into the UI as an error message. */
function safeMessage(message: string | undefined) {
  const trimmed = (message ?? '').trim();
  if (!trimmed || trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return 'สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';
  }
  return trimmed;
}
