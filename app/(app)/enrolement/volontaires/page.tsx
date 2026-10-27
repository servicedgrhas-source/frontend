"use client";

import { useState } from "react";
import { categoriesDe, FicheVolontaire, fcfa, libelleVague, LISTES, moisFr, nf, peutGerer, type Population, useConfigEnrolement, type Volontaire } from "@/components/enrolement/volontaires";
import { useSession } from "@/components/session";
import { Aide, Alerte, Annonce, Badge, Bouton, Carte, Champ, Chargement, ChoixMois, EnTete, Liste, Modale, Saisie, Segments, Tableau, Vide, ZoneFichier } from "@/components/ui";
import { api, qs, useApi } from "@/lib/api";
import { accesDonne } from "@/lib/espaces";
import { peut } from "@/lib/libelles";
import { SaisieReferentiel } from "@/components/saisie-referentiel";

interface Page {
  lignes: Volontaire[];
  total: number;
  page: number;
  taille: number;
  resume: { enPoste: number; sortis: number; sansCategorie: number; sansDepartement: number; enAttente: number };
  vagues: { vague: number | null; enPoste: number }[];
}

interface FeuilleAnalysee {
  nom: string;
  personnes: number;
  colonnes: string[];
  montantTotal: number | null;
}

interface Liste30 {
  n: number;
  exemples: string[];
}

interface Rapport {
  feuille: string;
  type: "EN_POSTE" | "SORTI" | "NOTE";
  lues: number;
  ajoutes: number;
  montantFichier: number;
  montantBareme: number;
  dejaDansRegistre: Liste30;
  doublonsDansFichier: Liste30;
  sansCategorie: Liste30;
  sansDepartement: Liste30;
  montantsDifferents: Liste30;
  enPosteRetrouves: Liste30;
  autreNote: Liste30;
  relies: Liste30;
  agesHorsLimites: Liste30;
  telephonesPartages: Liste30;
  essai: boolean;
}

