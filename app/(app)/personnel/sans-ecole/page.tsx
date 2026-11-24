"use client";

import { FileSpreadsheet, Link2, Save } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useSession } from "@/components/session";
import { Alerte, Badge, Bouton, Carte, Chargement, Chiffre, EnTete, Liste, Modale, Saisie, Segments, Tableau, Vide } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { accesDonne } from "@/lib/espaces";
import { CYCLES, peut } from "@/lib/libelles";

/*
 * Agents sans école (DG, 21/11/2026) : le chef a cherché un agent dans la base, vu où il travaille,
 * puis ouvert l'école : il n'y était pas. La page d'une école compte les fiches RATTACHÉES à l'école ;
 * le lieu de service écrit n'est qu'un texte. Ici, chaque lieu écrit est rapproché d'une école, et
 * une décision rattache toutes les fiches qui l'écrivent pareil.
 */

type Etat = "SUR" | "PROBABLE" | "INTROUVABLE";

interface StructureCourte {
  id: number;
  nom: string;
  type: string;
  cycle: string | null;
  localite: string | null;
}

interface Lieu {
  cle: string;
  lieu: string;
  departementId: number | null;
  departement: string | null;
  cycle: string | null;
  fiches: number;
  statuts: Record<string, number>;
  etat: Etat;
  ressemblance: number | null;
  proposee: StructureCourte | null;
  autres: StructureCourte[];
  cochee: boolean;
}

interface Ecart {
  cle: string;
  lieu: string;
  fiches: number;
  departementId: number | null;
  departement: string | null;
  rattachee: StructureCourte | null;
  autre: StructureCourte | null;
}

interface Analyse {
  compteurs: { sansEcole: number; sansLieu: number; sur: number; probable: number; introuvable: number; ecarts: number };
  lieux: Lieu[];
  ecarts: Ecart[];
}

interface StructureListe {
  id: number;
  type: string;
  nom: string;
  departementId: number | null;
  cycle: string | null;
  localite: string | null;
  actif: boolean;
}

type Onglet = Etat | "ECARTS";

const ONGLETS: Record<Onglet, { libelle: string; aide: string }> = {
  SUR: {
    libelle: "École trouvée",
    aide: "Le lieu écrit désigne clairement une école de l’organigramme (même nom, même département, même cycle) : cochées d’office. Une case rattache toutes les fiches de ce lieu.",
  },
  PROBABLE: {
    libelle: "À confirmer",
    aide: "Une école au nom proche, ou plusieurs écoles possibles : choisissez la bonne dans la liste, puis cochez. Dans le doute, laissez décoché : rien ne change.",
  },
  INTROUVABLE: {
    libelle: "École introuvable",
    aide: "Aucune école de l’organigramme ne ressemble au lieu écrit (souvent un village, ou une école absente de l’organigramme). Choisissez l’école dans la liste du département si vous la connaissez ; sinon l’école est à ajouter (Structures › Répertoire officiel ou Écoles à contrôler).",
  },
  ECARTS: {
    libelle: "Lieu écrit ≠ école",
    aide: "Ces fiches sont rattachées à une école, mais leur lieu de service écrit dit autre chose. Cochez pour écrire le nom de l’école de rattachement dans le lieu de service ; si c’est l’école qui est fausse, corrigez la fiche (lien).",
  },
};

const nf = new Intl.NumberFormat("fr-FR");
const TAILLE = 50;
const STATUTS: Record<string, string> = { FONCTIONNAIRE: "fonct.", CONTRACTUEL: "contr.", VOLONTAIRE: "vol.", COMMUNAUTAIRE: "comm." };

export default function Page() {
  const { profil } = useSession();
  if (!peut.traiter(profil.role) && !accesDonne(profil)) return <Alerte>Accès réservé aux agents de la DGRHAS.</Alerte>;
  return <SansEcole peutEnregistrer={peut.modifierConfiguration(profil.role)} />;
}

