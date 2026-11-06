"use client";

import { ArrowRight, Check, CircleHelp, DatabaseZap, Link2, UserPlus, UserX } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useSession } from "./session";
import { Aide, Alerte, Bouton, Chargement, Modale } from "./ui";
import { api, useApi } from "@/lib/api";
import { peut } from "@/lib/libelles";
import type { NoteDetail } from "@/lib/types";

type Etat = "LIEE" | "CREEE" | "A_VERIFIER" | "INTROUVABLE" | "SANS_FICHE";
interface Candidat {
  id: number;
  nomComplet: string;
  numeroFiche?: string | null;
  statut?: string;
  matricule: string | null;
  departement: string | null;
  lieu?: string | null;
  grade?: string | null;
}
interface Personne {
  id: string;
  nom: string;
  matricule: string | null;
  origine: string | null;
  destination: string | null;
  etat: Etat;
  fiche: { id: number; numero: string | null; nom: string; lieu: string | null } | null;
  candidats: Candidat[];
}
interface Bilan {
  note: { id: string; numero: string | null; libelle: string };
  reporteLe: string | null;
  reportePar: string | null;
  personnes: Personne[];
}

const ETATS: Record<Etat, { texte: string; classe: string }> = {
  LIEE: { texte: "Fiche trouvée", classe: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  CREEE: { texte: "Fiche créée (à valider)", classe: "bg-sky-50 text-sky-800 ring-sky-200" },
  A_VERIFIER: { texte: "À vérifier", classe: "bg-amber-50 text-amber-800 ring-amber-200" },
  INTROUVABLE: { texte: "Pas de fiche", classe: "bg-rose-50 text-rose-800 ring-rose-200" },
  SANS_FICHE: { texte: "Laissé sans fiche", classe: "bg-zinc-100 text-zinc-600 ring-zinc-200" },
};

/**
 * Note de mutation signée → base du personnel (06/11/2026). Le traitement des mutations ne touche
 * pas la base du personnel : une fois la note signée, ce bouton rattache chaque personne à sa
 * fiche (ou crée sa fiche), puis reporte la mutation sur la fiche (lieu, département, affectations
 * successives).
 */
export function BoutonPersonnel({ note, recharger, signaler }: { note: NoteDetail; recharger: () => void; signaler: (ton: "vert" | "rouge", texte: string) => void }) {
  const { profil } = useSession();
  const [ouvert, setOuvert] = useState(false);
  if (note.module !== "MUTATION" || note.statut !== "SIGNEE" || !peut.traiter(profil.role)) return null;
  const fait = !!note.reportePersonnelLe;
  return (
    <>
      <Bouton variante={fait ? "secondaire" : "principal"} onClick={() => setOuvert(true)}>
        <DatabaseZap className="size-4" aria-hidden />
        {fait ? "Base du personnel : déjà importée" : "Importer dans la base du personnel"}
        <Aide>
          Les mutations restent à part de la base du personnel jusqu’à la note signée. Ce bouton rattache chaque personne de la note à sa fiche (ou crée sa fiche), puis
          met à jour la fiche : nouveau lieu de service, nouveau département, une ligne dans les affectations successives.
        </Aide>
      </Bouton>
      {ouvert && (
        <FenetrePersonnel
          note={note}
          fermer={() => setOuvert(false)}
          apres={(t) => {
            setOuvert(false);
            recharger();
            signaler("vert", t);
          }}
        />
      )}
    </>
  );
}

function FenetrePersonnel({ note, fermer, apres }: { note: NoteDetail; fermer: () => void; apres: (t: string) => void }) {
  const b = useApi<Bilan>(`/notes/${note.id}/personnel`);
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<"TOUS" | "A_TRANCHER">("A_TRANCHER");
  const p = b.donnees?.personnes ?? [];
  const compte = (e: Etat[]) => p.filter((x) => e.includes(x.etat)).length;
  const aTrancher = compte(["A_VERIFIER", "INTROUVABLE"]);
  const prets = compte(["LIEE", "CREEE"]);
  const etape = !b.donnees ? 0 : aTrancher ? 1 : 2;
  const visibles = filtre === "A_TRANCHER" && aTrancher ? p.filter((x) => x.etat === "A_VERIFIER" || x.etat === "INTROUVABLE") : p;

  async function agir(cle: string, f: () => Promise<unknown>) {
    setEnvoi(cle);
    setErreur(null);
    try {
      await f();
      b.recharger();
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(null);
    }
  }
  const decider = (x: Personne, action: "LIER" | "CREER" | "SANS_FICHE", agentId?: number) =>
    agir(x.id, () => api.post(`/notes/${note.id}/personnel/decision`, { demandeId: x.id, action, agentId }));

  async function reporter() {
    setEnvoi("reporter");
    setErreur(null);
    try {
      const r = await api.post<{ fiches: number; sansFiche: number }>(`/notes/${note.id}/personnel/reporter`);
      apres(`Mutation reportée sur ${r.fiches} fiche(s) du personnel${r.sansFiche ? ` ; ${r.sansFiche} personne(s) sans fiche ne sont pas reportées` : ""}.`);
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(null);
    }
  }

  return (
    <Modale titre="Importer dans la base du personnel" ouverte fermer={fermer} large>
      <div className="space-y-4 text-[13px]">
        <ol className="flex flex-wrap items-center gap-2 text-[12px]">
          {["Retrouver les fiches", "Trancher les doutes", "Reporter sur les fiches"].map((t, i) => (
            <li key={t} className="flex items-center gap-2">
              <span className={`grid size-6 place-items-center rounded-full font-semibold ${i < etape ? "bg-marque-600 text-white" : i === etape ? "bg-marque-100 text-marque-800 ring-2 ring-marque-300" : "bg-zinc-100 text-zinc-500"}`}>
                {i < etape ? <Check className="size-3.5" aria-hidden /> : i + 1}
              </span>
              <span className={i === etape ? "font-semibold text-encre" : "text-zinc-500"}>{t}</span>
              {i < 2 && <ArrowRight className="size-3.5 text-zinc-300" aria-hidden />}
            </li>
          ))}
        </ol>
        {b.donnees?.reporteLe && (
          <Alerte ton="vert">
            Déjà reportée le {new Date(b.donnees.reporteLe).toLocaleDateString("fr-FR")}
            {b.donnees.reportePar ? ` par ${b.donnees.reportePar}` : ""}. Vous pouvez la reporter de nouveau après avoir rattaché d’autres personnes : une fiche
            déjà mise à jour ne reçoit pas deux fois la même ligne.
          </Alerte>
        )}
        {b.chargement && <Chargement texte="Recherche des fiches dans la base du personnel…" />}
        {b.erreur && <Alerte>{b.erreur}</Alerte>}
        {b.donnees && (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(
                [
                  ["LIEE", Link2],
                  ["CREEE", UserPlus],
                  ["A_VERIFIER", CircleHelp],
                  ["INTROUVABLE", UserX],
                ] as const
              ).map(([e, Icone]) => (
                <div key={e} className={`rounded-2xl px-3 py-2.5 ring-1 ${ETATS[e].classe}`}>
                  <div className="flex items-center gap-1.5 text-[20px] font-semibold tabular-nums">
                    <Icone className="size-4" aria-hidden />
                    {compte([e])}
                  </div>
                  <div className="text-[11px]">{ETATS[e].texte}</div>
                </div>
              ))}
            </div>
            {aTrancher > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
                <span className="text-amber-900">
                  <strong>{aTrancher}</strong> personne(s) à trancher : choisissez leur fiche (« C’est elle »), créez leur fiche, ou laissez-les sans fiche.
                </span>
                {compte(["INTROUVABLE"]) > 0 && (
                  <Bouton chargement={envoi === "toutes"} onClick={() => agir("toutes", () => api.post(`/notes/${note.id}/personnel/creer-toutes`))}>
                    <UserPlus className="size-4" aria-hidden /> Créer les {compte(["INTROUVABLE"])} fiches manquantes
                  </Bouton>
                )}
              </div>
            )}
            {aTrancher > 0 && (
              <div className="inline-flex rounded-full bg-zinc-100 p-1 text-[12px]">
                {(
                  [
                    ["A_TRANCHER", `À trancher (${aTrancher})`],
                    ["TOUS", `Toute la note (${p.length})`],
                  ] as const
                ).map(([k, t]) => (
                  <button key={k} type="button" onClick={() => setFiltre(k)} className={`rounded-full px-3 py-1 font-medium ${filtre === k ? "bg-white text-encre shadow-sm" : "text-zinc-500"}`}>
                    {t}
                  </button>
                ))}
              </div>
            )}
            <ul className="max-h-[44vh] divide-y divide-zinc-100 overflow-y-auto rounded-2xl ring-1 ring-zinc-200">
              {visibles.map((x) => (
                <li key={x.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-encre">{x.nom}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${ETATS[x.etat].classe}`}>{ETATS[x.etat].texte}</span>
                      </div>
                      <div className="text-[12px] text-zinc-500">
                        {x.matricule ? `Matricule ${x.matricule}` : "Sans matricule"} · {x.origine ?? "?"} → {x.destination ?? "?"}
                      </div>
                      {x.fiche && (
                        <div className="text-[12px] text-zinc-600">
                          Fiche{" "}
                          <Link href={`/personnel/agents/${x.fiche.id}`} target="_blank" className="font-medium text-marque-700 hover:underline">
                            {x.fiche.numero ?? x.fiche.nom}
                          </Link>
                          {x.fiche.lieu ? ` · aujourd’hui : ${x.fiche.lieu}` : ""}
                        </div>
                      )}
                    </div>
                    {(x.etat === "A_VERIFIER" || x.etat === "INTROUVABLE") && (
                      <span className="flex flex-wrap gap-1">
                        <Bouton chargement={envoi === x.id} onClick={() => decider(x, "CREER")}>
                          <UserPlus className="size-3.5" aria-hidden /> Créer sa fiche
                        </Bouton>
                        <Bouton variante="discret" disabled={envoi === x.id} onClick={() => decider(x, "SANS_FICHE")}>
                          Laisser sans fiche
                        </Bouton>
                      </span>
                    )}
                  </div>
                  {x.candidats.length > 0 && (x.etat === "A_VERIFIER" || x.etat === "INTROUVABLE") && (
                    <div className="mt-2 space-y-1">
                      <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">Fiches possibles</div>
                      {x.candidats.map((c) => (
                        <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-zinc-50 px-3 py-2">
                          <span className="text-[12px]">
                            <Link href={`/personnel/agents/${c.id}`} target="_blank" className="font-medium text-marque-700 hover:underline">
                              {c.nomComplet}
                            </Link>
                            <span className="text-zinc-500"> · {[c.numeroFiche, c.matricule, c.grade, c.lieu, c.departement].filter(Boolean).join(" · ")}</span>
                          </span>
                          <Bouton variante="principal" disabled={envoi === x.id} onClick={() => decider(x, "LIER", c.id)}>
                            C’est elle
                          </Bouton>
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
            {erreur && <Alerte>{erreur}</Alerte>}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-3">
              <span className="text-[12px] text-zinc-500">
                {prets} fiche(s) prête(s) à recevoir la mutation{aTrancher ? ` ; ${aTrancher} encore à trancher (elles seront reportées plus tard)` : ""}.
              </span>
              <span className="flex gap-2">
                <Bouton onClick={fermer}>Fermer</Bouton>
                <Bouton variante="principal" disabled={!prets} chargement={envoi === "reporter"} onClick={reporter}>
                  <DatabaseZap className="size-4" aria-hidden /> Reporter sur {prets} fiche(s)
                </Bouton>
              </span>
            </div>
          </>
        )}
      </div>
    </Modale>
  );
}
