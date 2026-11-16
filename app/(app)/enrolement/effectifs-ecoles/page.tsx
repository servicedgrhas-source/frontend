"use client";

import { Download, GitMerge, Pencil } from "lucide-react";
import { useState } from "react";
import { nf } from "@/components/enrolement/volontaires";
import { useSession } from "@/components/session";
import { Alerte, Badge, Bouton, Carte, Champ, Chiffre, EnTete, Liste, Modale, Saisie, Segments, Tableau, Vide } from "@/components/ui";
import { api, qs, useApi } from "@/lib/api";
import { accesDonne } from "@/lib/espaces";
import { peut } from "@/lib/libelles";

type Effectif = "volontaires" | "communautaires" | "contractuels" | "fonctionnaires";
const EFFECTIFS: [Effectif, string, string][] = [
  ["volontaires", "Volontaires", "V"],
  ["communautaires", "Communautaires", "C"],
  ["contractuels", "Contractuels", "Ct"],
  ["fonctionnaires", "Fonctionnaires", "F"],
];

const CYCLES: Record<string, string> = {
  PRESCOLAIRE: "Préscolaire",
  PRIMAIRE: "Primaire",
  COLLEGE: "Collège",
  LYCEE: "Lycée",
  ALPHABETISATION: "Alphabétisation",
};

type Nombres = Record<Effectif, number> & { total: number };

interface Ecole extends Nombres {
  id: string;
  departementId: number | null;
  departement: string;
  cycle: string | null;
  nom: string;
  nomCorrige: boolean;
  organigramme: boolean;
  ecritures: number;
  jumelees: number;
  proche: { id: string; nom: string; score: number } | null;
}

interface EcoleDetaillee extends Ecole {
  variantes: { ecrit: string; n: number }[];
}

interface Effectifs {
  totaux: Nombres & { ecoles: number; sousSeuil: number };
  parDeppsa: (Nombres & { departement: string; ecoles: number; sousSeuil: number })[];
  sansEcole: { effectif: Effectif; libelle: string; sans: number; administration: number; ecartees: number }[];
  reclassees: number;
  aHarmoniser: number;
  horsOrganigramme: number;
  ressemblances: number;
  decisions: number;
  total: number;
  ecoles: Ecole[];
}

interface Decision {
  id: number;
  type: "JUMELEE" | "DIFFERENTES" | "ECARTEE" | "MISE_A_JOUR";
  ecole: { id: string; nom: string; departement: string; cycle: string | null };
  autre: { id: string; nom: string; departement: string; cycle: string | null } | null;
  nom: string | null;
  departement: string | null;
  cycle: string | null;
  motif: string | null;
  par: string | null;
  le: string;
}

const pourcent = (s: number) => `${Math.round(s * 100)} %`;

