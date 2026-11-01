"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { EnteteOfficielle, editeLe } from "@/components/impression-officielle";
import { PagesA4, StyleImpressionA4, type Bloc, type Tableau } from "@/components/pages-a4";
import { Alerte, Bouton, Chargement } from "@/components/ui";
import { lireSession, qs, useApi } from "@/lib/api";
import { libelleLot } from "@/lib/libelles";
import type { Affectation } from "@/lib/types";

const dateFr = (d: string | null) => (d ? d.split("-").reverse().join("/") : "—");
const QUOTA = (a: Affectation["agent"]) =>
  a.feuille !== "QUOTA_AUTRES" ? "MEPPSA" : a.departementId && !(a as { repartitionId?: string | null }).repartitionId ? "Autres avec dép." : "Autres sans dép.";

/**
 * Liste de « Traitement des affectations » imprimée ou enregistrée en PDF (DG, 01/11/2026) : les
 * filtres choisis dans la fenêtre « Exporter une liste », en paysage, pages numérotées.
 */
export function ImpressionAffectations() {
  const params = useSearchParams();
  const { titre = "Liste des personnes à affecter", ...filtres } = Object.fromEntries(params.entries());
  const r = useApi<Affectation[]>(`/affectations${qs(filtres)}`);
  useEffect(() => {
    if (!lireSession().jeton) window.location.href = "/connexion";
    document.title = titre;
  }, [titre]);

  const contenu = useMemo(() => {
    if (!r.donnees) return null;
    const tableaux: Record<string, Tableau> = {
      liste: {
        className: "text-[7.5pt]",
        colonnes: (
          <colgroup>
            {[4, 21, 7, 11, 9, 7, 9, 10, 9, 8, 13].map((w, i) => (
              <col key={i} style={{ width: `${w}%` }} />
            ))}
          </colgroup>
        ),
        entete: (
          <tr>
            <th>N°</th>
            <th>Noms et prénoms</th>
            <th>Date de naissance</th>
            <th>Diplôme</th>
            <th>Grade</th>
            <th>Cycle</th>
            <th>Spécialité</th>
            <th>Département</th>
            <th>Lot</th>
            <th>Quota</th>
            <th>Réf. du texte</th>
          </tr>
        ),
      },
    };
    const blocs: Bloc[] = [
      {
        cle: "entete",
        type: "libre",
        garderAvecSuivant: true,
        contenu: <EnteteOfficielle titre={titre.toUpperCase()} sousTitre={`${r.donnees.length} personne(s)`} sousNumero={editeLe()} />,
      },
      ...r.donnees.map(
        (x, i): Bloc => ({
          cle: `l${i}`,
          type: "ligne",
          tableau: "liste",
          contenu: (
            <tr data-ligne={`l${i}`}>
              <td className="whitespace-nowrap text-center tabular-nums">{i + 1}</td>
              <td>{x.agent.nomComplet}</td>
              <td className="text-center">{dateFr(x.agent.dateNaissance)}</td>
              <td className="text-center">{x.agent.diplomeBrut ?? "—"}</td>
              <td className="text-center">{x.derive.grade ?? "—"}</td>
              <td className="text-center">{x.derive.cycleLibelle ?? "—"}</td>
              <td className="text-center">{x.specialite ?? "—"}</td>
              <td className="text-center">{x.departement?.nom ?? "Sans département"}</td>
              <td className="text-center">{x.agent.lotPublication ? libelleLot(x.agent.lotPublication) : "Sans lot"}</td>
              <td className="text-center">{QUOTA(x.agent)}</td>
              <td className="text-center">{x.derive.reference ?? "—"}</td>
            </tr>
          ),
        }),
      ),
      {
        cle: "fin",
        type: "libre",
        garderAvecPrecedent: true,
        contenu: (
          <div className="mt-3 text-[9pt]">
            Arrêté la présente liste à <strong>{r.donnees.length}</strong> personne(s).
          </div>
        ),
      },
    ];
    return { blocs, tableaux };
  }, [r.donnees, titre]);

  if (r.erreur)
    return (
      <div className="p-6">
        <Alerte>{r.erreur}</Alerte>
      </div>
    );
  if (!contenu || !r.donnees) return <Chargement texte="Préparation de la liste…" />;
  return (
    <div className="min-h-screen bg-zinc-200 py-6 print:bg-white print:py-0">
      <StyleImpressionA4 paysage />
      <div className="no-print mx-auto mb-4 flex w-[297mm] flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-zinc-700">
          {titre} ({r.donnees.length} personne(s))
        </span>
        <Bouton variante="principal" onClick={() => window.print()}>
          Imprimer / Enregistrer en PDF
        </Bouton>
      </div>
      <PagesA4 paysage blocs={contenu.blocs} tableaux={contenu.tableaux} pied={{ gauche: titre, droite: "MEPPSA · DGRHAS" }} classeFeuille="feuille-liste" margeHaut={10} margeCote={10} margeBas={18} />
    </div>
  );
}
