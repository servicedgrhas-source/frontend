"use client";

import { CalendarRange } from "lucide-react";
import Link from "next/link";
import { useSession } from "@/components/session";
import { useApi } from "@/lib/api";
import { ESPACES, rubriquesVisibles } from "@/lib/espaces";

/** Un recensement (campagne) : ce que la page « Recensements » montre. */
export interface Campagne {
  id: number;
  nom: string;
  annee: number;
  anneeScolaire: string | null;
  debut: string;
  fin: string | null;
  observation: string | null;
  clotureLe: string | null;
  creePar: string | null;
  creeLe: string;
  recenseurs: number;
  ajoutes: number;
  modifications: number;
  aControler: number;
  signalements: number;
}

export const jourFr = (j: string | null) => (j ? j.slice(0, 10).split("-").reverse().join("/") : "");

/**
 * Le bandeau « Recensement ouvert : … » en haut des pages du recensement (22/11/2026) : on sait
 * sous quel recensement se range ce qu'on fait. Sans recensement ouvert, il invite à en ouvrir un.
 */
export function BandeauRecensementOuvert({ action }: { action?: string }) {
  const r = useApi<{ lignes: Campagne[]; ouverte: { id: number; nom: string } | null }>("/recensement/campagnes");
  if (!r.donnees) return null;
  const c = r.donnees.ouverte ? r.donnees.lignes.find((x) => x.id === r.donnees!.ouverte!.id) : null;
  if (!c)
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-or-50 px-4 py-2.5 text-[13px] text-or-800 ring-1 ring-or-200">
        <CalendarRange className="size-4 shrink-0" />
        <span className="min-w-0 flex-1">
          <strong>Aucun recensement ouvert.</strong> {action ?? "Ce qui est fait maintenant ne sera rangé sous aucun recensement."}
        </span>
        <Link href="/recensement/campagnes" className="font-semibold text-marque-700 hover:underline">
          Ouvrir un recensement
        </Link>
      </div>
    );
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-marque-50 px-4 py-2.5 text-[13px] text-marque-800 ring-1 ring-marque-100">
      <CalendarRange className="size-4 shrink-0" />
      <span className="min-w-0 flex-1">
        Recensement ouvert : <strong>{c.nom}</strong>
        {c.anneeScolaire ? ` · année scolaire ${c.anneeScolaire}` : ` · ${c.annee}`} · depuis le {jourFr(c.debut)}
        {c.fin ? `, jusqu’au ${jourFr(c.fin)}` : ""}. Tout ce qui est ajouté ou modifié ici est rangé sous lui.
      </span>
      <Link href="/recensement/campagnes" className="font-medium text-marque-700 hover:underline">
        Voir les recensements
      </Link>
    </div>
  );
}

/**
 * Les autres pages du recensement (rangées dans la carte Recensement) : un lien vers chacune, en
 * haut de la page Recensement, pour passer de l'une à l'autre sans revenir au domaine.
 */
export function PagesDuRecensement() {
  const { profil } = useSession();
  const pages = ESPACES.flatMap((e) => rubriquesVisibles(e, profil)).filter((r) => r.dans === "/recensement");
  if (!pages.length) return null;
  return (
    <nav aria-label="Pages du recensement" className="flex flex-wrap gap-2">
      {pages.map((r) => {
        const I = r.icone;
        return (
          <Link key={r.href} href={r.href} title={r.explication} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[13px] font-medium text-zinc-700 shadow-doux ring-1 ring-zinc-100 transition-colors hover:bg-marque-50 hover:text-marque-700">
            <I className="size-4" /> {r.libelle}
          </Link>
        );
      })}
    </nav>
  );
}
