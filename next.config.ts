import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow testing the dev server from a phone on the same Wi-Fi (dev-only).
  allowedDevOrigins: ['192.168.1.59'],
};

export default nextConfig;
