import type { NextConfig } from "next";

const backendUrl = process.env.API_BACKEND_URL?.replace(/\/$/, "");
const backendOrigin = backendUrl ? new URL(backendUrl) : null;

const nextConfig: NextConfig = {
  async rewrites() {
    return backendUrl
      ? [{ source: "/api/v1/:path*", destination: `${backendUrl}/api/v1/:path*` }]
      : [];
  },
  images: {
    remotePatterns: [
      ...(backendOrigin
        ? ["/storage/**", "/media/**"].map((pathname) => ({
            protocol: backendOrigin.protocol.replace(":", "") as "http" | "https",
            hostname: backendOrigin.hostname,
            port: backendOrigin.port,
            pathname,
          }))
        : []),
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/storage/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/media/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8000",
        pathname: "/storage/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8000",
        pathname: "/media/**",
      },
    ],
  },
};

export default nextConfig;