/** Reprise d'une liste existante (bourse d'un mois, recrutés, déserteurs…). */
function Reprise({ apres, ouvertParDefaut, population }: { apres: () => void; ouvertParDefaut: boolean; population: Population }) {
  // Ouvert d'office quand le registre est vide ; sinon on l'ouvre au besoin
  const [ouvertChoisi, setOuvert] = useState<boolean | null>(null);
  const ouvert = ouvertChoisi ?? ouvertParDefaut;
  const config = useConfigEnrolement();
  const [fichier, setFichier] = useState<File | null>(null);
  const [feuilles, setFeuilles] = useState<FeuilleAnalysee[] | null>(null);
  const [feuille, setFeuille] = useState("");
  const [type, setType] = useState<"EN_POSTE" | "SORTI" | "NOTE">("EN_POSTE");
  const [note, setNote] = useState("");
  const [dateNote, setDateNote] = useState("");
  const [categorie, setCategorie] = useState("");
  const [premierMois, setPremierMois] = useState("");
  const [motif, setMotif] = useState("");
  const [rapport, setRapport] = useState<Rapport | null>(null);
  const dernier = useApi<{ date: string; par: string | null; fichier: string; feuille: string; type: string; rapport: Rapport } | null>(
    `/enrolement/volontaires/dernier-import${qs({ population })}`,
  );
  const [voirDernier, setVoirDernier] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  // Après un clic sur « Faire un essai » incomplet : les champs vides passent en rouge.
  const [verifier, setVerifier] = useState(false);
  const [devine, setDevine] = useState<string | null>(null);
  const manque = {
    feuille: !feuille ? "Choisissez la feuille du fichier à reprendre." : null,
    mois: type === "EN_POSTE" && !premierMois ? "Choisissez le mois et l’année de la bourse que cette liste a payée (ex. Septembre 2026)." : null,
    motif: type === "SORTI" && !motif ? "Choisissez le motif de sortie de cette liste." : null,
    note: type === "NOTE" && !note.trim() ? "Tapez le numéro de la note (ex. 1006)." : null,
    dateNote: type === "NOTE" && !dateNote ? "Choisissez la date de signature de la note." : null,
  };
  const rouge = (k: keyof typeof manque) => (verifier ? manque[k] : null);
  // Le rappel « champs en rouge » disparaît dès que tout est rempli
  const message = erreur === CHAMPS_EN_ROUGE && !Object.values(manque).some(Boolean) ? null : erreur;

  async function analyser(f: File) {
    setErreur(null);
    setEnvoi(true);
    setRapport(null);
    try {
      const fd = new FormData();
      fd.append("fichier", f);
      const r = await api.post<FeuilleAnalysee[]>("/enrolement/volontaires/analyse", fd);
      setFichier(f);
      setVerifier(false);
      // « Bourse Septembre 2026.xlsx » : le mois est proposé d'après le nom du fichier
      const d = moisDuNom(f.name);
      setDevine(d);
      if (d && type === "EN_POSTE") setPremierMois(d);
      setOuvert(true); // reste ouvert pendant la reprise, même quand le registre se remplit
      setFeuilles(r.sort((a, b) => a.nom.localeCompare(b.nom, "fr")));
      setFeuille("");
    } catch (x) {
      setErreur((x as Error).message);
    } finally {
      setEnvoi(false);
    }
  }

  async function importer(essai: boolean) {
    if (!fichier) return;
    setErreur(null);
    if (Object.values(manque).some(Boolean)) {
      setVerifier(true);
      setErreur(CHAMPS_EN_ROUGE);
      return;
    }
    try {
      const fd = new FormData();
      fd.append("fichier", fichier);
      const r = await api.post<Rapport>(`/enrolement/volontaires/import${qs({
          feuille,
          type,
          premierMois: type !== "SORTI" ? premierMois : undefined,
          motif: type === "SORTI" ? motif : undefined,
          note: type === "NOTE" ? note : undefined,
          dateNote: type === "NOTE" ? dateNote : undefined,
          categorie: type === "NOTE" ? categorie : undefined,
          population,
          essai: essai ? 1 : 0,
        })}`, fd);
      setRapport(r);
      if (!essai) {
        apres();
        dernier.recharger();
      }
    } catch (x) {
      setErreur((x as Error).message);
    }
  }

  /** Le rapport d'un essai ou d'un import : les mêmes messages avant et après (DG, 26/10/2026). */
  const vueRapport = (r: Rapport) => (
    <div className="space-y-2">
      <Alerte ton={r.essai ? "bleu" : "vert"}>
        {r.essai ? "Essai : rien n’est enregistré. " : "Import terminé. "}
        <strong>{nf.format(r.lues)}</strong> personnes lues, <strong>{nf.format(r.ajoutes)}</strong> {r.essai ? "seraient ajoutées" : "ajoutées"} au registre
        {r.type === "EN_POSTE" && (
          <>
            {" "}
            · montant du fichier {fcfa(r.montantFichier)}, selon le barème {fcfa(r.montantBareme)}
          </>
        )}
        .
      </Alerte>
      {bloc("en double dans le fichier (même personne probable) : contrôle « Inscrit deux fois » à la bourse", r.doublonsDansFichier, "rouge")}
      {bloc("encore en poste dans le registre : la bourse les signalera (« Déjà recruté »)", r.enPosteRetrouves, "rouge")}
      {bloc("catégorie non reconnue (bourse à 0 tant que la fiche n’est pas corrigée)", r.sansCategorie)}
      {bloc("département non reconnu", r.sansDepartement)}
      {bloc("montant du fichier différent du barème", r.montantsDifferents)}
      {bloc("affecté(e)s aussi par une autre note (double affectation : choisir la bonne, et vérifier la mise en route)", r.autreNote, "rouge")}
      {bloc("âge hors des limites de la configuration", r.agesHorsLimites)}
      {bloc("téléphone partagé avec d’autres volontaires", r.telephonesPartages)}
      {bloc("déjà dans le registre sans note : reliés à cette note", r.relies, "bleu")}
      {bloc("déjà dans le registre (non recréés)", r.dejaDansRegistre, "gris")}
    </div>
  );

  const bloc = (titre: string, l: Liste30, ton: "jaune" | "rouge" | "bleu" | "gris" = "jaune") =>
    l.n > 0 && (
      <details className="rounded-2xl bg-zinc-50 px-4 py-2.5 text-[12px]">
        <summary className="cursor-pointer">
          <Badge ton={ton}>{nf.format(l.n)}</Badge> {titre}
        </summary>
        <ul className="mt-2 space-y-0.5 text-zinc-600">
          {l.exemples.map((x) => (
            <li key={x}>{x}</li>
          ))}
          {l.n > l.exemples.length && <li className="text-zinc-400">… et {nf.format(l.n - l.exemples.length)} autres</li>}
        </ul>
      </details>
    );

  return (
    <Carte
      titre={
        <span className="inline-flex items-center gap-2">
          Reprendre une liste existante
          <Aide>Importe dans le registre une liste Excel déjà établie : liste de bourse payée, liste de sortants (recrutés, déserteurs…) ou note de service d’affectation signée. On lit le fichier, on choisit la feuille, on fait un essai (rien n’est enregistré), puis on importe pour de bon.</Aide>
        </span>
      }
      actions={
        <Bouton variante={ouvert ? "discret" : "principal"} onClick={() => setOuvert(!ouvert)}>
          {ouvert ? "Masquer" : "Importer un fichier Excel"}
        </Bouton>
      }
    >
      {dernier.donnees && (
        <div className="-mt-2 mb-4 rounded-2xl bg-zinc-50 px-4 py-3 text-[12px] text-zinc-600">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              <strong className="text-encre">Dernier import</strong> le {new Date(dernier.donnees.date).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              {dernier.donnees.par ? ` par ${dernier.donnees.par}` : ""} : « {dernier.donnees.fichier} », feuille « {dernier.donnees.feuille} » ·{" "}
              {nf.format(dernier.donnees.rapport.ajoutes)} ajoutée(s)
            </span>
            <Bouton variante="discret" onClick={() => setVoirDernier(!voirDernier)}>
              {voirDernier ? "Masquer le rapport" : "Revoir le rapport"}
            </Bouton>
          </div>
          {voirDernier && <div className="mt-3">{vueRapport(dernier.donnees.rapport)}</div>}
        </div>
      )}
      {ouvert && (
        <>
      <p className="-mt-2 mb-4 text-[12px] leading-relaxed text-zinc-500">
        {population === "COMMUNAUTAIRE"
          ? "Pour démarrer la liste des communautaires : importez la dernière liste de paiement (communautaires en poste, payés à partir de ce mois), puis les listes de sortants (recrutés, déserteurs…) avec leur motif. Une personne déjà sur la liste des volontaires est signalée, pas recréée. Faites toujours un essai d’abord : rien n’est enregistré."
          : "Pour démarrer le registre : importez la dernière liste de bourse payée (volontaires en poste, payés à partir de ce mois), puis les listes de sortants (recrutés à la Fonction Publique, déserteurs…) avec leur motif, puis les notes de service d’affectation déjà signées (n° 1006, 1038…). Une personne déjà dans le registre n’est pas recréée ; une personne affectée par deux notes est signalée. Faites toujours un essai d’abord : rien n’est enregistré."}
      </p>
      <ZoneFichier accept=".xlsx" envoi={envoi} envoyer={analyser} libelleBouton="Lire le fichier" aide="Classeur Excel (.xlsx) : toutes les feuilles sont lues, même masquées" />
      {message && (
        <div className="mt-4">
          <Alerte>{message}</Alerte>
        </div>
      )}
      {feuilles && (
        <div className="mt-5 space-y-4">
          <Champ libelle="Feuille à reprendre" erreur={rouge("feuille")}>
            <Liste
              value={feuille}
              onChange={(e) => {
                setFeuille(e.target.value);
                setRapport(null);
              }}
              vide="— Choisir la feuille —"
              options={feuilles.map((f) => ({ valeur: f.nom, libelle: `${f.nom} — ${nf.format(f.personnes)} personnes${f.montantTotal ? ` · ${fcfa(f.montantTotal)}` : ""}` }))}
            />
          </Champ>
          <Segments
            valeur={type}
            changer={(t) => {
              setType(t);
              setRapport(null);
              // Le mois deviné d'après le nom du fichier ne vaut que pour une liste de bourse
              if (t === "EN_POSTE" && !premierMois && devine) setPremierMois(devine);
              if (t !== "EN_POSTE" && premierMois === devine) setPremierMois("");
            }}
            options={[
              { valeur: "EN_POSTE", libelle: `${LISTES[population].titre} en poste (payés)` },
              { valeur: "SORTI", libelle: "Sortants (recrutés, déserteurs…)" },
              ...(population === "VOLONTAIRE" ? [{ valeur: "NOTE" as const, libelle: "Note de service d’affectation" }] : []),
            ]}
          />
          {type === "NOTE" ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Champ libelle="Numéro de la note" erreur={rouge("note")}>
                <Saisie value={note} onChange={(e) => setNote(e.target.value)} placeholder="1006" />
              </Champ>
              <Champ libelle="Date de signature" erreur={rouge("dateNote")}>
                <Saisie type="date" value={dateNote} onChange={(e) => setDateNote(e.target.value)} />
              </Champ>
              <Champ libelle="Catégorie si le tableau ne la dit pas" aide="Ex. Lycée pour une note des nouveaux lycées.">
                <Liste value={categorie} onChange={(e) => setCategorie(e.target.value)} vide="— Aucune —" options={(config.donnees?.configuration.categories ?? []).filter((x) => x.actif).map((x) => ({ valeur: x.code, libelle: x.libelle }))} />
              </Champ>
              <Champ libelle="Premier mois payé (facultatif)" aide="Vide : la règle de la configuration (mois qui suit la note…).">
                <ChoixMois
                value={premierMois}
                onChange={(m) => {
                  setPremierMois(m);
                  setRapport(null);
                }}
              />
              </Champ>
            </div>
          ) : type === "EN_POSTE" ? (
            <Champ
              libelle="Mois de bourse de cette liste"
              aide="Le mois que cette liste a payé (ex. Septembre 2026 pour « Bourse Septembre 2026 ») : ces volontaires sont payés à partir de ce mois."
              erreur={rouge("mois")}
              className="max-w-md"
            >
              <ChoixMois
                value={premierMois}
                onChange={(m) => {
                  setPremierMois(m);
                  setRapport(null);
                }}
              />
            </Champ>
          ) : (
            <Champ libelle="Motif de sortie de toute la liste" erreur={rouge("motif")}>
              <Liste value={motif} onChange={(e) => setMotif(e.target.value)} vide="— Choisir —" options={(config.donnees?.configuration.motifsSortie ?? []).filter((m) => m.actif).map((m) => ({ valeur: m.code, libelle: m.libelle }))} className="max-w-md" />
            </Champ>
          )}
          <div className="flex flex-wrap gap-2">
            <Bouton onClick={() => importer(true)}>
              Faire un essai
            </Bouton>
            <Bouton variante="principal" disabled={!feuille || !rapport?.essai || rapport.feuille !== feuille} onClick={() => importer(false)}>
              Importer pour de bon
            </Bouton>
          </div>
          {rapport && vueRapport(rapport)}
        </div>
      )}
        </>
      )}
    </Carte>
  );
}

