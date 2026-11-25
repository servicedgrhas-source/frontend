import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { EcranCompteSignale } from "@/components/compte-signale";
import { ApplicationInstallable } from "@/components/application-installable";
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
  applicationName: "SIGRHAS-MEPPSA",
  // iPhone et iPad : « Sur l'écran d'accueil » ouvre en plein écran, comme une application
  appleWebApp: { capable: true, title: "SIGRHAS", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0c1a14",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${poppins.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {/* Menu de gauche réduit aux icônes : connu avant le premier affichage, sans menu large qui clignote */}
        <script dangerouslySetInnerHTML={{ __html: `try{if(localStorage.getItem("dgrhas.menuReduit")==="1")document.documentElement.dataset.menuReduit="1"}catch(e){}` }} />
        {/* Compte visiteur : ni impression ni téléchargement (DG, 04/11/2026) */}
        <GardeVisiteur />
        {children}
        {/* Compte suspendu par l'outil de détection : écran de vérification (08/11/2026) */}
        <EcranCompteSignale />
        {/* Application installable : le service hors ligne, et l'invitation à installer (22/11/2026) */}
        <ApplicationInstallable />
      </body>
    </html>
  );
}
