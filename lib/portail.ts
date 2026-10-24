import { API_URL } from "./api";

/** Appel du portail public (sans compte ni jeton). */
export async function appelPublic<T>(chemin: string, options: RequestInit = {}): Promise<T> {
  let rep: Response;
  try {
    rep = await fetch(`${API_URL}/portail${chemin}`, options);
  } catch {
    throw new Error("Connexion impossible. Vérifiez votre accès à Internet et réessayez.");
  }
  const texte = await rep.text();
  let corps: { message?: string | string[] } | null = null;
  try {
    corps = texte ? JSON.parse(texte) : null;
  } catch {
    throw new Error("Le service est momentanément indisponible. Réessayez dans quelques minutes.");
  }
  if (!rep.ok) {
    const m = corps?.message;
    throw new Error(Array.isArray(m) ? m.join(" ; ") : (m ?? `Erreur ${rep.status}`));
  }
  return corps as T;
}

export interface ReferencesPortail {
  departements: { id: number; nom: string }[];
  structures: { id: number; type: string; sigle: string; nom: string; parentId: number | null; departementId: number | null }[];
  types: { code: string; libelle: string; pieces: string[]; motif: string | null; decision: string; acte: string | null; mutation: boolean }[];
  motifs: { code: string; libelle: string }[];
  cycles: { code: string; libelle: string }[];
}
