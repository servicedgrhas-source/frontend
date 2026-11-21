"use client";

import { ArrowLeft, ArrowRight, CheckCircle2, CloudOff, Download, ExternalLink, LayoutGrid, Plus, RefreshCw, Search, Send, Smartphone, Trash2, UserPlus, Wifi } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BlocLocalisation, type Position } from "@/components/ecoles/localisation";
import { useSession } from "@/components/session";
import { Alerte, Badge, Bouton, Carte, EnTete, Liste, Saisie, Segments, Vide, cx } from "@/components/ui";
import { api } from "@/lib/api";
import { CYCLES } from "@/lib/ecoles";
import { accesDonne } from "@/lib/espaces";

/*
 * Recensement sur le terrain (DG, 21/11/2026). Les équipes partent école par école, avec une tablette
 * ou un téléphone. Elles téléchargent l'école (ses agents, ce qui manque), complètent sur une GRILLE
 * (une ligne par agent, comme Excel : Entrée descend, Tab avance) ou UNE PERSONNE À LA FOIS (sur un
 * téléphone), même SANS CONNEXION : tout est gardé sur l'appareil, puis envoyé au retour du réseau.
 * On part de nos bases : on ne ressaisit pas ce qui est déjà juste.
 */

interface Colonne {
  code: string;
  libelle: string;
  type: string;
  options: { code: string; libelle: string }[];
  colonnes: { code: string; libelle: string }[];
  obligatoirePour: string[];
  aide: string;
}
interface Paquet {
  telechargeLe: string;
  ecole: Position & {
    id: number;
    nom: string;
    cycle: string | null;
    localite: string | null;
    departementId: number | null;
    inspection: string | null;
    posteResponsable: string;
    responsable: string | null;
    salles: number;
    classes: number;
  };
  batiments: (Position & { id: number; nom: string })[];
  colonnes: Colonne[];
  statuts: { code: string; libelle: string }[];
  agents: { id: number; nomComplet: string; statut: string; matricule: string | null; donnees: Record<string, unknown> }[];
}
interface Ligne {
  cle: string;
  agentId: number | null;
  statut: string;
  statutOrigine: string;
  valeurs: Record<string, string>;
  origine: Record<string, string>;
  /** Travaillait ailleurs dans la base : il est rattaché à cette école à l'envoi. */
  rattacher?: boolean;
  /** Absent de nos bases : il part au contrôle puis à la décision du DG. */
  nouveau?: boolean;
  erreur?: string;
}
interface Etat {
  paquet: Paquet;
  lignes: Ligne[];
  /** Positions prélevées sans connexion, envoyées avec le reste. */
  positions: { ecole?: Position; batiments: Record<string, Position> };
}
interface EcoleListe {
  id: number;
  type: string;
  nom: string;
  cycle: string | null;
  localite: string | null;
  departementId: number | null;
  actif: boolean;
}

const CLE = "dgrhas:terrain:";
const lire = <T,>(k: string): T | null => {
  try {
    const t = localStorage.getItem(CLE + k);
    return t ? (JSON.parse(t) as T) : null;
  } catch {
    return null;
  }
};
const ecrire = (k: string, v: unknown) => {
  try {
    if (v === null) localStorage.removeItem(CLE + k);
    else localStorage.setItem(CLE + k, JSON.stringify(v));
  } catch {
    /* appareil plein ou stockage bloqué : la page continue */
  }
};
const ecolesTelechargees = (): { id: number; nom: string; enAttente: number; le: string }[] => {
  const l: { id: number; nom: string; enAttente: number; le: string }[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) ?? "";
      if (!k.startsWith(`${CLE}ecole:`)) continue;
      const e = lire<Etat>(k.slice(CLE.length));
      if (e) l.push({ id: e.paquet.ecole.id, nom: e.paquet.ecole.nom, enAttente: aEnvoyer(e).length, le: e.paquet.telechargeLe });
    }
  } catch {
    /* stockage indisponible */
  }
  return l.sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
};

/** Une valeur de la base en texte modifiable (dates AAAA-MM-JJ, enfants « nom | date ; … »). */
function enTexte(c: Colonne, v: unknown): string {
  if (v === null || v === undefined) return "";
  if (c.type === "TABLEAU" && Array.isArray(v))
    return v
      .map((ligne) => (c.colonnes.length ? c.colonnes.map((x) => String((ligne as Record<string, unknown>)?.[x.code] ?? "")).join(" | ") : String(ligne)).replace(/(\s\|\s)+$/, ""))
      .join(" ; ");
  if (Array.isArray(v)) return v.join(" ; ");
  if (c.type === "DATE") return String(v).slice(0, 10);
  return String(v);
}
const plat = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();

