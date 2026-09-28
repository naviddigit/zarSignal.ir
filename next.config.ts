import type { NextConfig } from 'next';
const config: NextConfig = {
  output: 'standalone', poweredByHeader: false,
  outputFileTracingIncludes: { '/pricing': ['./prisma/migrations/20260927120000_analysis_time_reliability/migration.sql'], '/admin/plans': ['./prisma/migrations/20260927120000_analysis_time_reliability/migration.sql'] },
  allowedDevOrigins: ['127.0.0.1'],
  async headers() { return [{ source: '/(.*)', headers: [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  ] }]; },
};
export default config;
