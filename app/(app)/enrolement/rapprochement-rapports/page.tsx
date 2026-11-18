"use client";

import { ArrowLeft, Check, Download, FileSpreadsheet, Loader2, PenLine, RefreshCw, Search, Send, Trash2, Upload, UserPlus, UserX } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { FicheVolontaire } from "@/components/enrolement/volontaires";
import { SqueletteCartesRapprochement } from "@/components/squelette";
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
  /** Les autres informations de la fiche (genre, téléphone…), lisibles. */
  infos?: Record<string, string>;
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
  /** La proposition faite à la base du personnel et son contrôle. */
  proposition: { id: number; etat: "A_CONTROLER" | "VALIDEE" | "REJETEE"; controlePar: string | null; note: string | null } | null;
  /** La proposition d'ajout à la base du personnel d'une personne absente (18/11/2026). */
  propositionAjout: { id: number; etat: "A_CONTROLER" | "VALIDEE" | "REJETEE"; controlePar: string | null; note: string | null } | null;
  base: FicheBase | null;
  /** Les autres informations du bottin (genre, téléphone, diplômes…), lisibles (18/11/2026). */
  infos: Record<string, string>;
  /** Celles que la fiche du personnel n'a pas encore. */
  infosNouvelles: string[];
  /** Celles que la fiche a autrement (le rapport est plus récent). */
  infosDifferentes: string[];
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
  AJOUTE: "Gardé dans la liste Banque mondiale",
};
const METHODES: Record<string, string> = {
  MATRICULE: "par le matricule",
  NOM: "par le nom et l’année de naissance",
  NOM_PROCHE: "nom proche, même année de naissance",
  CHOIX: "fiche choisie à la main",
  AJOUT: "absente de nos bases, gardée dans la liste",
  MEME_PERSONNE: "même personne qu’une autre ligne du rapport",
  NOM_AUTRE_ANNEE: "même nom, autre année de naissance",
};
/** Les corrections qu'on peut proposer à la base du personnel (pas le nom ni la naissance). */
const PROPOSABLES = ["LIEU_SERVICE", "DATE_PRISE_SERVICE", "DEPARTEMENT", "MATRICULE_SOLDE"];
/** Ce qu'une ligne peut proposer : la date de naissance seulement si la fiche n'en a pas (DG, 18/11/2026). */
const proposables = (l: Ligne) => [...PROPOSABLES, ...(l.base && !l.base.dateNaissance ? ["DATE_NAISSANCE"] : [])].filter((k) => {
  const v = l.applique?.[k]?.apres;
  // Une date réduite à l’année reste dans la liste : une fiche exige la date complète
  return !!v && !(k.startsWith("DATE") && /^\d{4}$/.test(String(v as string)));
});
/**
 * Les autres informations du bottin que la Banque mondiale n'utilise pas mais qui servent à nos bases
 * (DG, 18/11/2026 : « ces infos ne doivent pas dormir ») : proposées à la fiche du personnel.
 */
const LIBELLES_INFOS: Record<string, string> = {
  GENRE: "Genre",
  LIEU_NAISSANCE: "Lieu de naissance",
  NATIONALITE: "Nationalité",
  SITUATION_MATRIMONIALE: "Situation matrimoniale",
  NOMBRE_ENFANTS: "Nombre d’enfants",
  TELEPHONE_1: "Téléphone",
  FONCTION: "Fonction",
  CATEGORIE: "Catégorie",
  ECHELON: "Échelon",
  INDICE_SOLDE: "Indice solde",
  DIPLOME_PRO: "Diplôme professionnel",
  AUTRES_DIPLOMES: "Diplôme académique",
  DATE_RECRUTEMENT: "Date de recrutement",
};
/** Les rubriques de la liste Banque mondiale que l'on peut prendre du rapport en série (jamais le nom). */
const RUBRIQUES_PRENDRE = ["LIEU_SERVICE", "MATRICULE_SOLDE", "DATE_NAISSANCE", "DATE_PRISE_SERVICE", "DEPARTEMENT"];
/** Une fiche seulement « probable » n'est pas touchée tant qu'on ne l'a pas confirmée. */
const probableNonConfirmee = (l: Ligne) => l.resultat === "PROBABLE" && !l.decision;
const aProposer = (l: Ligne) =>
  l.base?.type === "PERSONNEL" &&
  !!l.agentId &&
  !probableNonConfirmee(l) &&
  l.proposition?.etat !== "A_CONTROLER" &&
  (l.infosNouvelles.length > 0 || (proposables(l).length > 0 && l.proposition?.etat !== "VALIDEE"));

