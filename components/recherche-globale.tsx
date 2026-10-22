"use client";

import { ArrowLeftRight, FileText, Search, User, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FicheDossier } from "@/components/fiche-dossier";
import { Aide } from "@/components/ui";
import { api, qs } from "@/lib/api";
import { useSession } from "@/components/session";
import { dateCourte, STATUT_NOTE } from "@/lib/libelles";

interface Resultats {
  dossiers: { id: string; nomComplet: string; dateNaissance: string | null; diplome: string | null; departement: string | null; quota: number | string | null; etape: string; texte: string | null; trouvePar: "nom" | "texte" }[];
  mutations: { id: string; nomComplet: string; numero: number; motif: string; instruction: string | null; retiree: boolean }[];
  notes: { id: string; module: string; numero: string | null; statut: string; typeNote: string }[];
}

/** Recherche dans tout le système : un nom, un n° d'arrêté ou de décret, un n° de note. */
export function RechercheGlobale() {
  const { refs } = useSession();
  const [texte, setTexte] = useState("");
  // Résultats rangés avec le texte cherché : on n'affiche que ceux du texte actuel
  const [trouve, setTrouve] = useState<{ q: string; d: Resultats } | null>(null);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const champ = useRef<HTMLInputElement>(null);
  const t = texte.trim();
  const r = trouve && trouve.q === t ? trouve.d : null;
  const cherche = t.length >= 2 && !r;

  useEffect(() => {
    if (t.length < 2) return;
    const minuterie = setTimeout(() => {
      api
        .get<Resultats>(`/dossiers/recherche${qs({ q: t })}`)
        .then((d) => setTrouve({ q: t, d }))
        .catch(() => setTrouve({ q: t, d: { dossiers: [], mutations: [], notes: [] } }));
    }, 300);
    return () => clearTimeout(minuterie);
  }, [t]);

  const rien = r && !r.dossiers.length && !r.mutations.length && !r.notes.length;

  return (
    <section className="rounded-3xl bg-white p-5 shadow-doux">
      <div className="mb-2 flex items-center gap-1.5 text-[14px] font-semibold">
        Retrouver un dossier
        <Aide>
          Tapez un <strong>nom</strong> (le nom et les prénoms dans n’importe quel ordre, avec ou sans accents), un <strong>n° d’arrêté ou de décret</strong>, ou un{" "}
          <strong>n° de note de service</strong>. Cliquez sur une personne pour voir tout son dossier : où il en est, son texte, son lot, sa note de service…
        </Aide>
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-zinc-400" />
        <input
          ref={champ}
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          placeholder="Nom et prénoms, n° de texte (ex. 6758) ou n° de note…"
          className="w-full rounded-2xl bg-zinc-100/80 py-3.5 pr-11 pl-12 text-[15px] outline-none transition placeholder:text-zinc-400 focus:bg-white focus:ring-4 focus:ring-marque-100"
        />
        {texte && (
          <button
            type="button"
            title="Effacer"
            onClick={() => {
              setTexte("");
              champ.current?.focus();
            }}
            className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1 text-zinc-400 hover:bg-zinc-200"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {texte.trim().length >= 2 && (
        <div className="mt-3 space-y-3">
          {cherche && !r && <div className="text-[13px] text-zinc-400">Recherche…</div>}
          {rien && <div className="rounded-2xl bg-zinc-50 px-4 py-3 text-[13px] text-zinc-500">Rien trouvé. Vérifiez l’orthographe, ou cherchez avec un seul mot (le nom de famille, par exemple).</div>}
          {!!r?.dossiers.length && (
            <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl ring-1 ring-zinc-100">
              {r.dossiers.map((x) => (
                <li key={x.id}>
                  <button type="button" onClick={() => setOuvert(x.id)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-marque-50/60">
                    <User className="size-4 shrink-0 text-zinc-400" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-medium">{x.nomComplet}</span>
                      <span className="block text-[11px] text-zinc-400">
                        {x.dateNaissance ? `Né(e) le ${dateCourte(x.dateNaissance)} · ` : ""}
                        {x.diplome ?? "—"} · {x.departement ?? "département ?"} · {x.quota === "Autres" ? "quota « Autres »" : `quota ${x.quota ?? "?"}`}
                        {x.texte ? ` · ${x.texte}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] text-zinc-600">{x.etape}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!!r?.mutations.length && (
            <div>
              <div className="mb-1 text-[11px] font-semibold text-zinc-400 uppercase">Demandes de mutation</div>
              <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl ring-1 ring-zinc-100">
                {r.mutations.map((m) => (
                  <li key={m.id}>
                    <Link href={`/mutation/${m.id}`} className="flex items-center gap-3 px-4 py-2.5 text-[13px] hover:bg-marque-50/60">
                      <ArrowLeftRight className="size-4 shrink-0 text-zinc-400" />
                      <span className="min-w-0 flex-1">
                        {m.nomComplet} <span className="text-[11px] text-zinc-400">· demande n° {m.numero}</span>
                      </span>
                      <span className="shrink-0 text-[11px] text-zinc-500">{m.retiree ? "retirée" : m.instruction === "ACCORDEE" ? "accordée" : m.instruction === "REFUSEE" ? "refusée" : "en cours"}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!!r?.notes.length && (
            <div>
              <div className="mb-1 text-[11px] font-semibold text-zinc-400 uppercase">Notes de service</div>
              <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl ring-1 ring-zinc-100">
                {r.notes.map((n) => (
                  <li key={n.id}>
                    <Link href={`/note/${n.id}`} className="flex items-center gap-3 px-4 py-2.5 text-[13px] hover:bg-marque-50/60">
                      <FileText className="size-4 shrink-0 text-zinc-400" />
                      <span className="flex-1">
                        Note n° {n.numero} · {n.module === "AFFECTATION" ? "affectation" : "mutation"}
                        {refs.typesNote.find((t) => t.code === n.typeNote) && ` · ${refs.typesNote.find((t) => t.code === n.typeNote)!.libelle}`}
                      </span>
                      <span className="text-[11px] text-zinc-500">{STATUT_NOTE[n.statut as keyof typeof STATUT_NOTE]?.libelle}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {ouvert && <FicheDossier id={ouvert} fermer={() => setOuvert(null)} />}
    </section>
  );
}
