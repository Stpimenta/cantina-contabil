import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import { networkInterfaces } from "node:os";
import { resolve } from "node:path";

const nextConfig: NextConfig = {
  agentRules: false,
  poweredByHeader: false,
  experimental: { serverActions: { bodySizeLimit: "26mb" } },
  turbopack: { root: resolve(".") },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "same-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default async function configure(phase: string) {
  if (phase === PHASE_DEVELOPMENT_SERVER) {
    const allowedDevOrigins = [
      "localhost",
      "127.0.0.1",
      ...Object.values(networkInterfaces())
        .flatMap((addresses) => addresses ?? [])
        .filter((address) => address.family === "IPv4" && !address.internal)
        .map((address) => address.address),
    ];
    await initOpenNextCloudflareForDev({
      configPath: resolve("wrangler.local.jsonc"),
      persist: { path: resolve(".wrangler/state/v3") },
      remoteBindings: false,
    });
    return { ...nextConfig, allowedDevOrigins };
  }
  return nextConfig;
}
