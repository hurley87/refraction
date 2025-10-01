/**
 * Content Security Policy for the application. Allows Privy and Google Fonts
 * while restricting other sources.
 */
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.privy.io https://api.mapbox.com https://*.mapbox.com;
  connect-src 'self' https://*.privy.io https://api.mapbox.com https://events.mapbox.com https://*.tiles.mapbox.com https://*.mapbox.com https://api.developer.coinbase.com;
  img-src 'self' data: blob: https:;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.mapbox.com https://*.mapbox.com;
  font-src 'self' https://fonts.gstatic.com;
  frame-src https://*.privy.io;
  worker-src 'self' blob:;
  child-src 'self' blob:;
`;

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: ContentSecurityPolicy.trim().replace(/\s+/g, " "),
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Handle canvas module for react-pdf
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;

    // Resolve noble package conflicts using dynamic imports
    config.resolve.alias = {
      ...config.resolve.alias,
      "@noble/curves": "@noble/curves",
      "@noble/hashes": "@noble/hashes",
    };

    // Optimize webpack for better dependency resolution
    config.optimization = {
      ...config.optimization,
      providedExports: false,
      usedExports: false,
    };

    // Fallbacks for node modules in client-side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: "crypto-browserify",
        stream: "stream-browserify",
        buffer: "buffer",
      };
    }

    return config;
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
