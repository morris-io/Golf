const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 1. ADD THIS LINE to silence the Turbopack error:
  turbopack: {
     // This tells Next.js it's okay to use Turbopack even though PWA is installed
  },
  // 2. WE DELETED THE 'eslint' BLOCK because it is no longer allowed here.
};

module.exports = withPWA(nextConfig);