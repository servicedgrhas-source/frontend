"use client";

import { ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, ChevronUp, Download, GripVertical, PencilLine, Plus, Search, Trash2, TriangleAlert, UserRound } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "@/components/session";
import { Aide, Alerte, Annonce, Badge, Bouton, BoutonIcone, Carte, Champ, Chargement, EnTete, Liste, Modale, Saisie, Segments, ZoneFichier, cx, useConfirmation } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { peut } from "@/lib/libelles";
import { typeStructure } from "@/lib/structures";

interface Structure {
  id: number;
  type: string;
  sigle: string;
  nom: string;
  parentId: number | null;
  departementId: number | null;
  cycle: string | null;
  typeLocalite: string | null;
  localite: string | null;
  actif: boolean;
  /** 0 ministère, 1 cabinet, 2 directions générales, 3 directions centrales, 4 services et DDEPPSA, 5 inspections et bureaux, 6 écoles. */
  niveau: number | null;
  posteResponsable: string;
  responsable: { id: number; nom: string } | null;
  responsableInterim: boolean;
}

const CYCLES: Record<string, string> = {
  PRESCOLAIRE: "Préscolaire",
  PRIMAIRE: "Primaire",
  COLLEGE: "Collège (CEG)",
  LYCEE: "Lycée",
  ALPHABETISATION: "Alphabétisation",
};
const LOCALITES: Record<string, string> = { DISTRICT: "District", COMMUNE: "Commune", ARRONDISSEMENT: "Arrondissement" };

interface RapportImport {
  essai: boolean;
  lues: number;
  inspections: { creees: number; existantes: number; exemples: string[] };
  etablissements: { crees: number; misAJour: number; inchanges: number; exemples: string[] };
  sansInspection: number;
  sansCycle: number;
  ignorees: { raison: string; n: number; exemples: string[] }[];
}

const LIBELLES: Record<string, string> = {
  MINISTERE: "Ministère",
  CABINET: "Cabinet",
  ETABLISSEMENT: "Établissement scolaire",
  INSPECTION: "Inspection (circonscription)",
  DDEPPSA: "Direction départementale (DDEPPSA)",
  SERVICE: "Service",
  BUREAU: "Bureau",
  DIRECTION_CENTRALE: "Direction centrale",
  DIRECTION_GENERALE: "Direction générale",
  INSPECTION_GENERALE: "Inspection générale",
  ORGANISME_TUTELLE: "Organisme sous tutelle",
  BUREAU_DGRHAS: "Bureau de la DGRHAS",
  SERVICE_DGRHAS: "Service de la DGRHAS",
  DIRECTION_DGRHAS: "Direction de la DGRHAS",
  DGRHAS: "DGRHAS",
};
/** Structure supérieure attendue pour chaque type (voie hiérarchique). */
const PARENTS: Record<string, string[]> = {
  ETABLISSEMENT: ["INSPECTION", "DDEPPSA"],
  INSPECTION: ["DDEPPSA"],
  CABINET: ["MINISTERE"],
  DIRECTION_GENERALE: ["MINISTERE", "CABINET"],
  INSPECTION_GENERALE: ["MINISTERE"],
  ORGANISME_TUTELLE: ["MINISTERE", "CABINET"],
  DGRHAS: ["MINISTERE"],
  SERVICE: ["DIRECTION_CENTRALE", "DIRECTION_GENERALE", "INSPECTION_GENERALE", "ORGANISME_TUTELLE", "CABINET"],
  BUREAU: ["SERVICE"],
  DIRECTION_CENTRALE: ["DIRECTION_GENERALE", "INSPECTION_GENERALE", "ORGANISME_TUTELLE", "CABINET"],
  BUREAU_DGRHAS: ["SERVICE_DGRHAS"],
  SERVICE_DGRHAS: ["DIRECTION_DGRHAS", "DGRHAS"],
  DIRECTION_DGRHAS: ["DGRHAS"],
};
/** Ce que l'on peut ajouter sous une structure. */
const ENFANTS: Record<string, string> = {
  MINISTERE: "DIRECTION_GENERALE",
  CABINET: "DIRECTION_CENTRALE",
  INSPECTION_GENERALE: "DIRECTION_CENTRALE",
  ORGANISME_TUTELLE: "DIRECTION_CENTRALE",
  SERVICE: "BUREAU",
  DDEPPSA: "INSPECTION",
  INSPECTION: "ETABLISSEMENT",
  DIRECTION_GENERALE: "DIRECTION_CENTRALE",
  DIRECTION_CENTRALE: "SERVICE",
  DGRHAS: "DIRECTION_DGRHAS",
  DIRECTION_DGRHAS: "SERVICE_DGRHAS",
  SERVICE_DGRHAS: "BUREAU_DGRHAS",
};

type Edition = Partial<Structure> & { type: string };
/** Où l'on dépose la structure glissée : avant ou après une autre du même niveau, ou dessous (rattachement). */
type Zone = "avant" | "apres" | "dans";

const cle = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase();

/**
 * Organigramme : les structures par lesquelles passent les demandes. Le circuit d'une demande
 * se calcule en remontant d'une structure à sa structure supérieure. L'ordre réglé ici est celui
 * de toutes les pages (Structures administratives…). Le DG range une structure en la glissant
 * (poignée) avant ou après une autre, ou la rattache à une autre en la déposant dessus ; les
 * flèches restent possibles. Le déplacement s'affiche tout de suite, sans recharger la page.
 */
