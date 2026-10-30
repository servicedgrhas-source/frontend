"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Competences, ModaleEvaluation } from "@/components/recensement/evaluation";
import { ChoixStructure, type StructureCourte } from "@/components/recensement/commun";
import { useSession } from "@/components/session";
import { Alerte, Badge, Bouton, Carte, Chargement, Chiffre, EnTete, Liste, Saisie, Segments, Tableau, Vide } from "@/components/ui";
import { useApi } from "@/lib/api";
import { APPRECIATIONS, TON_APPRECIATION } from "@/lib/ecoles";

interface Campagne {
  annee: string;
  page: number;
  stats: {
    total: number;
    evalues: number;
    brouillons: number;
    moyennePro: number | null;
    moyenneSociale: number | null;
    tf: number;
    f: number;
    b: number;
    tb: number;
    ex: number;
    relations: number;
    metier: number;
    aSuivre: number;
  };
  lignes: {
    id: number;
    nomComplet: string;
    statut: string;
    fonction: string | null;
    structure: string | null;
    evaluationId: string | null;
    competenceProfessionnelle: number | null;
    competenceSociale: number | null;
    globale: number | null;
    appreciation: string | null;
    decision: string | null;
    evaluateur: string | null;
    date: string | null;
    commentaireProfessionnel: string | null;
    commentaireSocial: string | null;
    valideeLe: string | null;
    valideePar: string | null;
  }[];
  decisions: Record<string, string[]>;
}
const virgule = (n: number | null) => (n === null ? "—" : String(n).replace(".", ","));
/** « 3 (19 %) » : l'effectif et sa part des agents évalués. */
const part = (n: number, sur: number) => (sur ? `${Math.round((100 * n) / sur)} %` : "—");

