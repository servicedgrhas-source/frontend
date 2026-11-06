"use client";

import Link from "next/link";
import { useState } from "react";
import { type Enrole, FicheEnrole } from "@/components/enrolement/commun";
import { FicheDossier } from "@/components/fiche-dossier";
import { useSession } from "@/components/session";
import { Alerte, Badge, Bouton, Carte, Chargement, EnTete, Liste, Modale, Saisie, Segments, Tableau, Vide, Zone } from "@/components/ui";
import { api, qs, useApi } from "@/lib/api";
import { dateCourte, libelleLot, peut } from "@/lib/libelles";
import { useParametreUrl } from "@/lib/url";
import type { Recommandation } from "@/lib/types";

const STATUTS = {
  EN_ATTENTE: { libelle: "En attente", ton: "jaune" as const },
  VALIDEE: { libelle: "Validée", ton: "vert" as const },
  REJETEE: { libelle: "Rejetée", ton: "rouge" as const },
};
/** Notes de l'enrôlement (recommandation d'une autre note). */
const NOTES_ENROLEMENT: Record<string, string> = {
  BET: "Note du préscolaire",
  CFEEN: "Note du primaire",
  DEMA: "Note du collège (DEMA)",
  LICENCE: "Note du collège (licence, CAP-CEG)",
  MASTER: "Note du lycée",
  DCAF: "Note de l’administration (DCAF)",
};
const OPERATIONS: Record<string, string> = { AFFECTATION: "Affectation", MUTATION: "Mutation", ENROLEMENT: "Enrôlement" };

/** Texte sans accents ni majuscules, pour la recherche. */
const plat = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

/**
 * Recommandations de toutes les opérations (affectations, mutations, enrôlements) : elles changent ce
 * que la règle donne. Le chef de service propose, le directeur donne son avis, le DG décide.
 */
