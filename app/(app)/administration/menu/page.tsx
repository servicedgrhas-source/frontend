"use client";

import { ArrowDown, ArrowUp, RotateCcw } from "lucide-react";
import { useState } from "react";
import { useSession } from "@/components/session";
import { Alerte, Annonce, Bouton, BoutonIcone, Carte, Chargement, EnTete, Saisie, useConfirmation } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { appliquerMenu, MENU_MODIFIE, MENU_ORIGINE, type ConfigMenu } from "@/lib/espaces";
import { peut } from "@/lib/libelles";

/** Une entrée qu'on renomme et qu'on range : sa clé, son nom d'origine. */
interface Entree {
  cle: string;
  origine: string;
}

const deplacer = <T,>(l: T[], i: number, d: number) => {
  const j = i + d;
  if (j < 0 || j >= l.length) return l;
  const n = [...l];
  [n[i], n[j]] = [n[j], n[i]];
  return n;
};

/**
 * Le menu tel que le DG le veut (réunion du 24/10/2026) : renommer les rubriques du menu, les
 * domaines de « Personnel » et leurs volets, et les ranger. Les noms choisis valent pour tout le
 * monde ; « Rétablir » revient au menu d'origine.
 */
export default function MenuReglage() {
  const { profil } = useSession();
  const conf = useApi<ConfigMenu>("/menu/configuration");
  if (!peut.parametrer(profil.role)) return <Alerte>Réservé à l’administrateur et au DG.</Alerte>;
  if (conf.erreur) return <Alerte>{conf.erreur}</Alerte>;
  if (!conf.donnees) return <Chargement />;
  return <Edition depart={conf.donnees} recharger={conf.recharger} />;
}

