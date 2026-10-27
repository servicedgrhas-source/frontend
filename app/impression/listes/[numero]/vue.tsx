"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PagesA4, StyleImpressionA4, type Bloc, type Tableau } from "@/components/pages-a4";
import { Alerte, Bouton, Chargement, Liste } from "@/components/ui";
import { lireSession, useApi } from "@/lib/api";
import { dateCourte } from "@/lib/libelles";
import { useParametreUrl } from "@/lib/url";

interface ListeLot {
  quota: number | null;
  statut: string | null;
  nature?: "VOLONTAIRE" | "COMMUNAUTAIRE" | "MIXTE";
  diplomes?: string[];
  categories?: string[];
  diplome: string | null;
  cycle: string | null;
  administratif: boolean;
  categorie: string | null;
  echelle: number | null;
  lot: string | null;
  lignes: {
    n: number;
    nomComplet: string;
    dateNaissance: string | null;
    lieuNaissance: string | null;
    diplome: string | null;
    departement: string | null;
    source: string | null;
  }[];
}

interface Listes {
  numero: number;
  libelle: string;
  signataireTitre: string;
  signataireNom: string;
  lieu: string;
  listes: ListeLot[];
}

const ROMAINS = ["I", "II", "III", "IV", "V"];
const SEP = <div className="leading-none">-------------------</div>;

/** « Lot 2 » -> « 02 » ; « Lot unique » -> « UNIQUE ». */
function numeroLot(lot: string | null) {
  const n = lot?.match(/(\d+)/)?.[1];
  return n ? n.padStart(2, "0") : (lot?.replace(/^Lot\s*/i, "").toUpperCase() ?? "—");
}

function titres(l: ListeLot) {
  const qui = l.administratif ? "AGENTS" : "ENSEIGNANTS";
  // Titre d'après la nature du lot : volontaires, communautaires ou les deux
  const statut =
    l.nature === "MIXTE"
      ? " VOLONTAIRES ET COMMUNAUTAIRES"
      : l.nature === "VOLONTAIRE"
        ? " VOLONTAIRES"
        : l.nature === "COMMUNAUTAIRE"
          ? " COMMUNAUTAIRES"
          : l.statut
            ? ` ${l.statut.toUpperCase()}S`
            : "";
  const classification =
    l.categorie || l.echelle
      ? [l.categorie && `CATEGORIE ${l.categorie}`, l.echelle && `ECHELLE ${ROMAINS[l.echelle - 1] ?? l.echelle}`].filter(Boolean).join(", ")
      : l.categories?.length
        ? `CATEGORIES ${l.categories.join(" ET ")}`
        : "";
  const plusieurs = (l.diplomes?.length ?? 1) > 1;
  return {
    titre: `LISTE DES ${qui}${statut} SELECTIONNES`,
    detail: [`CYCLE : ${(l.cycle ?? "—").toUpperCase()}`, `${plusieurs ? "DIPLÔMES" : "DIPLÔME"} : ${l.diplome ?? "—"}`, classification].filter(Boolean).join(" / "),
    pied: `Recrutement ${l.quota ?? ""}/Liste du MEPPSA-Cycle ${(l.cycle ?? "").toLowerCase()}/Lot n°${numeroLot(l.lot)}`,
  };
}

const LARGEURS = [8, null, 22, 26, 20, 26, 18];

