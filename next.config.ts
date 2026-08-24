import path from 'node:path';

import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  sassOptions: {
    // Lets any stylesheet write `@use 'styles/abstracts' as *;` regardless of
    // how deep in the tree it lives. `loadPaths` is the modern Sass API name;
    // `includePaths` is kept for the legacy compiler path.
    loadPaths: [path.join(process.cwd(), 'src')],
    includePaths: [path.join(process.cwd(), 'src')],
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
};

export default withNextIntl(nextConfig);
