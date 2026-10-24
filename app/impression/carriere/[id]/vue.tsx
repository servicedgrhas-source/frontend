"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { PagesA4, StyleImpressionA4, type Bloc, type Tableau } from "@/components/pages-a4";
import { dateFr, type DossierCarriere, GENRES } from "@/components/recensement/carriere";
import { Alerte, Bouton, Chargement } from "@/components/ui";
import { lireSession, useApi } from "@/lib/api";

const SEP = <div className="leading-none">-------------------</div>;

/**
 * Dossier de carrière imprimé (A4) : identité, situation actuelle, puis chaque étape de la carrière
 * avec son acte. C'est ce que le bureau du fichier verse au dossier de l'agent.
 */
export function ImpressionCarriere() {
  const { id } = useParams<{ id: string }>();
  const { donnees: d, erreur } = useApi<DossierCarriere>(`/recensement/agents/${id}/carriere`);
  useEffect(() => {
    if (!lireSession().jeton) window.location.href = "/connexion";
  }, []);
  useEffect(() => {
    if (d) document.title = `Dossier de carrière - ${d.agent.nomComplet}`;
  }, [d]);
  const contenu = useMemo(() => (d ? construire(d) : null), [d]);

  if (erreur)
    return (
      <div className="p-6">
        <Alerte>{erreur}</Alerte>
      </div>
    );
  if (!d || !contenu) return <Chargement />;
  return (
    <div className="min-h-screen bg-zinc-200 py-6 print:bg-white print:py-0">
      <StyleImpressionA4 />
      <div className="no-print mx-auto mb-4 flex w-[210mm] items-center justify-between">
        <span className="text-sm text-zinc-700">
          Dossier de carrière — {d.agent.nomComplet} ({d.elements.length} élément(s))
        </span>
        <Bouton variante="principal" onClick={() => window.print()}>
          Imprimer / Enregistrer en PDF
        </Bouton>
      </div>
      <PagesA4 blocs={contenu.blocs} tableaux={contenu.tableaux} pied={contenu.pied} classeFeuille="feuille-liste" margeCote={14} />
    </div>
  );
}

function construire(d: DossierCarriere) {
  const v = d.situation.valeurs;
  const val = (k: string) => v[k]?.valeur ?? "—";
  const ligne = (l: string, x: React.ReactNode) => (
    <div className="flex gap-2 py-0.5 text-[10pt]">
      <div className="w-[38%] text-zinc-700">{l}</div>
      <div className="flex-1 font-semibold">{x}</div>
    </div>
  );
  const tableaux: Record<string, Tableau> = {
    frise: {
      className: "text-[9pt]",
      colonnes: (
        <colgroup>
          <col style={{ width: "13%" }} />
          <col style={{ width: "14%" }} />
          <col style={{ width: "40%" }} />
          <col style={{ width: "33%" }} />
        </colgroup>
      ),
      entete: (
        <tr>
          <th>Date d’effet</th>
          <th>Nature</th>
          <th>Événement</th>
          <th>Acte</th>
        </tr>
      ),
    },
  };
  const blocs: Bloc[] = [
    {
      cle: "entete",
      type: "libre",
      garderAvecSuivant: true,
      contenu: (
        <>
          <div className="flex items-start justify-between gap-6 text-[9.5pt]">
            <div className="w-[58%] text-center font-bold leading-tight">
              <div>MINISTERE DE L’ENSEIGNEMENT PRESCOLAIRE, PRIMAIRE,</div>
              <div>SECONDAIRE ET DE L’ALPHABETISATION</div>
              {SEP}
              <div>CABINET</div>
              {SEP}
              <div>DIRECTION GENERALE DES RESSOURCES HUMAINES</div>
              <div>ET DE L’ADMINISTRATION SCOLAIRE</div>
              {SEP}
              <div>DIRECTION DES RECRUTEMENTS ET DU SUIVI DES CARRIERES</div>
              {SEP}
            </div>
            <div className="w-[34%] text-center leading-tight">
              <div className="font-bold">REPUBLIQUE DU CONGO</div>
              <div className="font-semibold">Unité-Travail-Progrès</div>
              {SEP}
            </div>
          </div>
          <div className="mt-6 mb-4 text-center">
            <div className="text-[14pt] font-bold">DOSSIER DE CARRIÈRE</div>
            <div className="text-[10pt]">Situation au {new Date().toLocaleDateString("fr-FR")}</div>
          </div>
        </>
      ),
    },
    {
      cle: "identite",
      type: "libre",
      contenu: (
        <div className="mb-3">
          <div className="mb-1 border-b border-black text-[10.5pt] font-bold">1. Identification</div>
          {ligne("Nom et prénoms", d.agent.nomComplet)}
          {ligne("Date de naissance", dateFr(d.agent.dateNaissance) || "—")}
          {ligne("Matricule solde", d.agent.matricule ?? "—")}
          {ligne("N° de fiche", d.agent.numeroFiche ?? "—")}
        </div>
      ),
    },
    {
      cle: "situation",
      type: "libre",
      contenu: (
        <div className="mb-3">
          <div className="mb-1 border-b border-black text-[10.5pt] font-bold">2. Situation actuelle</div>
          {ligne("Statut", d.agent.libelleStatut)}
          {ligne("Grade", val("GRADE"))}
          {ligne("Catégorie · échelle · échelon", [val("CATEGORIE"), val("ECHELLE"), val("ECHELON")].join(" · "))}
          {ligne(
            "Échelon depuis le",
            d.situation.echelonDepuis ? `${dateFr(d.situation.echelonDepuis)}${d.situation.prochainEchelon ? ` (prochain avancement : ${dateFr(d.situation.prochainEchelon)})` : ""}` : "—",
          )}
          {ligne("Fonction", val("FONCTION"))}
          {ligne("Lieu de service", val("LIEU_SERVICE"))}
          {ligne("Position", [v.POSITION?.valeur, v.STATUT_ACTIVITE?.valeur].filter(Boolean).join(" · ") || "—")}
        </div>
      ),
    },
    {
      cle: "titre-frise",
      type: "libre",
      garderAvecSuivant: true,
      contenu: <div className="mb-1 border-b border-black text-[10.5pt] font-bold">3. Étapes de la carrière</div>,
    },
    ...d.elements.map((e, i): Bloc => ({
      cle: `e${i}`,
      type: "ligne",
      tableau: "frise",
      contenu: (
        <tr data-ligne={`e${i}`}>
          <td className="text-center">{e.date ? dateFr(e.date) : "—"}</td>
          <td>{GENRES[e.genre].libelle}</td>
          <td>
            <strong>{e.intitule}</strong>
            {e.lieu && ` · ${e.lieu}`}
            {!!e.changements.length && <div>{e.changements.map((x) => `${x.libelle} : ${x.de && x.de !== x.vers ? `${x.de} → ` : ""}${x.vers}`).join(" ; ")}</div>}
            {e.commentaire && <div className="italic">{e.commentaire}</div>}
          </td>
          <td>{e.acte ?? "—"}</td>
        </tr>
      ),
    })),
  ];
  return {
    blocs,
    tableaux,
    pied: {
      gauche: `Dossier de carrière — ${d.agent.nomComplet}`,
      droite: "MEPPSA · DGRHAS",
    },
  };
}
