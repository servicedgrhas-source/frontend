"use client";

import { CheckCircle2, PencilLine, TriangleAlert, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CorrectionAnomalies, CorrectionCyclesGroupee } from "@/components/correction-anomalies";
import { AjoutManuel } from "@/components/ajout-manuel";
import { ChoixGrade } from "@/components/choix-grade";
import { SaisieReferentiel } from "@/components/saisie-referentiel";
import { FicheDossier } from "@/components/fiche-dossier";
import { GuideImports } from "@/components/guide-imports";
import { useSession } from "@/components/session";
import { Aide, Alerte, Annonce, Badge, Bouton, BoutonIcone, Carte, Champ, Chargement, EnTete, Liste, Modale, Pastille, Saisie, Tableau, Vide, ZoneFichier } from "@/components/ui";
import { api, qs, useApi } from "@/lib/api";
import { dateCourte, libelleAnomalie, libelleLot, peut } from "@/lib/libelles";
import type { Agent } from "@/lib/types";
import { useParametreUrl } from "@/lib/url";

interface Page {
  total: number;
  page: number;
  taille: number;
  items: Agent[];
}

interface Rapport {
  feuilles: { nom: string; lignes: number }[];
  lignesLues: number;
  crees: number;
  misAJour: number;
  /** Lignes d'une personne déjà lue dans une autre feuille, réunies en une fiche. */
  fusionnees: number;
  /** Doutes cochés « même personne » : fiches mises à jour au lieu d'en créer. */
  memesConfirmees: number;
  /** Fiches déjà enregistrées dont le fichier a rempli des cases vides. */
  fichesCompletees: number;
  champsCompletes: Record<string, number>;
  affectationsCreees: number;
  lots: { numero: number; libelle: string; agents: number; meppsa: number; autresAvec: number; autresSans: number }[];
  anomalies: Record<string, number>;
  doublons: number;
  anciennesFichesEcartees: number;
}

/** Ce que contient le classeur, avant l'import (aucun nom). */
interface ApercuClasseur {
  personnes: number;
  feuilles: {
    nom: string;
    lignes: number;
    groupe: "MEPPSA" | "AUTRES";
    avecDepartement: number;
    /** Personnes déjà vues dans une feuille précédente (elles seront réunies). */
    dejaVues: number;
    sansLot: number;
    lots: { libelle: string; n: number }[];
    /** Déjà dans la base : mises à jour (une case vide n'efface rien). */
    retrouvees: number;
    nouvelles: number;
    /** Ressemblent à une fiche sans certitude : à trancher ici. */
    doutes: number;
  }[];
  doutes: Doute[];
}

/** Ligne du fichier qui ressemble à une fiche existante, sans certitude. */
interface Doute {
  cle: string;
  feuille: string;
  ligne: number;
  nomComplet: string;
  dateNaissance: string | null;
  diplome: string | null;
  departement: string | null;
  texte: string | null;
  candidats: {
    id: string;
    nomComplet: string;
    dateNaissance: string | null;
    liste: string;
    diplome: string | null;
    departement: string | null;
    texte: string | null;
    lot: string | null;
  }[];
}

