"use client";

import { useState } from "react";
import { useSession } from "@/components/session";
import { Alerte, Badge, Bouton, Carte, Chargement, EnTete, Liste, Modale, Tableau, Vide, Zone } from "@/components/ui";
import { api, qs, useApi } from "@/lib/api";
import { dateCourte, libelleLot, peut } from "@/lib/libelles";
import type { Recommandation } from "@/lib/types";

const STATUTS = {
  EN_ATTENTE: { libelle: "En attente du DG", ton: "jaune" as const },
  VALIDEE: { libelle: "Validée", ton: "vert" as const },
  REJETEE: { libelle: "Rejetée", ton: "rouge" as const },
};

export default function Recommandations() {
  const { profil, refs } = useSession();
  const [statut, setStatut] = useState("EN_ATTENTE");
  const { donnees, erreur, recharger } = useApi<Recommandation[]>(`/recommandations${qs({ statut })}`);
  const [decision, setDecision] = useState<{ r: Recommandation; d: "VALIDEE" | "REJETEE" } | null>(null);
  const libType = (c?: string | null) => refs.typesNote.find((t) => t.code === c)?.libelle ?? c ?? "—";

  return (
    <div className="space-y-4">
      <EnTete
        titre="Recommandations"
        sousTitre="Toute demande de déplacement (autre département, administration, établissement précis) doit être validée par le Directeur général. Sans validation, l’agent reste à son affectation par défaut."
      />
      <div className="flex gap-2">
        <Liste value={statut} onChange={(e) => setStatut(e.target.value)} vide="Toutes" options={Object.entries(STATUTS).map(([k, v]) => ({ valeur: k, libelle: v.libelle }))} />
      </div>
      {erreur && <Alerte>{erreur}</Alerte>}
      <Carte>
        {!donnees ? (
          <Chargement />
        ) : !donnees.length ? (
          <Vide>Aucune recommandation.</Vide>
        ) : (
          <Tableau>
            <thead>
              <tr>
                <th>Date</th>
                <th>Agent</th>
                <th>Affectation par défaut</th>
                <th>Proposition</th>
                <th>Origine / motif</th>
                <th>Statut</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {donnees.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap text-xs">
                    {dateCourte(r.creeLe)}
                    <div className="text-zinc-500">{r.soumisPar}</div>
                  </td>
                  <td>
                    <div className="font-medium">{r.affectation.agent.nomComplet}</div>
                    <div className="text-xs text-zinc-500">
                      {r.affectation.agent.diplomeBrut} · {r.affectation.derive.grade} · {libelleLot(r.affectation.agent.lotPublication)}
                    </div>
                  </td>
                  <td className="text-xs">
                    {libType(r.avant?.typeNote)}
                    <div>{r.departementAvant ?? "—"}</div>
                  </td>
                  <td className="text-xs font-medium text-sky-800">
                    {r.typeNote && <div>Note : {libType(r.typeNote)}</div>}
                    {r.departementPropose && <div>Département : {r.departementPropose}</div>}
                    {r.structure && <div>Structure : {r.structure}</div>}
                    {r.etablissement && <div>Établissement : {r.etablissement}</div>}
                  </td>
                  <td className="max-w-64 text-xs">
                    <div className="font-medium">{r.origine}</div>
                    {r.motif && <div className="text-zinc-600">{r.motif}</div>}
                  </td>
                  <td className="text-xs">
                    <Badge ton={STATUTS[r.statut].ton}>{STATUTS[r.statut].libelle}</Badge>
                    {r.decidePar && (
                      <div className="mt-1 text-zinc-500">
                        {r.decidePar} – {dateCourte(r.dateDecision)}
                        {r.commentaireDecision && <div>« {r.commentaireDecision} »</div>}
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap">
                    {r.statut === "EN_ATTENTE" && peut.decider(profil.role) && (
                      <div className="flex gap-1">
                        <Bouton variante="principal" onClick={() => setDecision({ r, d: "VALIDEE" })}>Valider</Bouton>
                        <Bouton variante="danger" onClick={() => setDecision({ r, d: "REJETEE" })}>Rejeter</Bouton>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Tableau>
        )}
      </Carte>
      {decision && (
        <Decision
          {...decision}
          fermer={() => setDecision(null)}
          apres={() => {
            setDecision(null);
            recharger();
          }}
        />
      )}
    </div>
  );
}

function Decision({ r, d, fermer, apres }: { r: Recommandation; d: "VALIDEE" | "REJETEE"; fermer: () => void; apres: () => void }) {
  const { refs } = useSession();
  const libType = (c?: string | null) => refs.typesNote.find((t) => t.code === c)?.libelle ?? c ?? "—";
  const [commentaire, setCommentaire] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  async function ok() {
    try {
      await api.post(`/recommandations/${r.id}/decision`, { decision: d, commentaire });
      apres();
    } catch (e) {
      setErreur((e as Error).message);
    }
  }
  return (
    <Modale titre={`${d === "VALIDEE" ? "Valider" : "Rejeter"} la recommandation`} ouverte fermer={fermer}>
      <div className="space-y-3">
        {erreur && <Alerte>{erreur}</Alerte>}
        <p className="text-sm">
          {r.affectation.agent.nomComplet} — origine : <strong>{r.origine}</strong>
        </p>
        <div className="rounded-2xl bg-zinc-50 px-4 py-3 text-[13px]">
          <div className="text-zinc-500">
            {d === "VALIDEE" ? "En confirmant, la personne passe de" : "En rejetant, la personne reste à"} : <strong className="text-encre">{r.departementAvant ?? "—"}</strong>
          </div>
          {d === "VALIDEE" && (
            <div className="mt-1 font-medium text-sky-800">
              à :{" "}
              {[r.departementPropose && `département ${r.departementPropose}`, r.typeNote && `note ${libType(r.typeNote)}`, r.structure, r.etablissement]
                .filter(Boolean)
                .join(" · ")}
              <div className="text-[12px] font-normal text-zinc-500">Les notes pas encore validées sont mises à jour aussitôt.</div>
            </div>
          )}
        </div>
        <Zone placeholder="Commentaire (facultatif)" value={commentaire} onChange={(e) => setCommentaire(e.target.value)} className="w-full" />
        <div className="flex justify-end gap-2">
          <Bouton onClick={fermer}>Annuler</Bouton>
          <Bouton variante={d === "VALIDEE" ? "principal" : "danger"} onClick={ok}>
            Confirmer
          </Bouton>
        </div>
      </div>
    </Modale>
  );
}