function construire(l: ListeLot, d: Listes) {
  const t = titres(l);
  const tableaux: Record<string, Tableau> = {
    liste: {
      className: "text-[9.5pt]",
      colonnes: (
        <colgroup>
          {LARGEURS.map((w, i) => (
            <col key={i} style={w ? { width: `${w}mm` } : undefined} />
          ))}
        </colgroup>
      ),
      entete: (
        <tr>
          <th>N°</th>
          <th>Noms et prénoms</th>
          <th>Date de nais.</th>
          <th>Lieu de nais.</th>
          <th>Diplôme</th>
          <th>Départ.</th>
          <th>Source</th>
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
          <div className="mt-7 mb-4 space-y-1 text-center font-bold">
            <div className="text-[14pt]">RECRUTEMENT {l.quota ?? ""}</div>
            <div className="text-[12pt]">{t.titre}</div>
            <div className="text-[11pt]">{t.detail}</div>
            <div className="text-[11pt]">
              LOT N° {numeroLot(l.lot)} / EFFECTIF : {l.lignes.length}
            </div>
          </div>
        </>
      ),
    },
    ...l.lignes.map(
      (p): Bloc => ({
        cle: `l${p.n}`,
        type: "ligne",
        tableau: "liste",
        contenu: (
          <tr data-ligne={`l${p.n}`}>
            <td className="text-center">{p.n}</td>
            <td>{p.nomComplet}</td>
            <td className="text-center">{p.dateNaissance && /^\d{4}-/.test(p.dateNaissance) ? dateCourte(p.dateNaissance) : p.dateNaissance}</td>
            <td>{p.lieuNaissance}</td>
            <td className="text-center">{p.diplome}</td>
            <td>{p.departement}</td>
            <td className="text-center">{p.source}</td>
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
        <div className="flex justify-end pt-8 text-[11pt]">
          <div className="w-[46%]">
            <div>Fait à {d.lieu}, le</div>
            <div className="mt-3">{d.signataireTitre}</div>
            <div className="mt-20 text-[12pt] font-bold">{d.signataireNom}</div>
          </div>
        </div>
      ),
    },
  ];
  return { blocs, tableaux, pied: { gauche: t.pied, droite: `MEPPSA ${l.quota ?? ""}` } };
}

function ListeImprimee({ liste, donnees }: { liste: ListeLot; donnees: Listes }) {
  const { blocs, tableaux, pied } = useMemo(() => construire(liste, donnees), [liste, donnees]);
  return <PagesA4 blocs={blocs} tableaux={tableaux} pied={pied} classeFeuille="feuille-liste" margeCote={14} />;
}

export function ImpressionListes() {
  const { numero } = useParams<{ numero: string }>();
  // Les transmissions sont numérotées par quota : « ?quota=2026 »
  const quota = useParametreUrl("quota");
  const { donnees, erreur } = useApi<Listes>(quota ? `/transmissions/${quota}/${numero}/listes` : null);
  const [choix, setChoix] = useState("0");

  useEffect(() => {
    if (!lireSession().jeton) window.location.href = "/connexion";
  }, []);

  if (erreur) return <div className="p-6"><Alerte>{erreur}</Alerte></div>;
  if (quota === null)
    return (
      <div className="p-6">
        <Alerte>Lien incomplet : ouvrez les listes depuis la page « Envoi à la FP ».</Alerte>
      </div>
    );
  if (!donnees) return <Chargement />;

  const affichees = donnees.listes.map((l, i) => ({ l, i })).filter(({ i }) => choix === "tout" || String(i) === choix);

  return (
    <div className="min-h-screen bg-zinc-200 py-6 print:bg-white print:py-0">
      <StyleImpressionA4 />
      {/* Ce que l'on voit et comment choisir la liste : explicite pour tous */}
      <div className="no-print mx-auto mb-5 w-[210mm] rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-4">
          <div className="text-[15px] font-semibold text-zinc-900">
            Listes de la {donnees.libelle} · quota {quota}
          </div>
          <div className="text-[12px] text-zinc-500">
            {donnees.listes.length} liste(s) : une par lot de la commission (même diplôme, même statut). Elles accompagnent les dossiers papier envoyés à la FP.
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex min-w-80 flex-1 flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-zinc-700">1. Choisissez la liste à afficher</span>
            <Liste
              value={choix}
              onChange={(e) => setChoix(e.target.value)}
              options={[
                ...donnees.listes.map((l, i) => ({
                  valeur: String(i),
                  libelle: `${l.lot ?? "Sans lot"} · ${l.diplome ?? "?"} · ${l.statut ?? "sans statut"} — ${l.lignes.length} candidat(s)`,
                })),
                ...(donnees.listes.length > 1 ? [{ valeur: "tout", libelle: `Toutes les listes de la transmission (${donnees.listes.length})` }] : []),
              ]}
            />
            <span className="text-[11px] text-zinc-500">
              {donnees.listes.length > 1
                ? "Cliquez pour choisir un lot : sa liste s’affiche juste en dessous, telle qu’elle sera imprimée. « Toutes les listes » les affiche l’une après l’autre."
                : "Cette transmission n’a qu’une seule liste : elle est affichée en dessous, telle qu’elle sera imprimée."}
            </span>
          </label>
          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-zinc-700">2. Imprimez ce qui est affiché</span>
            <Bouton variante="principal" onClick={() => window.print()}>
              Imprimer / Enregistrer en PDF
            </Bouton>
            <span className="text-[11px] text-zinc-500">
              {choix === "tout" ? `Les ${donnees.listes.length} listes seront imprimées.` : `Liste ${Number(choix) + 1} sur ${donnees.listes.length}.`}
            </span>
          </div>
        </div>
      </div>
      {affichees.map(({ l, i }) => (
        <ListeImprimee key={i} liste={l} donnees={donnees} />
      ))}
    </div>
  );
}