export function RecommandationsVue({ operationFixe }: { operationFixe?: "AFFECTATION" | "MUTATION" | "ENROLEMENT" }) {
  const { profil, refs } = useSession();
  const [statut, setStatut] = useState("EN_ATTENTE");
  // ?operation=AFFECTATION : ouvert depuis le traitement des affectations
  const operationUrl = useParametreUrl("operation");
  const [operationChoisie, setOperation] = useState<string | null>(null);
  const operation = operationFixe ?? operationChoisie ?? (operationUrl && operationUrl in OPERATIONS ? operationUrl : "");
  const { donnees, erreur, recharger } = useApi<Recommandation[]>(`/recommandations${qs({ statut, operation })}`);
  // Combien par opération, pour le statut choisi (DG, 01/11/2026)
  const toutes = useApi<Recommandation[]>(`/recommandations${qs({ statut })}`);
  const compte = (op: string) => (toutes.donnees ?? []).filter((r) => !op || r.operation === op).length;
  // Plus d'informations sur la personne : sa fiche (affectation) ou son dossier d'enrôlement
  const [ficheAgent, setFicheAgent] = useState<string | null>(null);
  const [ficheEnrole, setFicheEnrole] = useState<Enrole | null>(null);
  const [erreurFiche, setErreurFiche] = useState<string | null>(null);
  const ouvrirEnrole = (id: string) =>
    api
      .get<Enrole>(`/enrolement/dossiers/${id}/fiche`)
      .then(setFicheEnrole)
      .catch((e: Error) => setErreurFiche(e.message));
  const [decision, setDecision] = useState<{ r: Recommandation; d: "VALIDEE" | "REJETEE" } | null>(null);
  const [avis, setAvis] = useState<{ r: Recommandation; a: "FAVORABLE" | "DEFAVORABLE" } | null>(null);
  // Enrôlement : les notes du préscolaire, du primaire, du collège, du lycée (06/11/2026)
  const libType = (c?: string | null, op?: string) =>
    (op === "ENROLEMENT" ? NOTES_ENROLEMENT[c ?? ""] : op === "MUTATION" ? refs.motifs.find((m) => m.code === c)?.libelle : undefined) ??
    refs.typesNote.find((t) => t.code === c)?.libelle ??
    c ??
    "—";
  const directeur = profil.role === "DIRECTEUR" || profil.role === "ADMIN";
  // Décision groupée (DG, 01/11/2026) : cocher des dossiers, puis les valider ou les rejeter ensemble
  const decideur = peut.decider(profil.role);
  const [cochees, setCochees] = useState<string[]>([]);
  const [groupe, setGroupe] = useState<"VALIDEE" | "REJETEE" | null>(null);
  const aMonAvis = (donnees ?? []).filter((r) => r.statut === "EN_ATTENTE" && r.etape === "AVIS_DIRECTEUR").length;
  // Recherche (DG, 31/10/2026) : personne, diplôme, lot, départements, établissement, origine, motif…
  const [recherche, setRecherche] = useState("");
  const mots = plat(recherche).split(/\s+/).filter(Boolean);
  const trouve = (r: Recommandation) => {
    const texte = plat(
      [
        nomDe(r),
        r.affectation?.agent.diplomeBrut,
        r.affectation?.derive.grade,
        r.affectation ? libelleLot(r.affectation.agent.lotPublication) : null,
        OPERATIONS[r.operation],
        r.departementAvant,
        r.departementPropose,
        r.avant?.etablissement,
        r.etablissement,
        r.structure,
        r.typeNote ? libType(r.typeNote) : null,
        r.origine,
        r.motif,
        r.soumisPar,
        r.decidePar,
        r.commentaireDecision,
      ]
        .filter(Boolean)
        .join(" "),
    );
    return mots.every((m) => texte.includes(m));
  };
  const affichees = donnees ? (mots.length ? donnees.filter(trouve) : donnees) : null;
  // Seules les recommandations en attente se décident ; les cases suivent la liste affichée
  const cochables = (affichees ?? []).filter((r) => r.statut === "EN_ATTENTE");
  const choisies = cochables.filter((r) => cochees.includes(r.id));
  const toutCoche = cochables.length > 0 && choisies.length === cochables.length;
  const basculer = (id: string) => setCochees((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));

  return (
    <div className="space-y-4">
      <EnTete
        titre={operationFixe === "ENROLEMENT" ? "Recommandations de l’enrôlement" : operationFixe === "MUTATION" ? "Recommandations des mutations" : "Recommandations"}
        sousTitre={operationFixe === "MUTATION" ? "Une recommandation change ce qui a été demandé : autre département, autre lieu, ou autre motif (et donc une autre note de mutation). On la propose depuis la fiche de la demande (bouton « Recommander ») ; le directeur donne son avis, le DG décide. Validée, elle s’applique à la demande et ressort sur la note. L’accord de la mutation reste celui du Ministre." : operationFixe === "ENROLEMENT" ? "Une recommandation change ce que la règle donne à un volontaire : autre département, autre établissement, autre note (un instituteur dans la note du collège…) avec sa spécialité. Le chef de service la propose (depuis la saisie ou la base des enrôlés), le directeur donne son avis, le DG décide. Validée, elle s’applique au dossier, le fait retenir s’il ne l’était pas, et ressort sur la note." : "Une recommandation change ce que la règle donne naturellement (autre département, autre établissement ou lieu), pour une affectation, une mutation ou un enrôlement. Le chef de service la propose, le directeur donne son avis, le DG décide. Validée, elle s’applique au dossier et ressort sur la note ; sans validation, la règle s’applique."}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Saisie
          className="w-80"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher : nom, département, établissement, motif…"
          aria-label="Rechercher une recommandation"
        />
        <Liste value={statut} onChange={(e) => setStatut(e.target.value)} vide="Toutes" options={Object.entries(STATUTS).map(([k, v]) => ({ valeur: k, libelle: v.libelle }))} className="w-48" />
        {!operationFixe && (
        <Segments
          valeur={operation}
          changer={setOperation}
          options={[
            { valeur: "", libelle: `Toutes les opérations${toutes.donnees ? ` (${compte("")})` : ""}` },
            ...Object.entries(OPERATIONS).map(([k, v]) => ({ valeur: k, libelle: `${v}${toutes.donnees ? ` (${compte(k)})` : ""}` })),
          ]}
        />
        )}
      </div>
      {mots.length > 0 && donnees && (
        <p className="text-[12px] text-zinc-500">
          {affichees?.length ?? 0} résultat(s) sur {donnees.length}
          <button type="button" className="ml-2 text-marque-700 underline" onClick={() => setRecherche("")}>
            Effacer
          </button>
        </p>
      )}
      {decideur && choisies.length > 0 && (
        <div className="sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-2xl bg-nuit px-4 py-3 text-[13px] text-white shadow-doux">
          <strong>{choisies.length} recommandation(s) cochée(s)</strong>
          <span className="text-white/60">sur {cochables.length} en attente dans la liste</span>
          <span className="ml-auto flex flex-wrap gap-2">
            <Bouton variante="principal" onClick={() => setGroupe("VALIDEE")}>
              Valider la sélection
            </Bouton>
            <Bouton variante="danger" onClick={() => setGroupe("REJETEE")}>
              Rejeter la sélection
            </Bouton>
            <Bouton onClick={() => setCochees([])}>Tout décocher</Bouton>
          </span>
        </div>
      )}
      {directeur && aMonAvis > 0 && <Alerte ton="jaune">{aMonAvis} recommandation(s) attendent votre avis avant la décision du DG.</Alerte>}
      {erreur && <Alerte>{erreur}</Alerte>}
      {erreurFiche && <Alerte>{erreurFiche}</Alerte>}
      <Carte>
        {!affichees ? (
          <Chargement />
        ) : !affichees.length ? (
          <Vide>{mots.length ? `Aucune recommandation ne correspond à « ${recherche} ».` : "Aucune recommandation."}</Vide>
        ) : (
          <Tableau>
            <thead>
              <tr>
                {decideur && (
                  <th className="w-8">
                    <input
                      type="checkbox"
                      aria-label="Tout cocher"
                      title="Tout cocher (recommandations en attente de la liste)"
                      disabled={!cochables.length}
                      checked={toutCoche}
                      onChange={() => setCochees(toutCoche ? [] : cochables.map((r) => r.id))}
                    />
                  </th>
                )}
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
              {affichees.map((r) => (
                <tr key={r.id} className={cochees.includes(r.id) ? "bg-marque-50/60" : undefined}>
                  {decideur && (
                    <td>
                      {r.statut === "EN_ATTENTE" && (
                        <input type="checkbox" aria-label={`Cocher la recommandation de ${nomDe(r)}`} checked={cochees.includes(r.id)} onChange={() => basculer(r.id)} />
                      )}
                    </td>
                  )}
                  <td className="whitespace-nowrap text-xs">
                    {dateCourte(r.creeLe)}
                    <div className="text-zinc-500">{r.soumisPar}</div>
                  </td>
                  <td>
                    <Badge ton="gris">{OPERATIONS[r.operation] ?? r.operation}</Badge>
                    {r.affectation ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setFicheAgent(r.affectation!.agentId)}
                          title="Voir toute la fiche"
                          className="block cursor-pointer text-left font-medium hover:text-marque-700 hover:underline"
                        >
                          {r.affectation.agent.nomComplet}
                        </button>
                        <div className="text-xs text-zinc-500">
                          {r.affectation.agent.diplomeBrut} · {r.affectation.derive.grade} · {libelleLot(r.affectation.agent.lotPublication)}
                        </div>
                      </>
                    ) : r.demandeId ? (
                      <Link href={`/mutation/${r.demandeId}`} className="block font-medium text-marque-700 hover:underline">
                        {r.personne}
                      </Link>
                    ) : r.enroleId ? (
                      <button
                        type="button"
                        onClick={() => ouvrirEnrole(r.enroleId!)}
                        title="Voir le dossier d’enrôlement"
                        className="block cursor-pointer text-left font-medium hover:text-marque-700 hover:underline"
                      >
                        {r.personne}
                      </button>
                    ) : (
                      <div className="font-medium">{r.personne}</div>
                    )}
                  </td>
                  <td className="text-xs">
                    {r.avant?.typeNote && <div>{r.operation === "MUTATION" ? "Motif : " : ""}{libType(r.avant.typeNote, r.operation)}</div>}
                    {r.operation === "ENROLEMENT" && r.typeNote && <div className="text-zinc-500">Spécialité : {r.avant?.specialite || "aucune"}</div>}
                    <div>{r.departementAvant ?? "—"}</div>
                    {r.operation !== "AFFECTATION" && r.avant?.etablissement && <div>{r.avant.etablissement}</div>}
                  </td>
                  <td className="text-xs font-medium text-sky-800">
                    {r.typeNote && <div>{r.operation === "MUTATION" ? "Motif" : "Note"} : {libType(r.typeNote, r.operation)}</div>}
                    {r.specialite && <div>Spécialité : {r.specialite}</div>}
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
      {groupe && (
        <DecisionGroupee
          liste={choisies}
          d={groupe}
          fermer={() => setGroupe(null)}
          apres={() => {
            setGroupe(null);
            setCochees([]);
            recharger();
            toutes.recharger();
          }}
        />
      )}
      {ficheAgent && <FicheDossier id={ficheAgent} fermer={() => setFicheAgent(null)} />}
      {ficheEnrole && <FicheEnrole e={ficheEnrole} fermer={() => setFicheEnrole(null)} />}
      {decision && (
        <Decision
          {...decision}
          fermer={() => setDecision(null)}
          apres={() => {
            setDecision(null);
            recharger();
            toutes.recharger();
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
            toutes.recharger();
          }}
        />
      )}
    </div>
  );
}

const nomDe = (r: Recommandation) => r.affectation?.agent.nomComplet ?? r.personne ?? "";

/**
 * Décision du DG sur plusieurs recommandations cochées : chacune passe par la même décision que
 * seule (contrôles, mise à jour du dossier, journal), l'une après l'autre.
 */
function DecisionGroupee({ liste, d, fermer, apres }: { liste: Recommandation[]; d: "VALIDEE" | "REJETEE"; fermer: () => void; apres: () => void }) {
  const [commentaire, setCommentaire] = useState("");
  const [encours, setEncours] = useState<number | null>(null);
  const [bilan, setBilan] = useState<{ ok: number; refus: { nom: string; raison: string }[] } | null>(null);
  const sansAvis = liste.filter((r) => r.etape === "AVIS_DIRECTEUR").length;
  const manque = sansAvis > 0 && commentaire.trim().length < 3;
  async function lancer() {
    let ok = 0;
    const refus: { nom: string; raison: string }[] = [];
    for (const [i, r] of liste.entries()) {
      setEncours(i + 1);
      try {
        await api.post(`/recommandations/${r.id}/decision`, { decision: d, commentaire });
        ok++;
      } catch (e) {
        refus.push({ nom: nomDe(r), raison: (e as Error).message });
      }
    }
    setEncours(null);
    setBilan({ ok, refus });
  }
  const valider = d === "VALIDEE";
  if (bilan)
    return (
      <Modale titre={valider ? "Validation terminée" : "Rejet terminé"} ouverte fermer={apres}>
        <div className="space-y-3 text-[13px]">
          <Alerte ton={bilan.refus.length ? "jaune" : "vert"}>
            {bilan.ok} recommandation(s) {valider ? "validée(s) : les dossiers sont mis à jour" : "rejetée(s) : la règle s’applique"}.
            {bilan.refus.length > 0 && ` ${bilan.refus.length} n’ont pas pu l’être.`}
          </Alerte>
          {bilan.refus.length > 0 && (
            <ul className="max-h-60 space-y-1 overflow-auto">
              {bilan.refus.map((x) => (
                <li key={x.nom} className="rounded-xl bg-zinc-50 px-3 py-2">
                  <strong>{x.nom}</strong> <span className="text-zinc-500">— {x.raison}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="flex justify-end">
            <Bouton variante="principal" onClick={apres}>
              Fermer
            </Bouton>
          </div>
        </div>
      </Modale>
    );
  return (
    <Modale titre={`${valider ? "Valider" : "Rejeter"} ${liste.length} recommandation(s) ?`} ouverte fermer={encours ? () => undefined : fermer}>
      <div className="space-y-3 text-[13px] leading-relaxed text-zinc-600">
        <p>
          {valider
            ? "Chaque dossier prend ce qui est proposé (département, note, établissement…), comme pour une validation une par une ; les notes pas encore validées en tiennent compte."
            : "Pour chaque dossier, la règle s’applique : rien ne change."}
        </p>
        <ul className="max-h-52 space-y-1 overflow-auto">
          {liste.map((r) => (
            <li key={r.id} className="flex flex-wrap gap-x-2 rounded-xl bg-zinc-50 px-3 py-1.5">
              <strong className="text-encre">{nomDe(r)}</strong>
              <span className="text-zinc-500">
                {OPERATIONS[r.operation] ?? r.operation} · {r.departementAvant ?? "—"} →{" "}
                {[r.departementPropose, r.structure, r.etablissement].filter(Boolean).join(" · ") || "—"}
                {r.etape === "AVIS_DIRECTEUR" ? " · sans l’avis du directeur" : ""}
              </span>
            </li>
          ))}
        </ul>
        {sansAvis > 0 && (
          <Alerte ton="jaune">
            {sansAvis} n’ont pas encore l’avis du directeur : écrivez pourquoi vous décidez sans lui (le commentaire vaut pour toutes).
          </Alerte>
        )}
        <Zone
          placeholder={sansAvis ? "Pourquoi vous décidez sans l’avis du directeur (obligatoire)" : "Commentaire (facultatif, le même pour toutes)"}
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
          className="w-full"
        />
        <div className="flex items-center justify-end gap-2">
          {encours && (
            <span className="mr-auto text-[12px] text-zinc-500">
              {valider ? "Validation" : "Rejet"} en cours… {encours} / {liste.length}
            </span>
          )}
          <Bouton onClick={fermer} disabled={!!encours}>
            Annuler
          </Bouton>
          <Bouton variante={valider ? "principal" : "danger"} disabled={manque || !!encours} onClick={lancer}>
            {valider ? `Valider les ${liste.length}` : `Rejeter les ${liste.length}`}
          </Bouton>
        </div>
      </div>
    </Modale>
  );
}

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
  // Mutation : le motif ; enrôlement : la note du cycle ; affectation : le type de note
  const libType = (c?: string | null) =>
    (r.operation === "MUTATION" ? refs.motifs.find((m) => m.code === c)?.libelle : r.operation === "ENROLEMENT" ? NOTES_ENROLEMENT[c ?? ""] : undefined) ??
    refs.typesNote.find((t) => t.code === c)?.libelle ??
    c ??
    "—";
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
            {d === "VALIDEE" ? "En confirmant, la personne passe de" : "En rejetant, la règle s’applique"} :{" "}
            <strong className="text-encre">
              {r.departementAvant ?? "—"}
              {r.operation === "MUTATION" && r.typeNote && r.avant?.typeNote ? ` · motif ${libType(r.avant.typeNote)}` : ""}
            </strong>
          </div>
          {d === "VALIDEE" && (
            <div className="mt-1 font-medium text-sky-800">
              à :{" "}
              {[r.departementPropose && `département ${r.departementPropose}`, r.typeNote && `${r.operation === "MUTATION" ? "motif" : "note"} ${libType(r.typeNote)}`, r.structure, r.etablissement].filter(Boolean).join(" · ")}
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
