import { NextResponse, type NextRequest } from 'next/server';

import { callUpstream, getAccessToken } from '@/lib/api/upstream';

/**
 * Single relay between the browser and the backend.
 *
 * Why it exists:
 *  - the access token lives in an httpOnly cookie, so client JS cannot read it
 *  - the upstream host stays private (API_BASE_URL has no NEXT_PUBLIC_ prefix)
 */

export const dynamic = 'force-dynamic';

async function relay(request: NextRequest, path: string[]) {
  const joined = path.join('/');
  const idempotencyKey = request.headers.get('idempotency-key');
  const hasBody = !['GET', 'HEAD'].includes(request.method);
  const rawBody = hasBody ? await request.text() : null;

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
