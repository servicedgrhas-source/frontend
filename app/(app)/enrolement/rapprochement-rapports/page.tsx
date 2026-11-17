"use client";

import { ArrowLeft, Check, Download, FileSpreadsheet, PenLine, RefreshCw, Search, Trash2, Upload, UserPlus, UserX } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { FicheVolontaire } from "@/components/enrolement/volontaires";
import { useSession } from "@/components/session";
import { Alerte, Badge, Bouton, Carte, Champ, EnTete, Liste, Modale, Saisie, Tableau, useConfirmation, Vide, ZoneFichier } from "@/components/ui";
import { api, qs, useApi } from "@/lib/api";
import { accesDonne } from "@/lib/espaces";
import { peut, type Ton } from "@/lib/libelles";

/*
 * Rapprochement des rapports de fin d'année des DDEPPSA (Banque mondiale, 17/11/2026) : on importe
 * l'état nominatif du personnel d'un rapport (Excel de la DDEPPSA, ou tiré des photos du rapport),
 * chaque personne est cherchée dans toute la base du personnel et tout le registre ; on confirme,
 * on choisit une autre fiche ou on déclare absent ; tout est gardé ; l'export Excel donne les champs
 * demandés (nom, lieu de service, date de naissance, matricule, date de prise de service, département).
 */

const API = "/enrolement/rapprochement-rapports";
const nf = new Intl.NumberFormat("fr-FR");

interface Rapport {
  id: number;
  departementId: number | null;
  departement: string | null;
  anneeScolaire: string;
  nomFichier: string;
  lignes: number;
  importePar: string | null;
  importeLe: string;
  calculeLe: string | null;
  trouves?: number;
  ecarts?: number;
  probables?: number;
  absents?: number;
  decides?: number;
}
interface FicheBase {
  type: "PERSONNEL" | "REGISTRE";
  id: number | string;
  nom: string;
  lieu: string | null;
  dateNaissance: string | null;
  matricule: string | null;
  priseService: string | null;
  departement: string | null;
  statut: string;
  etat: string | null;
}
interface Candidat {
  agentId?: number;
  volontaireId?: string;
  nom: string;
  detail: string;
}
interface Ligne {
  id: number;
  ordre: number;
  numero: string | null;
  rubrique: string | null;
  cycle: string | null;
  secteur: string | null;
  nomComplet: string;
  anneeNaissance: number | null;
  dateNaissance: string | null;
  statut: string | null;
  matricule: string | null;
  ecole: string | null;
  fonction: string | null;
  priseService: string | null;
  resultat: "TROUVE" | "ECARTS" | "PROBABLE" | "ABSENT";
  methode: string | null;
  agentId: number | null;
  volontaireId: string | null;
  ecarts: string[];
  candidats: Candidat[];
  decision: "CONFIRME" | "AUTRE_FICHE" | "ABSENT" | "AJOUTE" | null;
  decidePar: string | null;
  applique: Record<string, { avant: unknown; apres: unknown }> | null;
  appliquePar: string | null;
  appliqueLe: string | null;
  base: FicheBase | null;
}

const RESULTATS: Record<Ligne["resultat"], [string, Ton]> = {
  TROUVE: ["Trouvé", "vert"],
  ECARTS: ["Trouvé, à vérifier", "jaune"],
  PROBABLE: ["Probable", "bleu"],
  ABSENT: ["Absent de la base", "rouge"],
};
const DECISIONS: Record<NonNullable<Ligne["decision"]>, string> = {
  CONFIRME: "Confirmé",
  AUTRE_FICHE: "Autre fiche choisie",
  ABSENT: "Absent confirmé",
  AJOUTE: "Ajouté depuis le rapport",
};
const METHODES: Record<string, string> = {
  MATRICULE: "par le matricule",
  NOM: "par le nom et l’année de naissance",
  NOM_PROCHE: "nom proche, même année de naissance",
  CHOIX: "fiche choisie à la main",
  AJOUT: "ajoutée depuis le rapport",
  MEME_PERSONNE: "même personne qu’une autre ligne du rapport",
};
const STATUTS: Record<string, string> = { FONCTIONNAIRE: "Fonctionnaire", CONTRACTUEL: "Contractuel", VOLONTAIRE: "Volontaire", COMMUNAUTAIRE: "Communautaire" };
const SECTEURS: Record<string, string> = { PUBLIC: "Public", CONVENTIONNE: "Conventionné", PRIVE: "Privé" };
const CYCLES: Record<string, string> = { PRESCOLAIRE: "préscolaire", PRIMAIRE: "primaire", COLLEGE: "collège", LYCEE: "lycée" };
const RUBRIQUES: Record<string, string> = { ADMINISTRATIF: "personnel administratif", ENSEIGNANT: "personnel enseignant" };

const dateFr = (d: string | null | undefined) => (d && /^\d{4}-\d{2}-\d{2}/.test(d) ? d.slice(0, 10).split("-").reverse().join("/") : (d ?? ""));
const leFr = (d: string | null) => (d ? new Date(d).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "");

