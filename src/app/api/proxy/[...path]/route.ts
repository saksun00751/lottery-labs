import { NextResponse, type NextRequest } from 'next/server';

import { publicEnv } from '@/config/env.public';
import { handleMock } from '@/lib/api/mock/router';
import { callUpstream, getAccessToken } from '@/lib/api/upstream';

/**
 * Single relay between the browser and the backend.
 *
 * Why it exists:
 *  - the access token lives in an httpOnly cookie, so client JS cannot read it
 *  - the upstream host stays private (API_BASE_URL has no NEXT_PUBLIC_ prefix)
 *  - `NEXT_PUBLIC_USE_MOCK=true` swaps in the in-memory fixtures without the
 *    client-side data layer knowing the difference
 */

export const dynamic = 'force-dynamic';

async function relay(request: NextRequest, path: string[]) {
  const joined = path.join('/');
  const idempotencyKey = request.headers.get('idempotency-key');
  const hasBody = !['GET', 'HEAD'].includes(request.method);
  const rawBody = hasBody ? await request.text() : null;

  if (publicEnv.useMock) {
    const result = await handleMock({
      method: request.method,
      path: joined,
      query: request.nextUrl.searchParams,
      body: rawBody ? safeParse(rawBody) : {},
      idempotencyKey,
    });
    // A touch of latency so loading states are exercised during development.
    await new Promise((resolve) => setTimeout(resolve, 180));
    return NextResponse.json(result.body, { status: result.status });
  }

  const token = await getAccessToken();
  const result = await callUpstream(joined, {
    method: request.method,
    search: request.nextUrl.search,
    body: rawBody,
    contentType: hasBody ? 'application/json' : null,
    idempotencyKey,
    token,
  });

  return NextResponse.json(result.body, { status: result.status });
}

function safeParse(text: string): Record<string, unknown> {
  try {
    const value = JSON.parse(text);
    return typeof value === 'object' && value !== null
      ? (value as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

type Context = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, ctx: Context) {
  return relay(request, (await ctx.params).path);
}
export async function POST(request: NextRequest, ctx: Context) {
  return relay(request, (await ctx.params).path);
}
export async function PUT(request: NextRequest, ctx: Context) {
  return relay(request, (await ctx.params).path);
}
export async function PATCH(request: NextRequest, ctx: Context) {
  return relay(request, (await ctx.params).path);
}
export async function DELETE(request: NextRequest, ctx: Context) {
  return relay(request, (await ctx.params).path);
}