export default function Organigramme() {
  const { profil, refs } = useSession();
  const structures = useApi<Structure[]>("/structures");
  const comptes = useApi<{ structureId: number | null; actif: boolean }[]>(peut.administrer(profil.role) ? "/utilisateurs" : null);
  const [vue, setVue] = useState<"departements" | "centrale" | "dgrhas">("departements");
  const [departement, setDepartement] = useState(String(refs.departements[0]?.id ?? ""));
  const [edition, setEdition] = useState<Edition | null>(null);
  const [nomination, setNomination] = useState<Structure | null>(null);
  const [message, setMessage] = useState<{ ton: "vert" | "rouge"; texte: string } | null>(null);
  const [confirmation, demander] = useConfirmation();
  // Ordre affiché tout de suite après un déplacement, en attendant la liste relue du serveur
  const [local, setLocal] = useState<{ base: Structure[]; liste: Structure[] } | null>(null);
  // Dépliées ou repliées à la main ; sinon : tout déplié, sauf les écoles des inspections
  const [bascules, setBascules] = useState<Map<number, boolean>>(new Map());
  const [defaut, setDefaut] = useState<"auto" | "tout" | "rien">("auto");
  const [q, setQ] = useState("");
  const [glisse, setGlisse] = useState<number | null>(null);
  const [cible, setCible] = useState<{ id: number; zone: Zone } | null>(null);
  const [eclaire, setEclaire] = useState<number | null>(null);
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (minuterie.current && clearTimeout(minuterie.current)), []);
  const dg = peut.parametrer(profil.role);

  const liste = useMemo(() => (local && local.base === structures.donnees ? local.liste : (structures.donnees ?? [])), [local, structures.donnees]);
  const { parParent, parId } = useMemo(() => {
    const parParent = new Map<number | null, Structure[]>();
    for (const s of liste) parParent.set(s.parentId, [...(parParent.get(s.parentId) ?? []), s]);
    return { parParent, parId: new Map(liste.map((s) => [s.id, s])) };
  }, [liste]);

  if (!peut.traiter(profil.role)) return <Alerte>Accès réservé à la DGRHAS.</Alerte>;

  const enfants = (id: number) => parParent.get(id) ?? [];
  const nbComptes = (id: number) => (comptes.donnees ?? []).filter((c) => c.structureId === id && c.actif).length;
  const racines =
    vue === "departements"
      ? liste.filter((s) => s.type === "DDEPPSA" && String(s.departementId) === departement)
      : vue === "centrale"
        ? // Du ministère jusqu'aux bureaux ; à défaut, les directions générales sans supérieure
          liste.filter((s) => s.type === "MINISTERE" || (["DIRECTION_GENERALE", "INSPECTION_GENERALE", "ORGANISME_TUTELLE", "CABINET"].includes(s.type) && !s.parentId))
        : liste.filter((s) => s.type === "DGRHAS");
  // Structures de la voie hiérarchique sans aucun compte : leurs dossiers resteraient bloqués
  const sansCompte = comptes.donnees
    ? liste.filter((s) => s.actif && ["ETABLISSEMENT", "INSPECTION", "SERVICE", "DIRECTION_CENTRALE", "DIRECTION_GENERALE", "ORGANISME_TUTELLE", "BUREAU_DGRHAS", "SERVICE_DGRHAS", "DIRECTION_DGRHAS"].includes(s.type) && !nbComptes(s.id))
    : [];
  // Écoles et inspections rattachées directement au département (sans structure supérieure)
  const orphelines = vue === "departements" ? liste.filter((s) => ["INSPECTION", "ETABLISSEMENT"].includes(s.type) && !s.parentId && String(s.departementId) === departement) : [];

  /** Structures rangées ensemble (même supérieure ; sans supérieure : même type et même département). */
  const freresDe = (s: Structure) => (s.parentId ? enfants(s.parentId) : liste.filter((x) => !x.parentId && x.type === s.type && x.departementId === s.departementId));
  const memeRang = (a: Structure, b: Structure) => (a.parentId ? a.parentId === b.parentId : !b.parentId && a.type === b.type && a.departementId === b.departementId);
  const dependDe = (s: Structure, de: Structure) => {
    for (let x: Structure | undefined = s, k = 0; x && k < 20; k++, x = x.parentId ? parId.get(x.parentId) : undefined) if (x.id === de.id) return true;
    return false;
  };
  const peutRattacher = (s: Structure, sous: Structure) => (PARENTS[s.type] ?? []).includes(sous.type) && sous.id !== s.parentId && !dependDe(sous, s);

  // Recherche : les structures trouvées et celles au-dessus d'elles (dépliées)
  const mots = cle(q).split(/\s+/).filter(Boolean);
  const visibles = mots.length ? new Set<number>() : null;
  const trouvees = new Set<number>();
  if (visibles)
    for (const s of liste)
      if (mots.every((m) => cle(`${s.sigle} ${s.nom} ${s.localite ?? ""}`).includes(m))) {
        trouvees.add(s.id);
        for (let x: Structure | undefined = s, k = 0; x && k < 20 && !visibles.has(x.id); k++, x = x.parentId ? parId.get(x.parentId) : undefined) visibles.add(x.id);
      }
  const estOuvert = (s: Structure, profondeur: number) =>
    !!visibles || (bascules.get(s.id) ?? (defaut === "tout" ? true : defaut === "rien" ? false : vue !== "departements" || profondeur < 1));
  const basculer = (s: Structure, profondeur: number) => setBascules((m) => new Map(m).set(s.id, !estOuvert(s, profondeur)));

  function eclairer(id: number) {
    setEclaire(id);
    if (minuterie.current) clearTimeout(minuterie.current);
    minuterie.current = setTimeout(() => setEclaire(null), 1800);
  }
  const erreur = (e: unknown) => {
    setLocal(null);
    setMessage({ ton: "rouge", texte: (e as Error).message });
    structures.recharger();
  };

  /** Range une structure à une position parmi celles du même niveau (affiché tout de suite). */
  async function ranger(s: Structure, position: number) {
    const freres = freresDe(s);
    const i = freres.findIndex((x) => x.id === s.id);
    if (i < 0 || position === i || !structures.donnees) return;
    const nouveau = [...freres];
    nouveau.splice(position, 0, ...nouveau.splice(i, 1));
    // Les mêmes places dans la liste, occupées dans le nouvel ordre
    const ids = new Set(freres.map((x) => x.id));
    const l = [...liste];
    let k = 0;
    for (let j = 0; j < l.length; j++) if (ids.has(l[j].id)) l[j] = nouveau[k++];
    setLocal({ base: structures.donnees, liste: l });
    eclairer(s.id);
    try {
      await api.post(`/structures/${s.id}/deplacer`, { position });
    } catch (e) {
      erreur(e);
    }
  }

  /** Rattache une structure sous une autre (sa demande montera ensuite vers elle), après confirmation. */
  async function rattacher(s: Structure, sous: Structure) {
    const ancien = s.parentId ? parId.get(s.parentId) : undefined;
    const ok = await demander(
      `Rattacher « ${s.sigle} » sous « ${sous.sigle} »${ancien ? ` (au lieu de « ${ancien.sigle} »)` : ""} ? Ses demandes monteront ensuite vers ${sous.sigle}.`,
      "Oui, rattacher",
    );
    if (!ok || !structures.donnees) return;
    const deplacee = { ...s, parentId: sous.id, departementId: sous.departementId ?? s.departementId };
    setLocal({ base: structures.donnees, liste: [...liste.filter((x) => x.id !== s.id), deplacee] });
    setBascules((m) => new Map(m).set(sous.id, true));
    eclairer(s.id);
    try {
      await api.put(`/structures/${s.id}`, {
        type: s.type,
        nom: s.nom,
        sigle: s.sigle,
        parentId: sous.id,
        departementId: deplacee.departementId,
        cycle: s.cycle,
        typeLocalite: s.typeLocalite,
        localite: s.localite,
        actif: s.actif,
      });
      setMessage({ ton: "vert", texte: `« ${s.sigle} » est maintenant rattachée à « ${sous.sigle} ».` });
    } catch (e) {
      erreur(e);
    }
  }

  /** Zone de dépôt sous le pointeur, ou rien si ce dépôt n'est pas permis. */
  function zoneSous(e: React.DragEvent, t: Structure): Zone | null {
    const s = glisse ? parId.get(glisse) : undefined;
    if (!s || s.id === t.id) return null;
    const r = e.currentTarget.getBoundingClientRect();
    const y = (e.clientY - r.top) / r.height;
    const voisin = memeRang(s, t);
    const dans = peutRattacher(s, t);
    if (voisin && (!dans || y < 0.3 || y > 0.7)) return y < 0.5 ? "avant" : "apres";
    return dans ? "dans" : null;
  }
  function deposer(t: Structure, zone: Zone) {
    const s = glisse ? parId.get(glisse) : undefined;
    setGlisse(null);
    setCible(null);
    if (!s) return;
    if (zone === "dans") return void rattacher(s, t);
    const autres = freresDe(s).filter((x) => x.id !== s.id);
    const j = autres.findIndex((x) => x.id === t.id);
    void ranger(s, zone === "avant" ? j : j + 1);
  }

  const branche = (s: Structure, profondeur: number): React.ReactNode => {
    if (visibles && !visibles.has(s.id)) return null;
    const sous = enfants(s.id);
    const ouvert = !!sous.length && estOuvert(s, profondeur);
    const n = nbComptes(s.id);
    const t = typeStructure(s.type);
    const Icone = t.icone;
    const freres = freresDe(s);
    const i = freres.findIndex((x) => x.id === s.id);
    const ici = cible?.id === s.id ? cible.zone : null;
    return (
      <li key={s.id} className={cx("relative", profondeur > 0 && "before:absolute before:top-7 before:-left-5 before:w-5 before:border-t-2 before:border-zinc-200")}>
        {ici === "avant" && <span className="pointer-events-none absolute -top-1.5 right-0 left-0 z-10 h-1 rounded-full bg-marque-500" />}
        <div
          onDragOver={(e) => {
            const z = zoneSous(e, s);
            if (!z) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            if (cible?.id !== s.id || cible.zone !== z) setCible({ id: s.id, zone: z });
          }}
          onDrop={(e) => {
            const z = zoneSous(e, s);
            if (!z) return;
            e.preventDefault();
            deposer(s, z);
          }}
          className={cx(
            "group relative flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border px-3 py-2 transition-[background-color,box-shadow,opacity] duration-300",
            s.actif ? "border-zinc-200 bg-white" : "border-zinc-200 bg-zinc-50 text-zinc-400",
            glisse === s.id && "opacity-40",
            ici === "dans" && "border-marque-500 bg-marque-50 ring-2 ring-marque-500",
            eclaire === s.id && "bg-or-100 ring-2 ring-or-400",
          )}
        >
          {dg && (
            <span
              draggable
              onDragStart={(e) => {
                setGlisse(s.id);
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", String(s.id));
                const ligne = e.currentTarget.parentElement;
                if (ligne) e.dataTransfer.setDragImage(ligne, 24, 24);
              }}
              onDragEnd={() => {
                setGlisse(null);
                setCible(null);
              }}
              title="Glisser pour ranger avant ou après une autre, ou déposer sur une structure pour l’y rattacher"
              className="flex h-9 w-5 shrink-0 cursor-grab items-center justify-center rounded text-zinc-300 hover:bg-zinc-100 hover:text-zinc-600 active:cursor-grabbing"
            >
              <GripVertical className="size-4" />
            </span>
          )}
          <button
            type="button"
            onClick={() => sous.length && basculer(s, profondeur)}
            disabled={!sous.length}
            aria-label={ouvert ? "Replier" : "Déplier"}
            title={sous.length ? (ouvert ? "Replier" : `Déplier : ${sous.length} en dessous`) : undefined}
            className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-encre disabled:cursor-default disabled:opacity-0"
          >
            {ouvert ? <ChevronDown className="size-5" /> : <ChevronRight className="size-5" />}
          </button>
          <span className={cx("flex size-9 shrink-0 items-center justify-center rounded-xl", t.pastille)}>
            <Icone className="size-[18px]" />
          </span>
          <div className="min-w-0 flex-1 basis-60">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <strong className={cx("text-[14px]", trouvees.has(s.id) && "rounded bg-or-100 px-1")}>{s.sigle}</strong>
              {s.nom !== s.sigle && <span className="min-w-0 truncate text-[12px] text-zinc-500">{s.nom}</span>}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-zinc-500">
              <span>
                {s.posteResponsable} :{" "}
                {s.responsable ? (
                  <Link href={`/personnel/agents/${s.responsable.id}`} className="font-medium text-encre hover:underline">
                    {s.responsable.nom}
                    {s.responsableInterim ? " (intérim)" : ""}
                  </Link>
                ) : (
                  <span className="text-or-700">poste vacant</span>
                )}
              </span>
              {comptes.donnees && <span className={n ? "text-marque-700" : "text-or-700"}>{n ? `${n} compte(s)` : "aucun compte"}</span>}
              {s.cycle && <span>{CYCLES[s.cycle] ?? s.cycle}</span>}
              {s.localite && (
                <span>
                  {s.typeLocalite ? `${LOCALITES[s.typeLocalite]} : ` : ""}
                  {s.localite}
                </span>
              )}
              {!!sous.length && !ouvert && <span>{sous.length} en dessous</span>}
            </div>
          </div>
          <span className={cx("hidden shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium md:inline", t.etiquette)}>{LIBELLES[s.type] ?? t.libelle}</span>
          {!s.actif && <Badge ton="rouge">désactivée</Badge>}
          {dg && (
            <span className="flex shrink-0 gap-0.5">
              <BoutonIcone libelle={`Responsable : ${s.posteResponsable}`} onClick={() => setNomination(s)}>
                <UserRound />
              </BoutonIcone>
              {freres.length > 1 && (
                <>
                  <BoutonIcone libelle="Monter (avant la précédente)" disabled={i <= 0} onClick={() => ranger(s, i - 1)}>
                    <ChevronUp />
                  </BoutonIcone>
                  <BoutonIcone libelle="Descendre (après la suivante)" disabled={i >= freres.length - 1} onClick={() => ranger(s, i + 1)}>
                    <ChevronDown />
                  </BoutonIcone>
                </>
              )}
              {ENFANTS[s.type] && (
                <BoutonIcone libelle={`Ajouter : ${LIBELLES[ENFANTS[s.type]]}`} onClick={() => setEdition({ type: ENFANTS[s.type], parentId: s.id, departementId: s.departementId })}>
                  <Plus />
                </BoutonIcone>
              )}
              <BoutonIcone libelle="Modifier" onClick={() => setEdition({ ...s })}>
                <PencilLine />
              </BoutonIcone>
              {!["DGRHAS", "DDEPPSA"].includes(s.type) && (
                <BoutonIcone
                  libelle="Supprimer"
                  ton="rouge"
                  onClick={async () => {
                    if (!(await demander(`Supprimer « ${s.sigle} » de l’organigramme ?`, "Oui, supprimer"))) return;
                    try {
                      await api.delete(`/structures/${s.id}`);
                      setMessage({ ton: "vert", texte: `« ${s.sigle} » supprimée.` });
                      structures.recharger();
                    } catch (e) {
                      setMessage({ ton: "rouge", texte: (e as Error).message });
                    }
                  }}
                >
                  <Trash2 />
                </BoutonIcone>
              )}
            </span>
          )}
          {ici === "dans" && (
            <span className="pointer-events-none absolute -top-3 right-4 rounded-full bg-marque-600 px-2.5 py-0.5 text-[11px] font-semibold text-white shadow">
              Rattacher sous {s.sigle}
            </span>
          )}
        </div>
        {ici === "apres" && <span className="pointer-events-none absolute right-0 -bottom-1.5 left-0 z-10 h-1 rounded-full bg-marque-500" />}
        {ouvert && <ul className="mt-2 ml-7 space-y-2 border-l-2 border-zinc-200 pl-5">{sous.map((x) => branche(x, profondeur + 1))}</ul>}
      </li>
    );
  };

  return (
    <div className="space-y-5">
      {confirmation}
      <EnTete
        titre="Organigramme"
        sousTitre="Les structures par lesquelles passent les demandes : établissements, inspections et DDEPPSA dans les départements ; services et directions de l’administration centrale ; bureaux, services et directions de la DGRHAS. L’ordre réglé ici est celui de toutes les pages."
      />
      <Annonce ton={message?.ton} fermer={() => setMessage(null)}>
        {message?.texte}
      </Annonce>
      <div className="flex flex-wrap items-center gap-3">
        <Segments
          valeur={vue}
          changer={(v) => {
            setVue(v);
            setBascules(new Map());
            setDefaut("auto");
          }}
          options={[
            { valeur: "departements", libelle: "Départements scolaires" },
            { valeur: "centrale", libelle: "Administration centrale" },
            { valeur: "dgrhas", libelle: "DGRHAS (circuit interne)" },
          ]}
        />
        {vue === "departements" && (
          <Liste className="w-56" value={departement} onChange={(e) => setDepartement(e.target.value)} options={refs.departements.map((d) => ({ valeur: d.id, libelle: d.nom }))} />
        )}
        <Aide>
          Le circuit d’une demande <strong>remonte</strong> de la structure de l’agent à sa structure supérieure : école → inspection → DDEPPSA, ou service →
          direction centrale → direction générale. Rattachez chaque école à son inspection. Les personnes qui visent les dossiers ont un compte rattaché à leur
          structure (« Administration › Utilisateurs »).
        </Aide>
      </div>
      {sansCompte.length > 0 && (
        <Alerte ton="jaune">
          <strong>
            {sansCompte.length} structure(s) n’ont encore aucun compte
          </strong>{" "}
          (signalées « aucun compte » ci-dessous). Une demande qui arrive chez elles <strong>reste bloquée</strong> : personne ne peut la viser. Créez au moins un
          compte par structure (rôle « Responsable de structure »). En attendant, la DGRHAS peut recopier l’avis porté sur le formulaire papier, et le DG peut
          franchir l’étape en écrivant pourquoi.
        </Alerte>
      )}
      {vue === "centrale" && dg && (
        <Bouton variante="principal" onClick={() => setEdition({ type: "DIRECTION_GENERALE" })}>
          <Plus /> Ajouter une direction générale
        </Bouton>
      )}
      {vue === "departements" && dg && <ImportEtablissements apres={() => structures.recharger()} />}
      {vue === "departements" && dg && <PrefixesInspections apres={() => structures.recharger()} />}
      {vue === "departements" && dg && (
        <div className="flex flex-wrap gap-2">
          <Bouton onClick={() => setEdition({ type: "INSPECTION", parentId: racines[0]?.id ?? null, departementId: Number(departement) })}>
            <Plus /> Ajouter une inspection
          </Bouton>
          <Bouton onClick={() => setEdition({ type: "ETABLISSEMENT", parentId: null, departementId: Number(departement) })}>
            <Plus /> Ajouter un établissement
          </Bouton>
        </div>
      )}
      {dg && (
        <Suspense fallback={null}>
          <StructuresACompleter
            completer={(id) => {
              const s = parId.get(id);
              if (s) setEdition({ ...s });
            }}
          />
        </Suspense>
      )}
      <Carte titre={vue === "departements" ? `Département : ${refs.departements.find((d) => String(d.id) === departement)?.nom ?? ""}` : vue === "centrale" ? "Administration centrale" : "DGRHAS"}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-60 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
            <Saisie value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher (sigle, nom, localité)…" className="pl-9" />
          </div>
          <Bouton
            disabled={!!visibles}
            onClick={() => {
              setBascules(new Map());
              setDefaut("tout");
            }}
          >
            <ChevronsUpDown /> Tout déplier
          </Bouton>
          <Bouton
            disabled={!!visibles}
            onClick={() => {
              setBascules(new Map());
              setDefaut("rien");
            }}
          >
            <ChevronsDownUp /> Tout replier
          </Bouton>
        </div>
        {dg && (
          <p className="mb-3 rounded-xl bg-zinc-50 px-3 py-2 text-[12px] text-zinc-600">
            <GripVertical className="mr-1 inline size-3.5 align-[-2px]" />
            <strong>Pour ranger</strong>, saisissez la poignée et glissez la structure au-dessus ou au-dessous d’une autre du même niveau (un trait vert montre où elle ira).{" "}
            <strong>Pour la rattacher</strong> à une autre structure, déposez-la sur celle-ci (elle s’encadre en vert). Les flèches ↑ ↓ font la même chose pas à pas.
          </p>
        )}
        {!structures.donnees ? (
          <Chargement />
        ) : !racines.length && !orphelines.length ? (
          <p className="text-[13px] text-zinc-500">Rien pour l’instant.{dg ? " Utilisez les boutons « Ajouter »." : ""}</p>
        ) : visibles && !visibles.size ? (
          <p className="text-[13px] text-zinc-500">Aucune structure ne correspond à « {q} ».</p>
        ) : (
          <div className="space-y-2">
            <ul className="space-y-2">{racines.map((s) => branche(s, 0))}</ul>
            {orphelines.length > 0 && (!visibles || orphelines.some((s) => visibles.has(s.id))) && (
              <div className="pt-2">
                <div className="mb-2 text-[12px] text-or-700">Rattachées au département sans structure supérieure (le circuit passera directement au DDEPPSA) :</div>
                <ul className="space-y-2">{orphelines.map((s) => branche(s, 0))}</ul>
              </div>
            )}
          </div>
        )}
      </Carte>
      <p className="text-[12px] text-zinc-500">
        Les comptes se créent dans{" "}
        <Link href="/administration" className="font-medium text-marque-700 underline">
          Administration › Utilisateurs
        </Link>{" "}
        : choisissez le rôle « Responsable de structure » et la structure.
      </p>
      {nomination && (
        <Responsable
          s={nomination}
          fermer={() => setNomination(null)}
          apres={(texte) => {
            setNomination(null);
            setMessage({ ton: "vert", texte });
            structures.recharger();
          }}
        />
      )}
      {edition && (
        <EditionStructure
          s={edition}
          liste={liste}
          fermer={() => setEdition(null)}
          apres={(texte) => {
            setEdition(null);
            setMessage({ ton: "vert", texte });
            structures.recharger();
          }}
        />
      )}
    </div>
  );
}