export default function RapprochementRapports() {
  const { profil } = useSession();
  const [ouvert, setOuvert] = useState<number | null>(null);
  const [importer, setImporter] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmation, demander] = useConfirmation();
  const liste = useApi<Rapport[]>(ouvert ? null : API);
  if (!peut.traiter(profil.role) && !accesDonne(profil)) return <Alerte>Accès réservé aux agents de la DGRHAS.</Alerte>;

  const supprimer = async (r: Rapport) => {
    if (!(await demander(`Supprimer le rapport « ${r.nomFichier} » (${r.departement ?? "DDEPPSA ?"}) et ses ${r.lignes} rapprochements, décisions comprises ?`, "Oui, supprimer"))) return;
    try {
      await api.delete(`${API}/${r.id}`);
      liste.recharger();
    } catch (x) {
      setErreur((x as Error).message);
    }
  };

  if (ouvert) return <DetailRapport id={ouvert} retour={() => setOuvert(null)} />;
  return (
    <div className="space-y-4">
      {confirmation}
      <EnTete
        titre="Rapprochement des rapports des DDEPPSA (Banque mondiale)"
        sousTitre={
          <>
            Les états nominatifs du personnel des rapports de fin d’année des DDEPPSA, comparés à <strong>toute la base du personnel</strong> et à tout le{" "}
            <strong>registre des volontaires et des communautaires</strong>. Chaque personne est cherchée par son matricule, puis par son nom et son année de naissance, puis par un nom
            proche. On confirme, on choisit une autre fiche, ou on déclare absent : tout est gardé.
          </>
        }
        actions={
          <>
            <Bouton onClick={() => api.telecharger(`${API}/modele`, "Modèle - état nominatif du personnel.xlsx").catch((x: Error) => setErreur(x.message))}>
              <Download /> Modèle Excel
            </Bouton>
            <Bouton variante="principal" onClick={() => setImporter(true)}>
              <Upload /> Importer un état nominatif
            </Bouton>
          </>
        }
      />
      {erreur && <Alerte>{erreur}</Alerte>}
      <Carte titre="Rapports importés">
        {liste.erreur && <Alerte>{liste.erreur}</Alerte>}
        {!liste.donnees ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-zinc-100" />
            ))}
          </div>
        ) : !liste.donnees.length ? (
          <Vide>Aucun rapport importé. Importez l’état nominatif d’une DDEPPSA (Excel au format du modèle).</Vide>
        ) : (
          <Tableau>
            <thead>
              <tr>
                <th>DDEPPSA</th>
                <th>Année</th>
                <th>Fichier</th>
                <th className="text-right">Personnes</th>
                <th>Résultats</th>
                <th className="text-right">Décidées</th>
                <th>Importé</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {liste.donnees.map((r) => (
                <tr key={r.id} className="cursor-pointer hover:bg-marque-50/50" onClick={() => setOuvert(r.id)}>
                  <td className="font-medium">{r.departement ?? "—"}</td>
                  <td>{r.anneeScolaire || "—"}</td>
                  <td className="max-w-56 truncate text-zinc-500" title={r.nomFichier}>
                    {r.nomFichier}
                  </td>
                  <td className="text-right tabular-nums">{nf.format(r.lignes)}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {!!r.trouves && <Badge ton="vert">{r.trouves} trouvés</Badge>}
                      {!!r.ecarts && <Badge ton="jaune">{r.ecarts} à vérifier</Badge>}
                      {!!r.probables && <Badge ton="bleu">{r.probables} probables</Badge>}
                      {!!r.absents && <Badge ton="rouge">{r.absents} absents</Badge>}
                    </div>
                  </td>
                  <td className="text-right tabular-nums">
                    {r.decides ?? 0} / {r.lignes}
                  </td>
                  <td className="text-[12px] text-zinc-500">
                    {leFr(r.importeLe)}
                    {r.importePar ? ` · ${r.importePar}` : ""}
                  </td>
                  <td className="text-right" onClick={(e) => e.stopPropagation()}>
                    <Bouton variante="discret" onClick={() => supprimer(r)} title="Supprimer ce rapport">
                      <Trash2 />
                    </Bouton>
                  </td>
                </tr>
              ))}
            </tbody>
          </Tableau>
        )}
      </Carte>
      {importer && (
        <ModaleImport
          fermer={() => setImporter(false)}
          fait={(id) => {
            setImporter(false);
            setOuvert(id);
          }}
        />
      )}
    </div>
  );
}

