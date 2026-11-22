import type { MetadataRoute } from "next";

/**
 * Application installable (DG, 21/11 puis 22/11/2026 : « comme une vraie app ») : le navigateur
 * propose de l'installer (téléphone, tablette, ordinateur) ; elle s'ouvre ensuite depuis l'écran
 * d'accueil, en plein écran, même sans réseau.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "SIGRHAS-MEPPSA",
    short_name: "SIGRHAS",
    description: "Gestion du personnel du MEPPSA et recensement sur le terrain, même sans connexion.",
    // L'accueil : chacun arrive sur sa page (un recenseur, sur le recensement du terrain)
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "any",
    background_color: "#0c1a14",
    theme_color: "#0c1a14",
    lang: "fr",
    dir: "ltr",
    categories: ["productivity", "education", "government"],
    icons: [
      { src: "/icones/icone-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icones/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icones/icone-masquable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
