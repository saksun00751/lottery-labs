import 'server-only';

import { serverEnv } from '@/config/env.server';

export type SiteMeta = {
  name?: string;
  site_name?: string;
  logo?: string;
  logo_url?: string;
  logoUrl?: string;
  favicon?: string;
  favicon_url?: string;
  faviconUrl?: string;
  header_code?: string;
  headerCode?: string;
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
    const siteName = data.name ?? data.site_name;

    if (!siteName) {
      throw new Error('meta/site response is missing site name');
    }

    return data;
  } catch (error) {
    console.warn('[site-meta] falling back to defaults:', error);
    return {};
  }
}