const CHAMPS_SERIE = [
  { valeur: "vague", libelle: "Vague / promotion" },
  { valeur: "etablissement", libelle: "Établissement" },
  { valeur: "specialite", libelle: "Spécialité" },
  { valeur: "lieuNaissance", libelle: "Lieu de naissance" },
];

type Valeur = { valeur: string | null; n: number };
type Suspecte = Valeur & { raison: string; proposition: string | null };

/** Clé de comparaison : sans accents, majuscules, espaces ni ponctuation (« Lycée d'EPéna » = « Lycee d Epena »). */
const cle = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** Vague mal écrite : les formes normales sont « 2021-2022 », « 2023 » ou « 6e vague ». */
function vagueAnormale(v: string): { raison: string; proposition: string | null } | null {
  const t = v.trim();
  const an = new Date().getFullYear() + 1;
  const ok = (y: number) => y >= 2000 && y <= an;
  let m = t.match(/^(\d{4})-(\d{4})$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (ok(a) && b === a + 1) return null;
    return { raison: ok(a) && ok(b) ? "deux années qui ne se suivent pas" : "année impossible", proposition: ok(a) && ok(b) ? null : ok(b) ? `${b - 1}-${b}` : ok(a) ? `${a}-${a + 1}` : null };
  }
  if (/^\d{4}$/.test(t)) return ok(Number(t)) ? null : { raison: "année impossible", proposition: null };
  if (/^\d+e vague$/i.test(t)) return null;
  m = t.match(/^(\d+)-(\d+)$/);
  if (m) {
    const b = Number(m[2]);
    return { raison: "année mal tapée (chiffre en trop ou en moins)", proposition: ok(b) ? `${b - 1}-${b}` : null };
  }
  if (/^\d{5,}$/.test(t)) return { raison: "chiffres collés, il manque le tiret (ex. 2021-2022)", proposition: null };
  return { raison: "forme inhabituelle (attendu : 2021-2022, 2023 ou 6e vague)", proposition: null };
}

