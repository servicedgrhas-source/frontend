"use client";

import { Check, Plus, Save, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Alerte, Annonce, Badge, Bouton, Carte, Champ, Chargement, Liste, Modale, Saisie, Tableau, Vide, Zone, useConfirmation } from "@/components/ui";
import { api, useApi } from "@/lib/api";

export interface DemandeBesoin {
  id: number;
  structureId: number;
  poste: string;
  nombre: number;
  motif: string;
  statut: "EN_ATTENTE" | "ACCORDE" | "REFUSE";
  nombreAccorde: number | null;
  decision: string | null;
  decidePar: string | null;
  decideLe: string | null;
  creePar: string | null;
  creeLe: string;
  normal: number | null;
  enPoste: number | null;
  depasse: boolean;
  structure?: string;
  sigle?: string;
}

interface Situation {
  structure: { id: number; nom: string; sigle: string; type: string; posteResponsable: string };
  peutModifierCadre: boolean;
  peutDecider: boolean;
  lignes: { poste: string; normal: number | null; enPoste: number; manque: number | null; demande: number }[];
  enPoste: number;
  sansFonction: number;
  demandes: DemandeBesoin[];
}

const dateFr = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");

export function StatutBesoin({ d }: { d: DemandeBesoin }) {
  if (d.statut === "ACCORDE") return <Badge ton="vert">{d.nombreAccorde === d.nombre ? "Accordé" : `Accordé : ${d.nombreAccorde} sur ${d.nombre}`}</Badge>;
  if (d.statut === "REFUSE") return <Badge ton="rouge">Refusé</Badge>;
  return <Badge ton="jaune">En attente</Badge>;
}

/**
 * Cadre organique et besoins d'une structure administrative (DG, 28/10/2026) : l'effectif normal de
 * chaque poste fixé à l'avance, l'effectif en poste, les demandes de personnel et leurs réponses.
 */