function ModaleImport({ fermer, fait }: { fermer: () => void; fait: (id: number) => void }) {
  const { refs } = useSession();
  const [departementId, setDepartementId] = useState("");
  const [annee, setAnnee] = useState("2025-2026");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const envoyer = async (f: File) => {
    setErreur(null);
    setEnvoi(true);
    try {
      const fd = new FormData();
      fd.append("fichier", f);
      if (departementId) fd.append("departementId", departementId);
      fd.append("anneeScolaire", annee);
      const r = await api.post<{ id: number }>(`${API}/import`, fd);
      fait(r.id);
    } catch (x) {
      setErreur((x as Error).message);
    } finally {
      setEnvoi(false);
    }
  };
  return (
    <Modale titre="Importer un état nominatif" ouverte fermer={fermer}>
      <div className="space-y-4">
        <p className="text-[13px] text-zinc-600">
          Un fichier Excel avec une ligne de titres (« N° », « Noms et prénoms », « Année naiss », « Stat », « Mle solde »…), comme le modèle ou l’état du rapport de la DDEPPSA. Les lignes de partie
          (« Secteur public », « Secteur conventionné »…) sont reconnues. « Final » (finaliste) se lit « volontaire ».
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Champ libelle="DDEPPSA">
            <Liste value={departementId} onChange={(e) => setDepartementId(e.target.value)} vide="Écrite dans le fichier" options={refs.departements.map((d) => ({ valeur: d.id, libelle: d.nom }))} />
          </Champ>
          <Champ libelle="Année scolaire du rapport">
            <Saisie value={annee} onChange={(e) => setAnnee(e.target.value)} placeholder="2025-2026" />
          </Champ>
        </div>
        <ZoneFichier accept=".xlsx" envoi={envoi} envoyer={envoyer} libelleBouton="Importer et rapprocher" aide="Le rapprochement se fait aussitôt (quelques secondes)." />
        {erreur && <Alerte>{erreur}</Alerte>}
      </div>
    </Modale>
  );
}

