"use client";

import { ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, School, Search, UsersRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "@/components/session";
import { Alerte, Bouton, Carte, Chargement, EnTete, Saisie, Vide, cx } from "@/components/ui";
import { useApi } from "@/lib/api";
import { peut } from "@/lib/libelles";
import { typeStructure } from "@/lib/structures";

interface Noeud {
  id: number;
  nom: string;
  sigle: string;
  type: string;
  parentId: number | null;
  departementId: number | null;
  ordre: number;
  agents: number;
  ecoles: number;
}

/** Regroupement des directions départementales sous le ministère (elles n'ont pas de structure au-dessus). */
const GROUPE_DDEPPSA = -1;
const CLE_OUVERTS = "dgrhas:structures-ouvertes";

const cle = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase();

/**
 * Structures administratives (DG, 26/10/2026) : l'organisation du ministère, du MEPPSA en haut
 * jusqu'aux bureaux et aux inspections, rangée par ordre de préséance. Chaque niveau se déplie et se
 * replie ; un clic sur une structure ouvre sa fiche (son responsable, ce qui en dépend, son personnel).
 */
export default function Structures() {
  const { profil } = useSession();
  const arbre = useApi<Noeud[]>("/structures/arbre");
  const [q, setQ] = useState("");
  // Ce que l'on a déplié (gardé pour le retour d'une fiche) ; rien de gardé : le haut de l'organisation
  const [garde, setOuverts] = useState<Set<number> | null>(() => {
    try {
      const l: unknown = JSON.parse(sessionStorage.getItem(CLE_OUVERTS) ?? "null");
      return Array.isArray(l) ? new Set(l.filter((x): x is number => typeof x === "number")) : null;
    } catch {
      return null;
    }
  });

  const { racines, enfants, parId } = useMemo(() => {
    const l = arbre.donnees ?? [];
    const ids = new Set(l.map((x) => x.id));
    const enfants = new Map<number, Noeud[]>();
    const ajouter = (p: number, x: Noeud) => enfants.set(p, [...(enfants.get(p) ?? []), x]);
    let racines = l.filter((x) => !x.parentId || !ids.has(x.parentId));
    for (const x of l) if (x.parentId && ids.has(x.parentId)) ajouter(x.parentId, x);
    // Les DDEPPSA sans structure au-dessus : rangées sous le ministère, après les directions générales
    const ministere = racines.find((x) => x.type === "MINISTERE");
    const ddeppsa = racines.filter((x) => x.type === "DDEPPSA");
    if (ministere && ddeppsa.length) {
      const groupe: Noeud = { id: GROUPE_DDEPPSA, nom: "Directions départementales de l’enseignement préscolaire, primaire, secondaire et de l’alphabétisation", sigle: "Directions départementales", type: "GROUPE", parentId: ministere.id, departementId: null, ordre: 0, agents: 0, ecoles: 0 };
      ajouter(ministere.id, groupe);
      enfants.set(GROUPE_DDEPPSA, ddeppsa);
      racines = racines.filter((x) => x.type !== "DDEPPSA");
    }
    const tous = [...l, ...(ministere && ddeppsa.length ? [{ id: GROUPE_DDEPPSA, parentId: ministere.id } as Noeud] : [])];
    const parId = new Map(tous.map((x) => [x.id, x]));
    for (const d of ddeppsa) if (ministere) parId.set(d.id, { ...d, parentId: GROUPE_DDEPPSA });
    // L'ordre est celui du serveur (le même que l'organigramme)
    return { racines, enfants, parId };
  }, [arbre.donnees]);

  // Personnel d'une structure et de tout ce qui en dépend
  const total = useMemo(() => {
    const m = new Map<number, number>();
    const compter = (id: number, propre: number): number => {
      if (m.has(id)) return m.get(id)!;
      const t = propre + (enfants.get(id) ?? []).reduce((s, x) => s + compter(x.id, x.agents), 0);
      m.set(id, t);
      return t;
    };
    for (const r of racines) compter(r.id, r.agents);
    return m;
  }, [racines, enfants]);

  const ouverts = useMemo(() => garde ?? new Set(racines.map((r) => r.id)), [garde, racines]);
  useEffect(() => {
    if (!garde) return;
    try {
      sessionStorage.setItem(CLE_OUVERTS, JSON.stringify([...garde]));
    } catch {
      // Stockage indisponible : l'arbre reste utilisable
    }
  }, [garde]);

  // Recherche : les structures trouvées, et celles au-dessus d'elles (dépliées)
  const { visibles, trouvees } = useMemo(() => {
    const mots = cle(q).split(/\s+/).filter(Boolean);
    if (!mots.length) return { visibles: null, trouvees: new Set<number>() };
    const v = new Set<number>();
    const t = new Set<number>();
    for (const x of arbre.donnees ?? [])
      if (mots.every((m) => cle(`${x.nom} ${x.sigle}`).includes(m))) {
        t.add(x.id);
        for (let y: Noeud | undefined = parId.get(x.id); y && !v.has(y.id); y = y.parentId ? parId.get(y.parentId) : undefined) v.add(y.id);
      }
    return { visibles: v, trouvees: t };
  }, [q, arbre.donnees, parId]);

  if (!peut.traiter(profil.role) && profil.role !== "DDEPPSA") return <Alerte>Accès réservé à la DGRHAS et aux DDEPPSA.</Alerte>;

  const basculer = (id: number) =>
    setOuverts(() => {
      const n = new Set(ouverts);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const toutDeplier = () => setOuverts(new Set([...enfants.keys()].filter((k) => enfants.get(k)?.length)));
  const toutReplier = () => setOuverts(new Set());

  const branche = (n: Noeud, profondeur: number): React.ReactNode => {
    if (visibles && !visibles.has(n.id)) return null;
    const sous = enfants.get(n.id) ?? [];
    const ouvert = !!sous.length && (!!visibles || ouverts.has(n.id));
    const t = typeStructure(n.type);
    const Icone = t.icone;
    const groupe = n.id === GROUPE_DDEPPSA;
    const agents = total.get(n.id) ?? n.agents;
    const titre = (
      <>
        <span className={cx("font-semibold text-encre", profondeur === 0 ? "text-[16px]" : "text-[14px]", trouvees.has(n.id) && "rounded bg-or-100 px-1")}>{n.sigle || n.nom}</span>
        {!groupe && n.sigle && n.sigle !== n.nom && <span className="block truncate text-[12px] text-zinc-500">{n.nom}</span>}
      </>
    );
    return (
      <li key={n.id} className={cx("relative", profondeur > 0 && "before:absolute before:top-7 before:-left-5 before:w-5 before:border-t-2 before:border-zinc-200")}>
        <div className={cx("group flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition-colors", profondeur === 0 ? "border-marque-200 bg-marque-50/60" : "border-zinc-200 bg-white hover:border-marque-300 hover:bg-marque-50/40")}>
          <button
            type="button"
            onClick={() => sous.length && basculer(n.id)}
            disabled={!sous.length}
            aria-label={ouvert ? "Replier" : "Déplier"}
            title={sous.length ? (ouvert ? "Replier" : `Déplier : ${sous.length} structure(s) en dessous`) : undefined}
            className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-encre disabled:cursor-default disabled:opacity-0"
          >
            {ouvert ? <ChevronDown className="size-5" /> : <ChevronRight className="size-5" />}
          </button>
          <span className={cx("flex shrink-0 items-center justify-center rounded-xl", t.pastille, profondeur === 0 ? "size-11" : "size-9")}>
            <Icone className={profondeur === 0 ? "size-5" : "size-[18px]"} />
          </span>
          {groupe ? (
            <button type="button" onClick={() => basculer(n.id)} className="min-w-0 flex-1 cursor-pointer text-left">
              {titre}
            </button>
          ) : (
            <Link href={`/structures/${n.id}`} className="min-w-0 flex-1" title="Ouvrir la fiche de la structure">
              {titre}
            </Link>
          )}
          <span className={cx("hidden shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium md:inline", t.etiquette)}>{groupe ? `${sous.length} départements` : t.libelle}</span>
          <span className="flex w-36 shrink-0 flex-col items-end gap-0.5 text-[12px] text-zinc-500 tabular-nums">
            <span className="inline-flex items-center gap-1" title="Agents de la structure et de tout ce qui en dépend">
              <UsersRound className="size-3.5" /> {agents.toLocaleString("fr-FR")} agent{agents > 1 ? "s" : ""}
            </span>
            {!!sous.length && <span>{sous.length} en dessous</span>}
            {!!n.ecoles && (
              <span className="inline-flex items-center gap-1">
                <School className="size-3.5" /> {n.ecoles.toLocaleString("fr-FR")} école{n.ecoles > 1 ? "s" : ""}
              </span>
            )}
          </span>
        </div>
        {ouvert && <ul className="mt-2 ml-7 space-y-2 border-l-2 border-zinc-200 pl-5">{sous.map((x) => branche(x, profondeur + 1))}</ul>}
      </li>
    );
  };

  return (
    <div className="space-y-5">
      <EnTete
        titre="Structures administratives"
        sousTitre="L’organisation du ministère, dans l’ordre de l’organigramme (Administration › Organigramme) : le MEPPSA, son cabinet, l’inspection générale, les directions générales, puis les directions départementales et leurs inspections. Dépliez un niveau avec la flèche ; cliquez sur une structure pour ouvrir sa fiche et son personnel. Les écoles sont dans « Structures scolaires »."
      />
      <Carte>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-64 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
            <Saisie value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher une structure (sigle ou nom)…" className="pl-9" />
          </div>
          <Bouton onClick={toutDeplier} disabled={!!visibles}>
            <ChevronsUpDown /> Tout déplier
          </Bouton>
          <Bouton onClick={toutReplier} disabled={!!visibles}>
            <ChevronsDownUp /> Tout replier
          </Bouton>
        </div>
        {arbre.erreur && <Alerte>{arbre.erreur}</Alerte>}
        {!arbre.donnees ? (
          <Chargement />
        ) : !racines.length ? (
          <Vide>Aucune structure dans votre périmètre.</Vide>
        ) : visibles && !visibles.size ? (
          <Vide>Aucune structure ne correspond à « {q} ».</Vide>
        ) : (
          <ul className="space-y-2">{racines.map((r) => branche(r, 0))}</ul>
        )}
      </Carte>
    </div>
  );
}
