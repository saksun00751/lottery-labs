import 'server-only';

import { z } from 'zod';

/** Server-only configuration. Never imported from a Client Component. */
const schema = z.object({
  API_BASE_URL: z.string().url().or(z.literal('')).default(''),
  API_KEY: z.string().default(''),
  API_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
  SESSION_COOKIE_NAME: z.string().min(1).default('ll_session'),
  SESSION_MAX_AGE: z.coerce.number().int().positive().default(43_200),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(
    `Invalid server environment configuration:\n${z.prettifyError(parsed.error)}`,
  );
}

export const serverEnv = {
  apiBaseUrl: parsed.data.API_BASE_URL.replace(/\/+$/, ''),
  apiKey: parsed.data.API_KEY,
  apiTimeoutMs: parsed.data.API_TIMEOUT_MS,
  sessionCookieName: parsed.data.SESSION_COOKIE_NAME,
  sessionMaxAge: parsed.data.SESSION_MAX_AGE,
};
