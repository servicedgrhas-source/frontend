"use client";

import { useSearchParams } from "next/navigation";
import { type ReactNode, useEffect, useMemo } from "react";
import { EnteteOfficielle, editeLe } from "@/components/impression-officielle";
import { PagesA4, StyleImpressionA4, type Bloc, type Tableau } from "@/components/pages-a4";
import { Alerte, Bouton, Chargement } from "@/components/ui";
import { lireSession, qs, useApi } from "@/lib/api";

export interface ColonneImprimee<L> {
  titre: string;
  /** Largeur en % de la page. */
  largeur: number;
  valeur: (l: L, i: number) => ReactNode;
  droite?: boolean;
}

/**
 * Liste imprimable (écoles, structures administratives… DG, 08/11/2026) : l'en-tête du ministère,
 * les filtres choisis à l'écran rappelés sous le titre, des pages A4 numérotées en paysage. On
 * l'enregistre en PDF depuis la fenêtre d'impression.
 */
export function ImpressionListe<L>({
  chemin,
  titre,
  sousTitre,
  colonnes,
  arrete,
  pied,
}: {
  /** Adresse du serveur qui renvoie { lignes, … } (les filtres de l'adresse de la page y sont passés). */
  chemin: string;
  titre: string;
  sousTitre: (d: { lignes: L[] } & Record<string, unknown>) => string;
  colonnes: ColonneImprimee<L>[];
  /** « Arrêtée la présente liste à … » */
  arrete: (n: number) => string;
  pied: string;
}) {
  const params = useSearchParams();
  const filtres = Object.fromEntries(params.entries());
  const r = useApi<{ lignes: L[] } & Record<string, unknown>>(`${chemin}${qs(filtres)}`);
  useEffect(() => {
    if (!lireSession().jeton) window.location.href = "/connexion";
    document.title = titre.charAt(0) + titre.slice(1).toLowerCase();
  }, [titre]);

  const contenu = useMemo(() => {
    if (!r.donnees) return null;
    const d = r.donnees;
    const tableaux: Record<string, Tableau> = {
      liste: {
        className: "text-[8pt]",
        colonnes: (
          <colgroup>
            {colonnes.map((c, i) => (
              <col key={i} style={{ width: `${c.largeur}%` }} />
            ))}
          </colgroup>
        ),
        entete: (
          <tr>
            {colonnes.map((c) => (
              <th key={c.titre}>{c.titre}</th>
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
        contenu: <EnteteOfficielle titre={titre} sousTitre={sousTitre(d)} sousNumero={editeLe()} />,
      },
      ...d.lignes.map(
        (l, i): Bloc => ({
          cle: `l${i}`,
          type: "ligne",
          tableau: "liste",
          contenu: (
            <tr data-ligne={`l${i}`}>
              {colonnes.map((c) => (
                <td key={c.titre} className={c.droite ? "text-right tabular-nums" : ""}>
                  {c.valeur(l, i)}
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
        contenu: <div className="mt-3 text-[9pt]">{arrete(d.lignes.length)}</div>,
      },
    ];
    return { blocs, tableaux };
  }, [r.donnees, colonnes, titre, sousTitre, arrete]);

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
        <span className="text-sm text-zinc-700">{sousTitre(r.donnees)}</span>
        <Bouton variante="principal" onClick={() => window.print()}>
          Imprimer / Enregistrer en PDF
        </Bouton>
      </div>
      <PagesA4 paysage blocs={contenu.blocs} tableaux={contenu.tableaux} pied={{ gauche: pied, droite: "MEPPSA · DGRHAS" }} classeFeuille="feuille-liste" margeHaut={10} margeCote={10} margeBas={18} />
    </div>
  );
}
