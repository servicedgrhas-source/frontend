"use client";

import { useEffect, useMemo } from "react";
import { EnteteOfficielle } from "@/components/impression-officielle";
import { PagesA4, StyleImpressionA4, type Bloc, type Tableau } from "@/components/pages-a4";
import { useConfigRecensement } from "@/components/recensement/commun";
import { Alerte, Bouton, Chargement } from "@/components/ui";
import { lireSession } from "@/lib/api";

/**
 * Consignes à remettre aux structures (écoles, inspections, directions) qui envoient les scans de
 * beaucoup d'agents d'un coup : comment nommer chaque fichier, et le code de chaque pièce. Le
 * système range un scan dans la bonne fiche seulement si son nom suit exactement cette écriture.
 */
export default function CodesPieces() {
  const config = useConfigRecensement();
  useEffect(() => {
    if (!lireSession().jeton) window.location.href = "/connexion";
    document.title = "Codes des pièces justificatives";
  }, []);
  const c = config.donnees?.configuration;
  const contenu = useMemo(() => {
    if (!c) return null;
    const tableaux: Record<string, Tableau> = {
      pieces: {
        className: "text-[10pt]",
        colonnes: (
          <colgroup>
            <col style={{ width: "62%" }} />
            <col style={{ width: "38%" }} />
          </colgroup>
        ),
        entete: (
          <tr>
            <th>Pièce</th>
            <th>Code à écrire dans le nom du fichier</th>
          </tr>
        ),
      },
    };
    const blocs: Bloc[] = [
      { cle: "entete", type: "libre", garderAvecSuivant: true, contenu: <EnteteOfficielle titre="CODES DES PIÈCES JUSTIFICATIVES" sousTitre="Envoi des scans de plusieurs agents d’un coup" /> },
      {
        cle: "regle",
        type: "libre",
        contenu: (
          <div className="mb-4 space-y-2 text-[10.5pt] leading-snug">
            <p>
              Chaque scan (PDF, JPG ou PNG) est nommé ainsi : <strong>numéro de fiche de l’agent</strong>, un <strong>tiret du bas « _ »</strong>, puis le <strong>code de la pièce</strong>{" "}
              écrit exactement comme dans le tableau ci-dessous (le matricule solde peut remplacer le numéro de fiche).
            </p>
            <p>
              Exemples : <strong>REC-000123_CNI.pdf</strong> (CNI de l’agent REC-000123) ; <strong>REC-000123_ACTE_NAISSANCE_ENFANT_2.pdf</strong> (acte de naissance de son 2ᵉ enfant) ;{" "}
              <strong>179407Z_BULLETIN_SOLDE.pdf</strong> (bulletin de solde de l’agent au matricule 179407Z).
            </p>
            <p>Avant l’envoi, vérifiez seulement que chaque nom est bien écrit : un fichier au nom mal écrit est refusé, il faut le renommer et le renvoyer.</p>
          </div>
        ),
      },
      ...c.pieces
        .filter((p) => p.actif)
        .map(
          (p): Bloc => ({
            cle: `p-${p.code}`,
            type: "ligne",
            tableau: "pieces",
            contenu: (
              <tr data-ligne={`p-${p.code}`}>
                <td>{p.libelle}</td>
                <td className="font-mono font-bold">{p.code}</td>
              </tr>
            ),
          }),
        ),
    ];
    return { blocs, tableaux };
  }, [c]);

  if (config.erreur)
    return (
      <div className="p-6">
        <Alerte>{config.erreur}</Alerte>
      </div>
    );
  if (!contenu) return <Chargement />;
  return (
    <div className="min-h-screen bg-zinc-200 py-6 print:bg-white print:py-0">
      <StyleImpressionA4 />
      <div className="no-print mx-auto mb-4 flex w-[210mm] items-center justify-between">
        <span className="text-sm text-zinc-700">Consignes à remettre aux structures qui envoient des scans</span>
        <Bouton variante="principal" onClick={() => window.print()}>
          Imprimer / Enregistrer en PDF
        </Bouton>
      </div>
      <PagesA4 blocs={contenu.blocs} tableaux={contenu.tableaux} pied={{ gauche: "Codes des pièces justificatives", droite: "MEPPSA · DGRHAS" }} classeFeuille="feuille-liste" margeCote={14} />
    </div>
  );
}
