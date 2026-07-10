import type { NextConfig } from "next";

// Versión de la app = commit de Vercel (o "dev" en local). Se hornea en el bundle
// (cliente y servidor) para detectar cuando hay un deploy nuevo y avisar al usuario.
const APP_VERSION = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) || "dev";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: APP_VERSION,
  },
};

export default nextConfig;
