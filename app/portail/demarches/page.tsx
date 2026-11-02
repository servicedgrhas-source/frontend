"use client";

import { ArrowRight, ArrowRightLeft, BadgeCheck, CalendarClock, CalendarDays, Coins, FilePen, FileText, HeartHandshake, History, LogOut, MapPinned, ScrollText, Search, Shuffle, Stamp, TrendingUp, Wallet, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FAMILLES, type DefinitionPrestation } from "@/lib/prestations";
import { appelPublic, type ReferencesPortail } from "@/lib/portail";

const ICONE = {
  AFFECTATION: MapPinned,
  NOMINATION: BadgeCheck,
  CERTIFICAT: Stamp,
  ATTESTATION: ScrollText,
  AUTORISATION: CalendarClock,
  CONGE: CalendarDays,
  CESSATION: LogOut,
  POSITION: ArrowRightLeft,
  CARRIERE: TrendingUp,
  SOLDE: Wallet,
  PRIME: Coins,
  RAPPEL: History,
  SOCIAL: HeartHandshake,
  RECTIFICATIF: FilePen,
};

/** Sans accents ni majuscules : « Congé » se trouve en tapant « conge ». */
const simple = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

/**
 * « Faire une demande » : toutes les démarches ouvertes, rangées par famille, avec une recherche
 * (« congé », « prime », « attestation »…) qui filtre la liste aussitôt.
 */
export default function Demarches() {
  const [catalogue, setCatalogue] = useState<DefinitionPrestation[] | null>(null);
  const [autres, setAutres] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [q, setQ] = useState("");
  useEffect(() => {
    appelPublic<DefinitionPrestation[]>("/prestations/catalogue")
      .then(setCatalogue)
      .catch((e: Error) => setErreur(e.message));
    // Démarches de l'ancien circuit encore ouvertes par le DG (congés…), s'il y en a
    appelPublic<ReferencesPortail>("/references")
      .then((r) => setAutres(r.types.some((t) => !t.mutation)))
      .catch(() => undefined);
  }, []);

  const carte = (href: string, titre: string, texte: string, Icone: typeof FileText, fond: string) => (
    <Link key={href} href={href} className="flex items-center gap-4 rounded-3xl bg-white p-4 shadow-doux active:scale-[0.99]">
      <span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${fond}`}>
        <Icone className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold leading-snug">{titre}</span>
        <span className="block text-[12px] leading-snug text-zinc-500">{texte}</span>
      </span>
      <ArrowRight className="size-5 shrink-0 text-zinc-300" />
    </Link>
  );

  // Tous les mots tapés doivent se trouver dans le titre, l'explication ou la famille
  const mots = simple(q).split(/\s+/).filter(Boolean);
  const trouve = (...textes: string[]) => mots.every((m) => simple(textes.join(" ")).includes(m));
  const mutationVisible = trouve("Demande de mutation santé sociales rapprochement de conjoints ancienneté permutation");
  const visibles = (catalogue ?? []).filter((p) => trouve(p.libelle, p.pourQui, FAMILLES[p.famille], p.acte));

  return (
    <div className="space-y-5">
      <div>
        <Link href="/portail" className="text-[13px] text-marque-700">
          ← Accueil
        </Link>
        <h1 className="mt-2 text-[20px] font-semibold">Faire une demande</h1>
        <p className="mt-1 text-[14px] text-zinc-600">Choisissez votre démarche. Vous devez être enregistré(e) dans la base du personnel du ministère.</p>
      </div>
      {erreur && <div className="rounded-2xl bg-rouge-100 px-4 py-3 text-[14px] text-rouge-600">{erreur}</div>}

      <label className="relative block">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-zinc-400" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Chercher : congé, prime, attestation…"
          aria-label="Chercher une démarche"
          className="w-full rounded-2xl border border-zinc-200 bg-white py-3 pr-11 pl-12 text-[16px] outline-none focus:border-marque-300 focus:ring-4 focus:ring-marque-100"
        />
        {q && (
          <button type="button" aria-label="Effacer la recherche" onClick={() => setQ("")} className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1 text-zinc-400 hover:bg-zinc-100">
            <X className="size-5" />
          </button>
        )}
      </label>
      {catalogue && q && !mutationVisible && !visibles.length && (
        <p className="rounded-2xl bg-white/60 px-4 py-3 text-[14px] text-zinc-600 ring-1 ring-zinc-200">
          Aucune démarche ne correspond à « {q} ». Essayez un autre mot (ex. « congé », « prime », « certificat »), ou effacez la recherche pour tout voir.
        </p>
      )}

      {mutationVisible && (
        <section className="space-y-2">
          <h2 className="text-[12px] font-semibold tracking-wide text-zinc-500 uppercase">Mutations</h2>
          {carte("/portail/mutation", "Demande de mutation", "Raisons de santé, sociales, rapprochement de conjoints, ancienneté, permutation…", Shuffle, "bg-marque-500 text-white")}
        </section>
      )}

      {!catalogue && !erreur && <p className="py-6 text-center text-zinc-400">Chargement…</p>}
      {catalogue &&
        (Object.keys(FAMILLES) as (keyof typeof FAMILLES)[]).map((f) => {
          const liste = visibles.filter((p) => p.famille === f);
          if (!liste.length) return null;
          return (
            <section key={f} className="space-y-2">
              <h2 className="text-[12px] font-semibold tracking-wide text-zinc-500 uppercase">{FAMILLES[f]}</h2>
              {liste.map((p) => carte(`/portail/prestation?type=${p.code}`, p.libelle, p.pourQui, ICONE[p.famille], "bg-or-400 text-encre"))}
            </section>
          );
        })}

      {autres && !q && (
        <section className="space-y-2">
          <h2 className="text-[12px] font-semibold tracking-wide text-zinc-500 uppercase">Autres démarches</h2>
          {carte("/portail/demande", "Congé, autorisation, attestation…", "Les autres démarches ouvertes en ligne", FileText, "bg-nuit text-white")}
        </section>
      )}
    </div>
  );
}
