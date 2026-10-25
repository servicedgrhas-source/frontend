"use client";

import { ChevronRight, Plus, School, Search, UserRound } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useSession } from "@/components/session";
import { Alerte, Badge, Bouton, Carte, Chargement, EnTete, Saisie, Tableau, Vide, cx } from "@/components/ui";
import { useApi } from "@/lib/api";
import { peut } from "@/lib/libelles";

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
interface Detail {
  structure: {
    id: number;
    nom: string;
    sigle: string;
    type: string;
    departementId: number | null;
    posteResponsable: string;
    responsable: { id: number; nomComplet: string } | null;
    responsableInterim: boolean;
  };
  chemin: { id: number; nom: string; sigle: string }[];
  dessous: { id: number; nom: string; sigle: string; type: string }[];
  agents: { id: number; nomComplet: string; statut: string; fonction: string | null; enPoste: boolean; enseignant: boolean }[];
}

const TYPES: Record<string, string> = {
  MINISTERE: "Ministère",
  CABINET: "Cabinet",
  DIRECTION_GENERALE: "Direction générale",
  INSPECTION_GENERALE: "Inspection générale",
  DIRECTION_CENTRALE: "Direction centrale",
  SERVICE: "Service",
  BUREAU: "Bureau",
  DGRHAS: "DGRHAS",
  DIRECTION_DGRHAS: "Direction de la DGRHAS",
  SERVICE_DGRHAS: "Service de la DGRHAS",
  BUREAU_DGRHAS: "Bureau de la DGRHAS",
  DDEPPSA: "Direction départementale (DDEPPSA)",
  INSPECTION: "Inspection",
};
const STATUTS: Record<string, string> = { FONCTIONNAIRE: "Fonctionnaire", CONTRACTUEL: "Contractuel", VOLONTAIRE: "Volontaire", COMMUNAUTAIRE: "Communautaire" };
const cle = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase();

/**
 * Structures administratives (DG, 24/10/2026) : on entre par le haut (le cabinet du ministre, les
 * directions qui lui sont rattachées, les directions générales) et l'on descend jusqu'aux services
 * et aux bureaux ; côté départements, du DDEPPSA aux inspections. Chaque structure montre son
 * personnel, et l'on peut y enregistrer un agent comme dans une école.
 */
