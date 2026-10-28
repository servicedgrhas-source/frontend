"use client";

import { Fragment, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { decouperPages } from "@/lib/decoupage";

/**
 * Découpage en pages A4 fait par le système (et non par le navigateur) :
 * chaque page porte son propre bas de page « objet | Page x sur y | MEPPSA ».
 * À l'impression, la marge de page est nulle : le navigateur n'ajoute plus
 * l'adresse du site, la date ni l'heure.
 */
export type Bloc =
  /** Bloc insécable (en-tête, paragraphe, signature…). */
  | {
      cle: string;
      type: "libre";
      contenu: ReactNode;
      garderAvecSuivant?: boolean;
      /**
       * Ne reste jamais seul en haut d'une page : s'il ne tient plus, il emmène avec lui la dernière
       * ligne du tableau (et son titre si c'était la seule). La signature d'une note n'est ainsi
       * jamais seule sur sa page (DG, 26/10/2026 : sinon on pourrait la recoller sous un autre texte).
       */
      garderAvecPrecedent?: boolean;
      /** Commence une nouvelle page (l'emploi du temps de chaque enseignant). */
      nouvellePage?: boolean;
    }
  /** Ligne d'un tableau : le tableau continue sur la page suivante, avec son en-tête. */
  | { cle: string; type: "ligne"; tableau: string; contenu: ReactNode };

export interface Tableau {
  colonnes: ReactNode;
  entete: ReactNode;
  className?: string;
}

interface Props {
  blocs: Bloc[];
  tableaux: Record<string, Tableau>;
  pied: { gauche: string; droite: string };
  /** Classe de la feuille (police, taille du texte). */
  classeFeuille: string;
  margeHaut?: number;
  margeCote?: number;
  margeBas?: number;
  /** Page A4 couchée (297 × 210 mm) : tableaux larges, emploi du temps affiché à l'école. */
  paysage?: boolean;
}

const HAUTEUR_PAGE = 296; // mm (un peu moins que 297 pour éviter une page blanche)
const HAUTEUR_PAYSAGE = 209;

/** Regroupe les lignes consécutives d'un même tableau dans un <table>. */
function rendre(blocs: Bloc[], tableaux: Record<string, Tableau>, mesure = false) {
  const sortie: ReactNode[] = [];
  for (let i = 0; i < blocs.length; ) {
    const b = blocs[i];
    if (b.type === "libre") {
      sortie.push(
        <div key={b.cle} data-bloc={b.cle} className="flow-root">
          {b.contenu}
        </div>,
      );
      i++;
      continue;
    }
    const lignes: Bloc[] = [];
    while (i < blocs.length && blocs[i].type === "ligne" && (blocs[i] as { tableau: string }).tableau === b.tableau) lignes.push(blocs[i++]);
    const t = tableaux[b.tableau];
    sortie.push(
      <table key={`${b.cle}-t`} className={t.className} style={{ tableLayout: "fixed", width: "100%" }}>
        {t.colonnes}
        <thead data-entete={mesure ? b.tableau : undefined}>{t.entete}</thead>
        <tbody>
          {lignes.map((l) => (
            <Fragment key={l.cle}>{l.contenu}</Fragment>
          ))}
        </tbody>
      </table>,
    );
  }
  return sortie;
}

export function PagesA4({ blocs, tableaux, pied, classeFeuille, margeHaut = 12, margeCote = 16, margeBas = 20, paysage = false }: Props) {
  const mesureur = useRef<HTMLDivElement>(null);
  const sonde = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<string[][] | null>(null);

  useLayoutEffect(() => {
    let actif = true;
    const decouper = () => {
      const zone = mesureur.current;
      if (!zone || !sonde.current || !actif) return;
      const dispo = sonde.current.offsetHeight * 0.985;
      const hauteur = new Map<string, number>();
      zone.querySelectorAll<HTMLElement>("[data-bloc]").forEach((el) => hauteur.set(el.dataset.bloc!, el.offsetHeight));
      zone.querySelectorAll<HTMLElement>("tbody > tr[data-ligne]").forEach((el) => hauteur.set(el.dataset.ligne!, el.offsetHeight));
      const entete = new Map<string, number>();
      zone.querySelectorAll<HTMLElement>("thead[data-entete]").forEach((el) => entete.set(el.dataset.entete!, el.offsetHeight));

      setPages(decouperPages(blocs, hauteur, entete, dispo));
    };
    // On attend les polices : leur taille change la hauteur des lignes
    void document.fonts.ready.then(decouper);
    return () => {
      actif = false;
    };
  }, [blocs, paysage]);

  const largeur = `${(paysage ? 297 : 210) - 2 * margeCote}mm`;
  const parCle = new Map(blocs.map((b) => [b.cle, b]));

  return (
    <>
      {/* Mesure invisible : même largeur et même police que la page */}
      {!pages && (
        <div aria-hidden className="pointer-events-none fixed top-0 left-[-10000px] opacity-0">
          <div ref={sonde} style={{ height: `${(paysage ? HAUTEUR_PAYSAGE : HAUTEUR_PAGE) - margeHaut - margeBas}mm` }} />
          <div ref={mesureur} className={classeFeuille} style={{ width: largeur }}>
            {rendre(blocs, tableaux, true)}
          </div>
        </div>
      )}
      {(pages ?? []).map((cles, i) => (
        <div
          key={i}
          className={`page-a4 ${paysage ? "page-a4-paysage " : ""}${classeFeuille}`}
          style={{ "--marge-haut": `${margeHaut}mm`, "--marge-cote": `${margeCote}mm` } as React.CSSProperties}
        >
          {rendre(
            cles.map((c) => parCle.get(c)!),
            tableaux,
          )}
          <div className="pied-a4" style={{ left: `${margeCote}mm`, right: `${margeCote}mm` }}>
            <span>{pied.gauche}</span>
            <span className="text-center">
              Page {i + 1} sur {pages!.length}
            </span>
            <span className="text-right">{pied.droite}</span>
          </div>
        </div>
      ))}
    </>
  );
}

/** À placer dans les pages d'impression : marge nulle, le système gère les marges. */
export function StyleImpressionA4({ paysage = false }: { paysage?: boolean }) {
  return <style>{`@page { size: A4 ${paysage ? "landscape" : "portrait"}; margin: 0; } @media print { html, body { margin: 0 !important; } }`}</style>;
}
