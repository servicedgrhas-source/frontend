"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { EnteteOfficielle, SignatureOfficielle, editeLe } from "@/components/impression-officielle";
import { PagesA4, StyleImpressionA4, type Bloc, type Tableau } from "@/components/pages-a4";
import { Alerte, Bouton, Chargement } from "@/components/ui";
import { lireSession, qs, useApi } from "@/lib/api";

interface Bottin {
  /** « Fonctionnaires · département : Niari » */
  portee: string;
  trop: boolean;
  max: number;
  lignes: {
    numeroFiche: string;
    nomComplet: string;
    genre: "M" | "F" | null;
    statut: string;
    dateNaissance: string | null;
    lieuNaissance: string | null;
    matricule: string | null;
    lieuService: string | null;
    departement: string | null;
  }[];
  signature: { titre: string; nom: string | null; lieu: string };
}

const dateFr = (d: string | null) => (d ? d.split("-").reverse().join("/") : "—");
const nf = new Intl.NumberFormat("fr-FR");

/**
 * Bottin du personnel imprimé (DG, 24/10/2026) : la liste par ordre alphabétique, avec l'en-tête
 * du ministère, des pages numérotées et la signature du Directeur général ; filtrée comme la base
 * (type d'agent, département…), pour répondre à une administration ou faire l'état des effectifs.
 */
export function ImpressionBottin() {
  const params = useSearchParams();
  const filtres = Object.fromEntries([...params.entries()].filter(([k]) => k !== "page"));
  const b = useApi<Bottin>(`/recensement/bottin${qs(filtres)}`);
  useEffect(() => {
    if (!lireSession().jeton) window.location.href = "/connexion";
    document.title = "Bottin du personnel";
  }, []);
  const portee = b.donnees?.portee ?? "";

  const contenu = useMemo(() => {
    if (!b.donnees) return null;
    const d = b.donnees;
    const tableaux: Record<string, Tableau> = {
      bottin: {
        className: "text-[7.5pt]",
        colonnes: (
          <colgroup>
            <col style={{ width: "5%" }} />
            <col style={{ width: "24%" }} />
            <col style={{ width: "4%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "24%" }} />
            <col style={{ width: "12%" }} />
          </colgroup>
        ),
        entete: (
          <tr>
            <th>N°</th>
            <th>Noms et prénoms</th>
            <th>Genre</th>
            <th>Type</th>
            <th>Né(e) le</th>
            <th>Lieu de naissance</th>
            <th>Lieu de service</th>
            <th>Département</th>
          </tr>
        ),
      },
    };
    const blocs: Bloc[] = [
      {
        cle: "entete",
        type: "libre",
        garderAvecSuivant: true,
        contenu: <EnteteOfficielle titre="BOTTIN DU PERSONNEL" sousTitre={`${portee} — situation au ${new Date().toLocaleDateString("fr-FR")} : ${nf.format(d.lignes.length)} agent(s)`} sousNumero={editeLe()} />,
      },
      ...d.lignes.map(
        (l, i): Bloc => ({
          cle: `l${i}`,
          type: "ligne",
          tableau: "bottin",
          contenu: (
            <tr data-ligne={`l${i}`}>
              <td className="text-center tabular-nums">{i + 1}</td>
              <td>
                <strong>{l.nomComplet}</strong>
                {l.matricule && <div className="text-[6.5pt]">Mle {l.matricule}</div>}
              </td>
              <td className="text-center">{l.genre ?? "—"}</td>
              <td>{l.statut}</td>
              <td className="text-center tabular-nums">{dateFr(l.dateNaissance)}</td>
              <td>{l.lieuNaissance ?? "—"}</td>
              <td>{l.lieuService ?? "—"}</td>
              <td>{l.departement ?? "—"}</td>
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
              Arrêté la présente liste à <strong>{nf.format(d.lignes.length)}</strong> agent(s).
            </div>
            <SignatureOfficielle titre={d.signature.titre} nom={d.signature.nom} lieu={d.signature.lieu} />
          </>
        ),
      },
    ];
    return { blocs, tableaux };
  }, [b.donnees, portee]);

  if (b.erreur)
    return (
      <div className="p-6">
        <Alerte>{b.erreur}</Alerte>
      </div>
    );
  if (!contenu) return <Chargement texte="Préparation du bottin…" />;
  return (
    <div className="min-h-screen bg-zinc-200 py-6 print:bg-white print:py-0">
      <StyleImpressionA4 />
      <div className="no-print mx-auto mb-4 flex w-[210mm] flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-zinc-700">
          Bottin du personnel — {portee} ({nf.format(b.donnees!.lignes.length)} agent(s))
        </span>
        <Bouton variante="principal" onClick={() => window.print()}>
          Imprimer / Enregistrer en PDF
        </Bouton>
        {b.donnees!.trop && (
          <div className="w-full">
            <Alerte ton="jaune">Seuls les {nf.format(b.donnees!.max)} premiers agents sont dans ce bottin : choisissez un département ou un type d’agent dans la base du personnel.</Alerte>
          </div>
        )}
      </div>
      <PagesA4 blocs={contenu.blocs} tableaux={contenu.tableaux} pied={{ gauche: "Bottin du personnel", droite: "MEPPSA · DGRHAS" }} classeFeuille="feuille-liste" margeCote={10} />
    </div>
  );
}