/** Bloc gris qui pulse, à la place d'un contenu en cours de chargement. */
function Os({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-zinc-300/70 ${className ?? ""}`} />;
}

/** Squelette des tuiles et du tableau, pendant que les chiffres se recalculent. */
function Squelette() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Chargement des effectifs">
      <div className="grid gap-3 sm:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">
            <Os className="h-3 w-24" />
            <Os className="h-7 w-20" />
            <Os className="h-3 w-32" />
          </div>
        ))}
      </div>
      <div className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">
        <Os className="h-5 w-40" />
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex gap-4">
            <Os className="h-4 w-32" />
            <Os className="h-4 flex-1" />
            <Os className="h-4 w-16" />
            <Os className="h-4 w-16" />
            <Os className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Les effectifs d'une école en une ligne : « V 2 · C 14 · Ct 5 · F 13 ». */
function EnBref({ e }: { e: Nombres }) {
  return (
    <span className="text-[12px] tabular-nums text-zinc-600">
      {EFFECTIFS.map(([k, , abr]) => `${abr} ${e[k]}`).join(" · ")} — <strong>{e.total}</strong> personne(s)
    </span>
  );
}

/** Une école dans une comparaison : nom, DEPPSA, effectifs, écritures rencontrées. */
function FicheEcole({ e }: { e: EcoleDetaillee }) {
  return (
    <div className="min-w-0 space-y-1.5 rounded-xl border border-zinc-200 p-3">
      <div className="font-semibold">{e.nom}</div>
      <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-zinc-500">
        {e.departement} · {e.cycle ? CYCLES[e.cycle] : "cycle non reconnu"}
        {e.organigramme ? <Badge ton="vert">dans l’organigramme</Badge> : <Badge ton="gris">hors organigramme</Badge>}
        {e.jumelees > 0 && <Badge ton="bleu">{e.jumelees} école(s) jumelée(s)</Badge>}
      </div>
      <EnBref e={e} />
      <ul className="space-y-0.5 text-[11px] text-zinc-500">
        {e.variantes.map((v) => (
          <li key={v.ecrit}>
            « {v.ecrit} » <span className="tabular-nums">({v.n})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Effectifs par école (demande de la Banque mondiale, 16/11/2026) : pour chaque école, rangée par
 * DEPPSA, le nombre de volontaires, de communautaires, de contractuels et de fonctionnaires. Les
 * écoles qui ont moins de 3 fonctionnaires sont signalées : elles passent en priorité. Les écoles
 * dont les noms se ressemblent se tranchent ici, comme les doublons de personnes : même école
 * (jumelées), deux écoles différentes, pas une école (écartée), nom ou DEPPSA corrigés. Aucun nom de
 * personne, seulement des nombres.
 */
export default function EffectifsEcoles() {
  const { profil, refs } = useSession();
  const [cycle, setCycle] = useState("PRESCOLAIRE");
  const [departementId, setDepartementId] = useState("");
  const [seuil, setSeuil] = useState("3");
  const [sousSeuil, setSousSeuil] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [page, setPage] = useState(1);
  const [pageR, setPageR] = useState(1);
  const [vue, setVue] = useState<"deppsa" | "ecoles" | "ressemblances" | "decisions">("deppsa");
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const s = Math.min(50, Math.max(1, Number(seuil) || 3));
  const filtres = { cycle, departementId: departementId || undefined, seuil: s };
  const d = useApi<Effectifs>(`/enrolement/effectifs-ecoles${qs({ ...filtres, sousSeuil: sousSeuil ? 1 : undefined, recherche: recherche.trim() || undefined, page, taille: 50 })}`);
  const r = useApi<{ total: number; paires: { score: number; a: EcoleDetaillee; b: EcoleDetaillee }[] }>(vue === "ressemblances" ? `/enrolement/effectifs-ecoles/ressemblances${qs({ ...filtres, page: pageR })}` : null);
  const dec = useApi<Decision[]>(vue === "decisions" ? "/enrolement/effectifs-ecoles/decisions" : null);
  if (!peut.traiter(profil.role) && !accesDonne(profil)) return <Alerte>Accès réservé aux agents de la DGRHAS.</Alerte>;

  const changer = (f: (v: string) => void) => (v: string) => {
    f(v);
    setPage(1);
    setPageR(1);
  };
  const toutRelire = () => {
    d.recharger();
    r.recharger();
    dec.recharger();
  };
  /** Une décision sur une école : enregistrée, puis tout est recompté. */
  const decider = async (cle: string, corps: Record<string, unknown>) => {
    setErreur(null);
    setEnCours(cle);
    try {
      await api.post("/enrolement/effectifs-ecoles/decisions", corps);
      toutRelire();
      return true;
    } catch (x) {
      setErreur((x as Error).message);
      return false;
    } finally {
      setEnCours(null);
    }
  };
  const annuler = async (id: number) => {
    setErreur(null);
    try {
      await api.delete(`/enrolement/effectifs-ecoles/decisions/${id}`);
      toutRelire();
    } catch (x) {
      setErreur((x as Error).message);
    }
  };
  const telecharger = () =>
    api.telecharger(`/enrolement/effectifs-ecoles/excel${qs({ ...filtres, sousSeuil: sousSeuil ? 1 : undefined })}`, "Effectifs par école.xlsx").catch((x: Error) => setErreur(x.message));
  const t = d.donnees?.totaux;
  const pages = d.donnees ? Math.max(1, Math.ceil(d.donnees.total / 50)) : 1;
  const pagesR = r.donnees ? Math.max(1, Math.ceil(r.donnees.total / 20)) : 1;
  const voirEcoles = (dep: string | null, sous: boolean) => {
    const id = dep ? refs.departements.find((x) => x.nom === dep)?.id : undefined;
    if (dep && id) setDepartementId(String(id));
    setSousSeuil(sous);
    setVue("ecoles");
    setPage(1);
  };
  // Le squelette pendant un recalcul (filtre changé, décision prise)
  const charge = !d.donnees || d.chargement;

  return (
    <div className="space-y-6">
      <EnTete
        titre="Effectifs par école (Banque mondiale)"
        sousTitre={`Pour chaque école, rangée par DEPPSA : le nombre de volontaires, de communautaires, de contractuels et de fonctionnaires. En orange, les écoles qui ont moins de ${s} fonctionnaires : elles passent en priorité. Les écoles dont les noms se ressemblent se tranchent ici, comme les doublons de personnes. Seulement des nombres, aucun nom de personne.`}
        actions={
          <Bouton onClick={telecharger} title="Par école, par DEPPSA, sans école, noms à harmoniser, écoles qui se ressemblent, DEPPSA reclassées (en-tête officiel)">
            <Download /> Excel
          </Bouton>
        }
      />
      {erreur && <Alerte>{erreur}</Alerte>}

      <Carte>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Liste
            value={cycle}
            onChange={(e) => changer(setCycle)(e.target.value)}
            options={[{ valeur: "TOUS", libelle: "Tous les cycles" }, ...Object.entries(CYCLES).map(([valeur, libelle]) => ({ valeur, libelle })), { valeur: "SANS", libelle: "Cycle non reconnu" }]}
          />
          <Liste value={departementId} onChange={(e) => changer(setDepartementId)(e.target.value)} vide="Toutes les DEPPSA" options={refs.departements.map((x) => ({ valeur: x.id, libelle: x.nom }))} />
          <label className="flex items-center gap-2 whitespace-nowrap text-[13px]">
            Seuil :
            <Saisie type="number" min={1} max={50} className="w-20 shrink-0" value={seuil} onChange={(e) => changer(setSeuil)(e.target.value)} />
            fonctionnaires
          </label>
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" className="size-4 accent-marque-600" checked={sousSeuil} onChange={(e) => { setSousSeuil(e.target.checked); setPage(1); }} />
            Seulement les écoles de moins de {s} fonctionnaires
          </label>
        </div>
      </Carte>

      {d.erreur && <Alerte>{d.erreur}</Alerte>}
      {charge || !t || !d.donnees ? (
        <Squelette />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3 2xl:grid-cols-6">
            <Chiffre libelle="Écoles" valeur={nf.format(t.ecoles)} ton="gris" detail={cycle === "TOUS" ? "tous les cycles" : (CYCLES[cycle] ?? "cycle non reconnu")} />
            <Chiffre libelle={`Moins de ${s} fonctionnaires`} valeur={nf.format(t.sousSeuil)} ton="rouge" detail={t.ecoles ? `${Math.round((t.sousSeuil * 100) / t.ecoles)} % des écoles` : ""} />
            {EFFECTIFS.map(([k, libelle]) => (
              <Chiffre key={k} libelle={libelle} valeur={nf.format(t[k])} ton={k === "fonctionnaires" ? "vert" : k === "contractuels" ? "bleu" : "gris"} detail={t.total ? `${Math.round((t[k] * 100) / t.total)} % du personnel compté` : ""} />
            ))}
          </div>

          <Segments
            valeur={vue}
            changer={setVue}
            options={[
              { valeur: "deppsa", libelle: "Par DEPPSA" },
              { valeur: "ecoles", libelle: `Par école (${nf.format(d.donnees.total)})` },
              { valeur: "ressemblances", libelle: `Écoles qui se ressemblent (${nf.format(d.donnees.ressemblances)})` },
              { valeur: "decisions", libelle: `Décisions (${nf.format(d.donnees.decisions)})` },
            ]}
          />

          {vue === "deppsa" && (
            <div className="space-y-6">
              <Carte titre="Par DEPPSA">
                <Tableau>
                  <thead>
                    <tr>
                      <th>DEPPSA</th>
                      <th className="text-right">Écoles</th>
                      <th className="text-right">Moins de {s} fonct.</th>
                      {EFFECTIFS.map(([k, l]) => (
                        <th key={k} className="text-right">
                          {l}
                        </th>
                      ))}
                      <th className="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.donnees.parDeppsa.map((x) => (
                      <tr key={x.departement}>
                        <td>
                          <button type="button" className="text-left hover:underline" onClick={() => voirEcoles(x.departement, false)} title="Voir les écoles de cette DEPPSA">
                            {x.departement}
                          </button>
                        </td>
                        <td className="text-right tabular-nums">{nf.format(x.ecoles)}</td>
                        <td className="text-right tabular-nums">
                          {x.sousSeuil ? (
                            <button type="button" className="font-semibold text-rouge-600 hover:underline" onClick={() => voirEcoles(x.departement, true)} title="Voir ces écoles">
                              {nf.format(x.sousSeuil)}
                            </button>
                          ) : (
                            0
                          )}
                        </td>
                        {EFFECTIFS.map(([k]) => (
                          <td key={k} className="text-right tabular-nums">
                            {nf.format(x[k])}
                          </td>
                        ))}
                        <td className="text-right tabular-nums">{nf.format(x.total)}</td>
                      </tr>
                    ))}
                    <tr className="font-semibold">
                      <td>Total</td>
                      <td className="text-right tabular-nums">{nf.format(t.ecoles)}</td>
                      <td className="text-right tabular-nums">{nf.format(t.sousSeuil)}</td>
                      {EFFECTIFS.map(([k]) => (
                        <td key={k} className="text-right tabular-nums">
                          {nf.format(t[k])}
                        </td>
                      ))}
                      <td className="text-right tabular-nums">{nf.format(t.total)}</td>
                    </tr>
                  </tbody>
                </Tableau>
              </Carte>
              <div className="grid gap-6 lg:grid-cols-2">
                <Carte titre="Personnes sans école connue">
                  <p className="mb-2 text-[12px] text-zinc-500">Pas comptées dans le tableau : école (ou lieu de service) non renseignée, poste dans une inspection, une direction, un cabinet, ou « école » écartée. Tous cycles confondus.</p>
                  <Tableau>
                    <thead>
                      <tr>
                        <th></th>
                        <th className="text-right">Non renseignée</th>
                        <th className="text-right">Administration</th>
                        <th className="text-right">Écartée</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.donnees.sansEcole.map((x) => (
                        <tr key={x.effectif}>
                          <td>{x.libelle}</td>
                          <td className="text-right tabular-nums">{nf.format(x.sans)}</td>
                          <td className="text-right tabular-nums">{nf.format(x.administration)}</td>
                          <td className="text-right tabular-nums">{nf.format(x.ecartees)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Tableau>
                </Carte>
                <Carte titre="Qualité des données (retours à faire)">
                  <ul className="space-y-2 text-[13px] text-zinc-700">
                    <li>
                      <button type="button" className="text-left hover:underline" onClick={() => setVue("ressemblances")}>
                        <strong className="tabular-nums">{nf.format(d.donnees.ressemblances)}</strong> paire(s) d’écoles dont les noms se ressemblent : à trancher (même école ou deux écoles).
                      </button>
                    </li>
                    <li>
                      <strong className="tabular-nums">{nf.format(d.donnees.aHarmoniser)}</strong> école(s) dont le nom est écrit de plusieurs façons, déjà reconnues comme une seule (feuille « Noms à harmoniser » de l’Excel).
                    </li>
                    <li>
                      <strong className="tabular-nums">{nf.format(d.donnees.horsOrganigramme)}</strong> école(s) absentes de l’organigramme (Établissements) : connues seulement par le nom écrit dans les fichiers.
                    </li>
                    <li>
                      <strong className="tabular-nums">{nf.format(d.donnees.reclassees)}</strong> fonctionnaire(s) ou contractuel(s) comptés dans une nouvelle DEPPSA (Congo-Oubangui, Djoué-Léfini, Nkéni-Alima) d’après leur école. Leur fiche n’est pas modifiée.
                    </li>
                  </ul>
                </Carte>
              </div>
            </div>
          )}

          {vue === "ecoles" && (
            <Carte
              titre={`Par école (${nf.format(d.donnees.total)})`}
              actions={<Saisie className="w-64" value={recherche} onChange={(e) => { setRecherche(e.target.value); setPage(1); }} placeholder="Nom de l’école…" />}
            >
              {!d.donnees.ecoles.length ? (
                <Vide>Aucune école pour ces filtres.</Vide>
              ) : (
                <Tableau>
                  <thead>
                    <tr>
                      <th>DEPPSA</th>
                      <th>École</th>
                      {EFFECTIFS.map(([k, l]) => (
                        <th key={k} className="text-right">
                          {l}
                        </th>
                      ))}
                      <th className="text-right">Total</th>
                      <th>Nom le plus proche</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.donnees.ecoles.map((e) => {
                      const sous = e.fonctionnaires < s;
                      return (
                        <tr key={e.id} className={sous ? "bg-or-100/50" : undefined}>
                          <td className="text-[12px] text-zinc-600">{e.departement}</td>
                          <td>
                            <span className="font-medium">{e.nom}</span>
                            {cycle === "TOUS" && e.cycle && <span className="ml-1 text-[11px] text-zinc-500">· {CYCLES[e.cycle]}</span>}
                            <div className="mt-0.5 flex flex-wrap gap-1">
                              {!e.organigramme && <Badge ton="gris">hors organigramme</Badge>}
                              {e.ecritures > 1 && <Badge ton="gris">{e.ecritures} écritures</Badge>}
                              {e.jumelees > 0 && <Badge ton="bleu">{e.jumelees} jumelée(s)</Badge>}
                              {e.nomCorrige && <Badge ton="vert">nom corrigé</Badge>}
                            </div>
                          </td>
                          {EFFECTIFS.map(([k]) => (
                            <td key={k} className={`text-right tabular-nums ${k === "fonctionnaires" && sous ? "font-semibold text-rouge-600" : ""}`}>
                              {nf.format(e[k])}
                            </td>
                          ))}
                          <td className="text-right tabular-nums font-semibold">{nf.format(e.total)}</td>
                          <td className="text-[12px]">
                            {e.proche ? (
                              <span className="text-or-700">
                                ≈ {e.proche.nom} <span className="tabular-nums text-zinc-500">({pourcent(e.proche.score)})</span>
                              </span>
                            ) : (
                              <span className="text-zinc-400">—</span>
                            )}
                          </td>
                          <td>
                            <Bouton variante="discret" onClick={() => setOuverte(e.id)} title="Comparer avec les écoles proches, jumeler, corriger, écarter">
                              <Pencil /> Décider
                            </Bouton>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Tableau>
              )}
              {pages > 1 && (
                <div className="mt-3 flex items-center justify-between text-[13px]">
                  <Bouton variante="discret" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    ← Précédent
                  </Bouton>
                  <span className="text-zinc-500">
                    Page {page} sur {nf.format(pages)}
                  </span>
                  <Bouton variante="discret" disabled={page >= pages} onClick={() => setPage(page + 1)}>
                    Suivant →
                  </Bouton>
                </div>
              )}
            </Carte>
          )}

          {vue === "ressemblances" && (
            <Carte titre={`Écoles qui se ressemblent (${nf.format(r.donnees?.total ?? d.donnees.ressemblances)})`}>
              <p className="mb-3 text-[12px] text-zinc-500">
                Deux écoles de la même DEPPSA dont les noms se ressemblent. « Même école » les compte ensemble sous le nom choisi ; « Deux écoles différentes » ne les propose plus. Rien n’est modifié dans les fichiers ni dans les fiches, et chaque décision peut être annulée (onglet « Décisions »).
              </p>
              {r.erreur && <Alerte>{r.erreur}</Alerte>}
              {!r.donnees || r.chargement ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }, (_, i) => (
                    <Os key={i} className="h-36 w-full" />
                  ))}
                </div>
              ) : !r.donnees.paires.length ? (
                <Vide>Aucune paire à trancher pour ces filtres.</Vide>
              ) : (
                <div className="space-y-4">
                  {r.donnees.paires.map((p) => (
                    <div key={`${p.a.id}§${p.b.id}`} className="rounded-2xl border border-zinc-200 p-3">
                      <div className="mb-2 flex items-center justify-between text-[12px] text-zinc-500">
                        <span>
                          {p.a.departement} · ressemblance <strong className="text-zinc-800">{pourcent(p.score)}</strong>
                        </span>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <FicheEcole e={p.a} />
                        <FicheEcole e={p.b} />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Bouton variante="principal" chargement={enCours === p.b.id} onClick={() => decider(p.b.id, { type: "JUMELEE", cle: p.b.id, autreCle: p.a.id })}>
                          <GitMerge /> Même école : garder « {p.a.nom} »
                        </Bouton>
                        <Bouton chargement={enCours === p.a.id} onClick={() => decider(p.a.id, { type: "JUMELEE", cle: p.a.id, autreCle: p.b.id })}>
                          <GitMerge /> Même école : garder « {p.b.nom} »
                        </Bouton>
                        <Bouton variante="discret" onClick={() => decider(p.a.id, { type: "DIFFERENTES", cle: p.a.id, autreCle: p.b.id })}>
                          Deux écoles différentes
                        </Bouton>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {pagesR > 1 && (
                <div className="mt-3 flex items-center justify-between text-[13px]">
                  <Bouton variante="discret" disabled={pageR <= 1} onClick={() => setPageR(pageR - 1)}>
                    ← Précédent
                  </Bouton>
                  <span className="text-zinc-500">
                    Page {pageR} sur {nf.format(pagesR)}
                  </span>
                  <Bouton variante="discret" disabled={pageR >= pagesR} onClick={() => setPageR(pageR + 1)}>
                    Suivant →
                  </Bouton>
                </div>
              )}
            </Carte>
          )}

          {vue === "decisions" && (
            <Carte titre="Décisions prises sur les écoles">
              {dec.erreur && <Alerte>{dec.erreur}</Alerte>}
              {!dec.donnees || dec.chargement ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Os key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : !dec.donnees.length ? (
                <Vide>Aucune décision pour le moment.</Vide>
              ) : (
                <ListeDecisions decisions={dec.donnees} annuler={annuler} controle={peut.controler(profil.role)} />
              )}
            </Carte>
          )}
        </>
      )}

      {ouverte && (
        <ModaleEcole
          id={ouverte}
          fermer={() => setOuverte(null)}
          decider={decider}
          annuler={annuler}
          controle={peut.controler(profil.role)}
          departements={refs.departements}
        />
      )}
    </div>
  );
}

const LIBELLE_DECISION: Record<Decision["type"], string> = {
  JUMELEE: "Même école",
  DIFFERENTES: "Deux écoles différentes",
  ECARTEE: "Écartée (pas une école)",
  MISE_A_JOUR: "Mise à jour",
};

/** Les décisions, avec « Annuler » pour revenir au comptage d'avant. */
function ListeDecisions({ decisions, annuler, controle }: { decisions: Decision[]; annuler: (id: number) => void; controle: boolean }) {
  return (
    <Tableau>
      <thead>
        <tr>
          <th>Décision</th>
          <th>École</th>
          <th>Détail</th>
          <th>Par</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {decisions.map((x) => (
          <tr key={x.id} className="align-top">
            <td>
              <Badge ton={x.type === "JUMELEE" ? "bleu" : x.type === "ECARTEE" ? "rouge" : x.type === "MISE_A_JOUR" ? "vert" : "gris"}>{LIBELLE_DECISION[x.type]}</Badge>
            </td>
            <td>
              <span className="font-medium">{x.ecole.nom}</span>
              <div className="text-[11px] text-zinc-500">{x.ecole.departement}</div>
            </td>
            <td className="text-[12px] text-zinc-600">
              {x.type === "JUMELEE" && x.autre && <>comptée avec « {x.autre.nom} »</>}
              {x.type === "DIFFERENTES" && x.autre && <>pas la même que « {x.autre.nom} »</>}
              {x.type === "MISE_A_JOUR" && [x.nom && `nom : « ${x.nom} »`, x.departement && `DEPPSA : ${x.departement}`, x.cycle && `cycle : ${CYCLES[x.cycle] ?? x.cycle}`].filter(Boolean).join(" · ")}
              {x.motif && <div className="text-zinc-500">Motif : {x.motif}</div>}
            </td>
            <td className="text-[12px] text-zinc-500">
              {x.par}
              <br />
              {new Date(x.le).toLocaleString("fr-FR")}
            </td>
            <td>
              {(x.type !== "ECARTEE" || controle) && (
                <Bouton variante="discret" onClick={() => annuler(x.id)} title="Revenir au comptage d’avant cette décision">
                  Annuler
                </Bouton>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </Tableau>
  );
}

/** Une école : la comparer aux plus proches, la jumeler, corriger son nom ou sa DEPPSA, l'écarter. */
function ModaleEcole({
  id,
  fermer,
  decider,
  annuler,
  controle,
  departements,
}: {
  id: string;
  fermer: () => void;
  decider: (cle: string, corps: Record<string, unknown>) => Promise<boolean>;
  annuler: (id: number) => void;
  controle: boolean;
  departements: { id: number; nom: string }[];
}) {
  const d = useApi<{ ecole: EcoleDetaillee; proches: (Ecole & { score: number })[]; decisions: Decision[] }>(`/enrolement/effectifs-ecoles/ecole${qs({ id })}`);
  const [cherche, setCherche] = useState("");
  const e = d.donnees?.ecole;
  const autres = useApi<Effectifs>(cherche.trim().length >= 2 && e ? `/enrolement/effectifs-ecoles${qs({ cycle: "TOUS", departementId: e.departementId ?? undefined, recherche: cherche.trim(), taille: 8 })}` : null);
  const [nom, setNom] = useState<string | null>(null);
  const [dep, setDep] = useState<string | null>(null);
  const [cyc, setCyc] = useState<string | null>(null);
  const [motif, setMotif] = useState("");
  const [ecarter, setEcarter] = useState(false);
  const fait = async (corps: Record<string, unknown>) => {
    if (await decider(id, { cle: id, motif: motif.trim() || undefined, ...corps })) fermer();
  };
  const candidats = [...(d.donnees?.proches ?? []), ...(autres.donnees?.ecoles ?? []).filter((x) => x.id !== id && !d.donnees?.proches.some((p) => p.id === x.id)).map((x) => ({ ...x, score: NaN }))];

  return (
    <Modale titre={e ? e.nom : "École"} ouverte fermer={fermer} large>
      {d.erreur && <Alerte>{d.erreur}</Alerte>}
      {!e ? (
        <div className="space-y-3">
          <Os className="h-24 w-full" />
          <Os className="h-40 w-full" />
        </div>
      ) : (
        <div className="space-y-5 text-[13px]">
          <FicheEcole e={e} />

          <section className="space-y-2">
            <h3 className="font-semibold">Même école qu’une autre ?</h3>
            <p className="text-[12px] text-zinc-500">Les écoles de la même DEPPSA dont le nom se rapproche le plus. « Même école » compte ses effectifs avec l’autre, sous le nom de l’autre.</p>
            <Saisie value={cherche} onChange={(x) => setCherche(x.target.value)} placeholder="Chercher une autre école de la DEPPSA…" />
            {!candidats.length ? (
              <Vide>Aucune école proche.</Vide>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {candidats.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <div className="min-w-0">
                      <div className="font-medium">
                        {p.nom} {!Number.isNaN(p.score) && <span className="text-[12px] font-normal text-zinc-500">({pourcent(p.score)})</span>}
                      </div>
                      <EnBref e={p} />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Bouton variante="principal" onClick={() => fait({ type: "JUMELEE", autreCle: p.id })} title={`Compter « ${e.nom} » avec « ${p.nom} »`}>
                        <GitMerge /> Même école
                      </Bouton>
                      <Bouton variante="discret" onClick={() => fait({ type: "DIFFERENTES", autreCle: p.id })}>
                        Différentes
                      </Bouton>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">Mettre à jour</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <Champ libelle="Nom de l’école">
                <Saisie value={nom ?? e.nom} onChange={(x) => setNom(x.target.value)} />
              </Champ>
              <Champ libelle="DEPPSA">
                <Liste value={dep ?? String(e.departementId ?? "")} onChange={(x) => setDep(x.target.value)} vide="—" options={departements.map((x) => ({ valeur: x.id, libelle: x.nom }))} />
              </Champ>
              <Champ libelle="Cycle">
                <Liste value={cyc ?? e.cycle ?? ""} onChange={(x) => setCyc(x.target.value)} vide="—" options={Object.entries(CYCLES).map(([valeur, libelle]) => ({ valeur, libelle }))} />
              </Champ>
            </div>
            <Champ libelle="Motif (facultatif)">
              <Saisie value={motif} onChange={(x) => setMotif(x.target.value)} placeholder="Ex. : nom officiel d’après la DEPPSA" />
            </Champ>
            <Bouton
              disabled={(nom === null || nom.trim() === e.nom) && (dep === null || dep === String(e.departementId ?? "")) && (cyc === null || cyc === (e.cycle ?? ""))}
              onClick={() =>
                fait({
                  type: "MISE_A_JOUR",
                  nom: nom !== null && nom.trim() !== e.nom ? nom.trim() : undefined,
                  departementId: dep && dep !== String(e.departementId ?? "") ? Number(dep) : undefined,
                  cycle: cyc && cyc !== (e.cycle ?? "") ? cyc : undefined,
                })
              }
            >
              <Pencil /> Enregistrer la mise à jour
            </Bouton>
          </section>

          {controle && (
            <section className="space-y-2 rounded-xl border border-rouge-100 p-3">
              <h3 className="font-semibold text-rouge-600">Ce n’est pas une école</h3>
              <p className="text-[12px] text-zinc-500">Mairie, centre de santé, nom vide de sens… ou école fermée : elle n’est plus comptée, ses {e.total} personne(s) passent dans « sans école ». Réservé au contrôle ; annulable.</p>
              {!ecarter ? (
                <Bouton variante="danger" onClick={() => setEcarter(true)}>
                  Écarter cette école
                </Bouton>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Bouton variante="danger" onClick={() => fait({ type: "ECARTEE" })}>
                    Oui, écarter
                  </Bouton>
                  <Bouton onClick={() => setEcarter(false)}>Non</Bouton>
                </div>
              )}
            </section>
          )}

          {d.donnees!.decisions.length > 0 && (
            <section className="space-y-2">
              <h3 className="font-semibold">Décisions déjà prises</h3>
              <ListeDecisions decisions={d.donnees!.decisions} annuler={(x) => { annuler(x); fermer(); }} controle={controle} />
            </section>
          )}
        </div>
      )}
    </Modale>
  );
}
