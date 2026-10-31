"use client";

import { Link2, RefreshCw, UserPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useSession } from "@/components/session";
import { Alerte, Badge, Bouton, Chargement, Modale, Saisie, Tableau } from "@/components/ui";
import { api, useApi } from "@/lib/api";

/**
 * Rattachement des mutations et des nominations à la base du personnel (DG, 31/10/2026) : chaque
 * demande concerne une personne. Sûr (matricule, nom unique) : rattachée seule ; doute : on
 * choisit ; introuvable : on crée la fiche (à valider ensuite) ou on la laisse sans fiche.
 * Jamais bloquant pour la mutation ou la nomination.
 */

export type ModuleRattachement = "MUTATION" | "NOMINATION";
const NOM: Record<ModuleRattachement, { une: string; des: string }> = {
  MUTATION: { une: "demande", des: "demandes" },
  NOMINATION: { une: "nomination", des: "nominations" },
};
const ETAT: Record<string, { libelle: string; ton: "vert" | "bleu" | "jaune" | "rouge" | "gris" }> = {
  MATRICULE: { libelle: "par le matricule", ton: "vert" },
  NOM: { libelle: "par le nom", ton: "vert" },
  MANUEL: { libelle: "choisies", ton: "vert" },
  CREEE: { libelle: "fiche créée", ton: "bleu" },
  A_VERIFIER: { libelle: "à vérifier", ton: "jaune" },
  INTROUVABLE: { libelle: "introuvables", ton: "rouge" },
  SANS_FICHE: { libelle: "laissées sans fiche", ton: "gris" },
};
const dateFr = (d: string | null | undefined) => (d ? d.slice(0, 10).split("-").reverse().join("/") : null);

interface Candidat {
  id: number;
  nomComplet: string;
  numeroFiche?: string | null;
  statut?: string;
  matricule: string | null;
  departement: string | null;
  dateNaissance?: string | null;
  lieu?: string | null;
  grade?: string | null;
}
interface ATrancher {
  id: string;
  nom: string;
  matricule: string | null;
  departement: string | null;
  etat: "A_VERIFIER" | "INTROUVABLE";
  candidats: Candidat[];
}

/** Bandeau d'un module : où en est le rattachement, et le bouton pour trancher. */
export function PanneauRattachement({ module, apres }: { module: ModuleRattachement; apres?: () => void }) {
  const bilan = useApi<{ parEtat: Record<string, number>; fichesAValider: number }>(`/rattachement/${module}`);
  const [ouvert, setOuvert] = useState(false);
  const [fiches, setFiches] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  if (!bilan.donnees) return null;
  const e = bilan.donnees.parEtat;
  const n = (k: string) => e[k] ?? 0;
  const rattachees = n("MATRICULE") + n("NOM") + n("MANUEL") + n("CREEE");
  const aTrancher = n("A_VERIFIER") + n("INTROUVABLE");
  const total = Object.values(e).reduce((s, x) => s + x, 0);
  if (!total) return null;
  const recharger = () => {
    bilan.recharger();
    apres?.();
  };

  return (
    <div className="space-y-2 rounded-3xl bg-white px-5 py-4 text-[13px] shadow-doux">
      <div className="flex flex-wrap items-center gap-2">
        <Link2 className="size-4 text-zinc-400" />
        <span className="font-medium text-encre">Base du personnel :</span>
        <span>
          {rattachees} {NOM[module].des} sur {total} rattachée(s) à la fiche de la personne
        </span>
        {["MATRICULE", "NOM", "MANUEL", "CREEE"].filter((k) => n(k)).map((k) => (
          <Badge key={k} ton={ETAT[k].ton}>
            {n(k)} {ETAT[k].libelle}
          </Badge>
        ))}
        {n("A_VERIFIER") > 0 && <Badge ton="jaune">{n("A_VERIFIER")} à vérifier</Badge>}
        {n("INTROUVABLE") > 0 && <Badge ton="rouge">{n("INTROUVABLE")} introuvable(s)</Badge>}
        {n("SANS_FICHE") > 0 && <Badge>{n("SANS_FICHE")} sans fiche</Badge>}
        <div className="ml-auto flex flex-wrap gap-2">
          {aTrancher > 0 && (
            <Bouton variante="principal" onClick={() => setOuvert(true)}>
              Trancher ({aTrancher})
            </Bouton>
          )}
          {bilan.donnees.fichesAValider > 0 && (
            <Bouton variante="secondaire" onClick={() => setFiches(true)}>
              Fiches créées à valider ({bilan.donnees.fichesAValider})
            </Bouton>
          )}
          <Bouton
            variante="discret"
            title="Après un import du personnel : les demandes encore sans fiche sont recherchées de nouveau"
            onClick={async () => {
              const r = await api.post<Record<string, number>>(`/rattachement/${module}/relancer`);
              const t = Object.entries(r).map(([k, v]) => `${v} ${ETAT[k]?.libelle ?? k}`).join(", ");
              setMessage(t ? `Rattachement relancé : ${t}.` : "Rattachement relancé : rien de nouveau.");
              recharger();
            }}
          >
            <RefreshCw className="size-4" /> Relancer
          </Bouton>
        </div>
      </div>
      {aTrancher > 0 && (
        <p className="text-[12px] text-zinc-500">
          Rien n’est bloqué : la {NOM[module].une} suit son cours même sans fiche. Rattacher sert à mettre la fiche de la personne à jour (lieu de
          service, dossier de carrière) et à éviter les erreurs de nom.
        </p>
      )}
      {message && <Alerte ton="vert">{message}</Alerte>}
      {ouvert && (
        <ModaleRattachement
          module={module}
          fermer={() => {
            setOuvert(false);
            recharger();
          }}
        />
      )}
      {fiches && (
        <FichesAValider
          origine={module}
          fermer={() => {
            setFiches(false);
            recharger();
          }}
        />
      )}
    </div>
  );
}

