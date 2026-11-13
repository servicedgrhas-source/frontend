"use client";

import { ChevronRight, ShieldAlert, Undo2, UserMinus, UserX, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Explication, PaireDoublon, type FicheDoublon } from "../doublons";
import { BarreExport } from "../export-liste";
import { useSession } from "../session";
import { Aide, Alerte, Badge, Bouton, Chargement, Modale, Saisie, Zone } from "../ui";
import { api, qs, useApi } from "@/lib/api";
import { peut } from "@/lib/libelles";

interface Trouve {
  source: string;
  nom: string;
  naissance: string | null;
  detail: string;
  statut: string;
  etablissement: string | null;
  departement: string | null;
  sure: boolean;
}

interface DejaConnu {
  id: string;
  nom: string;
  naissance: string | null;
  diplome: string;
  cycle: string | null;
  etat: string;
  certitude: "SURE" | "A_VERIFIER";
  trouves: Trouve[];
}

interface Ecarte extends DejaConnu {
  motif: string | null;
  decision: string | null;
  decidePar: string | null;
  decideLe: string | null;
}

type Filtre = "TOUS" | "SURE" | "A_VERIFIER";
/** Ce qu'on demande avec une raison : garder un « déjà connu », ou remettre un écarté malgré tout. */
type Raison = { ids: string[]; quoi: "GARDER" | "REMETTRE" } | null;

const jour = (d: string | null) => (d ? d.slice(0, 10).split("-").reverse().join("/") : "date ?");
const PAGE = 100;

/** Où la personne a été trouvée : base, statut, établissement, département, et si c'est sûr. */
function Trouves({ trouves }: { trouves: Trouve[] }) {
  if (!trouves.length) return <div className="mt-1 text-[12px] italic text-zinc-400">Plus retrouvé dans les bases (une fiche a peut-être été corrigée depuis).</div>;
  return (
    <ul className="mt-1 space-y-1">
      {trouves.map((t, i) => (
        <li key={i} className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12px] text-zinc-600">
          <Badge ton={t.sure ? "rouge" : "jaune"}>{t.sure ? "Sûre" : "À vérifier"}</Badge>
          <span className="font-medium text-zinc-700">{t.source}</span>
          <span>
            · {t.nom} · {jour(t.naissance)}
          </span>
          <span className="text-zinc-500">· {[t.statut, t.etablissement, t.departement].filter(Boolean).join(" · ")}</span>
        </li>
      ))}
    </ul>
  );
}