function nouvelleLigne(p: Paquet, a: Paquet["agents"][number], rattacher = false): Ligne {
  const valeurs = Object.fromEntries(p.colonnes.map((c) => [c.code, enTexte(c, c.code === "NOMS_PRENOMS" ? (a.donnees.NOMS_PRENOMS ?? a.nomComplet) : a.donnees[c.code])]));
  return { cle: `a${a.id}`, agentId: a.id, statut: a.statut, statutOrigine: rattacher ? "" : a.statut, valeurs, origine: rattacher ? {} : { ...valeurs }, rattacher };
}
const changees = (l: Ligne) => Object.keys(l.valeurs).filter((k) => (l.valeurs[k] ?? "") !== (l.origine[k] ?? ""));
const aEnvoyer = (e: Etat) => e.lignes.filter((l) => l.nouveau || l.rattacher || l.statut !== l.statutOrigine || changees(l).length);
const obligatoire = (c: Colonne, statut: string) => !c.obligatoirePour.length || c.obligatoirePour.includes(statut);

export default function Page() {
  const { profil } = useSession();
  const [enLigne, setEnLigne] = useState(true);
  // L'école ouverte reste ouverte après un rechargement ou un changement d'écran (téléphone tourné)
  const [ouverte, setOuverteBrut] = useState<number | null>(() => lire<number>("ouverte"));
  const setOuverte = (id: number | null) => {
    ecrire("ouverte", id);
    setOuverteBrut(id);
  };
  useEffect(() => {
    const maj = () => setEnLigne(navigator.onLine);
    maj();
    window.addEventListener("online", maj);
    window.addEventListener("offline", maj);
    return () => {
      window.removeEventListener("online", maj);
      window.removeEventListener("offline", maj);
    };
  }, []);
  const autorise = ["ADMIN", "INFORMATIQUE", "AGENT", "CHEF_SERVICE", "DIRECTEUR", "BUREAU_ETUDES", "DG", "DDEPPSA", "STRUCTURE"].includes(profil.role) || accesDonne(profil);
  if (!autorise) return <Alerte>Accès réservé aux équipes du recensement.</Alerte>;
  return ouverte ? <TravailEcole id={ouverte} enLigne={enLigne} retour={() => setOuverte(null)} /> : <ChoixEcole enLigne={enLigne} ouvrir={setOuverte} />;
}

function Reseau({ enLigne }: { enLigne: boolean }) {
  return enLigne ? (
    <Badge ton="vert">
      <Wifi className="mr-1 inline size-3" />
      Connecté
    </Badge>
  ) : (
    <Badge ton="jaune">
      <CloudOff className="mr-1 inline size-3" />
      Sans connexion : tout est gardé sur l’appareil
    </Badge>
  );
}

/* ------------------------------ 1. Choisir l'école ------------------------------ */

