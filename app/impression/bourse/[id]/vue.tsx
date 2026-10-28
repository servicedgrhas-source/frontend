"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { PagesA4, StyleImpressionA4, type Bloc, type Tableau } from "@/components/pages-a4";
import { Alerte, Bouton, Chargement } from "@/components/ui";
import { lireSession, useApi } from "@/lib/api";

interface EtatPaiement {
  etat: { id: number; mois: string; statut: string; population: string };
  titre: string;
  sousTitre: string;
  brouillon: boolean;
  sections: {
    titre: string;
    lignes: { nomComplet: string; cycle: string; departement: string; etablissement: string; vague: string; mois: number; montant: number; telephone: string; observation: string }[];
    total: number;
    arrete: string;
  }[];
  signature: { titre: string; nom: string };
}

const nf = new Intl.NumberFormat("fr-FR");

/**
 * État de paiement de la bourse imprimé (DG, 27/10/2026) : au modèle officiel, en paysage, la
 * liste générale puis une liste par département (les communautaires : une liste unique), avec
 * les colonnes N° CNI et Émargement que les bénéficiaires remplissent en touchant leur bourse.
 */
export function ImpressionEtatPaiement() {
  const { id } = useParams<{ id: string }>();
  const d = useApi<EtatPaiement>(`/enrolement/bourse/${id}/etat-paiement`);
  useEffect(() => {
    if (!lireSession().jeton) window.location.href = "/connexion";
  }, []);
  useEffect(() => {
    if (d.donnees) document.title = `État de paiement - ${d.donnees.sousTitre}`;
  }, [d.donnees]);

  const contenu = useMemo(() => {
    if (!d.donnees) return null;
    const e = d.donnees;
    const tableaux: Record<string, Tableau> = {};
    const blocs: Bloc[] = [];
    e.sections.forEach((s, k) => {
      const t = `t${k}`;
      tableaux[t] = {
        className: "text-[7.5pt]",
        colonnes: (
          <colgroup>
            {/* La CNI s'écrit à la main : une colonne large (DG, 28/10/2026) */}
            {[3, 19, 7, 7, 14, 4, 7, 14, 11, 7, 7].map((w, i) => (
              <col key={i} style={{ width: `${w}%` }} />
            ))}
          </colgroup>
        ),
        entete: (
          <tr>
            <th>N°</th>
            <th>Nom et prénoms</th>
            <th>Cycle</th>
            <th>Départ.</th>
            <th>Établissement</th>
            <th>Vague</th>
            <th>Montant (FCFA)</th>
            <th>N° CNI</th>
            <th>Émargement</th>
            <th>Téléphone</th>
            <th>Observation</th>
          </tr>
        ),
      };
      blocs.push({
        cle: `entete${k}`,
        type: "libre",
        garderAvecSuivant: true,
        nouvellePage: k > 0,
        contenu: (
          <div className="mb-3 text-center leading-tight">
            <div className="text-[9.5pt] font-bold">RÉPUBLIQUE DU CONGO</div>
            <div className="text-[8pt]">Unité * Travail * Progrès</div>
            <div className="mt-1 text-[9pt] font-bold">MINISTÈRE DE L’ENSEIGNEMENT PRÉSCOLAIRE, PRIMAIRE, SECONDAIRE ET DE L’ALPHABÉTISATION</div>
            <div className="text-[8.5pt] font-bold">DIRECTION GÉNÉRALE DES RESSOURCES HUMAINES ET DE L’ADMINISTRATION SCOLAIRE</div>
            <div className="mt-3 text-[13pt] font-bold">{e.titre}</div>
            <div className="text-[10pt] font-bold">
              {e.sousTitre} — {s.titre}
            </div>
          </div>
        ),
      });
      s.lignes.forEach((l, i) =>
        blocs.push({
          cle: `l${k}-${i}`,
          type: "ligne",
          tableau: t,
          contenu: (
            // De la hauteur pour signer et écrire le n° de la CNI
            <tr data-ligne={`l${k}-${i}`} style={{ height: "7mm" }}>
              <td className="text-center tabular-nums">{i + 1}</td>
              <td>{l.nomComplet}</td>
              <td>{l.cycle}</td>
              <td>{l.departement}</td>
              <td>{l.etablissement}</td>
              <td className="text-center">{l.vague}</td>
              <td className="text-right tabular-nums">{nf.format(l.montant)}</td>
              <td />
              <td />
              <td>{l.telephone}</td>
              <td className="text-[6.5pt]">{l.observation}</td>
            </tr>
          ),
        }),
      );
      blocs.push({
        cle: `total${k}`,
        type: "ligne",
        tableau: t,
        contenu: (
          <tr data-ligne={`total${k}`} className="font-bold">
            <td />
            <td>TOTAL</td>
            <td colSpan={4} />
            <td className="text-right tabular-nums">{nf.format(s.total)}</td>
            <td colSpan={4} />
          </tr>
        ),
      });
      blocs.push({
        cle: `signature${k}`,
        type: "libre",
        // Jamais seule en haut d'une page (DG, 26/10/2026)
        garderAvecPrecedent: true,
        contenu: (
          <div className="text-[9pt]" style={{ breakInside: "avoid" }}>
            <div className="mt-2 italic">
              Arrêté le présent état à {nf.format(s.lignes.length)} bénéficiaire(s) et à la somme de : {s.arrete}
            </div>
            <div className="mt-3 flex justify-end text-[10.5pt]">
              <div className="mr-[8%] w-fit leading-[1.5]">
                <div>Fait à Brazzaville, le {new Date().toLocaleDateString("fr-FR")}</div>
                {/* Le titre sans gras, au moins deux lignes pour signer, le nom en gras (DG, 27/10/2026) */}
                <div className="mt-[1em]">{e.signature.titre}</div>
                <div className="h-[5em]" />
                <div className="font-bold underline">{e.signature.nom}</div>
              </div>
            </div>
          </div>
        ),
      });
    });
    return { blocs, tableaux };
  }, [d.donnees]);

  if (d.erreur)
    return (
      <div className="p-6">
        <Alerte>{d.erreur}</Alerte>
      </div>
    );
  if (!contenu || !d.donnees) return <Chargement texte="Préparation de l’état de paiement…" />;
  return (
    <div className="min-h-screen bg-zinc-200 py-6 print:bg-white print:py-0">
      <StyleImpressionA4 paysage />
      <div className="no-print mx-auto mb-4 flex w-[297mm] flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-zinc-700">
          {d.donnees.titre} — {d.donnees.sousTitre}
        </span>
        <Bouton variante="principal" onClick={() => window.print()}>
          Imprimer / Enregistrer en PDF
        </Bouton>
        {d.donnees.brouillon && (
          <div className="w-full">
            <Alerte ton="jaune">Projet non validé : faites valider la bourse par le Directeur général avant de l’envoyer au Trésor.</Alerte>
          </div>
        )}
      </div>
      <PagesA4 paysage blocs={contenu.blocs} tableaux={contenu.tableaux} pied={{ gauche: d.donnees.sousTitre, droite: "MEPPSA · DGRHAS" }} classeFeuille="feuille-liste" margeHaut={10} margeCote={10} margeBas={18} />
    </div>
  );
}
