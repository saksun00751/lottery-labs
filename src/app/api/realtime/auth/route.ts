import { NextResponse, type NextRequest } from 'next/server';

import { getAccessToken, callUpstream } from '@/lib/api/upstream';

export const dynamic = 'force-dynamic';

/**
 * Pusher posts `socket_id` and `channel_name` as form data. Keep the body
 * byte-for-byte intact and add the httpOnly-session token only on the server.
 */
export async function POST(request: NextRequest) {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ code: 'unauthorized', message: 'Unauthorized' }, { status: 401 });
  }

  const result = await callUpstream('realtime/auth', {
    method: 'POST',
    token,
    body: await request.text(),
    contentType:
      request.headers.get('content-type') ?? 'application/x-www-form-urlencoded; charset=UTF-8',
  });

  return NextResponse.json(result.body, { status: result.status });
}
