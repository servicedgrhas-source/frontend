"use client";

import { useParams } from "next/navigation";
import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { StyleImpressionA4 } from "@/components/pages-a4";
import { Alerte, Bouton, Chargement } from "@/components/ui";
import { lireSession, useApi } from "@/lib/api";
import { CYCLES, dateCourte, duree } from "@/lib/libelles";
import type { DemandeMutation, Referentiels } from "@/lib/types";

const SEP = <div className="leading-none">-------------------</div>;
const AVIS: Record<string, string> = { FAVORABLE: "Favorable", DEFAVORABLE: "Défavorable" };

/**
 * Fiche individuelle d'une demande de mutation, sur une page A4. En attendant le
 * modèle officiel de la DGRHAS, elle reprend l'en-tête des autres documents.
 * L'origine du dossier (information interne) n'y figure pas.
 */
export function ImpressionFicheMutation() {
  const { id } = useParams<{ id: string }>();
  const { donnees: d, erreur } = useApi<DemandeMutation>(`/mutations/${id}`);
  const refs = useApi<Referentiels>("/referentiels");
  const params = useApi<{ cle: string; valeur: string }[]>("/parametres");
  const [aujourdhui] = useState(() => Date.now());
  const page1 = useRef<HTMLDivElement>(null);
  const [deuxPages, setDeuxPages] = useState(false);

  useEffect(() => {
    if (!lireSession().jeton) window.location.href = "/connexion";
  }, []);
  useEffect(() => {
    if (d) document.title = `Fiche de mutation n° ${d.numeroEnregistrement} - ${d.nomComplet}`;
  }, [d]);
  // Le contenu dépasse-t-il le bas de page ? Alors la fin de la fiche passe sur une 2e page
  useLayoutEffect(() => {
    const page = page1.current;
    if (!page || deuxPages) return;
    const pied = page.querySelector(".pied-a4")?.getBoundingClientRect();
    const bas = Math.max(...[...page.children].filter((x) => !x.classList.contains("pied-a4")).map((x) => x.getBoundingClientRect().bottom));
    if (pied && bas > pied.top - 4) setDeuxPages(true);
  }, [d, params.donnees, refs.donnees, deuxPages]);

  if (erreur) return <div className="p-6"><Alerte>{erreur}</Alerte></div>;
  if (!d) return <Chargement />;

  const p = (cle: string, defaut: string) => params.donnees?.find((x) => x.cle === cle)?.valeur ?? defaut;
  // Année des mutations si elle est réglée, sinon l'année générale
  const annee = p("ANNEE_SCOLAIRE_MUTATION", "") || p("ANNEE_SCOLAIRE", "");
  const lieu = p("LIEU_SIGNATURE", "Brazzaville");
  const motif = refs.donnees?.motifs.find((m) => m.code === d.motif)?.libelle ?? d.motif;
  const cycle = [d.cycle && CYCLES[d.cycle], d.specialite && d.specialite !== CYCLES[d.cycle ?? ""] ? d.specialite : null].filter(Boolean).join(" – ");
  const decision =
    d.decision === "ACCORDEE" || d.instructionMinistre === "ACCORDEE"
      ? "Prestation accordée"
      : d.decision === "REJETEE" || d.instructionMinistre === "REFUSEE"
        ? "Prestation rejetée"
        : d.decision === "EN_INSTANCE"
          ? "Prestation en instance"
          : "En cours de traitement";
  const circuit = d.circuit ?? [];
  const bureau = circuit.find((e) => e.type === "BUREAU_DGRHAS");
  const service = circuit.find((e) => e.type === "SERVICE_DGRHAS");
  const direction = circuit.find((e) => e.type === "DIRECTION_DGRHAS");
  const dg = circuit.find((e) => e.type === "DGRHAS");
  const intitule = (e?: { nom: string; sigle: string }) => (e ? (e.nom.includes("à compléter") ? e.sigle : e.nom).toUpperCase() : null);
  // Date automatique : celle de la décision, sinon aujourd'hui
  const date = new Date(d.decisionLe ?? aujourdhui).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const signataire = p("DG_NOM", "") || dg?.visaPar || "";
  const fin = (
    <>
          <Section titre="4. Avis dans l’ordre hiérarchique et décision">
            <table className="w-full text-[9.5pt]">
              <thead>
                <tr>
                  <th className="w-[26%]">Niveau</th>
                  <th className="w-[22%]">Visa</th>
                  <th className="w-[14%]">Avis</th>
                  <th>Motivation</th>
                </tr>
              </thead>
              <tbody>
                {circuit.length ? (
                  circuit.map((e, i) => (
                    <tr key={i}>
                      <td>
                        {/* Les services de la DGRHAS en toutes lettres (« Service de recrutement » et non « SR ») ; ailleurs le sigle, plus court */}
                        <strong>{e.type === "SERVICE_DGRHAS" && !e.nom.includes("à compléter") ? e.nom : e.sigle}</strong>
                        {e.phase === "INTERNE" ? " (DGRHAS)" : ""}
                      </td>
                      <td>{e.sautee ? "—" : e.visaLe ? `${new Date(e.visaLe).toLocaleDateString("fr-FR")}${e.visaPar ? ` · ${e.visaPar}` : ""}` : "En attente"}</td>
                      <td>{e.sautee ? "Sans avis" : e.avis === "FAVORABLE" ? "Favorable" : e.avis === "REJET" ? "Rejet" : "—"}</td>
                      <td>{e.sautee ?? e.motivation ?? ""}</td>
                    </tr>
                  ))
                ) : (
                  <>
                    <tr>
                      <td>Directeur départemental (DDEPPSA)</td>
                      <td />
                      <td>{d.avisDdeppsa ? AVIS[d.avisDdeppsa] : "—"}</td>
                      <td>{d.avisDdeppsaCommentaire ?? ""}</td>
                    </tr>
                    <tr>
                      <td>DGRHAS</td>
                      <td />
                      <td>{d.avisDgrhas ? AVIS[d.avisDgrhas] : "—"}</td>
                      <td>{d.avisDgrhasCommentaire ?? ""}</td>
                    </tr>
                  </>
                )}
                <tr>
                  <td>
                    <strong>Décision</strong>
                  </td>
                  <td colSpan={2}>
                    <strong>{decision}</strong>
                  </td>
                  <td>{d.decisionMotivation ?? d.instructionCommentaire ?? ""}</td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* Seule la signature du Directeur général figure au bas de la fiche (demande du DG, 21/10/2026) */}
          <div className="mt-5 flex justify-end text-[10.5pt]">
            <div className="w-[48%] text-center">
              <div>
                Fait à {lieu}, le {date}
              </div>
              <div className="mt-3 font-bold">{p("DG_TITRE", "Le Directeur général,")}</div>
              <div className="mt-16 font-bold">{signataire}</div>
            </div>
          </div>
    </>
  );

  return (
    <div className="min-h-screen bg-zinc-200 py-6 print:bg-white print:py-0">
      <StyleImpressionA4 />
      <div className="no-print mx-auto mb-4 flex w-[210mm] items-center justify-between">
        <span className="text-sm text-zinc-700">Fiche individuelle — demande n° {d.numeroEnregistrement}</span>
        <Bouton variante="principal" onClick={() => window.print()}>
          Imprimer / Enregistrer en PDF
        </Bouton>
      </div>

      <div ref={page1} className="page-a4 feuille-liste" style={{ "--marge-haut": "12mm", "--marge-cote": "16mm" } as React.CSSProperties}>
        {/* En-tête */}
        <div className="flex justify-between text-[8.5pt]">
          <div className="w-[58%] text-center font-bold leading-tight">
            <div>MINISTERE DE L’ENSEIGNEMENT PRESCOLAIRE, PRIMAIRE,</div>
            <div>SECONDAIRE ET DE L’ALPHABETISATION</div>
            {SEP}
            <div>CABINET</div>
            {SEP}
            <div>DIRECTION GENERALE DES RESSOURCES HUMAINES</div>
            <div>ET DE L’ADMINISTRATION SCOLAIRE</div>
            {SEP}
            {/* Jusqu'au bureau qui traite le dossier */}
            {[direction, service, bureau].filter(Boolean).map((e) => (
              <div key={e!.sigle}>
                <div>{intitule(e)}</div>
                {SEP}
              </div>
            ))}
          </div>
          <div className="w-[34%] text-center leading-tight">
            <div className="font-bold">REPUBLIQUE DU CONGO</div>
            <div className="font-semibold">Unité-Travail-Progrès</div>
            {SEP}
          </div>
        </div>

        <div className="mt-5 mb-4 space-y-1 text-center">
          <div className="text-[14pt] font-bold">FICHE INDIVIDUELLE DE DEMANDE DE MUTATION</div>
          {annee && <div className="text-[11pt] font-semibold">Année scolaire {annee}</div>}
          <div className="text-[10pt]">
            Demande n° {d.numeroEnregistrement}
            {d.dateEnregistrement && ` enregistrée le ${dateCourte(d.dateEnregistrement)}`}
          </div>
          {d.retiree && <div className="text-[10pt] font-bold">DEMANDE RETIRÉE{d.motifRetrait ? ` : ${d.motifRetrait}` : ""}</div>}
        </div>

        <Section titre="1. Identification de l’agent">
          <Ligne l="Nom et prénoms">
            <strong>{d.nomComplet}</strong>
          </Ligne>
          <Ligne l="Genre">{d.genre === "F" ? "Féminin" : "Masculin"}</Ligne>
          <Ligne l="Grade / échelon">{[d.grade, d.echelon].filter((x) => x !== null).join(" ") || "—"}</Ligne>
          <Ligne l="Matricule solde">{d.matricule ?? "—"}</Ligne>
          <Ligne l="Type">{d.typeAgent === "FINALISTE" ? "Finaliste" : "Fonctionnaire"}</Ligne>
          <Ligne l="Statut">{d.statutAgent === "ENSEIGNANT" ? (d.genre === "F" ? "Enseignante active" : "Enseignant actif") : "Personnel administratif"}</Ligne>
          <Ligne l="Cycle / spécialité">{cycle || "—"}</Ligne>
        </Section>

        <Section titre="2. Situation actuelle">
          <Ligne l="Département d’origine">{d.departementOrigine?.nom ?? "—"}</Ligne>
          <Ligne l="Lieu de service">{d.lieuService ?? "—"}</Ligne>
          <Ligne l="Date de prise de service">{d.datePriseService ? dateCourte(d.datePriseService) : "—"}</Ligne>
          <Ligne l="Durée dans le poste">{duree(d.dureeMoisCalculee)}</Ligne>
        </Section>

        <Section titre="3. Mutation demandée">
          <Ligne l="Département sollicité">
            <strong>{d.departementSollicite?.nom ?? "—"}</strong>
          </Ligne>
          <Ligne l="Lieu sollicité">{d.lieuSollicite ?? "—"}</Ligne>
          <Ligne l="Motif">{motif}</Ligne>
          {d.permutant && <Ligne l="Permutation avec">{d.permutant.nomComplet}</Ligne>}
          <Ligne l="Justificatif">{d.justificatif ?? "Pièces jointes"}</Ligne>
          {d.observation && <Ligne l="Observation">{d.observation}</Ligne>}
        </Section>

        {!deuxPages && fin}
        <div className="pied-a4" style={{ left: "16mm", right: "16mm" }}>
          <span>Mutation n° {d.numeroEnregistrement} / {motif}</span>
          <span className="text-center">Page 1 sur {deuxPages ? 2 : 1}</span>
          <span className="text-right">MEPPSA {annee ? annee.slice(0, 4) : new Date().getFullYear()}</span>
        </div>
      </div>
      {/* Circuit long : l'avis de chaque niveau et la signature passent sur une deuxième page, rien n'est coupé */}
      {deuxPages && (
        <div className="page-a4 feuille-liste" style={{ "--marge-haut": "14mm", "--marge-cote": "16mm" } as React.CSSProperties}>
          {fin}
          <div className="pied-a4" style={{ left: "16mm", right: "16mm" }}>
            <span>Mutation n° {d.numeroEnregistrement} / {motif}</span>
            <span className="text-center">Page 2 sur 2</span>
            <span className="text-right">MEPPSA {annee ? annee.slice(0, 4) : new Date().getFullYear()}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <div className="mb-3">
      <div className="mb-1.5 bg-zinc-100 px-2 py-1 text-[10.5pt] font-bold print:bg-zinc-100">{titre}</div>
      <div className="px-2">{children}</div>
    </div>
  );
}

function Ligne({ l, children }: { l: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[52mm_1fr] gap-3 py-px text-[10pt]">
      <span className="text-zinc-700">{l}</span>
      <span>{children}</span>
    </div>
  );
}
