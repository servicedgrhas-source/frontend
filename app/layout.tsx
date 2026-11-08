import type { Metadata } from "next";
import localFont from "next/font/local";
import { EcranCompteSignale } from "@/components/compte-signale";
import { GardeVisiteur } from "@/components/garde-visiteur";
import "./globals.css";

// Poppins hébergée avec l'application : sans réseau vers Google au démarrage, Next prenait une police
// de secours plus large et les titres de la page de connexion passaient sur plusieurs lignes
const poppins = localFont({
  src: [
    { path: "./polices/poppins-300.woff2", weight: "300", style: "normal" },
    { path: "./polices/poppins-400.woff2", weight: "400", style: "normal" },
    { path: "./polices/poppins-500.woff2", weight: "500", style: "normal" },
    { path: "./polices/poppins-600.woff2", weight: "600", style: "normal" },
    { path: "./polices/poppins-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DGRHAS – MEPPSA",
  description:
    "Gestion des affectations et des mutations du personnel du MEPPSA (DGRHAS)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${poppins.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {/* Compte visiteur : ni impression ni téléchargement (DG, 04/11/2026) */}
        <GardeVisiteur />
        {children}
        {/* Compte suspendu par l'outil de détection : écran de vérification (08/11/2026) */}
        <EcranCompteSignale />
      </body>
    </html>
  );
}