/** Toutes / sûres / à vérifier, avec les nombres. */
function Filtres({ valeur, changer, liste }: { valeur: Filtre; changer: (f: Filtre) => void; liste: { certitude: string }[] }) {
  const n = (f: Filtre) => (f === "TOUS" ? liste.length : liste.filter((d) => d.certitude === f).length);
  return (
    <div className="inline-flex rounded-xl bg-zinc-100 p-0.5 text-[12px]">
      {(
        [
          ["TOUS", "Tous"],
          ["SURE", "Sûrs"],
          ["A_VERIFIER", "À vérifier"],
        ] as [Filtre, string][]
      ).map(([f, t]) => (
        <button
          key={f}
          type="button"
          onClick={() => changer(f)}
          className={`rounded-lg px-3 py-1 font-medium transition ${valeur === f ? "bg-white text-encre shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}
        >
          {t} ({n(f)})
        </button>
      ))}
    </div>
  );
}

/** Une case à cocher par ligne, « tout cocher » pour la liste filtrée. */
function useCoches() {
  const [coches, setCoches] = useState<Set<string>>(new Set());
  const basculer = (id: string) =>
    setCoches((c) => {
      const n = new Set(c);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  return { coches, setCoches, basculer };
}

/**
 * Ce que le système ne peut pas trancher seul (06/11/2026) : les doublons probables entre dossiers,
 * et les dossiers qui ressemblent à un recruté, un volontaire déjà payé ou un enrôlé d'avant. Les
 * écartés (12/11/2026) sont tenus à part, avec où chacun a été trouvé, et peuvent revenir.
 */
export function ATrancher({ campagneId, apres }: { campagneId: number; apres: (texte: string, ton?: "vert" | "rouge") => void }) {
  const { profil } = useSession();
  const [ouvert, setOuvert] = useState<"doublons" | "connus" | "ecartes" | null>(null);
  const [page, setPage] = useState(1);
  const doublons = useApi<{ total: number; taille: number; paires: { a: FicheDoublon; b: FicheDoublon }[] }>(`/doublons/ENROLES?page=${page}&campagne=${campagneId}`);
  const connus = useApi<DejaConnu[]>(`/enrolement/deja-connus${qs({ campagne: campagneId })}`);
  const ecartes = useApi<{ lignes: Ecarte[] }>(`/enrolement/ecartes${qs({ campagne: campagneId })}`);
  const controleur = peut.controler(profil.role);
  const dg = profil.role === "DG";
  const nbDoublons = doublons.donnees?.total ?? 0;

  // Déjà connus
  const c = useCoches();
  const [filtreC, setFiltreC] = useState<Filtre>("TOUS");
  const [motif, setMotif] = useState("");
  const [voirC, setVoirC] = useState(PAGE);
  const listeC = useMemo(() => (connus.donnees ?? []).filter((d) => filtreC === "TOUS" || d.certitude === filtreC), [connus.donnees, filtreC]);

  // Écartés
  const e = useCoches();
  const [filtreE, setFiltreE] = useState<Filtre>("TOUS");
  const [chercheE, setChercheE] = useState("");
  const [voirE, setVoirE] = useState(PAGE);
  const listeE = useMemo(() => {
    const q = chercheE.trim().toLowerCase();
    return (ecartes.donnees?.lignes ?? []).filter((d) => (filtreE === "TOUS" || d.certitude === filtreE) && (!q || d.nom.toLowerCase().includes(q)));
  }, [ecartes.donnees, filtreE, chercheE]);

  const [raison, setRaison] = useState<Raison>(null);
  const [texteRaison, setTexteRaison] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const toutRecharger = () => {
    connus.recharger();
    ecartes.recharger();
  };

  async function trancher(ids: string[], decision: "ECARTER" | "DIFFERENT" | "GARDER", texte = motif) {
    setEnvoi(true);
    try {
      const r = await api.post<{ traites: number }>("/enrolement/deja-connus", { ids, decision, motif: texte });
      apres(
        decision === "ECARTER"
          ? `${r.traites} dossier(s) écarté(s) : ils sont dans la liste des écartés.`
          : decision === "GARDER"
            ? `${r.traites} dossier(s) gardé(s) malgré tout.`
            : `${r.traites} dossier(s) gardé(s) : ce ne sont pas les mêmes personnes.`,
      );
      c.setCoches(new Set());
      toutRecharger();
      return true;
    } catch (x) {
      apres((x as Error).message, "rouge");
      return false;
    } finally {
      setEnvoi(false);
    }
  }

  async function remettre(ids: string[], quoi: "DIFFERENT" | "GARDER", texte?: string) {
    setEnvoi(true);
    try {
      const r = await api.post<{ traites: number; retenus: number }>("/enrolement/ecartes/remettre", { ids, raison: quoi, motif: texte });
      apres(
        r.retenus
          ? `${r.retenus} dossier(s) remis parmi les retenus.`
          : `${r.traites} dossier(s) sortis des écartés : ils sont « à décider par la DGRHAS ».`,
      );
      e.setCoches(new Set());
      toutRecharger();
      return true;
    } catch (x) {
      apres((x as Error).message, "rouge");
      return false;
    } finally {
      setEnvoi(false);
    }
  }

  async function confirmerRaison() {
    if (!raison || !texteRaison.trim()) return;
    const ok = raison.quoi === "GARDER" ? await trancher(raison.ids, "GARDER", texteRaison) : await remettre(raison.ids, "GARDER", texteRaison);
    if (ok) {
      setRaison(null);
      setTexteRaison("");
    }
  }

  const carte = (cle: "doublons" | "connus" | "ecartes", Icone: typeof Users, titre: string, n: number | null, texte: string, ton: "jaune" | "gris" = "jaune") => (
    <button
      type="button"
      onClick={() => setOuvert(ouvert === cle ? null : cle)}
      aria-expanded={ouvert === cle}
      className={`flex flex-1 items-start gap-3 rounded-2xl p-4 text-left ring-1 transition ${ouvert === cle ? "bg-or-100/60 ring-or-400/50" : "bg-white ring-zinc-200 hover:ring-zinc-300"}`}
    >
      <span className={`mt-0.5 rounded-xl p-2 ${n && ton === "jaune" ? "bg-or-100 text-or-700" : "bg-zinc-100 text-zinc-500"}`}>
        <Icone className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-[14px] font-semibold text-encre">
          {titre}
          <Badge ton={n && ton === "jaune" ? "jaune" : "gris"}>{n === null ? "…" : n.toLocaleString("fr-FR")}</Badge>
        </span>
        <span className="mt-0.5 block text-[12px] leading-snug text-zinc-500">{texte}</span>
      </span>
      <ChevronRight className={`mt-1 size-4 text-zinc-400 transition-transform ${ouvert === cle ? "rotate-90" : ""}`} aria-hidden />
    </button>
  );

  const caseTout = (liste: { id: string }[], coches: Set<string>, setCoches: (s: Set<string>) => void, libelle = "Tout cocher") => (
    <label className="flex items-center gap-2 font-medium">
      <input
        type="checkbox"
        className="size-4 accent-marque-600"
        checked={liste.length > 0 && liste.every((d) => coches.has(d.id))}
        onChange={(x) => {
          const n = new Set(coches);
          for (const d of liste) {
            if (x.target.checked) n.add(d.id);
            else n.delete(d.id);
          }
          setCoches(n);
        }}
      />
      {libelle} ({liste.length.toLocaleString("fr-FR")})
    </label>
  );

  return (
    <div className="rounded-3xl bg-white p-5 shadow-doux">
      <div className="mb-3 flex items-center gap-2">
        <ShieldAlert className="size-5 text-or-700" aria-hidden />
        <h2 className="text-[15px] font-semibold">À trancher avant de retenir</h2>
        <Aide>Le système repère ces cas mais ne peut pas décider seul : c’est peut-être la même personne, ou pas. Tranchez ici. Les écartés restent consultables, et peuvent revenir parmi les retenus.</Aide>
      </div>
      <div className="flex flex-col gap-3 xl:flex-row">
        {carte("doublons", Users, "Doublons probables", doublons.donnees ? nbDoublons : null, "Deux dossiers qui sont peut-être la même personne : gardez-en un, supprimez l’autre, ou dites que ce sont deux personnes.")}
        {carte("connus", UserX, "Déjà recrutés ou déjà volontaires", connus.donnees ? connus.donnees.length : null, "Ressemble à un recruté de la Fonction publique, au personnel, à un volontaire, à un communautaire ou à un enrôlé d’une autre année.")}
        {carte("ecartes", UserMinus, "Écartés (déjà connus)", ecartes.donnees ? ecartes.donnees.lignes.length : null, "Ceux qu’on a écartés, avec où chacun a été trouvé. On peut les remettre parmi les retenus.", "gris")}
      </div>

      {ouvert === "doublons" && (
        <div className="mt-4 space-y-4 text-[13px]">
          <Explication />
          {doublons.erreur && <Alerte>{doublons.erreur}</Alerte>}
          {!doublons.donnees ? (
            <Chargement />
          ) : !doublons.donnees.paires.length ? (
            <p className="text-zinc-500">Aucun doublon probable entre les dossiers.</p>
          ) : (
            <>
              {doublons.donnees.paires.map((p) => (
                <PaireDoublon
                  key={`${p.a.id}|${p.b.id}`}
                  base="ENROLES"
                  a={p.a}
                  b={p.b}
                  titres={["Dossier A", "Dossier B"]}
                  apres={(texte, ton = "vert") => {
                    apres(texte, ton);
                    if (ton === "vert") doublons.recharger();
                  }}
                />
              ))}
              {nbDoublons > doublons.donnees.taille && (
                <div className="flex items-center justify-end gap-2">
                  <Bouton disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    Précédents
                  </Bouton>
                  <span className="text-zinc-500">
                    Page {page} sur {Math.ceil(nbDoublons / doublons.donnees.taille)}
                  </span>
                  <Bouton disabled={page * doublons.donnees.taille >= nbDoublons} onClick={() => setPage(page + 1)}>
                    Suivants
                  </Bouton>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {ouvert === "connus" && (
        <div className="mt-4 space-y-3 text-[13px]">
          {connus.erreur && <Alerte>{connus.erreur}</Alerte>}
          {!connus.donnees ? (
            <Chargement texte="Comparaison avec le recrutement, le personnel, le registre des volontaires et les autres campagnes…" />
          ) : !connus.donnees.length ? (
            <p className="text-zinc-500">Aucun dossier ne ressemble à une personne déjà connue.</p>
          ) : (
            <>
              <p className="leading-relaxed text-zinc-600">
                <strong>Sûr</strong> : mêmes noms et même date de naissance. <strong>À vérifier</strong> : noms proches, ou date différente ou absente. Trois
                choix : <strong>c’est bien lui</strong> (écarté, il va dans la liste des écartés), <strong>pas la même personne</strong>, ou{" "}
                <strong>garder malgré tout</strong> (c’est lui, mais une raison évidente le garde : la raison est demandée).
              </p>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Filtres
                  valeur={filtreC}
                  changer={(f) => {
                    setFiltreC(f);
                    setVoirC(PAGE);
                  }}
                  liste={connus.donnees}
                />
              </div>
              {controleur && (
                <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-zinc-50 px-3 py-2.5">
                  {caseTout(listeC, c.coches, c.setCoches)}
                  <Saisie className="w-64" placeholder="Motif (facultatif) : déjà recruté en 2024…" value={motif} onChange={(x) => setMotif(x.target.value)} />
                  <Bouton variante="danger" disabled={!c.coches.size || envoi} onClick={() => trancher([...c.coches], "ECARTER")}>
                    C’est bien lui : écarter ({c.coches.size})
                  </Bouton>
                  <Bouton disabled={!c.coches.size || envoi} onClick={() => trancher([...c.coches], "DIFFERENT")}>
                    Pas la même personne ({c.coches.size})
                  </Bouton>
                  <Bouton disabled={!c.coches.size || envoi} onClick={() => setRaison({ ids: [...c.coches], quoi: "GARDER" })}>
                    Garder malgré tout ({c.coches.size})
                  </Bouton>
                </div>
              )}
              <ul className="divide-y divide-zinc-100 rounded-2xl ring-1 ring-zinc-200">
                {listeC.slice(0, voirC).map((d) => (
                  <li key={d.id} className={`flex flex-wrap items-start gap-3 px-3 py-3 ${c.coches.has(d.id) ? "bg-marque-50/50" : ""}`}>
                    {controleur && <input type="checkbox" className="mt-1 size-4 accent-marque-600" checked={c.coches.has(d.id)} onChange={() => c.basculer(d.id)} aria-label={`Cocher ${d.nom}`} />}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-encre">
                        {d.nom} <span className="font-normal text-zinc-500">· {jour(d.naissance)} · {d.diplome}</span>
                      </div>
                      <Trouves trouves={d.trouves} />
                    </div>
                    {controleur && (
                      <span className="flex flex-wrap gap-1.5">
                        <Bouton variante="danger" className="px-3! py-1.5!" disabled={envoi} onClick={() => trancher([d.id], "ECARTER")}>
                          C’est bien lui
                        </Bouton>
                        <Bouton className="px-3! py-1.5!" disabled={envoi} onClick={() => trancher([d.id], "DIFFERENT")}>
                          Pas lui
                        </Bouton>
                        <Bouton className="px-3! py-1.5!" disabled={envoi} onClick={() => setRaison({ ids: [d.id], quoi: "GARDER" })}>
                          Garder malgré tout
                        </Bouton>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              {listeC.length > voirC && (
                <div className="text-center">
                  <Bouton variante="discret" onClick={() => setVoirC(voirC + PAGE)}>
                    Afficher {Math.min(PAGE, listeC.length - voirC)} de plus ({(listeC.length - voirC).toLocaleString("fr-FR")} restant(s))
                  </Bouton>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {ouvert === "ecartes" && (
        <div className="mt-4 space-y-3 text-[13px]">
          {ecartes.erreur && <Alerte>{ecartes.erreur}</Alerte>}
          {!ecartes.donnees ? (
            <Chargement texte="Écartés et où chacun a été trouvé…" />
          ) : !ecartes.donnees.lignes.length ? (
            <p className="text-zinc-500">Aucun dossier écarté pour le moment.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex flex-wrap items-center gap-2">
                  <Filtres
                    valeur={filtreE}
                    changer={(f) => {
                      setFiltreE(f);
                      setVoirE(PAGE);
                    }}
                    liste={ecartes.donnees.lignes}
                  />
                  <Saisie className="w-56" placeholder="Rechercher un nom…" value={chercheE} onChange={(x) => setChercheE(x.target.value)} />
                </span>
                <BarreExport chemin="/enrolement/listes/ecartes" impression="/impression/enrolement-ecartes" nom="Liste des écartés" filtres={{ campagne: campagneId }} erreur={(m) => apres(m, "rouge")} />
              </div>
              {controleur && (
                <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-zinc-50 px-3 py-2.5">
                  {caseTout(listeE, e.coches, e.setCoches)}
                  <Bouton disabled={!e.coches.size || envoi} onClick={() => remettre([...e.coches], "DIFFERENT")}>
                    <Undo2 /> Ce n’est pas lui : remettre ({e.coches.size})
                  </Bouton>
                  <Bouton disabled={!e.coches.size || envoi} onClick={() => setRaison({ ids: [...e.coches], quoi: "REMETTRE" })}>
                    <Undo2 /> Remettre malgré tout ({e.coches.size})
                  </Bouton>
                  <Aide>
                    {dg
                      ? "Vous êtes DG : ils reviennent aussitôt parmi les retenus (dans la limite du quota, des places et de l’enveloppe)."
                      : "Ils sortent des écartés et passent « à décider par la DGRHAS » : le DG les retient."}
                  </Aide>
                </div>
              )}
              <ul className="divide-y divide-zinc-100 rounded-2xl ring-1 ring-zinc-200">
                {listeE.slice(0, voirE).map((d) => (
                  <li key={d.id} className={`flex flex-wrap items-start gap-3 px-3 py-3 ${e.coches.has(d.id) ? "bg-marque-50/50" : ""}`}>
                    {controleur && <input type="checkbox" className="mt-1 size-4 accent-marque-600" checked={e.coches.has(d.id)} onChange={() => e.basculer(d.id)} aria-label={`Cocher ${d.nom}`} />}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-encre">
                        {d.nom} <span className="font-normal text-zinc-500">· {jour(d.naissance)} · {d.diplome}</span>
                      </div>
                      <Trouves trouves={d.trouves} />
                      <div className="mt-1 text-[11px] text-zinc-400">
                        {d.motif ?? "Écarté"}
                        {d.decidePar ? ` · par ${d.decidePar}` : ""}
                        {d.decideLe ? ` le ${new Date(d.decideLe).toLocaleDateString("fr-FR")}` : ""}
                      </div>
                    </div>
                    {controleur && (
                      <span className="flex flex-wrap gap-1.5">
                        <Bouton className="px-3! py-1.5!" disabled={envoi} onClick={() => remettre([d.id], "DIFFERENT")}>
                          Pas lui : remettre
                        </Bouton>
                        <Bouton className="px-3! py-1.5!" disabled={envoi} onClick={() => setRaison({ ids: [d.id], quoi: "REMETTRE" })}>
                          Remettre malgré tout
                        </Bouton>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              {!listeE.length && <p className="text-zinc-500">Aucun écarté avec ces filtres.</p>}
              {listeE.length > voirE && (
                <div className="text-center">
                  <Bouton variante="discret" onClick={() => setVoirE(voirE + PAGE)}>
                    Afficher {Math.min(PAGE, listeE.length - voirE)} de plus ({(listeE.length - voirE).toLocaleString("fr-FR")} restant(s))
                  </Bouton>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <Modale
        titre={raison?.quoi === "GARDER" ? "Garder malgré tout" : "Remettre parmi les retenus malgré tout"}
        ouverte={!!raison}
        fermer={() => {
          setRaison(null);
          setTexteRaison("");
        }}
      >
        <div className="space-y-3 text-[13px]">
          <p className="text-zinc-600">
            {raison?.ids.length === 1
              ? `C’est bien la même personne, mais une raison évidente ${raison.quoi === "GARDER" ? "la garde dans la course" : "la remet parmi les retenus"}.`
              : `${raison?.ids.length ?? 0} dossiers : ce sont bien les mêmes personnes, mais une raison évidente ${raison?.quoi === "GARDER" ? "les garde dans la course" : "les remet parmi les retenus"}.`}{" "}
            Écrivez-la : elle reste dans le dossier et dans le journal.
          </p>
          <Zone autoFocus className="w-full" rows={3} value={texteRaison} onChange={(x) => setTexteRaison(x.target.value)} placeholder="Ex. volontaire sorti en 2023, sans bourse depuis ; décision du DG du…" />
          <div className="flex justify-end gap-2">
            <Bouton
              onClick={() => {
                setRaison(null);
                setTexteRaison("");
              }}
            >
              Annuler
            </Bouton>
            <Bouton variante="principal" chargement={envoi} disabled={!texteRaison.trim() || envoi} onClick={confirmerRaison}>
              {raison?.quoi === "GARDER" ? "Garder" : "Remettre"}
            </Bouton>
          </div>
        </div>
      </Modale>
    </div>
  );
}
