/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: false,
  },
  async rewrites() {
    const api = 'https://api.invoica.ai';
    return [
      { source: '/.well-known/:path*', destination: `${api}/.well-known/:path*` },
      { source: '/aiax/:path*',        destination: `${api}/aiax/:path*` },
      { source: '/aiax.json',          destination: `${api}/aiax.json` },
      { source: '/llms.txt',           destination: `${api}/llms.txt` },
    ];
  },
};

module.exports = nextConfig;
