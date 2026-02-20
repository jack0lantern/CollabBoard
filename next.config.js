/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals ?? [];
      config.externals.push({ canvas: "commonjs canvas" });
    }
    return config;
  },
};

module.exports = nextConfig;