function SansEcole({ peutEnregistrer }: { peutEnregistrer: boolean }) {
  const a = useApi<Analyse>("/recensement/sans-ecole");
  const structures = useApi<StructureListe[]>("/structures");
  const [onglet, setOnglet] = useState<Onglet>("SUR");
  const [dep, setDep] = useState("");
  // Les fiches d'un groupe, ouvertes dans une fenêtre (DG, 23/11/2026 : « il doit afficher les 11 »)
  const [groupe, setGroupe] = useState<{ sorte: "lieu" | "ecart"; cle: string; titre: string } | null>(null);
  const [recherche, setRecherche] = useState("");
  const [page, setPage] = useState(1);
  // Choix : lieu → école choisie (cochée) ; écarts cochés
  const [choix, setChoix] = useState<Record<string, number> | null>(null);
  const [ecoleDe, setEcoleDe] = useState<Record<string, number>>({});
  const [aligner, setAligner] = useState<Set<string>>(new Set());
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ ton: "vert" | "rouge"; texte: string } | null>(null);

  const r = a.donnees;
  // Cases cochées d'office : les écoles trouvées
  const coches = useMemo(() => choix ?? Object.fromEntries((r?.lieux ?? []).filter((l) => l.cochee && l.proposee).map((l) => [l.cle, l.proposee!.id])), [choix, r]);
  const ecolesParDep = useMemo(() => {
    const m = new Map<number, StructureListe[]>();
    for (const s of structures.donnees ?? [])
      if (s.actif && s.departementId && (s.type === "ETABLISSEMENT" || s.type === "INSPECTION" || s.type === "DDEPPSA")) m.set(s.departementId, [...(m.get(s.departementId) ?? []), s]);
    for (const l of m.values()) l.sort((x, y) => x.nom.localeCompare(y.nom, "fr"));
    return m;
  }, [structures.donnees]);

  if (a.erreur) return <Alerte>{a.erreur}</Alerte>;
  if (!r) return <Chargement />;

  const departements = [...new Set([...r.lieux.map((l) => l.departement), ...r.ecarts.map((e) => e.departement)].filter((x): x is string => !!x))].sort((x, y) => x.localeCompare(y, "fr"));
  const q = recherche.trim().toUpperCase();
  const lieux = onglet === "ECARTS" ? [] : r.lieux.filter((l) => l.etat === onglet && (!dep || l.departement === dep) && (!q || `${l.lieu} ${l.proposee?.nom ?? ""}`.toUpperCase().includes(q)));
  const ecarts = onglet !== "ECARTS" ? [] : r.ecarts.filter((e) => (!dep || e.departement === dep) && (!q || `${e.lieu} ${e.rattachee?.nom ?? ""}`.toUpperCase().includes(q)));
  const total = onglet === "ECARTS" ? ecarts.length : lieux.length;
  const pages = Math.max(1, Math.ceil(total / TAILLE));
  const p0 = Math.min(page, pages);
  const tranche = <T,>(l: T[]) => l.slice((p0 - 1) * TAILLE, p0 * TAILLE);

  const ecoleChoisie = (l: Lieu) => ecoleDe[l.cle] ?? coches[l.cle] ?? l.proposee?.id ?? null;
  const cocher = (l: Lieu, oui: boolean) => {
    const id = ecoleChoisie(l);
    const n = { ...coches };
    if (oui && id) n[l.cle] = id;
    else delete n[l.cle];
    setChoix(n);
  };
  const choisirEcole = (l: Lieu, id: number) => {
    setEcoleDe((x) => ({ ...x, [l.cle]: id }));
    const n = { ...coches };
    if (id) n[l.cle] = id;
    else delete n[l.cle];
    setChoix(n);
  };
  const toutCocher = (oui: boolean) => {
    if (onglet === "ECARTS") {
      const n = new Set(aligner);
      for (const e of ecarts) if (oui) n.add(e.cle); else n.delete(e.cle);
      setAligner(n);
      return;
    }
    const n = { ...coches };
    for (const l of lieux) {
      const id = ecoleChoisie(l);
      if (oui && id) n[l.cle] = id;
      else delete n[l.cle];
    }
    setChoix(n);
  };
  const optionsEcoles = (l: Lieu) => {
    const vus = new Set<number>();
    const premiers = [l.proposee, ...l.autres].filter((s): s is StructureCourte => !!s && !vus.has(s.id) && !!vus.add(s.id));
    const duDep = (l.departementId ? (ecolesParDep.get(l.departementId) ?? []) : []).filter((s) => !vus.has(s.id) && (!l.cycle || !s.cycle || s.cycle === l.cycle || s.type !== "ETABLISSEMENT"));
    return [
      ...premiers.map((s) => ({ valeur: s.id, libelle: `${s.nom}${s.localite ? ` (${s.localite})` : ""}` })),
      ...duDep.map((s) => ({ valeur: s.id, libelle: `${s.nom}${s.localite ? ` (${s.localite})` : ""}` })),
    ];
  };

  const aRattacher = Object.entries(coches);
  const fichesARattacher = aRattacher.reduce((n, [cle]) => n + (r.lieux.find((l) => l.cle === cle)?.fiches ?? 0), 0);
  const fichesAAligner = [...aligner].reduce((n, cle) => n + (r.ecarts.find((e) => e.cle === cle)?.fiches ?? 0), 0);

  const enregistrer = async () => {
    if (!confirm(`Rattacher ${nf.format(fichesARattacher)} fiche(s) à leur école et corriger le lieu écrit de ${nf.format(fichesAAligner)} fiche(s) ?`)) return;
    setEnvoi(true);
    setMessage(null);
    try {
      const x = await api.post<{ rattachees: number; alignees: number; refus: string[] }>("/recensement/sans-ecole/appliquer", {
        rattacher: aRattacher.map(([cle, structureId]) => ({ cle, structureId })),
        aligner: [...aligner],
      });
      setMessage({
        ton: "vert",
        texte: `Enregistré : ${nf.format(x.rattachees)} fiche(s) rattachée(s) à leur école, ${nf.format(x.alignees)} lieu(x) de service corrigé(s).${x.refus.length ? ` Non fait (${x.refus.length}) : ${x.refus.slice(0, 3).join(" ; ")}` : ""} Les pages des écoles les comptent maintenant.`,
      });
      setChoix(null);
      setEcoleDe({});
      setAligner(new Set());
      a.recharger();
    } catch (e) {
      setMessage({ ton: "rouge", texte: (e as Error).message });
    } finally {
      setEnvoi(false);
    }
  };

  const c = r.compteurs;
  const compte = (o: Onglet) => (o === "ECARTS" ? c.ecarts : o === "SUR" ? c.sur : o === "PROBABLE" ? c.probable : c.introuvable);
  return (
    <div className="space-y-4">
      <EnTete
        titre="Agents sans école"
        sousTitre="La page d’une école compte les agents RATTACHÉS à l’école ; le lieu de service écrit sur la fiche n’est qu’un texte. Un agent dont le lieu est écrit mais qui n’est rattaché à rien « flotte » : sa fiche dit où il travaille, l’école ne le connaît pas. Rattachez-les ici, d’un coup par lieu écrit."
      />
      {message && <Alerte ton={message.ton}>{message.texte}</Alerte>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Chiffre libelle="Fiches sans école" valeur={nf.format(c.sansEcole)} ton="rouge" detail={`et ${nf.format(c.sansLieu)} sans lieu écrit du tout`} />
        <Chiffre libelle="École trouvée" valeur={nf.format(c.sur)} ton="vert" detail="cochées d’office" />
        <Chiffre libelle="À confirmer" valeur={nf.format(c.probable)} ton="jaune" />
        <Chiffre libelle="Lieu écrit ≠ école" valeur={nf.format(c.ecarts)} ton="bleu" detail="fiches rattachées" />
      </div>

      <Carte titre="Vérifier et cocher">
        <div className="space-y-3 text-[13px]">
          <Segments valeur={onglet} changer={(o) => (setOnglet(o), setPage(1))} options={(Object.keys(ONGLETS) as Onglet[]).map((o) => ({ valeur: o, libelle: `${ONGLETS[o].libelle} (${nf.format(compte(o))} fiches)` }))} />
          <p className="text-zinc-600">{ONGLETS[onglet].aide}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Liste value={dep} onChange={(e) => (setDep(e.target.value), setPage(1))} vide="Tous les départements" options={departements.map((d) => ({ valeur: d, libelle: d }))} />
            <Saisie placeholder="Chercher un lieu, une école…" value={recherche} onChange={(e) => (setRecherche(e.target.value), setPage(1))} className="w-64" />
            <Bouton variante="discret" onClick={() => toutCocher(true)} title="Les lignes affichées (filtre compris) qui ont une école choisie">
              Tout cocher
            </Bouton>
            <Bouton variante="discret" onClick={() => toutCocher(false)}>
              Tout décocher
            </Bouton>
            <span className="ml-auto text-zinc-500">{nf.format(total)} lieu(x)</span>
          </div>

          {!total ? (
            <Vide>Rien dans cette liste.</Vide>
          ) : onglet === "ECARTS" ? (
            <Tableau>
              <thead>
                <tr>
                  <th className="w-10"></th>
                  <th>Lieu de service écrit</th>
                  <th>École de rattachement</th>
                  <th className="text-right">Fiches</th>
                </tr>
              </thead>
              <tbody>
                {tranche(ecarts).map((e) => (
                  <tr key={e.cle}>
                    <td>
                      <input type="checkbox" checked={aligner.has(e.cle)} onChange={(x) => setAligner((s) => { const n = new Set(s); if (x.target.checked) n.add(e.cle); else n.delete(e.cle); return n; })} />
                    </td>
                    <td>
                      <div className="font-medium">« {e.lieu} »</div>
                      {e.autre && <div className="text-[11px] text-or-700">Le lieu écrit désigne plutôt « {e.autre.nom} » : vérifiez la fiche avant de cocher.</div>}
                    </td>
                    <td>
                      <div>{e.rattachee?.nom ?? "—"}</div>
                      <div className="text-[11px] text-zinc-500">{e.departement ?? ""}</div>
                    </td>
                    <td className="text-right tabular-nums">
                      <button type="button" className="cursor-pointer font-medium text-marque-700 hover:underline" title="Voir ces fiches" onClick={() => setGroupe({ sorte: "ecart", cle: e.cle, titre: `« ${e.lieu} » · rattachées à ${e.rattachee?.nom ?? "?"}` })}>
                        {nf.format(e.fiches)}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Tableau>
          ) : (
            <Tableau>
              <thead>
                <tr>
                  <th className="w-10"></th>
                  <th>Lieu de service écrit</th>
                  <th>École où rattacher</th>
                  <th className="text-right">Fiches</th>
                </tr>
              </thead>
              <tbody>
                {tranche(lieux).map((l) => (
                  <tr key={l.cle}>
                    <td>
                      <input type="checkbox" checked={!!coches[l.cle]} disabled={!ecoleChoisie(l)} title={ecoleChoisie(l) ? undefined : "Choisissez d’abord l’école"} onChange={(x) => cocher(l, x.target.checked)} />
                    </td>
                    <td>
                      <div className="font-medium">« {l.lieu} »</div>
                      <div className="text-[11px] text-zinc-500">
                        {l.departement ?? "département non renseigné"}
                        {l.cycle ? ` · ${CYCLES[l.cycle] ?? l.cycle}` : ""}
                      </div>
                    </td>
                    <td className="min-w-72">
                      <Liste
                        value={ecoleChoisie(l) ?? ""}
                        vide={l.etat === "INTROUVABLE" ? "Choisir l’école…" : undefined}
                        onChange={(e) => choisirEcole(l, Number(e.target.value))}
                        options={optionsEcoles(l)}
                      />
                      {l.ressemblance !== null && l.etat !== "INTROUVABLE" && (
                        <div className="mt-0.5">
                          <Badge ton={l.ressemblance >= 95 ? "vert" : "jaune"} titre="Ressemblance du lieu écrit et du nom de l’école">
                            noms à {l.ressemblance} %
                          </Badge>
                        </div>
                      )}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      <button type="button" className="cursor-pointer font-medium text-marque-700 tabular-nums hover:underline" title="Voir ces fiches" onClick={() => setGroupe({ sorte: "lieu", cle: l.cle, titre: `« ${l.lieu} »${l.departement ? ` · ${l.departement}` : ""}` })}>
                        {nf.format(l.fiches)}
                      </button>
                      <div className="text-[11px] text-zinc-500">
                        {Object.entries(l.statuts)
                          .map(([s, n]) => `${n} ${STATUTS[s] ?? s.toLowerCase()}`)
                          .join(", ")}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Tableau>
          )}
          {pages > 1 && (
            <div className="flex items-center justify-between">
              <Bouton variante="discret" disabled={p0 <= 1} onClick={() => setPage(p0 - 1)}>
                ← Précédent
              </Bouton>
              <span className="text-zinc-500">
                Page {p0} sur {pages}
              </span>
              <Bouton variante="discret" disabled={p0 >= pages} onClick={() => setPage(p0 + 1)}>
                Suivant →
              </Bouton>
            </div>
          )}
        </div>
      </Carte>

      <ExcelDDEPPSA departements={[...new Map([...r.lieux, ...r.ecarts].filter((x) => x.departementId && x.departement).map((x) => [x.departementId as number, x.departement as string])).entries()].sort((x, y) => x[1].localeCompare(y[1], "fr"))} />
      {groupe && <FichesDuGroupe groupe={groupe} fermer={() => setGroupe(null)} />}

      <Carte titre="Enregistrer">
        <div className="flex flex-wrap items-center gap-3 text-[13px]">
          <Link2 className="size-5 text-marque-600" />
          <span>
            <b>{nf.format(fichesARattacher)}</b> fiche(s) seront rattachées à leur école ({nf.format(aRattacher.length)} lieu(x)), <b>{nf.format(fichesAAligner)}</b> lieu(x) de service corrigé(s). Le lieu écrit
            des fiches rattachées ne change pas.
          </span>
          {peutEnregistrer ? (
            <Bouton variante="principal" className="ml-auto" chargement={envoi} disabled={!aRattacher.length && !aligner.size} onClick={enregistrer}>
              <Save /> Enregistrer
            </Bouton>
          ) : (
            <span className="ml-auto text-zinc-500">L’enregistrement est réservé au DG (et aux administrateurs).</span>
          )}
        </div>
      </Carte>
    </div>
  );
}

/** Exactement les fiches d'un groupe : nom (vers la fiche), naissance, statut, matricule, inspection écrite. */
function FichesDuGroupe({ groupe, fermer }: { groupe: { sorte: "lieu" | "ecart"; cle: string; titre: string }; fermer: () => void }) {
  const f = useApi<{ id: number; nom: string; statut: string; naissance: string | null; matricule: string | null; telephone: string | null; inspection: string | null; ecole: string | null }[]>(`/recensement/sans-ecole/fiches?sorte=${groupe.sorte}&cle=${encodeURIComponent(groupe.cle)}`);
  return (
    <Modale titre={`Fiches : ${groupe.titre}`} ouverte fermer={fermer} large>
      {f.erreur ? (
        <Alerte>{f.erreur}</Alerte>
      ) : !f.donnees ? (
        <Chargement />
      ) : (
        <div className="space-y-2 text-[13px]">
          <p className="text-zinc-600">{nf.format(f.donnees.length)} fiche(s). Ouvrez une fiche pour la corriger une à une.</p>
          <Tableau>
            <thead>
              <tr>
                <th>Nom et prénoms</th>
                <th>Naissance</th>
                <th>Statut</th>
                <th>Matricule</th>
                <th>Inspection écrite</th>
              </tr>
            </thead>
            <tbody>
              {f.donnees.map((x) => (
                <tr key={x.id}>
                  <td>
                    <Link href={`/personnel/agents/${x.id}`} target="_blank" className="font-medium text-marque-700 hover:underline">
                      {x.nom}
                    </Link>
                  </td>
                  <td>{x.naissance ?? "—"}</td>
                  <td>{STATUTS[x.statut] ?? x.statut.toLowerCase()}</td>
                  <td>{x.matricule ?? "—"}</td>
                  <td>{x.inspection ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </Tableau>
        </div>
      )}
    </Modale>
  );
}

/**
 * L'Excel à envoyer aux DDEPPSA (DG, 23/11/2026) : une ligne par personne dont l'école est douteuse,
 * ce que le système propose, et deux colonnes jaunes pour leur réponse.
 */
function ExcelDDEPPSA({ departements }: { departements: [number, string][] }) {
  const [dep, setDep] = useState("");
  const [tout, setTout] = useState(false);
  const [encours, setEncours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const telecharger = async () => {
    setEncours(true);
    setErreur(null);
    try {
      const nom = departements.find(([id]) => String(id) === dep)?.[1] ?? "toutes les DDEPPSA";
      await api.telecharger(`/recensement/sans-ecole/excel?${dep ? `departement=${dep}&` : ""}${tout ? "tout=1" : ""}`, `Agents sans école à vérifier - ${nom}.xlsx`);
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEncours(false);
    }
  };
  return (
    <Carte titre="Faire vérifier par les DDEPPSA">
      <div className="space-y-3 text-[13px]">
        <p className="text-zinc-600">
          Un fichier Excel avec, pour chaque personne dont l’école est douteuse (école probable, introuvable, ou lieu écrit différent de l’école) : son lieu écrit, l’école proposée par le système, son nom, sa naissance, son statut, son matricule, son téléphone. Deux colonnes jaunes restent vides pour la réponse de la DDEPPSA : l’école où l’agent travaille réellement, et une observation.
        </p>
        {erreur && <Alerte>{erreur}</Alerte>}
        <div className="flex flex-wrap items-center gap-3">
          <Liste value={dep} onChange={(e) => setDep(e.target.value)} vide="Toutes les DDEPPSA (une synthèse en tête)" options={departements.map(([id, nom]) => ({ valeur: String(id), libelle: `DDEPPSA ${nom}` }))} />
          <label className="flex cursor-pointer items-center gap-1.5 text-zinc-600">
            <input type="checkbox" checked={tout} onChange={(e) => setTout(e.target.checked)} /> Inclure aussi les écoles trouvées (sûres)
          </label>
          <Bouton variante="principal" chargement={encours} onClick={() => void telecharger()}>
            <FileSpreadsheet /> Télécharger l’Excel
          </Bouton>
        </div>
      </div>
    </Carte>
  );
}
