/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "**" },
      { protocol: "https", hostname: "**" },
    ],
  },
  async rewrites() {
    const raw = process.env.NEXT_PUBLIC_API_ORIGIN || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const normalizedOrigin = (() => {
      const v = String(raw || "").trim().replace(/\/+$/, "");
      if (v.endsWith("/api/v1")) return v.slice(0, -"/api/v1".length);
      if (v.endsWith("/api/v1/")) return v.slice(0, -"/api/v1/".length);
      return v;
    })();
    return [
      {
        source: "/api/v1/:path*",
        destination: `${normalizedOrigin}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
