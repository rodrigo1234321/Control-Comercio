/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      canvg: false,
      html2canvas: false,
      dompurify: false,
    };
    return config;
  },
};

module.exports = nextConfig;
