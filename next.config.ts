import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    FIXLY_DISABLE_STREAMING: process.env.FIXLY_DISABLE_STREAMING,
  },
};

export default nextConfig;
