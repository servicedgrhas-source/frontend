"use client";

import { ChevronDown, ChevronRight, ExternalLink, FileSpreadsheet, FileText, Printer } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useSession } from "@/components/session";
import { Alerte, Bouton, Carte, Chargement, EnTete, Liste, Modale, Pastille, Saisie, Segments, Vide } from "@/components/ui";
import { api, qs, useApi } from "@/lib/api";
import { changementsDe, decrire, type Description, DOMAINES, domaineDe, type Entree, lienDe, lisible } from "@/lib/journal";

type Periode = "jour" | "7j" | "30j" | "tout" | "choisie";

/** « 2026-11-08 » du jour à Brazzaville, moins `n` jours. */
const jourIso = (n = 0) => {
  const d = new Date(Date.now() - n * 86400000);
  return d.toLocaleDateString("fr-CA", { timeZone: "Africa/Brazzaville" });
};
const heure = (iso: string) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Brazzaville" });
const jourDe = (iso: string) => new Date(iso).toLocaleDateString("fr-CA", { timeZone: "Africa/Brazzaville" });
const titreJour = (j: string) => {
  const long = new Date(`${j}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return j === jourIso() ? `Aujourd’hui — ${long}` : j === jourIso(1) ? `Hier — ${long}` : long.charAt(0).toUpperCase() + long.slice(1);
};

/** Une ligne affichée : une action, ou plusieurs actions identiques à la suite (regroupées). */
interface Ligne {
  e: Entree;
  d: Description;
  groupe: { e: Entree; d: Description }[];
}

/**
 * Journal des actions (DG, 08/11/2026) : qui a fait quoi, quand, sur quoi, et ce qui a changé
 * (« avant → après »). Une ligne par action, rangées par jour ; filtres par période, personne et
 * domaine ; connexions masquées par défaut ; actions répétées regroupées ; un clic ouvre le détail
 * complet ; export Excel, Word et impression.
 */
export default function Journal() {
  const { refs } = useSession();
  const [periode, setPeriode] = useState<Periode>("7j");
  const [du, setDu] = useState(jourIso(30));
  const [au, setAu] = useState(jourIso());
  const [personne, setPersonne] = useState("");
  const [domaine, setDomaine] = useState("");
  const [recherche, setRecherche] = useState("");
  const [sansConnexions, setSansConnexions] = useState(true);
  const [regrouper, setRegrouper] = useState(true);
  const [ouverts, setOuverts] = useState<Set<number>>(new Set());
  const [detail, setDetail] = useState<Entree | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState<"excel" | "word" | null>(null);

  // Ce que l'on demande au serveur (le domaine et la recherche se filtrent ici)
  const filtresServeur = useMemo(() => {
    const bornes =
      periode === "jour" ? { du: jourIso(), au: jourIso() } : periode === "7j" ? { du: jourIso(6), au: jourIso() } : periode === "30j" ? { du: jourIso(29), au: jourIso() } : periode === "choisie" ? { du, au } : {};
    return { ...bornes, utilisateur: personne, sansConnexions: sansConnexions ? 1 : undefined };
  }, [periode, du, au, personne, sansConnexions]);
  const cle = qs(filtresServeur);
  const premiere = useApi<{ plus: boolean; lignes: Entree[] }>(`/journal/recherche${cle}`);
  // Actions plus anciennes chargées à la demande (remises à zéro quand les filtres changent)
  const [suite, setSuite] = useState<{ cle: string; lignes: Entree[]; plus: boolean }>({ cle: "", lignes: [], plus: false });
  const [chargeSuite, setChargeSuite] = useState(false);
  const entrees = useMemo(() => [...(premiere.donnees?.lignes ?? []), ...(suite.cle === cle ? suite.lignes : [])], [premiere.donnees, suite, cle]);
  const plus = suite.cle === cle && suite.lignes.length ? suite.plus : !!premiere.donnees?.plus;
  const chargerPlus = async () => {
    const dernier = entrees.at(-1);
    if (!dernier) return;
    setChargeSuite(true);
    try {
      const r = await api.get<{ plus: boolean; lignes: Entree[] }>(`/journal/recherche${qs({ ...filtresServeur, avant: dernier.id })}`);
      setSuite((s) => ({ cle, lignes: [...(s.cle === cle ? s.lignes : []), ...r.lignes], plus: r.plus }));
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setChargeSuite(false);
    }
  };

  const personnes = useApi<{ id: string; nom: string; actions: number }[]>("/journal/personnes");
  const params = useApi<{ cle: string; description: string }[]>("/parametres");
  const descriptions = useMemo(() => Object.fromEntries((params.donnees ?? []).map((x) => [x.cle, x.description])), [params.donnees]);

  // Description, filtres d'ici, regroupement des actions identiques qui se suivent
  const jours = useMemo(() => {
    const r = recherche.trim().toLowerCase();
    const decrites = entrees
      .filter((e) => !domaine || domaineDe(e.action) === domaine)
      .map((e) => ({ e, d: decrire(e, refs, descriptions) }))
      .filter(({ e, d }) => !r || [d.titre, d.texte, e.objet, e.utilisateurNom].some((x) => x?.toLowerCase().includes(r)));
    const lignes: Ligne[] = [];
    for (const x of decrites) {
      const prec = lignes.at(-1);
      const memeSuite =
        regrouper &&
        prec &&
        prec.e.action === x.e.action &&
        prec.e.utilisateurNom === x.e.utilisateurNom &&
        jourDe(prec.e.date) === jourDe(x.e.date) &&
        Math.abs(new Date(prec.groupe.at(-1)!.e.date).getTime() - new Date(x.e.date).getTime()) <= 30 * 60000;
      if (memeSuite) prec.groupe.push(x);
      else lignes.push({ ...x, groupe: [x] });
    }
    const parJour = new Map<string, Ligne[]>();
    for (const l of lignes) {
      const j = jourDe(l.e.date);
      parJour.set(j, [...(parJour.get(j) ?? []), l]);
    }
    return [...parJour.entries()];
  }, [entrees, domaine, recherche, regrouper, refs, descriptions]);
  const total = jours.reduce((s, [, l]) => s + l.reduce((n, x) => n + x.groupe.length, 0), 0);

  const libellePeriode =
    periode === "jour"
      ? "aujourd’hui"
      : periode === "7j"
        ? "les 7 derniers jours"
        : periode === "30j"
          ? "les 30 derniers jours"
          : periode === "choisie"
            ? `du ${du.split("-").reverse().join("/")} au ${au.split("-").reverse().join("/")}`
            : "toute la période";
  const sousTitre = [
    `${total.toLocaleString("fr-FR")} action(s)${plus ? " affichées (les plus anciennes : bouton en bas de la liste)" : ""}, ${libellePeriode}`,
    personne && `par ${personnes.donnees?.find((p) => p.id === personne)?.nom ?? ""}`,
    domaine && DOMAINES.find((x) => x.valeur === domaine)?.libelle,
    recherche.trim() && `recherche « ${recherche.trim()} »`,
    sansConnexions && "sans les connexions",
  ]
    .filter(Boolean)
    .join(" · ");

  /** Le journal affiché, en Excel ou en Word : chaque action sur sa ligne (les groupes sont dépliés). */
  async function exporter(format: "excel" | "word") {
    setEnvoi(format);
    setErreur(null);
    try {
      const lignes = jours.flatMap(([, l]) =>
        l.flatMap((x) =>
          x.groupe.map(({ e, d }) => [
            new Date(e.date).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Brazzaville" }),
            e.utilisateurNom ?? "Système",
            d.titre,
            e.objet ?? "",
            d.texte ?? "",
          ]),
        ),
      );
      const fd = new FormData();
      fd.append("donnees", JSON.stringify({ sousTitre, lignes }));
      await api.telechargerPost(`/journal/export/${format}`, fd, `Journal des actions ${jourIso().split("-").reverse().join("-")}.${format === "excel" ? "xlsx" : "docx"}`);
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(null);
    }
  }
  const imprimer = () =>
    window.open(`/impression/journal${qs({ ...filtresServeur, domaine, q: recherche.trim(), periode: libellePeriode, limite: 2000 })}`, "_blank");

  const basculer = (id: number) =>
    setOuverts((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const ligneAction = ({ e, d }: { e: Entree; d: Description }, retrait = false, groupe?: Ligne) => {
    const Icone = d.icone;
    const nb = groupe?.groupe.length ?? 1;
    return (
      <div
        key={e.id}
        role="button"
        tabIndex={0}
        onClick={() => (nb > 1 ? basculer(e.id) : setDetail(e))}
        onKeyDown={(k) => k.key === "Enter" && (nb > 1 ? basculer(e.id) : setDetail(e))}
        className={`grid cursor-pointer grid-cols-[3.2rem_minmax(0,11rem)_minmax(0,1fr)] items-start gap-x-3 gap-y-0.5 rounded-xl px-3 py-2 text-[13px] hover:bg-zinc-50 md:grid-cols-[3.2rem_12rem_minmax(0,1fr)_minmax(0,1.1fr)] ${retrait ? "ml-8 bg-zinc-50/60" : ""}`}
      >
        <span className="pt-0.5 text-[12px] text-zinc-500 tabular-nums">{heure(e.date)}</span>
        <span className="pt-0.5 font-medium break-words text-encre">{e.utilisateurNom ?? "Système"}</span>
        <span className="flex min-w-0 items-start gap-2">
          <Pastille ton={d.ton} taille="sm">
            <Icone />
          </Pastille>
          <span className="min-w-0">
            <span className="font-medium leading-snug">
              {d.titre}
              {nb > 1 && (
                <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-zinc-200 px-1.5 text-[11px] font-semibold text-zinc-700">
                  ×{nb} {ouverts.has(e.id) ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                </span>
              )}
            </span>
            {e.objet && <span className="block truncate text-[12px] text-zinc-500">{e.objet}</span>}
          </span>
        </span>
        <span className="col-span-3 line-clamp-2 text-[12px] leading-relaxed text-zinc-600 md:col-span-1">
          {nb > 1 ? `${nb} actions de ${heure(groupe!.groupe.at(-1)!.e.date)} à ${heure(e.date)} — cliquez pour les voir` : d.texte || <span className="text-zinc-300">—</span>}
        </span>
      </div>
    );
  };

  const objetDetail = detail ? lienDe(detail) : null;
  const descDetail = detail ? decrire(detail, refs, descriptions) : null;

  return (
    <div className="space-y-5">
      <EnTete titre="Journal des actions" sousTitre="Qui a fait quoi, quand, sur quoi, et ce qui a changé. Cliquez sur une ligne pour voir tout le détail." />
      {(premiere.erreur || erreur) && <Alerte>{premiere.erreur ?? erreur}</Alerte>}
      <Carte>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="w-20 text-[12px] font-semibold text-zinc-500">Période</span>
            <Segments
              valeur={periode}
              changer={setPeriode}
              options={[
                { valeur: "jour", libelle: "Aujourd’hui" },
                { valeur: "7j", libelle: "7 jours" },
                { valeur: "30j", libelle: "30 jours" },
                { valeur: "tout", libelle: "Tout" },
                { valeur: "choisie", libelle: "Du… au…" },
              ]}
            />
            {periode === "choisie" && (
              <span className="flex items-center gap-2 text-[12px] text-zinc-600">
                du <Saisie type="date" className="w-40 py-1.5 text-[12px]" value={du} max={au} onChange={(e) => setDu(e.target.value)} />
                au <Saisie type="date" className="w-40 py-1.5 text-[12px]" value={au} min={du} onChange={(e) => setAu(e.target.value)} />
              </span>
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[1fr_14rem_18rem]">
            <Saisie placeholder="Rechercher (nom, action, détail…)" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
            <Liste value={personne} onChange={(e) => setPersonne(e.target.value)} vide="Toutes les personnes" options={(personnes.donnees ?? []).map((p) => ({ valeur: p.id, libelle: `${p.nom} (${p.actions.toLocaleString("fr-FR")})` }))} />
            <Liste value={domaine} onChange={(e) => setDomaine(e.target.value)} vide="Tous les domaines" options={DOMAINES.map((x) => ({ valeur: x.valeur, libelle: x.libelle }))} />
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="size-4 accent-marque-600" checked={sansConnexions} onChange={(e) => setSansConnexions(e.target.checked)} />
              Masquer les connexions
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="size-4 accent-marque-600" checked={regrouper} onChange={(e) => setRegrouper(e.target.checked)} />
              Regrouper les actions répétées
            </label>
            <div className="ml-auto flex flex-wrap gap-2">
              <Bouton variante="discret" chargement={envoi === "excel"} disabled={!!envoi || !total} onClick={() => exporter("excel")} title="Le journal affiché (filtres compris), en Excel">
                <FileSpreadsheet /> Excel
              </Bouton>
              <Bouton variante="discret" chargement={envoi === "word"} disabled={!!envoi || !total} onClick={() => exporter("word")} title="Le journal affiché (filtres compris), en Word">
                <FileText /> Word
              </Bouton>
              <Bouton variante="discret" disabled={!total} onClick={imprimer} title="Version imprimable, à enregistrer en PDF depuis l’impression">
                <Printer /> Imprimer / PDF
              </Bouton>
            </div>
          </div>
        </div>
      </Carte>

      <Carte titre={premiere.donnees ? sousTitre : "Journal"}>
        {!premiere.donnees ? (
          <Chargement />
        ) : !jours.length ? (
          <Vide>Aucune action pour ces filtres.</Vide>
        ) : (
          <div className="space-y-5">
            {jours.map(([j, lignes]) => (
              <section key={j}>
                <h3 className="sticky top-0 z-10 mb-1 border-b border-zinc-100 bg-white/95 py-1.5 text-[12px] font-semibold tracking-wide text-zinc-500 uppercase backdrop-blur">
                  {titreJour(j)} · {lignes.reduce((n, x) => n + x.groupe.length, 0).toLocaleString("fr-FR")} action(s)
                </h3>
                <div className="divide-y divide-zinc-50">
                  {lignes.map((l) => (
                    <div key={l.e.id}>
                      {ligneAction(l, false, l)}
                      {l.groupe.length > 1 && ouverts.has(l.e.id) && <div className="space-y-0.5 pb-2">{l.groupe.map((x) => ligneAction(x, true))}</div>}
                    </div>
                  ))}
                </div>
              </section>
            ))}
            {plus && (
              <div className="flex justify-center">
                <Bouton chargement={chargeSuite} onClick={chargerPlus}>
                  Voir les actions plus anciennes
                </Bouton>
              </div>
            )}
          </div>
        )}
      </Carte>

      <Modale titre={descDetail?.titre ?? "Action"} ouverte={!!detail} fermer={() => setDetail(null)}>
        {detail && descDetail && (
          <div className="space-y-4 text-[13px]">
            <dl className="grid grid-cols-[9rem_1fr] gap-x-3 gap-y-1.5">
              <dt className="text-zinc-500">Date</dt>
              <dd>
                {new Date(detail.date).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Africa/Brazzaville" })}
              </dd>
              <dt className="text-zinc-500">Par</dt>
              <dd className="font-medium">{detail.utilisateurNom ?? "Système"}</dd>
              {detail.objet && (
                <>
                  <dt className="text-zinc-500">Concerne</dt>
                  <dd>{detail.objet}</dd>
                </>
              )}
              {descDetail.texte && (
                <>
                  <dt className="text-zinc-500">En bref</dt>
                  <dd className="text-zinc-700">{descDetail.texte}</dd>
                </>
              )}
            </dl>
            {changementsDe(detail).length > 0 && (
              <div>
                <div className="mb-1.5 font-semibold">Ce qui a changé</div>
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-left text-zinc-500">
                      <th className="py-1 pr-3 font-medium">Champ</th>
                      <th className="py-1 pr-3 font-medium">Avant</th>
                      <th className="py-1 font-medium">Après</th>
                    </tr>
                  </thead>
                  <tbody>
                    {changementsDe(detail).map((c, i) => (
                      <tr key={i} className="border-t border-zinc-100 align-top">
                        <td className="py-1 pr-3 text-zinc-600">{c.champ}</td>
                        <td className="py-1 pr-3 text-rouge-600 line-through decoration-rouge-600/40">{c.avant || "(vide)"}</td>
                        <td className="py-1 font-medium text-marque-700">{c.apres || "(vide)"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {Object.keys(detail.details ?? {}).filter((k) => k !== "changements").length > 0 && (
              <details className="rounded-xl bg-zinc-50 px-3 py-2">
                <summary className="cursor-pointer text-[12px] font-medium text-zinc-600">Toutes les informations enregistrées</summary>
                <dl className="mt-2 grid grid-cols-[10rem_1fr] gap-x-3 gap-y-1 text-[12px]">
                  {Object.entries(detail.details ?? {})
                    .filter(([k]) => k !== "changements")
                    .map(([k, v]) => (
                      <div key={k} className="contents">
                        <dt className="text-zinc-500">{k}</dt>
                        <dd className="break-words">{typeof v === "object" && v !== null && !Array.isArray(v) ? JSON.stringify(v) : lisible(v)}</dd>
                      </div>
                    ))}
                </dl>
              </details>
            )}
            {objetDetail && (
              <div className="flex justify-end">
                <Link href={objetDetail} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-marque-700 hover:underline" onClick={() => setDetail(null)}>
                  <ExternalLink className="size-3.5" /> Ouvrir {detail.objet ? `« ${detail.objet} »` : "la page concernée"}
                </Link>
              </div>
            )}
          </div>
        )}
      </Modale>
    </div>
  );
}
