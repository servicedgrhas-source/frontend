/**
 * Le menu tel que l'administrateur ou le DG le veut (Administration › Menu) : où se trouve chaque
 * rubrique, ses sous-sections, ses domaines et ses grandes rubriques, avec leurs noms. Ce module ne
 * dépend de rien (ni React ni icônes) : il prend le menu d'origine (celui du programme) et le réglage
 * enregistré, et rend le menu à afficher.
 *
 * Il ne peut rien perdre : une rubrique absente du réglage (page ajoutée depuis, réglage abîmé)
 * revient à sa place d'origine ; une rubrique n'apparaît qu'une fois ; ce qui est inconnu est ignoré.
 */

/** Rubrique : son domaine d'origine suivi de son adresse (« personnel/personnel/presence »). */
export const idRubrique = (origine: string, href: string) => `${origine}${href}`;

export interface OrigineMenu {
  /** Entrées du menu après le tableau de bord, les dossiers et les alertes : « pole:rh », « espace:notes ». */
  menu: string[];
  poles: { cle: string; titre: string; description: string; espaces: string[] }[];
  espaces: { cle: string; titre: string; description: string; rubriques: { id: string; href: string; libelle: string; groupe?: string }[] }[];
}

/** Placement complet : chaque liste dans l'ordre. `g` : la sous-section de la rubrique. */
export interface StructureMenu {
  menu: string[];
  poles: Record<string, string[]>;
  espaces: Record<string, { r: string; g?: string }[]>;
}

export interface ConfigMenu {
  version?: number;
  /** « pole:rh », « espace:personnel », « rubrique:<id> » (ancien format : « rubrique:<adresse> ») → nom. */
  noms: Record<string, string>;
  /** Ancien format (noms et ordre seulement) : « menu », « pole:rh », « espace:… » → ordre. */
  ordres?: Record<string, string[]>;
  /** « pole:… », « espace:… » → texte de présentation de sa page d'accueil. */
  descriptions?: Record<string, string>;
  /** Icône des domaines et grandes rubriques créés ici (« pole:… », « espace:… » → nom d'icône). */
  icones?: Record<string, string>;
  /** Domaines et grandes rubriques créés ici (clés « perso-… »). */
  nouveaux?: { poles: string[]; espaces: string[] };
  structure?: StructureMenu;
}

export interface MenuConstruit {
  menu: string[];
  poles: { cle: string; titre: string; description: string; nouveau: boolean; icone?: string; espaces: string[] }[];
  espaces: { cle: string; titre: string; description: string; nouveau: boolean; icone?: string; rubriques: { id: string; libelle: string; groupe?: string }[] }[];
}

export const CLE_PERSO = /^perso-[a-z0-9-]{1,40}$/;
const nom = (t: unknown) => (typeof t === "string" ? t.replace(/\s+/g, " ").trim() : "");

/** Range une liste selon un ordre choisi ; ce qui n'y est pas se place après ce qui le précède à l'origine. */
export function ranger<T>(liste: T[], cle: (x: T) => string, ordre?: string[]) {
  if (!ordre?.length) return liste;
  const rang = new Map(ordre.map((k, i) => [k, i]));
  const rangees = liste.filter((x) => rang.has(cle(x))).sort((a, b) => rang.get(cle(a))! - rang.get(cle(b))!);
  liste.forEach((x, i) => {
    if (rang.has(cle(x))) return;
    const avant = i > 0 ? rangees.indexOf(liste[i - 1]) : -1;
    rangees.splice(avant + 1, 0, x);
  });
  return rangees;
}

/** Ancien réglage (noms et ordres) traduit en placement complet. */
function depuisOrdres(o: OrigineMenu, ordres: Record<string, string[]>): StructureMenu {
  // Des copies : modifier le placement ne touche jamais au menu d'origine
  return {
    menu: [...ranger(o.menu, (x) => x, ordres.menu)],
    poles: Object.fromEntries(o.poles.map((p) => [p.cle, [...ranger(p.espaces, (x) => x, ordres[`pole:${p.cle}`])]])),
    espaces: Object.fromEntries(
      o.espaces.map((e) => [
        e.cle,
        ranger(e.rubriques, (r) => r.href, ordres[`espace:${e.cle}`]).map((r) => ({ r: r.id, ...(r.groupe ? { g: r.groupe } : {}) })),
      ]),
    ),
  };
}

/** Le placement d'origine (celui du programme). */
export function structureOrigine(o: OrigineMenu): StructureMenu {
  return depuisOrdres(o, {});
}

/** Insère `x` dans `liste` juste après le premier de `avant` (le plus proche) qui y est ; sinon en tête. */
function insererApres<T>(liste: T[], x: T, avant: T[]) {
  for (let i = avant.length - 1; i >= 0; i--) {
    const k = liste.indexOf(avant[i]);
    if (k >= 0) {
      liste.splice(k + 1, 0, x);
      return;
    }
  }
  liste.unshift(x);
}

