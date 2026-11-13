"use client";

import Link from "next/link";
import { useState } from "react";
import { FileSpreadsheet, FileText, Printer } from "lucide-react";
import { categoriesDe, FicheVolontaire, fcfa, libelleVague, LISTES, moisFr, nf, peutGerer, type Population, useConfigEnrolement, type Volontaire } from "@/components/enrolement/volontaires";
import { useSession } from "@/components/session";
import { Aide, Alerte, Annonce, Badge, Bouton, Carte, Champ, Chargement, ChoixMois, EnTete, Liste, Modale, Saisie, Segments, Tableau, Vide, ZoneFichier } from "@/components/ui";
import { api, qs, useApi } from "@/lib/api";
import { accesDonne } from "@/lib/espaces";
import { peut } from "@/lib/libelles";
import { SaisieReferentiel } from "@/components/saisie-referentiel";
import { AlignerBourse } from "@/components/enrolement/aligner-bourse";
import { AlignerCommunautaires } from "@/components/enrolement/aligner-communautaires";
import { DatesSortie } from "@/components/enrolement/dates-sortie";
import { RemplacerDepartement } from "@/components/enrolement/remplacer-departement";

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
  type: "EN_POSTE" | "SORTI" | "NOTE" | "MISE_A_JOUR";
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
  /** Absents des rapports d'avant le 04/11/2026. */
  aVerifier?: Liste30;
  sortis?: number;
  autreNote: Liste30;
  relies: Liste30;
  agesHorsLimites: Liste30;
  telephonesPartages: Liste30;
  /** Mise à jour des fiches déjà dans le registre (07/11/2026) ; absent des rapports d'avant. */
  fichesTrouvees?: number;
  fichesCompletees?: number;
  parChamp?: Record<string, number>;
  differences?: Record<string, { cle: string; n: number; remplace: boolean; exemples: { nom: string; registre: string; fichier: string }[] }>;
  plusieursFiches?: Liste30;
  autreListe?: Liste30;
  introuvables?: Liste30;
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
  const [type, setType] = useState<"EN_POSTE" | "SORTI" | "NOTE" | "MISE_A_JOUR">("EN_POSTE");
  // Fiches déjà dans le registre : on complète leurs cases vides (par défaut) ; les rubriques cochées
  // prennent aussi la valeur du fichier quand elle est différente (07/11/2026)
  const [completer, setCompleter] = useState(true);
  const [remplacer, setRemplacer] = useState<string[]>([]);
  const [calcul, setCalcul] = useState(false);
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

  async function importer(essai: boolean, rubriques = remplacer) {
    if (!fichier) return;
    setErreur(null);
    if (Object.values(manque).some(Boolean)) {
      setVerifier(true);
      setErreur(CHAMPS_EN_ROUGE);
      return;
    }
    setCalcul(true);
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
          miseAJour: type === "MISE_A_JOUR" || completer ? "VIDES" : "NON",
          remplacer: rubriques.join(",") || undefined,
          essai: essai ? 1 : 0,
        })}`, fd);
      setRapport(r);
      if (!essai) {
        apres();
        dernier.recharger();
      }
    } catch (x) {
      setErreur((x as Error).message);
    } finally {
      setCalcul(false);
    }
  }

  /** Cocher une rubrique à remplacer : l'essai est refait tout de suite, pour voir l'effet. */
  function basculerRemplacer(cle: string) {
    const r = remplacer.includes(cle) ? remplacer.filter((x) => x !== cle) : [...remplacer, cle];
    setRemplacer(r);
    importer(true, r);
  }

  /** Le rapport d'un essai ou d'un import : les mêmes messages avant et après (DG, 26/10/2026). */
  const vueRapport = (r: Rapport) => (
    <div className="space-y-2">
      <Alerte ton={r.essai ? "bleu" : "vert"}>
        {r.essai ? "Essai : rien n’est enregistré. " : "Import terminé. "}
        <strong>{nf.format(r.lues)}</strong> personnes lues
        {r.type !== "MISE_A_JOUR" && (
          <>
            , <strong>{nf.format(r.ajoutes)}</strong> {r.essai ? "seraient ajoutées" : "ajoutées"} au registre
          </>
        )}
        {r.fichesCompletees !== undefined && (
          <>
            {" "}
            · <strong>{nf.format(r.fichesCompletees)}</strong> fiche(s) déjà dans le registre {r.essai ? "seraient mises à jour" : "mises à jour"}
          </>
        )}
        {r.type === "SORTI" && (
          <>
            {" "}
            · <strong>{nf.format(r.sortis ?? 0)}</strong> fiche(s) en poste {r.essai ? "seraient sorties" : "sorties"}
          </>
        )}
        {r.type === "EN_POSTE" && (
          <>
            {" "}
            · montant du fichier {fcfa(r.montantFichier)}, selon le barème {fcfa(r.montantBareme)}
          </>
        )}
        .
      </Alerte>
      {bloc("en double dans le fichier (même personne probable) : les deux lignes sont enregistrées, et bloquées à la bourse (« Inscrit deux fois ») tant qu’on n’a pas tranché. Pour corriger : Paiement mensuel › contrôle « Inscrit deux fois » › cliquer sur le nom", r.doublonsDansFichier, "rouge")}
      {r.type === "SORTI" && r.sortis !== undefined
        ? bloc("retrouvés en poste dans le registre : leur fiche sort, avec ce motif (pas de nouvelle fiche)", r.enPosteRetrouves, "bleu")
        : bloc("encore en poste dans le registre : la bourse les signalera (« Déjà recruté »)", r.enPosteRetrouves, "rouge")}
      {bloc("ressemblent à une fiche en poste sans certitude (plusieurs fiches, ou nom différent sans date de naissance) : rien n’est fermé, à sortir à la main depuis la fiche", r.aVerifier, "rouge")}
      {bloc("catégorie non reconnue (bourse à 0 tant que la fiche n’est pas corrigée)", r.sansCategorie)}
      {bloc("département non reconnu", r.sansDepartement)}
      {bloc("montant du fichier différent du barème", r.montantsDifferents)}
      {bloc("affecté(e)s aussi par une autre note (double affectation : choisir la bonne, et vérifier la mise en route)", r.autreNote, "rouge")}
      {bloc("âge hors des limites de la configuration", r.agesHorsLimites)}
      {bloc("téléphone partagé avec d’autres volontaires", r.telephonesPartages)}
      {bloc("déjà dans le registre sans note : reliés à cette note", r.relies, "bleu")}
      {bloc("déjà dans le registre (non recréés)", r.dejaDansRegistre, "gris")}
      {r.fichesTrouvees !== undefined && <MiseAJourFiches r={r} remplacer={remplacer} basculer={basculerRemplacer} calcul={calcul} />}
      {bloc("trouvés seulement sur l’autre liste (volontaires ↔ communautaires) : rien n’est changé. Même nom sur les deux listes : vérifiez s’il s’agit de la même personne inscrite deux fois", r.autreListe, "rouge")}
      {bloc("plusieurs fiches possibles dans le registre : rien n’est changé (à compléter depuis la fiche)", r.plusieursFiches, "jaune")}
      {bloc("pas dans le registre : rien n’est fait (une mise à jour n’ajoute personne)", r.introuvables, "gris")}
    </div>
  );

  const bloc = (titre: string, l: Liste30 | undefined, ton: "jaune" | "rouge" | "bleu" | "gris" = "jaune") =>
    !!l && l.n > 0 && (
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
              { valeur: "MISE_A_JOUR", libelle: "Mettre à jour les fiches (n’ajoute personne)" },
            ]}
          />
          {type === "MISE_A_JOUR" ? (
            <div className="rounded-2xl bg-marque-50 px-4 py-3 text-[13px] leading-relaxed text-marque-900 ring-1 ring-marque-200">
              Le système retrouve chaque personne du fichier dans le registre (volontaires et communautaires) et <strong>complète les cases vides</strong> de sa fiche :
              date et lieu de naissance, sexe, téléphone, diplôme, spécialité, établissement, circonscription, date de prise de service, vague. Personne n’est ajouté
              ni sorti. Après l’essai, vous pouvez aussi choisir de remplacer les valeurs différentes, rubrique par rubrique.
            </div>
          ) : (
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-zinc-50 px-4 py-3 text-[13px] ring-1 ring-zinc-200">
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-marque-600"
                checked={completer}
                onChange={(e) => {
                  setCompleter(e.target.checked);
                  setRapport(null);
                }}
              />
              <span>
                <strong>Mettre aussi à jour les personnes déjà dans le registre</strong>
                <span className="block text-zinc-500">Leurs cases vides prennent les informations du fichier (naissance, téléphone, diplôme…). Rien n’est effacé.</span>
              </span>
            </label>
          )}
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
          ) : type === "MISE_A_JOUR" ? null : type === "EN_POSTE" ? (
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
            <Bouton onClick={() => importer(true)} disabled={calcul}>
              {calcul ? "Calcul en cours…" : "Faire un essai"}
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

/**
 * Ce que la réimportation change dans les fiches déjà présentes : les cases complétées, puis les
 * valeurs différentes, rubrique par rubrique, avec une case « Remplacer par la valeur du fichier ».
 */
function MiseAJourFiches({ r, remplacer, basculer, calcul }: { r: Rapport; remplacer: string[]; basculer: (cle: string) => void; calcul: boolean }) {
  const remplies = Object.entries(r.parChamp ?? {}).sort((a, b) => b[1] - a[1]);
  const diffs = Object.entries(r.differences ?? {}).sort((a, b) => b[1].n - a[1].n);
  return (
    <div className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-zinc-200">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-[14px] font-semibold text-encre">Mise à jour des fiches déjà dans le registre</h4>
        <span className="text-[12px] text-zinc-500">
          {nf.format(r.fichesTrouvees ?? 0)} retrouvée(s) avec certitude · {nf.format(r.fichesCompletees ?? 0)} {r.essai ? "seront modifiées" : "modifiées"}
        </span>
      </div>
      {remplies.length ? (
        <div>
          <div className="mb-1.5 text-[12px] font-medium text-zinc-600">Cases vides complétées</div>
          <div className="flex flex-wrap gap-1.5">
            {remplies.map(([c, n]) => (
              <span key={c} className="rounded-full bg-emerald-50 px-2.5 py-1 text-[12px] text-emerald-800 ring-1 ring-emerald-200">
                {c} <strong>{nf.format(n)}</strong>
              </span>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-[12px] text-zinc-500">Aucune case vide à compléter : les fiches retrouvées ont déjà ces informations.</p>
      )}
      {diffs.length > 0 && (
        <div>
          <div className="mb-1.5 text-[12px] font-medium text-zinc-600">
            Valeurs différentes entre le registre et le fichier — par défaut, le registre garde la sienne. Cochez une rubrique pour prendre celle du fichier
            {calcul && <span className="ml-2 text-marque-700">· calcul…</span>}
          </div>
          <div className="space-y-1.5">
            {diffs.map(([libelle, d]) => (
              <details key={libelle} className="rounded-xl bg-zinc-50 ring-1 ring-zinc-200">
                <summary className="flex cursor-pointer flex-wrap items-center gap-3 px-3 py-2 text-[13px]">
                  <span className="font-medium text-zinc-900">{libelle}</span>
                  <Badge ton="jaune">{nf.format(d.n)} différente(s)</Badge>
                  <label className="ml-auto flex items-center gap-2 text-[12px]" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" className="size-4 accent-marque-600" checked={remplacer.includes(d.cle)} disabled={calcul} onChange={() => basculer(d.cle)} />
                    Remplacer par la valeur du fichier
                  </label>
                </summary>
                <table className="mx-3 mb-2 w-[calc(100%-1.5rem)] text-[12px]">
                  <thead className="text-left text-zinc-500">
                    <tr>
                      <th className="py-1 pr-3 font-medium">Personne</th>
                      <th className="py-1 pr-3 font-medium">Dans le registre</th>
                      <th className="py-1 font-medium">Dans le fichier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.exemples.map((x, i) => (
                      <tr key={i} className="border-t border-zinc-200/70">
                        <td className="py-1 pr-3 text-zinc-800">{x.nom}</td>
                        <td className={`py-1 pr-3 ${remplacer.includes(d.cle) ? "text-zinc-400 line-through" : "text-zinc-800"}`}>{x.registre}</td>
                        <td className={`py-1 ${remplacer.includes(d.cle) ? "font-medium text-emerald-800" : "text-zinc-500"}`}>{x.fichier}</td>
                      </tr>
                    ))}
                    {d.n > d.exemples.length && (
                      <tr>
                        <td colSpan={3} className="py-1 text-zinc-400">
                          … et {nf.format(d.n - d.exemples.length)} autres
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
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
  const [remplacer, setRemplacer] = useState(false);
  const [aligner, setAligner] = useState(false);
  const [alignerCom, setAlignerCom] = useState(false);
  const [datesSortie, setDatesSortie] = useState(false);
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
  // Impression de la liste affichée (06/11/2026) : le titre suit les filtres
  const filtresListe = { population, vague: population === "VOLONTAIRE" ? vague : "", recherche, statut, departement, categorie, motif: statut === "SORTI" ? motif : "" };
  const titreListe = [
    `Liste des ${L.des}${statut === "EN_POSTE" ? " en poste" : statut === "SORTI" ? " sortis" : ""}`,
    departement ? refs.departements.find((d) => String(d.id) === departement)?.nom : "",
    categorie && categorie !== "-" ? nomCat(categorie) : "",
    population === "VOLONTAIRE" && vague ? (vague === "aucune" ? "vague inconnue" : libelleVague(Number(vague), null)) : "",
  ]
    .filter(Boolean)
    .join(" — ");
  const imprimer = (format: "docx" | "xlsx" | "pdf") => {
    if (format === "pdf") window.open(`/impression/volontaires${qs({ ...filtresListe, titre: titreListe })}`, "_blank");
    else api.telecharger(`/enrolement/volontaires/export${qs({ ...filtresListe, format, titre: titreListe })}`, `${titreListe}.${format}`).catch((e: Error) => setErreur(e.message));
  };

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
              <Link href={`/enrolement/volontaires/ecarts?population=${population}`}>
                <Bouton>
                  Écarts avec la base du personnel
                  <Aide>Ce que le registre et la base du personnel ne disent pas pareil : naissance, sexe, téléphone, département, établissement, diplôme, prise de service… On reprend d’un clic ce que la fiche du personnel connaît, et on choisit la bonne valeur quand elles diffèrent.</Aide>
                </Bouton>
              </Link>
              {population === "VOLONTAIRE" && profil.role !== "DIRECTEUR" && (
                <Bouton onClick={() => setAligner(true)}>
                  Aligner sur la bourse d’un mois
                  <Aide>Le fichier de la bourse payée d’un mois (septembre, puis octobre…) : les payés restent ou entrent, ceux du registre qui ne sont plus payés sortent avec le motif de la feuille RETRAITS. On vérifie d’abord, rien n’est enregistré tant qu’on n’a pas confirmé.</Aide>
                </Bouton>
              )}
              {population === "COMMUNAUTAIRE" && profil.role !== "DIRECTEUR" && (
                <Bouton onClick={() => setAlignerCom(true)}>
                  Aligner sur un état de paiement
                  <Aide>L’état de paiement des communautaires mis à jour, une feuille par département : ceux qui y sont restent, sont réintégrés ou ajoutés (chaque nouveau est montré avant d’être ajouté) ; ceux qui n’y sont plus sortent, seulement dans les départements du fichier. On vérifie d’abord, rien n’est enregistré tant qu’on n’a pas confirmé.</Aide>
                </Bouton>
              )}
              {population === "COMMUNAUTAIRE" && profil.role !== "DIRECTEUR" && (
                <Bouton onClick={() => setRemplacer(true)}>
                  Remplacer un département
                  <Aide>La nouvelle liste d’un département (ex. la note de la préfecture de la Likouala), une feuille par cycle : ceux qui y sont restent ou entrent, les autres de ce département sortent. On vérifie d’abord, rien n’est enregistré tant qu’on n’a pas confirmé.</Aide>
                </Bouton>
              )}
              {profil.role !== "DIRECTEUR" && (
                <Bouton onClick={() => setDatesSortie(true)}>
                  Corriger des dates de sortie
                  <Aide>Pour des fiches déjà sorties avec une mauvaise date (ex. les retirés de la Likouala sortis le 13/11 au lieu du 01/10) : on choisit le département, le motif et la date actuelle, on voit combien et ce que ça change pour la paie, puis on corrige en une fois.</Aide>
                </Bouton>
              )}
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
                // « aucune » : la vague n'est pas reconnue (vide ou mal écrite)
                onClick={() => filtre(() => setVague(vague === String(x.vague ?? "aucune") ? "" : String(x.vague ?? "aucune")))}
                className={`rounded-xl px-3 py-1.5 text-[12px] ring-1 ${vague === String(x.vague ?? "aucune") ? "bg-marque-500 text-white ring-marque-500" : "bg-white ring-zinc-200 hover:bg-zinc-50"}`}
              >
                {x.vague === null ? "Vague inconnue" : libelleVague(x.vague)} · <strong>{nf.format(x.enPoste)}</strong>
              </button>
            ))}
          </div>
        </Carte>
      )}
      <Carte
        titre={`Liste des ${L.des}`}
        actions={
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] text-zinc-500">Imprimer la liste affichée :</span>
            <Bouton disabled={!p?.total} onClick={() => imprimer("docx")}>
              <FileText className="size-4" aria-hidden /> Word
            </Bouton>
            <Bouton disabled={!p?.total} onClick={() => imprimer("xlsx")}>
              <FileSpreadsheet className="size-4" aria-hidden /> Excel
            </Bouton>
            <Bouton variante="principal" disabled={!p?.total} onClick={() => imprimer("pdf")}>
              <Printer className="size-4" aria-hidden /> PDF / Imprimer
              <Aide>La liste avec les filtres choisis (statut, département, catégorie, vague, recherche), en paysage, avec toutes les informations de chaque personne. Au pied de chaque page : « Généré par le Système d’Information… (SIGRHAS-MEPPSA) ».</Aide>
            </Bouton>
          </span>
        }
      >
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
                  <th>Naissance</th>
                  <th>Diplôme · spécialité</th>
                  <th>{population === "VOLONTAIRE" ? "Catégorie" : "Cycle"}</th>
                  <th>Département · établissement</th>
                  {population === "VOLONTAIRE" && <th>Vague</th>}
                  <th>Note de service</th>
                  <th>{statut === "SORTI" ? "Sortie" : "Prise de service · payé depuis"}</th>
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
                    <td className="text-[12px]">
                      {v.dateNaissance ? v.dateNaissance.split("-").reverse().join("/") : "—"}
                      {v.lieuNaissance && <div className="text-zinc-400">{v.lieuNaissance}</div>}
                    </td>
                    <td className="text-[12px]">
                      {v.diplome ?? "—"}
                      {v.specialite && <div className="text-zinc-400">{v.specialite}</div>}
                    </td>
                    <td className={v.categorie ? "text-[12px]" : "text-[12px] text-rouge-600"}>{v.categorie ? nomCat(v.categorie) : `? (${v.cycleBrut ?? "vide"})`}</td>
                    <td className="text-[12px]">
                      <span className={v.departementId ? "" : "text-rouge-600"}>{refs.departements.find((d) => d.id === v.departementId)?.nom ?? `? (${v.departementBrut ?? "vide"})`}</span>
                      <div className="text-zinc-400">{v.etablissement ?? "établissement non précisé"}</div>
                    </td>
                    {population === "VOLONTAIRE" && <td className="text-[12px]">{libelleVague(v.vagueNumero, v.vague)}</td>}
                    <td className="text-[12px]">
                      {v.noteReference ?? "—"}
                      {v.dateNote && <div className="text-zinc-400">du {v.dateNote.split("-").reverse().join("/")}</div>}
                    </td>
                    <td className="text-[12px]">
                      {v.statut === "SORTI" ? (
                        `${nomMotif(v.motifSortie)}${v.dateSortie ? ` · ${v.dateSortie.split("-").reverse().join("/")}` : ""}`
                      ) : (
                        <>
                          {v.datePriseService ? v.datePriseService.split("-").reverse().join("/") : "—"}
                          <div className="text-zinc-400">payé depuis {moisFr(v.premierMois)}</div>
                        </>
                      )}
                    </td>
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
      {remplacer && <RemplacerDepartement fermer={() => setRemplacer(false)} apres={() => liste.recharger()} />}
      {aligner && <AlignerBourse fermer={() => setAligner(false)} apres={() => liste.recharger()} />}
      {datesSortie && <DatesSortie population={population} fermer={() => setDatesSortie(false)} apres={() => liste.recharger()} />}
      {alignerCom && <AlignerCommunautaires fermer={() => setAlignerCom(false)} apres={() => liste.recharger()} />}
    </div>
  );
}
