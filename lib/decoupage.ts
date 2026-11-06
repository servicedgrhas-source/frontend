/**
 * Découpage en pages A4, sans le navigateur : à partir de la hauteur mesurée de chaque bloc et de
 * chaque ligne de tableau, la liste des blocs de chaque page (utilisé par components/pages-a4.tsx).
 */
export type BlocMesure =
  | { cle: string; type: "libre"; garderAvecSuivant?: boolean; garderAvecPrecedent?: boolean; nouvellePage?: boolean; ancre?: boolean }
  | { cle: string; type: "ligne"; tableau: string };

export function decouperPages(
  blocs: BlocMesure[],
  hauteur: Map<string, number>,
  entete: Map<string, number>,
  dispo: number,
  /** Tableaux dont l'en-tête n'est écrit qu'une fois, au début (pas repris en haut de page). */
  enteteUneFois: Set<string> = new Set(),
): string[][] {
  const resultat: string[][] = [[]];
  let h = 0;
  let tableauOuvert: string | null = null;
  const commences = new Set<string>();
  const nouvellePage = () => {
    resultat.push([]);
    h = 0;
    tableauOuvert = null;
  };
  // Une ligne en haut de page reprend l'en-tête de son tableau
  const coutLigne = (b: Extract<BlocMesure, { type: "ligne" }>) =>
    (hauteur.get(b.cle) ?? 0) + (tableauOuvert === b.tableau || (enteteUneFois.has(b.tableau) && commences.has(b.tableau)) ? 0 : (entete.get(b.tableau) ?? 0));
  const parCle = new Map(blocs.map((x) => [x.cle, x]));
  /**
   * Ce qui part avec un bloc « garderAvecPrecedent » sur la page suivante : les blocs du même genre
   * juste avant lui, puis deux lignes de tableau (ou, sans tableau, le bloc d’avant), et les titres qui
   * la précédaient. Rien si la page se viderait.
   */
  const aEmmener = (page: string[]) => {
    let k = page.length;
    while (k > 0) {
      const x = parCle.get(page[k - 1])!;
      if (x.type === "libre" && x.garderAvecPrecedent) k--;
      else break;
    }
    if (!k) return [];
    // Deux lignes du tableau partent avec la signature (DG, 01/11/2026) ; s'il n'en resterait
    // qu'une, tout le tableau part, avec ses titres ; sans tableau, le bloc d'avant
    const derniere = parCle.get(page[k - 1])!;
    const suite = derniere.type === "ligne" ? suiteDe(page, k, derniere.tableau) : 0;
    let n = Math.min(2, suite) || 1;
    if (suite - n === 1) n = suite;
    return retirer(page, k - n);
  };
  /** Lignes du tableau à la fin de la page (jusqu'à l'indice k exclu). */
  const suiteDe = (page: string[], k: number, tableau: string) => {
    let suite = 0;
    while (k - suite > 0) {
      const x = parCle.get(page[k - 1 - suite])!;
      if (x.type === "ligne" && x.tableau === tableau) suite++;
      else break;
    }
    return suite;
  };
  /** Retire la fin de la page à partir de k, avec les titres juste avant ; rien si la page se viderait. */
  const retirer = (page: string[], k: number) => {
    while (k > 0) {
      const x = parCle.get(page[k - 1])!;
      // Un bloc « ancre » (l'introduction de la note) n'est jamais emmené : sans cela, une note d'une
      // seule ligne (un additif) laissait sa page 1 avec le seul en-tête (05/11/2026)
      if (x.type === "libre" && x.garderAvecSuivant && !x.ancre) k--;
      else break;
    }
    return k > 0 ? page.splice(k) : [];
  };
  // Lignes de chaque tableau qui restent à placer, à partir de chaque ligne
  const restantes = new Map<string, number>();
  const parTableau = new Map<string, number>();
  for (let i = blocs.length - 1; i >= 0; i--) {
    const b = blocs[i];
    if (b.type !== "ligne") continue;
    parTableau.set(b.tableau, (parTableau.get(b.tableau) ?? 0) + 1);
    restantes.set(b.cle, parTableau.get(b.tableau)!);
  }
  const premiereLigne = new Map<string, string>();
  for (const b of blocs) if (b.type === "ligne" && !premiereLigne.has(b.tableau)) premiereLigne.set(b.tableau, b.cle);
  /**
   * Au moins deux lignes d'un tableau de chaque côté d'un saut de page (DG, 01/11/2026) : si une
   * seule ligne passerait, on en emmène une de plus ; s'il n'en resterait qu'une en bas de page
   * (un tableau de deux lignes, par exemple), tout le tableau passe, avec son titre.
   */
  const coupure = (page: string[], b: Extract<BlocMesure, { type: "ligne" }>) => {
    const avant = suiteDe(page, page.length, b.tableau);
    let n = Math.max(0, 2 - restantes.get(b.cle)!);
    if (avant - n < 2) n = avant;
    if (!n) return [];
    return retirer(page, page.length - n);
  };
  /** Place sur la nouvelle page les blocs emmenés de la précédente. */
  const placer = (emmenes: string[]) => {
    for (const c of emmenes) {
      const x = parCle.get(c)!;
      if (x.type === "ligne") {
        if (premiereLigne.get(x.tableau) === c) commences.delete(x.tableau);
        h += coutLigne(x);
        tableauOuvert = x.tableau;
        commences.add(x.tableau);
      } else {
        h += hauteur.get(c) ?? 0;
        tableauOuvert = null;
      }
      resultat[resultat.length - 1].push(c);
    }
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
        placer(emmenes);
      }
      resultat[resultat.length - 1].push(b.cle);
      h += hauteur.get(b.cle) ?? 0;
      tableauOuvert = null;
    } else {
      if (h + coutLigne(b) > dispo && page.length) {
        const emmenes = coupure(page, b);
        nouvellePage();
        placer(emmenes);
      }
      h += coutLigne(b);
      resultat[resultat.length - 1].push(b.cle);
      tableauOuvert = b.tableau;
      commences.add(b.tableau);
    }
  });
  return resultat;
}
