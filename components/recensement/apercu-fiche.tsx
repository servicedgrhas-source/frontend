"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { type AgentRecense, type ChampFiche, type ConfigRecensement, ETAT_AJOUT, estVide, libelleStatut, lignesTableau, Taux } from "@/components/recensement/commun";
import { useSession } from "@/components/session";
import { Alerte, Badge, Bouton, Chargement, Modale } from "@/components/ui";
import { useApi } from "@/lib/api";

interface FicheLue {
  agent: AgentRecense;
  structure: { id: number; nom: string; sigle: string } | null;
  pieces: { id: string; type: string }[];
}

const dateFr = (d: unknown) => (typeof d === "string" && /^\d{4}-\d{2}-\d{2}/.test(d) ? d.slice(0, 10).split("-").reverse().join("/") : String(d ?? ""));

/** La valeur d'une rubrique, lisible : le libellé d'une liste, la date en jj/mm/aaaa, une ligne par élément d'un tableau. */
function valeurLisible(ch: ChampFiche, v: unknown, departements: { code: string; nom: string }[]): string[] {
  if (estVide(v)) return [];
  const option = (code: unknown, options = ch.options) => options.find((o) => o.code === String(code))?.libelle ?? String(code);
  switch (ch.type) {
    case "DATE":
      return [dateFr(v)];
    case "DEPARTEMENT":
      return [departements.find((d) => d.code === String(v))?.nom ?? String(v)];
    case "LISTE":
      return [option(v)];
    case "LISTE_MULTIPLE":
      return [(Array.isArray(v) ? v : [v]).map((x) => option(x)).join(", ")];
    case "LIGNES":
      return Array.isArray(v) ? v.map(String).filter(Boolean) : [String(v)];
    case "TABLEAU":
      return lignesTableau(ch, v)
        .map((l) =>
          ch.colonnes
            .map((c) => (estVide(l[c.code]) ? "" : c.type === "DATE" ? dateFr(l[c.code]) : c.type === "LISTE" ? option(l[c.code], c.options) : String(l[c.code])))
            .filter(Boolean)
            .join(" · "),
        )
        .filter(Boolean);
    default:
      return [String(v)];
  }
}

/**
 * Toutes les informations d'un agent dans une fenêtre (Recensement, onglets « À contrôler »…
 * « Rejetés » : DG, 30/10/2026) : chaque section de la fiche, l'état de l'ajout et l'avis du contrôle,
 * sans quitter la liste. « Ouvrir la fiche » mène à la fiche pour la modifier, la contrôler ou décider.
 */
export function ApercuFiche({ id, c, fermer, action }: { id: number; c: ConfigRecensement | undefined; fermer: () => void; action?: string }) {
  const { refs } = useSession();
  const r = useApi<FicheLue>(`/recensement/agents/${id}`);
  const a = r.donnees?.agent;
  const ct = a?.contentieux;
  return (
    <Modale titre={a ? a.nomComplet : "Fiche de l’agent"} ouverte large fermer={fermer}>
      {r.erreur ? (
        <Alerte>{r.erreur}</Alerte>
      ) : !a || !c ? (
        <Chargement />
      ) : (
        <div className="space-y-4 text-[13px]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-zinc-500">
              {a.numeroFiche} · {libelleStatut(c, a.statut)}
              {r.donnees?.structure ? ` · ${r.donnees.structure.nom}` : ""}
            </span>
            {ct && <Badge ton={ETAT_AJOUT[ct.etat].ton}>{ETAT_AJOUT[ct.etat].libelle}</Badge>}
            <span className="ml-auto">
              <Taux taux={a.taux} complet={a.complet} />
            </span>
          </div>

          {ct && (
            <div className="grid gap-2 rounded-2xl bg-zinc-50 px-4 py-3 sm:grid-cols-2">
              <Info l="Ajouté" v={`le ${dateFr(ct.ouvertLe)}${ct.ouvertPar ? ` par ${ct.ouvertPar}` : ""}`} />
              <Info l="Pourquoi / d’où" v={ct.motif} />
              {ct.avisControle && <Info l="Avis du contrôle" v={`${ct.avisControle === "FAVORABLE" ? "Favorable" : "Défavorable"}${ct.controlePar ? ` (${ct.controlePar})` : ""}${ct.noteControle ? ` : ${ct.noteControle}` : ""}`} />}
              {ct.decidePar && <Info l="Décision du DG" v={`${ct.etat === "REJETE" ? "Rejeté" : "Accepté"} par ${ct.decidePar}${ct.decideLe ? ` le ${dateFr(ct.decideLe)}` : ""}${ct.note ? ` : ${ct.note}` : ""}`} />}
            </div>
          )}

          {c.sections.map((s) => {
            const lignes = c.champs
              .filter((ch) => ch.section === s.code && ch.actif)
              .map((ch) => ({ ch, v: valeurLisible(ch, a.donnees[ch.code], refs.departements) }))
              .filter((x) => x.v.length);
            if (!lignes.length) return null;
            return (
              <section key={s.code}>
                <h3 className="mb-1.5 text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">{s.libelle}</h3>
                <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                  {lignes.map(({ ch, v }) => (
                    <div key={ch.code} className={ch.type === "TABLEAU" || ch.type === "LIGNES" ? "sm:col-span-2" : undefined}>
                      <span className="text-zinc-500">{ch.libelle} : </span>
                      {v.length === 1 ? (
                        <span className="font-medium text-encre">{v[0]}</span>
                      ) : (
                        <ul className="mt-0.5 list-disc pl-5 font-medium text-encre">
                          {v.map((x, i) => (
                            <li key={i}>{x}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            );
          })}

          <div className="text-zinc-500">
            Pièces jointes : {r.donnees?.pieces.length ? `${r.donnees.pieces.length} (${[...new Set(r.donnees.pieces.map((p) => c.pieces.find((x) => x.code === p.type)?.libelle ?? p.type))].join(", ")})` : "aucune"}
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-100 pt-4">
            <Bouton onClick={fermer}>Fermer</Bouton>
            <Link href={`/personnel/agents/${a.id}`}>
              <Bouton variante="principal">
                {action ?? "Ouvrir la fiche"} <ArrowRight />
              </Bouton>
            </Link>
          </div>
        </div>
      )}
    </Modale>
  );
}

function Info({ l, v }: { l: string; v: string }) {
  return (
    <div>
      <span className="text-zinc-500">{l} : </span>
      <span className="font-medium text-encre">{v}</span>
    </div>
  );
}
