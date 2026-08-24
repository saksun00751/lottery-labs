import type { MetadataRoute } from 'next';

import { publicEnv } from '@/config/env.public';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: publicEnv.siteName,
    short_name: 'LL',
    description: 'แทงหวยออนไลน์ — ปลอดภัย รวดเร็ว ทุกที่ทุกเวลา',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#08080a',
    theme_color: '#08080a',
    categories: ['entertainment', 'finance'],
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'แทงหวย',
        url: '/lottery',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'ประวัติ',
        url: '/history',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
    ],
  };
}
