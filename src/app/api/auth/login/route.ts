import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

import { serverEnv } from '@/config/env.server';
import { callUpstream } from '@/lib/api/upstream';
import { AUTH_FLAG_COOKIE } from '@/lib/auth-cookie';

export const dynamic = 'force-dynamic';

/**
 * Exchanges credentials for a session. The access token is written to an
 * httpOnly cookie and never handed to client JavaScript, which keeps it out of
 * reach of any XSS that gets through.
 *
 * The upstream endpoint only ever accepts the identifier as `user_name`
 * (a phone number in phone mode, a username otherwise) — there's no separate
 * `phone` field to switch to.
 */
export async function POST(request: NextRequest) {
  const { identifier, password } = (await request.json().catch(() => ({}))) as {
    identifier?: string;
    password?: string;
  };

  if (!identifier || !password) {
    return NextResponse.json(
      { code: 'missing_credentials', message: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
      { status: 422 },
    );
  }

  let token: string | null = null;
  let user: unknown = null;
  let status = 200;
  let errorBody: unknown = null;

  const upstream = await callUpstream('auth/login', {
    method: 'POST',
    body: JSON.stringify({ user_name: identifier, password }),
    contentType: 'application/json',
  });
  status = upstream.status;
  const payload = upstream.body as {
    access_token?: string;
    member?: unknown;
    message?: string;
    success?: boolean;
  };
  if (upstream.status < 400 && payload?.access_token) {
    token = payload.access_token;
    user = payload.member ?? null;
  } else {
    errorBody = {
      code: 'invalid_credentials',
      message: safeMessage(payload?.message),
    };
  }

  if (!token) {
    return NextResponse.json(errorBody, { status: status >= 400 ? status : 401 });
  }

  const store = await cookies();
  store.set(serverEnv.sessionCookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: serverEnv.sessionMaxAge,
  });
  // Readable by client JS so it can tell a session exists without holding
  // the token itself — lets RealtimeProvider skip its auth check for guests.
  store.set(AUTH_FLAG_COOKIE, '1', {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: serverEnv.sessionMaxAge,
  });

  return NextResponse.json({ user });
}

/** Guards against a raw JSON body leaking into the UI as an error message. */
function safeMessage(message: string | undefined) {
  const trimmed = (message ?? '').trim();
  if (!trimmed || trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';
  }
  return trimmed;
}