/** Une personne absente de nos bases que l'on peut proposer à l'ajout (rien n'est créé avant la validation). */
const aProposerAjout = (l: Ligne) => !l.agentId && !l.volontaireId && l.propositionAjout?.etat !== "A_CONTROLER" && l.propositionAjout?.etat !== "VALIDEE";

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
            proche. On confirme, on choisit une autre fiche, ou on déclare absent : tout est gardé. <strong>Nos bases ne sont jamais modifiées ici</strong> : les
            corrections et les personnes gardées restent dans la liste Banque mondiale, que l’on exporte. Une correction fiable (lieu de service, prise de service, département, matricule) peut être{" "}
            <strong>proposée à la base du personnel</strong> : elle n’est appliquée que si le contrôle des modifications la valide.
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
              <div key={i} className="h-12 os" />
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
  const [filtre, setFiltre] = useState<Ligne["resultat"] | "" | "DECIDES">("");
  const [secteur, setSecteur] = useState("");
  const [recherche, setRecherche] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [calcul, setCalcul] = useState(false);
  const [choisir, setChoisir] = useState<Ligne | null>(null);
  const [volontaire, setVolontaire] = useState<string | null>(null);
  // Les lignes en cours de traitement (une action, ou une action en série) : marquées « Traitement… »,
  // leurs boutons inactifs, le reste de la page reste utilisable (18/11/2026)
  const [enTraitement, setEnTraitement] = useState<Set<number>>(new Set());
  const traiter = (ids: number[], oui: boolean) =>
    setEnTraitement((s) => {
      const n = new Set(s);
      for (const i of ids) {
        if (oui) n.add(i);
        else n.delete(i);
      }
      return n;
    });
  const [exporter, setExporter] = useState(false);
  const [appliquer, setAppliquer] = useState<Ligne | null>(null);
  const [succes, setSucces] = useState<string | null>(null);
  // Les lignes cochées (d'un filtre à l'autre), et l'action en série en cours
  const [cochees, setCochees] = useState<Set<number>>(new Set());
  const [lotEnCours, setLotEnCours] = useState<string | null>(null);
  const [erreursLot, setErreursLot] = useState<{ nom: string; message: string }[]>([]);
  const [ajouter, setAjouter] = useState<Ligne | null>(null);
  const [proposerAjout, setProposerAjout] = useState<Ligne | null>(null);
  const [confirmation, demander] = useConfirmation();

  /** Met à jour tout de suite les lignes touchées (la liste suit l'action), puis relit en silence. */
  const appliquerLocal = (ids: number[], patch: (l: Ligne) => Partial<Ligne>) => {
    const courant = d.donnees;
    if (courant) {
      const touchees = new Set(ids);
      d.setDonnees({ ...courant, lignes: courant.lignes.map((l) => (touchees.has(l.id) ? { ...l, ...patch(l) } : l)) });
    }
    d.recharger();
  };
  const decider = async (l: Ligne, corps: { decision: string | null; agentId?: number; volontaireId?: string }) => {
    if (enTraitement.has(l.id)) return;
    setErreur(null);
    traiter([l.id], true);
    try {
      await api.post(`${API}/lignes/${l.id}/decision`, corps);
      appliquerLocal([l.id], () => ({ decision: (corps.decision as Ligne["decision"]) ?? null }));
    } catch (x) {
      setErreur((x as Error).message);
    } finally {
      traiter([l.id], false);
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
  // Les pastilles comptent ce qui reste à traiter (sans décision) ; une ligne décidée passe dans
  // « Déjà décidées » (17/11/2026 : une fiche confirmée doit quitter « Trouvés »)
  const aTraiter = lignes.filter((l) => !l.decision);
  const compte = (f: (l: Ligne) => boolean) => aTraiter.filter(f).length;
  const t = recherche.trim().toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const visibles = lignes.filter(
    (l) =>
      (filtre === "DECIDES" ? !!l.decision : !l.decision && (!filtre || l.resultat === filtre)) &&
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
  // Seules les lignes cochées ET affichées (filtre, secteur, recherche) sont traitées
  const choisies = visibles.filter((l) => cochees.has(l.id));
  const ACTIONS: Record<string, [string, (l: Ligne) => boolean, string]> = {
    CONFIRMER: ["Confirmer la fiche trouvée", (l) => !!l.base && !l.decision, "Confirmer la fiche trouvée pour"],
    AJOUTER: ["Garder dans la liste", (l) => !l.base && l.decision !== "AJOUTE", "Garder dans la liste Banque mondiale (aucune fiche n’est créée dans nos bases)"],
    ABSENT: ["Déclarer absentes", (l) => !l.agentId && l.decision !== "ABSENT" && l.decision !== "AJOUTE", "Déclarer absentes de nos bases"],
    PRENDRE_RAPPORT: ["Prendre le rapport…", (l) => !!l.base, ""],
    PROPOSER_AJOUT: ["Proposer l’ajout à la base", aProposerAjout, "Proposer l’ajout à la base du personnel (aucune fiche n’est créée avant la validation du contrôle des modifications ; le type d’agent doit être écrit dans le rapport) de"],
    PROPOSER: ["Proposer à la base", aProposer, "Proposer au contrôle des modifications ce que le rapport apporte : les corrections de la liste (lieu de service, prise de service, département, matricule) et les autres informations que la fiche n’a pas (genre, téléphone, situation, enfants, fonction, diplômes, échelon…). La fiche ne change que si le contrôle valide. Pour"],
    ANNULER: ["Annuler la décision", (l) => !!l.decision && !(l.decision === "AJOUTE" && l.agentId), "Annuler la décision (la ligne revient « à traiter ») pour"],
  };
  const [prendre, setPrendre] = useState(false);
  const enLot = async (action: string, options?: Record<string, unknown>) => {
    const [, possible, question] = ACTIONS[action];
    const ids = choisies.filter(possible).map((l) => l.id);
    if (!ids.length) return setErreur("Aucune des personnes cochées n’est concernée par cette action.");
    // « Prendre le rapport » : la fenêtre de choix tient lieu de confirmation
    if (!options && !(await demander(`${question} ${nf.format(ids.length)} personne(s) ?`, "Oui, continuer"))) return;
    setErreur(null);
    setSucces(null);
    setErreursLot([]);
    setLotEnCours(action);
    traiter(ids, true);
    // Décochées tout de suite : on ne peut pas relancer la même action sur les mêmes lignes
    setCochees(new Set());
    try {
      const x = await api.post<{ faits: number; proposees?: number; erreurs: { ligneId?: number; nom: string; message: string }[] }>(`${API}/${id}/lot`, { action, ids, ...options });
      setSucces(
        action === "PRENDRE_RAPPORT"
          ? `${nf.format(x.faits)} personne(s) sur ${nf.format(ids.length)} : valeurs du rapport prises dans la liste Banque mondiale.${options?.proposer ? ` ${nf.format(x.proposees ?? 0)} proposition(s) envoyée(s) au contrôle des modifications (la fiche ne change que s’il valide).` : ""}`
          : `${nf.format(x.faits)} personne(s) traitée(s) sur ${nf.format(ids.length)}.`,
      );
      setErreursLot(x.erreurs);
      const refusees = new Set(x.erreurs.map((e) => e.ligneId).filter((v): v is number => !!v));
      const faites = ids.filter((i) => !refusees.has(i));
      const PATCH: Record<string, (l: Ligne) => Partial<Ligne>> = {
        CONFIRMER: () => ({ decision: "CONFIRME" }),
        AJOUTER: () => ({ decision: "AJOUTE" }),
        ABSENT: () => ({ decision: "ABSENT", agentId: null, volontaireId: null, base: null, resultat: "ABSENT" }),
        ANNULER: () => ({ decision: null }),
        PROPOSER: (l) => ({ proposition: { id: l.proposition?.id ?? 0, etat: "A_CONTROLER", controlePar: null, note: null } }),
        PROPOSER_AJOUT: (l) => ({ propositionAjout: { id: l.propositionAjout?.id ?? 0, etat: "A_CONTROLER", controlePar: null, note: null } }),
      };
      appliquerLocal(faites, PATCH[action] ?? (() => ({})));
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      traiter(ids, false);
      setLotEnCours(null);
    }
  };
  // Une ligne : proposer ses corrections au contrôle des modifications
  const proposer = async (l: Ligne) => {
    const quoi = [...proposables(l).map((k) => LIBELLES_RUBRIQUES[k]), ...l.infosNouvelles.map((k) => LIBELLES_INFOS[k] ?? k)].map((x) => x.toLowerCase());
    if (
      !(await demander(
        `Proposer à la base du personnel la correction de « ${l.base?.nom ?? l.nomComplet} » (${quoi.join(", ")}) ? La fiche ne change pas tout de suite : le contrôle des modifications valide ou rejette.`,
        "Oui, proposer",
      ))
    )
      return;
    setErreur(null);
    setSucces(null);
    traiter([l.id], true);
    try {
      await api.post(`${API}/lignes/${l.id}/proposer`, {});
      setSucces(`Proposition envoyée au contrôle des modifications pour « ${l.base?.nom ?? l.nomComplet} ».`);
      appliquerLocal([l.id], () => ({ proposition: { id: l.proposition?.id ?? 0, etat: "A_CONTROLER", controlePar: null, note: null } }));
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      traiter([l.id], false);
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
            <Bouton variante="principal" onClick={() => setExporter(true)}>
              <FileSpreadsheet /> Exporter en Excel
            </Bouton>
          </>
        }
      />
      {prendre && (
        <ModalePrendre
          n={choisies.filter(ACTIONS.PRENDRE_RAPPORT[1]).length}
          annee={r?.anneeScolaire ?? ""}
          fermer={() => setPrendre(false)}
          lancer={(o) => {
            setPrendre(false);
            void enLot("PRENDRE_RAPPORT", o);
          }}
        />
      )}
      {exporter && <ModaleExport id={id} nom={`Rapprochement ${r?.departement ?? ""} ${r?.anneeScolaire ?? ""}.xlsx`} fermer={() => setExporter(false)} />}
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
              ["", "À traiter", aTraiter.length],
              ["TROUVE", "Trouvés", compte((l) => l.resultat === "TROUVE")],
              ["ECARTS", "À vérifier", compte((l) => l.resultat === "ECARTS")],
              ["PROBABLE", "Probables", compte((l) => l.resultat === "PROBABLE")],
              ["ABSENT", "Absents", compte((l) => l.resultat === "ABSENT")],
              ["DECIDES", "Déjà décidées", lignes.length - aTraiter.length],
            ] as [typeof filtre, string, number][]
          ).map(([v, libelle, n]) => (
            <button
              key={v || "toutes"}
              type="button"
              onClick={() => {
                setFiltre(v);
                setCochees(new Set());
              }}
              className={`rounded-full px-3 py-1 text-[12px] font-medium transition ${filtre === v ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}
            >
              {libelle} ({nf.format(n)})
            </button>
          ))}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Liste value={secteur} onChange={(e) => {
              setSecteur(e.target.value);
              setCochees(new Set());
            }} vide="Tous les secteurs" options={secteurs.map((s) => ({ valeur: s, libelle: SECTEURS[s] ?? s }))} />
          <div className="sm:col-span-2">
            <Saisie value={recherche} onChange={(e) => {
                setRecherche(e.target.value);
                setCochees(new Set());
              }} placeholder="Nom ou matricule…" />
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
            <strong className="text-zinc-900">{nf.format(choisies.length)}</strong> cochée(s)
          </span>
          {enTraitement.size > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-marque-50 px-3 py-1 text-[12px] font-medium text-marque-700 ring-1 ring-marque-100" role="status">
              <Loader2 className="size-3.5 animate-spin" /> Traitement de {nf.format(enTraitement.size)} personne(s)… vous pouvez continuer
            </span>
          )}
          <span className="flex-1" />
          {Object.entries(ACTIONS).map(([a, [libelle, possible]]) => {
            const n = choisies.filter(possible).length;
            return (
              <Bouton
                key={a}
                variante={a === "CONFIRMER" ? "principal" : undefined}
                disabled={!n || !!lotEnCours}
                chargement={lotEnCours === a}
                onClick={() => (a === "PRENDRE_RAPPORT" ? setPrendre(true) : void enLot(a))}
                title={a === "PRENDRE_RAPPORT" ? "Mettre dans la liste Banque mondiale les valeurs du rapport (plus récent que nos bases), et, si vous le cochez, les proposer à nos bases" : undefined}
              >
                {libelle} {n ? `(${nf.format(n)})` : ""}
              </Bouton>
            );
          })}
        </div>
      )}

      {!d.donnees ? (
        <SqueletteCartesRapprochement />
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
              proposerAjout={() => setProposerAjout(l)}
              departement={r?.departement ?? null}
              enCours={enTraitement.has(l.id)}
              decider={(c) => decider(l, c)}
              choisir={() => setChoisir(l)}
              appliquer={() => setAppliquer(l)}
              proposer={() => proposer(l)}
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
      {proposerAjout && (
        <ModaleAjout
          ligne={proposerAjout}
          proposer
          fermer={() => setProposerAjout(null)}
          fait={() => {
            setProposerAjout(null);
            setSucces(`L’ajout de « ${proposerAjout.nomComplet} » est proposé au contrôle des modifications : la fiche ne sera créée que s’il valide.`);
            appliquerLocal([proposerAjout.id], () => ({ propositionAjout: { id: 0, etat: "A_CONTROLER", controlePar: null, note: null } }));
          }}
        />
      )}
      {ajouter && (
        <ModaleAjout
          ligne={ajouter}
          fermer={() => setAjouter(null)}
          fait={() => {
            setAjouter(null);
            setSucces(`« ${ajouter.nomComplet} » est gardé(e) dans la liste Banque mondiale (nos bases ne changent pas).`);
            appliquerLocal([ajouter.id], () => ({ decision: "AJOUTE" }));
          }}
        />
      )}
      {appliquer && (
        <ModaleAppliquer
          ligne={appliquer}
          departementId={r?.departementId ?? null}
          fermer={() => setAppliquer(null)}
          fait={(n, propose) => {
            setAppliquer(null);
            setSucces(
              [
                n ? `${n} rubrique(s) corrigée(s) dans la liste Banque mondiale pour « ${appliquer.nomComplet} ».` : "",
                propose
                  ? "Proposition envoyée au contrôle des modifications : la fiche du personnel ne change que s’il valide."
                  : n
                    ? "La fiche de nos bases ne change pas."
                    : "",
              ]
                .filter(Boolean)
                .join(" "),
            );
            // Corriger, c'est reconnaître la personne : la ligne quitte « à traiter » tout de suite
            appliquerLocal([appliquer.id], (x) => ({
              decision: x.decision ?? (x.base && n ? "CONFIRME" : null),
              ...(propose ? { proposition: { id: x.proposition?.id ?? 0, etat: "A_CONTROLER" as const, controlePar: null, note: null } } : {}),
            }));
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
  proposerAjout,
  departement,
  enCours,
  decider,
  choisir,
  appliquer,
  proposer,
  voirRegistre,
}: {
  l: Ligne;
  aussi: Ligne[];
  coche: boolean;
  cocher: (oui: boolean) => void;
  ajouter: () => void;
  proposerAjout: () => void;
  departement: string | null;
  enCours: boolean;
  decider: (c: { decision: string | null; agentId?: number; volontaireId?: string }) => void;
  choisir: () => void;
  appliquer: () => void;
  proposer: () => void;
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
    <div
      aria-busy={enCours}
      className={`relative rounded-3xl bg-white p-4 shadow-doux ring-1 transition-opacity ${enCours ? "pointer-events-none opacity-60 ring-marque-300" : l.decision ? "ring-marque-200" : "ring-transparent"}`}
    >
      {enCours && (
        <span className="absolute top-3 right-4 inline-flex items-center gap-1.5 rounded-full bg-marque-600 px-2.5 py-1 text-[11px] font-medium text-white shadow">
          <Loader2 className="size-3 animate-spin" /> Traitement…
        </span>
      )}
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
          {Object.keys(l.infos ?? {}).length > 0 && (
            <div className="mt-1.5 border-t border-zinc-200 pt-1.5 text-[11px] leading-relaxed text-zinc-500">
              {Object.entries(l.infos).map(([k, v]) => (
                <span key={k} className="mr-2 inline-block">
                  <span className="text-zinc-400">{LIBELLES_INFOS[k] ?? k} :</span> {v}
                </span>
              ))}
            </div>
          )}
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
          <span className="font-medium">Corrigé dans la liste Banque mondiale</span>
          {l.appliqueLe ? ` le ${leFr(l.appliqueLe)}` : ""}
          {l.appliquePar ? ` par ${l.appliquePar}` : ""} :{" "}
          {Object.entries(l.applique)
            .map(([k, v]) => `${LIBELLES_RUBRIQUES[k] ?? k} : « ${valeurLisible(v.apres)} » (nos bases : « ${valeurLisible(v.avant)} »)`)
            .join(" ; ")}
          {l.proposition && (
            <div className="mt-1">
              {l.proposition.etat === "A_CONTROLER"
                ? "Proposée à la base du personnel : en attente du contrôle des modifications."
                : l.proposition.etat === "VALIDEE"
                  ? `Proposée à la base du personnel : validée${l.proposition.controlePar ? ` par ${l.proposition.controlePar}` : ""}, la fiche est à jour.`
                  : `Proposée à la base du personnel : rejetée${l.proposition.controlePar ? ` par ${l.proposition.controlePar}` : ""}${l.proposition.note ? ` (« ${l.proposition.note} »)` : ""}.`}
            </div>
          )}
        </div>
      )}
      {f?.type === "PERSONNEL" && l.infosNouvelles.length > 0 && l.proposition?.etat !== "A_CONTROLER" && (
        <div className="mt-3 rounded-2xl bg-sky-50 px-4 py-2 text-[12px] text-sky-800 ring-1 ring-sky-100">
          Le rapport apporte à notre fiche : {l.infosNouvelles.map((k) => (LIBELLES_INFOS[k] ?? k).toLowerCase()).join(", ")}.
          {probableNonConfirmee(l) ? " Confirmez d’abord que c’est la bonne personne, puis « Proposer à la base »." : " « Proposer à la base » les envoie au contrôle des modifications."}
        </div>
      )}
      {l.proposition && !l.applique && (
        <div className={`mt-3 rounded-2xl px-4 py-2.5 text-[12px] ring-1 ${l.proposition.etat === "REJETEE" ? "bg-rouge-50 text-rouge-800 ring-rouge-100" : "bg-marque-50 text-marque-800 ring-marque-200"}`}>
          {l.proposition.etat === "A_CONTROLER"
            ? "Proposée à la base du personnel : en attente du contrôle des modifications."
            : l.proposition.etat === "VALIDEE"
              ? `Proposée à la base du personnel : validée${l.proposition.controlePar ? ` par ${l.proposition.controlePar}` : ""}, la fiche est à jour.`
              : `Proposée à la base du personnel : rejetée${l.proposition.controlePar ? ` par ${l.proposition.controlePar}` : ""}${l.proposition.note ? ` (« ${l.proposition.note} »)` : ""}.`}
        </div>
      )}
      {l.propositionAjout && (
        <div className={`mt-3 rounded-2xl px-4 py-2.5 text-[12px] ring-1 ${l.propositionAjout.etat === "REJETEE" ? "bg-rouge-50 text-rouge-800 ring-rouge-100" : "bg-sky-50 text-sky-800 ring-sky-100"}`}>
          {l.propositionAjout.etat === "A_CONTROLER"
            ? "Ajout proposé à la base du personnel : en attente du contrôle des modifications (aucune fiche pour l’instant)."
            : l.propositionAjout.etat === "VALIDEE"
              ? `Ajout validé${l.propositionAjout.controlePar ? ` par ${l.propositionAjout.controlePar}` : ""} : la fiche est créée dans la base du personnel.`
              : `Ajout rejeté${l.propositionAjout.controlePar ? ` par ${l.propositionAjout.controlePar}` : ""}${l.propositionAjout.note ? ` (« ${l.propositionAjout.note} »)` : ""}.`}
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
        {f && (
          <Bouton chargement={enCours} onClick={appliquer} title="Corrige la ligne de la liste Banque mondiale ; la fiche de nos bases ne change pas">
            <PenLine /> Corriger la liste
          </Bouton>
        )}
        {aProposer(l) && (
          <Bouton chargement={enCours} onClick={proposer} title="La fiche ne change que si le contrôle des modifications valide">
            <Send /> Proposer à la base
          </Bouton>
        )}
        {!f && aProposerAjout(l) && (
          <Bouton chargement={enCours} onClick={proposerAjout} title="La fiche n’est créée que si le contrôle des modifications valide">
            <UserPlus /> Proposer l’ajout à la base
          </Bouton>
        )}
        {!f && l.decision !== "AJOUTE" && (
          <Bouton chargement={enCours} onClick={ajouter} title="Aucune fiche n’est créée dans nos bases">
            <UserPlus /> Garder dans la liste
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
              <div key={i} className="h-10 os" />
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

/** Une valeur gardée (date AAAA-MM-JJ → JJ/MM/AAAA). */
const valeurLisible = (v: unknown) => {
  const s = v === null || v === undefined || v === "" ? "vide" : String(v as string);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? dateFr(s) : s;
};

const LIBELLES_RUBRIQUES: Record<string, string> = {
  NOMS_PRENOMS: "Noms et prénoms",
  MATRICULE_SOLDE: "Matricule de solde",
  LIEU_SERVICE: "Lieu de service",
  DATE_NAISSANCE: "Date de naissance",
  DATE_PRISE_SERVICE: "Date de prise de service",
  DEPARTEMENT: "Département",
};

/**
 * Corriger la liste Banque mondiale (refaite le 18/11/2026) : pour chaque rubrique, la valeur du
 * rapport de la DDEPPSA et celle de nos bases sont montrées côte à côte ; on choisit d'un clic celle
 * qui va dans la liste Banque mondiale (ou on en écrit une autre). Rien à retenir de tête. Nos bases
 * (fiche du personnel, registre) ne sont jamais modifiées.
 */
type Choix = "BASE" | "RAPPORT" | "AUTRE";

/** « 21/09/1979 » ou « 1979-09-21 » → « 1979-09-21 » ; « 2014 » reste « 2014 » ; sinon null. */
function dateSaisie(v: string): string | null {
  const t = v.trim();
  if (/^\d{4}$/.test(t)) return t;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  const fr = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(t);
  const amj = iso ? [+iso[1], +iso[2], +iso[3]] : fr ? [+fr[3], +fr[2], +fr[1]] : null;
  if (!amj) return null;
  const [a, m, j] = amj;
  const d = new Date(Date.UTC(a, m - 1, j));
  if (d.getUTCFullYear() !== a || d.getUTCMonth() !== m - 1 || d.getUTCDate() !== j) return null;
  return `${a}-${String(m).padStart(2, "0")}-${String(j).padStart(2, "0")}`;
}

function ModaleAppliquer({ ligne, departementId, fermer, fait }: { ligne: Ligne; departementId: number | null; fermer: () => void; fait: (n: number, propose: boolean) => void }) {
  const { refs } = useSession();
  const f = ligne.base!;
  const depRapport = departementId ? (refs.departements.find((d) => String(d.id) === String(departementId))?.nom ?? null) : null;
  // [code, rapport (affiché), nos bases (affiché), type]
  const rubriques = (
    [
      ["NOMS_PRENOMS", ligne.nomComplet, f.nom, "texte"],
      ["MATRICULE_SOLDE", ligne.matricule, f.matricule, "texte"],
      ["LIEU_SERVICE", ligne.ecole, f.lieu, "texte"],
      ["DATE_NAISSANCE", ligne.dateNaissance ? dateFr(ligne.dateNaissance) : ligne.anneeNaissance ? String(ligne.anneeNaissance) : null, dateFr(f.dateNaissance) || null, "date"],
      ["DATE_PRISE_SERVICE", ligne.priseService ? dateFr(ligne.priseService) : null, dateFr(f.priseService) || null, "date"],
      ["DEPARTEMENT", depRapport, f.departement, "departement"],
    ] as [string, string | null, string | null, "texte" | "date" | "departement"][]
  ).filter(([, r, b]) => r || b);
  const plat = (v: string | null) => (v ?? "").trim().toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ");
  const pareil = (r: string | null, b: string | null) => !!r && plat(r) === plat(b);
  // Par défaut (DG, 18/11/2026 : le rapport 2025-2026 est plus récent que nos bases de 2022-2024, il
  // ne perd pas d'office) : la valeur du rapport quand il en donne une autre. Sauf le nom (souvent
  // abrégé dans le rapport) et une date réduite à l'année quand nos bases ont la date complète.
  const [choix, setChoix] = useState<Record<string, Choix>>(() =>
    Object.fromEntries(
      rubriques.map(([k, r, b, type]) => {
        if (!r || pareil(r, b)) return [k, "BASE"];
        if (!b) return [k, "RAPPORT"];
        if (k === "NOMS_PRENOMS") return [k, "BASE"];
        if (type === "date" && /^\d{4}$/.test(r.trim())) return [k, "BASE"];
        return [k, "RAPPORT"];
      }),
    ),
  );
  const [autres, setAutres] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  // Proposer aussi à la base du personnel (contrôle des modifications) : la case, et les autres
  // informations du bottin à envoyer (cochées d'avance : celles qui manquent ou diffèrent)
  const personnel = f.type === "PERSONNEL" && !!ligne.agentId;
  const infos = Object.keys(ligne.infos ?? {});
  const [proposer, setProposer] = useState(false);
  const [infosChoisies, setInfosChoisies] = useState<Set<string>>(() => new Set([...ligne.infosNouvelles, ...ligne.infosDifferentes]));
  const enAttente = ligne.proposition?.etat === "A_CONTROLER";

  // La valeur envoyée pour une rubrique (ou une erreur à montrer)
  const valeur = (k: string, r: string | null, type: string): { v?: string; probleme?: string } => {
    const brut = choix[k] === "AUTRE" ? (autres[k] ?? "") : (r ?? "");
    if (!brut.trim()) return { probleme: "Écrivez la valeur." };
    if (type === "departement") {
      const d = refs.departements.find((x) => x.nom === brut || String(x.id) === brut);
      return d ? { v: String(d.id) } : { probleme: "Choisissez le département." };
    }
    if (type === "date") {
      const d = dateSaisie(brut);
      return d ? { v: d } : { probleme: "Date à écrire jj/mm/aaaa (ou l’année seule)." };
    }
    return { v: brut.trim() };
  };
  const aCorriger = rubriques.filter(([k]) => choix[k] !== "BASE");
  const problemes = aCorriger.map(([k, r, , type]) => ({ k, ...valeur(k, r, type) })).filter((x) => x.probleme);

  const envoyer = async () => {
    setErreur(null);
    setEnvoi(true);
    let n = 0;
    try {
      if (aCorriger.length) {
        const champs = Object.fromEntries(aCorriger.map(([k, r, , type]) => [k, valeur(k, r, type).v]));
        n = (await api.post<{ rubriques: string[] }>(`${API}/lignes/${ligne.id}/appliquer`, { champs })).rubriques.length;
      }
      if (proposer) await api.post(`${API}/lignes/${ligne.id}/proposer`, { infos: [...infosChoisies], remplacer: true });
      fait(n, proposer);
    } catch (e) {
      // La liste a pu être corrigée avant que la proposition soit refusée : on le dit
      if (n) {
        setErreur(`${n} rubrique(s) corrigée(s) dans la liste, mais la proposition à la base n’est pas partie : ${(e as Error).message}`);
        return;
      }
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  };

  const bouton = (k: string, c: Choix, libelle: React.ReactNode, actif = true) => (
    <button
      type="button"
      disabled={!actif}
      onClick={() => setChoix((x) => ({ ...x, [k]: c }))}
      className={`w-full rounded-xl px-3 py-2 text-left text-[13px] ring-1 transition ${
        choix[k] === c ? "bg-marque-600 font-medium text-white ring-marque-600" : actif ? "bg-white text-zinc-700 ring-zinc-200 hover:ring-marque-300" : "cursor-default bg-zinc-50 text-zinc-400 ring-zinc-100"
      }`}
    >
      {libelle}
    </button>
  );

  return (
    <Modale titre={`Corriger la liste Banque mondiale pour « ${ligne.nomComplet} »`} ouverte fermer={fermer} large>
      <div className="space-y-4">
        <p className="text-[13px] text-zinc-600">
          Pour chaque rubrique, <strong>cliquez la bonne valeur</strong> : celle du rapport de la DDEPPSA ou celle de nos bases (ou « Autre » pour l’écrire). C’est elle qui ira dans la liste et l’export Excel
          de la Banque mondiale. Le rapport de fin d’année est plus récent que nos bases (enrôlement 2022-2024) : <strong>sa valeur est choisie d’avance quand elle diffère</strong>, sauf le
          nom (souvent abrégé dans le rapport). <strong>Nos bases ne sont pas modifiées</strong>, sauf si vous cochez « Proposer aussi à la base du personnel ».
        </p>
        <div className="hidden grid-cols-[10rem_1fr_1fr_6rem] gap-2 px-1 text-[11px] font-semibold text-zinc-400 uppercase sm:grid">
          <span>Rubrique</span>
          <span>Rapport de la DDEPPSA</span>
          <span>Nos bases</span>
          <span />
        </div>
        <div className="space-y-2">
          {rubriques.map(([k, r, b, type]) => {
            const egal = pareil(r, b);
            const pb = choix[k] !== "BASE" ? valeur(k, r, type).probleme : undefined;
            return (
              <div key={k} className={`rounded-2xl p-2 ${choix[k] !== "BASE" ? "bg-marque-50/60 ring-1 ring-marque-100" : "bg-zinc-50"}`}>
                <div className="grid gap-2 sm:grid-cols-[10rem_1fr_1fr_6rem] sm:items-center">
                  <div className="px-1 text-[13px] font-medium">
                    {LIBELLES_RUBRIQUES[k]}
                    {egal && <div className="text-[11px] font-normal text-zinc-400">pareil des deux côtés</div>}
                  </div>
                  {bouton(k, "RAPPORT", r ? <>{r}</> : <span className="italic">rien dans le rapport</span>, !!r && !egal)}
                  {bouton(k, "BASE", b ? <>{b}</> : <span className="italic">vide dans nos bases</span>)}
                  {bouton(k, "AUTRE", "Autre…")}
                </div>
                {choix[k] === "AUTRE" && (
                  <div className="mt-2 sm:ml-[10.5rem]">
                    {type === "departement" ? (
                      <Liste value={autres[k] ?? ""} onChange={(e) => setAutres((x) => ({ ...x, [k]: e.target.value }))} vide="Choisir…" options={refs.departements.map((d) => ({ valeur: d.id, libelle: d.nom }))} />
                    ) : (
                      <Saisie
                        value={autres[k] ?? ""}
                        onChange={(e) => setAutres((x) => ({ ...x, [k]: e.target.value }))}
                        placeholder={type === "date" ? "jj/mm/aaaa (ou l’année seule : 2014)" : "La bonne valeur"}
                        autoFocus
                      />
                    )}
                  </div>
                )}
                {pb && <div className="mt-1 text-[12px] text-rouge-600 sm:ml-[10.5rem]">{pb}</div>}
              </div>
            );
          })}
        </div>
        {personnel && (
          <div className="rounded-2xl bg-sky-50/70 p-3 ring-1 ring-sky-100">
            <label className="flex items-start gap-2 text-[13px]">
              <input type="checkbox" className="mt-0.5 size-4 accent-marque-600" checked={proposer} disabled={enAttente} onChange={(e) => setProposer(e.target.checked)} />
              <span>
                <strong>Proposer aussi à la base du personnel</strong>
                <span className="text-zinc-600">
                  {" "}
                  — les rubriques prises du rapport et les informations cochées ci-dessous partent au <strong>contrôle des modifications</strong> ; la fiche ne change que s’il valide.
                  {enAttente && " Une proposition est déjà en attente du contrôle pour cette fiche."}
                </span>
              </span>
            </label>
            {proposer && infos.length > 0 && (
              <div className="mt-3 space-y-1">
                <div className="hidden grid-cols-[1.5rem_10rem_1fr_1fr] gap-2 px-1 text-[11px] font-semibold text-zinc-400 uppercase sm:grid">
                  <span />
                  <span>Autres informations</span>
                  <span>Rapport de la DDEPPSA</span>
                  <span>Nos bases</span>
                </div>
                {infos.map((k) => {
                  const base = f.infos?.[k];
                  const egal = !ligne.infosNouvelles.includes(k) && !ligne.infosDifferentes.includes(k);
                  return (
                    <label key={k} className={`grid grid-cols-[1.5rem_1fr] items-center gap-2 rounded-xl px-1 py-1 text-[12px] sm:grid-cols-[1.5rem_10rem_1fr_1fr] ${egal ? "text-zinc-400" : ""}`}>
                      <input
                        type="checkbox"
                        className="size-4 accent-marque-600"
                        disabled={egal}
                        checked={!egal && infosChoisies.has(k)}
                        onChange={(e) =>
                          setInfosChoisies((s) => {
                            const x = new Set(s);
                            if (e.target.checked) x.add(k);
                            else x.delete(k);
                            return x;
                          })
                        }
                      />
                      <span className="font-medium">{LIBELLES_INFOS[k] ?? k}</span>
                      <span className="col-start-2 sm:col-start-auto">{ligne.infos[k]}</span>
                      <span className="col-start-2 text-zinc-500 sm:col-start-auto">{egal ? "pareil" : base || <span className="italic">vide dans nos bases</span>}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {erreur && <Alerte>{erreur}</Alerte>}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="mr-auto text-[12px] text-zinc-500">
            {aCorriger.length
              ? `${aCorriger.length} rubrique(s) prise(s) du rapport ou écrite(s) à la main.`
              : proposer
                ? "Rien à corriger dans la liste : seulement la proposition à la base."
                : "Tout est sur « Nos bases » : rien à corriger (utilisez plutôt « C’est bien cette personne »)."}
          </span>
          <Bouton onClick={fermer}>Annuler</Bouton>
          <Bouton variante="principal" disabled={(!aCorriger.length && !proposer) || problemes.length > 0} chargement={envoi} onClick={envoyer}>
            {aCorriger.length ? <PenLine /> : <Send />}
            {aCorriger.length ? `Corriger ${aCorriger.length} rubrique(s) dans la liste${proposer ? " et proposer à la base" : ""}` : "Proposer à la base"}
          </Bouton>
        </div>
      </div>
    </Modale>
  );
}

/**
 * Prendre le rapport en série (DG, 18/11/2026) : le rapport de la DDEPPSA est plus récent que nos
 * bases, ses valeurs vont dans la liste Banque mondiale pour les rubriques cochées — seulement là où
 * nos bases sont vides, ou aussi là où elles diffèrent. Une case les propose en même temps à la base
 * du personnel (contrôle des modifications), avec les autres informations du bottin.
 */
function ModalePrendre({ n, annee, fermer, lancer }: { n: number; annee: string; fermer: () => void; lancer: (o: { rubriques: string[]; remplacer: boolean; proposer: boolean; infos: string[] }) => void }) {
  const [rubriques, setRubriques] = useState<Set<string>>(() => new Set(RUBRIQUES_PRENDRE));
  const [remplacer, setRemplacer] = useState(true);
  const [proposer, setProposer] = useState(false);
  const [infos, setInfos] = useState<Set<string>>(() => new Set(Object.keys(LIBELLES_INFOS)));
  const basculer = (set: (f: (s: Set<string>) => Set<string>) => void, k: string, oui: boolean) =>
    set((s) => {
      const x = new Set(s);
      if (oui) x.add(k);
      else x.delete(k);
      return x;
    });
  const rien = !rubriques.size && !(proposer && infos.size);
  return (
    <Modale titre={`Prendre les valeurs du rapport de la DDEPPSA — ${nf.format(n)} personne(s)`} ouverte fermer={fermer} large>
      <div className="space-y-4 text-[13px]">
        <p className="text-zinc-600">
          Le rapport de fin d’année {annee} est <strong>plus récent</strong> que nos bases (enrôlement 2022-2024). Ses valeurs vont dans la <strong>liste Banque mondiale</strong> (écran et export
          Excel) pour les personnes cochées qui ont une fiche. Le nom n’est jamais remplacé en série (il est souvent abrégé dans le rapport) : corrigez-le personne par personne.
        </p>
        <div>
          <div className="mb-1.5 text-[11px] font-semibold text-zinc-400 uppercase">Rubriques à prendre du rapport</div>
          <div className="grid gap-1 sm:grid-cols-2">
            {RUBRIQUES_PRENDRE.map((k) => (
              <label key={k} className="flex items-center gap-2">
                <input type="checkbox" className="size-4 accent-marque-600" checked={rubriques.has(k)} onChange={(e) => basculer(setRubriques, k, e.target.checked)} />
                {LIBELLES_RUBRIQUES[k]}
              </label>
            ))}
          </div>
        </div>
        <div className="space-y-1.5 rounded-2xl bg-zinc-50 p-3">
          <label className="flex items-start gap-2">
            <input type="radio" name="remplacer" className="mt-0.5 size-4 accent-marque-600" checked={remplacer} onChange={() => setRemplacer(true)} />
            <span>
              <strong>Le rapport partout où il donne une valeur</strong> — aussi quand nos bases en ont une autre (le plus récent l’emporte). Une date réduite à l’année ne remplace pas une date complète.
            </span>
          </label>
          <label className="flex items-start gap-2">
            <input type="radio" name="remplacer" className="mt-0.5 size-4 accent-marque-600" checked={!remplacer} onChange={() => setRemplacer(false)} />
            <span>
              <strong>Seulement là où nos bases sont vides</strong> — ce que nos bases ont déjà est gardé.
            </span>
          </label>
          <p className="pl-6 text-[12px] text-zinc-500">Une correction déjà faite à la main sur une personne est toujours gardée.</p>
        </div>
        <div className="rounded-2xl bg-sky-50/70 p-3 ring-1 ring-sky-100">
          <label className="flex items-start gap-2">
            <input type="checkbox" className="mt-0.5 size-4 accent-marque-600" checked={proposer} onChange={(e) => setProposer(e.target.checked)} />
            <span>
              <strong>Proposer aussi à la base du personnel</strong> — ces valeurs et les autres informations du bottin cochées ci-dessous partent au <strong>contrôle des modifications</strong> ; chaque
              fiche ne change que s’il valide. Les fiches seulement « probables » non confirmées sont laissées de côté.
            </span>
          </label>
          {proposer && (
            <div className="mt-2 grid gap-1 pl-6 sm:grid-cols-2">
              {Object.entries(LIBELLES_INFOS).map(([k, v]) => (
                <label key={k} className="flex items-center gap-2 text-[12px]">
                  <input type="checkbox" className="size-4 accent-marque-600" checked={infos.has(k)} onChange={(e) => basculer(setInfos, k, e.target.checked)} />
                  {v}
                </label>
              ))}
              <p className="text-[12px] text-zinc-500 sm:col-span-2">
                {remplacer ? "Proposées quand la fiche ne les a pas ou les a autrement." : "Proposées seulement quand la fiche ne les a pas."} Le diplôme académique seulement si la fiche n’en a aucun.
              </p>
            </div>
          )}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Bouton onClick={fermer}>Annuler</Bouton>
          <Bouton variante="principal" disabled={rien || !n} onClick={() => lancer({ rubriques: [...rubriques], remplacer, proposer, infos: proposer ? [...infos] : [] })}>
            <Check /> Prendre le rapport{proposer ? " et proposer à la base" : ""} ({nf.format(n)})
          </Bouton>
        </div>
      </div>
    </Modale>
  );
}

/**
 * Garder dans la liste Banque mondiale une personne absente de nos bases (aucune fiche créée), ou
 * proposer son ajout à la base du personnel (la fiche n'est créée que si le contrôle valide).
 */
function ModaleAjout({ ligne, fermer, fait, proposer = false }: { ligne: Ligne; fermer: () => void; fait: () => void; proposer?: boolean }) {
  const [statut, setStatut] = useState(ligne.statut ?? "");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const envoyer = async () => {
    setErreur(null);
    setEnvoi(true);
    try {
      await api.post(`${API}/lignes/${ligne.id}/${proposer ? "proposer-ajout" : "ajouter"}`, { statut });
      fait();
    } catch (x) {
      setErreur((x as Error).message);
    } finally {
      setEnvoi(false);
    }
  };
  return (
    <Modale titre={proposer ? `Proposer l’ajout de « ${ligne.nomComplet} » à la base du personnel` : `Garder « ${ligne.nomComplet} » dans la liste Banque mondiale`} ouverte fermer={fermer}>
      <div className="space-y-4">
        {proposer ? (
          <p className="text-[13px] text-zinc-600">
            La personne n’est ni dans la base du personnel ni dans le registre. Son ajout est <strong>proposé au contrôle des modifications</strong> (Recensement), avec ce que donne le
            rapport (et vos corrections de la liste). <strong>Aucune fiche n’est créée</strong> tant que le contrôle n’a pas validé ; un rejet ne crée rien.
          </p>
        ) : (
          <p className="text-[13px] text-zinc-600">
            La personne n’est ni dans la base du personnel ni dans le registre. Elle est gardée <strong>dans la liste Banque mondiale</strong> avec ce que donne le rapport, et figure
            dans l’export Excel. <strong>Aucune fiche n’est créée dans nos bases.</strong>
          </p>
        )}
        <Champ libelle="Type d’agent">
          <Liste value={statut} onChange={(e) => setStatut(e.target.value)} vide="Choisir…" options={Object.entries(STATUTS).map(([valeur, libelle]) => ({ valeur, libelle }))} />
        </Champ>
        {erreur && <Alerte>{erreur}</Alerte>}
        <div className="flex justify-end gap-2">
          <Bouton onClick={fermer}>Annuler</Bouton>
          <Bouton variante="principal" disabled={!statut} chargement={envoi} onClick={envoyer}>
            <UserPlus /> {proposer ? "Proposer l’ajout" : "Garder dans la liste"}
          </Bouton>
        </div>
      </div>
    </Modale>
  );
}

/** Les colonnes que l'on peut mettre dans l'Excel (18/11/2026) : les 9 habituelles d'abord. */
const COLONNES_EXPORT: [string, string, boolean][] = [
  ["NUMERO", "N°", true],
  ["NOM", "Noms et prénoms", true],
  ["LIEU", "Lieu de service", true],
  ["NAISSANCE", "Date de naissance", true],
  ["MATRICULE", "Matricule", true],
  ["PRISE_SERVICE", "Date de prise de service", true],
  ["DEPARTEMENT", "Département", true],
  ["STATUT", "Statut", true],
  ["SECTEUR", "Secteur", true],
  ["GENRE", "Genre", false],
  ["FONCTION", "Fonction", false],
  ["GRADE", "Grade / échelon", false],
  ["DIPLOME_ACAD", "Diplôme académique", false],
  ["DIPLOME_PROF", "Diplôme professionnel", false],
  ["RECRUTEMENT", "Année de recrutement", false],
  ["INSPECTION", "Inspection", false],
  ["CYCLE", "Cycle", false],
  ["RUBRIQUE", "Personnel administratif / enseignant", false],
  ["NUMERO_RAPPORT", "N° dans le rapport", false],
  ["RESULTAT", "Résultat du rapprochement", false],
  ["TELEPHONE", "Téléphone", false],
  ["DECISION", "Décision prise", false],
];
const CLE_COLONNES = "dgrhas.rapprochement.colonnes";

/** Exporter en Excel en choisissant les colonnes ; le dernier choix est retenu sur ce poste. */
function ModaleExport({ id, nom, fermer }: { id: number; nom: string; fermer: () => void }) {
  const [choix, setChoix] = useState<string[]>(() => {
    try {
      const v = JSON.parse(localStorage.getItem(CLE_COLONNES) ?? "null") as string[] | null;
      if (Array.isArray(v) && v.length) return v.filter((k) => COLONNES_EXPORT.some(([c]) => c === k));
    } catch {
      /* stockage indisponible */
    }
    return COLONNES_EXPORT.filter(([, , d]) => d).map(([k]) => k);
  });
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const basculer = (k: string) => setChoix((c) => (c.includes(k) ? c.filter((x) => x !== k) : COLONNES_EXPORT.map(([x]) => x).filter((x) => x === k || c.includes(x))));
  const exporter = async () => {
    setErreur(null);
    setEnvoi(true);
    try {
      try {
        localStorage.setItem(CLE_COLONNES, JSON.stringify(choix));
      } catch {
        /* stockage indisponible */
      }
      await api.telecharger(`${API}/${id}/excel${qs({ colonnes: choix.join(",") })}`, nom);
      fermer();
    } catch (x) {
      setErreur((x as Error).message);
    } finally {
      setEnvoi(false);
    }
  };
  return (
    <Modale titre="Exporter en Excel : choisir les colonnes" ouverte fermer={fermer} large>
      <div className="space-y-4">
        <p className="text-[13px] text-zinc-600">
          Cochez les colonnes à mettre dans le fichier, dans l’ordre de la liste. Une ligne par personne ; pour chaque colonne, la valeur corrigée dans la liste, sinon celle de nos bases, sinon celle du rapport.
          Votre choix est retenu pour la prochaine fois.
        </p>
        <div className="flex flex-wrap gap-2 text-[12px]">
          <Bouton variante="discret" onClick={() => setChoix(COLONNES_EXPORT.filter(([, , d]) => d).map(([k]) => k))}>
            Les 9 colonnes habituelles
          </Bouton>
          <Bouton variante="discret" onClick={() => setChoix(COLONNES_EXPORT.map(([k]) => k))}>
            Tout
          </Bouton>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {COLONNES_EXPORT.map(([k, libelle]) => (
            <label key={k} className={`flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-[13px] ring-1 ${choix.includes(k) ? "bg-marque-50 ring-marque-200" : "ring-zinc-200"}`}>
              <input type="checkbox" className="size-4 accent-marque-600" checked={choix.includes(k)} onChange={() => basculer(k)} />
              {libelle}
            </label>
          ))}
        </div>
        {erreur && <Alerte>{erreur}</Alerte>}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="mr-auto text-[12px] text-zinc-500">{nf.format(choix.length)} colonne(s)</span>
          <Bouton onClick={fermer}>Annuler</Bouton>
          <Bouton variante="principal" disabled={!choix.length} chargement={envoi} onClick={exporter}>
            <FileSpreadsheet /> Exporter
          </Bouton>
        </div>
      </div>
    </Modale>
  );
}
