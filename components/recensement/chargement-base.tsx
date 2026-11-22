"use client";

import { Globe2 } from "lucide-react";

/** Où en est le téléchargement de la base du pays. */
export interface ProgresBase {
  /** Agents déjà sur l'appareil / à prendre. */
  fait: number;
  total: number;
  /** Département en cours, son rang et le nombre de départements. */
  departement: string;
  rang: number;
  nombre: number;
  /** Ce qui se passe (« Brazzaville : 8 200 agents sur 15 287 »…). */
  etape: string;
}

const nf = new Intl.NumberFormat("fr-FR");

/**
 * Le premier téléchargement de la base du pays (DG, 22/11/2026) : un globe qui tourne, la barre de
 * progression, le pourcentage et le détail. Couvre l'écran : on ne travaille pas pendant ce temps.
 */
export function ChargementBase({ p }: { p: ProgresBase }) {
  const pc = p.total ? Math.min(100, Math.floor((p.fait / p.total) * 100)) : 0;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-nuit/90 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Téléchargement de la base du pays">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-2xl">
        <div className="relative mx-auto mb-4 size-28">
          <div className="absolute inset-0 rounded-full bg-marque-100" />
          <div className="absolute inset-2 animate-ping rounded-full bg-marque-200/60 [animation-duration:2.4s]" />
          <Globe2 className="relative mx-auto size-28 animate-spin text-marque-600 [animation-duration:6s]" strokeWidth={1.2} aria-hidden />
        </div>
        <h2 className="text-[17px] font-semibold text-encre">Téléchargement de la base du pays</h2>
        <p className="mt-1 text-[13px] text-zinc-500">Une seule fois, avec le réseau. Ensuite, tout marche sans connexion et se met à jour tout seul.</p>
        <div className="mt-5 text-[40px] leading-none font-bold text-marque-700 tabular-nums">{pc} %</div>
        <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-zinc-100" role="progressbar" aria-valuenow={pc} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-gradient-to-r from-marque-500 to-marque-700 transition-all duration-500" style={{ width: `${pc}%` }} />
        </div>
        <div className="mt-3 text-[13px] font-medium text-encre">{p.etape}</div>
        <div className="mt-1 text-[12px] text-zinc-500 tabular-nums">
          {p.nombre ? `Département ${Math.min(p.rang, p.nombre)} sur ${p.nombre} · ` : ""}
          {nf.format(p.fait)} agents sur {nf.format(p.total)}
        </div>
        <p className="mt-4 text-[11px] text-zinc-400">Gardez l’application ouverte. Si le réseau coupe, le téléchargement reprendra là où il s’est arrêté.</p>
      </div>
    </div>
  );
}
