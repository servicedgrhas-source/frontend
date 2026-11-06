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
      /** Reste sur sa page : la signature qui passe à la page suivante ne l'emmène pas (introduction). */
      ancre?: boolean;
    }
  /** Ligne d'un tableau : le tableau continue sur la page suivante, avec son en-tête. */
  | { cle: string; type: "ligne"; tableau: string; contenu: ReactNode };

export interface Tableau {
  colonnes: ReactNode;
  entete: ReactNode;
  className?: string;
  /**
   * L'en-tête n'est écrit qu'au début du tableau, pas en haut de chaque page où il continue
   * (notes de service, DG 31/10/2026 : le n° 37 suit le n° 36 directement).
   */
  enteteUneFois?: boolean;
}

interface Props {
  blocs: Bloc[];
  tableaux: Record<string, Tableau>;
  /** mention : une ligne en petite police sous le pied (ex. « Généré par le Système d’Information… »). */
  pied: { gauche: string; droite: string; mention?: string };
  /** Classe de la feuille (police, taille du texte). */
  classeFeuille: string;
  margeHaut?: number;
  margeCote?: number;
  margeBas?: number;
  /** Page A4 couchée (297 × 210 mm) : tableaux larges, emploi du temps affiché à l'école. */
  paysage?: boolean;
  /**
   * Tailles de police à essayer (1 : normale), via la variable CSS --echelle de la feuille. Une taille
   * plus petite ne sert que pour éviter une page presque vide ou tenir sur une seule page (06/11/2026).
   */
  echelles?: number[];
  /** Prévenu de la taille retenue (le Word de la note la reprend). */
  surEchelle?: (echelle: number) => void;
}

/**
 * Note d'une mise en page (plus petite = meilleure) : une page presque vide avant la dernière coûte
 * le plus ; ensuite, tenir sur une seule page. Une note longue bien remplie ne rapetisse pas juste
 * pour gagner une page.
 */
function noter(pages: string[][], hauteur: Map<string, number>, entete: Map<string, number>, dispo: number) {
  let creuses = 0;
  pages.forEach((p, i) => {
    if (i === pages.length - 1) return;
    const vus = new Set<string>();
    let h = 0;
    for (const c of p) {
      h += hauteur.get(c) ?? 0;
      const t = c.split("-")[0];
      if (entete.has(t) && !vus.has(t)) {
        vus.add(t);
        h += entete.get(t) ?? 0;
      }
    }
    if (h < dispo * 0.55) creuses++;
  });
  return creuses * 100 + (pages.length > 1 ? 50 : 0);
}

const HAUTEUR_PAGE = 296; // mm (un peu moins que 297 pour éviter une page blanche)
const HAUTEUR_PAYSAGE = 209;

/** Regroupe les lignes consécutives d'un même tableau dans un <table>. */
function rendre(blocs: Bloc[], tableaux: Record<string, Tableau>, mesure = false, premieres?: Set<string>) {
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
        {(!t.enteteUneFois || mesure || premieres?.has(b.cle)) && <thead data-entete={mesure ? b.tableau : undefined}>{t.entete}</thead>}
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

export function PagesA4({ blocs, tableaux, pied, classeFeuille, margeHaut = 12, margeCote = 16, margeBas = 20, paysage = false, echelles, surEchelle }: Props) {
  const mesureur = useRef<HTMLDivElement>(null);
  const sonde = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<string[][] | null>(null);
  const [echelle, setEchelle] = useState(1);
  const essais = (echelles?.length ? echelles : [1]).join("|");
  const uneFois = Object.keys(tableaux)
    .filter((t) => tableaux[t].enteteUneFois)
    .join("|");

  useLayoutEffect(() => {
    let actif = true;
    const decouper = () => {
      const zone = mesureur.current;
      if (!zone || !sonde.current || !actif) return;
      const dispo = sonde.current.offsetHeight * 0.985;
      let meilleur: { pages: string[][]; note: number; echelle: number } | null = null;
      for (const e of essais.split("|").map(Number)) {
        // Chaque taille est mesurée pour de vrai : le texte se recoupe autrement en lignes
        zone.style.setProperty("--echelle", String(e));
        const hauteur = new Map<string, number>();
        zone.querySelectorAll<HTMLElement>("[data-bloc]").forEach((el) => hauteur.set(el.dataset.bloc!, el.offsetHeight));
        zone.querySelectorAll<HTMLElement>("tbody > tr[data-ligne]").forEach((el) => hauteur.set(el.dataset.ligne!, el.offsetHeight));
        const entete = new Map<string, number>();
        zone.querySelectorAll<HTMLElement>("thead[data-entete]").forEach((el) => entete.set(el.dataset.entete!, el.offsetHeight));
        const p = decouperPages(blocs, hauteur, entete, dispo, new Set(uneFois ? uneFois.split("|") : []));
        const note = noter(p, hauteur, entete, dispo);
        // Une taille plus petite ne sert que si elle fait mieux
        if (!meilleur || note < meilleur.note) meilleur = { pages: p, note, echelle: e };
        if (note === 0) break;
      }
      setEchelle(meilleur!.echelle);
      surEchelle?.(meilleur!.echelle);
      setPages(meilleur!.pages);
    };
    // On attend les polices : leur taille change la hauteur des lignes
    void document.fonts.ready.then(decouper);
    return () => {
      actif = false;
    };
  }, [blocs, paysage, uneFois, essais]);

  const largeur = `${(paysage ? 297 : 210) - 2 * margeCote}mm`;
  const parCle = new Map(blocs.map((b) => [b.cle, b]));
  // Première ligne de chaque tableau : la seule qui porte l'en-tête d'un tableau « enteteUneFois »
  const premieres = new Set<string>();
  const vus = new Set<string>();
  for (const b of blocs)
    if (b.type === "ligne" && !vus.has(b.tableau)) {
      vus.add(b.tableau);
      premieres.add(b.cle);
    }

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
      {pages && echelle < 1 && (
        <div className="no-print mx-auto mb-2 w-fit rounded-full bg-sky-50 px-3 py-1 text-[12px] text-sky-800 ring-1 ring-sky-200">
          Police réduite à {Math.round(echelle * 100)} % pour que la note tienne sur {pages.length} page{pages.length > 1 ? "s" : ""} sans page presque vide.
        </div>
      )}
      {(pages ?? []).map((cles, i) => (
        <div
          key={i}
          className={`page-a4 ${paysage ? "page-a4-paysage " : ""}${classeFeuille}`}
          style={{ "--marge-haut": `${margeHaut}mm`, "--marge-cote": `${margeCote}mm`, "--echelle": String(echelle) } as React.CSSProperties}
        >
          {rendre(
            cles.map((c) => parCle.get(c)!),
            tableaux,
            false,
            premieres,
          )}
          <div className="pied-a4" style={{ left: `${margeCote}mm`, right: `${margeCote}mm` }}>
            <span>{pied.gauche}</span>
            {/* En gras (DG, 01/11/2026) */}
            <span className="text-center font-bold">
              Page {i + 1} sur {pages!.length}
            </span>
            <span className="text-right">{pied.droite}</span>
            {pied.mention && <span className="col-span-3 whitespace-normal text-center text-[6.5pt] italic text-zinc-500">{pied.mention}</span>}
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
