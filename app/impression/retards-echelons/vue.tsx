"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { EnteteOfficielle, SignatureOfficielle, editeLe } from "@/components/impression-officielle";
import { PagesA4, StyleImpressionA4, type Bloc, type Tableau } from "@/components/pages-a4";
import { Alerte, Bouton, Chargement } from "@/components/ui";
import { lireSession, qs, useApi } from "@/lib/api";

interface Retards {
  reference: string;
  total: number;
  echelonsDus: number;
  dateManquante: number;
  lignes: {
    id: number;
    nomComplet: string;
    matricule: string | null;
    statut: string;
    categorie: string | null;
    echelle: string | null;
    departement: string | null;
    structure: string | null;
    echelon: number | null;
    echelonLibelle: string;
    depuis: string;
    origine: "DERNIER" | "ENTREE";
    dus: number;
    echelonTheorique: number | null;
    echelonTheoriqueLibelle: string;
    dateManquante: boolean;
  }[];
  signature: { titre: string; nom: string | null; lieu: string };
}

const dateFr = (d: string) => d.split("-").reverse().join("/");
const nf = new Intl.NumberFormat("fr-FR");

/**
 * Échelons en retard imprimés (DG, 28/10/2026) : l'en-tête habituel du ministère, la liste avec les
 * filtres choisis à l'écran, des pages numérotées en paysage et la signature du Directeur général.
 */
export function ImpressionRetards() {
  const params = useSearchParams();
  const filtres = Object.fromEntries(params.entries());
  const r = useApi<Retards>(`/recensement/retards-echelons${qs(filtres)}`);
  useEffect(() => {
    if (!lireSession().jeton) window.location.href = "/connexion";
    document.title = "Échelons en retard";
  }, []);

  const contenu = useMemo(() => {
    if (!r.donnees) return null;
    const d = r.donnees;
    const tableaux: Record<string, Tableau> = {
      retards: {
        className: "text-[7.5pt]",
        colonnes: (
          <colgroup>
            {[4, 22, 9, 8, 8, 11, 18, 6, 8, 6].map((w, i) => (
              <col key={i} style={{ width: `${w}%` }} />
            ))}
          </colgroup>
        ),
        entete: (
          <tr>
            <th>N°</th>
            <th>Nom et prénoms</th>
            <th>Matricule</th>
            <th>Statut</th>
            <th>Cat. · échelle</th>
            <th>Département</th>
            <th>Structure</th>
            <th>Échelon actuel</th>
            <th>Dernière promotion</th>
            <th>Éch. attendu</th>
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
          <EnteteOfficielle
            titre={`ÉCHELONS EN RETARD AU ${dateFr(d.reference)}`}
            sousTitre={`${nf.format(d.total)} agent(s), ${nf.format(d.echelonsDus)} échelon(s) de retard${d.dateManquante ? ` ; ${nf.format(d.dateManquante)} agent(s) sans date de dernière promotion` : ""}`}
            sousNumero={editeLe()}
          />
        ),
      },
      ...d.lignes.map(
        (l, i): Bloc => ({
          cle: `l${i}`,
          type: "ligne",
          tableau: "retards",
          contenu: (
            <tr data-ligne={`l${i}`}>
              <td className="text-center tabular-nums">{i + 1}</td>
              <td className="text-center">{l.nomComplet}</td>
              <td className="text-center">{l.matricule ?? "—"}</td>
              <td className="text-center">{l.statut === "CONTRACTUEL" ? "Contractuel" : "Fonctionnaire"}</td>
              <td className="text-center">{[l.categorie === "HORS_CATEGORIE" ? "Hors cat." : l.categorie, l.echelle && `éch. ${l.echelle}`].filter(Boolean).join(" · ") || "—"}</td>
              <td className="text-center">{l.departement ?? "—"}</td>
              <td className="text-center">{l.structure ?? "—"}</td>
              <td className="text-center tabular-nums">{l.echelonLibelle || "—"}</td>
              <td className="text-center">{l.dateManquante ? "à renseigner" : `${dateFr(l.depuis)}${l.origine === "ENTREE" ? " (entrée)" : ""}`}</td>
              <td className="text-center font-bold tabular-nums">{l.dateManquante ? "—" : l.echelonTheoriqueLibelle || "—"}</td>
            </tr>
          ),
        }),
      ),
      {
        cle: "signature",
        type: "libre",
        // Jamais seule en haut d'une page (DG, 26/10/2026)
        garderAvecPrecedent: true,
        contenu: (
          <>
            <div className="mt-3 text-[9pt]">
              Arrêté la présente liste à <strong>{nf.format(d.total)}</strong> agent(s).
            </div>
            <SignatureOfficielle titre={d.signature.titre} nom={d.signature.nom} lieu={d.signature.lieu} />
          </>
        ),
      },
    ];
    return { blocs, tableaux };
  }, [r.donnees]);

  if (r.erreur)
    return (
      <div className="p-6">
        <Alerte>{r.erreur}</Alerte>
      </div>
    );
  if (!contenu || !r.donnees) return <Chargement texte="Calcul de l’échelon attendu…" />;
  return (
    <div className="min-h-screen bg-zinc-200 py-6 print:bg-white print:py-0">
      <StyleImpressionA4 paysage />
      <div className="no-print mx-auto mb-4 flex w-[297mm] flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-zinc-700">
          Échelons en retard au {dateFr(r.donnees.reference)} ({nf.format(r.donnees.total)} agent(s))
        </span>
        <Bouton variante="principal" onClick={() => window.print()}>
          Imprimer / Enregistrer en PDF
        </Bouton>
      </div>
      <PagesA4 paysage blocs={contenu.blocs} tableaux={contenu.tableaux} pied={{ gauche: "Échelons en retard", droite: "MEPPSA · DGRHAS" }} classeFeuille="feuille-liste" margeHaut={10} margeCote={10} margeBas={18} />
    </div>
  );
}
