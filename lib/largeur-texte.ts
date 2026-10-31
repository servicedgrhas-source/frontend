/**
 * Largeur d'un texte en Times New Roman (police des notes de service), sans le navigateur : pour
 * régler une colonne de la note sur son plus long mot (DG, 31/10/2026 : « Mathématiques » coupé).
 */
const LARGEURS: Record<string, number> = {
  " ": 250, ",": 250, ".": 250, "-": 333, "'": 333, "’": 333, "(": 333, ")": 333, "/": 278,
  a: 444, b: 500, c: 444, d: 500, e: 444, f: 333, g: 500, h: 500, i: 278, j: 278, k: 500, l: 278, m: 778,
  n: 500, o: 500, p: 500, q: 500, r: 333, s: 389, t: 278, u: 500, v: 500, w: 722, x: 500, y: 500, z: 444,
  A: 722, B: 667, C: 667, D: 722, E: 611, F: 556, G: 722, H: 722, I: 333, J: 389, K: 722, L: 611, M: 889,
  N: 722, O: 722, P: 556, Q: 722, R: 667, S: 556, T: 611, U: 722, V: 722, W: 944, X: 722, Y: 722, Z: 611,
};

/** Largeur (mm) d'un texte en Times New Roman, au corps donné (points). */
export function largeurTexte(texte: string, corps: number, gras = false) {
  let unites = 0;
  for (const ch of texte) {
    const base = ch.normalize("NFD")[0];
    unites += LARGEURS[base] ?? (/\d/.test(base) ? 500 : 556);
  }
  return ((unites / 1000) * corps * (gras ? 1.06 : 1) * 25.4) / 72;
}

/** Largeur (mm) du plus long mot des textes : on passe à la ligne aux espaces et après un trait d'union. */
export function plusLongMot(textes: (string | null | undefined)[], corps: number) {
  let max = 0;
  for (const t of textes)
    for (const mot of (t ?? "").split(/\s+/))
      for (const morceau of mot.match(/[^-]+-?|-/g) ?? []) max = Math.max(max, largeurTexte(morceau, corps));
  return max;
}