function DetailRapport({ id, retour }: { id: number; retour: () => void }) {
  const d = useApi<{ rapport: Rapport; lignes: Ligne[] }>(`${API}/${id}`);
  const [filtre, setFiltre] = useState<Ligne["resultat"] | "" | "A_DECIDER">("");
  const [secteur, setSecteur] = useState("");
  const [recherche, setRecherche] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [calcul, setCalcul] = useState(false);
  const [choisir, setChoisir] = useState<Ligne | null>(null);
  const [volontaire, setVolontaire] = useState<string | null>(null);
  const [enCours, setEnCours] = useState<number | null>(null);
  const [appliquer, setAppliquer] = useState<Ligne | null>(null);
  const [succes, setSucces] = useState<string | null>(null);
  // Les lignes cochées (d'un filtre à l'autre), et l'action en série en cours
  const [cochees, setCochees] = useState<Set<number>>(new Set());
  const [lotEnCours, setLotEnCours] = useState<string | null>(null);
  const [erreursLot, setErreursLot] = useState<{ nom: string; message: string }[]>([]);
  const [ajouter, setAjouter] = useState<Ligne | null>(null);
  const [confirmation, demander] = useConfirmation();

  const decider = async (l: Ligne, corps: { decision: string | null; agentId?: number; volontaireId?: string }) => {
    setErreur(null);
    setEnCours(l.id);
    try {
      await api.post(`${API}/lignes/${l.id}/decision`, corps);
      d.recharger();
    } catch (x) {
      setErreur((x as Error).message);
    } finally {
      setEnCours(null);
    }
  };
  const recalculer = async () => {
    setErreur(null);
    setCalcul(true);
    try {
      await api.post(`${API}/${id}/recalculer`, {});
      d.recharger();
    } catch (x) {
      setErreur((x as Error).message);
    } finally {
      setCalcul(false);
    }
  };

  const r = d.donnees?.rapport;
  const lignes = d.donnees?.lignes ?? [];
  const compte = (f: (l: Ligne) => boolean) => lignes.filter(f).length;
  const t = recherche.trim().toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const visibles = lignes.filter(
    (l) =>
      (!filtre || (filtre === "A_DECIDER" ? !l.decision && l.resultat !== "TROUVE" : l.resultat === filtre)) &&
      (!secteur || l.secteur === secteur) &&
      (!t || `${l.nomComplet} ${l.base?.nom ?? ""} ${l.matricule ?? ""}`.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "").includes(t)),
  );
  const cocher = (ids: number[], oui: boolean) =>
    setCochees((s) => {
      const n = new Set(s);
      for (const i of ids) {
        if (oui) n.add(i);
        else n.delete(i);
      }
      return n;
    });
  const choisies = lignes.filter((l) => cochees.has(l.id));
  const ACTIONS: Record<string, [string, (l: Ligne) => boolean, string]> = {
    CONFIRMER: ["Confirmer la fiche trouvée", (l) => !!l.base && !l.decision, "Confirmer la fiche trouvée pour"],
    COMPLETER: ["Compléter les fiches", (l) => l.base?.type === "PERSONNEL", "Recopier dans la fiche ce qui y manque (lieu de service, matricule, dates complètes), jamais ce qui diffère, pour"],
    AJOUTER: ["Ajouter à la base", (l) => !l.agentId && l.decision !== "AJOUTE", "Ajouter à la base du personnel, avec la mention « Ajouté depuis le rapport de la DDEPPSA » (fiches à contrôler, puis décision du DG),"],
    ABSENT: ["Déclarer absentes", (l) => !l.agentId && l.decision !== "ABSENT" && l.decision !== "AJOUTE", "Déclarer absentes de la base"],
  };
  const enLot = async (action: string) => {
    const [, possible, question] = ACTIONS[action];
    const ids = choisies.filter(possible).map((l) => l.id);
    if (!ids.length) return setErreur("Aucune des personnes cochées n’est concernée par cette action.");
    if (!(await demander(`${question} ${nf.format(ids.length)} personne(s) ?`, "Oui, continuer"))) return;
    setErreur(null);
    setSucces(null);
    setErreursLot([]);
    setLotEnCours(action);
    try {
      const x = await api.post<{ faits: number; erreurs: { nom: string; message: string }[] }>(`${API}/${id}/lot`, { action, ids });
      setSucces(`${nf.format(x.faits)} personne(s) traitée(s) sur ${nf.format(ids.length)}.`);
      setErreursLot(x.erreurs);
      setCochees(new Set());
      d.recharger();
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setLotEnCours(null);
    }
  };
  // La même personne sur plusieurs listes (directeur et enseignant…) : les lignes d'une même fiche
  const parFiche = new Map<string, Ligne[]>();
  for (const l of lignes) {
    const k = l.agentId ? `P${l.agentId}` : l.volontaireId ? `V${l.volontaireId}` : "";
    if (k) parFiche.set(k, [...(parFiche.get(k) ?? []), l]);
  }
  const autresListes = (l: Ligne) => {
    const k = l.agentId ? `P${l.agentId}` : l.volontaireId ? `V${l.volontaireId}` : "";
    return (parFiche.get(k) ?? []).filter((x) => x.id !== l.id);
  };
  const secteurs = [...new Set(lignes.map((l) => l.secteur).filter((x): x is string => !!x))];

  return (
    <div className="space-y-4">
      {confirmation}
      <button type="button" onClick={retour} className="inline-flex items-center gap-1 text-[13px] font-medium text-marque-700 hover:underline">
        <ArrowLeft className="size-4" /> Tous les rapports
      </button>
      <EnTete
        titre={r ? `DDEPPSA ${r.departement ?? "?"} — rapport ${r.anneeScolaire || ""}` : "Rapport"}
        sousTitre={r ? `« ${r.nomFichier} » · ${nf.format(r.lignes)} personne(s) · rapproché le ${leFr(r.calculeLe)}` : undefined}
        actions={
          <>
            <Bouton onClick={recalculer} chargement={calcul} title="Après des corrections dans la base ; les décisions sont gardées">
              <RefreshCw /> Recalculer
            </Bouton>
            <Bouton
              variante="principal"
              onClick={() => api.telecharger(`${API}/${id}/excel`, `Rapprochement ${r?.departement ?? ""} ${r?.anneeScolaire ?? ""}.xlsx`).catch((x: Error) => setErreur(x.message))}
            >
              <FileSpreadsheet /> Exporter en Excel
            </Bouton>
          </>
        }
      />
      {erreur && <Alerte>{erreur}</Alerte>}
      {succes && <Alerte ton="vert">{succes}</Alerte>}
      {erreursLot.length > 0 && (
        <Alerte ton="jaune">
          <p className="font-medium">{nf.format(erreursLot.length)} personne(s) non traitée(s) :</p>
          <ul className="mt-1 list-disc pl-5">
            {erreursLot.slice(0, 30).map((x, i) => (
              <li key={i}>
                {x.nom} — {x.message}
              </li>
            ))}
          </ul>
        </Alerte>
      )}
      {d.erreur && <Alerte>{d.erreur}</Alerte>}

      <Carte>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["", "Toutes", lignes.length],
              ["TROUVE", "Trouvés", compte((l) => l.resultat === "TROUVE")],
              ["ECARTS", "À vérifier", compte((l) => l.resultat === "ECARTS")],
              ["PROBABLE", "Probables", compte((l) => l.resultat === "PROBABLE")],
              ["ABSENT", "Absents", compte((l) => l.resultat === "ABSENT")],
              ["A_DECIDER", "Sans décision", compte((l) => !l.decision && l.resultat !== "TROUVE")],
            ] as [typeof filtre, string, number][]
          ).map(([v, libelle, n]) => (
            <button
              key={v || "toutes"}
              type="button"
              onClick={() => setFiltre(v)}
              className={`rounded-full px-3 py-1 text-[12px] font-medium transition ${filtre === v ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}
            >
              {libelle} ({nf.format(n)})
            </button>
          ))}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Liste value={secteur} onChange={(e) => setSecteur(e.target.value)} vide="Tous les secteurs" options={secteurs.map((s) => ({ valeur: s, libelle: SECTEURS[s] ?? s }))} />
          <div className="sm:col-span-2">
            <Saisie value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Nom ou matricule…" />
          </div>
        </div>
      </Carte>

      {!!d.donnees && (
        <div className="sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 bg-white/95 p-2 shadow-sm backdrop-blur">
          <label className="flex items-center gap-2 px-1 text-[12px] text-zinc-600">
            <input
              type="checkbox"
              className="size-4 accent-marque-600"
              checked={!!visibles.length && visibles.every((l) => cochees.has(l.id))}
              onChange={(e) => cocher(visibles.map((l) => l.id), e.target.checked)}
              aria-label="Tout cocher"
            />
            Tout cocher ({nf.format(visibles.length)})
          </label>
          <span className="text-[12px] text-zinc-600">
            <strong className="text-zinc-900">{nf.format(cochees.size)}</strong> cochée(s)
          </span>
          <span className="flex-1" />
          {Object.entries(ACTIONS).map(([a, [libelle, possible]]) => {
            const n = choisies.filter(possible).length;
            return (
              <Bouton key={a} variante={a === "CONFIRMER" ? "principal" : undefined} disabled={!n || !!lotEnCours} chargement={lotEnCours === a} onClick={() => enLot(a)}>
                {libelle} {n ? `(${nf.format(n)})` : ""}
              </Bouton>
            );
          })}
        </div>
      )}

      {!d.donnees ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-3xl bg-white" />
          ))}
        </div>
      ) : !visibles.length ? (
        <Vide>Aucune personne pour ces filtres.</Vide>
      ) : (
        <div className="space-y-3">
          {visibles.map((l) => (
            <CarteLigne
              key={l.id}
              l={l}
              coche={cochees.has(l.id)}
              aussi={autresListes(l)}
              cocher={(oui) => cocher([l.id], oui)}
              ajouter={() => setAjouter(l)}
              departement={r?.departement ?? null}
              enCours={enCours === l.id}
              decider={(c) => decider(l, c)}
              choisir={() => setChoisir(l)}
              appliquer={() => setAppliquer(l)}
              voirRegistre={setVolontaire}
            />
          ))}
        </div>
      )}
      {choisir && (
        <ModaleChoix
          ligne={choisir}
          fermer={() => setChoisir(null)}
          prendre={(c) => {
            const l = choisir;
            setChoisir(null);
            decider(l, { decision: "AUTRE_FICHE", ...(c.agentId ? { agentId: c.agentId } : { volontaireId: c.volontaireId }) });
          }}
        />
      )}
      {volontaire && <FicheVolontaire id={volontaire} fermer={() => setVolontaire(null)} />}
      {ajouter && (
        <ModaleAjout
          ligne={ajouter}
          fermer={() => setAjouter(null)}
          fait={() => {
            setAjouter(null);
            setSucces(`« ${ajouter.nomComplet} » ajouté(e) à la base du personnel, avec la mention « Ajouté depuis le rapport de la DDEPPSA » : la fiche est à contrôler.`);
            d.recharger();
          }}
        />
      )}
      {appliquer && (
        <ModaleAppliquer
          ligne={appliquer}
          departementId={r?.departementId ?? null}
          fermer={() => setAppliquer(null)}
          fait={(n) => {
            setAppliquer(null);
            setSucces(`${n} rubrique(s) recopiée(s) dans la fiche de « ${appliquer.base?.nom ?? appliquer.nomComplet} ». La modification part au contrôle des modifications.`);
            d.recharger();
          }}
        />
      )}
    </div>
  );
}

/** Une personne du rapport : le rapport à gauche, la fiche de la base à droite, les écarts, la décision. */
function CarteLigne({
  l,
  aussi,
  coche,
  cocher,
  ajouter,
  departement,
  enCours,
  decider,
  choisir,
  appliquer,
  voirRegistre,
}: {
  l: Ligne;
  aussi: Ligne[];
  coche: boolean;
  cocher: (oui: boolean) => void;
  ajouter: () => void;
  departement: string | null;
  enCours: boolean;
  decider: (c: { decision: string | null; agentId?: number; volontaireId?: string }) => void;
  choisir: () => void;
  appliquer: () => void;
  voirRegistre: (id: string) => void;
}) {
  const [libelle, ton] = RESULTATS[l.resultat];
  const f = l.base;
  const partie = [SECTEURS[l.secteur ?? ""], RUBRIQUES[l.rubrique ?? ""], CYCLES[l.cycle ?? ""]].filter(Boolean).join(" · ");
  const champs = (x: { nom: string; lieu: string | null; naissance: string; matricule: string | null; priseService: string | null; departement: string | null; statut: string | null }) => (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[12px]">
      <dt className="text-zinc-400">Lieu de service</dt>
      <dd>{x.lieu || "—"}</dd>
      <dt className="text-zinc-400">Naissance</dt>
      <dd>{x.naissance || "—"}</dd>
      <dt className="text-zinc-400">Matricule</dt>
      <dd className="tabular-nums">{x.matricule || "—"}</dd>
      <dt className="text-zinc-400">Prise de service</dt>
      <dd>{x.priseService || "—"}</dd>
      <dt className="text-zinc-400">Département</dt>
      <dd>{x.departement || "—"}</dd>
      <dt className="text-zinc-400">Statut</dt>
      <dd>{x.statut || "—"}</dd>
    </dl>
  );
  return (
    <div className={`rounded-3xl bg-white p-4 shadow-doux ring-1 ${l.decision ? "ring-marque-200" : "ring-transparent"}`}>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[12px] text-zinc-500">
        <input type="checkbox" className="size-4 accent-marque-600" checked={coche} onChange={(e) => cocher(e.target.checked)} aria-label="Cocher cette personne" />
        <span className="font-semibold text-zinc-800">N° {l.numero ?? l.ordre}</span>
        {partie && <span>{partie}</span>}
        <Badge ton={ton}>{libelle}</Badge>
        {l.methode && <span>{METHODES[l.methode] ?? l.methode}</span>}
        {l.decision && (
          <Badge ton="vert">
            <Check className="size-3" /> {DECISIONS[l.decision]}
            {l.decidePar ? ` · ${l.decidePar}` : ""}
          </Badge>
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl bg-zinc-50 p-3">
          <div className="mb-1 text-[11px] font-semibold text-zinc-400 uppercase">Rapport de la DDEPPSA</div>
          <div className="mb-1.5 text-[14px] font-semibold">{l.nomComplet}</div>
          {champs({
            nom: l.nomComplet,
            lieu: [l.ecole, l.fonction].filter(Boolean).join(" · ") || null,
            naissance: l.dateNaissance ? dateFr(l.dateNaissance) : l.anneeNaissance ? String(l.anneeNaissance) : "",
            matricule: l.matricule,
            priseService: l.priseService,
            departement,
            statut: l.statut ? STATUTS[l.statut] : null,
          })}
        </div>
        <div className={`rounded-2xl p-3 ${f ? "bg-marque-50/50" : "bg-rouge-50"}`}>
          <div className="mb-1 text-[11px] font-semibold text-zinc-400 uppercase">{f?.type === "REGISTRE" ? "Registre des volontaires et des communautaires" : "Base du personnel"}</div>
          {f ? (
            <>
              <div className="mb-1.5 text-[14px] font-semibold">
                {f.type === "PERSONNEL" ? (
                  <Link href={`/personnel/agents/${f.id}`} target="_blank" className="text-marque-700 hover:underline">
                    {f.nom}
                  </Link>
                ) : (
                  <button type="button" onClick={() => voirRegistre(String(f.id))} className="text-left text-marque-700 hover:underline">
                    {f.nom}
                  </button>
                )}
              </div>
              {champs({
                nom: f.nom,
                lieu: f.lieu,
                naissance: dateFr(f.dateNaissance),
                matricule: f.matricule,
                priseService: dateFr(f.priseService),
                departement: f.departement,
                statut: `${STATUTS[f.statut] ?? f.statut}${f.type === "REGISTRE" && f.etat === "SORTI" ? " (sorti du registre)" : ""}`,
              })}
            </>
          ) : (
            <div className="flex h-full items-center gap-2 py-6 text-[13px] text-rouge-700">
              <UserX className="size-4" /> Pas trouvée dans la base du personnel ni dans le registre.
            </div>
          )}
        </div>
      </div>
      {aussi.length > 0 && (
        <div className="mt-3 rounded-2xl bg-sky-50 px-4 py-2 text-[12px] text-sky-800 ring-1 ring-sky-100">
          Même fiche que : {aussi.map((x) => `n° ${x.numero ?? x.ordre} (${[SECTEURS[x.secteur ?? ""], RUBRIQUES[x.rubrique ?? ""], CYCLES[x.cycle ?? ""]].filter(Boolean).join(" · ")})`).join(" ; ")} — une seule personne, présente dans plusieurs listes du rapport.
        </div>
      )}
      {!!l.ecarts.length && (
        <ul className="mt-3 space-y-0.5 rounded-2xl bg-or-50 px-4 py-2.5 text-[12px] text-or-800 ring-1 ring-or-200">
          {l.ecarts.map((e) => (
            <li key={e}>• {e}</li>
          ))}
        </ul>
      )}
      {l.applique && (
        <div className="mt-3 rounded-2xl bg-marque-50 px-4 py-2.5 text-[12px] text-marque-800 ring-1 ring-marque-200">
          <span className="font-medium">Recopié dans la fiche</span>
          {l.appliqueLe ? ` le ${leFr(l.appliqueLe)}` : ""}
          {l.appliquePar ? ` par ${l.appliquePar}` : ""} :{" "}
          {Object.entries(l.applique)
            .map(([k, v]) => `${LIBELLES_RUBRIQUES[k] ?? k} (« ${String(v.avant ?? "vide")} » → « ${String(v.apres ?? "vide")} »)`)
            .join(" ; ")}
        </div>
      )}
      {!!l.candidats.length && (
        <div className="mt-3">
          <div className="mb-1 text-[11px] font-semibold text-zinc-400 uppercase">Autres fiches possibles</div>
          <ul className="space-y-1">
            {l.candidats.map((c) => (
              <li key={`${c.agentId ?? c.volontaireId}`} className="flex flex-wrap items-center gap-2 text-[12px]">
                <span className="font-medium">{c.nom}</span>
                <span className="text-zinc-400">{c.detail}</span>
                <Bouton variante="discret" chargement={enCours} onClick={() => decider({ decision: "AUTRE_FICHE", ...(c.agentId ? { agentId: c.agentId } : { volontaireId: c.volontaireId }) })}>
                  Prendre cette fiche
                </Bouton>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {f && l.decision !== "CONFIRME" && (
          <Bouton variante="principal" chargement={enCours} onClick={() => decider({ decision: "CONFIRME" })}>
            <Check /> C’est bien cette personne
          </Bouton>
        )}
        {f?.type === "PERSONNEL" && (
          <Bouton chargement={enCours} onClick={appliquer}>
            <PenLine /> Appliquer le rapport à la fiche
          </Bouton>
        )}
        {!l.agentId && l.decision !== "AJOUTE" && (
          <Bouton chargement={enCours} onClick={ajouter}>
            <UserPlus /> Ajouter à la base
          </Bouton>
        )}
        <Bouton chargement={enCours} onClick={choisir}>
          <Search /> Choisir une autre fiche
        </Bouton>
        {l.decision !== "ABSENT" && (
          <Bouton variante="discret" chargement={enCours} onClick={() => decider({ decision: "ABSENT" })}>
            <UserX /> Absente de la base
          </Bouton>
        )}
        {l.decision && (
          <Bouton variante="discret" chargement={enCours} onClick={() => decider({ decision: null })}>
            Annuler la décision
          </Bouton>
        )}
      </div>
    </div>
  );
}

/** Chercher une autre fiche (personnel et registre) par le nom. */
function ModaleChoix({ ligne, fermer, prendre }: { ligne: Ligne; fermer: () => void; prendre: (c: Candidat) => void }) {
  const [texte, setTexte] = useState(ligne.nomComplet.split(" ")[0] ?? "");
  const q = texte.trim();
  const r = useApi<Candidat[]>(q.length >= 2 ? `${API}/fiches${qs({ q })}` : null);
  return (
    <Modale titre={`Une autre fiche pour « ${ligne.nomComplet} »`} ouverte fermer={fermer} large>
      <div className="space-y-3">
        <Saisie value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Nom et prénoms (dans n’importe quel ordre)…" autoFocus />
        {r.erreur && <Alerte>{r.erreur}</Alerte>}
        {q.length >= 2 && !r.donnees ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-xl bg-zinc-100" />
            ))}
          </div>
        ) : r.donnees && !r.donnees.length ? (
          <Vide>Aucune fiche à ce nom.</Vide>
        ) : (
          <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl ring-1 ring-zinc-100">
            {(r.donnees ?? []).map((c) => (
              <li key={`${c.agentId ?? c.volontaireId}`}>
                <button type="button" onClick={() => prendre(c)} className="flex w-full flex-col px-4 py-2 text-left hover:bg-marque-50/60">
                  <span className="text-[13px] font-medium">{c.nom}</span>
                  <span className="text-[11px] text-zinc-400">{c.detail}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modale>
  );
}

const LIBELLES_RUBRIQUES: Record<string, string> = {
  NOMS_PRENOMS: "Noms et prénoms",
  MATRICULE_SOLDE: "Matricule de solde",
  LIEU_SERVICE: "Lieu de service",
  DATE_NAISSANCE: "Date de naissance",
  DATE_PRISE_SERVICE: "Date de prise de service",
  DEPARTEMENT: "Département",
};

/**
 * Appliquer le rapport à la fiche du personnel : pour chaque rubrique, la valeur de la base, celle
 * du rapport (modifiable avant d'appliquer), et une case à cocher. Seules les rubriques cochées
 * sont recopiées ; la modification part au contrôle des modifications.
 */
function ModaleAppliquer({ ligne, departementId, fermer, fait }: { ligne: Ligne; departementId: number | null; fermer: () => void; fait: (n: number) => void }) {
  const { refs } = useSession();
  const f = ligne.base!;
  const iso = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : "");
  const anneeSeule = ligne.priseService && /^\d{4}$/.test(ligne.priseService.trim()) ? ligne.priseService.trim() : null;
  const depBase = refs.departements.find((d) => d.nom === f.departement)?.id ?? null;
  // Les rubriques que le rapport renseigne : [code, base, valeur proposée, type]
  const lignes = (
    [
      ["NOMS_PRENOMS", f.nom, ligne.nomComplet, "texte"],
      ["MATRICULE_SOLDE", f.matricule, ligne.matricule ?? "", "texte"],
      ["LIEU_SERVICE", f.lieu, ligne.ecole ?? "", "texte"],
      ["DATE_NAISSANCE", dateFr(f.dateNaissance), iso(ligne.dateNaissance), "date"],
      ["DATE_PRISE_SERVICE", dateFr(f.priseService), iso(ligne.priseService), "date"],
      ["DEPARTEMENT", f.departement, departementId ? String(departementId) : "", "departement"],
    ] as [string, string | null, string, "texte" | "date" | "departement"][]
  ).filter(([k, , v]) => v || (k === "DATE_PRISE_SERVICE" && anneeSeule));
  const differe = (k: string, base: string | null, v: string) =>
    k === "DEPARTEMENT" ? String(depBase ?? "") !== v : k.startsWith("DATE") ? (base ?? "") !== dateFr(v) : (base ?? "").trim().toUpperCase() !== v.trim().toUpperCase();
  const [valeurs, setValeurs] = useState<Record<string, string>>(() => Object.fromEntries(lignes.map(([k, , v]) => [k, v])));
  // Cochées d'avance : ce qui manque dans la base, et le matricule s'il diffère
  const [coches, setCoches] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(lignes.map(([k, base, v]) => [k, !!v && (!base || (k === "MATRICULE_SOLDE" && differe(k, base, v)))])),
  );
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [doublon, setDoublon] = useState(false);
  const choisies = Object.keys(coches).filter((k) => coches[k] && valeurs[k]?.trim());

  const envoyer = async (forcer = false) => {
    setErreur(null);
    setEnvoi(true);
    try {
      const r = await api.post<{ rubriques: string[] }>(`${API}/lignes/${ligne.id}/appliquer`, {
        champs: Object.fromEntries(choisies.map((k) => [k, valeurs[k]])),
        forcer,
      });
      fait(r.rubriques.length);
    } catch (x) {
      const m = (x as Error).message;
      setErreur(m);
      setDoublon(/Déjà recensé/i.test(m));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Modale titre={`Appliquer le rapport à la fiche de « ${f.nom} »`} ouverte fermer={fermer} large>
      <div className="space-y-4">
        <p className="text-[13px] text-zinc-600">
          Cochez ce qu’il faut recopier du rapport dans la fiche du personnel ; vous pouvez corriger la valeur avant. La modification est enregistrée dans l’historique de la fiche et part au{" "}
          <strong>contrôle des modifications</strong> (ancienne et nouvelle valeur).
        </p>
        {!lignes.length ? (
          <Vide>Le rapport ne donne rien à recopier pour cette personne.</Vide>
        ) : (
          <Tableau>
            <thead>
              <tr>
                <th />
                <th>Rubrique</th>
                <th>Dans la base</th>
                <th>À écrire dans la fiche (d’après le rapport)</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map(([k, base, , type]) => {
                const v = valeurs[k] ?? "";
                const pareil = !!v && !differe(k, base, v);
                return (
                  <tr key={k} className={coches[k] ? "bg-marque-50/50" : ""}>
                    <td>
                      <input type="checkbox" className="size-4 accent-marque-600" checked={!!coches[k]} onChange={(e) => setCoches((c) => ({ ...c, [k]: e.target.checked }))} aria-label={`Recopier ${LIBELLES_RUBRIQUES[k]}`} />
                    </td>
                    <td className="font-medium whitespace-nowrap">{LIBELLES_RUBRIQUES[k]}</td>
                    <td className="text-zinc-500">{base || <span className="text-rouge-600">vide</span>}</td>
                    <td className="min-w-64">
                      {type === "departement" ? (
                        <Liste value={v} onChange={(e) => setValeurs((x) => ({ ...x, [k]: e.target.value }))} vide="—" options={refs.departements.map((d) => ({ valeur: d.id, libelle: d.nom }))} />
                      ) : (
                        <Saisie
                          type={type === "date" ? "date" : "text"}
                          value={v}
                          onChange={(e) => {
                            setValeurs((x) => ({ ...x, [k]: e.target.value }));
                            setCoches((c) => ({ ...c, [k]: true }));
                          }}
                        />
                      )}
                      {k === "DATE_PRISE_SERVICE" && anneeSeule && !v && <div className="mt-1 text-[11px] text-zinc-400">Le rapport donne seulement l’année {anneeSeule} : écrivez la date complète.</div>}
                      {pareil && <div className="mt-1 text-[11px] text-zinc-400">Déjà pareil dans la base.</div>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Tableau>
        )}
        {erreur && <Alerte>{erreur}</Alerte>}
        <div className="flex flex-wrap justify-end gap-2">
          <Bouton onClick={fermer}>Annuler</Bouton>
          {doublon && (
            <Bouton chargement={envoi} onClick={() => envoyer(true)} title="La personne signalée est une autre personne (homonyme)">
              C’est une autre personne : appliquer quand même
            </Bouton>
          )}
          <Bouton variante="principal" disabled={!choisies.length} chargement={envoi} onClick={() => envoyer()}>
            <PenLine /> Recopier {choisies.length ? `${choisies.length} rubrique(s)` : ""} dans la fiche
          </Bouton>
        </div>
      </div>
    </Modale>
  );
}

/** Ajouter à la base du personnel une personne absente, avec la mention du rapport. */
function ModaleAjout({ ligne, fermer, fait }: { ligne: Ligne; fermer: () => void; fait: () => void }) {
  const [statut, setStatut] = useState(ligne.statut ?? "");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const envoyer = async () => {
    setErreur(null);
    setEnvoi(true);
    try {
      await api.post(`${API}/lignes/${ligne.id}/ajouter`, { statut });
      fait();
    } catch (x) {
      setErreur((x as Error).message);
    } finally {
      setEnvoi(false);
    }
  };
  return (
    <Modale titre={`Ajouter « ${ligne.nomComplet} » à la base du personnel`} ouverte fermer={fermer}>
      <div className="space-y-4">
        <p className="text-[13px] text-zinc-600">
          Une fiche est créée avec ce que donne le rapport (nom, naissance, genre, matricule, lieu de service, fonction, département, date de prise de service complète). Elle porte la mention{" "}
          <strong>« Ajouté depuis le rapport de fin d’année de la DDEPPSA »</strong> et suit le circuit des agents ajoutés : <strong>à contrôler</strong>, puis décision du DG.
        </p>
        <Champ libelle="Type d’agent">
          <Liste value={statut} onChange={(e) => setStatut(e.target.value)} vide="Choisir…" options={Object.entries(STATUTS).map(([valeur, libelle]) => ({ valeur, libelle }))} />
        </Champ>
        {erreur && <Alerte>{erreur}</Alerte>}
        <div className="flex justify-end gap-2">
          <Bouton onClick={fermer}>Annuler</Bouton>
          <Bouton variante="principal" disabled={!statut} chargement={envoi} onClick={envoyer}>
            <UserPlus /> Ajouter à la base
          </Bouton>
        </div>
      </div>
    </Modale>
  );
}
