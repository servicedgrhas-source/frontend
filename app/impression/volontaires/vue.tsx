"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { EnteteOfficielle, editeLe } from "@/components/impression-officielle";
import { PagesA4, StyleImpressionA4, type Bloc, type Tableau } from "@/components/pages-a4";
import { Alerte, Bouton, Chargement } from "@/components/ui";
import { lireSession, qs, useApi } from "@/lib/api";
import { GENERE_PAR } from "@/lib/prestations";

interface Ligne {
  nomComplet: string;
  naissance: string;
  telephone: string;
  diplome: string;
  specialite: string;
  categorie: string;
  departement: string;
  etablissement: string;
  vague: string;
  note: string;
  priseService: string;
  payeDepuis: string;
  statut: string;
}

/**
 * Liste des volontaires ou des communautaires imprimée ou enregistrée en PDF (06/11/2026) : les
 * filtres de l'écran, en paysage, toutes les informations, la mention du système au pied de page.
 */
export function ImpressionVolontaires() {
  const params = useSearchParams();
  const { titre = "Liste des volontaires", ...filtres } = Object.fromEntries(params.entries());
  const communautaires = filtres.population === "COMMUNAUTAIRE";
  const r = useApi<Ligne[]>(`/enrolement/volontaires/complete${qs(filtres)}`);
  useEffect(() => {
    if (!lireSession().jeton) window.location.href = "/connexion";
    document.title = titre;
  }, [titre]);

  const contenu = useMemo(() => {
    if (!r.donnees) return null;
    const cols: [string, number, keyof Ligne][] = [
      ["Noms et prénoms", 15, "nomComplet"],
      ["Date et lieu de naissance", 10, "naissance"],
      ["Téléphone", 7, "telephone"],
      ["Diplôme", 7, "diplome"],
      ["Spécialité", 7, "specialite"],
      [communautaires ? "Cycle" : "Catégorie", 8, "categorie"],
      ["Département", 7, "departement"],
      ["Établissement", 10, "etablissement"],
      ...(communautaires ? [] : ([["Vague", 5, "vague"]] as [string, number, keyof Ligne][])),
      ["Note de service", 8, "note"],
      ["Prise de service", 5, "priseService"],
      ["Payé depuis", 5, "payeDepuis"],
      ["Situation", 6, "statut"],
    ];
    const tableaux: Record<string, Tableau> = {
      liste: {
        className: "text-[7pt]",
        colonnes: (
          <colgroup>
            <col style={{ width: "3%" }} />
            {cols.map(([t, w]) => (
              <col key={t} style={{ width: `${w}%` }} />
            ))}
          </colgroup>
        ),
        entete: (
          <tr>
            <th>N°</th>
            {cols.map(([t]) => (
              <th key={t}>{t}</th>
            ))}
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
              {cols.map(([t, , cle]) => (
                <td key={t} className={cle === "nomComplet" ? "" : "text-center"}>
                  {x[cle] || "—"}
                </td>
              ))}
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
            Arrêtée la présente liste à <strong>{r.donnees.length}</strong> personne(s).
          </div>
        ),
      },
    ];
    return { blocs, tableaux };
  }, [r.donnees, titre, communautaires]);

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
      <PagesA4
        paysage
        blocs={contenu.blocs}
        tableaux={contenu.tableaux}
        pied={{ gauche: titre, droite: "MEPPSA · DGRHAS", mention: GENERE_PAR }}
        classeFeuille="feuille-liste"
        margeHaut={10}
        margeCote={10}
        margeBas={20}
      />
    </div>
  );
}
