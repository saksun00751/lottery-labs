'use client';

import { useEffect, useState } from 'react';

export type SiteMetaClient = {
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

export function useSiteMeta() {
  const [siteMeta, setSiteMeta] = useState<SiteMetaClient>({});

  useEffect(() => {
    let active = true;

    async function load() {
      const response = await fetch('/api/proxy/meta/site', {
        method: 'GET',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as SiteMetaClient;
      if (active) {
        setSiteMeta(data);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  return {
    name: siteMeta.name ?? siteMeta.site_name ?? '',
    logo: siteMeta.logo ?? siteMeta.logo_url ?? siteMeta.logoUrl ?? '',
  };
}