function Edition({ depart, recharger }: { depart: ConfigMenu; recharger: () => void }) {
  const [noms, setNoms] = useState<Record<string, string>>(depart.noms);
  // L'ordre de chaque liste : celui enregistré, sinon celui d'origine
  const ordreDe = (liste: string, origine: string[]) => {
    const o = depart.ordres[liste];
    if (!o?.length) return origine;
    return [...origine].sort((a, b) => (o.indexOf(a) + 999) % 999 - (o.indexOf(b) + 999) % 999 || origine.indexOf(a) - origine.indexOf(b));
  };
  const [ordres, setOrdres] = useState<Record<string, string[]>>(() => ({
    menu: ordreDe("menu", MENU_ORIGINE.menu),
    ...Object.fromEntries(Object.entries(MENU_ORIGINE.poles).map(([k, p]) => [`pole:${k}`, ordreDe(`pole:${k}`, p.espaces)])),
    ...Object.fromEntries(Object.entries(MENU_ORIGINE.espaces).map(([k, e]) => [`espace:${k}`, ordreDe(`espace:${k}`, e.rubriques.map((r) => r.href))])),
  }));
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmation, demander] = useConfirmation();

  const origineDe = (cle: string): string => {
    const [genre, ...reste] = cle.split(":");
    const k = reste.join(":");
    if (genre === "pole") return MENU_ORIGINE.poles[k]?.titre ?? k;
    if (genre === "espace") return MENU_ORIGINE.espaces[k]?.titre ?? k;
    for (const e of Object.values(MENU_ORIGINE.espaces)) {
      const r = e.rubriques.find((x) => x.href === k);
      if (r) return r.libelle;
    }
    return k;
  };

  /** Ce qui part au serveur : seulement ce qui diffère du menu d'origine. */
  const config = (): ConfigMenu => {
    const n = Object.fromEntries(Object.entries(noms).filter(([k, v]) => v.trim() && v.trim() !== origineDe(k)).map(([k, v]) => [k, v.trim()]));
    const origine: Record<string, string[]> = {
      menu: MENU_ORIGINE.menu,
      ...Object.fromEntries(Object.entries(MENU_ORIGINE.poles).map(([k, p]) => [`pole:${k}`, p.espaces])),
      ...Object.fromEntries(Object.entries(MENU_ORIGINE.espaces).map(([k, e]) => [`espace:${k}`, e.rubriques.map((r) => r.href)])),
    };
    const o = Object.fromEntries(Object.entries(ordres).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(origine[k])));
    return { noms: n, ordres: o };
  };

  async function enregistrer(c: ConfigMenu, texte: string) {
    setErreur(null);
    try {
      const r = await api.put<ConfigMenu>("/menu/configuration", c);
      appliquerMenu(r);
      window.dispatchEvent(new Event(MENU_MODIFIE));
      setMessage(texte);
      recharger();
    } catch (e) {
      setErreur((e as Error).message);
    }
  }

  const ligne = (liste: string, cle: string, i: number, total: number, niveau: 1 | 2 | 3) => (
    <div key={cle} className="flex items-center gap-2 py-1" style={{ paddingLeft: `${(niveau - 1) * 20}px` }}>
      <span className="flex">
        <BoutonIcone libelle="Monter" disabled={i === 0} onClick={() => setOrdres((o) => ({ ...o, [liste]: deplacer(o[liste], i, -1) }))}>
          <ArrowUp />
        </BoutonIcone>
        <BoutonIcone libelle="Descendre" disabled={i === total - 1} onClick={() => setOrdres((o) => ({ ...o, [liste]: deplacer(o[liste], i, 1) }))}>
          <ArrowDown />
        </BoutonIcone>
      </span>
      <Saisie
        aria-label={`Nom de « ${origineDe(cle)} »`}
        value={noms[cle] ?? ""}
        placeholder={origineDe(cle)}
        onChange={(e) => setNoms((n) => ({ ...n, [cle]: e.target.value }))}
        className={niveau === 1 ? "max-w-md font-semibold" : "max-w-md"}
      />
      {noms[cle]?.trim() && noms[cle].trim() !== origineDe(cle) && <span className="text-[11px] text-zinc-400">au lieu de « {origineDe(cle)} »</span>}
    </div>
  );

  const entrees = (liste: string): Entree[] => ordres[liste].map((cle) => ({ cle, origine: origineDe(cle) }));

  return (
    <div className="space-y-5 pb-24">
      <EnTete
        titre="Menu"
        sousTitre="Renommez les rubriques du menu, les domaines et leurs volets, et rangez-les avec les flèches. Une case vide garde le nom d’origine (écrit en gris). Les noms choisis valent pour tout le monde."
      />
      <Annonce fermer={() => setMessage(null)}>{message}</Annonce>
      {erreur && <Alerte>{erreur}</Alerte>}

      <Carte titre="Rubriques du menu">
        <p className="-mt-2 mb-3 text-[12px] text-zinc-500">Après « Tableau de bord », « Dossiers à traiter » et « Alertes », qui restent en tête.</p>
        {entrees("menu").map((x, i, t) => ligne("menu", x.cle, i, t.length, 1))}
      </Carte>

      {Object.keys(MENU_ORIGINE.poles).map((p) => (
        <Carte key={p} titre={`Domaines de « ${noms[`pole:${p}`]?.trim() || MENU_ORIGINE.poles[p].titre} »`}>
          <p className="-mt-2 mb-3 text-[12px] text-zinc-500">Les cases de sa page d’accueil, dans cet ordre, et les volets de chaque domaine.</p>
          {ordres[`pole:${p}`].map((e, i, t) => (
            <div key={e} className="mb-2 rounded-xl bg-zinc-50/70 p-2 ring-1 ring-zinc-100">
              {ligne(`pole:${p}`, `espace:${e}`, i, t.length, 1)}
              {ordres[`espace:${e}`].map((r, j, u) => ligne(`espace:${e}`, `rubrique:${r}`, j, u.length, 2))}
            </div>
          ))}
        </Carte>
      ))}

      <Carte titre="Volets des autres rubriques">
        {MENU_ORIGINE.menu
          .filter((k) => k.startsWith("espace:"))
          .map((k) => k.slice(7))
          .map((e) => (
            <div key={e} className="mb-2 rounded-xl bg-zinc-50/70 p-2 ring-1 ring-zinc-100">
              <div className="px-2 py-1 text-[13px] font-semibold">{noms[`espace:${e}`]?.trim() || MENU_ORIGINE.espaces[e].titre}</div>
              {ordres[`espace:${e}`].map((r, j, u) => ligne(`espace:${e}`, `rubrique:${r}`, j, u.length, 2))}
            </div>
          ))}
      </Carte>

      <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-end gap-3 rounded-2xl bg-white/95 px-5 py-3 shadow-lg ring-1 ring-zinc-200 backdrop-blur">
        <Bouton
          onClick={async () => {
            if (!(await demander("Revenir au menu d’origine (noms et ordre) pour tout le monde ?", "Rétablir"))) return;
            setNoms({});
            setOrdres({
              menu: MENU_ORIGINE.menu,
              ...Object.fromEntries(Object.entries(MENU_ORIGINE.poles).map(([k, p]) => [`pole:${k}`, p.espaces])),
              ...Object.fromEntries(Object.entries(MENU_ORIGINE.espaces).map(([k, x]) => [`espace:${k}`, x.rubriques.map((r) => r.href)])),
            });
            await enregistrer({ noms: {}, ordres: {} }, "Menu d’origine rétabli.");
          }}
        >
          <RotateCcw /> Rétablir le menu d’origine
        </Bouton>
        <Bouton variante="principal" onClick={() => enregistrer(config(), "Menu enregistré : les nouveaux noms s’affichent pour tout le monde.")}>
          Enregistrer
        </Bouton>
      </div>
      {confirmation}
    </div>
  );
}