/** Le menu à afficher : le menu d'origine, arrangé selon le réglage (sans rien perdre). */
export function construireMenu(o: OrigineMenu, c: ConfigMenu | null | undefined): MenuConstruit {
  const noms = c?.noms ?? {};
  const desc = c?.descriptions ?? {};
  const icones = c?.icones ?? {};
  const s = c?.structure ?? depuisOrdres(o, c?.ordres ?? {});
  const persoEspaces = [...new Set((c?.nouveaux?.espaces ?? []).filter((k) => CLE_PERSO.test(k)))];
  const persoPoles = [...new Set((c?.nouveaux?.poles ?? []).filter((k) => CLE_PERSO.test(k)))];

  // Rubriques connues : leur domaine d'origine, leur place et leur sous-section d'origine
  const rubriques = new Map<string, { origine: string; libelle: string; href: string; groupe?: string; rang: number }>();
  for (const e of o.espaces) e.rubriques.forEach((r, i) => rubriques.set(r.id, { origine: e.cle, libelle: r.libelle, href: r.href, groupe: r.groupe, rang: i }));

  // 1. Les rubriques de chaque domaine, chacune une seule fois
  const cles = [...o.espaces.map((e) => e.cle), ...persoEspaces];
  const placees = new Set<string>();
  const contenu = new Map<string, { id: string; groupe?: string }[]>();
  for (const k of cles) {
    const l: { id: string; groupe?: string }[] = [];
    for (const x of s.espaces?.[k] ?? []) {
      if (!x || typeof x.r !== "string" || !rubriques.has(x.r) || placees.has(x.r)) continue;
      placees.add(x.r);
      const g = nom(x.g).slice(0, 60);
      l.push({ id: x.r, ...(g ? { groupe: g } : {}) });
    }
    contenu.set(k, l);
  }
  // Rubrique absente du réglage : à sa place d'origine, avec sa sous-section d'origine
  for (const e of o.espaces)
    e.rubriques.forEach((r, i) => {
      if (placees.has(r.id)) return;
      placees.add(r.id);
      const l = contenu.get(e.cle)!;
      const ids = l.map((x) => x.id);
      const avant = e.rubriques.slice(0, i).map((x) => x.id);
      let pos = 0;
      for (let j = avant.length - 1; j >= 0; j--) {
        const k = ids.indexOf(avant[j]);
        if (k >= 0) {
          pos = k + 1;
          break;
        }
      }
      l.splice(pos, 0, { id: r.id, ...(r.groupe ? { groupe: r.groupe } : {}) });
    });

  // 2. Les domaines de chaque grande rubrique, et le menu, chacun une seule fois
  const espacesConnus = new Set(cles);
  const polesConnus = [...o.poles.map((p) => p.cle), ...persoPoles];
  const espacesPlaces = new Set<string>();
  const polesDe = new Map<string, string[]>();
  for (const p of polesConnus) {
    const l: string[] = [];
    for (const e of s.poles?.[p] ?? []) {
      if (!espacesConnus.has(e) || espacesPlaces.has(e)) continue;
      espacesPlaces.add(e);
      l.push(e);
    }
    polesDe.set(p, l);
  }
  const menu: string[] = [];
  const polesPlaces = new Set<string>();
  for (const m of s.menu ?? []) {
    if (typeof m !== "string") continue;
    if (m.startsWith("pole:") && polesDe.has(m.slice(5)) && !polesPlaces.has(m.slice(5))) {
      polesPlaces.add(m.slice(5));
      menu.push(m);
    } else if (m.startsWith("espace:") && espacesConnus.has(m.slice(7)) && !espacesPlaces.has(m.slice(7))) {
      espacesPlaces.add(m.slice(7));
      menu.push(m);
    }
  }
  // Domaine d'origine non placé : dans sa grande rubrique d'origine, sinon dans le menu, à sa place
  for (const p of o.poles)
    p.espaces.forEach((e, i) => {
      if (espacesPlaces.has(e)) return;
      espacesPlaces.add(e);
      insererApres(polesDe.get(p.cle)!, e, p.espaces.slice(0, i));
    });
  o.menu.forEach((m, i) => {
    const avant = o.menu.slice(0, i);
    if (m.startsWith("espace:") && !espacesPlaces.has(m.slice(7))) {
      espacesPlaces.add(m.slice(7));
      insererApres(menu, m, avant);
    } else if (m.startsWith("pole:") && !polesPlaces.has(m.slice(5))) {
      polesPlaces.add(m.slice(5));
      insererApres(menu, m, avant);
    }
  });
  // Créés ici mais non placés : à la fin du menu
  for (const p of persoPoles) if (!polesPlaces.has(p)) menu.push(`pole:${p}`);
  for (const e of persoEspaces) if (!espacesPlaces.has(e)) menu.push(`espace:${e}`);

  const origineEspace = new Map(o.espaces.map((e) => [e.cle, e]));
  const originePole = new Map(o.poles.map((p) => [p.cle, p]));
  return {
    menu,
    poles: polesConnus.map((k) => {
      const p = originePole.get(k);
      return {
        cle: k,
        titre: nom(noms[`pole:${k}`]) || p?.titre || "Nouvelle rubrique",
        description: nom(desc[`pole:${k}`]) || p?.description || "",
        nouveau: !p,
        ...(icones[`pole:${k}`] ? { icone: icones[`pole:${k}`] } : {}),
        espaces: polesDe.get(k)!,
      };
    }),
    espaces: cles.map((k) => {
      const e = origineEspace.get(k);
      return {
        cle: k,
        titre: nom(noms[`espace:${k}`]) || e?.titre || "Nouveau domaine",
        description: nom(desc[`espace:${k}`]) || e?.description || "",
        nouveau: !e,
        ...(icones[`espace:${k}`] ? { icone: icones[`espace:${k}`] } : {}),
        rubriques: contenu.get(k)!.map((x) => {
          const r = rubriques.get(x.id)!;
          // Ancien format : le nom était rangé par adresse
          const libelle = nom(noms[`rubrique:${x.id}`]) || nom(noms[`rubrique:${r.href}`]) || r.libelle;
          return { id: x.id, libelle, ...(x.groupe ? { groupe: x.groupe } : {}) };
        }),
      };
    }),
  };
}
