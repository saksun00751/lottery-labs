import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';

import { routing } from '@/i18n/routing';

/**
 * Next.js 16 renamed `middleware.ts` to `proxy.ts`. This runs on every request
 * that matches `config.matcher` below and does two jobs:
 *
 *   1. locale negotiation / redirect (next-intl)
 *   2. a coarse auth gate so signed-out visitors never reach member pages
 *
 * The real authorisation always happens upstream in the API — this is purely a
 * routing convenience.
 */

const intlMiddleware = createIntlMiddleware(routing);

/** Route segments (locale prefix stripped) reachable while signed out. */
const PUBLIC_SEGMENTS = ['/login', '/register', '/contact', '/contact-public', '/promotion'];

/** Route segments that always require a session. */
const PRIVATE_SEGMENTS = [
  '/lottery',
  '/slip',
  '/results',
  '/profile',
  '/deposit',
  '/withdraw',
  '/history',
  '/referral',
];

const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME || 'll_session';

function stripLocale(pathname: string) {
  const [, maybeLocale, ...rest] = pathname.split('/');
  if ((routing.locales as readonly string[]).includes(maybeLocale)) {
    return { locale: maybeLocale, path: `/${rest.join('/')}` };
  }
  return { locale: null, path: pathname };
}

export default function proxy(request: NextRequest) {
  const response = intlMiddleware(request);

  // next-intl already decided to redirect (missing/!invalid locale prefix).
  if (response.headers.get('location')) return response;

  const { locale, path } = stripLocale(request.nextUrl.pathname);
  const activeLocale = locale ?? routing.defaultLocale;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  const isPrivate = PRIVATE_SEGMENTS.some(
    (segment) => path === segment || path.startsWith(`${segment}/`),
  );
  const isAuthPage = path === '/login' || path === '/register';

  if (isPrivate && !hasSession) {
    const url = new URL(`/${activeLocale}/login`, request.url);
    url.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPage && hasSession) {
    return NextResponse.redirect(new URL(`/${activeLocale}`, request.url));
  }

  // `/` is the members' home — treat it as private too.
  if (path === '/' && !hasSession && !PUBLIC_SEGMENTS.includes(path)) {
    return NextResponse.redirect(new URL(`/${activeLocale}/login`, request.url));
  }

  return response;
}

export const config = {
  // Everything except API routes, Next internals and static files.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
