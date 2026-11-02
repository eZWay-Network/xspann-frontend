import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "8080",
        pathname: "/uploads/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8080",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "dash-xspann.webermelon.dev",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "sfo3.digitaloceanspaces.com",
        pathname: "/ezwayradio/**",
      },

      {
        protocol: "https",
        hostname:
          "*.186454cd2996f179ec38c69acd714056.us.r2.cloudflarestorage.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
