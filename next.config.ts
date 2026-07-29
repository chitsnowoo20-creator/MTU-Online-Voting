import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        /*
         * Candidate photos only. That bucket is public-read by design — the
         * cards appear on the ballot and on the public results page — so
         * optimizing and caching them is exactly what we want.
         *
         * The `id-cards` bucket is deliberately NOT reachable this way: it is
         * private, served through short-lived signed URLs, and its images must
         * never land in an optimizer cache (AGENTS.md invariant 6).
         */
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/candidate-photos/**",
      },
    ],
  },
};

export default nextConfig;
