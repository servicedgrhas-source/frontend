"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession } from "@/components/session";
import { Alerte, Badge, Bouton, Carte, Chargement, EnTete, Liste, Modale, Segments, Tableau, Vide, Zone } from "@/components/ui";
import { api, qs, useApi } from "@/lib/api";
import { dateCourte, libelleLot, peut } from "@/lib/libelles";
import type { Recommandation } from "@/lib/types";

const STATUTS = {
  EN_ATTENTE: { libelle: "En attente", ton: "jaune" as const },
  VALIDEE: { libelle: "Validée", ton: "vert" as const },
  REJETEE: { libelle: "Rejetée", ton: "rouge" as const },
};
const OPERATIONS: Record<string, string> = { AFFECTATION: "Affectation", MUTATION: "Mutation", ENROLEMENT: "Enrôlement" };

/**
 * Recommandations de toutes les opérations (affectations, mutations, enrôlements) : elles changent ce
 * que la règle donne. Le chef de service propose, le directeur donne son avis, le DG décide.
 */
export default function Recommandations() {
  const { profil, refs } = useSession();
  const [statut, setStatut] = useState("EN_ATTENTE");
  const [operation, setOperation] = useState("");
  const { donnees, erreur, recharger } = useApi<Recommandation[]>(`/recommandations${qs({ statut, operation })}`);
  const [decision, setDecision] = useState<{ r: Recommandation; d: "VALIDEE" | "REJETEE" } | null>(null);
  const [avis, setAvis] = useState<{ r: Recommandation; a: "FAVORABLE" | "DEFAVORABLE" } | null>(null);
  const libType = (c?: string | null) => refs.typesNote.find((t) => t.code === c)?.libelle ?? c ?? "—";
  const directeur = profil.role === "DIRECTEUR" || profil.role === "ADMIN";
  const aMonAvis = (donnees ?? []).filter((r) => r.statut === "EN_ATTENTE" && r.etape === "AVIS_DIRECTEUR").length;

  return (
    <div className="space-y-4">
      <EnTete
        titre="Recommandations"
        sousTitre="Une recommandation change ce que la règle donne naturellement (autre département, autre établissement ou lieu), pour une affectation, une mutation ou un enrôlement. Le chef de service la propose, le directeur donne son avis, le DG décide. Validée, elle s’applique au dossier et ressort sur la note ; sans validation, la règle s’applique."
      />
      <div className="flex flex-wrap items-center gap-2">
        <Liste value={statut} onChange={(e) => setStatut(e.target.value)} vide="Toutes" options={Object.entries(STATUTS).map(([k, v]) => ({ valeur: k, libelle: v.libelle }))} className="w-48" />
        <Segments
          valeur={operation}
          changer={setOperation}
          options={[{ valeur: "", libelle: "Toutes les opérations" }, ...Object.entries(OPERATIONS).map(([k, v]) => ({ valeur: k, libelle: v }))]}
        />
      </div>
      {directeur && aMonAvis > 0 && <Alerte ton="jaune">{aMonAvis} recommandation(s) attendent votre avis avant la décision du DG.</Alerte>}
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
                <th>Personne</th>
                <th>Selon la règle</th>
                <th>Proposition</th>
                <th>Origine / motif</th>
                <th>Où elle en est</th>
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
                    <Badge ton="gris">{OPERATIONS[r.operation] ?? r.operation}</Badge>
                    {r.affectation ? (
                      <>
                        <div className="font-medium">{r.affectation.agent.nomComplet}</div>
                        <div className="text-xs text-zinc-500">
                          {r.affectation.agent.diplomeBrut} · {r.affectation.derive.grade} · {libelleLot(r.affectation.agent.lotPublication)}
                        </div>
                      </>
                    ) : r.demandeId ? (
                      <Link href={`/mutation/${r.demandeId}`} className="block font-medium text-marque-700 hover:underline">
                        {r.personne}
                      </Link>
                    ) : (
                      <div className="font-medium">{r.personne}</div>
                    )}
                  </td>
                  <td className="text-xs">
                    {r.operation === "AFFECTATION" && libType(r.avant?.typeNote)}
                    <div>{r.departementAvant ?? "—"}</div>
                    {r.operation !== "AFFECTATION" && r.avant?.etablissement && <div>{r.avant.etablissement}</div>}
                  </td>
                  <td className="text-xs font-medium text-sky-800">
                    {r.typeNote && <div>Note : {libType(r.typeNote)}</div>}
                    {r.departementPropose && <div>Département : {r.departementPropose}</div>}
                    {r.structure && <div>Structure : {r.structure}</div>}
                    {r.etablissement && <div>{r.operation === "MUTATION" ? "Lieu" : "Établissement"} : {r.etablissement}</div>}
                  </td>
                  <td className="max-w-64 text-xs">
                    <div className="font-medium">{r.origine}</div>
                    {r.motif && <div className="text-zinc-600">{r.motif}</div>}
                  </td>
                  <td className="text-xs">
                    <Badge ton={STATUTS[r.statut].ton}>{r.statut === "EN_ATTENTE" ? (r.etape === "AVIS_DIRECTEUR" ? "Avis du directeur attendu" : "Décision du DG attendue") : STATUTS[r.statut].libelle}</Badge>
                    {r.avisDirecteur && (
                      <div className={`mt-1 ${r.avisDirecteur.avis === "FAVORABLE" ? "text-marque-700" : "text-rouge-600"}`}>
                        Directeur : {r.avisDirecteur.avis === "FAVORABLE" ? "favorable" : "défavorable"} ({r.avisDirecteur.par}) — « {r.avisDirecteur.motif} »
                      </div>
                    )}
                    {r.decidePar && (
                      <div className="mt-1 text-zinc-500">
                        DG : {r.decidePar} – {dateCourte(r.dateDecision)}
                        {r.commentaireDecision && <div>« {r.commentaireDecision} »</div>}
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap">
                    {r.statut === "EN_ATTENTE" && r.etape === "AVIS_DIRECTEUR" && directeur && (
                      <div className="mb-1 flex gap-1">
                        <Bouton onClick={() => setAvis({ r, a: "FAVORABLE" })}>Avis favorable</Bouton>
                        <Bouton variante="danger" onClick={() => setAvis({ r, a: "DEFAVORABLE" })}>
                          Défavorable
                        </Bouton>
                      </div>
                    )}
                    {r.statut === "EN_ATTENTE" && peut.decider(profil.role) && (
                      <div className="flex gap-1">
                        <Bouton variante="principal" onClick={() => setDecision({ r, d: "VALIDEE" })}>
                          Valider
                        </Bouton>
                        <Bouton variante="danger" onClick={() => setDecision({ r, d: "REJETEE" })}>
                          Rejeter
                        </Bouton>
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
      {avis && (
        <Avis
          {...avis}
          fermer={() => setAvis(null)}
          apres={() => {
            setAvis(null);
            recharger();
          }}
        />
      )}
    </div>
  );
}

const nomDe = (r: Recommandation) => r.affectation?.agent.nomComplet ?? r.personne ?? "";

function Avis({ r, a, fermer, apres }: { r: Recommandation; a: "FAVORABLE" | "DEFAVORABLE"; fermer: () => void; apres: () => void }) {
  const [motif, setMotif] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  return (
    <Modale titre={`Avis ${a === "FAVORABLE" ? "favorable" : "défavorable"} du directeur`} ouverte fermer={fermer}>
      <div className="space-y-3">
        {erreur && <Alerte>{erreur}</Alerte>}
        <p className="text-sm">
          {nomDe(r)} — origine : <strong>{r.origine}</strong>
        </p>
        <Zone placeholder="Motivation (obligatoire)" value={motif} onChange={(e) => setMotif(e.target.value)} className="w-full" />
        <p className="text-[12px] text-zinc-500">Votre avis est transmis au DG, qui décide.</p>
        <div className="flex justify-end gap-2">
          <Bouton onClick={fermer}>Annuler</Bouton>
          <Bouton
            variante={a === "FAVORABLE" ? "principal" : "danger"}
            onClick={async () => {
              try {
                await api.post(`/recommandations/${r.id}/avis`, { avis: a, motif });
                apres();
              } catch (e) {
                setErreur((e as Error).message);
              }
            }}
          >
            Donner l’avis
          </Bouton>
        </div>
      </div>
    </Modale>
  );
}

function Decision({ r, d, fermer, apres }: { r: Recommandation; d: "VALIDEE" | "REJETEE"; fermer: () => void; apres: () => void }) {
  const { refs } = useSession();
  const libType = (c?: string | null) => refs.typesNote.find((t) => t.code === c)?.libelle ?? c ?? "—";
  const [commentaire, setCommentaire] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const sansAvis = r.etape === "AVIS_DIRECTEUR";
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
          {nomDe(r)} ({OPERATIONS[r.operation]?.toLowerCase()}) — origine : <strong>{r.origine}</strong>
        </p>
        {r.avisDirecteur && (
          <p className="text-[12px] text-zinc-600">
            Avis du directeur : <strong>{r.avisDirecteur.avis === "FAVORABLE" ? "favorable" : "défavorable"}</strong> — « {r.avisDirecteur.motif} »
          </p>
        )}
        {sansAvis && <Alerte ton="jaune">Le directeur n’a pas encore donné son avis : vous pouvez décider seul, en écrivant pourquoi.</Alerte>}
        <div className="rounded-2xl bg-zinc-50 px-4 py-3 text-[13px]">
          <div className="text-zinc-500">
            {d === "VALIDEE" ? "En confirmant, la personne passe de" : "En rejetant, la règle s’applique"} : <strong className="text-encre">{r.departementAvant ?? "—"}</strong>
          </div>
          {d === "VALIDEE" && (
            <div className="mt-1 font-medium text-sky-800">
              à :{" "}
              {[r.departementPropose && `département ${r.departementPropose}`, r.typeNote && `note ${libType(r.typeNote)}`, r.structure, r.etablissement].filter(Boolean).join(" · ")}
              <div className="text-[12px] font-normal text-zinc-500">Le dossier est mis à jour aussitôt ; les notes pas encore validées en tiennent compte.</div>
            </div>
          )}
        </div>
        <Zone placeholder={sansAvis ? "Pourquoi vous décidez sans l’avis du directeur (obligatoire)" : "Commentaire (facultatif)"} value={commentaire} onChange={(e) => setCommentaire(e.target.value)} className="w-full" />
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
