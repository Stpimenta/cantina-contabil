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
  async redirects() {
    return [
      {
        source: "/acesso-comandas/ativar",
        destination: "/command-access/activate",
        permanent: false,
      },
      {
        source: "/acesso-comandas",
        destination: "/command-access",
        permanent: false,
      },
      {
        source: "/comandas/:id",
        destination: "/commands/:id",
        permanent: false,
      },
      {
        source: "/api/eventos/:id/comandas/:path*",
        destination: "/api/events/:id/commands/:path*",
        permanent: false,
      },
      {
        source: "/eventos/:id/insumos/:supplyId/comprovante",
        destination: "/events/:id/supplies/:supplyId/receipt",
        permanent: false,
      },
      {
        source: "/eventos/:id/insumos",
        destination: "/events/:id/supplies",
        permanent: false,
      },
      {
        source: "/eventos/:id/pedidos",
        destination: "/events/:id/orders",
        permanent: false,
      },
      {
        source: "/eventos/:id/comandas",
        destination: "/events/:id/commands",
        permanent: false,
      },
      {
        source: "/eventos/:path*",
        destination: "/events/:path*",
        permanent: false,
      },
      {
        source: "/caixas/:path*",
        destination: "/cash-boxes/:path*",
        permanent: false,
      },
      { source: "/doacoes", destination: "/donations", permanent: false },
      {
        source: "/movimentacoes/:id/comprovante",
        destination: "/movements/:id/receipt",
        permanent: false,
      },
      { source: "/movimentacoes", destination: "/movements", permanent: false },
    ];
  },
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
      environment: "next",
      persist: { path: resolve(".wrangler/state/v3") },
      remoteBindings: false,
    });
    return {
      ...nextConfig,
      allowedDevOrigins,
      async rewrites() {
        return [
          {
            source: "/api/events/:id/commands/socket",
            destination: "http://127.0.0.1:8787/api/events/:id/commands/socket",
          },
        ];
      },
    };
  }
  return nextConfig;
}
