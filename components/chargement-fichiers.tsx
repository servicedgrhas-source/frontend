"use client";

import { useEffect, useState } from "react";
import { useTransferts } from "@/lib/api";

/** Phrases qui défilent toutes les 5 secondes pendant un envoi (import, scans…). */
const PHRASES_ENVOI = [
  "Téléversement de vos fichiers en cours, veuillez patienter…",
  "Le traitement se poursuit, nous récoltons les informations…",
  "Chaque ligne est lue avec soin, une par une…",
  "Les dossiers rejoignent le serveur en file indienne…",
  "Le serveur range les fiches dans les bons tiroirs…",
  "Nous vérifions les noms, les dates et les matricules…",
  "Encore un instant : le serveur ne bâcle jamais son travail.",
  "Pendant ce temps, un café ? Le serveur, lui, travaille.",
];
/** … et pendant un téléchargement (export Excel, Word, PDF…). */
const PHRASES_RECEPTION = [
  "Préparation de votre fichier, veuillez patienter…",
  "Le serveur rassemble les données demandées…",
  "Mise en colonnes et mise en page en cours…",
  "Les dernières lignes prennent leur place…",
  "Le fichier fait sa valise : il arrive bientôt.",
  "Encore un instant : la bonne présentation prend son temps.",
];

/** Une fenêtre ne s'ouvre que si le transfert dure : les petits envois passent sans la faire clignoter. */
const DELAI_MS = 500;

/**
 * Fenêtre de chargement pendant les envois et les téléchargements de fichiers (DG, 29/10/2026) :
 * un dossier qui part de l'ordinateur vers le serveur (ou un document qui en revient), une phrase
 * qui change toutes les 5 secondes, et le temps écoulé.
 */
export function ChargementFichiers() {
  const transferts = useTransferts();
  const [maintenant, setMaintenant] = useState(0);
  const enCours = transferts.length > 0;
  useEffect(() => {
    if (!enCours) return;
    const t = setInterval(() => setMaintenant(Date.now()), 250);
    return () => clearInterval(t);
  }, [enCours]);
  const visibles = transferts.filter((t) => maintenant - t.debut >= DELAI_MS);
  if (!enCours || !visibles.length) return null;
  const premier = visibles[0];
  const envoi = visibles.some((t) => t.sens === "envoi");
  const ecoule = Math.max(0, Math.floor((maintenant - premier.debut) / 1000));
  const phrases = envoi ? PHRASES_ENVOI : PHRASES_RECEPTION;
  const phrase = phrases[Math.floor(ecoule / 5) % phrases.length];
  const noms = visibles.map((t) => t.nom).filter(Boolean);
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-nuit/40 p-4 backdrop-blur-[2px]" role="alertdialog" aria-live="polite" aria-label={envoi ? "Envoi des fichiers en cours" : "Préparation du fichier en cours"}>
      <style>{`
        @keyframes zz-voyage { 0% { transform: translateX(0) translateY(0) rotate(-6deg); opacity: 0 } 12% { opacity: 1 } 50% { transform: translateX(var(--zz-dx)) translateY(-26px) rotate(4deg) } 88% { opacity: 1 } 100% { transform: translateX(calc(var(--zz-dx) * 2)) translateY(0) rotate(-2deg); opacity: 0 } }
        @keyframes zz-voyant { 0%, 100% { opacity: .25 } 50% { opacity: 1 } }
        @keyframes zz-points { 0% { stroke-dashoffset: 24 } 100% { stroke-dashoffset: 0 } }
        @keyframes zz-barre { from { transform: translateX(-100%) } to { transform: translateX(300%) } }
        @keyframes zz-phrase { from { opacity: 0; transform: translateY(4px) } to { opacity: 1; transform: none } }
      `}</style>
      <div className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-2xl">
        <svg viewBox="0 0 320 130" className="mx-auto mb-4 h-32 w-full" aria-hidden>
          {/* L'ordinateur */}
          <g transform="translate(14 34)">
            <rect x="0" y="0" width="74" height="50" rx="6" fill="#f4f4f5" stroke="#3f3f46" strokeWidth="3" />
            <rect x="8" y="8" width="58" height="34" rx="3" fill="#dcfce7" />
            <path d="M24 60h26M37 50v10" stroke="#3f3f46" strokeWidth="3" strokeLinecap="round" />
          </g>
          {/* Le serveur */}
          <g transform="translate(234 18)">
            {[0, 1, 2].map((i) => (
              <g key={i} transform={`translate(0 ${i * 30})`}>
                <rect x="0" y="0" width="72" height="24" rx="5" fill="#f4f4f5" stroke="#3f3f46" strokeWidth="3" />
                <circle cx="13" cy="12" r="3.5" fill="#16a34a" style={{ animation: `zz-voyant 1.2s ${i * 0.3}s infinite` }} />
                <path d="M30 12h30" stroke="#a1a1aa" strokeWidth="3" strokeLinecap="round" />
              </g>
            ))}
          </g>
          {/* Le chemin */}
          <path d="M96 66 C 140 26, 186 26, 228 66" fill="none" stroke="#a1a1aa" strokeWidth="2.5" strokeDasharray="4 8" style={{ animation: `zz-points 0.8s linear infinite${envoi ? "" : " reverse"}` }} />
          {/* Le dossier (envoi) ou le document (téléchargement) qui voyage */}
          <g transform={envoi ? "translate(96 50)" : "translate(200 50)"}>
          <g style={{ ["--zz-dx" as string]: envoi ? "62px" : "-62px", animation: "zz-voyage 2.2s ease-in-out infinite" } as React.CSSProperties}>
            {envoi ? (
              <>
                <path d="M0 6a4 4 0 0 1 4-4h10l5 5h13a4 4 0 0 1 4 4v15a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4z" fill="#facc15" stroke="#a16207" strokeWidth="2" />
                <path d="M0 12h36" stroke="#a16207" strokeWidth="2" />
              </>
            ) : (
              <>
                <path d="M2 0h18l8 8v24H2z" fill="#ffffff" stroke="#15803d" strokeWidth="2" />
                <path d="M20 0v8h8M7 15h16M7 21h16M7 27h10" stroke="#15803d" strokeWidth="2" />
              </>
            )}
          </g>
          </g>
        </svg>
        <div className="text-[15px] font-semibold text-encre">{envoi ? "Envoi en cours" : "Préparation du fichier"}</div>
        <p key={phrase} className="mt-1.5 min-h-10 text-[13px] text-zinc-600" style={{ animation: "zz-phrase .5s ease-out" }}>
          {phrase}
        </p>
        {!!noms.length && <div className="mt-2 truncate text-[12px] text-zinc-400">{noms.join(" · ")}</div>}
        <div className="mx-auto mt-4 h-1.5 w-48 overflow-hidden rounded-full bg-zinc-100">
          <div className="h-full w-1/3 rounded-full bg-marque-500" style={{ animation: "zz-barre 1.3s ease-in-out infinite" }} />
        </div>
        <div className="mt-3 text-[11px] text-zinc-400 tabular-nums">
          {ecoule} s · ne fermez pas la page{ecoule >= 60 ? " : les gros fichiers peuvent prendre quelques minutes" : ""}
        </div>
      </div>
    </div>
  );
}
