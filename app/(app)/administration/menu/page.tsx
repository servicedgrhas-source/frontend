"use client";

import { ArrowDown, ArrowUp, FolderPlus, Layers, Plus, RotateCcw, Trash2, Undo2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "@/components/session";
import { Alerte, Annonce, Bouton, BoutonIcone, Carte, Chargement, EnTete, Liste, Saisie, Zone, cx, useConfirmation } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { appliquerMenu, ICONES_MENU, ICONES_ORIGINE, MENU_MODIFIE, ORIGINE_MENU, rubriqueDe, type ConfigMenu } from "@/lib/espaces";
import { peut } from "@/lib/libelles";
import { CLE_PERSO, construireMenu } from "@/lib/menu-config";

/** Une rubrique dans un domaine : son identifiant et sa sous-section. */
type Ligne = { r: string; g?: string };

/** Ce que l'on règle ici : l'emplacement de tout, les noms, les textes, ce qui est créé. */
interface Etat {
  menu: string[];
  poles: Record<string, string[]>;
  espaces: Record<string, Ligne[]>;
  noms: Record<string, string>;
  descriptions: Record<string, string>;
  icones: Record<string, string>;
  nouveaux: { poles: string[]; espaces: string[] };
  /** Sous-sections créées et pas encore remplies (non enregistrées tant qu'elles sont vides). */
  vides: Record<string, string[]>;
}

const ORIGINE_POLES = new Map(ORIGINE_MENU.poles.map((p) => [p.cle, p]));
const ORIGINE_ESPACES = new Map(ORIGINE_MENU.espaces.map((e) => [e.cle, e]));
const ORIGINE_RUBRIQUES = new Map(ORIGINE_MENU.espaces.flatMap((e) => e.rubriques.map((r) => [r.id, { ...r, espace: e.cle }] as const)));

/** Nom d'origine d'une entrée (« pole:rh », « espace:…», « rubrique:<id> ») ; vide pour ce qui est créé ici. */
function nomOrigine(cle: string) {
  const [genre, ...reste] = cle.split(":");
  const k = reste.join(":");
  if (genre === "pole") return ORIGINE_POLES.get(k)?.titre ?? "";
  if (genre === "espace") return ORIGINE_ESPACES.get(k)?.titre ?? "";
  return ORIGINE_RUBRIQUES.get(k)?.libelle ?? "";
}
const descriptionOrigine = (cle: string) => (cle.startsWith("pole:") ? ORIGINE_POLES.get(cle.slice(5))?.description : ORIGINE_ESPACES.get(cle.slice(7))?.description) ?? "";

/** L'état de l'écran à partir du réglage enregistré (le même calcul que le menu affiché). */
function depuisConfig(c: ConfigMenu | null): Etat {
  const m = construireMenu(ORIGINE_MENU, c);
  return {
    menu: [...m.menu],
    poles: Object.fromEntries(m.poles.map((p) => [p.cle, [...p.espaces]])),
    espaces: Object.fromEntries(m.espaces.map((e) => [e.cle, e.rubriques.map((r) => ({ r: r.id, ...(r.groupe ? { g: r.groupe } : {}) }))])),
    noms: Object.fromEntries([
      ...m.poles.map((p) => [`pole:${p.cle}`, p.titre]),
      ...m.espaces.map((e) => [`espace:${e.cle}`, e.titre]),
      ...m.espaces.flatMap((e) => e.rubriques.map((r) => [`rubrique:${r.id}`, r.libelle])),
    ]),
    descriptions: Object.fromEntries([...m.poles.map((p) => [`pole:${p.cle}`, p.description]), ...m.espaces.map((e) => [`espace:${e.cle}`, e.description])]),
    icones: Object.fromEntries([...m.poles.filter((p) => p.icone).map((p) => [`pole:${p.cle}`, p.icone!]), ...m.espaces.filter((e) => e.icone).map((e) => [`espace:${e.cle}`, e.icone!])]),
    nouveaux: { poles: m.poles.filter((p) => p.nouveau).map((p) => p.cle), espaces: m.espaces.filter((e) => e.nouveau).map((e) => e.cle) },
    vides: {},
  };
}

/** Ce qui part au serveur : l'emplacement complet, et seulement les noms et textes changés. */
function versConfig(e: Etat): ConfigMenu {
  const garder = (src: Record<string, string>, origine: (k: string) => string, perso: (k: string) => boolean) =>
    Object.fromEntries(
      Object.entries(src)
        .map(([k, v]) => [k, v.replace(/\s+/g, " ").trim()] as const)
        .filter(([k, v]) => v && (perso(k) || v !== origine(k))),
    );
  const estPerso = (k: string) => CLE_PERSO.test(k.split(":")[1] ?? "");
  return {
    version: 2,
    noms: garder(e.noms, nomOrigine, estPerso),
    descriptions: garder(e.descriptions, descriptionOrigine, estPerso),
    icones: Object.fromEntries(Object.entries(e.icones).filter(([k]) => estPerso(k))),
    nouveaux: e.nouveaux,
    structure: {
      menu: e.menu,
      poles: e.poles,
      espaces: Object.fromEntries(Object.entries(e.espaces).map(([k, l]) => [k, l.map((x) => ({ r: x.r, ...(x.g?.trim() ? { g: x.g.trim() } : {}) }))])),
    },
  };
}

/** Les sous-sections d'un domaine dans l'ordre (« » : sans sous-section), avec les vides créées. */
function groupesDe(e: Etat, espace: string) {
  const l = [...new Set(e.espaces[espace].map((x) => x.g?.trim() || ""))];
  for (const g of e.vides[espace] ?? []) if (!l.includes(g)) l.push(g);
  return l;
}
/** Rubriques regroupées par sous-section (les blocs restent d'un seul tenant). */
function regrouper(l: Ligne[], ordre: string[]) {
  return ordre.flatMap((g) => l.filter((x) => (x.g?.trim() || "") === g));
}
const deplacer = <T,>(l: T[], i: number, d: number) => {
  const j = i + d;
  if (i < 0 || j < 0 || j >= l.length) return l;
  const n = [...l];
  [n[i], n[j]] = [n[j], n[i]];
  return n;
};
const nouvelleCle = () => `perso-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/**
 * Administration › Menu : le DG ou l'administrateur range le menu comme il veut, sans toucher au
 * programme. Renommer ; déplacer une rubrique dans un autre domaine ; créer des sous-sections ;
 * déplacer un domaine dans une autre grande rubrique ou dans le menu principal ; créer des domaines
 * et des grandes rubriques. Les pages et les droits ne changent pas : seul leur rangement change.
 */
export default function MenuReglage() {
  const { profil } = useSession();
  const conf = useApi<ConfigMenu>("/menu/configuration");
  if (!peut.parametrer(profil.role)) return <Alerte>Réservé à l’administrateur et au DG.</Alerte>;
  if (conf.erreur) return <Alerte>{conf.erreur}</Alerte>;
  if (!conf.donnees) return <Chargement />;
  return <Edition key={JSON.stringify(conf.donnees)} depart={conf.donnees} recharger={conf.recharger} />;
}

function Edition({ depart, recharger }: { depart: ConfigMenu; recharger: () => void }) {
  const initial = useMemo(() => depuisConfig(depart), [depart]);
  const [e, setE] = useState<Etat>(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [confirmation, demander] = useConfirmation();
  // La partie du menu où l'on travaille (dernier bloc cliqué ou modifié) : l'aperçu l'ouvre et la montre
  const [actif, setActif] = useState<string | null>(null);
  const modifie = JSON.stringify(versConfig(e)) !== JSON.stringify(versConfig(initial)) || Object.values(e.vides).some((v) => v.length);

  // Quitter la page sans enregistrer : le navigateur prévient
  useEffect(() => {
    if (!modifie) return;
    const avant = (ev: BeforeUnloadEvent) => ev.preventDefault();
    window.addEventListener("beforeunload", avant);
    return () => window.removeEventListener("beforeunload", avant);
  }, [modifie]);

  const nom = (cle: string) => e.noms[cle] ?? nomOrigine(cle);
  const parentDe = (espace: string) => (e.menu.includes(`espace:${espace}`) ? "menu" : (Object.keys(e.poles).find((p) => e.poles[p].includes(espace)) ?? "menu"));
  const tousEspaces = [...e.menu.flatMap((m) => (m.startsWith("pole:") ? e.poles[m.slice(5)] ?? [] : [m.slice(7)]))];

  /* ---------------------------------- Modifications ---------------------------------- */

  const changer = (f: (x: Etat) => Etat) => setE((x) => f(x));
  const renommer = (cle: string, v: string) => changer((x) => ({ ...x, noms: { ...x.noms, [cle]: v } }));

  function deplacerDansParent(espace: string, d: number) {
    changer((x) => {
      const p = parentDe(espace);
      if (p === "menu") return { ...x, menu: deplacer(x.menu, x.menu.indexOf(`espace:${espace}`), d) };
      return { ...x, poles: { ...x.poles, [p]: deplacer(x.poles[p], x.poles[p].indexOf(espace), d) } };
    });
  }
  function placerEspace(espace: string, cible: string) {
    changer((x) => {
      const menu = x.menu.filter((m) => m !== `espace:${espace}`);
      const poles = Object.fromEntries(Object.entries(x.poles).map(([k, l]) => [k, l.filter((y) => y !== espace)]));
      if (cible === "menu") return { ...x, menu: [...menu, `espace:${espace}`], poles };
      return { ...x, menu, poles: { ...poles, [cible]: [...poles[cible], espace] } };
    });
  }
  function deplacerRubrique(espace: string, r: string, d: number) {
    changer((x) => {
      const l = x.espaces[espace];
      const i = l.findIndex((y) => y.r === r);
      const g = l[i].g?.trim() || "";
      // Au sein de sa sous-section : la précédente ou la suivante de la même sous-section
      let j = i + d;
      while (j >= 0 && j < l.length && (l[j].g?.trim() || "") !== g) j += d;
      if (j < 0 || j >= l.length) return x;
      const n = [...l];
      [n[i], n[j]] = [n[j], n[i]];
      return { ...x, espaces: { ...x.espaces, [espace]: n } };
    });
  }
  function changerGroupe(espace: string, r: string, g: string) {
    changer((x) => {
      const l = x.espaces[espace].map((y) => (y.r === r ? { r: y.r, ...(g ? { g } : {}) } : y));
      const ordre = groupesDe({ ...x, espaces: { ...x.espaces, [espace]: x.espaces[espace] } }, espace);
      return { ...x, espaces: { ...x.espaces, [espace]: regrouper(l, ordre.includes(g) ? ordre : [...ordre, g]) }, vides: { ...x.vides, [espace]: (x.vides[espace] ?? []).filter((v) => v !== g) } };
    });
  }
  function changerDomaine(de: string, r: string, vers: string) {
    changer((x) => {
      const ligne = x.espaces[de].find((y) => y.r === r)!;
      // Même sous-section dans le domaine d'arrivée si elle y existe, sinon sans sous-section
      const g = ligne.g && groupesDe(x, vers).includes(ligne.g) ? ligne.g : undefined;
      const arrivee = [...x.espaces[vers], { r, ...(g ? { g } : {}) }];
      return { ...x, espaces: { ...x.espaces, [de]: x.espaces[de].filter((y) => y.r !== r), [vers]: regrouper(arrivee, groupesDe({ ...x, espaces: { ...x.espaces, [vers]: arrivee } }, vers)) } };
    });
  }
  function renommerGroupe(espace: string, ancien: string, nouveau: string) {
    changer((x) => ({
      ...x,
      espaces: { ...x.espaces, [espace]: x.espaces[espace].map((y) => ((y.g?.trim() || "") === ancien ? { r: y.r, ...(nouveau ? { g: nouveau } : {}) } : y)) },
      vides: { ...x.vides, [espace]: (x.vides[espace] ?? []).map((v) => (v === ancien ? nouveau : v)) },
    }));
  }
  function deplacerGroupe(espace: string, g: string, d: number) {
    changer((x) => {
      const ordre = groupesDe(x, espace).filter((y) => y !== "");
      const i = ordre.indexOf(g);
      const n = deplacer(ordre, i, d);
      const sans = x.espaces[espace].some((y) => !y.g?.trim()) ? [""] : [];
      return { ...x, espaces: { ...x.espaces, [espace]: regrouper(x.espaces[espace], [...sans, ...n]) }, vides: { ...x.vides, [espace]: (x.vides[espace] ?? []).sort((a, b) => n.indexOf(a) - n.indexOf(b)) } };
    });
  }
  function supprimerGroupe(espace: string, g: string) {
    changer((x) => ({
      ...x,
      espaces: { ...x.espaces, [espace]: regrouper(x.espaces[espace].map((y) => ((y.g?.trim() || "") === g ? { r: y.r } : y)), groupesDe(x, espace).filter((v) => v !== g)) },
      vides: { ...x.vides, [espace]: (x.vides[espace] ?? []).filter((v) => v !== g) },
    }));
  }
  function ajouterGroupe(espace: string) {
    changer((x) => {
      const existants = groupesDe(x, espace);
      let n = 1;
      while (existants.includes(`Nouvelle sous-section${n > 1 ? ` ${n}` : ""}`)) n++;
      return { ...x, vides: { ...x.vides, [espace]: [...(x.vides[espace] ?? []), `Nouvelle sous-section${n > 1 ? ` ${n}` : ""}`] } };
    });
  }
  function ajouterEspace(parent: string) {
    const k = nouvelleCle();
    changer((x) => ({
      ...x,
      espaces: { ...x.espaces, [k]: [] },
      noms: { ...x.noms, [`espace:${k}`]: "Nouveau domaine" },
      descriptions: { ...x.descriptions, [`espace:${k}`]: "" },
      icones: { ...x.icones, [`espace:${k}`]: "Folder" },
      nouveaux: { ...x.nouveaux, espaces: [...x.nouveaux.espaces, k] },
      ...(parent === "menu" ? { menu: [...x.menu, `espace:${k}`] } : { poles: { ...x.poles, [parent]: [...x.poles[parent], k] } }),
    }));
  }
  function ajouterPole() {
    const k = nouvelleCle();
    changer((x) => ({
      ...x,
      poles: { ...x.poles, [k]: [] },
      menu: [...x.menu, `pole:${k}`],
      noms: { ...x.noms, [`pole:${k}`]: "Nouvelle rubrique" },
      descriptions: { ...x.descriptions, [`pole:${k}`]: "" },
      icones: { ...x.icones, [`pole:${k}`]: "Folder" },
      nouveaux: { ...x.nouveaux, poles: [...x.nouveaux.poles, k] },
    }));
  }
  function supprimerEspace(espace: string) {
    changer((x) => {
      const { [espace]: _vide, ...espaces } = x.espaces;
      void _vide;
      return {
        ...x,
        espaces,
        menu: x.menu.filter((m) => m !== `espace:${espace}`),
        poles: Object.fromEntries(Object.entries(x.poles).map(([k, l]) => [k, l.filter((y) => y !== espace)])),
        nouveaux: { ...x.nouveaux, espaces: x.nouveaux.espaces.filter((y) => y !== espace) },
      };
    });
  }
  function supprimerPole(pole: string) {
    changer((x) => {
      const { [pole]: _vide, ...poles } = x.poles;
      void _vide;
      return { ...x, poles, menu: x.menu.filter((m) => m !== `pole:${pole}`), nouveaux: { ...x.nouveaux, poles: x.nouveaux.poles.filter((y) => y !== pole) } };
    });
  }

  /* ---------------------------------- Enregistrer ---------------------------------- */

  async function enregistrer(c: ConfigMenu, texte: string) {
    setErreur(null);
    setEnvoi(true);
    try {
      const r = await api.put<ConfigMenu>("/menu/configuration", c);
      appliquerMenu(r);
      window.dispatchEvent(new Event(MENU_MODIFIE));
      setMessage(texte);
      recharger();
    } catch (x) {
      setErreur((x as Error).message);
    } finally {
      setEnvoi(false);
    }
  }
  async function valider() {
    const sansNom = [...e.nouveaux.poles.map((k) => `pole:${k}`), ...e.nouveaux.espaces.map((k) => `espace:${k}`)].filter((k) => !(e.noms[k] ?? "").trim());
    if (sansNom.length) return setErreur("Donnez un nom à chaque domaine et à chaque grande rubrique créés.");
    const longs = Object.values(e.noms).filter((v) => v.trim().length > 60);
    if (longs.length) return setErreur(`« ${longs[0].slice(0, 30)}… » : 60 caractères au plus pour un nom du menu.`);
    const groupesLongs = Object.values(e.espaces).flat().filter((x) => (x.g ?? "").trim().length > 60);
    if (groupesLongs.length) return setErreur("60 caractères au plus pour le nom d’une sous-section.");
    // Ce qui sera vide n'apparaîtra pas : on le dit avant d'enregistrer
    const domainesVides = Object.keys(e.espaces).filter((k) => !e.espaces[k].length).map((k) => `« ${nom(`espace:${k}`)} »`);
    const polesVides = Object.keys(e.poles).filter((k) => !e.poles[k].length).map((k) => `« ${nom(`pole:${k}`)} »`);
    const groupesVides = Object.entries(e.vides).flatMap(([, v]) => v).map((g) => `« ${g} »`);
    const avertir = [
      domainesVides.length ? `Domaine(s) sans rubrique, qui n’apparaîtront pas : ${domainesVides.join(", ")}.` : "",
      polesVides.length ? `Grande(s) rubrique(s) sans domaine, qui n’apparaîtront pas : ${polesVides.join(", ")}.` : "",
      groupesVides.length ? `Sous-section(s) vide(s), qui ne seront pas gardées : ${groupesVides.join(", ")}.` : "",
    ].filter(Boolean);
    if (avertir.length && !(await demander(`${avertir.join(" ")} Enregistrer quand même ?`, "Enregistrer"))) return;
    await enregistrer(versConfig(e), "Menu enregistré : il s’affiche ainsi pour tout le monde.");
  }

  /* ---------------------------------- Affichage ---------------------------------- */

  /** Le contenu d'un domaine dans l'aperçu : ses sous-sections et leurs rubriques, comme sur sa page. */
  const apercuDomaine = (espace: string) => {
    const l = e.espaces[espace] ?? [];
    if (!l.length) return <div className="mt-1 pl-3 text-[11px] text-white/50">Aucune rubrique : ce domaine sera caché</div>;
    return (
      <div className="mt-1 mb-1 space-y-1 border-l border-white/15 pl-3 text-[11.5px]">
        {groupesDe(e, espace)
          .filter((g) => l.some((x) => (x.g?.trim() || "") === g))
          .map((g) => (
            <div key={g || "sans"}>
              {g && <div className="text-[10px] font-semibold tracking-wider text-or-400 uppercase">{g}</div>}
              {l
                .filter((x) => (x.g?.trim() || "") === g)
                .map((x) => (
                  <div key={x.r} className="text-white/80">
                    – {nom(`rubrique:${x.r}`)}
                  </div>
                ))}
            </div>
          ))}
      </div>
    );
  };

  const optionsPlace = [{ valeur: "menu", libelle: "Dans le menu principal" }, ...e.menu.filter((m) => m.startsWith("pole:")).map((m) => ({ valeur: m.slice(5), libelle: `Dans « ${nom(m)} »` }))];
  const optionsDomaine = tousEspaces.map((k) => ({ valeur: k, libelle: nom(`espace:${k}`) }));
  const optionsIcone = Object.keys(ICONES_MENU).map((k) => ({ valeur: k, libelle: LIBELLES_ICONES[k] ?? k }));

  // Des fonctions, pas des composants : un composant déclaré ici serait recréé à chaque frappe (la saisie perdrait la main)
  const fleches = ({ haut, bas, monter, descendre, quoi }: { haut: boolean; bas: boolean; monter: () => void; descendre: () => void; quoi: string }) => (
    <span className="flex shrink-0">
      <BoutonIcone libelle={`Monter ${quoi}`} disabled={!haut} onClick={monter}>
        <ArrowUp />
      </BoutonIcone>
      <BoutonIcone libelle={`Descendre ${quoi}`} disabled={!bas} onClick={descendre}>
        <ArrowDown />
      </BoutonIcone>
    </span>
  );

  const description = (cle: string) => (
    <details className="mt-1">
      <summary className="cursor-pointer text-[12px] text-zinc-500 hover:text-marque-700">Texte de présentation (page d’accueil)</summary>
      <Zone className="mt-1 text-[13px]" rows={2} value={e.descriptions[cle] ?? ""} placeholder={descriptionOrigine(cle)} onChange={(ev) => changer((x) => ({ ...x, descriptions: { ...x.descriptions, [cle]: ev.target.value } }))} />
    </details>
  );

  const domaine = (espace: string, i: number, total: number) => {
    const cle = `espace:${espace}`;
    const perso = e.nouveaux.espaces.includes(espace);
    const groupes = groupesDe(e, espace);
    const lignes = e.espaces[espace];
    const I = (perso ? ICONES_MENU[e.icones[cle] ?? ""] : ICONES_ORIGINE[cle]) ?? Layers;
    return (
      <div
        key={espace}
        onPointerDownCapture={() => setActif(cle)}
        onFocusCapture={() => setActif(cle)}
        className={cx("rounded-2xl border bg-white p-3 transition-colors", actif === cle ? "border-marque-400 ring-2 ring-marque-200" : "border-zinc-200")}
      >
        <div className="flex flex-wrap items-center gap-2">
          {fleches({ quoi: "ce domaine", haut: i > 0, bas: i < total - 1, monter: () => deplacerDansParent(espace, -1), descendre: () => deplacerDansParent(espace, 1) })}
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-marque-50 text-marque-700">
            <I className="size-4" />
          </span>
          <Saisie aria-label="Nom du domaine" value={nom(cle)} placeholder={nomOrigine(cle) || "Nom du domaine"} onChange={(ev) => renommer(cle, ev.target.value)} className="max-w-xs min-w-48 flex-1 font-semibold" />
          {perso && <Liste aria-label="Icône" value={e.icones[cle] ?? "Folder"} options={optionsIcone} onChange={(ev) => changer((x) => ({ ...x, icones: { ...x.icones, [cle]: ev.target.value } }))} className="w-36" />}
          <Liste aria-label="Place du domaine" value={parentDe(espace)} options={optionsPlace} onChange={(ev) => placerEspace(espace, ev.target.value)} className="w-56" />
          <Bouton variante="discret" onClick={() => ajouterGroupe(espace)}>
            <Plus /> Sous-section
          </Bouton>
          {perso && (
            <BoutonIcone libelle={lignes.length ? "Videz d’abord ce domaine" : "Supprimer ce domaine"} ton="rouge" disabled={lignes.length > 0} onClick={() => supprimerEspace(espace)}>
              <Trash2 />
            </BoutonIcone>
          )}
        </div>
        {!perso && nom(cle) !== nomOrigine(cle) && <div className="mt-1 pl-[88px] text-[11px] text-zinc-400">au lieu de « {nomOrigine(cle)} »</div>}
        <div className="pl-[88px]">
          {description(cle)}
        </div>
        <div className="mt-2 space-y-2 pl-6">
          {!!lignes.length && (
            <div className="grid items-center gap-2 md:grid-cols-[auto_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)] hidden px-2 text-[11px] font-semibold tracking-wider text-zinc-400 uppercase md:grid">
              <span className="w-[68px]" />
              <span>Rubrique (page)</span>
              <span>Sous-section</span>
              <span>Domaine</span>
            </div>
          )}
          {!lignes.length && !groupes.length && <p className="rounded-xl bg-or-100/60 px-3 py-2 text-[12px] text-or-700">Domaine vide : il n’apparaîtra pas tant qu’aucune rubrique n’y est mise (menu « Domaine » d’une rubrique).</p>}
          {groupes.map((g) => {
            const dans = lignes.filter((x) => (x.g?.trim() || "") === g);
            const nommes = groupes.filter((y) => y !== "");
            const gi = nommes.indexOf(g);
            return (
              <div key={g || "sans"} className={cx(g && "rounded-xl bg-zinc-50 p-2 ring-1 ring-zinc-100")}>
                {g && (
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    {fleches({ quoi: "cette sous-section", haut: gi > 0, bas: gi < nommes.length - 1, monter: () => deplacerGroupe(espace, g, -1), descendre: () => deplacerGroupe(espace, g, 1) })}
                    <span className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">Sous-section</span>
                    <Saisie aria-label="Nom de la sous-section" defaultValue={g} onBlur={(ev) => ev.target.value.trim() && ev.target.value.trim() !== g && renommerGroupe(espace, g, ev.target.value.trim().slice(0, 60))} className="max-w-xs min-w-40 flex-1 text-[13px]" />
                    <BoutonIcone libelle="Supprimer la sous-section (ses rubriques restent dans le domaine)" ton="rouge" onClick={() => supprimerGroupe(espace, g)}>
                      <Trash2 />
                    </BoutonIcone>
                  </div>
                )}
                {g && !dans.length && <p className="px-2 py-1 text-[12px] text-zinc-500">Vide : choisissez cette sous-section dans le menu « Sous-section » d’une rubrique.</p>}
                {dans.map((x, j) => {
                  const o = ORIGINE_RUBRIQUES.get(x.r);
                  const rcle = `rubrique:${x.r}`;
                  return (
                    <div key={x.r} className="grid items-center gap-2 md:grid-cols-[auto_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)] py-1">
                      {fleches({ quoi: "cette rubrique", haut: j > 0, bas: j < dans.length - 1, monter: () => deplacerRubrique(espace, x.r, -1), descendre: () => deplacerRubrique(espace, x.r, 1) })}
                      <div className="min-w-0">
                        <Saisie aria-label="Nom de la rubrique" value={nom(rcle)} placeholder={nomOrigine(rcle)} title={nom(rcle)} onChange={(ev) => renommer(rcle, ev.target.value)} className="w-full min-w-0 text-[13px]" />
                        <div className="mt-0.5 truncate px-1 text-[11px] text-zinc-400" title={rubriqueDe(x.r)?.href}>
                          {o && o.espace !== espace ? `venue de « ${nomOrigine(`espace:${o.espace}`)} » · ` : ""}
                          {nom(rcle) !== nomOrigine(rcle) ? `au lieu de « ${nomOrigine(rcle)} »` : rubriqueDe(x.r)?.href}
                        </div>
                      </div>
                      <Liste aria-label="Sous-section" value={x.g?.trim() || ""} vide="Sans sous-section" options={groupes.filter((y) => y).map((y) => ({ valeur: y, libelle: y }))} onChange={(ev) => changerGroupe(espace, x.r, ev.target.value)} className="self-start text-[13px]" />
                      <Liste aria-label="Domaine" value={espace} options={optionsDomaine} onChange={(ev) => changerDomaine(espace, x.r, ev.target.value)} className="self-start text-[13px]" />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 pb-28">
      {confirmation}
      <EnTete
        titre="Menu"
        sousTitre="Rangez le menu comme vous le voulez, sans toucher au programme : renommez, déplacez une rubrique dans un autre domaine, créez des sous-sections (« Suivi des agents », « Recensement »…), déplacez un domaine dans une autre grande rubrique ou dans le menu principal, créez des domaines et des grandes rubriques. Les pages et les droits de chacun ne changent pas. Rien n’est enregistré avant « Enregistrer »."
      />
      <Annonce fermer={() => setMessage(null)}>{message}</Annonce>
      {erreur && <Alerte>{erreur}</Alerte>}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Carte titre="Le menu">
          <p className="-mt-2 mb-3 text-[12px] text-zinc-500">Après « Tableau de bord », « Dossiers à traiter » et « Alertes », qui restent en tête. Les flèches rangent ; les listes déplacent.</p>
          <div className="space-y-3">
            {e.menu.map((m, i) => {
              if (m.startsWith("espace:")) return <div key={m}>{domaine(m.slice(7), i, e.menu.length)}</div>;
              const pole = m.slice(5);
              const perso = e.nouveaux.poles.includes(pole);
              const I = (perso ? ICONES_MENU[e.icones[m] ?? ""] : ICONES_ORIGINE[m]) ?? Layers;
              return (
                <div key={m} onPointerDownCapture={() => setActif(m)} onFocusCapture={() => setActif(m)} className="rounded-3xl border-2 border-marque-200 bg-marque-50/40 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {fleches({ quoi: "cette grande rubrique", haut: i > 0, bas: i < e.menu.length - 1, monter: () => changer((x) => ({ ...x, menu: deplacer(x.menu, i, -1) })), descendre: () => changer((x) => ({ ...x, menu: deplacer(x.menu, i, 1) })) })}
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-marque-700 text-white">
                      <I className="size-[18px]" />
                    </span>
                    <Saisie aria-label="Nom de la grande rubrique" value={nom(m)} placeholder={nomOrigine(m) || "Nom de la grande rubrique"} onChange={(ev) => renommer(m, ev.target.value)} className="max-w-xs min-w-48 flex-1 text-[15px] font-semibold" />
                    {perso && <Liste aria-label="Icône" value={e.icones[m] ?? "Folder"} options={optionsIcone} onChange={(ev) => changer((x) => ({ ...x, icones: { ...x.icones, [m]: ev.target.value } }))} className="w-36" />}
                    <Bouton variante="discret" onClick={() => ajouterEspace(pole)}>
                      <FolderPlus /> Domaine
                    </Bouton>
                    {perso && (
                      <BoutonIcone libelle={e.poles[pole].length ? "Déplacez d’abord ses domaines" : "Supprimer cette grande rubrique"} ton="rouge" disabled={e.poles[pole].length > 0} onClick={() => supprimerPole(pole)}>
                        <Trash2 />
                      </BoutonIcone>
                    )}
                  </div>
                  <div className="pl-[88px]">
                    {description(m)}
                  </div>
                  <div className="mt-3 space-y-3 pl-4">
                    {!e.poles[pole].length && <p className="rounded-xl bg-or-100/60 px-3 py-2 text-[12px] text-or-700">Grande rubrique vide : elle n’apparaîtra pas tant qu’aucun domaine n’y est mis (« Domaine » ci-dessus, ou la place d’un domaine).</p>}
                    {e.poles[pole].map((k, j) => domaine(k, j, e.poles[pole].length))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-100 pt-4">
            <Bouton onClick={ajouterPole}>
              <Plus /> Grande rubrique
            </Bouton>
            <Bouton onClick={() => ajouterEspace("menu")}>
              <FolderPlus /> Domaine dans le menu principal
            </Bouton>
          </div>
        </Carte>

        {/* Aperçu : le menu de gauche tel qu'il sera ; la partie où l'on travaille s'y ouvre et s'éclaire */}
        <aside className="sticky top-4 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-3xl bg-nuit p-4 text-white shadow-doux">
          <div className="mb-3 text-[11px] font-semibold tracking-wider text-white/40 uppercase">Aperçu du menu</div>
          <div className="space-y-1 text-[13px]">
            {["Tableau de bord", "Dossiers à traiter", "Alertes"].map((t) => (
              <div key={t} className="rounded-lg px-2 py-1 text-white/50">
                {t}
              </div>
            ))}
            {e.menu.map((m) => {
              const vide = m.startsWith("pole:") ? !(e.poles[m.slice(5)] ?? []).some((k) => e.espaces[k]?.length) : !e.espaces[m.slice(7)]?.length;
              if (vide && actif !== m) return null;
              const ici = actif === m || (m.startsWith("pole:") && !!actif?.startsWith("espace:") && (e.poles[m.slice(5)] ?? []).includes(actif.slice(7)));
              return (
                <div key={m} ref={(el) => void (ici && el?.scrollIntoView({ block: "nearest" }))}>
                  <div className={cx("rounded-lg px-2 py-1 font-semibold", ici ? "bg-marque-600 text-white" : "bg-white/5")}>
                    {nom(m) || "—"}
                    {vide && <span className="ml-1 text-[11px] font-normal text-white/60">(vide : caché)</span>}
                  </div>
                  {m.startsWith("pole:") ? (
                    <div className="mt-0.5 mb-1 space-y-0.5 pl-3 text-[12px] text-white/60">
                      {e.poles[m.slice(5)]
                        .filter((k) => e.espaces[k]?.length || actif === `espace:${k}`)
                        .map((k) => (
                          <div key={k}>
                            <div className={cx("rounded px-1", actif === `espace:${k}` && "bg-white/15 font-semibold text-white")}>· {nom(`espace:${k}`)}</div>
                            {actif === `espace:${k}` && apercuDomaine(k)}
                          </div>
                        ))}
                    </div>
                  ) : (
                    actif === m && apercuDomaine(m.slice(7))
                  )}
                </div>
              );
            })}
          </div>
          {modifie && <div className="mt-3 rounded-lg bg-or-400/20 px-2 py-1.5 text-[12px] text-or-400">Modifié, pas encore enregistré</div>}
        </aside>
      </div>

      <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-end gap-3 rounded-2xl bg-white/95 px-5 py-3 shadow-lg ring-1 ring-zinc-200 backdrop-blur">
        {modifie && <span className="mr-auto text-[13px] font-medium text-or-700">Modifications non enregistrées</span>}
        <Bouton disabled={!modifie || envoi} onClick={() => setE(initial)}>
          <Undo2 /> Annuler les changements
        </Bouton>
        <Bouton
          disabled={envoi}
          onClick={async () => {
            if (!(await demander("Revenir au menu d’origine (noms, places, sous-sections ; les domaines et grandes rubriques créés sont retirés) pour tout le monde ?", "Rétablir"))) return;
            await enregistrer({ version: 2, noms: {} }, "Menu d’origine rétabli.");
          }}
        >
          <RotateCcw /> Rétablir le menu d’origine
        </Bouton>
        <Bouton variante="principal" chargement={envoi} disabled={envoi || !modifie} onClick={valider}>
          Enregistrer
        </Bouton>
      </div>
    </div>
  );
}

const LIBELLES_ICONES: Record<string, string> = {
  Folder: "Dossier",
  Users: "Personnes",
  Briefcase: "Mallette",
  ClipboardList: "Liste",
  FileText: "Document",
  BookOpen: "Livre",
  Building2: "Bâtiment",
  School: "École",
  Landmark: "Institution",
  Repeat: "Mouvement",
  Search: "Recherche",
  Settings: "Réglages",
};