export default function Structures() {
  const { profil } = useSession();
  const arbre = useApi<Noeud[]>("/structures/arbre");
  const [choisie, setChoisie] = useState<number | null>(null);
  const [ouverts, setOuverts] = useState<Set<number>>(new Set());
  const [q, setQ] = useState("");
  const detail = useApi<Detail>(choisie ? `/structures/${choisie}/personnel` : null);

  const { racines, enfants, parId } = useMemo(() => {
    const l = arbre.donnees ?? [];
    const ids = new Set(l.map((x) => x.id));
    const enfants = new Map<number, Noeud[]>();
    for (const x of l)
      if (x.parentId && ids.has(x.parentId)) enfants.set(x.parentId, [...(enfants.get(x.parentId) ?? []), x]);
    return { racines: l.filter((x) => !x.parentId || !ids.has(x.parentId)), enfants, parId: new Map(l.map((x) => [x.id, x])) };
  }, [arbre.donnees]);
  // Total du personnel d'une structure et de tout ce qui est en dessous
  const total = useMemo(() => {
    const m = new Map<number, number>();
    const compter = (n: Noeud): number => {
      if (m.has(n.id)) return m.get(n.id)!;
      const t = n.agents + (enfants.get(n.id) ?? []).reduce((s, x) => s + compter(x), 0);
      m.set(n.id, t);
      return t;
    };
    (arbre.donnees ?? []).forEach(compter);
    return m;
  }, [arbre.donnees, enfants]);
  // Recherche : les structures trouvées et leurs structures au-dessus
  const visibles = useMemo(() => {
    const mots = cle(q).split(/\s+/).filter(Boolean);
    if (!mots.length) return null;
    const v = new Set<number>();
    for (const x of arbre.donnees ?? [])
      if (mots.every((m) => cle(`${x.nom} ${x.sigle}`).includes(m))) for (let y: Noeud | undefined = x; y && !v.has(y.id); y = y.parentId ? parId.get(y.parentId) : undefined) v.add(y.id);
    return v;
  }, [q, arbre.donnees, parId]);

  if (!peut.traiter(profil.role) && profil.role !== "DDEPPSA") return <Alerte>Accès réservé à la DGRHAS et aux DDEPPSA.</Alerte>;

  const basculer = (id: number) =>
    setOuverts((o) => {
      const n = new Set(o);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const ligne = (n: Noeud, profondeur: number): React.ReactNode => {
    if (visibles && !visibles.has(n.id)) return null;
    const sous = enfants.get(n.id) ?? [];
    const ouvert = ouverts.has(n.id) || !!visibles || profondeur === 0;
    return (
      <li key={n.id}>
        <div className={cx("flex items-center gap-1 rounded-lg pr-2", choisie === n.id ? "bg-marque-50" : "hover:bg-zinc-50")} style={{ paddingLeft: `${profondeur * 16}px` }}>
          <button
            type="button"
            aria-label={ouvert ? "Replier" : "Déplier"}
            disabled={!sous.length}
            onClick={() => basculer(n.id)}
            className="flex size-6 shrink-0 items-center justify-center rounded text-zinc-400 hover:text-encre disabled:opacity-0"
          >
            <ChevronRight className={cx("size-4 transition-transform", ouvert && "rotate-90")} />
          </button>
          <button type="button" onClick={() => setChoisie(n.id)} className="min-w-0 flex-1 py-1.5 text-left">
            <span className={cx("text-[13px]", choisie === n.id ? "font-semibold text-marque-700" : "font-medium text-encre")}>{n.sigle || n.nom}</span>
            {n.sigle && n.sigle !== n.nom && <span className="ml-2 truncate text-[11px] text-zinc-400">{n.nom}</span>}
          </button>
          <span className="shrink-0 text-[11px] text-zinc-400 tabular-nums" title="Agents de la structure et de ce qui en dépend">
            {(total.get(n.id) ?? 0).toLocaleString("fr-FR")} agent(s)
          </span>
        </div>
        {ouvert && !!sous.length && <ul>{sous.map((x) => ligne(x, profondeur + 1))}</ul>}
      </li>
    );
  };

  const d = detail.donnees;
  return (
    <div className="space-y-5">
      <EnTete
        titre="Structures administratives"
        sousTitre="Du cabinet du ministre aux services et aux bureaux, et des DDEPPSA aux inspections. On descend d’un niveau à l’autre ; cliquez sur une structure pour voir son personnel. Les écoles sont dans « Structures scolaires »."
      />
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Carte titre="Organisation">
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
            <Saisie value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher une structure (sigle ou nom)…" className="pl-9" />
          </div>
          {arbre.erreur && <Alerte>{arbre.erreur}</Alerte>}
          {!arbre.donnees ? <Chargement /> : !racines.length ? <Vide>Aucune structure dans votre périmètre.</Vide> : <ul className="max-h-[70vh] overflow-y-auto">{racines.map((r) => ligne(r, 0))}</ul>}
        </Carte>
        <div className="space-y-5">
          {!choisie ? (
            <Carte>
              <Vide>Choisissez une structure dans l’organisation pour voir son personnel.</Vide>
            </Carte>
          ) : detail.erreur ? (
            <Alerte>{detail.erreur}</Alerte>
          ) : !d ? (
            <Chargement />
          ) : (
            <>
              <Carte
                titre={d.structure.nom}
                actions={
                  <Link href={`/personnel/agents/nouveau?structure=${d.structure.id}`}>
                    <Bouton variante="principal">
                      <Plus /> Enregistrer un agent ici
                    </Bouton>
                  </Link>
                }
              >
                <div className="-mt-2 space-y-2 text-[13px]">
                  <div className="flex flex-wrap items-center gap-1 text-[12px] text-zinc-500">
                    {d.chemin.map((c) => (
                      <span key={c.id} className="inline-flex items-center gap-1">
                        <button type="button" className="hover:text-marque-700 hover:underline" onClick={() => setChoisie(c.id)}>
                          {c.sigle || c.nom}
                        </button>
                        <ChevronRight className="size-3" />
                      </span>
                    ))}
                    <strong className="text-encre">{d.structure.sigle || d.structure.nom}</strong>
                    <Badge ton="gris">{TYPES[d.structure.type] ?? d.structure.type}</Badge>
                  </div>
                  <div>
                    <span className="text-zinc-500">{d.structure.posteResponsable} : </span>
                    {d.structure.responsable ? (
                      <Link href={`/personnel/agents/${d.structure.responsable.id}`} className="font-medium text-marque-700 hover:underline">
                        {d.structure.responsable.nomComplet}
                      </Link>
                    ) : (
                      <span className="text-or-700">poste vacant</span>
                    )}
                    {d.structure.responsableInterim && <span className="text-zinc-500"> (intérim)</span>}
                  </div>
                  {!!d.dessous.length && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-zinc-500">En dessous :</span>
                      {d.dessous
                        .filter((x) => x.type !== "ETABLISSEMENT")
                        .map((x) => (
                          <button key={x.id} type="button" onClick={() => setChoisie(x.id)} className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[12px] font-medium hover:bg-marque-50 hover:text-marque-700">
                            {x.sigle || x.nom}
                          </button>
                        ))}
                      {d.dessous.some((x) => x.type === "ETABLISSEMENT") && (
                        <Link href="/ecoles" className="inline-flex items-center gap-1 rounded-full bg-marque-50 px-2.5 py-0.5 text-[12px] font-medium text-marque-700">
                          <School className="size-3.5" /> {d.dessous.filter((x) => x.type === "ETABLISSEMENT").length} école(s)
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </Carte>
              <Carte titre={`Personnel de la structure (${d.agents.length})`}>
                {!d.agents.length ? (
                  <Vide>Aucun agent rattaché à cette structure. Rattachez-les dans leur fiche (« Établissement ou structure de rattachement »), ou enregistrez-en un ici.</Vide>
                ) : (
                  <Tableau>
                    <thead>
                      <tr>
                        <th>Agent</th>
                        <th>Type</th>
                        <th>Fonction</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {d.agents.map((a) => (
                        <tr key={a.id} className={a.enPoste ? "" : "text-zinc-400"}>
                          <td>
                            <Link href={`/personnel/agents/${a.id}`} className="inline-flex items-center gap-1.5 font-medium text-marque-700 hover:underline">
                              <UserRound className="size-3.5 text-zinc-400" />
                              {a.nomComplet}
                            </Link>
                          </td>
                          <td className="text-[12px]">{STATUTS[a.statut] ?? a.statut}</td>
                          <td className="text-[12px]">{a.fonction ?? "—"}</td>
                          <td className="text-right">{!a.enPoste && <Badge ton="gris">pas à son poste</Badge>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Tableau>
                )}
              </Carte>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
