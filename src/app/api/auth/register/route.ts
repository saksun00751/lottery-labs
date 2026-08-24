import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

import { publicEnv } from '@/config/env.public';
import { serverEnv } from '@/config/env.server';
import { USER } from '@/lib/api/mock/data';
import { callUpstream } from '@/lib/api/upstream';

export const dynamic = 'force-dynamic';

/** Creates the account and signs the new member straight in. */
export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  if (publicEnv.useMock) {
    const store = await cookies();
    store.set(serverEnv.sessionCookieName, 'mock.registered', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: serverEnv.sessionMaxAge,
    });
    return NextResponse.json({
      user: {
        ...USER,
        username: String(payload.identifier ?? USER.username),
        firstName: String(payload.firstName ?? USER.firstName),
        lastName: String(payload.lastName ?? USER.lastName),
      },
    });
  }

  const upstream = await callUpstream('auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
    contentType: 'application/json',
  });

  const body = upstream.body as { accessToken?: string; user?: unknown };

  if (upstream.status < 400 && body?.accessToken) {
    const store = await cookies();
    store.set(serverEnv.sessionCookieName, body.accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: serverEnv.sessionMaxAge,
    });
    return NextResponse.json({ user: body.user ?? null });
  }

  return NextResponse.json(upstream.body, { status: upstream.status });
}
