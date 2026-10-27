/**
 * Découpage en pages A4, sans le navigateur : à partir de la hauteur mesurée de chaque bloc et de
 * chaque ligne de tableau, la liste des blocs de chaque page (utilisé par components/pages-a4.tsx).
 */
export type BlocMesure =
  | { cle: string; type: "libre"; garderAvecSuivant?: boolean; garderAvecPrecedent?: boolean; nouvellePage?: boolean }
  | { cle: string; type: "ligne"; tableau: string };

export function decouperPages(blocs: BlocMesure[], hauteur: Map<string, number>, entete: Map<string, number>, dispo: number): string[][] {
  const resultat: string[][] = [[]];
  let h = 0;
  let tableauOuvert: string | null = null;
  const nouvellePage = () => {
    resultat.push([]);
    h = 0;
    tableauOuvert = null;
  };
  // Une ligne en haut de page reprend l'en-tête de son tableau
  const coutLigne = (b: Extract<BlocMesure, { type: "ligne" }>) => (hauteur.get(b.cle) ?? 0) + (tableauOuvert === b.tableau ? 0 : (entete.get(b.tableau) ?? 0));
  const parCle = new Map(blocs.map((x) => [x.cle, x]));
  /**
   * Ce qui part avec un bloc « garderAvecPrecedent » sur la page suivante : les blocs du même genre
   * juste avant lui, une ligne de tableau, et les titres qui la précédaient. Rien si la page se viderait.
   */
  const aEmmener = (page: string[]) => {
    let k = page.length;
    while (k > 0) {
      const x = parCle.get(page[k - 1])!;
      if (x.type === "libre" && x.garderAvecPrecedent) k--;
      else break;
    }
    if (!k || parCle.get(page[k - 1])!.type !== "ligne") return [];
    k--;
    while (k > 0) {
      const x = parCle.get(page[k - 1])!;
      if (x.type === "libre" && x.garderAvecSuivant) k--;
      else break;
    }
    return k > 0 ? page.splice(k) : [];
  };
  blocs.forEach((b, i) => {
    const page = resultat[resultat.length - 1];
    if (b.type === "libre") {
      let besoin = hauteur.get(b.cle) ?? 0;
      const suivant = blocs[i + 1];
      if (b.garderAvecSuivant && suivant)
        besoin += suivant.type === "ligne" ? (hauteur.get(suivant.cle) ?? 0) + (entete.get(suivant.tableau) ?? 0) : (hauteur.get(suivant.cle) ?? 0);
      if ((b.nouvellePage || h + besoin > dispo) && page.length) {
        const emmenes = b.garderAvecPrecedent && !b.nouvellePage ? aEmmener(page) : [];
        nouvellePage();
        for (const c of emmenes) {
          const x = parCle.get(c)!;
          if (x.type === "ligne") {
            h += coutLigne(x);
            tableauOuvert = x.tableau;
          } else {
            h += hauteur.get(c) ?? 0;
            tableauOuvert = null;
          }
          resultat[resultat.length - 1].push(c);
        }
      }
      resultat[resultat.length - 1].push(b.cle);
      h += hauteur.get(b.cle) ?? 0;
      tableauOuvert = null;
    } else {
      if (h + coutLigne(b) > dispo && page.length) nouvellePage();
      h += coutLigne(b);
      resultat[resultat.length - 1].push(b.cle);
      tableauOuvert = b.tableau;
    }
  });
  return resultat;
}
