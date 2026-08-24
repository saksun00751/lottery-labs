import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

import { publicEnv } from '@/config/env.public';
import { serverEnv } from '@/config/env.server';
import { mockLogin } from '@/lib/api/mock/router';
import { callUpstream } from '@/lib/api/upstream';

export const dynamic = 'force-dynamic';

/**
 * Exchanges credentials for a session. The access token is written to an
 * httpOnly cookie and never handed to client JavaScript, which keeps it out of
 * reach of any XSS that gets through.
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

  if (publicEnv.useMock) {
    const result = mockLogin(identifier, password);
    if (result) {
      token = result.accessToken;
      user = result.user;
    } else {
      status = 401;
      errorBody = {
        code: 'invalid_credentials',
        message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
      };
    }
  } else {
    const upstream = await callUpstream('auth/login', {
      method: 'POST',
      body: JSON.stringify({
        [publicEnv.loginMode === 'phone' ? 'phone' : 'username']: identifier,
        password,
      }),
      contentType: 'application/json',
    });
    status = upstream.status;
    const payload = upstream.body as { accessToken?: string; user?: unknown };
    if (upstream.status < 400 && payload?.accessToken) {
      token = payload.accessToken;
      user = payload.user ?? null;
    } else {
      errorBody = upstream.body;
    }
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

  return NextResponse.json({ user });
}
