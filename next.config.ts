import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    const noStore = [{ key: 'Cache-Control', value: 'no-store' }]

    return [
      {
        source: '/manifest.json',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'" },
        ],
      },
      {
        source: '/(admin|portal|terapia)/:path*',
        headers: noStore,
      },
      {
        source: '/api/:path*',
        headers: noStore,
      },
      {
        source: '/login',
        headers: noStore,
      },
      {
        source: '/recuperar-senha',
        headers: noStore,
      },
      {
        source: '/atualizar-senha',
        headers: noStore,
      },
    ]
  },
};

export default nextConfig;
