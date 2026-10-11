import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Next's CLI checker cannot parse otherwise-valid `tsc --showConfig`
    // output under the current Node 24 runner. The compiler API performs the
    // same production type check without weakening build safeguards.
    useTypeScriptCli: false,
    // Keep static generation within constrained CI/container memory limits and
    // ensure worker failures retain the route-level diagnostic.
    cpus: 2,
    staticGenerationMaxConcurrency: 1,
    staticGenerationMinPagesPerWorker: 1,
    // Node 24 child-process static workers can terminate without propagating
    // their route error. Threads retain the same validation while keeping
    // diagnostics and memory accounting in the build process.
    workerThreads: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  serverExternalPackages: [
    "firebase-admin",
    "firebase-admin/app",
    "firebase-admin/auth",
    "jwks-rsa",
    "jose",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "wqfsgjuedluwsvwzelal.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