function ChoixEcole({ enLigne, ouvrir }: { enLigne: boolean; ouvrir: (id: number) => void }) {
  const [ecoles, setEcoles] = useState<EcoleListe[]>(() => lire<EcoleListe[]>("ecoles") ?? []);
  const [q, setQ] = useState("");
  const [cycle, setCycle] = useState("");
  const [locales, setLocales] = useState(ecolesTelechargees);
  const [charge, setCharge] = useState<number | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  useEffect(() => {
    if (!enLigne) return;
    api
      .get<EcoleListe[]>("/structures")
      .then((l) => {
        const e = l.filter((s) => s.actif && s.type === "ETABLISSEMENT");
        setEcoles(e);
        ecrire("ecoles", e.map(({ id, type, nom, cycle, localite, departementId, actif }) => ({ id, type, nom, cycle, localite, departementId, actif })));
      })
      .catch(() => undefined);
  }, [enLigne]);
  const mots = plat(q).split(/\s+/).filter(Boolean);
  const trouvees = mots.length ? ecoles.filter((e) => (!cycle || e.cycle === cycle) && mots.every((m) => plat(`${e.nom} ${e.localite ?? ""}`).includes(m))).slice(0, 30) : [];

  const telecharger = async (id: number) => {
    const deja = lire<Etat>(`ecole:${id}`);
    if (deja && !enLigne) return ouvrir(id);
    if (deja && aEnvoyer(deja).length) return ouvrir(id);
    if (!enLigne) return setErreur("Sans connexion : seules les écoles déjà téléchargées s’ouvrent.");
    setCharge(id);
    setErreur(null);
    try {
      const p = await api.get<Paquet>(`/recensement/terrain/ecole/${id}`);
      ecrire(`ecole:${id}`, { paquet: p, lignes: p.agents.map((a) => nouvelleLigne(p, a)), positions: { batiments: {} } } satisfies Etat);
      setLocales(ecolesTelechargees());
      ouvrir(id);
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setCharge(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <EnTete
        titre="Recensement sur le terrain"
        sousTitre="École par école : on télécharge l’école (avec la connexion), on complète ses agents sur place, même sans réseau, puis on envoie. On part de nos bases : on ne ressaisit pas ce qui est déjà juste."
        actions={<Reseau enLigne={enLigne} />}
      />
      {erreur && <Alerte>{erreur}</Alerte>}
      <Carte titre="1. Choisir l’école">
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-zinc-400" />
            <Saisie autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tapez quelques lettres : « vindou », « moussa eta »…" className="h-12 w-full pl-11 text-[16px]" aria-label="Chercher une école" />
          </div>
          <Segments valeur={cycle} changer={setCycle} options={[{ valeur: "", libelle: "Tous les cycles" }, ...Object.entries(CYCLES).map(([valeur, libelle]) => ({ valeur, libelle }))]} />
          {!ecoles.length && <p className="text-[13px] text-zinc-500">{enLigne ? "Chargement des écoles…" : "La liste des écoles n’a pas encore été chargée sur cet appareil : connectez-vous une première fois."}</p>}
          {mots.length > 0 && !trouvees.length && <Vide>Aucune école ne correspond.</Vide>}
          <ul className="divide-y divide-zinc-100">
            {trouvees.map((e) => (
              <li key={e.id}>
                <button type="button" onClick={() => void telecharger(e.id)} className="flex w-full cursor-pointer items-center gap-3 px-1 py-3 text-left hover:bg-zinc-50">
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-medium">{e.nom}</div>
                    <div className="text-[12px] text-zinc-500">
                      {[e.cycle ? CYCLES[e.cycle] : null, e.localite].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  {charge === e.id ? <RefreshCw className="size-5 animate-spin text-marque-600" /> : <Download className="size-5 text-zinc-400" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </Carte>
      <Carte titre="Écoles sur cet appareil">
        {!locales.length ? (
          <p className="text-[13px] text-zinc-500">Aucune pour l’instant. Avant de partir en zone sans réseau, téléchargez les écoles de votre itinéraire.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {locales.map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-2.5">
                <button type="button" className="min-w-0 flex-1 cursor-pointer text-left" onClick={() => ouvrir(e.id)}>
                  <div className="text-[15px] font-medium">{e.nom}</div>
                  <div className="text-[12px] text-zinc-500">Téléchargée le {new Date(e.le).toLocaleDateString("fr-FR")}</div>
                </button>
                {e.enAttente ? <Badge ton="jaune">{e.enAttente} à envoyer</Badge> : <Badge ton="vert">à jour</Badge>}
                <button
                  type="button"
                  title="Retirer de l’appareil"
                  className="cursor-pointer p-2 text-zinc-400 hover:text-rouge-600"
                  onClick={() => {
                    if (e.enAttente && !confirm(`${e.enAttente} ligne(s) de « ${e.nom} » ne sont pas envoyées. Les retirer quand même ?`)) return;
                    ecrire(`ecole:${e.id}`, null);
                    setLocales(ecolesTelechargees());
                  }}
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Carte>
    </div>
  );
}

/* ------------------------------ 2. Travailler dans l'école ------------------------------ */

function TravailEcole({ id, enLigne, retour }: { id: number; enLigne: boolean; retour: () => void }) {
  const [etat, setEtatBrut] = useState<Etat | null>(() => lire<Etat>(`ecole:${id}`));
  const setEtat = useCallback(
    (f: (e: Etat) => Etat) =>
      setEtatBrut((e) => {
        if (!e) return e;
        const n = f(e);
        ecrire(`ecole:${id}`, n);
        return n;
      }),
    [id],
  );
  const [onglet, setOnglet] = useState<"personnel" | "ecole">("personnel");
  const [vue, setVue] = useState<"grille" | "fiche">(() => (typeof window !== "undefined" && window.innerWidth < 768 ? "fiche" : "grille"));
  const [manques, setManques] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ ton: "vert" | "rouge" | "jaune"; texte: string } | null>(null);

  if (!etat) return <Alerte>Cette école n’est plus sur l’appareil.</Alerte>;
  const p = etat.paquet;
  const enAttente = aEnvoyer(etat);
  const positionsEnAttente = (etat.positions.ecole ? 1 : 0) + Object.keys(etat.positions.batiments).length;

  const envoyer = async () => {
    setEnvoi(true);
    setMessage(null);
    try {
      let faites = 0;
      const erreurs: string[] = [];
      if (enAttente.length) {
        const modifications = enAttente.map((l) => {
          const donnees: Record<string, unknown> = {};
          for (const k of l.nouveau || l.rattacher ? Object.keys(l.valeurs).filter((k) => l.valeurs[k]) : changees(l)) donnees[k] = l.valeurs[k] ?? "";
          return {
            cle: l.cle,
            agentId: l.agentId,
            statut: l.nouveau || l.statut !== l.statutOrigine ? l.statut : undefined,
            structureId: l.nouveau || l.rattacher ? p.ecole.id : undefined,
            donnees,
          };
        });
        const { resultats } = await api.post<{ resultats: { cle: string; ok: boolean; id?: number; erreur?: string }[] }>("/recensement/terrain/envoyer", { modifications });
        const parCle = new Map(resultats.map((r) => [r.cle, r]));
        setEtat((e) => ({
          ...e,
          lignes: e.lignes.map((l) => {
            const r = parCle.get(l.cle);
            if (!r) return l;
            if (!r.ok) {
              erreurs.push(`${l.valeurs.NOMS_PRENOMS || "Ligne"} : ${r.erreur}`);
              return { ...l, erreur: r.erreur };
            }
            faites++;
            return { ...l, agentId: r.id ?? l.agentId, cle: r.id ? `a${r.id}` : l.cle, origine: { ...l.valeurs }, statutOrigine: l.statut, nouveau: false, rattacher: false, erreur: undefined };
          }),
        }));
      }
      // Les positions prélevées sans connexion
      if (etat.positions.ecole) await api.put(`/etablissements/${p.ecole.id}/localisation`, { ...etat.positions.ecole, precision: etat.positions.ecole.precisionGps });
      for (const [b, pos] of Object.entries(etat.positions.batiments)) await api.put(`/etablissements/${p.ecole.id}/batiments/${b}/localisation`, { ...pos, precision: pos.precisionGps });
      if (positionsEnAttente) setEtat((e) => ({ ...e, positions: { batiments: {} } }));
      setMessage(
        erreurs.length
          ? { ton: "jaune", texte: `${faites} ligne(s) envoyée(s). ${erreurs.length} à corriger (en rouge) : ${erreurs.slice(0, 3).join(" ; ")}${erreurs.length > 3 ? "…" : ""}` }
          : { ton: "vert", texte: `Envoyé : ${faites} agent(s)${positionsEnAttente ? ` et ${positionsEnAttente} position(s)` : ""}. Les modifications partent au contrôle, comme au recensement ; les agents nouveaux, au contrôle puis au DG.` },
      );
    } catch (e) {
      setMessage({ ton: "rouge", texte: `${(e as Error).message} — rien n’est perdu : tout reste sur l’appareil, réessayez plus tard.` });
    } finally {
      setEnvoi(false);
    }
  };

  const recharger = async () => {
    if (enAttente.length && !confirm("Des lignes ne sont pas envoyées : elles seront perdues si vous rechargez l’école. Continuer ?")) return;
    try {
      const n = await api.get<Paquet>(`/recensement/terrain/ecole/${id}`);
      setEtatBrut(() => {
        const e: Etat = { paquet: n, lignes: n.agents.map((a) => nouvelleLigne(n, a)), positions: { batiments: {} } };
        ecrire(`ecole:${id}`, e);
        return e;
      });
      setMessage({ ton: "vert", texte: "École rechargée depuis la base." });
    } catch (e) {
      setMessage({ ton: "rouge", texte: (e as Error).message });
    }
  };

  // Position : envoyée tout de suite avec le réseau, gardée sur l'appareil sinon
  const enregistrerPosition = (batiment: number | null) => async (pos: { latitude: number | null; longitude: number | null; precision?: number | null }) => {
    const v: Position = { latitude: pos.latitude, longitude: pos.longitude, precisionGps: pos.precision ?? null, localiseLe: new Date().toISOString() };
    const local = () =>
      setEtat((e) => ({
        ...e,
        paquet: batiment ? { ...e.paquet, batiments: e.paquet.batiments.map((b) => (b.id === batiment ? { ...b, ...v } : b)) } : { ...e.paquet, ecole: { ...e.paquet.ecole, ...v } },
        positions: batiment ? { ...e.positions, batiments: { ...e.positions.batiments, [batiment]: v } } : { ...e.positions, ecole: v },
      }));
    if (!navigator.onLine) {
      local();
      setMessage({ ton: "jaune", texte: "Position gardée sur l’appareil : elle partira avec « Envoyer »." });
      return;
    }
    await api.put(batiment ? `/etablissements/${p.ecole.id}/batiments/${batiment}/localisation` : `/etablissements/${p.ecole.id}/localisation`, pos);
    setEtat((e) => ({ ...e, paquet: batiment ? { ...e.paquet, batiments: e.paquet.batiments.map((b) => (b.id === batiment ? { ...b, ...v } : b)) } : { ...e.paquet, ecole: { ...e.paquet.ecole, ...v } } }));
    setMessage({ ton: "vert", texte: "Position enregistrée." });
  };

  return (
    <div className="space-y-3">
      <div className="sticky top-0 z-10 -mx-1 space-y-2 rounded-b-2xl bg-white/95 px-1 pt-1 pb-2 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <Bouton variante="discret" onClick={retour}>
            <ArrowLeft /> Écoles
          </Bouton>
          <div className="min-w-[60%] flex-1">
            <div className="text-[16px] leading-tight font-semibold sm:truncate sm:text-[17px]">{p.ecole.nom}</div>
            <div className="truncate text-[12px] text-zinc-500">
              {[p.ecole.inspection, p.ecole.localite, `${p.ecole.posteResponsable} : ${p.ecole.responsable ?? "poste vacant"}`].filter(Boolean).join(" · ")}
            </div>
          </div>
          <Reseau enLigne={enLigne} />
          <Bouton variante="principal" chargement={envoi} disabled={!enLigne || (!enAttente.length && !positionsEnAttente)} onClick={envoyer} title={enLigne ? "Envoyer ce qui a été complété" : "Envoi possible au retour de la connexion"}>
            <Send /> Envoyer{enAttente.length + positionsEnAttente ? ` (${enAttente.length + positionsEnAttente})` : ""}
          </Bouton>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segments
            valeur={onglet}
            changer={setOnglet}
            options={[
              { valeur: "personnel", libelle: `Personnel (${etat.lignes.length})` },
              { valeur: "ecole", libelle: "L’école : localisation, bâtiments" },
            ]}
          />
          {onglet === "personnel" && (
            <>
              <Segments
                valeur={vue}
                changer={setVue}
                options={[
                  { valeur: "grille", libelle: "Grille" },
                  { valeur: "fiche", libelle: "Une personne à la fois" },
                ]}
              />
              <label className="flex cursor-pointer items-center gap-1.5 text-[12px] text-zinc-600">
                <input type="checkbox" checked={manques} onChange={(e) => setManques(e.target.checked)} /> Montrer ce qui manque
              </label>
            </>
          )}
        </div>
      </div>
      {message && <Alerte ton={message.ton}>{message.texte}</Alerte>}

      {onglet === "personnel" ? (
        <>
          <AjoutAgent etat={etat} setEtat={setEtat} enLigne={enLigne} />
          {!etat.lignes.length ? (
            <Vide>Aucun agent rattaché à cette école dans nos bases : ajoutez-les ci-dessus.</Vide>
          ) : vue === "grille" ? (
            <Grille etat={etat} setEtat={setEtat} manques={manques} />
          ) : (
            <UnePersonne etat={etat} setEtat={setEtat} manques={manques} />
          )}
        </>
      ) : (
        <div className="space-y-3">
          <Carte titre="Localisation de l’école">
            <BlocLocalisation position={p.ecole} enregistrer={enregistrerPosition(null)} />
            {etat.positions.ecole && <p className="mt-1 text-[12px] text-or-700">Prélevée sans connexion : elle partira avec « Envoyer ».</p>}
          </Carte>
          <Carte titre={`Bâtiments (${p.batiments.length})`}>
            {!p.batiments.length ? (
              <p className="text-[13px] text-zinc-500">Aucun bâtiment enregistré. Ajoutez-les sur la fiche de l’école (avec la connexion), puis localisez chacun, surtout une annexe ailleurs.</p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {p.batiments.map((b) => (
                  <li key={b.id} className="space-y-1 py-2.5">
                    <div className="text-[14px] font-medium">{b.nom}</div>
                    <BlocLocalisation compact position={b} enregistrer={enregistrerPosition(b.id)} />
                  </li>
                ))}
              </ul>
            )}
          </Carte>
          <Carte titre="Salles et classes">
            <p className="text-[13px] text-zinc-600">
              {p.ecole.salles} salle(s), {p.ecole.classes} classe(s) enregistrée(s).{" "}
              {enLigne ? (
                <Link href={`/ecoles/${p.ecole.id}`} target="_blank" className="inline-flex items-center gap-1 text-marque-700 hover:underline">
                  Compléter sur la fiche de l’école <ExternalLink className="size-3" />
                </Link>
              ) : (
                "Elles se complètent sur la fiche de l’école, avec la connexion."
              )}
            </p>
          </Carte>
          <div className="flex flex-wrap gap-2 text-[12px] text-zinc-500">
            <span>Téléchargée le {new Date(p.telechargeLe).toLocaleString("fr-FR")}.</span>
            {enLigne && (
              <button type="button" className="cursor-pointer text-marque-700 hover:underline" onClick={() => void recharger()}>
                Recharger depuis la base
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ Ajouter un agent ------------------------------ */

function AjoutAgent({ etat, setEtat, enLigne }: { etat: Etat; setEtat: (f: (e: Etat) => Etat) => void; enLigne: boolean }) {
  const [q, setQ] = useState("");
  const [resultats, setResultats] = useState<{ id: number; nomComplet: string; statut: string; structureNom: string | null; matricule: string | null }[]>([]);
  const [cherche, setCherche] = useState(false);
  const p = etat.paquet;
  const ici = useMemo(() => {
    const m = plat(q).split(/\s+/).filter((x) => x.length >= 2);
    return m.length ? etat.lignes.filter((l) => m.every((x) => plat(`${l.valeurs.NOMS_PRENOMS ?? ""} ${l.valeurs.MATRICULE_SOLDE ?? ""}`).includes(x))) : [];
  }, [q, etat.lignes]);
  useEffect(() => {
    if (!enLigne || q.trim().length < 3) return;
    const t = setTimeout(() => {
      setCherche(true);
      api
        .get<{ lignes: typeof resultats }>(`/recensement/agents/recherche?q=${encodeURIComponent(q.trim())}`)
        .then((r) => setResultats(r.lignes.filter((x) => !etat.lignes.some((l) => l.agentId === x.id))))
        .catch(() => setResultats([]))
        .finally(() => setCherche(false));
    }, 350);
    return () => clearTimeout(t);
  }, [q, enLigne, etat.lignes]);

  const rattacher = async (id: number) => {
    try {
      const f = await api.get<{ agent: { id: number; nomComplet: string; statut: string; matricule: string | null; donnees: Record<string, unknown> } }>(`/recensement/agents/${id}`);
      setEtat((e) => ({ ...e, lignes: [nouvelleLigne(e.paquet, f.agent, true), ...e.lignes] }));
      setQ("");
    } catch {
      /* fiche hors du périmètre */
    }
  };
  const nouveau = () => {
    const valeurs = Object.fromEntries(p.colonnes.map((c) => [c.code, c.code === "NOMS_PRENOMS" ? q.trim().toUpperCase() : ""]));
    setEtat((e) => ({ ...e, lignes: [{ cle: `n${Date.now()}`, agentId: null, statut: e.paquet.statuts[0]?.code ?? "", statutOrigine: "", valeurs, origine: {}, nouveau: true }, ...e.lignes] }));
    setQ("");
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-3">
      <div className="relative">
        <UserPlus className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-zinc-400" />
        <Saisie value={q} onChange={(e) => setQ(e.target.value)} placeholder="Agent présent : tapez son nom ou son matricule" className="h-11 w-full pl-11 text-[15px]" aria-label="Chercher un agent" />
      </div>
      {q.trim().length >= 2 && (
        <div className="mt-2 space-y-1 text-[13px]">
          {ici.slice(0, 5).map((l) => (
            <div key={l.cle} className="flex items-center gap-2 rounded-lg bg-marque-50 px-3 py-1.5">
              <CheckCircle2 className="size-4 text-marque-600" /> <strong>{l.valeurs.NOMS_PRENOMS}</strong> est déjà dans la liste de cette école : complétez sa ligne.
            </div>
          ))}
          {(enLigne && q.trim().length >= 3 ? resultats : []).map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-zinc-50 px-3 py-1.5">
              <span className="min-w-0 flex-1">
                <strong>{r.nomComplet}</strong> <span className="text-zinc-500">· {r.structureNom ?? "sans école"}{r.matricule ? ` · ${r.matricule}` : ""}</span>
              </span>
              <Bouton onClick={() => void rattacher(r.id)} title="Il travaille dans cette école : sa fiche y sera rattachée à l’envoi">
                <Plus /> Il travaille ici
              </Bouton>
            </div>
          ))}
          {cherche && <p className="text-zinc-500">Recherche dans la base…</p>}
          {!enLigne && <p className="text-zinc-500">Sans connexion : la recherche se fait seulement dans cette école.</p>}
          <button type="button" onClick={nouveau} className="cursor-pointer text-[13px] font-medium text-marque-700 hover:underline">
            + Absent de nos bases : l’ajouter comme nouvel agent{q.trim() ? ` (« ${q.trim().toUpperCase()} »)` : ""}
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ Une case ------------------------------ */

function Case({ c, ligne, maj, manques, grande, idCase, auClavier }: { c: Colonne; ligne: Ligne; maj: (v: string) => void; manques: boolean; grande?: boolean; idCase?: string; auClavier?: (e: React.KeyboardEvent<HTMLElement>) => void }) {
  const v = ligne.valeurs[c.code] ?? "";
  const change = v !== (ligne.origine[c.code] ?? "");
  const manque = manques && !v && obligatoire(c, ligne.statut);
  const cls = cx(
    "w-full rounded-md border bg-transparent outline-none focus:border-marque-500 focus:bg-white focus:ring-2 focus:ring-marque-200",
    grande ? "h-11 px-3 text-[15px]" : "h-8 px-1.5 text-[13px]",
    change ? "border-or-300 bg-or-50" : manque ? "border-rouge-200 bg-rouge-50/60" : grande ? "border-zinc-200" : "border-transparent",
  );
  const commun = { id: idCase, "data-case": idCase, onKeyDown: auClavier, "aria-label": c.libelle, title: c.aide || c.libelle };
  if (c.type === "LISTE")
    return (
      <select {...commun} className={cls} value={v} onChange={(e) => maj(e.target.value)}>
        <option value="">—</option>
        {c.options.map((o) => (
          <option key={o.code} value={o.code}>
            {o.libelle}
          </option>
        ))}
      </select>
    );
  return (
    <input
      {...commun}
      className={cls}
      value={v}
      type={c.type === "DATE" ? "date" : "text"}
      inputMode={c.type === "NOMBRE" ? "numeric" : c.type === "TELEPHONE" ? "tel" : undefined}
      placeholder={c.type === "TABLEAU" ? (c.code === "ENFANTS" ? "Nom | date de naissance ; …" : "… ; …") : undefined}
      onChange={(e) => maj(c.code === "NOMS_PRENOMS" ? e.target.value.toUpperCase() : e.target.value)}
    />
  );
}

const ecrireCase = (setEtat: (f: (e: Etat) => Etat) => void, cle: string, code: string, v: string) =>
  setEtat((e) => ({ ...e, lignes: e.lignes.map((l) => (l.cle === cle ? { ...l, erreur: undefined, valeurs: { ...l.valeurs, [code]: v } } : l)) }));
const ecrireStatut = (setEtat: (f: (e: Etat) => Etat) => void, cle: string, v: string) => setEtat((e) => ({ ...e, lignes: e.lignes.map((l) => (l.cle === cle ? { ...l, statut: v } : l)) }));
const retirer = (setEtat: (f: (e: Etat) => Etat) => void, cle: string) => setEtat((e) => ({ ...e, lignes: e.lignes.filter((l) => l.cle !== cle) }));
const manquantes = (p: Paquet, l: Ligne) => p.colonnes.filter((c) => obligatoire(c, l.statut) && !l.valeurs[c.code]).length;

/* ------------------------------ Vue grille (comme Excel) ------------------------------ */

function Grille({ etat, setEtat, manques }: { etat: Etat; setEtat: (f: (e: Etat) => Etat) => void; manques: boolean }) {
  const p = etat.paquet;
  const table = useRef<HTMLTableElement>(null);
  // Entrée : la même colonne, ligne suivante (Maj+Entrée : au-dessus) ; Tab avance naturellement
  const auClavier = (r: number, k: number) => (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const cible = table.current?.querySelector<HTMLElement>(`[data-case="${r + (e.shiftKey ? -1 : 1)}-${k}"]`);
    cible?.focus();
  };
  const vides = (code: string) => etat.lignes.filter((l) => !l.valeurs[code] && obligatoire(p.colonnes.find((c) => c.code === code)!, l.statut)).length;
  return (
    <div className="overflow-auto rounded-2xl border border-zinc-200 bg-white" style={{ maxHeight: "70vh" }}>
      <table ref={table} className="min-w-full border-separate border-spacing-0 text-left">
        <thead className="sticky top-0 z-[2] bg-zinc-50 text-[11px] font-semibold text-zinc-600">
          <tr>
            <th className="sticky left-0 z-[3] min-w-56 border-b border-zinc-200 bg-zinc-50 px-2 py-2">Noms et prénoms</th>
            <th className="min-w-32 border-b border-zinc-200 px-2 py-2">Statut</th>
            {p.colonnes
              .filter((c) => c.code !== "NOMS_PRENOMS")
              .map((c) => (
                <th key={c.code} className={cx("border-b border-zinc-200 px-2 py-2", c.type === "TABLEAU" ? "min-w-72" : c.type === "DATE" ? "min-w-36" : "min-w-32")} title={c.aide}>
                  {c.libelle}
                  {manques && vides(c.code) > 0 && <span className="ml-1 rounded-full bg-rouge-100 px-1.5 text-[10px] text-rouge-700">{vides(c.code)}</span>}
                </th>
              ))}
            <th className="border-b border-zinc-200 px-2 py-2">État</th>
          </tr>
        </thead>
        <tbody>
          {etat.lignes.map((l, r) => {
            const m = manquantes(p, l);
            const cols = p.colonnes.filter((c) => c.code !== "NOMS_PRENOMS");
            const nom = p.colonnes.find((c) => c.code === "NOMS_PRENOMS");
            return (
              <tr key={l.cle} className={cx("align-top", l.erreur && "bg-rouge-50/50")}>
                <td className="sticky left-0 z-[1] border-b border-zinc-100 bg-white px-1 py-1">
                  {nom && <Case c={nom} ligne={l} maj={(v) => ecrireCase(setEtat, l.cle, nom.code, v)} manques={manques} idCase={`${r}-0`} auClavier={auClavier(r, 0)} />}
                  <div className="flex flex-wrap gap-1 px-1 pt-0.5">
                    {l.nouveau && <Badge ton="bleu">nouveau</Badge>}
                    {l.rattacher && <Badge ton="bleu">arrive ici</Badge>}
                    {l.erreur && <span className="text-[11px] text-rouge-700">{l.erreur}</span>}
                  </div>
                </td>
                <td className="border-b border-zinc-100 px-1 py-1">
                  <select data-case={`${r}-1`} onKeyDown={auClavier(r, 1)} className={cx("h-8 w-full rounded-md border bg-transparent px-1 text-[13px] outline-none focus:border-marque-500", l.statut !== l.statutOrigine ? "border-or-300 bg-or-50" : "border-transparent")} value={l.statut} onChange={(e) => ecrireStatut(setEtat, l.cle, e.target.value)} aria-label="Statut">
                    {p.statuts.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.libelle}
                      </option>
                    ))}
                  </select>
                </td>
                {cols.map((c, k) => (
                  <td key={c.code} className="border-b border-zinc-100 px-1 py-1">
                    <Case c={c} ligne={l} maj={(v) => ecrireCase(setEtat, l.cle, c.code, v)} manques={manques} idCase={`${r}-${k + 2}`} auClavier={auClavier(r, k + 2)} />
                  </td>
                ))}
                <td className="border-b border-zinc-100 px-2 py-1.5 text-[12px] whitespace-nowrap">
                  {m ? <span className="text-rouge-700">manque {m}</span> : <span className="text-marque-700">complet</span>}
                  {(l.nouveau || l.rattacher) && (
                    <button type="button" title="Retirer cette ligne" className="ml-2 cursor-pointer text-zinc-400 hover:text-rouge-600" onClick={() => retirer(setEtat, l.cle)}>
                      <Trash2 className="inline size-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------ Vue « une personne à la fois » (téléphone) ------------------------------ */

function UnePersonne({ etat, setEtat, manques }: { etat: Etat; setEtat: (f: (e: Etat) => Etat) => void; manques: boolean }) {
  const p = etat.paquet;
  const [i, setI] = useState(0);
  const [seulementIncomplets, setSeulementIncomplets] = useState(false);
  const liste = seulementIncomplets ? etat.lignes.filter((l) => manquantes(p, l) > 0) : etat.lignes;
  const n = Math.min(i, Math.max(0, liste.length - 1));
  const l = liste[n];
  if (!l) return <Vide>Tous les agents sont complets.</Vide>;
  const m = manquantes(p, l);
  return (
    <div className="mx-auto max-w-xl space-y-3">
      <div className="flex items-center gap-2 text-[13px]">
        <Bouton disabled={n === 0} onClick={() => setI(n - 1)} aria-label="Agent précédent">
          <ArrowLeft />
        </Bouton>
        <span className="flex-1 text-center text-zinc-600">
          Agent {n + 1} sur {liste.length}
        </span>
        <Bouton variante="principal" disabled={n >= liste.length - 1} onClick={() => setI(n + 1)}>
          Suivant <ArrowRight />
        </Bouton>
      </div>
      <label className="flex cursor-pointer items-center gap-1.5 text-[12px] text-zinc-600">
        <input type="checkbox" checked={seulementIncomplets} onChange={(e) => (setSeulementIncomplets(e.target.checked), setI(0))} /> Seulement ceux à qui il manque quelque chose
      </label>
      <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          {l.nouveau && <Badge ton="bleu">nouveau</Badge>}
          {l.rattacher && <Badge ton="bleu">arrive ici</Badge>}
          {m ? <Badge ton="rouge">manque {m}</Badge> : <Badge ton="vert">complet</Badge>}
          {l.erreur && <span className="text-[12px] text-rouge-700">{l.erreur}</span>}
        </div>
        <label className="block text-[12px] font-medium text-zinc-600">
          Statut
          <Liste className="h-11 text-[15px]" value={l.statut} onChange={(e) => ecrireStatut(setEtat, l.cle, e.target.value)} options={p.statuts.map((s) => ({ valeur: s.code, libelle: s.libelle }))} />
        </label>
        {p.colonnes.map((c) => (
          <label key={c.code} className="block text-[12px] font-medium text-zinc-600">
            {c.libelle}
            {c.type === "TABLEAU" && <span className="font-normal text-zinc-400"> — séparez par « ; »</span>}
            <Case c={c} ligne={l} grande maj={(v) => ecrireCase(setEtat, l.cle, c.code, v)} manques={manques} />
          </label>
        ))}
        {(l.nouveau || l.rattacher) && (
          <button type="button" className="cursor-pointer text-[12px] text-rouge-600 hover:underline" onClick={() => retirer(setEtat, l.cle)}>
            Retirer cette ligne
          </button>
        )}
      </div>
      <div className="flex justify-end">
        <Bouton variante="principal" disabled={n >= liste.length - 1} onClick={() => setI(n + 1)}>
          Suivant <ArrowRight />
        </Bouton>
      </div>
      <p className="flex items-center gap-1.5 text-[12px] text-zinc-500">
        <Smartphone className="size-3.5" /> Tout est enregistré sur l’appareil à chaque frappe. <LayoutGrid className="ml-2 size-3.5" /> Sur une tablette, la grille va plus vite.
      </p>
    </div>
  );
}
