import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "192.168.1.9",
    "192.168.1.9:3000",
    "100.123.241.15",
    "100.123.241.15:3000",
    "localhost",
    "localhost:3000",
  ],
};

export default nextConfig;
