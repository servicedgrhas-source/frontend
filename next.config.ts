import type { NextConfig } from "next";

// Adresse du backend NestJS, utilisée côté serveur Next uniquement.
// Le navigateur appelle toujours « /api » sur le même port que l'interface :
// pas de souci de CORS, quel que soit le port du frontend.
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  // Interface d'essai (copie de la base) : dossier de travail séparé, pour tourner à côté de l'interface normale
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  async rewrites() {
    return [{ source: "/api/:chemin*", destination: `${BACKEND_URL}/api/:chemin*` }];
  },
  experimental: {
    agentFeedback: true,
    // Les fichiers Excel importés passent par le relais /api (base des mutations : ~14 Mo)
    proxyClientMaxBodySize: "80mb",
    // Traitements longs (rapprochement de gros fichiers, imports) : le relais attend jusqu'à 5 min
    proxyTimeout: 300_000,
    // Toutes les pages sont réservées aux utilisateurs connectés et chargées
    // côté client après vérification de la session : la validation automatique
    // de « navigation instantanée » ne s'applique qu'aux segments qui la demandent.
    instantInsights: {
      validationLevel: "manual-warning",
    },
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
