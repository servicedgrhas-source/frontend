import type { MetadataRoute } from "next";

/**
 * Application installable (mission de terrain, DG 21/11/2026) : sur la tablette ou le téléphone,
 * « Ajouter à l'écran d'accueil » ; elle s'ouvre comme une application, même sans réseau.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SIGRHAS-MEPPSA — Recensement sur le terrain",
    short_name: "SIGRHAS",
    description: "Recensement du personnel et des écoles, même sans connexion.",
    start_url: "/recensement/terrain",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0c1a14",
    theme_color: "#0c1a14",
    lang: "fr",
    icons: [{ src: "/icon.png", sizes: "any", type: "image/png" }],
  };
}
