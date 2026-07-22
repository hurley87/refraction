/**
 * Content Security Policy for the application: allowlisted third parties the app
 * depends on (Privy, Mapbox, wallets, analytics, Sentry, etc.) with restrictive defaults.
 * Sentry needs explicit regional ingest patterns (e.g. *.ingest.us.sentry.io); a bare
 * *.sentry.io entry does not match those multi-label hostnames under CSP wildcard rules.
 * script-src uses 'unsafe-inline' because Next.js/React inject many inline scripts
 * whose hashes change per build; hash allowlists would need constant updates.
 */
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' blob: https://*.privy.io https://api.mapbox.com https://*.mapbox.com https://www.googletagmanager.com https://*.googletagmanager.com;
  connect-src 'self' https://*.privy.io https://*.privy.systems https://api.mapbox.com https://events.mapbox.com https://*.tiles.mapbox.com https://*.mapbox.com https://api.developer.coinbase.com https://www.google-analytics.com https://*.google-analytics.com https://*.walletconnect.com https://api.pay.walletconnect.com https://*.walletconnect.org wss://*.walletconnect.com wss://*.walletconnect.org https://mainnet.base.org https://*.base.org https://*.alchemy.com https://*.publicnode.com https://*.llamarpc.com https://*.tenderly.co https://*.infura.io https://*.onfinality.io https://*.syndicate.io https://horizon.stellar.org https://horizon-testnet.stellar.org https://horizon-futurenet.stellar.org https://friendbot.stellar.org https://friendbot-futurenet.stellar.org https://rpc-futurenet.stellar.org https://*.stellar.org https://api-js.mixpanel.com https://api.mixpanel.com https://decide.mixpanel.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.ingest.de.sentry.io;
  img-src 'self' data: blob: https:;
  object-src 'self' data: blob:;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.mapbox.com https://*.mapbox.com;
  font-src 'self' https://fonts.gstatic.com;
  frame-src https://*.privy.io https://verify.walletconnect.org https://*.walletconnect.org https://verify.walletconnect.com https://*.walletconnect.com https://pay.walletconnect.com;
  worker-src 'self' blob:;
  child-src 'self' blob:;
`;

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: ContentSecurityPolicy.trim().replace(/\s+/g, " "),
  },
];

import { withSentryConfig } from "@sentry/nextjs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const deploymentId =
  process.env.NEXT_DEPLOYMENT_ID ??
  process.env.VERCEL_DEPLOYMENT_ID ??
  process.env.VERCEL_GIT_COMMIT_SHA;

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(deploymentId ? { deploymentId } : {}),
  // Run these checks separately in CI/local development so the Vercel build
  // does not hold lint, type-check, and compilation graphs in memory together.
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverComponentsExternalPackages: [
      "@stellar/js-xdr",
      "@stellar/stellar-base",
      "@stellar/stellar-sdk",
    ],
  },
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
      {
        protocol: "https",
        hostname: "dice-media.imgix.net",
      },
      {
        protocol: "https",
        hostname: "dice-media-test.imgix.net",
      },
      {
        protocol: "https",
        hostname: "imgproxy.ra.co",
      },
      {
        protocol: "https",
        hostname: "images.ra.co",
      },
      {
        protocol: "https",
        hostname: "drive.google.com",
        pathname: "/uc**",
      },
    ],
  },
  webpack: (config, { isServer, dev }) => {
    // Handle canvas module for react-pdf
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;

    // Resolve noble package conflicts using dynamic imports
    // Force @walletconnect/universal-provider to root node_modules (Privy's nested copy can be incomplete)
    config.resolve.alias = {
      ...config.resolve.alias,
      "@noble/curves": "@noble/curves",
      "@noble/hashes": "@noble/hashes",
      "@walletconnect/universal-provider": path.resolve(
        __dirname,
        "node_modules/@walletconnect/universal-provider"
      ),
    };

    // Production-only: these flags have caused dev-server compile/watch stalls on large apps.
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        providedExports: false,
        usedExports: false,
      };
    }

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
    // Strict CSP can break or slow Next.js dev (HMR, inline scripts, tooling). Apply on prod builds only.
    if (process.env.NODE_ENV !== "production") {
      return [];
    }
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
        source: "/favicon.ico",
        destination: "/irl-svg/irl-logo-new-favicon.svg",
        permanent: false,
      },
      {
        source: "/map",
        destination: "/interactive-map/",
        permanent: true,
      },
      {
        source: "/map/",
        destination: "/interactive-map/",
        permanent: true,
      },
      {
        source: "/editorial",
        destination: "/city-guides",
        permanent: true,
      },
      {
        source: "/editorial/template",
        destination: "/city-guides",
        permanent: true,
      },
      {
        source: "/city-guides/template",
        destination: "/city-guides",
        permanent: true,
      },
      {
        source: "/city-guides/editorial/template",
        destination: "/city-guides",
        permanent: true,
      },
      {
        source: "/write-a-guide",
        destination:
          "https://refraction-irl.notion.site/Co-create-an-IRL-Guide-to-Your-City-26aec10dc65e80918792c6e40f903126?pvs=73",
        permanent: false,
      },
      {
        source: "/write-a-guide/",
        destination:
          "https://refraction-irl.notion.site/Co-create-an-IRL-Guide-to-Your-City-26aec10dc65e80918792c6e40f903126?pvs=73",
        permanent: false,
      },
    ];
  },
};

const sentryWebpackPluginOptions = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
};

export default withSentryConfig(nextConfig, sentryWebpackPluginOptions);
