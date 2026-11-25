"use client";

import { useEffect, useState, type ReactNode } from "react";

/*
 * Suivi des recenseurs (DG, 25/11/2026) : la photo de l'antenne en fond, et pendant 3 secondes, à
 * titre décoratif, une antenne qui cherche le signal avant d'afficher la page. La page se charge
 * derrière pendant ce temps (rien n'attend l'animation). CSS seulement : transform et opacité.
 */

const DUREE = 3000;

export function FondAntenne({ children }: { children: ReactNode }) {
  const [etape, setEtape] = useState<"captage" | "sortie" | "fini">("captage");
  useEffect(() => {
    // Mouvement réduit demandé par l'appareil : à peine un instant
    const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t1 = setTimeout(() => setEtape("sortie"), reduit ? 400 : DUREE);
    const t2 = setTimeout(() => setEtape("fini"), (reduit ? 400 : DUREE) + 350);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div className="relative isolate min-h-[70vh]">
      {/* La photo, assez pâle pour lire par-dessus ; elle s'efface vers le bas de la page */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[90vh] rounded-3xl bg-cover bg-center opacity-[0.14]"
        style={{ backgroundImage: "url(/antenne-hd.webp)", maskImage: "linear-gradient(to bottom, black 55%, transparent)", WebkitMaskImage: "linear-gradient(to bottom, black 55%, transparent)" }}
      />
      <div className={etape === "fini" ? "animate-apparition" : "invisible"} aria-hidden={etape !== "fini"}>
        {children}
      </div>
      {etape !== "fini" && <Captage sortie={etape === "sortie"} />}
    </div>
  );
}

/** L'antenne qui balaie le ciel, ses ondes, et les barres de réception. */
function Captage({ sortie }: { sortie: boolean }) {
  return (
    <div role="status" aria-label="Recherche du signal des recenseurs" className={`absolute inset-x-0 top-0 flex h-[70vh] flex-col items-center justify-center rounded-3xl ${sortie ? "captage-sortie" : ""}`}>
      <div className="absolute inset-0 -z-10 rounded-3xl bg-cover bg-center opacity-25" style={{ backgroundImage: "url(/antenne-hd.webp)" }} aria-hidden />
      <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-b from-white/70 via-white/80 to-white" aria-hidden />
      <svg viewBox="0 0 220 180" className="w-56 sm:w-64" aria-hidden>
        {/* Le pied */}
        <path d="M96 172 L110 118 L124 172 Z" fill="#0e1813" opacity="0.85" />
        <rect x="80" y="168" width="60" height="6" rx="3" fill="#0e1813" />
        {/* L'antenne et ses ondes : elles balaient ensemble */}
        <g className="captage-balayage">
          {[0, 0.4, 0.8].map((d) => (
            <g key={d} className="captage-onde" style={{ animationDelay: `${d}s` }}>
              <path d="M128 64 Q150 52 156 30" fill="none" stroke="#009543" strokeWidth="4" strokeLinecap="round" />
              <path d="M134 74 Q166 58 174 24" fill="none" stroke="#009543" strokeWidth="4" strokeLinecap="round" opacity="0.7" />
              <path d="M140 84 Q182 64 192 18" fill="none" stroke="#009543" strokeWidth="4" strokeLinecap="round" opacity="0.45" />
            </g>
          ))}
          {/* Coupole */}
          <path d="M62 70 Q70 126 128 120 Q104 104 62 70 Z" fill="#e9f7ef" stroke="#0e1813" strokeWidth="4" strokeLinejoin="round" />
          <path d="M62 70 Q86 104 128 120" fill="none" stroke="#0e1813" strokeWidth="2" opacity="0.4" />
          {/* Bras et récepteur */}
          <line x1="95" y1="95" x2="122" y2="72" stroke="#0e1813" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="124" cy="70" r="6" fill="#fbde4a" stroke="#0e1813" strokeWidth="3" />
          <line x1="110" y1="118" x2="95" y2="100" stroke="#0e1813" strokeWidth="5" strokeLinecap="round" />
        </g>
      </svg>
      {/* Barres de réception */}
      <svg viewBox="0 0 60 30" className="mt-4 w-16" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={4 + i * 14} y={24 - i * 7} width="9" height={6 + i * 7} rx="2" fill="#009543" className="captage-barre" style={{ animationDelay: `${i * 0.35}s` }} />
        ))}
      </svg>
      <p className="mt-4 text-[15px] font-semibold text-encre">Recherche du signal des recenseurs…</p>
      <p className="mt-1 text-[12px] text-zinc-500">Liaison avec les tablettes sur le terrain</p>
    </div>
  );
}
