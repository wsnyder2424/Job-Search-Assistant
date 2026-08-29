import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Photo uploads are posted as base64 JSON to /api/extract-medication.
  experimental: { serverActions: { bodySizeLimit: "8mb" } },
};

export default nextConfig;
