const isPages = process.env.GITHUB_PAGES === 'true';
const repo = 'incident_mapper';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  basePath: isPages ? `/${repo}` : undefined,
  assetPrefix: isPages ? `/${repo}/` : undefined,
  output: isPages ? 'export' : undefined,
  async rewrites() {
    if (isPages) return [];
    const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100';
    return [
      { source: '/v1/:path*', destination: `${api}/v1/:path*` }
    ];
  }
};

export default nextConfig;
