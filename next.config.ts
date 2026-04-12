import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit", "sharp"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "kieai.redpandaai.co" },
      { protocol: "https", hostname: "**.kie.ai" },
      { protocol: "https", hostname: "api.kie.ai" },
    ],
  },
};

export default nextConfig;