/** Campagne d'évaluation de l'année : qui est évalué, la répartition, les profils à suivre. */
export default function Evaluations() {
  const { profil } = useSession();
  const chef = profil.role === "STRUCTURE";
  const structures = useApi<StructureCourte[]>(chef ? null : "/recensement/structures");
  const [structure, setStructure] = useState("");
  const [etat, setEtat] = useState("");
  // Barre de la répartition cliquée : la liste ne montre que cette appréciation
  const [appreciation, setAppreciation] = useState("");
  const [q, setQ] = useState("");
  const [recherche, setRecherche] = useState("");
  const [page, setPage] = useState(1);
  const [annee, setAnnee] = useState("");
  const [evaluer, setEvaluer] = useState<Campagne["lignes"][number] | null>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      setRecherche(q);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);
  const c = useApi<Campagne>(`/evaluations?structure=${structure}&etat=${etat}&appreciation=${encodeURIComponent(appreciation)}&q=${encodeURIComponent(recherche)}&page=${page}&annee=${annee}`);
  // L'année en cours et les quatre précédentes (une évaluation par an)
  const anneeCourante = Number(new Date().getFullYear());
  const annees = [0, 1, 2, 3, 4].map((i) => String(anneeCourante - i));
  const s = c.donnees?.stats;
  const repartition = s ? [s.tf, s.f, s.b, s.tb, s.ex] : [];
  return (
    <div className="space-y-5">
      <EnTete
        titre="Évaluations du personnel"
        sousTitre="Une fois par an, le chef immédiat (école, inspection, direction, service…) note la compétence professionnelle et la compétence sociale de chacun de ses agents, de 1 (très faible) à 5 (excellent). La moyenne est 2,5 : en dessous, l’agent est à suivre."
      />
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <div className="mb-1 text-xs font-medium text-zinc-500">Année évaluée</div>
          <Segments
            valeur={annee || c.donnees?.annee || String(anneeCourante)}
            changer={(x) => {
              setAnnee(x);
              setPage(1);
            }}
            options={annees.map((a) => ({ valeur: a, libelle: a }))}
          />
        </div>
      </div>
      {!chef && (
        <Carte titre="Structure">
          {!structures.donnees ? (
            <Chargement />
          ) : (
            <ChoixStructure
              structures={structures.donnees}
              valeur={structure}
              changer={(x) => {
                setStructure(x);
                setPage(1);
              }}
              vide="Toutes (mon périmètre)"
            />
          )}
        </Carte>
      )}
      {c.erreur && <Alerte>{c.erreur}</Alerte>}
      {!c.donnees || !s ? (
        <Chargement />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Chiffre
              libelle={`Évalués en ${c.donnees.annee}`}
              valeur={`${s.evalues} / ${s.total}`}
              detail={[s.total ? `${part(s.evalues, s.total)} des agents (évaluations validées)` : "", s.brouillons ? `${s.brouillons} brouillon(s) à valider` : ""].filter(Boolean).join(" · ")}
            />
            {/* Les deux moyennes séparées : chacune sur 5, sur les agents évalués */}
            <div className="rounded-3xl bg-white p-5 shadow-doux">
              <div className="text-[13px] text-zinc-500">Moyennes sur 5 (agents évalués)</div>
              <div className="mt-2 grid grid-cols-2 divide-x divide-zinc-200 text-center">
                <div>
                  <div className="text-2xl font-semibold tabular-nums">{virgule(s.moyennePro)}</div>
                  <div className="text-[11px] text-zinc-500">Compétence professionnelle</div>
                </div>
                <div>
                  <div className="text-2xl font-semibold tabular-nums">{virgule(s.moyenneSociale)}</div>
                  <div className="text-[11px] text-zinc-500">Compétence sociale</div>
                </div>
              </div>
            </div>
            <Chiffre
              libelle="Compétents, relations difficiles"
              valeur={`${s.relations} (${part(s.relations, s.evalues)})`}
              ton={s.relations ? "jaune" : undefined}
              detail="professionnelle à 2,5 ou plus, sociale sous 2,5"
            />
            <Chiffre
              libelle="Appréciés, compétences à renforcer"
              valeur={`${s.metier} (${part(s.metier, s.evalues)})`}
              ton={s.metier ? "jaune" : undefined}
              detail="sociale à 2,5 ou plus, professionnelle sous 2,5"
            />
          </div>
          {s.aSuivre > 0 && (
            <Alerte ton="jaune">
              <strong>
                {s.aSuivre} agent(s) à suivre ({part(s.aSuivre, s.evalues)} des évalués)
              </strong>{" "}
              : compétence globale inférieure à 2,5, la moyenne.{" "}
              <button
                type="button"
                className="font-semibold underline"
                onClick={() => {
                  setEtat("A_SUIVRE");
                  setPage(1);
                }}
              >
                Les voir
              </button>
            </Alerte>
          )}
          {s.evalues > 0 && (
            <Carte titre="Répartition des appréciations">
              <div className="space-y-1.5">
                {APPRECIATIONS.map((a, i) => (
                  <button
                    type="button"
                    key={a}
                    title={appreciation === a ? "Voir tous les agents" : `Voir les agents « ${a} »`}
                    onClick={() => {
                      setAppreciation(appreciation === a ? "" : a);
                      setPage(1);
                    }}
                    className={`grid w-full grid-cols-[6rem_1fr_5rem] items-center gap-3 rounded-lg px-1 py-0.5 text-left text-[12px] transition hover:bg-zinc-50 ${appreciation === a ? "bg-marque-50 ring-1 ring-marque-200" : ""}`}
                  >
                    <span className={appreciation === a ? "font-semibold" : ""}>{a}</span>
                    <div className="h-3 overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className={`h-full rounded-full ${i < 2 ? "bg-rouge-500" : i === 4 ? "bg-sky-600" : "bg-marque-600"}`}
                        style={{ width: `${(100 * repartition[i]) / Math.max(1, s.evalues)}%` }}
                      />
                    </div>
                    <span className="text-right tabular-nums">
                      {repartition[i]} <span className="text-zinc-400">({part(repartition[i], s.evalues)})</span>
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-zinc-500">
                Appréciation d’après la compétence globale : 2,5 (la moyenne) à 3,5 « bon », 4 et 4,5 « très bon », 5 « excellent », 2 « faible », moins de 2 « très faible ». Cliquez sur une barre pour
                voir ses agents{appreciation ? ` (filtre : « ${appreciation} », cliquez de nouveau pour l’enlever)` : ""}.
              </p>
            </Carte>
          )}
          <Carte titre="Agents">
            <div className="mb-3 grid gap-3 sm:grid-cols-[1fr_20rem]">
              <Saisie value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un agent…" />
              <Liste
                value={etat}
                onChange={(e) => {
                  setEtat(e.target.value);
                  setPage(1);
                }}
                vide="Tous les agents"
                options={[
                  { valeur: "NON_EVALUE", libelle: "Pas encore évalués" },
                  { valeur: "BROUILLON", libelle: "Brouillons à valider" },
                  { valeur: "EVALUE", libelle: "Évalués (validées)" },
                  { valeur: "A_SUIVRE", libelle: "À suivre : compétence globale inférieure à 2,5" },
                ]}
              />
            </div>
            {!c.donnees.lignes.length ? (
              <Vide>Aucun agent.</Vide>
            ) : (
              <Tableau>
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>Compétences</th>
                    <th>Globale</th>
                    <th>Décision</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {c.donnees.lignes.map((l) => (
                    <tr key={l.id}>
                      <td>
                        <Link href={`/personnel/agents/${l.id}`} className="font-medium text-marque-700 hover:underline">
                          {l.nomComplet}
                        </Link>
                        <div className="text-[11px] text-zinc-400">{[l.fonction, l.structure].filter(Boolean).join(" · ")}</div>
                      </td>
                      <td>
                        {l.competenceProfessionnelle && l.competenceSociale ? (
                          <Competences pro={l.competenceProfessionnelle} social={l.competenceSociale} compact />
                        ) : (
                          <span className="text-[12px] text-zinc-400">pas évalué</span>
                        )}
                      </td>
                      <td>
                        {l.appreciation && (
                          <span className="flex items-center gap-2">
                            <strong>{virgule(l.globale)}</strong>
                            <Badge ton={TON_APPRECIATION[l.appreciation]}>{l.appreciation}</Badge>
                            {l.valideeLe ? <Badge ton="vert">Validée</Badge> : <Badge ton="jaune">Brouillon</Badge>}
                          </span>
                        )}
                      </td>
                      <td className="text-[12px] text-zinc-600">{l.decision ?? ""}</td>
                      <td className="text-right">
                        <Bouton variante={l.evaluationId ? "discret" : "secondaire"} onClick={() => setEvaluer(l)}>
                          {!l.evaluationId ? "Évaluer" : l.valideeLe ? "Voir" : "Reprendre"}
                        </Bouton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Tableau>
            )}
            <div className="mt-3 flex justify-end gap-2">
              <Bouton disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Précédents
              </Bouton>
              <Bouton disabled={c.donnees.lignes.length < 50} onClick={() => setPage(page + 1)}>
                Suivants
              </Bouton>
            </div>
          </Carte>
        </>
      )}
      {evaluer && c.donnees && (
        <ModaleEvaluation
          agentId={evaluer.id}
          nom={evaluer.nomComplet}
          annee={c.donnees.annee}
          existante={
            evaluer.evaluationId
              ? {
                  competenceProfessionnelle: evaluer.competenceProfessionnelle ?? undefined,
                  competenceSociale: evaluer.competenceSociale ?? undefined,
                  decision: evaluer.decision,
                  date: evaluer.date ?? undefined,
                  commentaireProfessionnel: evaluer.commentaireProfessionnel,
                  commentaireSocial: evaluer.commentaireSocial,
                  valideeLe: evaluer.valideeLe,
                  valideePar: evaluer.valideePar,
                }
              : null
          }
          decisions={c.donnees.decisions}
          fermer={() => setEvaluer(null)}
          apres={() => {
            setEvaluer(null);
            c.recharger();
          }}
        />
      )}
    </div>
  );
}