export default function Recrutement() {
  const { profil, refs } = useSession();
  const anomaliesUrl = useParametreUrl("anomalies");
  const [recherche, setRecherche] = useState("");
  const [saisie, setSaisie] = useState("");
  const [texte, setTexte] = useState("");
  const [feuille, setFeuille] = useState("");
  const [anomaliesChoisi, setAnomalies] = useState<boolean | null>(null);
  const anomalies = anomaliesChoisi ?? anomaliesUrl === "1";
  const [page, setPage] = useState(1);
  const [edition, setEdition] = useState<Agent | null>(null);
  const [correction, setCorrection] = useState<Agent | null>(null);
  // Fiche complète de la personne (identité, recrutement, texte, affectation, notes, pièces…)
  const [ficheOuverte, setFicheOuverte] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const resumeAnomalies = useApi<{ anomalie: string; n: number }[]>("/agents/anomalies");
  const cyclesAVerifier = resumeAnomalies.donnees?.find((x) => x.anomalie === "Cycle de la base différent de celui du diplôme")?.n ?? 0;

  const { donnees, erreur, chargement, recharger } = useApi<Page>(
    anomaliesUrl === undefined ? null : `/agents${qs({ recherche, texte, feuille, anomalies, page, taille: 50 })}`,
  );
  const stats = useApi<{ total: number; textesRecus: number; enAttente: number; avecAnomalies: number; quotaAutres: number }>("/agents/statistiques");

  useEffect(() => {
    const t = setTimeout(() => {
      setRecherche(saisie);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [saisie]);

  return (
    <div className="space-y-4">
      <EnTete
        actions={
          peut.controler(profil.role) || peut.importerBase(profil.role) ? (
            <div className="flex flex-wrap gap-2">
              {/* Ajout sans fichier Excel, mêmes contrôles que l'import (DG, 31/10/2026) */}
              {peut.importerBase(profil.role) && (
                <AjoutManuel
                  apres={(t) => {
                    setMessage(t);
                    recharger();
                    stats.recharger();
                    resumeAnomalies.recharger();
                  }}
                />
              )}
              {peut.controler(profil.role) && (
                <Bouton
                  onClick={() =>
                    api
                      .telecharger("/recrutes/export", peut.voirBudget(profil.role) ? "Base des recrutes - DGRHAS.xlsx" : "Base des recrutes - sans incidence.xlsx")
                      .catch(() => undefined)
                  }
                >
                  Exporter la base (Excel)
                  <Aide>
                    {peut.voirBudget(profil.role)
                      ? "Toute la base : commission, retour FP, incidence financière (salaires, total) et informations internes DGRHAS (origine, observations)."
                      : "Toute la base : commission et retour FP. Sans l’incidence financière ni les informations internes DGRHAS, réservées au DG."}
                  </Aide>
                </Bouton>
              )}
            </div>
          ) : undefined
        }
        titre="Base des recrutés"
        sousTitre="Liste générale des candidats retenus (commission) et retour de la Fonction Publique (textes reçus)."
      />
      {peut.importerBase(profil.role) ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="xl:col-span-2">
            <GuideImports ici="base" />
          </div>
          {(["MEPPSA", "AUTRES"] as const).map((g) => (
            <ImportBase
              key={g}
              groupe={g}
              apres={() => {
                recharger();
                stats.recharger();
              }}
            />
          ))}
        </div>
      ) : (
        peut.traiter(profil.role) && (
          <p className="text-[12px] text-zinc-400">
            L’import de la fiche de suivi (entrée directe, sans le circuit) est réservé au chef de service et au DG.
          </p>
        )
      )}

      {stats.donnees && (
        <div className="flex flex-wrap gap-2 text-sm">
          <Badge>{stats.donnees.total} recrutés</Badge>
          <Badge ton="vert">{stats.donnees.textesRecus} textes reçus (pointés)</Badge>
          <Badge ton="jaune">{stats.donnees.enAttente} en attente du texte</Badge>
          <Badge ton="rouge">{stats.donnees.avecAnomalies} avec anomalies</Badge>
          <Badge ton="bleu">{stats.donnees.quotaAutres} quota « Autres »</Badge>
        </div>
      )}

      <Annonce fermer={() => setMessage(null)}>{message}</Annonce>
      {peut.traiter(profil.role) && (
        <CorrectionCyclesGroupee
          nombre={cyclesAVerifier}
          apres={(t) => {
            setMessage(t);
            recharger();
            stats.recharger();
            resumeAnomalies.recharger();
          }}
        />
      )}

      <Carte>
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <Champ libelle="Recherche (nom ou n° de texte)" className="w-72">
            <Saisie value={saisie} onChange={(e) => setSaisie(e.target.value)} placeholder="Ex. MOUANDA ou 6758" />
          </Champ>
          <Champ libelle="Texte de la FP">
            <Liste
              value={texte}
              onChange={(e) => {
                setTexte(e.target.value);
                setPage(1);
              }}
              vide="Tous"
              options={[
                { valeur: "recu", libelle: "Reçu (pointé)" },
                { valeur: "attente", libelle: "En attente" },
              ]}
            />
          </Champ>
          <Champ libelle="Liste">
            <Liste
              value={feuille}
              onChange={(e) => {
                setFeuille(e.target.value);
                setPage(1);
              }}
              vide="Toutes"
              options={[
                { valeur: "MEPPSA", libelle: "Liste MEPPSA" },
                { valeur: "QUOTA_AUTRES", libelle: "Quota Autres" },
              ]}
            />
          </Champ>
          <label className="flex items-center gap-2 pb-1.5 text-sm">
            <input
              type="checkbox"
              checked={anomalies}
              onChange={(e) => {
                setAnomalies(e.target.checked);
                setPage(1);
              }}
            />
            Uniquement avec anomalies
          </label>
        </div>

        {erreur && <Alerte>{erreur}</Alerte>}
        {!donnees && chargement && <Chargement />}
        {donnees && (
          <>
            <Tableau>
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Diplôme · grade · département</th>
                  <th>Liste</th>
                  <th>Texte de la FP</th>
                  <th>Statut</th>
                  <th className="w-20" />
                </tr>
              </thead>
              <tbody>
                {donnees.items.map((a) => (
                  <tr key={a.id}>
                    <td className="min-w-60">
                      <div className="flex items-center gap-3">
                        <Pastille ton={a.anomalies.length ? "rouge" : a.lotPublication ? "vert" : "gris"} taille="sm">
                          {a.anomalies.length ? <TriangleAlert /> : a.lotPublication ? <CheckCircle2 /> : <UserRound />}
                        </Pastille>
                        <div className="min-w-0">
                          {peut.traiter(profil.role) ? (
                            <button
                              type="button"
                              onClick={() => setFicheOuverte(a.id)}
                              title="Voir toute la fiche"
                              className="cursor-pointer text-left font-medium leading-snug hover:text-marque-700 hover:underline"
                            >
                              {a.nomComplet}
                            </button>
                          ) : (
                            <div className="font-medium leading-snug">{a.nomComplet}</div>
                          )}
                          <div className="text-[11px] text-zinc-400">
                            {a.dateNaissance ? (
                              <>
                                Né(e) le {dateCourte(a.dateNaissance)}
                                {a.age !== null && a.age !== undefined && ` · ${a.age} ans`}
                              </>
                            ) : (
                              <span className="text-rouge-600">Naissance : {a.dateNaissanceBrute ?? "absente"}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {/* Diplôme retenu (règle) et grade, à jour après une correction (DG, 31/10/2026) ;
                          l'écriture du fichier Excel rappelée quand elle diffère */}
                      {(() => {
                        const r = refs.regles.find((x) => x.code === a.diplomeCode);
                        const g = a.gradeChoisi?.abreviation ?? r?.grade ?? null;
                        const affiche = g && a.contractuel ? `${g.replace(/\.+$/, "")}.C.` : g;
                        return (
                          <>
                            <div>
                              {r?.libelle ?? <span className="text-rouge-600">{a.diplomeBrut ?? "—"} (non reconnu)</span>}
                              {affiche && (
                                <span className="ml-1.5 text-[12px] text-zinc-500">
                                  · {affiche}
                                  {a.gradeChoisi && <span title={`Grade choisi par ${a.gradeChoisi.par}`}> (choisi)</span>}
                                </span>
                              )}
                            </div>
                            {r && a.diplomeBrut && r.libelle.toLowerCase() !== a.diplomeBrut.toLowerCase() && (
                              <div className="text-[11px] text-zinc-400">Dans le fichier : « {a.diplomeBrut} »</div>
                            )}
                          </>
                        );
                      })()}
                      <div className="text-[11px] text-zinc-400">
                        {a.departement?.nom ?? (a.feuille === "QUOTA_AUTRES" ? (
                          <span className="text-or-700" title="Quota « Autres » : le département se donne par la répartition (Pilotage → Répartition du quota « Autres »)">
                            Département à répartir (quota « Autres »)
                          </span>
                        ) : (
                          <span className="text-rouge-600" title="Département d’affectation : il doit être l’un des 15 départements scolaires">
                            {a.departementBrut ? `Département « ${a.departementBrut} » non reconnu` : "Département d’affectation vide dans le fichier"}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="text-xs whitespace-nowrap text-zinc-500">
                      {a.feuille === "QUOTA_AUTRES" ? "Quota Autres" : `Quota ${a.quota ?? ""} · ${a.lotCommission ?? ""}`}
                    </td>
                    <td className="text-xs whitespace-nowrap">
                      {a.lotPublication ? (
                        <div className="flex items-center gap-2">
                          <Badge ton="vert">{libelleLot(a.lotPublication)}</Badge>
                          <span className="text-zinc-600">
                            {a.typeTexte === "DECRET" ? "Décret" : "Arrêté"} {a.reference ?? a.numeroTexte}
                          </span>
                        </div>
                      ) : (
                        <Badge ton="jaune">En attente du texte</Badge>
                      )}
                    </td>
                    <td className="max-w-64 text-[11px]">
                      {a.contractuel === true && <Badge ton="bleu" titre={a.contractuelForce !== null ? "Imposé par l’arrêté" : "Calculé par l’âge"}>Contractuel</Badge>}
                      {a.contractuel === false && <Badge>Fonctionnaire</Badge>}
                      {a.contractuel === null && <Badge ton="rouge">À préciser</Badge>}
                      {a.anomalies.length > 0 && (
                        <button
                          type="button"
                          disabled={!peut.traiter(profil.role)}
                          onClick={() => setCorrection(a)}
                          className="mt-1 block text-left text-rouge-600 enabled:hover:underline"
                          title={a.anomalies.map((x) => libelleAnomalie(x, a).titre).join("\n")}
                        >
                          {libelleAnomalie(a.anomalies[0], a).titre}
                          {a.anomalies.length > 1 && ` (+${a.anomalies.length - 1})`}
                        </button>
                      )}
                    </td>
                    <td className="text-right">
                      {peut.traiter(profil.role) && (
                        <div className="flex justify-end gap-1">
                          {a.anomalies.length > 0 && (
                            <BoutonIcone libelle="Corriger l’anomalie" ton="rouge" onClick={() => setCorrection(a)} className="text-rouge-600!">
                              <TriangleAlert />
                            </BoutonIcone>
                          )}
                          <BoutonIcone libelle="Corriger la fiche" onClick={() => setEdition(a)}>
                            <PencilLine />
                          </BoutonIcone>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Tableau>
            {!donnees.items.length && <Vide>Aucun résultat.</Vide>}
            <div className="mt-4 flex items-center justify-between text-xs text-zinc-400">
              <span>
                {donnees.total} fiche(s) — page {donnees.page} / {Math.max(1, Math.ceil(donnees.total / donnees.taille))}
              </span>
              <div className="flex gap-2">
                <Bouton disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Précédent
                </Bouton>
                <Bouton disabled={page * donnees.taille >= donnees.total} onClick={() => setPage((p) => p + 1)}>
                  Suivant
                </Bouton>
              </div>
            </div>
          </>
        )}
      </Carte>

      {ficheOuverte && <FicheDossier id={ficheOuverte} fermer={() => setFicheOuverte(null)} />}
      {correction && (
        <CorrectionAnomalies
          agent={correction}
          fermer={() => setCorrection(null)}
          apres={(t) => {
            setCorrection(null);
            setMessage(t);
            recharger();
            stats.recharger();
            resumeAnomalies.recharger();
          }}
        />
      )}
      {edition && (
        <EditionAgent
          agent={edition}
          fermer={() => setEdition(null)}
          apres={() => {
            setEdition(null);
            recharger();
            stats.recharger();
          }}
        />
      )}
    </div>
  );
}

/**
 * Les en-têtes que l'import reconnaît (DG, 31/10/2026). Majuscules, accents, espaces et ponctuation
 * ne comptent pas (« Date de nais. » = « DATE DE NAISSANCE ») ; seul le début du mot compte.
 */
const COLONNES: [string, string, string][] = [
  ["Noms et prénoms", "obligatoire", "Clé de la personne avec la date de naissance"],
  ["Date de nais.", "conseillée", "jj/mm/aaaa ou date Excel"],
  ["Lieu de nais.", "", ""],
  ["Diplôme", "obligatoire", "CFEEN, BET, BAC, Licence, Master… (donne le grade et la note)"],
  ["Département", "", "Brazzaville, Cuvette, Pointe-Noire… (« Cuvette (Makoua) » est lu Cuvette)"],
  ["Source", "", "Écrit tel quel sur la fiche (« FP », nom d’école…)"],
  ["Cycle", "", "Préscolaire, Primaire, Collège, Lycée, Administration"],
  ["Spécialité", "", "Au primaire et au préscolaire : le cycle (donné tout seul s’il manque)"],
  ["Qualification", "", "Écrite telle quelle sur la fiche"],
  ["Quota", "MEPPSA", "Année : 2024, 2025…"],
  ["N° d’ordre", "MEPPSA", ""],
  ["N°/ Liste", "", ""],
  ["Lot", "", "Lot de la commission (Lot 1, L2…)"],
  ["Statut", "", "Volontaire, Communautaire, Autres"],
  ["Transmission", "", "1ère, 2ème… transmission"],
  ["N° Para-pheur", "", ""],
  ["Lieu de service", "", ""],
  ["Origine", "", ""],
  ["Type de texte", "", "Arrêté ou Décret (avec ou sans accent)"],
  ["N° Texte", "", ""],
  ["Date de réception", "", ""],
  ["Date de signature", "", "Sinon : date de signature du lot, saisie à l’écran"],
  ["Lot de publicat°", "conseillée", "En chiffres romains (VIII) ou en chiffres (8) : range la personne dans son lot"],
  ["OBS", "", "Observation"],
];

function ColonnesReconnues() {
  return (
    <details className="mb-4 rounded-2xl border border-zinc-200 px-4 py-2.5 text-[12px] text-zinc-600 open:pb-3">
      <summary className="cursor-pointer font-medium text-encre">Comment nommer les colonnes du fichier Excel</summary>
      <p className="mt-2 leading-relaxed">
        L’en-tête peut être sur n’importe quelle ligne du haut de la feuille. Majuscules, accents, espaces et points ne comptent pas : « Date de nais. »,
        « DATE DE NAISSANCE » et « date de naissance » sont la même colonne. Une colonne en plus est ignorée ; une colonne absente laisse la case telle
        qu’elle est. <strong>Une case vide n’efface jamais</strong> ce qui est déjà enregistré : elle est complétée si le fichier la remplit.
      </p>
      <table className="mt-2 w-full text-left">
        <thead className="text-[11px] text-zinc-400 uppercase">
          <tr>
            <th className="py-1 pr-3 font-medium">En-tête à écrire</th>
            <th className="py-1 pr-3 font-medium" />
            <th className="py-1 font-medium">Contenu</th>
          </tr>
        </thead>
        <tbody>
          {COLONNES.map(([c, o, d]) => (
            <tr key={c} className="border-t border-zinc-100">
              <td className="py-1 pr-3 font-medium whitespace-nowrap text-encre">{c}</td>
              <td className="py-1 pr-3 whitespace-nowrap">{o && <Badge ton={o === "obligatoire" ? "rouge" : "bleu"}>{o}</Badge>}</td>
              <td className="py-1">{d}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

/**
 * Import de la base d'affectation, un bloc par quota (DG, 30/10/2026) : le bloc dit si les personnes
 * sont du quota MEPPSA ou du quota « Autres » (avec ou sans département). On choisit les feuilles ;
 * une personne présente dans plusieurs feuilles n'a qu'une fiche ; chacune est rangée dans le lot de
 * publication écrit dans le fichier (« Arrêtés — lot VIII »).
 */
function ImportBase({ groupe, apres }: { groupe: "MEPPSA" | "AUTRES"; apres: () => void }) {
  const [envoi, setEnvoi] = useState(false);
  const [rapport, setRapport] = useState<Rapport | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  // Fichier lu, en attente du choix des feuilles et de la confirmation « ATTENTION »
  const [enAttente, setEnAttente] = useState<{ fichier: File; apercu: ApercuClasseur } | null>(null);
  const [feuilles, setFeuilles] = useState<string[]>([]);
  // Doutes tranchés : « feuille|ligne » → fiche existante à mettre à jour (absent : nouvelle personne)
  const [memes, setMemes] = useState<Record<string, string>>({});
  const autres = groupe === "AUTRES";
  const nomBloc = autres ? "Quota « Autres »" : "Quota MEPPSA";

  async function lire(f: File) {
    const fd = new FormData();
    fd.append("fichier", f);
    fd.append("groupe", groupe);
    setEnvoi(true);
    setErreur(null);
    setRapport(null);
    try {
      const a = await api.post<ApercuClasseur>("/import/base/apercu", fd);
      setEnAttente({ fichier: f, apercu: a });
      setMemes({});
      // Feuilles cochées d'office : celles qui ressemblent à ce bloc (« QA… », « Quota Autres » ; sinon MEPPSA)
      setFeuilles(a.feuilles.filter((x) => x.groupe === groupe).map((x) => x.nom));
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  }

  async function envoyer() {
    if (!enAttente) return;
    const fd = new FormData();
    fd.append("fichier", enAttente.fichier);
    fd.append("groupe", groupe);
    fd.append("feuilles", JSON.stringify(feuilles));
    fd.append("memes", JSON.stringify(Object.fromEntries(Object.entries(memes).filter(([k]) => feuilles.includes(k.slice(0, k.lastIndexOf("|")))))));
    setEnAttente(null);
    setEnvoi(true);
    setErreur(null);
    try {
      setRapport(await api.post<Rapport>("/import/base", fd));
      apres();
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  }

  const choisies = enAttente?.apercu.feuilles.filter((f) => feuilles.includes(f.nom)) ?? [];
  const doutes = (enAttente?.apercu.doutes ?? []).filter((d) => feuilles.includes(d.feuille));
  const nbMemes = doutes.filter((d) => memes[d.cle]).length;
  const autreBloc = choisies.filter((f) => f.groupe !== groupe);

  return (
    <Carte titre={`Importer la base : ${nomBloc}`}>
      <p className="mb-4 text-[13px] leading-relaxed text-zinc-500">
        {autres ? (
          <>
            Les feuilles du <strong>quota « Autres »</strong>, <strong>avec ou sans département</strong> (ex. « QA arrêtés avec département », « QA arrêtés sans
            département », « QA décrets Licence-Master »). Une personne présente dans plusieurs feuilles n’a qu’une fiche, qui garde son département.
          </>
        ) : (
          <>
            Les feuilles du <strong>quota MEPPSA</strong> (ex. « Cumul Lot 8 »). Si une ligne a « MEPPSA » dans la colonne Département, le département écrit
            sous Source est repris.
          </>
        )}{" "}
        Chaque personne est rangée dans son <strong>lot de publication</strong> (colonne « Lot de publicat° », en chiffres romains), les arrêtés et les décrets
        à part. Les personnes déjà enregistrées sont reconnues : rien n’est dupliqué, vos corrections sont gardées.
      </p>
      <ColonnesReconnues />
      <ZoneFichier accept=".xlsx" envoi={envoi} envoyer={lire} aide={`Base d’affectation (.xlsx) — ${nomBloc}`} />
      <Modale titre={`ATTENTION : entrée directe dans la base — ${nomBloc}`} ouverte={!!enAttente} fermer={() => setEnAttente(null)} large>
        {enAttente && (
          <div className="space-y-4 text-[13px] leading-relaxed text-zinc-600">
            <p>
              Fichier « {enAttente.fichier.name} ». Cochez les feuilles du <strong>{nomBloc}</strong> à importer :
            </p>
            <div className="space-y-2">
              {enAttente.apercu.feuilles.map((f) => {
                const coche = feuilles.includes(f.nom);
                return (
                  <label
                    key={f.nom}
                    className={`flex cursor-pointer gap-3 rounded-2xl border px-3 py-2.5 ${coche ? "border-marque-500 bg-marque-50" : "border-zinc-200"}`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={coche}
                      onChange={() => setFeuilles(coche ? feuilles.filter((x) => x !== f.nom) : [...feuilles, f.nom])}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="font-semibold text-encre">{f.nom}</span>{" "}
                      <span className="text-zinc-400">
                        · {f.lignes} ligne(s) · {f.avecDepartement} avec département
                        {f.dejaVues ? ` · ${f.dejaVues} déjà dans une feuille précédente (réunies)` : ""}
                      </span>
                      <span className="mt-1 flex flex-wrap gap-1">
                        <Badge ton="vert">{f.retrouvees} déjà dans la base : mises à jour</Badge>
                        <Badge ton="bleu">{f.nouvelles} nouvelle(s)</Badge>
                        {f.doutes > 0 && <Badge ton="jaune">{f.doutes} doute(s) à trancher ci-dessous</Badge>}
                      </span>
                      <span className="mt-1 flex flex-wrap gap-1">
                        {f.lots.map((l) => (
                          <Badge key={l.libelle}>
                            {l.libelle} : {l.n}
                          </Badge>
                        ))}
                        {f.sansLot > 0 && <Badge ton="jaune">Sans lot de publication : {f.sansLot}</Badge>}
                        {f.groupe !== groupe && <Badge ton="jaune">Semble être du {f.groupe === "AUTRES" ? "quota « Autres »" : "quota MEPPSA"}</Badge>}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
            {autreBloc.length > 0 && (
              <Alerte ton="jaune">
                {autreBloc.map((f) => `« ${f.nom} »`).join(", ")} semble{autreBloc.length > 1 ? "nt" : ""} appartenir à l’autre bloc. Importées ici, ces
                personnes seront enregistrées au <strong>{nomBloc}</strong>.
              </Alerte>
            )}
            {doutes.length > 0 && (
              <div className="space-y-2 rounded-2xl border border-or-400/60 bg-or-100/30 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-encre">
                    {doutes.length} personne(s) ressemblent à une fiche déjà enregistrée
                  </strong>
                  <span className="text-[12px] text-zinc-500">
                    (nom proche, ou même nom avec une autre date). Cochée : la fiche existante est mise à jour (rien n’est effacé, ce qui manque est
                    ajouté). Non cochée : une nouvelle fiche est créée.
                  </span>
                  <div className="ml-auto flex gap-2">
                    <Bouton variante="secondaire" onClick={() => setMemes(Object.fromEntries(doutes.map((d) => [d.cle, d.candidats[0].id])))}>
                      Tout cocher : même personne
                    </Bouton>
                    <Bouton variante="discret" onClick={() => setMemes({})}>
                      Tout décocher
                    </Bouton>
                  </div>
                </div>
                <div className="max-h-80 space-y-1.5 overflow-auto">
                  {doutes.map((d) => (
                    <div key={d.cle} className="rounded-xl bg-white px-3 py-2 text-[12px] ring-1 ring-zinc-200">
                      <div className="text-encre">
                        <strong>{d.nomComplet}</strong>
                        <span className="text-zinc-500">
                          {" "}
                          · {d.dateNaissance ? `né(e) le ${dateCourte(d.dateNaissance)}` : "date inconnue"}
                          {d.diplome ? ` · ${d.diplome}` : ""}
                          {d.departement ? ` · ${d.departement}` : ""}
                          {d.texte ? ` · texte ${d.texte}` : ""} · {d.feuille}, ligne {d.ligne}
                        </span>
                      </div>
                      {d.candidats.map((c) => (
                        <label key={c.id} className="mt-1 flex cursor-pointer items-start gap-2 pl-2">
                          <input
                            type="checkbox"
                            className="mt-0.5"
                            checked={memes[d.cle] === c.id}
                            onChange={(e) => {
                              const n = { ...memes };
                              if (e.target.checked) n[d.cle] = c.id;
                              else delete n[d.cle];
                              setMemes(n);
                            }}
                          />
                          <span>
                            Même personne que <strong>{c.nomComplet}</strong>
                            <span className="text-zinc-500">
                              {" "}
                              · {c.dateNaissance ? `né(e) le ${dateCourte(c.dateNaissance)}` : "date inconnue"} · {c.liste}
                              {c.diplome ? ` · ${c.diplome}` : ""}
                              {c.departement ? ` · ${c.departement}` : ""}
                              {c.lot ? ` · ${c.lot}` : ""}
                              {c.texte ? ` · texte ${c.texte}` : ""}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
                <p className="text-[12px] text-zinc-600">
                  {nbMemes} cochée(s) : mises à jour · {doutes.length - nbMemes} non cochée(s) : nouvelles fiches
                </p>
              </div>
            )}
            <ul className="list-disc space-y-1 pl-5">
              <li>
                entrée <strong>directe</strong> dans la base des recrutés : <strong>sans</strong> contrôle, <strong>sans</strong> validation du DG et{" "}
                <strong>sans</strong> envoi à la FP dans le système ;
              </li>
              <li>la base du personnel n’est pas touchée : les affectés n’y entrent que lorsque vous les déportez, après la signature de leur note ;</li>
              <li>l’import est noté dans le journal, avec votre nom.</li>
            </ul>
            <div className="flex justify-end gap-2">
              <Bouton onClick={() => setEnAttente(null)}>Annuler</Bouton>
              <Bouton variante="danger" disabled={envoi || !feuilles.length} onClick={envoyer}>
                Je comprends : importer {choisies.reduce((n, f) => n + f.lignes, 0)} ligne(s)
              </Bouton>
            </div>
          </div>
        )}
      </Modale>
      <Annonce ton="rouge" fermer={() => setErreur(null)}>
        {erreur}
      </Annonce>
      <Annonce fermer={() => setRapport(null)}>
        {rapport && (
          <div className="space-y-3 text-left">
            <p className="text-center">
              {rapport.lignesLues} lignes lues ({rapport.feuilles.map((f) => `${f.nom} : ${f.lignes}`).join(", ")}) — {rapport.crees} nouvelle(s) fiche(s),{" "}
              {rapport.misAJour} mise(s) à jour
              {rapport.fusionnees ? `, ${rapport.fusionnees} ligne(s) d’une personne déjà lue dans une autre feuille (réunies)` : ""},{" "}
              {rapport.affectationsCreees} nouvelle(s) personne(s) à affecter.
            </p>
            {rapport.lots.length > 0 && (
              <Tableau>
                <thead>
                  <tr>
                    <th>Lot</th>
                    <th className="text-right">Personnes</th>
                    <th className="text-right">MEPPSA</th>
                    <th className="text-right">Autres avec dép.</th>
                    <th className="text-right">Autres sans dép.</th>
                  </tr>
                </thead>
                <tbody>
                  {rapport.lots.map((l) => (
                    <tr key={l.numero}>
                      <td>
                        <Link href={`/affectations?lot=${l.numero}`} className="font-medium text-marque-700 underline">
                          {l.libelle}
                        </Link>
                      </td>
                      <td className="text-right tabular-nums">{l.agents}</td>
                      <td className="text-right tabular-nums">{l.meppsa}</td>
                      <td className="text-right tabular-nums">{l.autresAvec}</td>
                      <td className="text-right tabular-nums">{l.autresSans}</td>
                    </tr>
                  ))}
                </tbody>
              </Tableau>
            )}
            {rapport.memesConfirmees > 0 && (
              <p className="text-center text-[12px] text-zinc-600">
                {rapport.memesConfirmees} ligne(s) reconnue(s) comme la même personne qu’une fiche existante : fiche mise à jour, aucun doublon créé.
              </p>
            )}
            {rapport.fichesCompletees > 0 && (
              <p className="text-center text-[12px] text-zinc-600">
                <strong>{rapport.fichesCompletees} fiche(s) déjà enregistrée(s) complétée(s)</strong> par le fichier :{" "}
                {Object.entries(rapport.champsCompletes)
                  .map(([k, n]) => `${k} (${n})`)
                  .join(", ")}
                . Une case vide du fichier n’efface jamais ce qui est déjà enregistré.
              </p>
            )}
            {rapport.anciennesFichesEcartees > 0 && (
              <p className="text-center text-[12px] text-zinc-500">
                {rapport.anciennesFichesEcartees} ancienne(s) fiche(s) en double (même nom, même texte, sans date de naissance) écartée(s) : la personne est suivie
                sur sa fiche complète.
              </p>
            )}
            <div className="flex flex-wrap justify-center gap-1.5">
              {Object.entries(rapport.anomalies)
                // Le quota « Autres » arrive souvent sans département : ce n'est pas une erreur du fichier
                .filter(([k]) => !(autres && k === "Département absent"))
                .map(([k, v]) => (
                  <Badge key={k} ton="jaune" titre={libelleAnomalie(k).detail || undefined}>
                    {libelleAnomalie(k).titre}
                    {/* Comparaison de toute la base, pas seulement du fichier */}
                    {k === "Ressemble à une autre fiche" || k === "N° de texte partagé" ? " (dans toute la base)" : ""} : {v}
                  </Badge>
                ))}
            </div>
          </div>
        )}
      </Annonce>
    </Carte>
  );
}

function EditionAgent({ agent, fermer, apres }: { agent: Agent; fermer: () => void; apres: () => void }) {
  const { refs } = useSession();
  // Informations de la fiche (DG, 31/10/2026) : nom, lieu de naissance, spécialité, qualification…
  const TEXTES = ["nomComplet", "lieuNaissance", "specialite", "qualification", "cycleBrut", "statut", "source", "observation"] as const;
  const [infos, setInfos] = useState(Object.fromEntries(TEXTES.map((k) => [k, agent[k] ?? ""])) as Record<(typeof TEXTES)[number], string>);
  const [f, setF] = useState({
    dateNaissance: agent.dateNaissance ?? "",
    departementId: agent.departementId ? String(agent.departementId) : "",
    diplomeCode: agent.diplomeCode ?? "",
    numeroTexte: agent.numeroTexte ?? "",
    dateSignatureTexte: agent.dateSignatureTexte ?? "",
    contractuel: agent.contractuelForce === null ? "" : agent.contractuelForce ? "1" : "0",
    gradeCode: agent.gradeChoisi?.code ?? "",
  });
  const [erreur, setErreur] = useState<string | null>(null);

  async function enregistrer() {
    const corps: Record<string, unknown> = {};
    if (f.dateNaissance && f.dateNaissance !== agent.dateNaissance) corps.dateNaissance = f.dateNaissance;
    if (f.departementId && Number(f.departementId) !== agent.departementId) corps.departementId = Number(f.departementId);
    if (f.diplomeCode && f.diplomeCode !== agent.diplomeCode) corps.diplomeCode = f.diplomeCode;
    if (f.numeroTexte && f.numeroTexte !== agent.numeroTexte) corps.numeroTexte = f.numeroTexte;
    if ((f.dateSignatureTexte || null) !== agent.dateSignatureTexte) corps.dateSignatureTexte = f.dateSignatureTexte || null;
    const c = f.contractuel === "" ? null : f.contractuel === "1";
    if (c !== agent.contractuelForce) corps.contractuelForce = c;
    if (f.gradeCode !== (agent.gradeChoisi?.code ?? "")) corps.gradeCode = f.gradeCode || null;
    for (const k of TEXTES) if (infos[k].trim() !== (agent[k] ?? "")) corps[k] = infos[k].trim() || null;
    if (!Object.keys(corps).length) return fermer();
    try {
      await api.patch(`/agents/${agent.id}`, corps);
      apres();
    } catch (e) {
      setErreur((e as Error).message);
    }
  }

  return (
    <Modale titre={`Corriger la fiche – ${agent.nomComplet}`} ouverte fermer={fermer} large>
      <div className="grid grid-cols-2 gap-3">
        {erreur && <div className="col-span-2"><Alerte>{erreur}</Alerte></div>}
        <Champ libelle="Noms et prénoms" className="col-span-2">
          <Saisie value={infos.nomComplet} onChange={(e) => setInfos({ ...infos, nomComplet: e.target.value })} />
        </Champ>
        <Champ libelle="Lieu de naissance">
          <Saisie value={infos.lieuNaissance} onChange={(e) => setInfos({ ...infos, lieuNaissance: e.target.value })} />
        </Champ>
        <Champ libelle="Spécialité" aide="Imprimée sur la note (collège, lycée : la matière enseignée)">
          <SaisieReferentiel liste="MATIERE" valeur={infos.specialite} changer={(v) => setInfos({ ...infos, specialite: v })} />
        </Champ>
        <Champ libelle="Qualification" aide="Sur la fiche, pas sur la note">
          <Saisie value={infos.qualification} onChange={(e) => setInfos({ ...infos, qualification: e.target.value })} />
        </Champ>
        <Champ libelle="Cycle (comme dans la base)" aide="La note suit la règle du diplôme ; un cycle différent est signalé">
          <Liste
            value={infos.cycleBrut}
            onChange={(e) => setInfos({ ...infos, cycleBrut: e.target.value })}
            vide="—"
            options={["Préscolaire", "Primaire", "Collège", "Lycée", "Administration"].map((c) => ({ valeur: c, libelle: c }))}
          />
        </Champ>
        <Champ libelle="Statut">
          <Saisie value={infos.statut} onChange={(e) => setInfos({ ...infos, statut: e.target.value })} placeholder="Ex. Volontaire" />
        </Champ>
        <Champ libelle="Source">
          <Saisie value={infos.source} onChange={(e) => setInfos({ ...infos, source: e.target.value })} />
        </Champ>
        <Champ libelle="Date de naissance" aide={agent.dateNaissanceBrute ? `Dans le fichier : « ${agent.dateNaissanceBrute} »` : undefined}>
          <Saisie type="date" value={f.dateNaissance} onChange={(e) => setF({ ...f, dateNaissance: e.target.value })} />
        </Champ>
        <Champ libelle="Département" aide={agent.departementBrut ? `Dans le fichier : « ${agent.departementBrut} »` : undefined}>
          <Liste value={f.departementId} onChange={(e) => setF({ ...f, departementId: e.target.value })} vide="—" options={refs.departements.map((d) => ({ valeur: d.id, libelle: d.nom }))} />
        </Champ>
        <Champ libelle="Diplôme (règle appliquée)" aide={`Dans le fichier : « ${agent.diplomeBrut ?? "—"} »`}>
          {/* Autre diplôme : retour au grade par défaut du nouveau diplôme */}
          <Liste value={f.diplomeCode} onChange={(e) => setF({ ...f, diplomeCode: e.target.value, gradeCode: "" })} vide="—" options={refs.regles.map((r) => ({ valeur: r.code, libelle: `${r.libelle} → ${r.grade ?? (r.code === "SANS_DIPLOME" ? "grade à choisir" : "?")}` }))} />
        </Champ>
        <ChoixGrade diplomeCode={f.diplomeCode || null} valeur={f.gradeCode} changer={(gradeCode) => setF({ ...f, gradeCode })} />
        <Champ libelle="N° du texte">
          <Saisie value={f.numeroTexte} onChange={(e) => setF({ ...f, numeroTexte: e.target.value })} />
        </Champ>
        <Champ libelle="Date de signature du texte" aide="Laisser vide pour utiliser celle du lot">
          <Saisie type="date" value={f.dateSignatureTexte} onChange={(e) => setF({ ...f, dateSignatureTexte: e.target.value })} />
        </Champ>
        <Champ libelle="Statut selon l’arrêté" aide="Si l’arrêté contredit le calcul par l’âge">
          <Liste
            value={f.contractuel}
            onChange={(e) => setF({ ...f, contractuel: e.target.value })}
            options={[
              { valeur: "", libelle: "Calcul automatique (âge)" },
              { valeur: "1", libelle: "Contractuel" },
              { valeur: "0", libelle: "Fonctionnaire" },
            ]}
          />
        </Champ>
        <Champ libelle="Observation" className="col-span-2">
          <Saisie value={infos.observation} onChange={(e) => setInfos({ ...infos, observation: e.target.value })} />
        </Champ>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Bouton onClick={fermer}>Annuler</Bouton>
        <Bouton variante="principal" onClick={enregistrer}>
          Enregistrer
        </Bouton>
      </div>
    </Modale>
  );
}