/** Les demandes à trancher : choisir la fiche, créer la fiche, ou laisser sans fiche. */
export function ModaleRattachement({ module, fermer }: { module: ModuleRattachement; fermer: () => void }) {
  const liste = useApi<ATrancher[]>(`/rattachement/${module}/a-trancher`);
  const [filtre, setFiltre] = useState<"A_VERIFIER" | "INTROUVABLE">("A_VERIFIER");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [confirmerTout, setConfirmerTout] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function decider(d: ATrancher, action: "LIER" | "CREER" | "SANS_FICHE", agentId?: number) {
    setEnvoi(d.id);
    setErreur(null);
    try {
      await api.post(`/rattachement/${module}/${d.id}`, { action, agentId });
      liste.recharger();
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(null);
    }
  }

  const lignes = (liste.donnees ?? []).filter((d) => d.etat === filtre);
  const nb = (e: string) => (liste.donnees ?? []).filter((d) => d.etat === e).length;

  return (
    <Modale titre={`Rattacher les ${NOM[module].des} à la base du personnel`} ouverte fermer={fermer} large>
      <div className="space-y-4 text-[13px]">
        <div className="flex flex-wrap gap-2">
          {(["A_VERIFIER", "INTROUVABLE"] as const).map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setFiltre(e)}
              className={`rounded-xl px-3 py-1.5 font-medium ${filtre === e ? "bg-nuit text-white" : "bg-zinc-100 text-zinc-600"}`}
            >
              {e === "A_VERIFIER" ? "À vérifier : plusieurs fiches possibles" : "Introuvables : aucune fiche"} ({nb(e)})
            </button>
          ))}
        </div>
        <p className="leading-relaxed text-zinc-600">
          {filtre === "A_VERIFIER"
            ? "Plusieurs fiches portent ce nom (ou la seule est dans un autre département). Choisissez la bonne avec « C’est elle » ; si aucune ne convient, créez sa fiche ou laissez-la sans fiche."
            : "Aucune fiche de la base du personnel ne porte ce nom ni ce matricule. Créez sa fiche à partir de la demande (elle sera signalée « à valider »), ou laissez-la sans fiche."}
        </p>
        {erreur && <Alerte>{erreur}</Alerte>}
        {message && <Alerte ton="vert">{message}</Alerte>}
        {filtre === "INTROUVABLE" && nb("INTROUVABLE") > 1 && (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-zinc-50 px-3 py-2">
            {confirmerTout ? (
              <>
                <span>Créer les {nb("INTROUVABLE")} fiches manquantes d’un coup ? Elles seront toutes « à valider ».</span>
                <Bouton
                  variante="principal"
                  disabled={!!envoi}
                  onClick={async () => {
                    setEnvoi("tout");
                    try {
                      const r = await api.post<{ creees: number }>(`/rattachement/${module}/creer-toutes`);
                      setMessage(`${r.creees} fiche(s) créée(s), à valider dans la base du personnel.`);
                      liste.recharger();
                    } catch (e) {
                      setErreur((e as Error).message);
                    } finally {
                      setEnvoi(null);
                      setConfirmerTout(false);
                    }
                  }}
                >
                  Oui, créer
                </Bouton>
                <Bouton variante="discret" onClick={() => setConfirmerTout(false)}>
                  Non
                </Bouton>
              </>
            ) : (
              <Bouton variante="secondaire" onClick={() => setConfirmerTout(true)}>
                <UserPlus className="size-4" /> Créer toutes les fiches manquantes ({nb("INTROUVABLE")})
              </Bouton>
            )}
          </div>
        )}
        {!liste.donnees ? (
          <Chargement />
        ) : !lignes.length ? (
          <p className="text-zinc-500">Rien à trancher ici.</p>
        ) : (
          <div className="max-h-[60vh] space-y-3 overflow-auto">
            {lignes.map((d) => (
              <div key={d.id} className="rounded-2xl border border-zinc-200 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-encre">{d.nom}</span>
                  <span className="text-[12px] text-zinc-500">
                    {d.matricule ? `matricule ${d.matricule}` : "sans matricule"}
                    {d.departement ? ` · ${d.departement}` : ""}
                  </span>
                  <div className="ml-auto flex gap-2">
                    <Bouton variante="secondaire" disabled={envoi === d.id} onClick={() => decider(d, "CREER")}>
                      <UserPlus className="size-4" /> Créer sa fiche
                    </Bouton>
                    <Bouton variante="discret" disabled={envoi === d.id} onClick={() => decider(d, "SANS_FICHE")}>
                      Laisser sans fiche
                    </Bouton>
                  </div>
                </div>
                {d.candidats.length > 0 && (
                  <Tableau>
                    <tbody>
                      {d.candidats.map((c) => (
                        <tr key={c.id}>
                          <td>
                            <Link href={`/personnel/agents/${c.id}`} target="_blank" className="font-medium text-marque-700 hover:underline">
                              {c.nomComplet}
                            </Link>
                            <div className="text-[11px] text-zinc-400">
                              {[c.numeroFiche, c.statut?.toLowerCase(), c.dateNaissance && `né(e) le ${dateFr(c.dateNaissance)}`].filter(Boolean).join(" · ")}
                            </div>
                          </td>
                          <td className="text-[12px]">{c.matricule ?? "—"}</td>
                          <td className="text-[12px]">{[c.grade, c.lieu, c.departement].filter(Boolean).join(" · ") || "—"}</td>
                          <td className="text-right">
                            <Bouton variante="principal" disabled={envoi === d.id} onClick={() => decider(d, "LIER", c.id)}>
                              C’est elle
                            </Bouton>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Tableau>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modale>
  );
}

interface FicheCreee {
  id: number;
  numeroFiche: string | null;
  nomComplet: string;
  statut: string;
  matricule: string | null;
  departement: string | null;
  lieu: string | null;
  origine: string;
  repere: string | null;
  par: string | null;
  le: string | null;
}

/** Fiches créées depuis une mutation ou une nomination : valider, rejeter ou supprimer. */
export function FichesAValider({ origine, fermer }: { origine?: ModuleRattachement; fermer: () => void }) {
  const { profil } = useSession();
  const liste = useApi<FicheCreee[]>("/rattachement/fiches/a-valider");
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmer, setConfirmer] = useState<{ id: number; action: "REJETER" | "SUPPRIMER" } | null>(null);
  const [note, setNote] = useState("");
  const controle = ["ADMIN", "CHEF_SERVICE", "DIRECTEUR", "BUREAU_ETUDES", "DG"].includes(profil.role);
  const lignes = (liste.donnees ?? []).filter((f) => !origine || f.origine === origine);

  async function agir(id: number, action: "VALIDER" | "REJETER" | "SUPPRIMER") {
    setErreur(null);
    try {
      await api.post(`/rattachement/fiches/${id}`, { action, note: note.trim() || undefined });
      setConfirmer(null);
      setNote("");
      liste.recharger();
    } catch (e) {
      setErreur((e as Error).message);
    }
  }

  return (
    <Modale titre="Fiches créées depuis les mutations et les nominations" ouverte fermer={fermer} large>
      <div className="space-y-3 text-[13px]">
        <p className="leading-relaxed text-zinc-600">
          Ces personnes n’étaient pas dans la base du personnel : leur fiche a été créée à partir de leur demande. <strong>Valider</strong> : la fiche
          entre normalement dans la base. <strong>Rejeter</strong> : ce n’est pas un agent reconnu ; la fiche reste, marquée rejetée (hors effectifs).{" "}
          <strong>Supprimer</strong> : fiche créée par erreur ; elle est effacée et la demande redevient « à rattacher ».
        </p>
        {!controle && <Alerte ton="jaune">Valider, rejeter ou supprimer est réservé au contrôle (chef de service, directeur, bureau d’études, DG).</Alerte>}
        {erreur && <Alerte>{erreur}</Alerte>}
        {!liste.donnees ? (
          <Chargement />
        ) : !lignes.length ? (
          <p className="text-zinc-500">Aucune fiche à valider.</p>
        ) : (
          <Tableau>
            <thead>
              <tr>
                <th>Personne</th>
                <th>Créée depuis</th>
                <th>Ce que la demande dit</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lignes.map((f) => (
                <tr key={f.id}>
                  <td>
                    <Link href={`/personnel/agents/${f.id}`} target="_blank" className="font-medium text-marque-700 hover:underline">
                      {f.nomComplet}
                    </Link>
                    <div className="text-[11px] text-zinc-400">{[f.numeroFiche, f.statut.toLowerCase()].filter(Boolean).join(" · ")}</div>
                  </td>
                  <td className="text-[12px]">
                    {f.repere}
                    <div className="text-[11px] text-zinc-400">{[f.par, dateFr(f.le)].filter(Boolean).join(", le ")}</div>
                  </td>
                  <td className="text-[12px]">{[f.matricule && `matricule ${f.matricule}`, f.lieu, f.departement].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="min-w-64 text-right">
                    {confirmer?.id === f.id ? (
                      <div className="flex flex-wrap justify-end gap-2">
                        {confirmer.action === "REJETER" && (
                          <Saisie value={note} onChange={(e) => setNote(e.target.value)} placeholder="Motif du rejet" className="min-w-48" />
                        )}
                        <Bouton variante="danger" onClick={() => agir(f.id, confirmer.action)}>
                          {confirmer.action === "REJETER" ? "Rejeter" : "Oui, supprimer"}
                        </Bouton>
                        <Bouton variante="discret" onClick={() => setConfirmer(null)}>
                          Non
                        </Bouton>
                      </div>
                    ) : (
                      <div className="flex flex-wrap justify-end gap-2">
                        <Bouton variante="principal" disabled={!controle} onClick={() => agir(f.id, "VALIDER")}>
                          Valider
                        </Bouton>
                        <Bouton variante="secondaire" disabled={!controle} onClick={() => setConfirmer({ id: f.id, action: "REJETER" })}>
                          Rejeter
                        </Bouton>
                        <Bouton variante="discret" disabled={!controle} onClick={() => setConfirmer({ id: f.id, action: "SUPPRIMER" })}>
                          Supprimer
                        </Bouton>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Tableau>
        )}
      </div>
    </Modale>
  );
}
