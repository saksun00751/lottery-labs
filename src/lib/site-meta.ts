import 'server-only';

import { serverEnv } from '@/config/env.server';

export type SiteMeta = {
  name?: string;
  title?: string;
  description?: string;
  logo?: string;
  header_code?: string;
  deposit_min?: string;
};

export async function getSiteMeta(): Promise<SiteMeta> {
  if (!serverEnv.apiBaseUrl) {
    return {};
  }

  try {
    const response = await fetch(`${serverEnv.apiBaseUrl}/meta/site`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      next: {
        revalidate: 3600,
        tags: ['site-meta'],
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch site meta: ${response.status}`);
    }

    const data = (await response.json()) as SiteMeta;

    if (!data.name) {
      throw new Error('meta/site response is missing site name');
    }

    return data;
  } catch (error) {
    console.warn('[site-meta] falling back to defaults:', error);
    return {};
  }
}
