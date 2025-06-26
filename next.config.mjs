/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Handle canvas module for react-pdf
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;

    // Resolve noble package conflicts using dynamic imports
    config.resolve.alias = {
      ...config.resolve.alias,
      '@noble/curves': '@noble/curves',
      '@noble/hashes': '@noble/hashes',
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
        crypto: 'crypto-browserify',
        stream: 'stream-browserify',
        buffer: 'buffer',
      };
    }

    return config;
  },
};

export default nextConfig;
