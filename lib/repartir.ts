/**
 * Calculs de la répartition des personnes sans département (DG, 31/10/2026) : un chiffre saisi à la
 * main est « fixé », le reste est partagé à parts égales entre les cases encore libres, pour que le
 * total corresponde toujours au nombre de personnes à répartir.
 */

/** Partage `total` à parts égales entre `cles` (les premières reçoivent le reste de la division). */
export function partsEgales(cles: string[], total: number): Record<string, string> {
  const n = cles.length;
  if (!n) return {};
  const base = Math.floor(Math.max(0, total) / n);
  let reste = Math.max(0, total) - base * n;
  return Object.fromEntries(cles.map((k) => [k, String(base + (reste-- > 0 ? 1 : 0))]));
}

/**
 * Cases fixées gardées, le reste (`total` moins les cases fixées) partagé entre les cases libres.
 * Si les cases fixées dépassent déjà le total, les cases libres passent à 0.
 */
export function ajuster(cles: string[], valeurs: Record<string, string>, fixees: Set<string>, total: number): Record<string, string> {
  const libres = cles.filter((k) => !fixees.has(k));
  const pris = cles.filter((k) => fixees.has(k)).reduce((s, k) => s + (Number(valeurs[k]) || 0), 0);
  return { ...valeurs, ...partsEgales(libres, total - pris) };
}

/** Somme des valeurs (cases vides : 0). */
export function somme(valeurs: Record<string, string>, cles?: string[]) {
  return (cles ?? Object.keys(valeurs)).reduce((s, k) => s + (Number(valeurs[k]) || 0), 0);
}