export function SituationBesoins({ structureId }: { structureId: number }) {
  const s = useApi<Situation>(`/besoins-administratifs/structures/${structureId}`);
  const postes = useApi<string[]>("/besoins-administratifs/postes");
  const [cadre, setCadre] = useState<{ poste: string; effectif: string }[] | null>(null);
  const [demande, setDemande] = useState<{ poste: string; autre: string; nombre: string; motif: string } | null>(null);
  const [decision, setDecision] = useState<DemandeBesoin | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmation, demander] = useConfirmation();

  if (s.erreur) return <Alerte>{s.erreur}</Alerte>;
  if (!s.donnees) return <Chargement />;
  const d = s.donnees;
  const listePostes = [...new Set([...(postes.donnees ?? []), ...d.lignes.map((l) => l.poste)])];

  async function agir(f: () => Promise<unknown>, ok: string) {
    setErreur(null);
    try {
      await f();
      setMessage(ok);
      s.recharger();
      return true;
    } catch (x) {
      setErreur((x as Error).message);
      return false;
    }
  }

  return (
    <div className="space-y-4">
      <Annonce fermer={() => setMessage(null)}>{message}</Annonce>
      {erreur && <Alerte>{erreur}</Alerte>}
      <Carte
        titre="Cadre organique : l’effectif normal de chaque poste"
        actions={
          d.peutModifierCadre && (
            <Bouton onClick={() => setCadre(d.lignes.filter((l) => l.normal !== null).map((l) => ({ poste: l.poste, effectif: String(l.normal) })).concat(d.lignes.some((l) => l.normal !== null) ? [] : [{ poste: d.structure.posteResponsable, effectif: "1" }]))}>
              Fixer l’effectif normal
            </Bouton>
          )
        }
      >
        <p className="-mt-2 mb-3 text-[12px] leading-relaxed text-zinc-500">
          Fixé à l’avance (par exemple : 1 chef de bureau, 5 collaborateurs, 1 secrétaire), il sert à juger chaque demande : si l’on demande plus que l’effectif normal, la DGRHAS le voit tout de
          suite. « En poste » compte les agents rattachés à la structure d’après la <strong>fonction dans la structure</strong> écrite dans leur fiche.
        </p>
        {!d.lignes.length ? (
          <Vide>Aucun effectif normal fixé, et aucune demande en attente.</Vide>
        ) : (
          <Tableau>
            <thead>
              <tr>
                <th>Poste</th>
                <th className="text-right">Effectif normal</th>
                <th className="text-right">En poste</th>
                <th className="text-right">Manque</th>
                <th className="text-right">Demandé (en attente)</th>
              </tr>
            </thead>
            <tbody>
              {d.lignes.map((l) => (
                <tr key={l.poste}>
                  <td className="font-medium">{l.poste}</td>
                  <td className="text-right tabular-nums">{l.normal ?? <span className="text-zinc-400">non fixé</span>}</td>
                  <td className="text-right tabular-nums">{l.enPoste}</td>
                  <td className="text-right tabular-nums">
                    {l.manque === null ? "—" : l.manque > 0 ? <strong className="text-rouge-700">{l.manque}</strong> : l.manque < 0 ? <span className="text-or-700">{-l.manque} en surnombre</span> : <span className="text-marque-700">complet</span>}
                  </td>
                  <td className="text-right tabular-nums">{l.demande || "—"}</td>
                </tr>
              ))}
            </tbody>
          </Tableau>
        )}
        <p className="mt-2 text-[12px] text-zinc-500">
          {d.enPoste} agent(s) à leur poste dans la structure
          {d.sansFonction ? ` ; ${d.sansFonction} sans « fonction dans la structure » dans leur fiche (ils ne comptent dans aucun poste)` : ""}.
        </p>
      </Carte>

      <Carte
        titre={`Demandes de personnel (${d.demandes.length})`}
        actions={
          d.peutModifierCadre && (
            <Bouton variante="principal" onClick={() => setDemande({ poste: "", autre: "", nombre: "1", motif: "" })}>
              <Plus /> Exprimer un besoin
            </Bouton>
          )
        }
      >
        {!d.demandes.length ? (
          <Vide>Aucune demande. « Exprimer un besoin » : le poste, le nombre de personnes et pourquoi.</Vide>
        ) : (
          <Tableau>
            <thead>
              <tr>
                <th>Demandé le</th>
                <th>Poste</th>
                <th className="text-right">Nombre</th>
                <th>Pourquoi</th>
                <th>Réponse</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {d.demandes.map((x) => (
                <tr key={x.id}>
                  <td className="text-[12px] whitespace-nowrap">
                    {dateFr(x.creeLe)}
                    <div className="text-[11px] text-zinc-400">{x.creePar}</div>
                  </td>
                  <td className="font-medium">
                    {x.poste}
                    {x.depasse && x.statut === "EN_ATTENTE" && <div className="text-[11px] font-normal text-rouge-700">au-delà de l’effectif normal ({x.normal})</div>}
                  </td>
                  <td className="text-right tabular-nums">{x.nombre}</td>
                  <td className="text-[12px]">{x.motif}</td>
                  <td className="text-[12px]">
                    <StatutBesoin d={x} />
                    {x.decision && <div className="mt-1 text-zinc-600">{x.decision}</div>}
                    {x.decidePar && (
                      <div className="text-[11px] text-zinc-400">
                        {x.decidePar}, le {dateFr(x.decideLe)}
                      </div>
                    )}
                  </td>
                  <td className="text-right whitespace-nowrap">
                    {x.statut === "EN_ATTENTE" && d.peutDecider && (
                      <Bouton variante="principal" onClick={() => setDecision(x)}>
                        Répondre
                      </Bouton>
                    )}
                    {x.statut === "EN_ATTENTE" && d.peutModifierCadre && (
                      <Bouton
                        variante="discret"
                        title="Retirer la demande"
                        onClick={async () => {
                          if (await demander(`Retirer la demande « ${x.nombre} ${x.poste} » ?`, "Retirer")) await agir(() => api.delete(`/besoins-administratifs/demandes/${x.id}`), "Demande retirée.");
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Bouton>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Tableau>
        )}
      </Carte>

      {cadre && (
        <Modale titre={`Effectif normal — ${d.structure.sigle || d.structure.nom}`} ouverte fermer={() => setCadre(null)} large>
          <p className="mb-3 text-[13px] text-zinc-600">Pour chaque poste, le nombre de personnes qu’il faut normalement dans la structure. Une ligne vide est ignorée.</p>
          <div className="space-y-2">
            {cadre.map((l, i) => (
              <div key={i} className="grid grid-cols-[1fr_7rem_auto] items-center gap-2">
                <Saisie list="postes-cadre" value={l.poste} onChange={(e) => setCadre(cadre.map((y, k) => (k === i ? { ...y, poste: e.target.value } : y)))} placeholder="Poste (ex. Collaborateur)" aria-label="Poste" />
                <Saisie type="number" min={0} value={l.effectif} onChange={(e) => setCadre(cadre.map((y, k) => (k === i ? { ...y, effectif: e.target.value } : y)))} aria-label="Effectif normal" />
                <Bouton variante="discret" title="Enlever ce poste" onClick={() => setCadre(cadre.filter((_, k) => k !== i))}>
                  <X className="size-4" />
                </Bouton>
              </div>
            ))}
            <datalist id="postes-cadre">
              {listePostes.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
            <Bouton onClick={() => setCadre([...cadre, { poste: "", effectif: "1" }])}>
              <Plus /> Ajouter un poste
            </Bouton>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Bouton onClick={() => setCadre(null)}>Annuler</Bouton>
            <Bouton
              variante="principal"
              onClick={async () => {
                const ok = await agir(
                  () => api.put(`/besoins-administratifs/structures/${structureId}/cadre`, { lignes: cadre.filter((l) => l.poste.trim()).map((l) => ({ poste: l.poste, effectif: Number(l.effectif) })) }),
                  "Effectif normal enregistré.",
                );
                if (ok) setCadre(null);
              }}
            >
              <Save /> Enregistrer
            </Bouton>
          </div>
        </Modale>
      )}

      {demande && (
        <Modale titre="Exprimer un besoin en personnel" ouverte fermer={() => setDemande(null)}>
          <div className="space-y-3">
            <Champ libelle="Poste *">
              <Liste value={demande.poste} onChange={(e) => setDemande({ ...demande, poste: e.target.value })} vide="— Choisir —" options={[...listePostes.map((p) => ({ valeur: p, libelle: p })), { valeur: "AUTRE", libelle: "Autre poste…" }]} />
            </Champ>
            {demande.poste === "AUTRE" && (
              <Champ libelle="Lequel ? *">
                <Saisie value={demande.autre} onChange={(e) => setDemande({ ...demande, autre: e.target.value })} placeholder="Ex. Archiviste" />
              </Champ>
            )}
            <Champ libelle="Nombre de personnes *">
              <Saisie type="number" min={1} value={demande.nombre} onChange={(e) => setDemande({ ...demande, nombre: e.target.value })} />
            </Champ>
            {(() => {
              const poste = demande.poste === "AUTRE" ? demande.autre : demande.poste;
              const l = d.lignes.find((x) => x.poste.toLowerCase() === poste.toLowerCase());
              if (!l || l.normal === null) return null;
              const apres = l.enPoste + l.demande + Number(demande.nombre || 0);
              return (
                <Alerte ton={apres > l.normal ? "jaune" : "bleu"}>
                  Effectif normal : {l.normal} ; en poste : {l.enPoste}
                  {l.demande ? ` ; déjà demandé : ${l.demande}` : ""}.{apres > l.normal ? ` Avec cette demande : ${apres}, au-delà de l’effectif normal : la DGRHAS pourra la refuser.` : ""}
                </Alerte>
              );
            })()}
            <Champ libelle="Pourquoi ? *" aide="Départ à la retraite, mutation, création du bureau, surcharge de travail…">
              <Zone value={demande.motif} onChange={(e) => setDemande({ ...demande, motif: e.target.value })} />
            </Champ>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Bouton onClick={() => setDemande(null)}>Annuler</Bouton>
            <Bouton
              variante="principal"
              onClick={async () => {
                const ok = await agir(
                  () =>
                    api.post(`/besoins-administratifs/structures/${structureId}/demandes`, {
                      poste: demande.poste === "AUTRE" ? demande.autre : demande.poste,
                      nombre: Number(demande.nombre),
                      motif: demande.motif,
                    }),
                  "Besoin envoyé à la DGRHAS.",
                );
                if (ok) setDemande(null);
              }}
            >
              Envoyer
            </Bouton>
          </div>
        </Modale>
      )}

      {decision && <ModaleReponse d={decision} fermer={() => setDecision(null)} apres={() => s.recharger()} />}
      {confirmation}
    </div>
  );
}

/** Réponse de la DGRHAS à une demande : accorder (en tout ou en partie) ou refuser, avec le motif. */
export function ModaleReponse({ d, fermer, apres }: { d: DemandeBesoin; fermer: () => void; apres: () => void }) {
  const [nombre, setNombre] = useState(String(d.nombre));
  const [commentaire, setCommentaire] = useState(d.depasse ? `Au-delà de l’effectif normal du poste (${d.normal}).` : "");
  const [erreur, setErreur] = useState<string | null>(null);
  async function repondre(decision: "ACCORDE" | "REFUSE") {
    setErreur(null);
    try {
      await api.post(`/besoins-administratifs/demandes/${d.id}/decision`, { decision, nombreAccorde: Number(nombre), commentaire });
      apres();
      fermer();
    } catch (x) {
      setErreur((x as Error).message);
    }
  }
  return (
    <Modale titre={`Répondre : ${d.nombre} ${d.poste}${d.structure ? ` — ${d.sigle || d.structure}` : ""}`} ouverte fermer={fermer}>
      <div className="space-y-3 text-[13px]">
        <p className="text-zinc-600">« {d.motif} »</p>
        {d.normal !== null ? (
          <Alerte ton={d.depasse ? "jaune" : "bleu"}>
            Effectif normal du poste : {d.normal} ; en poste : {d.enPoste ?? 0} ; demandé : {d.nombre}.{d.depasse ? " La demande dépasse l’effectif normal." : " La demande reste dans l’effectif normal."}
          </Alerte>
        ) : (
          <Alerte ton="jaune">Aucun effectif normal fixé pour ce poste : impossible de comparer.</Alerte>
        )}
        <Champ libelle="Nombre accordé (si vous accordez)">
          <Saisie type="number" min={1} max={d.nombre} value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </Champ>
        <Champ libelle="Commentaire (obligatoire pour refuser)">
          <Zone value={commentaire} onChange={(e) => setCommentaire(e.target.value)} />
        </Champ>
        {erreur && <Alerte>{erreur}</Alerte>}
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Bouton onClick={fermer}>Annuler</Bouton>
        <Bouton variante="danger" onClick={() => repondre("REFUSE")}>
          <X /> Refuser
        </Bouton>
        <Bouton variante="principal" onClick={() => repondre("ACCORDE")}>
          <Check /> Accorder
        </Bouton>
      </div>
    </Modale>
  );
}
