"use client";

import { ArrowLeftRight, ArrowRight, CheckCircle2, ClipboardCheck, FileText, Layers, Stamp, TriangleAlert, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { RechercheGlobale } from "@/components/recherche-globale";
import { useSession } from "@/components/session";
import { Alerte, Bouton, Carte, Chargement, Chiffre, Pastille, Progression } from "@/components/ui";
import { useApi } from "@/lib/api";
import { dateCourte, peut } from "@/lib/libelles";
import type { StatutNote } from "@/lib/types";

interface TableauBord {
  agents: { total: number; textesRecus: number; anomalies: number };
  affectations: { statut: string; n: number }[];
  notes: { module: string; statut: StatutNote; n: number }[];
  recommandations: { enAttente: number; total: number };
  mutations: { total: number; accordees: number; refusees: number; enCours: number };
  /** Paquets reçus de la FP (un envoi = une date de réception). */
  lots: { numero: number; dateReception: string | null; agents: number; affectes: number; lots: number }[];
}

const nf = new Intl.NumberFormat("fr-FR");

export default function TableauDeBord() {
  const { profil } = useSession();
  const { donnees: t, erreur } = useApi<TableauBord>("/tableau-de-bord");
  // Alertes de dépassement d'enveloppe : visibles du DG seulement
  const alertes = useApi<{ niveau: "rouge" | "jaune"; texte: string }[]>(peut.parametrer(profil.role) ? "/pilotage/alertes" : null);
  if (erreur) return <Alerte>{erreur}</Alerte>;
  if (!t) return <Chargement />;

  const aff = (s: string) => t.affectations.find((x) => x.statut === s)?.n ?? 0;
  const notes = (m: string, s: StatutNote) => t.notes.find((x) => x.module === m && x.statut === s)?.n ?? 0;
  const aujourdhui = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const totalTextes = t.lots.reduce((s, l) => s + l.agents, 0);
  const totalAffectes = t.lots.reduce((s, l) => s + l.affectes, 0);

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
      {/* ----------------------------- Colonne principale ----------------------------- */}
      <div className="min-w-0 space-y-6">
        {peut.traiter(profil.role) && <RechercheGlobale />}
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">Bonjour, {profil.nom.split(" ")[0]}</h1>
          <p className="mt-0.5 text-sm text-zinc-400 first-letter:uppercase">{aujourdhui}</p>
        </div>

        {alertes.donnees?.map((a, i) => (
          <Alerte key={i} ton={a.niveau}>
            {a.texte}{" "}
            <Link href="/pilotage" className="font-semibold underline">
              Voir le pilotage
            </Link>
          </Alerte>
        ))}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
          <Chiffre href="/recrutement" icone={<Users />} libelle="Recrutés dans la base" valeur={nf.format(t.agents.total)} detail={`${nf.format(t.agents.textesRecus)} textes reçus de la FP`} />
          <Chiffre
            href="/affectations"
            icone={<ClipboardCheck />}
            ton="jaune"
            libelle="À affecter"
            valeur={nf.format(aff("A_TRAITER"))}
            detail={`${nf.format(aff("AFFECTE"))} affectés · ${aff("EXCLU")} exclus`}
          />
          <Chiffre
            href="/recommandations"
            icone={<Stamp />}
            ton={t.recommandations.enAttente ? "rouge" : "gris"}
            libelle="Recommandations en attente"
            valeur={t.recommandations.enAttente}
            detail="Décision du Directeur général"
          />
          <Chiffre
            href="/mutations"
            icone={<ArrowLeftRight />}
            ton="bleu"
            libelle="Demandes de mutation"
            valeur={nf.format(t.mutations.total)}
            detail={`${t.mutations.enCours} en cours · ${t.mutations.accordees} accordées`}
          />
        </div>

        <Carte titre="Textes reçus par paquet" actions={<span className="text-xs text-zinc-400">{nf.format(totalTextes)} agents au total</span>}>
          <Histogramme lots={t.lots} />
        </Carte>

        <Carte
          titre="Paquets de textes de la Fonction Publique"
          actions={
            <Link href="/lots" className="inline-flex items-center gap-1 text-xs font-medium text-marque-700 hover:underline">
              Tout gérer <ArrowRight className="size-3.5" />
            </Link>
          }
        >
          <ul className="divide-y divide-zinc-100">
            {[...t.lots].reverse().map((l) => {
              const fini = l.agents > 0 && l.affectes === l.agents;
              return (
                <li key={l.numero}>
                  <Link href="/lots" className="-mx-2 flex items-center gap-4 rounded-2xl px-2 py-3 transition-colors hover:bg-zinc-50">
                    <Pastille ton={fini ? "vert" : l.affectes ? "jaune" : "gris"}>
                      {fini ? <CheckCircle2 /> : <Layers />}
                    </Pastille>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">Paquet du {dateCourte(l.dateReception)}</div>
                      <div className="text-xs text-zinc-400">{l.lots} lot(s) : par quota et par type de texte</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold tabular-nums">{nf.format(l.agents)}</div>
                      <div className="text-[11px] text-zinc-400">{l.affectes ? `${nf.format(l.affectes)} affectés` : "à traiter"}</div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Carte>
      </div>

      {/* ------------------------------- Panneau de droite ------------------------------- */}
      <aside className="space-y-6 xl:border-l xl:border-zinc-200/70 xl:pl-8">
        <section>
          <h2 className="text-[15px] font-semibold">Avancement des affectations</h2>
          <p className="mb-4 text-xs text-zinc-400">
            {nf.format(totalAffectes)} agents affectés sur {nf.format(totalTextes)}
          </p>
          <ul className="space-y-4">
            {t.lots.map((l) => {
              const p = l.agents ? (100 * l.affectes) / l.agents : 0;
              return (
                <li key={l.numero}>
                  <div className="mb-1.5 flex items-baseline justify-between text-[13px]">
                    <span className="text-zinc-600">Paquet du {dateCourte(l.dateReception)}</span>
                    <span className="text-xs font-medium tabular-nums text-zinc-500">{Math.round(p)} %</span>
                  </div>
                  <Progression valeur={p} ton={p >= 100 ? "vert" : p > 0 ? "jaune" : "gris"} />
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-doux">
          <h2 className="mb-3 text-[15px] font-semibold">Notes de service</h2>
          {[
            ["AFFECTATION", "Affectations", "/notes/affectation"],
            ["MUTATION", "Mutations", "/notes/mutation"],
          ].map(([m, lib, href]) => (
            <Link key={m} href={href} className="-mx-2 block rounded-2xl px-2 py-2.5 transition hover:bg-zinc-50">
              <div className="mb-2 flex items-center gap-2.5">
                <Pastille ton="gris" taille="sm"><FileText /></Pastille>
                <span className="flex-1 text-[13px] font-medium">{lib}</span>
                <ArrowRight className="size-3.5 text-zinc-300" />
              </div>
              {/* Une case par étape, chacune avec son libellé : pas de chiffre à deviner */}
              <div className="grid grid-cols-4 gap-1.5">
                {(
                  [
                    ["BROUILLON", "À soumettre", "bg-zinc-50 text-zinc-700"],
                    ["SOUMISE", "Chez le DG", "bg-or-100 text-or-700"],
                    ["VALIDEE", "Validées", "bg-sky-50 text-sky-700"],
                    ["SIGNEE", "Signées", "bg-marque-50 text-marque-700"],
                  ] as [StatutNote, string, string][]
                ).map(([s, libelle, couleur]) => (
                  <div key={s} className={`rounded-xl px-1 py-1.5 text-center ${notes(m, s) ? couleur : "bg-zinc-50 text-zinc-300"}`}>
                    <div className="text-[15px] font-semibold leading-none tabular-nums">{notes(m, s)}</div>
                    <div className="mt-1 text-[9.5px] leading-tight">{libelle}</div>
                  </div>
                ))}
              </div>
            </Link>
          ))}
        </section>

        {t.recommandations.enAttente > 0 ? (
          <Encart
            titre={`${t.recommandations.enAttente} recommandation${t.recommandations.enAttente > 1 ? "s" : ""} à trancher`}
            texte="Les déplacements proposés n’entrent dans les notes qu’après la décision du Directeur général."
            href="/recommandations"
            action="Voir les demandes"
          />
        ) : (
          <Encart
            titre="Base à fiabiliser"
            texte={`${nf.format(t.agents.anomalies)} fiches comportent une anomalie (date de naissance, département, diplôme…).`}
            href="/recrutement?anomalies=1"
            action="Corriger les fiches"
            alerte
          />
        )}
      </aside>
    </div>
  );
}

/** Encart d'action du panneau de droite, aux couleurs nationales. */
function Encart({ titre, texte, href, action, alerte }: { titre: string; texte: string; href: string; action: string; alerte?: boolean }) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-marque-50 to-white p-5 text-center shadow-doux">
      <div className="mx-auto mb-4 flex h-20 items-end justify-center gap-1.5" aria-hidden>
        <span className="h-10 w-7 rounded-t-xl bg-marque-500" />
        <span className="h-16 w-7 rounded-t-xl bg-or-400" />
        <span className="h-12 w-7 rounded-t-xl bg-rouge-600" />
      </div>
      <div className="flex items-center justify-center gap-1.5 text-sm font-semibold">
        {alerte && <TriangleAlert className="size-4 text-or-700" />}
        {titre}
      </div>
      <p className="mx-auto mt-1.5 max-w-60 text-xs leading-relaxed text-zinc-500">{texte}</p>
      <Link href={href}>
        <Bouton variante="sombre" className="mt-4 w-full">
          {action}
        </Bouton>
      </Link>
    </section>
  );
}

/** Histogramme d'une seule série (textes par paquet), avec info-bulle au survol. */
function Histogramme({ lots }: { lots: TableauBord["lots"] }) {
  const [survol, setSurvol] = useState<number | null>(null);
  const max = Math.max(1, ...lots.map((l) => l.agents));
  const graduations = [0, 0.5, 1].map((f) => Math.round(f * max));

  return (
    <div className="relative">
      <div className="flex h-44 gap-3 pl-9">
        {/* graduations */}
        <div className="pointer-events-none absolute inset-y-0 left-0 right-0 bottom-6 flex flex-col-reverse justify-between">
          {graduations.map((g) => (
            <div key={g} className="flex items-center gap-2">
              <span className="w-7 text-right text-[10px] tabular-nums text-zinc-300">{nf.format(g)}</span>
              <span className="h-px flex-1 bg-zinc-100" />
            </div>
          ))}
        </div>
        {lots.map((l) => {
          const h = (l.agents / max) * 100;
          const affH = l.agents ? (l.affectes / l.agents) * 100 : 0;
          return (
            <div
              key={l.numero}
              className="relative flex flex-1 flex-col items-center justify-end"
              onMouseEnter={() => setSurvol(l.numero)}
              onMouseLeave={() => setSurvol(null)}
            >
              {survol === l.numero && (
                <div className="absolute z-10 rounded-xl bg-nuit px-3 py-2 text-[11px] whitespace-nowrap text-white shadow-lg" style={{ bottom: `calc(${h}% + 0.5rem)` }}>
                  <div className="font-semibold">Paquet du {dateCourte(l.dateReception)}</div>
                  <div className="text-white/70">{nf.format(l.agents)} textes · {nf.format(l.affectes)} affectés</div>
                </div>
              )}
              <div className="relative flex h-[calc(100%-1.5rem)] w-full max-w-9 items-end">
                <div
                  className={`relative w-full overflow-hidden rounded-t-[4px] transition-colors ${survol === l.numero ? "bg-marque-300" : "bg-marque-200"}`}
                  style={{ height: `${Math.max(h, 1.5)}%` }}
                >
                  <div className="absolute inset-x-0 bottom-0 bg-marque-500" style={{ height: `${affH}%` }} />
                </div>
              </div>
              <span className={`mt-2 text-[11px] ${survol === l.numero ? "font-medium text-encre" : "text-zinc-400"}`}>{dateCourte(l.dateReception).slice(0, 5)}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex gap-4 text-[11px] text-zinc-500">
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-marque-200" /> Textes reçus</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-marque-500" /> Dont affectés</span>
      </div>
    </div>
  );
}
