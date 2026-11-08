import type { NextConfig } from "next";

// Adresse du backend NestJS, utilisée côté serveur Next uniquement.
// Le navigateur appelle toujours « /api » sur le même port que l'interface :
// pas de souci de CORS, quel que soit le port du frontend.
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4000";

/*
 * Protections appliquées par le navigateur (sécurité, 08/11/2026) :
 * - aucune autre page ne peut afficher le site à l'intérieur d'elle (piège à clic) ;
 * - seuls nos propres scripts, styles, images et polices sont chargés (rien d'un autre site) ;
 * - connexion sécurisée (https) imposée en ligne ;
 * - l'adresse des pages n'est jamais transmise à un autre site.
 */
const developpement = process.env.NODE_ENV === "development";
// En ligne (Vercel), le navigateur appelle directement l'API sur Render : seule cette adresse est permise en plus du site
const origineApi = (() => {
  try {
    return process.env.NEXT_PUBLIC_API_URL ? new URL(process.env.NEXT_PUBLIC_API_URL).origin : "";
  } catch {
    return "";
  }
})();
const enLigne = !!process.env.VERCEL;
const POLITIQUE = [
  "default-src 'self'",
  // Next.js place de petits scripts dans la page (chargement) : permis, mais jamais un script d'un autre site.
  // « unsafe-eval » seulement sur le poste (outils de développement de React)
  `script-src 'self' 'unsafe-inline'${developpement ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  // L'API, et sur le poste le rechargement à chaud de l'interface
  `connect-src 'self'${origineApi ? ` ${origineApi}` : ""}${developpement ? " ws: wss:" : ""}`,
  // Acte signé affiché dans le portail (fichier ouvert dans la page)
  "frame-src 'self' blob:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(enLigne ? ["upgrade-insecure-requests"] : []),
].join("; ");

const ENTETES = [
  { key: "Content-Security-Policy", value: POLITIQUE },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  // https imposé pendant un an (en ligne seulement : le poste reste en http)
  ...(enLigne ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }] : []),
];

const nextConfig: NextConfig = {
  // Interface d'essai (copie de la base) : dossier de travail séparé, pour tourner à côté de l'interface normale
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:chemin*", headers: ENTETES }];
  },
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
