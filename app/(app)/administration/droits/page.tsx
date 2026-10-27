"use client";

import { Eye, EyeOff, Pencil, RotateCcw, Undo2, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "@/components/session";
import { Alerte, Annonce, Bouton, Carte, Chargement, EnTete, Liste, Saisie, cx } from "@/components/ui";
import { api, useApi, type NiveauDroit, type Profil, type Role } from "@/lib/api";
import { ESPACES } from "@/lib/espaces";
import { peut, ROLES } from "@/lib/libelles";

interface ConfigDroits {
  roles: Partial<Record<Role, Record<string, NiveauDroit>>>;
  utilisateurs: Record<string, Record<string, NiveauDroit>>;
  rubriques: string[];
  nonOuvrables: string[];
  rolesLibres: Role[];
}
type Reglages = Pick<ConfigDroits, "roles" | "utilisateurs">;
interface Compte {
  id: string;
  nom: string;
  email: string;
  role: Role;
  actif: boolean;
}

/** Ce que l'on choisit pour une rubrique ; « vide » : pas de réglage (on suit l'origine ou le rôle). */
type Choix = NiveauDroit | "";

const CHOIX: { v: NiveauDroit; libelle: string; icone: typeof Eye; ton: string }[] = [
  { v: "MASQUE", libelle: "Masquée", icone: EyeOff, ton: "border-rouge-600 bg-rouge-100 text-rouge-600" },
  { v: "LECTURE", libelle: "Lecture seule", icone: Eye, ton: "border-sky-600 bg-sky-50 text-sky-700" },
  { v: "MODIFICATION", libelle: "Ouverte", icone: Pencil, ton: "border-marque-600 bg-marque-50 text-marque-700" },
];
const LIBELLE: Record<NiveauDroit, string> = { MASQUE: "masquée", LECTURE: "lecture seule", MODIFICATION: "ouverte" };
const ORIGINES_STRUCTURE = ["personnel", "demandes", "structures"];
/** Bouton-lien (raccourcis vers les comptes). */
const LIEN = "inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-4 py-2 text-[13px] font-medium text-encre hover:border-marque-300 [&>svg]:size-4";
/** « ?personne=<id> » : la page s'ouvre sur cette personne (lien depuis Utilisateurs). */
const personneDemandee = () => (typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("personne"));

/** Ce qu'une personne a vraiment sur une rubrique, et d'où ça vient. */
type Acces = { niveau: "MODIFICATION" | "LECTURE" | "AUCUN"; source: "origine" | "role" | "personne" };
const ACCES: Record<Acces["niveau"], { libelle: string; ton: string; bord: string }> = {
  MODIFICATION: { libelle: "La voit et y travaille", ton: "bg-marque-100 text-marque-700", bord: "border-l-marque-600 bg-marque-50/40" },
  LECTURE: { libelle: "La voit, lecture seule", ton: "bg-sky-100 text-sky-700", bord: "border-l-sky-500 bg-sky-50/40" },
  AUCUN: { libelle: "Ne la voit pas", ton: "bg-zinc-100 text-zinc-500", bord: "border-l-zinc-200" },
};
const SOURCE: Record<Acces["source"], string> = { origine: "d’origine", role: "réglé pour son rôle", personne: "réglé ici" };

/**
 * Administration › Droits par rubrique (réunion DG du 26/10/2026) : qui voit quoi, qui fait quoi.
 * Pour un rôle, ou pour une personne, chaque rubrique du menu peut être masquée, en lecture seule,
 * ou ouverte (même si le rôle ne l'a pas d'origine). Le serveur applique les mêmes règles.
 */
export default function Droits() {
  const { profil } = useSession();
  const config = useApi<ConfigDroits>(peut.parametrer(profil.role) ? "/droits" : null);
  const comptes = useApi<Compte[]>(peut.parametrer(profil.role) ? "/utilisateurs" : null);
  const [mode, setMode] = useState<"role" | "personne">(() => (personneDemandee() ? "personne" : "role"));
  const [role, setRole] = useState<Role>("AGENT");
  const [personne, setPersonne] = useState(() => personneDemandee() ?? "");
  const [q, setQ] = useState("");
  // Changements pas encore enregistrés (vide : le réglage enregistré)
  const [modifs, setModifs] = useState<Reglages | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState<{ ton: "vert" | "rouge"; texte: string } | null>(null);

  const enregistre = useMemo(() => (config.donnees ? { roles: config.donnees.roles, utilisateurs: config.donnees.utilisateurs } : null), [config.donnees]);
  const brouillon = modifs ?? enregistre;
  const setBrouillon = (f: (b: Reglages | null) => Reglages | null) => setModifs((m) => f(m ?? enregistre));
  const modifie = !!brouillon && !!enregistre && JSON.stringify(brouillon) !== JSON.stringify(enregistre);
  useEffect(() => {
    if (!modifie) return;
    const f = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", f);
    return () => window.removeEventListener("beforeunload", f);
  }, [modifie]);

  if (!peut.parametrer(profil.role)) return <Alerte>Réservé à l’administrateur et au DG.</Alerte>;
  if (config.erreur) return <Alerte>{config.erreur}</Alerte>;
  if (!config.donnees || !brouillon) return <Chargement />;
  const c = config.donnees;

  const rolesReglables = (Object.keys(ROLES) as Role[]).filter((r) => !c.rolesLibres.includes(r));
  const listeComptes = (comptes.donnees ?? []).filter((u) => u.actif && !c.rolesLibres.includes(u.role));
  const compte = listeComptes.find((u) => u.id === personne) ?? null;
  const roleCible: Role | null = mode === "role" ? role : (compte?.role ?? null);
  const reglages = mode === "role" ? (brouillon.roles[role] ?? {}) : compte ? (brouillon.utilisateurs[compte.id] ?? {}) : {};
  const reglagesRole = roleCible ? (brouillon.roles[roleCible] ?? {}) : {};

  /** Rubriques du menu tel qu'il est rangé, une seule fois chacune, par domaine. */
  const vues = new Set<string>();
  const domaines = ESPACES.map((e) => ({
    e,
    rubriques: e.rubriques.filter((r) => {
      const h = r.href.split("?")[0];
      if (!c.rubriques.includes(h) || vues.has(h)) return false;
      vues.add(h);
      return true;
    }),
  })).filter((d) => d.rubriques.length);

  /** La rubrique est-elle visible pour ce rôle, sans aucun réglage ? */
  const origineVisible = (visible: ((p: Profil) => boolean) | undefined, origine: string) => {
    if (!roleCible) return false;
    if (roleCible === "STRUCTURE" && !ORIGINES_STRUCTURE.includes(origine)) return false;
    return !visible || visible({ ...profil, role: roleCible, droits: undefined });
  };

  /** L'accès réel à une rubrique : réglage de la personne, sinon de son rôle, sinon l'origine. */
  const acces = (h: string, dOrigine: boolean, fermeOnly: boolean): Acces => {
    const perso = mode === "personne" ? reglages[h] : undefined;
    const deRole = mode === "personne" ? reglagesRole[h] : reglages[h];
    const n = perso ?? deRole;
    const source: Acces["source"] = perso ? "personne" : deRole ? (mode === "role" ? "personne" : "role") : "origine";
    if (!n) return { niveau: dOrigine ? "MODIFICATION" : "AUCUN", source: "origine" };
    if (n === "MASQUE") return { niveau: "AUCUN", source };
    // Une rubrique non ouvrable ne s'ouvre pas au-delà de l'origine
    if (fermeOnly && !dOrigine) return { niveau: "AUCUN", source: "origine" };
    return { niveau: n === "LECTURE" ? "LECTURE" : "MODIFICATION", source };
  };
  const lignes = domaines.flatMap(({ e, rubriques }) =>
    rubriques.map((r) => {
      const h = r.href.split("?")[0];
      const dOrigine = origineVisible(r.visible, r.origine ?? e.cle);
      const fermeOnly = c.nonOuvrables.includes(h) || roleCible === "STRUCTURE";
      return { r, h, domaine: e.titre, dOrigine, fermeOnly, acces: acces(h, dOrigine, fermeOnly) };
    }),
  );
  const parHref = new Map(lignes.map((l) => [l.h, l]));
  const ouvertes = lignes.filter((l) => l.acces.niveau !== "AUCUN");

  const choisir = (href: string, v: Choix) =>
    setBrouillon((b) => {
      if (!b) return b;
      const n = structuredClone(b);
      const cible = mode === "role" ? (n.roles[role] ??= {}) : compte ? (n.utilisateurs[compte.id] ??= {}) : null;
      if (!cible) return b;
      if (v) cible[href] = v;
      else delete cible[href];
      return n;
    });

  const enregistrer = async () => {
    setEnCours(true);
    setMessage(null);
    try {
      const r = await api.put<ConfigDroits>("/droits", brouillon);
      config.setDonnees(r);
      setModifs(null);
      setMessage({ ton: "vert", texte: "Droits enregistrés. Chaque personne concernée les a dès sa prochaine page ouverte." });
    } catch (e) {
      setMessage({ ton: "rouge", texte: (e as Error).message });
    } finally {
      setEnCours(false);
    }
  };

  const nbReglages = Object.keys(reglages).length;
  const trouves = q.trim()
    ? listeComptes.filter((u) => `${u.nom} ${u.email}`.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 30)
    : listeComptes.slice(0, 30);

  return (
    <div className="space-y-6">
      <EnTete
        titre="Droits par rubrique"
        sousTitre="Qui voit quoi, qui fait quoi. Pour un rôle, ou pour une personne, choisissez pour chaque rubrique du menu : masquée, en lecture seule, ou ouverte. Sans choix, la rubrique reste comme d’origine. En vert : ce que la personne voit et où elle travaille."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/administration?nouveau=1" className={LIEN}>
              <UserPlus /> Créer un utilisateur
            </Link>
            <Link href="/administration" className={LIEN}>
              <Users /> Voir les utilisateurs
            </Link>
          </div>
        }
      />
      {message && (
        <Annonce ton={message.ton} fermer={() => setMessage(null)}>
          {message.texte}
        </Annonce>
      )}

      <Carte titre="1. Pour qui ?">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["role", "Pour tout un rôle"],
              ["personne", "Pour une personne"],
            ] as const
          ).map(([m, t]) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cx("cursor-pointer rounded-full border px-4 py-2 text-[13px] font-medium", mode === m ? "border-marque-600 bg-marque-600 text-white" : "border-zinc-200 bg-white text-zinc-600 hover:border-marque-300")}
            >
              {t}
            </button>
          ))}
        </div>
        {mode === "role" ? (
          <div className="mt-4 max-w-lg">
            <Liste value={role} onChange={(e) => setRole(e.target.value as Role)} options={rolesReglables.map((r) => ({ valeur: r, libelle: ROLES[r] }))} />
            <p className="mt-2 text-[12px] text-zinc-500">Vaut pour tous les comptes de ce rôle, sauf ce qui est réglé pour une personne en particulier.</p>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div>
              <Saisie value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher un nom ou un e-mail…" aria-label="Chercher une personne" />
              <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-zinc-200">
                {comptes.chargement && <p className="p-3 text-[13px] text-zinc-500">Chargement…</p>}
                {trouves.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => setPersonne(u.id)}
                    className={cx("block w-full cursor-pointer border-b border-zinc-100 px-3 py-2 text-left text-[13px] last:border-0", u.id === personne ? "bg-marque-50" : "hover:bg-zinc-50")}
                  >
                    <span className="font-medium text-encre">{u.nom}</span>
                    <span className="block text-[12px] text-zinc-500">
                      {ROLES[u.role]}
                      {brouillon.utilisateurs[u.id] && (
                        <span className="ml-1.5 rounded-full bg-marque-100 px-2 py-0.5 text-[11px] font-semibold text-marque-700">
                          {Object.keys(brouillon.utilisateurs[u.id]).length} réglage(s) personnel(s)
                        </span>
                      )}
                    </span>
                  </button>
                ))}
                {!comptes.chargement && !trouves.length && <p className="p-3 text-[13px] text-zinc-500">Aucun compte trouvé.</p>}
              </div>
            </div>
            <div className="text-[13px] leading-relaxed text-zinc-600">
              {compte ? (
                <>
                  <p className="font-semibold text-encre">{compte.nom}</p>
                  <p>Rôle : {ROLES[compte.role]}</p>
                  <p className="mt-2">Ce qui est réglé ici passe avant le réglage de son rôle. Exemple : un chef de bureau qui assure un intérim reçoit une rubrique en plus ; quelqu’un à qui l’on retire une validation ne la voit plus.</p>
                </>
              ) : (
                <p>Choisissez une personne dans la liste.</p>
              )}
            </div>
          </div>
        )}
      </Carte>

      {roleCible && (mode === "role" || compte) && (
        <Carte titre={`Ce que ${mode === "role" ? "voit ce rôle" : `voit ${compte?.nom}`} : ${ouvertes.length} rubrique(s) sur ${lignes.length}`}>
          <div className="flex flex-wrap gap-1.5">
            {ouvertes.map((l) => (
              <a
                key={l.h}
                href={`#droit-${l.h}`}
                title={`${l.domaine} · ${ACCES[l.acces.niveau].libelle} (${SOURCE[l.acces.source]})`}
                className={cx("rounded-full px-3 py-1 text-[12px] font-medium", ACCES[l.acces.niveau].ton, l.acces.source !== "origine" && "ring-1 ring-current")}
              >
                {l.acces.niveau === "LECTURE" && <Eye className="mr-1 inline size-3" />}
                {l.r.libelle}
              </a>
            ))}
            {!ouvertes.length && <span className="text-[13px] text-zinc-500">Aucune rubrique.</span>}
          </div>
          <p className="mt-3 text-[12px] text-zinc-500">
            Vert : la voit et y travaille · bleu : lecture seule · un cercle autour : réglé ici (pas d’origine). Un clic mène à la rubrique dans la liste ci-dessous.
          </p>
        </Carte>
      )}

      {roleCible && (
        <Carte
          titre={`2. Les rubriques${mode === "role" ? ` — ${ROLES[role]}` : compte ? ` — ${compte.nom}` : ""}`}
          actions={<span className="text-[12px] text-zinc-500">{nbReglages ? `${nbReglages} rubrique(s) réglée(s)` : "Aucun réglage : tout est comme d’origine"}</span>}
        >
          <div className="space-y-6">
            {domaines.map(({ e, rubriques }) => (
              <div key={e.cle}>
                <h3 className="mb-2 text-[13px] font-semibold tracking-wide text-zinc-500 uppercase">{e.titre}</h3>
                <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200">
                  {rubriques.map((r) => {
                    const h = r.href.split("?")[0];
                    const choix: Choix = reglages[h] ?? "";
                    const deRole = mode === "personne" ? reglagesRole[h] : undefined;
                    const { dOrigine, fermeOnly, acces: a } = parHref.get(h)!;
                    const sans = deRole ? `Comme son rôle (${LIBELLE[deRole]})` : "Comme d’origine";
                    return (
                      <div key={h} id={`droit-${h}`} className={cx("grid scroll-mt-24 items-center gap-3 border-l-4 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto]", ACCES[a.niveau].bord)}>
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-2 text-[14px] font-medium text-encre">
                            {r.libelle}
                            <span className={cx("rounded-full px-2 py-0.5 text-[11px] font-semibold", ACCES[a.niveau].ton)}>
                              {ACCES[a.niveau].libelle}
                            </span>
                          </p>
                          <p className="text-[12px] text-zinc-500">
                            {a.source === "origine" ? "Droit d’origine de son rôle" : a.source === "role" ? "Réglé pour son rôle" : "Réglé ici"}
                            {" · d’origine : "}
                            {dOrigine ? "visible" : "non visible"}
                            {fermeOnly && !dOrigine ? " · ne peut pas être ouverte à ce compte" : ""}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            onClick={() => choisir(h, "")}
                            className={cx("cursor-pointer rounded-lg border px-3 py-1.5 text-[12px]", !choix ? "border-zinc-500 bg-zinc-100 font-semibold text-encre" : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-400")}
                          >
                            {sans}
                          </button>
                          {CHOIX.map((x) => {
                            const interdit = fermeOnly && !dOrigine && x.v !== "MASQUE";
                            return (
                              <button
                                key={x.v}
                                disabled={interdit}
                                onClick={() => choisir(h, x.v)}
                                title={interdit ? "Cette rubrique ne peut pas être ouverte au-delà des droits d’origine de ce compte." : undefined}
                                className={cx(
                                  "inline-flex cursor-pointer items-center gap-1 rounded-lg border px-3 py-1.5 text-[12px] disabled:cursor-not-allowed disabled:opacity-40",
                                  choix === x.v ? cx(x.ton, "font-semibold") : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400",
                                )}
                              >
                                <x.icone className="size-3.5" /> {x.libelle}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Carte>
      )}

      <div className="no-print sticky bottom-0 z-10 -mx-2 flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <span className="mr-auto text-[13px] text-zinc-600">{modifie ? "Des changements ne sont pas encore enregistrés." : "Tout est enregistré."}</span>
        <Bouton variante="discret" disabled={!modifie || enCours} onClick={() => setModifs(null)}>
          <Undo2 className="size-4" /> Annuler les changements
        </Bouton>
        {nbReglages > 0 && (
          <Bouton
            variante="secondaire"
            disabled={enCours}
            onClick={() =>
              setBrouillon((b) => {
                if (!b) return b;
                const n = structuredClone(b);
                if (mode === "role") delete n.roles[role];
                else if (compte) delete n.utilisateurs[compte.id];
                return n;
              })
            }
          >
            <RotateCcw className="size-4" /> Tout remettre comme d’origine {mode === "role" ? "pour ce rôle" : "pour cette personne"}
          </Bouton>
        )}
        <Bouton disabled={!modifie} chargement={enCours} onClick={() => void enregistrer()}>
          Enregistrer
        </Bouton>
      </div>
    </div>
  );
}