/** Responsable en poste d'une structure (agent de la base du personnel), ou intérim ; vide : vacant. */
function Responsable({ s, fermer, apres }: { s: Structure; fermer: () => void; apres: (t: string) => void }) {
  const [q, setQ] = useState("");
  const [recherche, setRecherche] = useState("");
  const [choisi, setChoisi] = useState<{ id: number; nom: string } | null>(s.responsable);
  const [interim, setInterim] = useState(s.responsableInterim);
  const [erreur, setErreur] = useState<string | null>(null);
  const agents = useApi<{ lignes: { id: number; nomComplet: string; numeroFiche: string; structureNom: string | null; lieuService: string | null }[] }>(
    recherche.length >= 2 ? `/recensement/agents?recherche=${encodeURIComponent(recherche)}${s.type === "ETABLISSEMENT" ? `&structure=${s.id}` : ""}` : null,
  );
  useEffect(() => {
    const t = setTimeout(() => setRecherche(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);
  const enregistrer = async (agentId: number | null) => {
    setErreur(null);
    try {
      await api.put(`/structures/${s.id}/responsable`, { agentId, interim });
      apres(agentId ? `${s.posteResponsable} de « ${s.sigle} » : ${choisi?.nom}${interim ? " (intérim)" : ""}.` : `« ${s.sigle} » : poste de ${s.posteResponsable.toLowerCase()} vacant.`);
    } catch (e) {
      setErreur((e as Error).message);
    }
  };
  return (
    <Modale titre={`${s.posteResponsable} — ${s.sigle}`} ouverte fermer={fermer}>
      <div className="space-y-3">
        <p className="text-[12px] text-zinc-500">Choisissez l’agent qui occupe le poste, dans la base du personnel.{s.type === "ETABLISSEMENT" ? " La recherche se limite aux agents rattachés à cette école." : ""}</p>
        {choisi && (
          <div className="flex items-center gap-2 rounded-xl bg-marque-50 px-3 py-2 text-[13px]">
            <UserRound className="size-4 text-marque-700" />
            <strong>{choisi.nom}</strong>
            <button type="button" className="ml-auto text-[12px] text-zinc-500 underline" onClick={() => setChoisi(null)}>
              changer
            </button>
          </div>
        )}
        {!choisi && (
          <>
            <Saisie autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom de l’agent (2 lettres au moins)…" />
            <ul className="max-h-60 divide-y divide-zinc-100 overflow-y-auto rounded-xl ring-1 ring-zinc-200">
              {(agents.donnees?.lignes ?? []).map((a) => (
                <li key={a.id}>
                  <button type="button" className="w-full px-3 py-1.5 text-left text-[13px] hover:bg-zinc-50" onClick={() => setChoisi({ id: a.id, nom: a.nomComplet })}>
                    <span className="font-medium">{a.nomComplet}</span>
                    <span className="ml-2 text-[11px] text-zinc-400">{[a.numeroFiche, a.structureNom ?? a.lieuService].filter(Boolean).join(" · ")}</span>
                  </button>
                </li>
              ))}
              {recherche.length >= 2 && agents.donnees && !agents.donnees.lignes.length && <li className="px-3 py-2 text-[12px] text-zinc-500">Aucun agent trouvé.</li>}
            </ul>
          </>
        )}
        <label className="flex items-center gap-2 text-[13px]">
          <input type="checkbox" checked={interim} onChange={(e) => setInterim(e.target.checked)} /> Il n’assure qu’un intérim
        </label>
        {s.responsable && s.responsable.id === choisi?.id && <CompteResponsable s={s} />}
        {erreur && <Alerte>{erreur}</Alerte>}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        {s.responsable && (
          <Bouton variante="danger" onClick={() => enregistrer(null)}>
            Déclarer le poste vacant
          </Bouton>
        )}
        <Bouton onClick={fermer}>Annuler</Bouton>
        <Bouton variante="principal" disabled={!choisi} onClick={() => choisi && enregistrer(choisi.id)}>
          Enregistrer
        </Bouton>
      </div>
    </Modale>
  );
}

/**
 * Compte « Responsable de structure » du responsable en poste : il vise les demandes de sa structure,
 * pointe la présence, évalue ses agents, gère ses classes. Mot de passe et code montrés une seule fois.
 */
function CompteResponsable({ s }: { s: Structure }) {
  const [email, setEmail] = useState("");
  const [cree, setCree] = useState<{ email: string; nom: string; motDePasse: string; code: string } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  if (cree)
    return (
      <div className="space-y-1 rounded-xl bg-marque-50 p-3 text-[13px]">
        <div className="font-semibold text-marque-700">Compte créé pour {cree.nom}</div>
        <div>
          Identifiant : <strong>{cree.email}</strong>
        </div>
        <div>
          Mot de passe provisoire : <strong className="font-mono">{cree.motDePasse}</strong>
        </div>
        <div>
          Code personnel : <strong className="font-mono tracking-wider">{cree.code}</strong>
        </div>
        <p className="text-[12px] text-or-700">Notez-les maintenant et remettez-les à la personne : ils ne seront plus affichés. Elle changera son mot de passe dans « Mon compte ».</p>
      </div>
    );
  return (
    <div className="space-y-2 rounded-xl bg-zinc-50 p-3 ring-1 ring-zinc-200">
      <div className="text-[12px] font-semibold text-zinc-700">Compte du responsable</div>
      <p className="text-[12px] text-zinc-500">Pour qu’il vise les demandes de sa structure, pointe la présence et évalue ses agents. Laissez l’adresse vide si elle est déjà dans sa fiche.</p>
      <div className="flex gap-2">
        <Saisie type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Adresse e-mail (identifiant)" />
        <Bouton
          onClick={async () => {
            setErreur(null);
            try {
              setCree(await api.post(`/structures/${s.id}/compte-responsable`, { email: email.trim() || null }));
            } catch (e) {
              setErreur((e as Error).message);
            }
          }}
        >
          Créer son compte
        </Bouton>
      </div>
      {erreur && <Alerte>{erreur}</Alerte>}
    </div>
  );
}

function EditionStructure({ s, liste, fermer, apres }: { s: Edition; liste: Structure[]; fermer: () => void; apres: (t: string) => void }) {
  const { refs } = useSession();
  const [f, setF] = useState({
    type: s.type,
    nom: s.nom ?? "",
    sigle: s.sigle ?? "",
    parentId: s.parentId ? String(s.parentId) : "",
    departementId: s.departementId ? String(s.departementId) : "",
    cycle: s.cycle ?? "",
    typeLocalite: s.typeLocalite ?? "",
    localite: s.localite ?? "",
    actif: s.actif ?? true,
  });
  const [erreur, setErreur] = useState<string | null>(null);
  const parents = liste.filter((x) => (PARENTS[f.type] ?? []).includes(x.type) && x.id !== s.id && (!f.departementId || !x.departementId || String(x.departementId) === f.departementId));
  const departemental = ["ETABLISSEMENT", "INSPECTION", "DDEPPSA"].includes(f.type);
  return (
    <Modale titre={s.id ? `Modifier ${s.sigle}` : `Ajouter : ${LIBELLES[f.type]}`} ouverte fermer={fermer}>
      <div className="space-y-3">
        {erreur && <Alerte>{erreur}</Alerte>}
        <Champ libelle="Type">
          <Liste
            value={f.type}
            disabled={!!s.id && ["DGRHAS", "DDEPPSA"].includes(s.type)}
            onChange={(e) => setF({ ...f, type: e.target.value, parentId: "" })}
            options={Object.entries(LIBELLES)
              .filter(([k]) => !["DGRHAS", "DDEPPSA"].includes(k) || k === s.type)
              .map(([k, v]) => ({ valeur: k, libelle: v }))}
          />
        </Champ>
        <Champ libelle="Nom complet *">
          <Saisie autoFocus value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} placeholder={f.type === "ETABLISSEMENT" ? "Ex. CEG de Madingou" : f.type === "INSPECTION" ? "Ex. Inspection de l’enseignement primaire de Nkayi" : ""} />
        </Champ>
        <Champ libelle="Sigle" aide="Court, il s’affiche dans le circuit (ex. IEP Nkayi). Laissé vide : le nom.">
          <Saisie value={f.sigle} onChange={(e) => setF({ ...f, sigle: e.target.value })} />
        </Champ>
        {departemental && (
          <Champ libelle="Département">
            <Liste value={f.departementId} onChange={(e) => setF({ ...f, departementId: e.target.value })} vide="—" options={refs.departements.map((d) => ({ valeur: d.id, libelle: d.nom }))} />
          </Champ>
        )}
        {["ETABLISSEMENT", "INSPECTION"].includes(f.type) && (
          <Champ libelle="Cycle" aide="Une inspection par cycle (préscolaire, primaire, CEG, lycée) dans chaque département.">
            <Liste value={f.cycle} onChange={(e) => setF({ ...f, cycle: e.target.value })} vide="—" options={Object.entries(CYCLES).map(([k, v]) => ({ valeur: k, libelle: v }))} />
          </Champ>
        )}
        {f.type === "ETABLISSEMENT" && (
          <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
            <Champ libelle="Localisation">
              <Liste value={f.typeLocalite} onChange={(e) => setF({ ...f, typeLocalite: e.target.value })} vide="—" options={Object.entries(LOCALITES).map(([k, v]) => ({ valeur: k, libelle: v }))} />
            </Champ>
            <Champ libelle="Nom" aide="District en zone rurale, commune ou arrondissement en ville (pas de village ni de quartier).">
              <Saisie value={f.localite} onChange={(e) => setF({ ...f, localite: e.target.value })} placeholder="Ex. Loudima, Moungali" />
            </Champ>
          </div>
        )}
        {PARENTS[f.type] && (
          <Champ libelle="Structure supérieure" aide="Le dossier montera ensuite vers elle.">
            <Liste value={f.parentId} onChange={(e) => setF({ ...f, parentId: e.target.value })} vide="— Aucune —" options={parents.map((x) => ({ valeur: x.id, libelle: `${x.sigle} (${LIBELLES[x.type]})` }))} />
          </Champ>
        )}
        {s.id && (
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" checked={f.actif} onChange={(e) => setF({ ...f, actif: e.target.checked })} /> Structure active (proposée sur le portail)
          </label>
        )}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Bouton onClick={fermer}>Annuler</Bouton>
        <Bouton
          variante="principal"
          disabled={!f.nom.trim()}
          onClick={async () => {
            const corps = {
              ...f,
              parentId: f.parentId ? Number(f.parentId) : null,
              departementId: f.departementId ? Number(f.departementId) : null,
              cycle: f.cycle || null,
              typeLocalite: f.typeLocalite || null,
              localite: f.localite.trim() || null,
            };
            try {
              if (s.id) await api.put(`/structures/${s.id}`, corps);
              else await api.post("/structures", corps);
              apres(`« ${f.sigle || f.nom} » enregistrée.`);
            } catch (e) {
              setErreur((e as Error).message);
            }
          }}
        >
          Enregistrer
        </Bouton>
      </div>
    </Modale>
  );
}

/**
 * Import des établissements et des inspections (fichier remis par le DG) : chaque école est rangée
 * dans son inspection et son département. Ensuite, on choisit l'école dans une liste au lieu de la taper.
 */
interface GroupeACompleter {
  code: string;
  libelle: string;
  aide: string;
  total: number;
  structures: { id: number; sigle: string; type: string; departement: string | null; superieure: string | null }[];
}

/**
 * Structures à compléter (DG, 26/10/2026) : le système prévient au lieu de laisser chercher. Une ligne
 * par problème (sans cycle, sans inspection, sans structure supérieure…) ; « Compléter » ouvre la fiche.
 */
function StructuresACompleter({ completer }: { completer: (id: number) => void }) {
  const groupes = useApi<GroupeACompleter[]>("/structures/a-completer");
  // Venu du tableau de bord (« ?completer=1 ») : la liste s'ouvre tout de suite
  const demande = useSearchParams().has("completer");
  const [choix, setOuvert] = useState<boolean | null>(null);
  const ouvert = choix ?? demande;
  const [groupe, setGroupe] = useState<string | null>(null);
  const [voirTout, setVoirTout] = useState(false);
  const l = groupes.donnees ?? [];
  const total = l.reduce((n, g) => n + g.total, 0);
  if (!total) return null;
  const choisi = l.find((g) => g.code === groupe) ?? l[0];
  return (
    <section className="rounded-3xl border border-or-400/60 bg-or-100/60 p-5">
      <button type="button" onClick={() => setOuvert(!ouvert)} className="flex w-full cursor-pointer items-center gap-3 text-left">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-or-400 text-zinc-900">
          <TriangleAlert className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-encre">{total.toLocaleString("fr-FR")} structure(s) à compléter</span>
          <span className="block text-[12.5px] text-zinc-600">{l.map((g) => `${g.total.toLocaleString("fr-FR")} ${g.libelle.toLowerCase()}`).join(" · ")}</span>
        </span>
        <span className="text-[13px] font-medium text-or-700">{ouvert ? "Masquer" : "Voir et compléter"}</span>
      </button>
      {ouvert && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {l.map((g) => (
              <button
                key={g.code}
                type="button"
                onClick={() => {
                  setGroupe(g.code);
                  setVoirTout(false);
                }}
                className={cx(
                  "cursor-pointer rounded-full px-3 py-1 text-[12.5px] font-medium ring-1",
                  choisi?.code === g.code ? "bg-zinc-900 text-white ring-zinc-900" : "bg-white text-zinc-700 ring-zinc-200 hover:ring-or-400",
                )}
              >
                {g.libelle} <span className="tabular-nums opacity-70">({g.total})</span>
              </button>
            ))}
          </div>
          {choisi && (
            <div className="rounded-2xl bg-white p-4">
              <p className="mb-3 text-[12.5px] text-zinc-600">{choisi.aide}</p>
              <ul className="divide-y divide-zinc-100">
                {(voirTout ? choisi.structures : choisi.structures.slice(0, 15)).map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-[13px]">
                    <strong className="min-w-0 flex-1 truncate">{s.sigle}</strong>
                    <span className="text-[12px] text-zinc-500">{LIBELLES[s.type] ?? s.type}</span>
                    <span className="w-32 truncate text-[12px] text-zinc-500">{s.departement ?? "sans département"}</span>
                    <span className="w-40 truncate text-[12px] text-zinc-500">{s.superieure ? `sous ${s.superieure}` : "sans supérieure"}</span>
                    <Bouton variante="discret" onClick={() => completer(s.id)}>
                      <PencilLine /> Compléter
                    </Bouton>
                  </li>
                ))}
              </ul>
              {choisi.structures.length > 15 && !voirTout && (
                <button type="button" onClick={() => setVoirTout(true)} className="mt-2 text-[12.5px] font-medium text-marque-700 hover:underline">
                  Voir les {choisi.structures.length} {choisi.total > choisi.structures.length ? `premières (sur ${choisi.total})` : ""}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

interface RapportPrefixes {
  essai: boolean;
  changees: { id: number; departement: string | null; cycle: string; avant: string; apres: string; nomAvant: string; nomApres: string }[];
  aVerifier: { id: number; departement: string | null; cycle: string; sigle: string; raison: string }[];
  deja: number;
  enAttente: { alphabetisation: number; sansCycle: number };
}
const PREFIXES: [string, string][] = [
  ["IEPA", "inspections du primaire (enseignement primaire et alphabétisation)"],
  ["ICEG", "inspections des collèges"],
  ["ILZ", "inspections des lycées, par zone"],
  ["IP", "inspections du préscolaire"],
];

/**
 * Préfixe du cycle devant le nom de chaque inspection (DG, 26/10/2026) : essai d'abord (la liste
 * « avant → après »), puis correction. Ni le rattachement ni le personnel ne changent.
 */
function PrefixesInspections({ apres }: { apres: () => void }) {
  const [ouvert, setOuvert] = useState(false);
  const [rapport, setRapport] = useState<RapportPrefixes | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  const [confirmation, demander] = useConfirmation();

  async function lancer(essai: boolean) {
    setErreur(null);
    if (!essai && !(await demander(`Renommer ${rapport?.changees.length ?? 0} inspection(s) avec le préfixe de leur cycle ?`, "Oui, renommer"))) return;
    setEnvoi(true);
    try {
      const r = await api.post<RapportPrefixes>(`/structures/inspections/prefixes?essai=${essai ? 1 : 0}`, {});
      if (essai) setRapport(r);
      else {
        setRapport(null);
        setFait(`${r.changees.length} inspection(s) renommée(s).`);
        apres();
      }
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  }

  if (!ouvert)
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Bouton onClick={() => setOuvert(true)}>
          <PencilLine /> Préfixes des inspections (IEPA, ICEG, ILZ, IP)
        </Bouton>
        {fait && <span className="text-[12px] text-marque-700">{fait}</span>}
      </div>
    );
  return (
    <Carte titre="Préfixes des inspections" actions={<Bouton variante="discret" onClick={() => setOuvert(false)}>Fermer</Bouton>}>
      {confirmation}
      <div className="-mt-2 mb-3 space-y-2 text-[12px] text-zinc-600">
        <p>Le préfixe de son cycle se met devant le nom de chaque inspection, dans tous les départements :</p>
        <ul className="flex flex-wrap gap-2">
          {PREFIXES.map(([p, l]) => (
            <li key={p} className="rounded-full bg-zinc-100 px-2.5 py-0.5">
              <strong className="text-encre">{p}</strong> : {l}
            </li>
          ))}
        </ul>
        <p>
          Exemples : « Boko-Songho 10 » devient « IEPA Boko-Songho 10 », « IDP NKENI-ALIMA » devient « IP NKENI-ALIMA ». Le rattachement, le personnel et les écoles ne
          changent pas, et un agent dont la fiche porte l’ancien nom reste reconnu. <strong>Faites l’essai d’abord</strong> : rien n’est enregistré.
        </p>
      </div>
      <Bouton variante="principal" chargement={envoi && !rapport} disabled={envoi} onClick={() => lancer(true)}>
        Faire l’essai
      </Bouton>
      {erreur && (
        <div className="mt-3">
          <Alerte>{erreur}</Alerte>
        </div>
      )}
      {rapport && (
        <div className="mt-4 space-y-3 text-[13px]">
          <div className="rounded-2xl bg-zinc-50 p-4">
            <strong>{rapport.changees.length}</strong> inspection(s) à renommer · {rapport.deja} déjà correcte(s)
            {!!rapport.aVerifier.length && (
              <>
                {" "}
                · <strong className="text-or-700">{rapport.aVerifier.length} à vérifier</strong> (laissées telles quelles)
              </>
            )}
            {(rapport.enAttente.alphabetisation > 0 || rapport.enAttente.sansCycle > 0) && (
              <div className="mt-1 text-[12px] text-zinc-500">
                Non traitées, en attente de la décision du DG : {rapport.enAttente.alphabetisation} inspection(s) d’alphabétisation et {rapport.enAttente.sansCycle} sans cycle
                (donnez-leur un cycle avec « Modifier »).
              </div>
            )}
          </div>
          {!!rapport.aVerifier.length && (
            <Alerte ton="jaune">
              <strong>À vérifier</strong> : leur nom porte le préfixe d’un autre cycle. Corrigez le cycle ou le nom avec « Modifier ».
              <ul className="mt-1 list-disc pl-5">
                {rapport.aVerifier.map((x) => (
                  <li key={x.id}>
                    {x.sigle} ({CYCLES[x.cycle] ?? x.cycle}
                    {x.departement ? `, ${x.departement}` : ""}) : {x.raison}
                  </li>
                ))}
              </ul>
            </Alerte>
          )}
          {!!rapport.changees.length && (
            <>
              <div className="max-h-96 overflow-y-auto rounded-2xl ring-1 ring-zinc-200">
                <table className="w-full text-[12px]">
                  <thead className="sticky top-0 bg-white text-left text-zinc-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Département</th>
                      <th className="px-3 py-2 font-medium">Cycle</th>
                      <th className="px-3 py-2 font-medium">Avant</th>
                      <th className="px-3 py-2 font-medium">Après</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rapport.changees.map((x) => (
                      <tr key={x.id} className="border-t border-zinc-100">
                        <td className="px-3 py-1.5">{x.departement ?? "—"}</td>
                        <td className="px-3 py-1.5">{CYCLES[x.cycle] ?? x.cycle}</td>
                        {/* Même sigle : seul le nom complet est corrigé */}
                        <td className="px-3 py-1.5 text-zinc-500">{x.avant === x.apres ? x.nomAvant : x.avant}</td>
                        <td className="px-3 py-1.5 font-semibold text-marque-700">{x.avant === x.apres ? x.nomApres : x.apres}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap gap-2">
                <Bouton variante="principal" chargement={envoi} disabled={envoi} onClick={() => lancer(false)}>
                  Renommer ces {rapport.changees.length} inspection(s)
                </Bouton>
                <Bouton variante="discret" onClick={() => setRapport(null)}>
                  Annuler
                </Bouton>
              </div>
            </>
          )}
        </div>
      )}
    </Carte>
  );
}

function ImportEtablissements({ apres }: { apres: () => void }) {
  const [ouvert, setOuvert] = useState(false);
  const [rapport, setRapport] = useState<RapportImport | null>(null);
  const [fichier, setFichier] = useState<File | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);

  async function envoyer(f: File, essai: boolean) {
    setErreur(null);
    setEnvoi(true);
    try {
      const fd = new FormData();
      fd.append("fichier", f);
      const r = await api.post<RapportImport>(`/structures/import?essai=${essai ? 1 : 0}`, fd);
      if (essai) {
        setRapport(r);
        setFichier(f);
      } else {
        setRapport(null);
        setFichier(null);
        setFait(`${r.inspections.creees} inspection(s) et ${r.etablissements.crees} établissement(s) ajoutés, ${r.etablissements.misAJour} mis à jour.`);
        apres();
      }
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  }

  if (!ouvert)
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Bouton variante="principal" onClick={() => setOuvert(true)}>
          <Download /> Importer les établissements et inspections (Excel)
        </Bouton>
        {fait && <span className="text-[12px] text-marque-700">{fait}</span>}
      </div>
    );
  return (
    <Carte titre="Importer les établissements et les inspections" actions={<Bouton variante="discret" onClick={() => setOuvert(false)}>Fermer</Bouton>}>
      <p className="-mt-2 mb-3 text-[12px] text-zinc-500">
        Une ligne par école : département, inspection, cycle, établissement, type de localité et localité. Les inspections manquantes sont créées sous la DDEPPSA du département ; une école déjà connue n’est pas créée deux
        fois (son cycle, sa localisation et son inspection sont mis à jour).{" "}
        <button type="button" className="font-medium text-marque-700 hover:underline" onClick={() => api.telecharger("/structures/modele", "Etablissements et inspections.xlsx")}>
          Télécharger le modèle
        </button>
      </p>
      <ZoneFichier accept=".xlsx" envoi={envoi} envoyer={(f) => envoyer(f, true)} libelleBouton="Vérifier le fichier" />
      {erreur && (
        <div className="mt-3">
          <Alerte>{erreur}</Alerte>
        </div>
      )}
      {rapport && (
        <div className="mt-4 space-y-2 rounded-2xl bg-zinc-50 p-4 text-[13px]">
          <div>
            {rapport.lues} ligne(s) lue(s) : <strong>{rapport.inspections.creees}</strong> inspection(s) à créer ({rapport.inspections.existantes} déjà connue(s)), <strong>{rapport.etablissements.crees}</strong> établissement(s)
            à créer, {rapport.etablissements.misAJour} à mettre à jour, {rapport.etablissements.inchanges} inchangé(s).
          </div>
          {!!rapport.inspections.exemples.length && <div className="text-[12px] text-zinc-600">Inspections : {rapport.inspections.exemples.join(" · ")}</div>}
          {!!rapport.etablissements.exemples.length && <div className="text-[12px] text-zinc-600">Établissements : {rapport.etablissements.exemples.join(" · ")}</div>}
          {rapport.sansInspection > 0 && <div className="text-[12px] text-or-700">{rapport.sansInspection} école(s) sans inspection : rattachées directement à la DDEPPSA (à compléter).</div>}
          {rapport.sansCycle > 0 && <div className="text-[12px] text-or-700">{rapport.sansCycle} ligne(s) sans cycle reconnu.</div>}
          {rapport.ignorees.map((x) => (
            <div key={x.raison} className="text-[12px] text-rouge-600">
              {x.n} ligne(s) ignorée(s) : {x.raison} ({x.exemples.join(" · ")})
            </div>
          ))}
          <Bouton variante="principal" disabled={!fichier || envoi} onClick={() => fichier && envoyer(fichier, false)}>
            Enregistrer dans l’organigramme
          </Bouton>
        </div>
      )}
    </Carte>
  );
}
