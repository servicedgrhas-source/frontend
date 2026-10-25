"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { EnteteOfficielle, SignatureOfficielle } from "@/components/impression-officielle";
import { PagesA4, StyleImpressionA4, type Bloc, type Tableau } from "@/components/pages-a4";
import { dateFr, type DossierCarriere, GENRES } from "@/components/recensement/carriere";
import { Alerte, Bouton, Chargement } from "@/components/ui";
import { lireSession, useApi } from "@/lib/api";

/**
 * Dossier de carrière imprimé (A4), tel que le bureau du fichier le tient (DG, 24/10/2026) :
 * identification, situation professionnelle, situation matrimoniale (avec les enfants), puis les
 * étapes de la carrière dans l'ordre (grades et échelons successifs, affectations successives…),
 * chacune avec son acte ; signé par le Directeur général, il peut être remis à l'agent ou à une
 * administration.
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
  const av = d.situation.avancement;
  const f = d.famille;
  const ligne = (l: string, x: React.ReactNode) => (
    <div className="flex gap-2 py-0.5 text-[10pt]">
      <div className="w-[38%] text-zinc-700">{l}</div>
      <div className="flex-1 font-semibold">{x}</div>
    </div>
  );
  const titre = (t: string) => <div className="mb-1 border-b border-black text-[10.5pt] font-bold">{t}</div>;
  // La position n'apparaît que si elle est renseignée
  const position = [v.POSITION?.valeur, v.STATUT_ACTIVITE?.valeur].filter(Boolean).join(" · ");
  const naissance = [d.agent.dateNaissance && `le ${dateFr(d.agent.dateNaissance)}`, d.agent.lieuNaissance && `à ${d.agent.lieuNaissance}`].filter(Boolean).join(" ");
  const tableaux: Record<string, Tableau> = {
    enfants: {
      className: "text-[9pt]",
      colonnes: (
        <colgroup>
          <col style={{ width: "30%" }} />
          <col style={{ width: "14%" }} />
          <col style={{ width: "28%" }} />
          <col style={{ width: "28%" }} />
        </colgroup>
      ),
      entete: (
        <tr>
          <th>Enfant</th>
          <th>Né(e) le</th>
          <th>Père</th>
          <th>Mère</th>
        </tr>
      ),
    },
    frise: {
      className: "text-[9pt]",
      colonnes: (
        <colgroup>
          <col style={{ width: "13%" }} />
          <col style={{ width: "15%" }} />
          <col style={{ width: "40%" }} />
          <col style={{ width: "32%" }} />
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
      contenu: <EnteteOfficielle titre="DOSSIER DE CARRIÈRE" sousTitre={`Situation au ${new Date().toLocaleDateString("fr-FR")}`} />,
    },
    {
      cle: "identite",
      type: "libre",
      contenu: (
        <div className="mb-3">
          {titre("1. Identification")}
          {ligne("Nom et prénoms", d.agent.nomComplet)}
          {d.agent.genre && ligne("Genre", d.agent.genre)}
          {ligne("Né(e)", naissance || "—")}
          {d.agent.nationalite && ligne("Nationalité", d.agent.nationalite)}
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
          {titre("2. Situation professionnelle")}
          {ligne("Statut", d.agent.libelleStatut)}
          {ligne("Grade", val("GRADE"))}
          {ligne("Catégorie · échelle · échelon", [val("CATEGORIE"), val("ECHELLE"), val("ECHELON")].join(" · "))}
          {av &&
            ligne(
              av.libelle,
              `${av.origine === "DERNIER" ? dateFr(av.depuis) : "aucune depuis l’entrée"}${d.situation.prochainEchelon ? ` (${av.nature === "AVANCEMENT" ? "prochain avancement" : "prochaine promotion"} : ${dateFr(d.situation.prochainEchelon)})` : ""}`,
            )}
          {ligne("Fonction", val("FONCTION"))}
          {ligne("Lieu de service", val("LIEU_SERVICE"))}
          {position && ligne("Position", position)}
        </div>
      ),
    },
    {
      cle: "famille",
      type: "libre",
      garderAvecSuivant: f.enfants.length > 0,
      contenu: (
        <div className="mb-3">
          {titre("3. Situation matrimoniale")}
          {ligne("Situation matrimoniale", f.situationMatrimoniale ?? "—")}
          {ligne("Nombre d’enfants", f.nombreEnfants ?? (f.enfants.length ? String(f.enfants.length) : "—"))}
        </div>
      ),
    },
    ...f.enfants.map((x, i): Bloc => ({
      cle: `enfant${i}`,
      type: "ligne",
      tableau: "enfants",
      contenu: (
        <tr data-ligne={`enfant${i}`}>
          <td>{x.nom ?? "—"}</td>
          <td className="text-center">{x.naissance ? dateFr(x.naissance) : "—"}</td>
          <td>{x.pere ?? "—"}</td>
          <td>{x.mere ?? "—"}</td>
        </tr>
      ),
    })),
    {
      cle: "titre-frise",
      type: "libre",
      garderAvecSuivant: true,
      contenu: <div className="mt-3">{titre("4. Étapes de la carrière")}</div>,
    },
    ...d.elements.map((e, i): Bloc => ({
      cle: `e${i}`,
      type: "ligne",
      tableau: "frise",
      contenu: (
        <tr data-ligne={`e${i}`}>
          <td className="text-center">{e.date ? dateFr(e.date) : "—"}</td>
          <td>{e.nature || GENRES[e.genre].libelle}</td>
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
    {
      cle: "signature",
      type: "libre",
      contenu: <SignatureOfficielle titre={d.signature.titre} nom={d.signature.nom} lieu={d.signature.lieu} />,
    },
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
