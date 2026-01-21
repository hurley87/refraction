/**
 * Content Security Policy for the application. Allows Privy and Google Fonts
 * while restricting other sources.
 */
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' blob: https://*.privy.io https://api.mapbox.com https://*.mapbox.com https://www.googletagmanager.com https://*.googletagmanager.com;
  connect-src 'self' https://*.privy.io https://*.privy.systems https://api.mapbox.com https://events.mapbox.com https://*.tiles.mapbox.com https://*.mapbox.com https://api.developer.coinbase.com https://www.google-analytics.com https://*.google-analytics.com https://*.walletconnect.com https://*.walletconnect.org wss://*.walletconnect.com wss://*.walletconnect.org https://mainnet.base.org https://*.base.org https://*.alchemy.com https://*.publicnode.com https://*.llamarpc.com https://*.tenderly.co https://*.infura.io https://*.onfinality.io https://*.syndicate.io https://horizon.stellar.org https://horizon-testnet.stellar.org https://horizon-futurenet.stellar.org https://friendbot.stellar.org https://friendbot-futurenet.stellar.org https://rpc-futurenet.stellar.org https://*.stellar.org https://api-js.mixpanel.com https://api.mixpanel.com https://decide.mixpanel.com;
  img-src 'self' data: blob: https:;
  object-src 'self' data: blob:;
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
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "gateway.pinata.cloud",
        pathname: "/ipfs/**",
      },
    ],
  },
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
  async redirects() {
    return [
      {
        source: "/checkpoints/:id",
        destination: "/stellar-checkins/:id",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