/** Valeurs probablement fautives : vague anormale, ou même mot écrit autrement qu'une valeur plus fréquente. */
function suspectes(champ: string, valeurs: Valeur[]): Suspecte[] {
  const res: Suspecte[] = [];
  for (const v of valeurs) {
    if (v.valeur === null) continue;
    if (champ === "vague") {
      const a = vagueAnormale(v.valeur);
      if (a) {
        res.push({ ...v, ...a });
        continue;
      }
    }
    const k = cle(v.valeur);
    const autre = valeurs.find((x) => x.valeur !== null && x.valeur !== v.valeur && cle(x.valeur) === k && (x.n > v.n || (x.n === v.n && x.valeur < v.valeur!)));
    if (autre) res.push({ ...v, raison: `écrite autrement que « ${autre.valeur} » (${nf.format(autre.n)} fiche(s))`, proposition: autre.valeur });
  }
  return res;
}

/** Corriger une même faute sur toutes les fiches (« 2022022 » → « 2021-2022 »). */
function CorrectionSerie({ fermer, apres }: { fermer: () => void; apres: (texte: string) => void }) {
  const [champ, setChamp] = useState("vague");
  const valeurs = useApi<Valeur[]>(`/enrolement/volontaires-valeurs?champ=${champ}`);
  const [ancienne, setAncienne] = useState<string | null | undefined>(undefined);
  const [nouvelle, setNouvelle] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const choisie = valeurs.donnees?.find((v) => v.valeur === ancienne);
  const aVerifier = suspectes(champ, valeurs.donnees ?? []);
  const suspecte = (v: string | null) => aVerifier.find((x) => x.valeur === v);
  const choisir = (v: string | null | undefined) => {
    setAncienne(v);
    setNouvelle((v === undefined ? undefined : suspecte(v))?.proposition ?? "");
  };
  async function corriger() {
    setErreur(null);
    try {
      const r = await api.post<{ corriges: number }>("/enrolement/volontaires-correction", { champ, ancienne, nouvelle });
      apres(`${nf.format(r.corriges)} fiche(s) corrigée(s) : « ${ancienne ?? "vide"} » → « ${nouvelle || "vide"} ». Chaque fiche garde l’ancienne valeur dans son historique.`);
    } catch (x) {
      setErreur((x as Error).message);
    }
  }
  return (
    <Modale titre="Corriger en série" ouverte fermer={fermer} large>
      <div className="space-y-4">
        <p className="text-[13px] text-zinc-600">
          Sert à corriger d’un coup <strong>la même faute répétée sur beaucoup de fiches</strong>. Le système repère les valeurs suspectes (vague mal tapée, même nom écrit de deux façons) et propose la correction ; vous pouvez aussi choisir n’importe quelle valeur de la liste. Toutes les fiches qui portent cette valeur sont corrigées.
        </p>
        <Champ libelle="Champ">
          <Liste
            value={champ}
            onChange={(e) => {
              setChamp(e.target.value);
              choisir(undefined);
            }}
            options={CHAMPS_SERIE}
          />
        </Champ>
        {valeurs.donnees &&
          (aVerifier.length ? (
            <div className="rounded-2xl bg-or-100 px-4 py-3 text-[12px]">
              <div className="mb-2 font-semibold text-or-700">{nf.format(aVerifier.length)} valeur(s) à vérifier — cliquez pour la corriger :</div>
              <ul className="max-h-48 space-y-1 overflow-y-auto">
                {aVerifier.map((x) => (
                  <li key={x.valeur}>
                    <button type="button" onClick={() => choisir(x.valeur)} className={`text-left hover:underline ${ancienne === x.valeur ? "font-semibold" : ""}`}>
                      « {x.valeur} » — {nf.format(x.n)} fiche(s) : {x.raison}
                      {x.proposition && <span className="text-marque-700"> → proposé : « {x.proposition} »</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <Alerte ton="vert">Aucune valeur suspecte repérée pour ce champ. Vous pouvez quand même choisir une valeur dans la liste.</Alerte>
          ))}
        <Champ libelle="Valeur à corriger">
          <Liste
            value={ancienne === undefined ? "" : ancienne === null ? "∅" : ancienne}
            onChange={(e) => choisir(e.target.value === "" ? undefined : e.target.value === "∅" ? null : e.target.value)}
            vide="— Choisir —"
            options={(valeurs.donnees ?? []).map((v) => ({ valeur: v.valeur ?? "∅", libelle: `${suspecte(v.valeur) ? "⚠ " : ""}${v.valeur ?? "(vide)"} — ${nf.format(v.n)} fiche(s)` }))}
          />
        </Champ>
        <Champ libelle="Nouvelle valeur" aide={champ === "vague" ? "Ex. 2021-2022, 2023 ou 6e vague. Les vagues sont uniformisées (« 7è Vague » devient « 7e vague »). Vérifiez la proposition sur un dossier avant de corriger." : "Vérifiez la proposition avant de corriger."}>
          <Saisie value={nouvelle} onChange={(e) => setNouvelle(e.target.value)} placeholder={champ === "vague" ? "2021-2022" : champ === "etablissement" ? "Lycée de Dongou" : champ === "specialite" ? "Mathématiques" : "Brazzaville"} />
        </Champ>
        {choisie && (
          <Alerte ton="jaune">
            {nf.format(choisie.n)} fiche(s) passeront de « {choisie.valeur ?? "vide"} » à « {nouvelle || "vide"} ».
          </Alerte>
        )}
        {erreur && <Alerte>{erreur}</Alerte>}
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Bouton onClick={fermer}>Annuler</Bouton>
        <Bouton variante="principal" disabled={ancienne === undefined} onClick={corriger}>
          Corriger {choisie ? `${nf.format(choisie.n)} fiche(s)` : ""}
        </Bouton>
      </div>
    </Modale>
  );
}

const CHAMPS_EN_ROUGE = "Remplissez d’abord les champs en rouge.";

const MOIS_NOMS = ["janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"];

/** « Bourse Septembre 2026.xlsx » → « 2026-09 » ; null si le nom ne dit pas le mois. */
function moisDuNom(nom: string): string | null {
  const t = nom.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const an = t.match(/(?<!\d)(20\d{2})(?!\d)/)?.[1];
  const i = MOIS_NOMS.findIndex((m) => new RegExp(`(?<![a-z])${m}(?![a-z])`).test(t));
  return an && i >= 0 ? `${an}-${String(i + 1).padStart(2, "0")}` : null;
}

/** Ajout à la main d'un volontaire (oubli d'une liste, dossier arrivé à part). */
function Ajout({ fermer, apres, population }: { fermer: () => void; apres: (id: string) => void; population: Population }) {
  const { refs } = useSession();
  const config = useConfigEnrolement();
  const [f, setF] = useState<Record<string, string>>({});
  const [doublon, setDoublon] = useState<string | null>(null);
  const [forcer, setForcer] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const champ = (k: string, libelle: string, type = "text", aide?: string) => (
    <Champ libelle={libelle} aide={aide}>
      {k === "etablissement" ? (
        <SaisieReferentiel liste="ETABLISSEMENT" valeur={f[k] ?? ""} changer={(x) => setF({ ...f, [k]: x })} departementId={f.departementId} />
      ) : (
        <Saisie type={type} value={f[k] ?? ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
      )}
    </Champ>
  );
  async function enregistrer() {
    setErreur(null);
    try {
      const corps = { ...Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v === "" ? null : v])), departementId: f.departementId ? Number(f.departementId) : null, forcer, population };
      const r = await api.post<{ volontaire: Volontaire }>("/enrolement/volontaires", corps);
      apres(r.volontaire.id);
    } catch (x) {
      const m = (x as Error).message;
      if (m.startsWith("Déjà dans le registre")) setDoublon(m);
      else setErreur(m);
    }
  }
  return (
    <Modale titre={`Ajouter un ${LISTES[population].un}`} ouverte fermer={fermer} large>
      <div className="grid gap-3 sm:grid-cols-2">
        {champ("nomComplet", "Nom et prénoms")}
        {champ("telephone", "Téléphone")}
        {champ("dateNaissance", "Date de naissance", "date")}
        {champ("lieuNaissance", "Lieu de naissance")}
        <Champ libelle={population === "COMMUNAUTAIRE" ? "Cycle" : "Catégorie de bourse"}>
          <Liste
            value={f.categorie ?? ""}
            onChange={(e) => setF({ ...f, categorie: e.target.value })}
            vide="— À choisir —"
            options={categoriesDe(config.donnees?.configuration, population)
              .filter((x) => x.actif)
              .map((x) => ({ valeur: x.code, libelle: `${x.libelle} (${x.bourse ? fcfa(x.bourse) : "montant à fixer"})` }))}
          />
        </Champ>
        <Champ libelle="Département">
          <Liste value={f.departementId ?? ""} onChange={(e) => setF({ ...f, departementId: e.target.value })} vide="— À choisir —" options={refs.departements.map((d) => ({ valeur: d.id, libelle: d.nom }))} />
        </Champ>
        {champ("etablissement", "Établissement")}
        {population === "VOLONTAIRE" && champ("vague", "Vague", "text", "Ex. 7e vague, ou l’année d’enrôlement (2025).")}
        {population === "VOLONTAIRE" && champ("noteReference", "Note de service (n°)")}
        {population === "VOLONTAIRE" && champ("dateNote", "Date de la note", "date")}
        {champ("datePriseService", "Date de prise de service", "date")}
        <Champ libelle="Premier mois payé (facultatif)" aide="Vide : la règle de la configuration s’applique (note ou prise de service).">
          <ChoixMois value={f.premierMois ?? ""} onChange={(m) => setF({ ...f, premierMois: m })} />
        </Champ>
      </div>
      {doublon && (
        <div className="mt-4 space-y-2">
          <Alerte ton="jaune">{doublon}</Alerte>
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" className="size-4 accent-marque-600" checked={forcer} onChange={(e) => setForcer(e.target.checked)} />
            J’ai vérifié : c’est une autre personne (homonyme).
          </label>
        </div>
      )}
      {erreur && (
        <div className="mt-4">
          <Alerte>{erreur}</Alerte>
        </div>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <Bouton onClick={fermer}>Annuler</Bouton>
        <Bouton variante="principal" disabled={!!doublon && !forcer} onClick={enregistrer}>
          Ajouter
        </Bouton>
      </div>
    </Modale>
  );
}

/** Registre des volontaires : qui est en poste, qui est sorti, et pourquoi. */
export default function RegistreVolontaires() {
  const { profil, refs } = useSession();
  const config = useConfigEnrolement();
  const [recherche, setRecherche] = useState("");
  const [population, setPopulation] = useState<Population>("VOLONTAIRE");
  const [vague, setVague] = useState("");
  const [statut, setStatut] = useState("EN_POSTE");
  const [departement, setDepartement] = useState("");
  const [categorie, setCategorie] = useState("");
  const [motif, setMotif] = useState("");
  const [page, setPage] = useState(1);
  const [fiche, setFiche] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [ajout, setAjout] = useState(false);
  const [serie, setSerie] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const liste = useApi<Page>(`/enrolement/volontaires${qs({ population, vague: population === "VOLONTAIRE" ? vague : "", recherche, statut, departement, categorie, motif: statut === "SORTI" ? motif : "", page })}`);
  if (!peut.traiter(profil.role) && !accesDonne(profil)) return <Alerte>Accès réservé aux agents de la DGRHAS.</Alerte>;
  const c = config.donnees?.configuration;
  const cats = categoriesDe(c, population);
  const nomCat = (code: string | null) => cats.find((x) => x.code === code)?.libelle ?? code;
  const L = LISTES[population];
  const nomMotif = (code: string | null) => c?.motifsSortie.find((x) => x.code === code)?.libelle ?? code;
  const filtre = (f: () => void) => {
    f();
    setPage(1);
  };
  const p = liste.donnees;
  const pages = p ? Math.max(1, Math.ceil(p.total / p.taille)) : 1;

  return (
    <div className="space-y-6">
      <EnTete
        titre={`${L.titre} en poste`}
        sousTitre={
          population === "VOLONTAIRE"
            ? "Le registre des enseignants volontaires : il sert à calculer la bourse de chaque mois. Une sortie (recruté, déserteur…) arrête la bourse selon la règle de son motif (Configuration)."
            : "La liste des enseignants communautaires (recrutés autrefois par les écoles, payés chaque mois par département et par cycle). Elle se révise chaque mois : ajouts, retraits (déserteurs, premier salaire de la Fonction Publique)."
        }
        actions={
          peutGerer(profil.role) && (
            <>
              <Bouton onClick={() => setSerie(true)}>
                Corriger en série
                <Aide>Corrige d’un coup une même faute répétée sur beaucoup de fiches (ex. la vague « 2022022 » en « 2021-2022 », un établissement écrit de deux façons). Le système signale les valeurs suspectes et propose la correction ; vous vérifiez, puis vous corrigez. Chaque fiche garde l’ancienne valeur dans son historique.</Aide>
              </Bouton>
              <Bouton variante="principal" onClick={() => setAjout(true)}>
                Ajouter un {L.un}
                <Aide>Ajoute à la main un volontaire absent des listes (oubli, dossier arrivé à part). Si un nom ressemblant existe déjà dans le registre, l’ajout est bloqué tant que vous n’avez pas confirmé qu’il s’agit d’une autre personne. Sans « premier mois payé », la bourse démarre selon la règle de la configuration (mois qui suit la note de service…).</Aide>
              </Bouton>
            </>
          )
        }
      />
      <Segments
        valeur={population}
        changer={(v) =>
          filtre(() => {
            setPopulation(v);
            setCategorie("");
            setVague("");
          })
        }
        options={[
          { valeur: "VOLONTAIRE", libelle: "Volontaires (bourse)" },
          { valeur: "COMMUNAUTAIRE", libelle: "Communautaires" },
        ]}
      />
      {erreur && <Alerte>{erreur}</Alerte>}
      {peutGerer(profil.role) && profil.role !== "DIRECTEUR" && (
        <Reprise
          key={population}
          population={population}
          ouvertParDefaut={!!p && p.resume.enPoste + p.resume.sortis === 0}
          apres={() => {
            liste.recharger();
            setMessage("Liste reprise dans le registre.");
          }}
        />
      )}
      {population === "VOLONTAIRE" && p && p.resume.enAttente > 0 && (
        <Alerte ton="jaune">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>
              <strong>{nf.format(p.resume.enAttente)}</strong> enrôlé(s) de notes de service signées ne sont pas encore dans le registre : leur bourse ne sera pas calculée tant qu’ils n’y sont pas. Une personne déjà reprise d’une liste de bourse est reliée à sa fiche, pas recréée.
            </span>
            {peutGerer(profil.role) && (
              <Bouton
                variante="principal"
                onClick={async () => {
                  setErreur(null);
                  try {
                    const r = await api.post<{ ajoutes: number; relies: string[]; sansCategorie: string[] }>("/enrolement/volontaires/integration");
                    setMessage(`${r.ajoutes} volontaire(s) ajouté(s), ${r.relies.length} relié(s) à une fiche existante${r.sansCategorie.length ? ` ; ${r.sansCategorie.length} sans catégorie de bourse (à corriger)` : ""}.`);
                    liste.recharger();
                  } catch (x) {
                    setErreur((x as Error).message);
                  }
                }}
              >
                Les intégrer au registre
                <Aide>Ajoute au registre les volontaires retenus dans les notes d’enrôlement signées : catégorie de bourse d’après le diplôme et le cycle (un DEMA va en Beaux-Arts), département et établissement retenus, numéro et date de la note. Leur bourse démarre selon la règle de la configuration. Une personne déjà reprise d’une liste de bourse est reliée à sa fiche, sans doublon.</Aide>
              </Bouton>
            )}
          </div>
        </Alerte>
      )}
      <Annonce fermer={() => setMessage(null)}>{message}</Annonce>
      {p && (
        <div className="flex flex-wrap gap-2 text-[12px]">
          <Badge ton="vert">{nf.format(p.resume.enPoste)} en poste</Badge>
          <Badge ton="gris">{nf.format(p.resume.sortis)} sortis</Badge>
          {p.resume.sansCategorie > 0 && <Badge ton="rouge">{nf.format(p.resume.sansCategorie)} en poste sans catégorie</Badge>}
          {p.resume.sansDepartement > 0 && <Badge ton="rouge">{nf.format(p.resume.sansDepartement)} en poste sans département</Badge>}
        </div>
      )}
      {population === "VOLONTAIRE" && !!p?.vagues.length && (
        <Carte titre="Volontaires en poste par vague">
          <p className="-mt-2 mb-3 text-[12px] text-zinc-500">
            La vague est l’année d’enrôlement (1re vague : {c?.premiereVague ?? 2019}-{(c?.premiereVague ?? 2019) + 1}). Au recrutement à la Fonction Publique, les anciennes vagues passent d’abord. Cliquez sur une vague pour voir ses volontaires.
          </p>
          <div className="flex flex-wrap gap-2">
            {p.vagues.map((x) => (
              <button
                key={String(x.vague)}
                type="button"
                onClick={() => filtre(() => setVague(vague === String(x.vague ?? "") ? "" : String(x.vague ?? "")))}
                className={`rounded-xl px-3 py-1.5 text-[12px] ring-1 ${vague !== "" && vague === String(x.vague ?? "") ? "bg-marque-500 text-white ring-marque-500" : "bg-white ring-zinc-200 hover:bg-zinc-50"}`}
              >
                {x.vague === null ? "Vague inconnue" : libelleVague(x.vague)} · <strong>{nf.format(x.enPoste)}</strong>
              </button>
            ))}
          </div>
        </Carte>
      )}
      <Carte>
        <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Saisie placeholder="Nom, téléphone ou établissement…" value={recherche} onChange={(e) => filtre(() => setRecherche(e.target.value))} className="xl:col-span-2" />
          <Liste value={statut} onChange={(e) => filtre(() => setStatut(e.target.value))} vide="Tous" options={[{ valeur: "EN_POSTE", libelle: "En poste" }, { valeur: "SORTI", libelle: "Sortis" }]} />
          <Liste value={departement} onChange={(e) => filtre(() => setDepartement(e.target.value))} vide="Tous les départements" options={refs.departements.map((d) => ({ valeur: d.id, libelle: d.nom }))} />
          {statut === "SORTI" ? (
            <Liste value={motif} onChange={(e) => filtre(() => setMotif(e.target.value))} vide="Tous les motifs" options={(c?.motifsSortie ?? []).map((m) => ({ valeur: m.code, libelle: m.libelle }))} />
          ) : (
            <Liste value={categorie} onChange={(e) => filtre(() => setCategorie(e.target.value))} vide={population === "VOLONTAIRE" ? "Toutes les catégories" : "Tous les cycles"} options={[...cats.map((x) => ({ valeur: x.code, libelle: x.libelle })), { valeur: "-", libelle: population === "VOLONTAIRE" ? "Sans catégorie" : "Sans cycle" }]} />
          )}
        </div>
        {liste.erreur && <Alerte>{liste.erreur}</Alerte>}
        {!p ? (
          <Chargement />
        ) : !p.lignes.length ? (
          <Vide>{p.resume.enPoste + p.resume.sortis ? `Aucun ${L.un} avec ces filtres.` : `La liste des ${L.des} est vide : commencez par reprendre la dernière liste payée (« Reprendre une liste existante », en haut).`}</Vide>
        ) : (
          <>
            <Tableau>
              <thead>
                <tr>
                  <th>Nom et prénoms</th>
                  <th>{population === "VOLONTAIRE" ? "Catégorie" : "Cycle"}</th>
                  <th>Département</th>
                  <th>Établissement</th>
                  {population === "VOLONTAIRE" && <th>Vague</th>}
                  <th>{statut === "SORTI" ? "Sortie" : "Payé depuis"}</th>
                </tr>
              </thead>
              <tbody>
                {p.lignes.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <button type="button" className="text-left font-medium underline decoration-zinc-300 decoration-dotted underline-offset-2 hover:text-marque-700" onClick={() => setFiche(v.id)}>
                        {v.nomComplet}
                      </button>
                      {v.telephone && <div className="text-[11px] text-zinc-400">{v.telephone}</div>}
                    </td>
                    <td className={v.categorie ? "" : "text-rouge-600"}>{v.categorie ? nomCat(v.categorie) : `? (${v.cycleBrut ?? "vide"})`}</td>
                    <td className={v.departementId ? "" : "text-rouge-600"}>{refs.departements.find((d) => d.id === v.departementId)?.nom ?? `? (${v.departementBrut ?? "vide"})`}</td>
                    <td className="text-[12px]">{v.etablissement ?? "—"}</td>
                    {population === "VOLONTAIRE" && <td className="text-[12px]">{libelleVague(v.vagueNumero, v.vague)}</td>}
                    <td className="text-[12px]">{v.statut === "SORTI" ? `${nomMotif(v.motifSortie)}${v.dateSortie ? ` · ${v.dateSortie.split("-").reverse().join("/")}` : ""}` : moisFr(v.premierMois)}</td>
                  </tr>
                ))}
              </tbody>
            </Tableau>
            <div className="mt-4 flex items-center justify-between text-[12px] text-zinc-500">
              <span>
                {nf.format(p.total)} {L.un}(s) · page {p.page} sur {pages}
              </span>
              <div className="flex gap-2">
                <Bouton disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  Précédente
                </Bouton>
                <Bouton disabled={page >= pages} onClick={() => setPage(page + 1)}>
                  Suivante
                </Bouton>
              </div>
            </div>
          </>
        )}
      </Carte>
      {fiche && <FicheVolontaire id={fiche} fermer={() => setFiche(null)} apres={() => liste.recharger()} />}
      {serie && (
        <CorrectionSerie
          fermer={() => setSerie(false)}
          apres={(t) => {
            setSerie(false);
            setMessage(t);
            liste.recharger();
          }}
        />
      )}
      {ajout && (
        <Ajout
          population={population}
          fermer={() => setAjout(false)}
          apres={(id) => {
            // La fiche du nouveau volontaire s'ouvre : elle tient lieu de confirmation
            setAjout(false);
            liste.recharger();
            setFiche(id);
          }}
        />
      )}
    </div>
  );
}
