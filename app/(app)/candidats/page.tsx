"use client";

import { ArchiveRestore, BadgeCheck, CheckCircle2, ClipboardCheck, Download, FileUp, PencilLine, Scale, Send, Stamp, Trash2, TriangleAlert, Undo2, UserPlus } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { GuideImports } from "@/components/guide-imports";
import { EnvoiTransmission } from "@/components/envoi-transmission";
import { FicheDossier } from "@/components/fiche-dossier";
import { ChampOrigine } from "@/components/champ-origine";
import { QuotaBeneficiaire } from "@/components/quota-beneficiaire";
import { useSession } from "@/components/session";
import { Aide, Alerte, Annonce, Badge, Bouton, BoutonIcone, Carte, Champ, Chargement, EnTete, Jauge, Liste, Modale, Pastille, Saisie, Segments, Tableau, Vide, Zone, ZoneFichier } from "@/components/ui";
import { api, qs, useApi } from "@/lib/api";
import { dateCourte, libelleLot, peut } from "@/lib/libelles";
import type { Agent } from "@/lib/types";
import { SaisieReferentiel } from "@/components/saisie-referentiel";

const libelleTransmission = (n: number) => `${n === 1 ? "1ère" : `${n}ème`} transmission`;

type Fiche = Agent & {
  cycle: string | null;
  /** Statut prévu tant que le texte de la FP n’est pas signé. */
  provisoire?: boolean;
  grade: string | null;
  categorie: string | null;
  indice: number | null;
  salaireBrut: number | null;
  ageAuDepot: number | null;
  /** Fiche de la base du personnel choisie à la saisie. */
  agentRecenseId?: number | null;
  vagueNumero?: number | null;
  /** Rendu à la création : une vague récente passe avant des vagues plus anciennes. */
  avertissementVague?: string | null;
};

/** Personne de la base du personnel proposée à la commission. */
interface PersonneBase {
  id: number;
  numeroFiche: string;
  statut: string;
  nomComplet: string;
  dateNaissance: string | null;
  lieuNaissance: string | null;
  diplome: string | null;
  diplomeCode: string | null;
  departementId: number | null;
  lieuService: string | null;
  vague: number | null;
  registre: string | null;
  candidat: string | null;
  presentable: boolean;
}
const vagueLisible = (n: number | null | undefined) => (n ? `${n}${n === 1 ? "re" : "e"} vague` : n === 0 ? "avant la 1re vague" : "vague inconnue");
type Etat = "A_CONTROLER" | "CONTROLEE" | "VALIDEE" | "TRANSMISE" | "CONTENTIEUX";
type Compteurs = { aControler: number; controlees: number; validees: number; transmises: number; contentieux: number };

interface Doublon {
  id: string;
  nomComplet: string;
  dateNaissance: string | null;
  diplome: string | null;
  departement: string | null;
  feuille: string;
  lot: string | null;
  /** Personne d'une liste d'une année précédente (contrôle des doublons). */
  ancien?: { annee: number | null; source: string } | null;
  memeNaissance: boolean;
  niveau: "PROBABLE" | "POSSIBLE";
  /** Même date de naissance et nom très proche : confirmation demandée à l'enregistrement. */
  bloquant: boolean;
}

type NatureLot = "VOLONTAIRE" | "COMMUNAUTAIRE" | "MIXTE";
const NATURE_LOT: Record<NatureLot, string> = {
  VOLONTAIRE: "volontaires",
  COMMUNAUTAIRE: "communautaires",
  MIXTE: "mixte (volontaires et communautaires)",
};

interface EtatLots {
  taille: number;
  lots: { lot: string; nature: NatureLot; n: number; volontaires: number; communautaires: number; plein: boolean }[];
  conseille: { lot: string; nature: NatureLot };
  suivants: { separe: { lot: string; nature: NatureLot }; mixte: { lot: string; nature: NatureLot } };
}

/** Membre de la commission d'un quota, avec l'usage de ses places. */
interface MembreCommission {
  id: string;
  quota: number;
  nom: string;
  fonction: string | null;
  places: number;
  saisis: number;
  valides: number;
  envoyes: number;
  restantes: number;
  depasse: boolean;
}

/** Budget d'un quota (par an), vu par le DG au moment d'envoyer à la FP. */
interface BudgetQuota {
  libelle: string;
  enveloppe: number | null;
  engage: number;
  reste: number | null;
  etapes: { etape: "SAISIE" | "ENVOYEE" | "TEXTE_RECU"; libelle: string; effectif: number; annuel: number }[];
  pretes: { effectif: number; annuel: number };
}

const STATUTS = ["Communautaire", "Volontaire"];
const anneeCourante = new Date().getFullYear();
// De l'année après la prochaine (dossiers mis à part pour le quota suivant) jusqu'à 2015
const QUOTAS = Array.from({ length: anneeCourante + 3 - 2015 }, (_, i) => anneeCourante + 2 - i);
const nf = new Intl.NumberFormat("fr-FR");
const aujourdhui = () => new Date().toISOString().slice(0, 10);

/** Âge révolu à une date de référence (dates ISO). */
function ageA(naissance: string, reference: string) {
  const [an, mn, jn] = naissance.split("-").map(Number);
  const [ar, mr, jr] = reference.split("-").map(Number);
  return ar - an - (mr < mn || (mr === mn && jr < jn) ? 1 : 0);
}

function useParametres() {
  const params = useApi<{ cle: string; valeur: string }[]>("/parametres");
  const p = (cle: string, defaut: string) => params.donnees?.find((x) => x.cle === cle)?.valeur ?? defaut;
  return {
    // L'âge se compte jusqu'à la signature du texte de la FP : avant, c'est une prévision à ce jour
    reference: aujourdhui(),
    limite: Number(p("CONTRACTUEL_AGE_LIMITE", "30")),
    limiteCatI: Number(p("CONTRACTUEL_AGE_LIMITE_CAT_I", "35")),
    ageMin: Number(p("AGE_MINIMUM", "18")),
    ageMax: Number(p("AGE_MAXIMUM", "45")),
  };
}

export default function SaisieCandidats() {
  const { profil } = useSession();
  const [etat, setEtat] = useState<Etat>("A_CONTROLER");
  const [recherche, setRecherche] = useState("");
  const compteurs = useApi<Compteurs>("/candidats/compteurs");
  const liste = useApi<Fiche[]>(`/candidats${qs({ etat, recherche })}`);
  const [edition, setEdition] = useState<Fiche | null>(null);
  const [controle, setControle] = useState<Fiche | null>(null);
  const [suppression, setSuppression] = useState<Fiche | null>(null);
  const [renvoi, setRenvoi] = useState<Fiche | null>(null);
  const [toutValider, setToutValider] = useState(false);
  const [toutControler, setToutControler] = useState(false);
  // Fiche du dossier ouverte en cliquant sur un nom
  const [dossierOuvert, setDossierOuvert] = useState<string | null>(null);
  const [envoyer, setEnvoyer] = useState(false);
  // Envoi : une transmission par quota
  const transmissions = useApi<{ quotas: { quota: number; pretes: number; libelleProchaine: string }[] }>(envoyer ? "/transmissions" : null);
  const [misDeCote, setMisDeCote] = useState<Fiche | null>(null);
  // Budget dépassé : quota dont le DG choisit les dossiers à mettre à part
  const [report, setReport] = useState<number | null>(null);
  const [tour, setTour] = useState(0);
  const [motif, setMotif] = useState("");
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [message, setMessage] = useState<{ ton: "vert" | "rouge" | "jaune"; texte: string } | null>(null);
  const controleur = peut.controler(profil.role);
  const dg = peut.valider(profil.role);

  if (!peut.traiter(profil.role)) return <Alerte>Accès réservé aux agents de la DGRHAS.</Alerte>;

  const recharger = () => {
    liste.recharger();
    compteurs.recharger();
    setTour((t) => t + 1);
  };
  // Quotas présents dans « 3. Prêtes à envoyer » (un bandeau de budget par quota)
  const quotasPrets = etat === "VALIDEE" ? [...new Set((liste.donnees ?? []).map((f) => f.quota).filter((q): q is number => !!q))].sort() : [];
  const c = compteurs.donnees;
  const action = async (fn: () => Promise<unknown>, texte: string) => {
    try {
      await fn();
      setMessage({ ton: "vert", texte });
      recharger();
    } catch (e) {
      setMessage({ ton: "rouge", texte: (e as Error).message });
    }
  };
  // L'agent de saisie ne modifie plus une fiche contrôlée ; un contrôleur le peut
  const modifiable = (f: Fiche) => !f.lotPublication && (controleur || f.etatFiche === "A_CONTROLER");

  return (
    <div className="space-y-6">
      <EnTete
        titre="Saisie des candidats"
        sousTitre="Le chef de bureau enregistre chaque candidat retenu par la commission ; le chef de service, la DRSC ou le bureau d’études contrôle la fiche ; le DGRHAS la valide ; elle part alors à la Fonction Publique."
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Etape numero={1} titre="Saisir ou importer" texte="Le dossier en main, remplissez le formulaire, ou importez une liste Excel." icone={<UserPlus />} />
        <Etape numero={2} titre="Contrôler" texte={c ? `${c.aControler} fiche(s) à comparer avec le dossier papier.` : "…"} icone={<ClipboardCheck />} actif={!!c?.aControler} />
        <Etape numero={3} titre="Valider (DGRHAS)" texte={c ? `${c.controlees} fiche(s) contrôlée(s) attendent la validation.` : "…"} icone={<Stamp />} actif={!!c?.controlees} />
        <Etape numero={4} titre="Envoyer à la FP" texte={c ? `${c.validees} fiche(s) validée(s), prêtes à partir.` : "…"} icone={<Send />} lien="/transmission" actif={!!c?.validees} />
      </div>

      {c && c.contentieux > 0 && (
        <Alerte ton="jaune">
          <strong>{c.contentieux} dossier(s) en contentieux (âge)</strong> : ils dépassent l’âge maximum et attendent la décision du DG. Mettez les dossiers papier de côté.{" "}
          <button
            type="button"
            className="font-semibold underline"
            onClick={() => {
              setEtat("CONTENTIEUX");
              document.getElementById("fiches-saisies")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            Voir la liste
          </button>
        </Alerte>
      )}

      <Carte titre="Nouveau candidat">
        <FormulaireCandidat apres={(f) => {
          setMessage(f.contentieuxAge === "EN_ATTENTE" ? { ton: "jaune", texte: `${f.nomComplet} dépasse l’âge maximum : la fiche est enregistrée mais placée en contentieux. Le DG doit décider.` } : null);
          recharger();
        }} />
      </Carte>

      <div className="space-y-4">
        <ImportListe apres={recharger} />
      </div>

      <Annonce ton={message?.ton} fermer={() => setMessage(null)}>{message?.texte}</Annonce>

      <div id="fiches-saisies" className="scroll-mt-6">
      <Carte
        titre="Fiches saisies"
        actions={<Saisie className="w-64" placeholder="Rechercher un nom…" value={recherche} onChange={(e) => setRecherche(e.target.value)} />}
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <Segments
            valeur={etat}
            changer={setEtat}
            options={[
              { valeur: "A_CONTROLER", libelle: <Onglet texte="1. À contrôler" n={c?.aControler} /> },
              { valeur: "CONTROLEE", libelle: <Onglet texte="2. À valider par le DG" n={c?.controlees} /> },
              { valeur: "VALIDEE", libelle: <Onglet texte="3. Prêtes à envoyer" n={c?.validees} /> },
              { valeur: "TRANSMISE", libelle: <Onglet texte="4. Envoyées à la FP" n={c?.transmises} /> },
            ]}
          />
          <button
            type="button"
            onClick={() => setEtat("CONTENTIEUX")}
            className={`rounded-xl px-3 py-1.5 text-[13px] font-medium transition ${etat === "CONTENTIEUX" ? "bg-or-400 text-zinc-900" : "text-or-700 ring-1 ring-or-200 hover:bg-or-100"}`}
          >
            Contentieux âge{c ? ` (${c.contentieux})` : ""}
          </button>
        </div>
        {/* Ce qu'il faut faire à cette étape, et le bouton pour passer à la suivante */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-zinc-50 px-4 py-3">
          <span className="text-[13px] text-zinc-600">
            {
              {
                A_CONTROLER: "Comparez chaque fiche avec le dossier papier. Une fiche conforme passe à l’étape 2.",
                CONTROLEE: "Le DG valide les fiches contrôlées. Une fiche validée passe à l’étape 3.",
                VALIDEE: "Ces fiches sont validées : il reste à les envoyer à la Fonction Publique.",
                TRANSMISE: "Fiches parties à la Fonction Publique. On attend les arrêtés et décrets (« Réception des textes »). Un dossier que la FP dit incomplet se met de côté (bouton rouge sur sa ligne).",
                CONTENTIEUX: "Dossiers au-delà de l’âge maximum : le DG accorde ou refuse la dérogation.",
              }[etat]
            }
          </span>
          {etat === "A_CONTROLER" && controleur && (liste.donnees?.length ?? 0) > 1 && (
            <Bouton variante="principal" onClick={() => setToutControler(true)}>
              <ClipboardCheck /> Tout contrôler ({liste.donnees!.length})
            </Bouton>
          )}
          {etat === "CONTROLEE" && dg && !!liste.donnees?.length && (
            <Bouton variante="principal" onClick={() => setToutValider(true)}>
              <BadgeCheck /> Tout valider ({liste.donnees.length})
            </Bouton>
          )}
          {etat === "VALIDEE" && !!liste.donnees?.length &&
            (controleur ? (
              <Bouton variante="principal" onClick={() => setEnvoyer(true)}>
                <Send /> Envoyer à la Fonction Publique ({liste.donnees.length})
              </Bouton>
            ) : (
              <span className="text-[12px] text-zinc-400">L’envoi est fait par le chef de service, la DRSC, le bureau d’études ou le DG.</span>
            ))}
          {etat === "TRANSMISE" && (
            <span className="flex flex-wrap gap-4">
              <Link href="/transmission?onglet=base" className="text-[13px] font-medium text-marque-700 underline">
                Base des envoyés (filtres, fiche de chaque dossier)
              </Link>
              <Link href="/transmission" className="text-[13px] font-medium text-marque-700 underline">
                Fichiers Excel et listes par lot
              </Link>
            </span>
          )}
        </div>
        {dg && quotasPrets.length > 0 && (
          <div className="mb-4 space-y-3">
            {quotasPrets.map((q) => (
              <BudgetEnvoi key={q} quota={q} tour={tour} mettreApart={() => setReport(q)} />
            ))}
          </div>
        )}
        {liste.erreur && <Alerte>{liste.erreur}</Alerte>}
        {!liste.donnees ? (
          <Chargement />
        ) : !liste.donnees.length ? (
          <Vide>
            {
              {
                A_CONTROLER: "Aucune fiche à contrôler.",
                CONTROLEE: "Aucune fiche en attente de validation.",
                VALIDEE: "Aucune fiche validée en attente d’envoi.",
                TRANSMISE: "Aucune fiche envoyée.",
                CONTENTIEUX: "Aucun dossier en contentieux.",
              }[etat]
            }
          </Vide>
        ) : (
          <Tableau>
            <thead>
              <tr>
                <th>Candidat</th>
                <th>Diplôme → grade</th>
                <th>Département · lot</th>
                <th>Suivi</th>
                <th className="w-40" />
              </tr>
            </thead>
            <tbody>
              {liste.donnees.map((f) => (
                <tr key={f.id}>
                  <td className="min-w-56">
                    <button
                      type="button"
                      onClick={() => setDossierOuvert(f.id)}
                      title="Voir tout le dossier"
                      className="text-left font-medium text-encre underline decoration-zinc-300 decoration-dotted underline-offset-2 hover:text-marque-700 hover:decoration-marque-500"
                    >
                      {f.nomComplet}
                    </button>
                    <div className="text-[11px] text-zinc-400">
                      Né(e) le {dateCourte(f.dateNaissance)}
                      {f.lieuNaissance && ` à ${f.lieuNaissance}`}
                      {f.ageAuDepot !== null && ` · ${f.ageAuDepot} ans au dépôt`}
                      {f.contractuel ? " · contractuel" : f.contractuel === false ? " · fonctionnaire" : ""}
                      {f.contractuel !== null && f.provisoire ? " (prévision)" : ""}
                    </div>
                  </td>
                  <td>
                    <div>{f.diplomeBrut ?? <span className="text-rouge-600">Diplôme à préciser</span>}</div>
                    <div className="text-[11px] text-zinc-400">
                      {f.cycle} · {f.grade ? `${f.contractuel ? `${f.grade.replace(/\.+$/, "")}.C.` : f.grade}` : "grade à définir"}
                      {dg && f.salaireBrut ? ` · ${nf.format(f.salaireBrut)} F/mois` : ""}
                    </div>
                  </td>
                  <td>
                    <div>{f.departement?.nom ?? (f.feuille === "QUOTA_AUTRES" ? "—" : <span className="text-rouge-600">à préciser</span>)}</div>
                    <div className="text-[11px] text-zinc-400">
                      {f.feuille === "QUOTA_AUTRES" ? "Quota « Autres »" : `Quota ${f.quota ?? ""} · ${f.statut ?? ""} · ${f.lotCommission ?? "sans lot"}`}
                    </div>
                  </td>
                  <td className="space-y-1 text-[12px]">
                    <div className="text-zinc-500">Saisie par {f.saisiePar ?? "—"}</div>
                    {f.anomalies.length > 0 && <div className="text-rouge-600">{f.anomalies.join(" · ")}</div>}
                    {f.remarqueControle && (
                      <div className="flex items-start gap-1 text-rouge-600">
                        <TriangleAlert className="mt-0.5 size-3.5 shrink-0" /> À corriger : {f.remarqueControle}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {f.contentieuxAge === "EN_ATTENTE" && <Badge ton="jaune">Contentieux âge : décision du DG</Badge>}
                      {f.contentieuxAge === "REJETE" && <Badge ton="rouge">Dérogation refusée par {f.contentieuxPar}</Badge>}
                      {f.contentieuxAge === "APPROUVE" && <Badge ton="vert">Dérogation accordée</Badge>}
                      {f.controleePar && <Badge ton="bleu">Contrôlé par {f.controleePar}</Badge>}
                      {f.valideePar && <Badge ton="vert">Validé par {f.valideePar}</Badge>}
                      {f.rectifiee && <Badge ton="jaune">Corrigée après envoi</Badge>}
                      {f.reporteDe && !f.transmissionNumero && (
                        <span title={f.reportMotif ? `Motif : ${f.reportMotif}${f.reportePar ? ` (${f.reportePar})` : ""}` : undefined}>
                          <Badge ton="jaune">Mis à part du quota {f.reporteDe} → quota {f.quota}</Badge>
                        </span>
                      )}
                      {f.transmissionOrigine && !f.transmissionNumero && (
                        <Badge ton="rouge">
                          Mis de côté de la {libelleTransmission(f.transmissionOrigine)} (quota {f.quota})
                        </Badge>
                      )}
                      {f.transmissionNumero && (
                        <>
                          <Badge>
                            Quota {f.quota} · {f.transmission} · {dateCourte(f.transmisLe)}
                          </Badge>
                          {f.lotPublication ? <Badge ton="vert">Texte reçu · {libelleLot(f.lotPublication)}</Badge> : <Badge ton="jaune">Texte attendu</Badge>}
                        </>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-1">
                      {etat === "A_CONTROLER" && controleur && (
                        <Bouton variante="principal" className="px-3! py-1.5!" onClick={() => setControle(f)}>
                          Contrôler
                        </Bouton>
                      )}
                      {etat === "CONTROLEE" && dg && (
                        <Bouton variante="principal" className="px-3! py-1.5!" onClick={() => action(() => api.post("/candidats/valider", { ids: [f.id] }), `Fiche de ${f.nomComplet} validée.`)}>
                          Valider
                        </Bouton>
                      )}
                      {etat === "CONTENTIEUX" && dg && f.contentieuxAge === "EN_ATTENTE" && (
                        <>
                          <Bouton variante="principal" className="px-3! py-1.5!" onClick={() => action(() => api.post(`/candidats/${f.id}/contentieux`, { decision: "APPROUVE" }), `Dérogation accordée : la fiche de ${f.nomComplet} reprend le circuit normal.`)}>
                            Accorder
                          </Bouton>
                          <Bouton variante="danger" className="px-3! py-1.5!" onClick={() => action(() => api.post(`/candidats/${f.id}/contentieux`, { decision: "REJETE" }), `Dérogation refusée pour ${f.nomComplet}.`)}>
                            Refuser
                          </Bouton>
                        </>
                      )}
                      {etat === "VALIDEE" && controleur && f.transmissionOrigine && (
                        <Bouton
                          className="px-3! py-1.5!"
                          onClick={() =>
                            action(
                              () => api.post(`/candidats/${f.id}/rattacher`),
                              `Le dossier de ${f.nomComplet} a repris sa place dans la ${libelleTransmission(f.transmissionOrigine!)} du quota ${f.quota}.`,
                            )
                          }
                        >
                          Remettre dans la {libelleTransmission(f.transmissionOrigine)}
                        </Bouton>
                      )}
                      {etat === "VALIDEE" && dg && f.reporteDe && (
                        <Bouton
                          className="px-3! py-1.5!"
                          onClick={() =>
                            action(
                              () => api.post(`/candidats/${f.id}/annuler-report`),
                              `Le dossier de ${f.nomComplet} revient dans le quota ${f.reporteDe} (nouveau lot et n° d’ordre dans ce quota).`,
                            )
                          }
                        >
                          Remettre dans le quota {f.reporteDe}
                        </Bouton>
                      )}
                      {etat === "TRANSMISE" && controleur && !f.lotPublication && (
                        <BoutonIcone
                          libelle="Mettre de côté (la FP dit le dossier incomplet)"
                          ton="rouge"
                          onClick={() => {
                            setMotif("");
                            setMisDeCote(f);
                          }}
                        >
                          <ArchiveRestore />
                        </BoutonIcone>
                      )}
                      {(etat === "CONTROLEE" || etat === "VALIDEE") && controleur && (
                        <BoutonIcone libelle="Renvoyer pour correction" onClick={() => setRenvoi(f)}>
                          <Undo2 />
                        </BoutonIcone>
                      )}
                      {modifiable(f) && (
                        <BoutonIcone libelle="Modifier la fiche" onClick={() => setEdition(f)}>
                          <PencilLine />
                        </BoutonIcone>
                      )}
                      {!f.transmissionNumero && (controleur || f.etatFiche === "A_CONTROLER") && (
                        <BoutonIcone libelle="Supprimer la fiche" ton="rouge" onClick={() => setSuppression(f)}>
                          <Trash2 />
                        </BoutonIcone>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Tableau>
        )}
      </Carte>
      </div>

      {edition && (
        <Modale titre={`Modifier la fiche – ${edition.nomComplet}`} ouverte large fermer={() => setEdition(null)}>
          {(edition.etatFiche !== "A_CONTROLER" || edition.transmissionNumero) && (
            <div className="mb-4">
              <Alerte ton="jaune">
                {edition.transmissionNumero
                  ? "Cette fiche est déjà partie à la Fonction Publique. Après modification, elle devra être contrôlée et validée de nouveau, et sera signalée « corrigée après envoi »."
                  : "Cette fiche a déjà été contrôlée. Après modification, elle devra être contrôlée et validée de nouveau."}
              </Alerte>
            </div>
          )}
          <FormulaireCandidat
            fiche={edition}
            annuler={() => setEdition(null)}
            apres={() => {
              setEdition(null);
              setMessage({ ton: "vert", texte: "Fiche modifiée : elle repart au contrôle." });
              recharger();
            }}
          />
        </Modale>
      )}
      {controle && (
        <ControleFiche
          fiche={controle}
          fermer={() => setControle(null)}
          apres={(texte) => {
            setControle(null);
            setMessage({ ton: "vert", texte });
            recharger();
          }}
        />
      )}
      {renvoi && (
        <Renvoi
          fiche={renvoi}
          fermer={() => setRenvoi(null)}
          apres={() => {
            setRenvoi(null);
            setMessage({ ton: "vert", texte: `Fiche de ${renvoi.nomComplet} renvoyée pour correction.` });
            recharger();
          }}
        />
      )}
      <Modale titre="Valider toutes les fiches contrôlées ?" ouverte={toutValider} fermer={() => setToutValider(false)}>
        <p className="text-[13px] leading-relaxed text-zinc-600">
          Les <strong>{liste.donnees?.length ?? 0} fiche(s)</strong> contrôlée(s) seront validées en une fois et pourront partir à la Fonction Publique. Une fiche validée par erreur peut encore être renvoyée pour correction tant qu’elle n’est pas partie.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Bouton onClick={() => setToutValider(false)}>Annuler</Bouton>
          <Bouton
            variante="principal"
            onClick={async () => {
              setToutValider(false);
              await action(() => api.post("/candidats/valider", {}), "Toutes les fiches contrôlées sont validées.");
            }}
          >
            <BadgeCheck /> Tout valider
          </Bouton>
        </div>
      </Modale>
      <Modale titre="Contrôler toutes les fiches ?" ouverte={toutControler} fermer={() => setToutControler(false)}>
        <p className="text-[13px] leading-relaxed text-zinc-600">
          Les <strong>{liste.donnees?.length ?? 0} fiche(s)</strong> à contrôler seront déclarées <strong>conformes au dossier papier</strong> en une fois. Faites-le seulement si vous avez bien vérifié les dossiers.
        </p>
        <p className="mt-3 text-[12px] text-zinc-500">
          Restent à contrôler une par une : les fiches incomplètes, en contentieux d’âge, ou qui ressemblent à une personne déjà enregistrée.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Bouton onClick={() => setToutControler(false)}>Annuler</Bouton>
          <Bouton
            variante="principal"
            onClick={async () => {
              setToutControler(false);
              try {
                const r = await api.post<{ controlees: number; laissees: number }>("/candidats/controler", {});
                setMessage({
                  ton: "vert",
                  texte: `${r.controlees} fiche(s) contrôlée(s) : elles attendent la validation du DG.${r.laissees ? ` ${r.laissees} fiche(s) restent à contrôler une par une (incomplètes, contentieux ou ressemblance).` : ""}`,
                });
                recharger();
              } catch (e) {
                setMessage({ ton: "rouge", texte: (e as Error).message });
              }
            }}
          >
            <ClipboardCheck /> Tout contrôler
          </Bouton>
        </div>
      </Modale>
      <Modale titre="Envoyer à la Fonction Publique" ouverte={envoyer} fermer={() => setEnvoyer(false)} large>
        <div className="space-y-3 text-[13px] leading-relaxed text-zinc-600">
          <p>
            Chaque quota a <strong>ses propres transmissions</strong> (1ère, 2ème…). Pour chaque quota, envoyez <strong>tous</strong> les dossiers prêts, ou
            <strong>cochez</strong> ceux qui partent dans sa prochaine transmission (les autres attendront la suivante).
          </p>
          {!transmissions.donnees ? (
            <Chargement />
          ) : (
            <ul className="space-y-2">
              {transmissions.donnees.quotas
                .filter((q) => q.pretes > 0)
                .map((q) => (
                  <li key={q.quota} className="flex flex-wrap items-center gap-3 rounded-2xl bg-zinc-50 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-encre">Quota {q.quota}</div>
                      <div className="text-[12px] text-zinc-500">
                        {q.pretes} fiche(s) → {q.libelleProchaine} du quota {q.quota}
                      </div>
                      {dg && (
                        <BudgetEnvoi
                          quota={q.quota}
                          compact
                          mettreApart={() => {
                            setEnvoyer(false);
                            setReport(q.quota);
                          }}
                        />
                      )}
                    </div>
                    <div className="w-full">
                      <EnvoiTransmission
                        quota={q.quota}
                        pretes={q.pretes}
                        libelleProchaine={q.libelleProchaine}
                        chargement={envoiEnCours}
                        envoyer={async (ids) => {
                          setEnvoiEnCours(true);
                          try {
                            const r = await api.post<{ quota: number; numero: number; fiches: number }>("/transmissions", { quota: q.quota, ids });
                            setEnvoyer(false);
                            setEtat("TRANSMISE");
                            setMessage({
                              ton: "vert",
                              texte: `${q.libelleProchaine} du quota ${r.quota} : ${r.fiches} fiche(s) envoyée(s). Le fichier Excel se télécharge ; imprimez les listes par lot dans « Envoi à la FP ».`,
                            });
                            recharger();
                            await api
                              .telecharger(`/transmissions/${r.quota}/${r.numero}/fichier?modele=fp`, `Quota ${r.quota} - Transmission ${r.numero} - Fonction Publique.xlsx`)
                              .catch(() => undefined);
                          } catch (e) {
                            setEnvoyer(false);
                            setMessage({ ton: "rouge", texte: (e as Error).message });
                          } finally {
                            setEnvoiEnCours(false);
                          }
                        }}
                      />
                    </div>
                  </li>
                ))}
            </ul>
          )}
          {liste.donnees?.some((f) => f.transmissionOrigine) && (
            <Alerte ton="jaune">
              Des dossiers mis de côté puis corrigés sont prêts. Envoyés ici, ils partent dans la <strong>nouvelle</strong> transmission. Pour les remettre dans leur
              transmission d’origine, utilisez plutôt « Remettre dans la … transmission » sur leur ligne.
            </Alerte>
          )}
        </div>
        <div className="mt-6 flex justify-end">
          <Bouton onClick={() => setEnvoyer(false)}>Fermer</Bouton>
        </div>
      </Modale>
      {dossierOuvert && <FicheDossier id={dossierOuvert} fermer={() => setDossierOuvert(null)} />}
      {report !== null && (
        <MettreApart
          quota={report}
          fermer={() => setReport(null)}
          apres={(texte) => {
            setReport(null);
            setMessage({ ton: "vert", texte });
            recharger();
          }}
        />
      )}
      <Modale titre="Mettre ce dossier de côté ?" ouverte={!!misDeCote} fermer={() => setMisDeCote(null)}>
        <div className="space-y-3 text-[13px] leading-relaxed text-zinc-600">
          <p>
            La FP dit le dossier de <strong>{misDeCote?.nomComplet}</strong> incomplet ? Il <strong>sort de la {misDeCote?.transmission}</strong> du quota{" "}
            {misDeCote?.quota} et revient à l’étape <strong>« 1. À contrôler »</strong>. Ensuite :
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>corrigez la fiche (crayon « Modifier »), par exemple la date de naissance ; changez aussi le lot de la commission si besoin ;</li>
            <li>elle est contrôlée, puis validée par le DG ;</li>
            <li>
              à l’étape « 3. Prêtes à envoyer », elle se <strong>remet dans sa transmission d’origine</strong> ou part avec la <strong>prochaine</strong>.
            </li>
          </ul>
          <Champ libelle="Pourquoi ? (écrit sur la fiche et dans le journal) *">
            <Saisie autoFocus value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Ex. Dossier incomplet : date de naissance à corriger" />
          </Champ>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Bouton onClick={() => setMisDeCote(null)}>Annuler</Bouton>
          <Bouton
            variante="danger"
            disabled={!motif.trim()}
            onClick={async () => {
              const f = misDeCote!;
              setMisDeCote(null);
              await action(
                () => api.post(`/candidats/${f.id}/mettre-de-cote`, { motif: motif.trim() }),
                `Dossier de ${f.nomComplet} mis de côté : il attend d’être corrigé dans « 1. À contrôler ».`,
              );
            }}
          >
            <ArchiveRestore /> Mettre de côté
          </Bouton>
        </div>
      </Modale>
      <Modale titre="Supprimer cette fiche ?" ouverte={!!suppression} fermer={() => setSuppression(null)}>
        <p className="text-[13px] leading-relaxed text-zinc-600">
          La fiche de <strong>{suppression?.nomComplet}</strong> sera définitivement supprimée. Faites-le seulement si elle a été saisie par erreur.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Bouton onClick={() => setSuppression(null)}>Annuler</Bouton>
          <Bouton
            variante="danger"
            onClick={async () => {
              const f = suppression!;
              setSuppression(null);
              await action(() => api.delete(`/candidats/${f.id}`), `La fiche de ${f.nomComplet} a été supprimée.`);
            }}
          >
            Supprimer
          </Bouton>
        </div>
      </Modale>
    </div>
  );
}

/** Libellé d'onglet : le nombre ressort en jaune. */
function Onglet({ texte, n }: { texte: string; n?: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {texte}
      {n !== undefined && <span className="rounded-full bg-or-400 px-1.5 py-px text-[11px] leading-4 font-semibold text-zinc-900 tabular-nums">{n}</span>}
    </span>
  );
}

function Etape({ numero, titre, texte, icone, lien, actif }: { numero: number; titre: string; texte: string; icone: React.ReactNode; lien?: string; actif?: boolean }) {
  const contenu = (
    <div className="flex h-full items-start gap-3 rounded-3xl bg-white p-4 shadow-doux transition-all duration-200 hover:-translate-y-0.5">
      <Pastille ton={actif ? "jaune" : "vert"}>{icone}</Pastille>
      <div className="min-w-0">
        <div className="text-[11px] font-medium text-zinc-400">Étape {numero}</div>
        <div className="text-[14px] font-semibold">{titre}</div>
        <div className="text-[12px] leading-snug text-zinc-500">{texte}</div>
      </div>
    </div>
  );
  return lien ? <Link href={lien}>{contenu}</Link> : contenu;
}

/* ------------------------------ Import Excel ----------------------------- */

interface RapportImport {
  lues: number;
  creees: number;
  aCreer?: number;
  aCreerSansTexte?: number;
  dejaPresentes: number;
  tropJeunes: number;
  contentieux: number;
  aCompleter: number;
  ressemblances: number;
  avecTexte: number;
  ignoreesAvecTexte: number;
  exemplesTexte: { nom: string; texte: string; lot: string | null }[];
  feuillesIgnorees?: string[];
}

function ImportListe({ apres }: { apres: () => void }) {
  const [ouvert, setOuvert] = useState(false);
  const [origine, setOrigine] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [rapport, setRapport] = useState<RapportImport | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  // Fichier qui contient des personnes déjà revenues de la FP : on demande quoi faire
  const [attente, setAttente] = useState<{ fichier: File; analyse: RapportImport } | null>(null);
  const [confirmerTout, setConfirmerTout] = useState(false);

  async function importer(f: File, mode: "analyse" | "sansTexte" | "tout") {
    const fd = new FormData();
    fd.append("fichier", f);
    const options = origine.trim() ? `&origine=${encodeURIComponent(origine.trim())}` : "";
    return api.post<RapportImport>(`/candidats/import?mode=${mode}${options}`, fd);
  }

  async function envoyer(f: File) {
    setEnvoi(true);
    setErreur(null);
    setRapport(null);
    try {
      const analyse = await importer(f, "analyse");
      if (analyse.avecTexte > 0) setAttente({ fichier: f, analyse });
      else {
        setRapport(await importer(f, "tout"));
        apres();
      }
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  }

  async function terminer(mode: "sansTexte" | "tout") {
    if (!attente) return;
    setEnvoi(true);
    try {
      setRapport(await importer(attente.fichier, mode));
      apres();
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
      setAttente(null);
      setConfirmerTout(false);
    }
  }

  if (!ouvert)
    return (
      <button type="button" onClick={() => setOuvert(true)} className="flex w-full items-center gap-4 rounded-3xl bg-white p-5 text-left shadow-doux transition-all hover:-translate-y-0.5">
        <Pastille ton="gris">
          <FileUp />
        </Pastille>
        <div>
          <div className="text-[14px] font-semibold">Importer une liste Excel</div>
          <div className="text-[12px] text-zinc-500">
            Pour une liste déjà saisie dans Excel (directions départementales, institution, travail antérieur) : chaque ligne devient une fiche à contrôler.
          </div>
        </div>
      </button>
    );
  return (
    <Carte
      titre="Importer une liste Excel"
      actions={<Bouton variante="discret" onClick={() => setOuvert(false)}>Fermer</Bouton>}
    >
      <div className="mb-4 space-y-3 text-[13px] leading-relaxed text-zinc-500">
        <p>
          Le fichier doit avoir les colonnes de la fiche de suivi (« Quota », « Noms et prénoms », « Date de nais. », « Diplôme », « Département », « Statut »,
          « Lot »…). Les personnes déjà dans la base sont ignorées. Une feuille « Quota Autres » n’est <strong>pas lue</strong> : le quota « Autres » vient des
          textes de la FP.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <Bouton onClick={() => api.telecharger("/candidats/modele", "Modele - liste des candidats.xlsx").catch(() => undefined)}>
            <Download /> Télécharger le modèle Excel
            <Aide>
              À remettre à une institution ou une direction qui envoie une liste : les bons intitulés de colonnes, et des listes déroulantes pour le diplôme et le
              département. Le système lit alors la liste sans erreur.
            </Aide>
          </Bouton>
          <Champ libelle="Qui envoie la liste ? (facultatif)" aide="Noté comme « Origine du dossier » si la colonne Origine est vide" className="min-w-72 flex-1">
            <Saisie value={origine} onChange={(e) => setOrigine(e.target.value)} placeholder="Ex. Ministère de …, DDEPPSA du Pool" />
          </Champ>
        </div>
      </div>
      <div className="mb-4">
        <GuideImports ici="saisie" />
      </div>
      <ZoneFichier accept=".xlsx" envoi={envoi} envoyer={envoyer} aide="Liste des candidats (.xlsx)" />
      <Annonce ton="rouge" fermer={() => setErreur(null)}>
        {erreur}
      </Annonce>
      <Annonce fermer={() => setRapport(null)}>
        {rapport && (
          <span>
            {rapport.lues} ligne(s) lue(s) : <strong>{rapport.creees} fiche(s) créée(s)</strong> à contrôler
            {rapport.dejaPresentes ? `, ${rapport.dejaPresentes} déjà dans la base (ignorées)` : ""}
            {rapport.tropJeunes ? `, ${rapport.tropJeunes} refusée(s) car moins de 18 ans` : ""}
            {rapport.contentieux ? `, ${rapport.contentieux} en contentieux (âge)` : ""}
            {rapport.aCompleter ? `, ${rapport.aCompleter} à compléter (diplôme, département ou date illisible)` : ""}
            {rapport.ressemblances ? `, ${rapport.ressemblances} qui ressemblent à une personne déjà enregistrée` : ""}
            {rapport.ignoreesAvecTexte ? `, ${rapport.ignoreesAvecTexte} non créée(s) car leur arrêté ou décret est déjà arrivé` : ""}.
            {!!rapport.feuillesIgnorees?.length && (
              <span className="mt-2 block text-or-700">
                Feuille(s) non lue(s) : {rapport.feuillesIgnorees.join(", ")}. Le quota « Autres » s’enregistre à la réception des textes de la FP.
              </span>
            )}
          </span>
        )}
      </Annonce>

      {attente && (
        <Modale titre="Des personnes de ce fichier ont déjà leur arrêté ou leur décret" ouverte={!confirmerTout} large fermer={() => setAttente(null)}>
          <div className="space-y-3 text-[13px] leading-relaxed text-zinc-600">
            <p>
              Sur <strong>{attente.analyse.lues}</strong> ligne(s), <strong>{attente.analyse.avecTexte}</strong> ont déjà la partie « Retour F.P » remplie (type de texte, n° du texte ou lot de publication). Ces personnes sont donc <strong>déjà revenues de la Fonction Publique</strong> :
              ce ne sont plus des candidats à envoyer.
            </p>
            <ul className="max-h-40 overflow-y-auto rounded-2xl bg-zinc-50 px-4 py-2 text-[12px]">
              {attente.analyse.exemplesTexte.map((x, i) => (
                <li key={i} className="py-0.5">
                  <strong>{x.nom}</strong> — {x.texte}
                  {x.lot ? ` · lot ${x.lot}` : ""}
                </li>
              ))}
              {attente.analyse.avecTexte > attente.analyse.exemplesTexte.length && <li className="py-0.5 text-zinc-400">… et {attente.analyse.avecTexte - attente.analyse.exemplesTexte.length} autre(s)</li>}
            </ul>
            <Alerte ton="bleu">
              Leur texte s’enregistre ailleurs : dans <strong>« Réception des textes »</strong> (on pointe l’arrêté ou le décret de la personne), ou, si ce fichier est votre fiche de suivi complète, en l’important dans <strong>« Base des recrutés »</strong>.
            </Alerte>
          </div>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <Bouton onClick={() => setAttente(null)}>Annuler</Bouton>
            <Bouton onClick={() => setConfirmerTout(true)}>Tout créer</Bouton>
            <Bouton variante="principal" disabled={envoi} onClick={() => terminer("sansTexte")}>
              Créer uniquement ceux sans arrêté ({attente.analyse.aCreerSansTexte ?? 0})
            </Bouton>
          </div>
        </Modale>
      )}
      <Modale titre="ATTENTION : tout créer ?" ouverte={!!attente && confirmerTout} fermer={() => setConfirmerTout(false)}>
        <div className="space-y-3 text-[13px] leading-relaxed text-zinc-600">
          <p>
            Les <strong>{attente?.analyse.avecTexte} personne(s)</strong> qui ont déjà leur arrêté ou leur décret seront aussi créées comme de <strong>nouveaux candidats</strong>. Conséquences :
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>leur arrêté ou décret écrit dans le fichier <strong>ne sera pas enregistré</strong> ;</li>
            <li>elles repasseront par le contrôle, la validation du DG, et risquent d’être <strong>envoyées une deuxième fois</strong> à la Fonction Publique ;</li>
            <li>elles <strong>n’apparaîtront pas</strong> dans les affectations tant que leur texte n’est pas pointé dans « Réception des textes ».</li>
          </ul>
          <p className="text-[12px] text-zinc-500">Les personnes déjà présentes dans la base sont, de toute façon, ignorées.</p>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Bouton onClick={() => setConfirmerTout(false)}>Revenir</Bouton>
          <Bouton variante="danger" disabled={envoi} onClick={() => terminer("tout")}>
            Je comprends : tout créer
          </Bouton>
        </div>
      </Modale>
    </Carte>
  );
}

/* ----------------------------- Formulaire ----------------------------- */

interface Valeurs {
  feuille: "MEPPSA" | "QUOTA_AUTRES";
  quota: string;
  numeroOrdre: string;
  nomComplet: string;
  dateNaissance: string;
  dateDepot: string;
  lieuNaissance: string;
  diplomeCode: string;
  departementId: string;
  statut: string;
  lotCommission: string;
  lotNature: NatureLot | "";
  membreCommissionId: string;
  lieuServiceBrut: string;
  origineBrute: string;
  observation: string;
  agentRecenseId: string;
  personneBase: string;
}

function valeursDe(f?: Fiche): Valeurs {
  return {
    feuille: (f?.feuille as Valeurs["feuille"]) ?? "MEPPSA",
    quota: f ? (f.quota ? String(f.quota) : "") : String(anneeCourante),
    numeroOrdre: f?.numeroOrdre ? String(f.numeroOrdre) : "",
    nomComplet: f?.nomComplet ?? "",
    dateNaissance: f?.dateNaissance ?? "",
    dateDepot: f?.dateDepot ?? aujourdhui(),
    lieuNaissance: f?.lieuNaissance ?? "",
    diplomeCode: f?.diplomeCode ?? "",
    departementId: f?.departementId ? String(f.departementId) : "",
    statut: f?.statut && f.statut !== "Autres" ? f.statut : "",
    lotCommission: f?.lotCommission ?? "",
    lotNature: f?.lotNature ?? "",
    membreCommissionId: f?.membreCommissionId ?? "",
    lieuServiceBrut: f?.lieuServiceBrut ?? "",
    origineBrute: f?.origineBrute ?? "",
    observation: f?.observation ?? "",
    agentRecenseId: f?.agentRecenseId ? String(f.agentRecenseId) : "",
    personneBase: f?.agentRecenseId ? `${f.nomComplet}${f.vagueNumero ? ` · ${vagueLisible(f.vagueNumero)}` : ""}` : "",
  };
}

function FormulaireCandidat({ fiche, apres, annuler }: { fiche?: Fiche; apres: (f: Fiche) => void; annuler?: () => void }) {
  const { refs } = useSession();
  const reglages = useParametres();
  const [v, setV] = useState<Valeurs>(() => valeursDe(fiche));
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [doublons, setDoublons] = useState<Doublon[]>([]);
  const [confirmer, setConfirmer] = useState(false);
  const [prochain, setProchain] = useState<number | null>(null);
  const [lots, setLots] = useState<EtatLots | null>(null);
  // Plusieurs agents saisissent en même temps : le remplissage des lots se relit toutes les 20 s
  const [tic, setTic] = useState(0);
  const champNom = useRef<HTMLInputElement>(null);
  const meppsa = v.feuille === "MEPPSA";
  const membres = useApi<MembreCommission[]>(meppsa && v.quota ? `/commission/membres?quota=${v.quota}` : null);
  const rechargerMembres = membres.recharger;

  useEffect(() => {
    const t = setInterval(() => setTic((n) => n + 1), 20000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (succes) rechargerMembres();
  }, [succes, rechargerMembres]);
  const maj = (k: keyof Valeurs, val: string) => setV((s) => ({ ...s, [k]: val }));

  // N° d'ordre proposé automatiquement (quota choisi)
  useEffect(() => {
    if (fiche || !meppsa) return;
    let actif = true;
    api
      .get<{ numero: number }>(`/candidats/prochain-numero?quota=${v.quota}`)
      .then((r) => actif && setProchain(r.numero))
      .catch(() => actif && setProchain(null));
    return () => {
      actif = false;
    };
  }, [v.quota, meppsa, fiche, succes]);

  // Lots de la commission du groupe (même quota, statut et diplôme)
  useEffect(() => {
    if (!v.diplomeCode) return;
    let actif = true;
    api
      .get<EtatLots>(`/candidats/lots${qs({ quota: v.quota, statut: v.statut || (meppsa ? "" : "Autres"), diplomeCode: v.diplomeCode, exclure: fiche?.id, feuille: v.feuille })}`)
      .then((r) => {
        if (!actif) return;
        setLots(r);
        if (meppsa) setV((s) => (s.lotCommission ? s : { ...s, lotCommission: r.conseille.lot, lotNature: r.conseille.nature }));
      })
      .catch(() => actif && setLots(null));
    return () => {
      actif = false;
    };
  }, [v.quota, v.statut, v.diplomeCode, v.feuille, meppsa, fiche?.id, succes, tic]);

  // Personnes déjà dans la base qui ressemblent (pendant la saisie)
  useEffect(() => {
    const t = setTimeout(() => {
      api
        .get<Doublon[]>(`/candidats/doublons${qs({ nom: v.nomComplet, dateNaissance: v.dateNaissance, exclure: fiche?.id })}`)
        .then(setDoublons)
        .catch(() => setDoublons([]));
    }, 450);
    return () => clearTimeout(t);
  }, [v.nomComplet, v.dateNaissance, fiche?.id]);

  const regle = refs.regles.find((r) => r.code === v.diplomeCode);
  const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(v.dateNaissance);
  const ageDepot = dateOk ? ageA(v.dateNaissance, v.dateDepot || aujourdhui()) : null;
  const ageRef = dateOk ? ageA(v.dateNaissance, reglages.reference) : null;
  const limite = regle?.categorie === "I" ? reglages.limiteCatI : reglages.limite;
  const memeNaissance = doublons.filter((d) => d.bloquant);
  const diplomes = [...refs.regles].sort((a, b) => a.libelle.localeCompare(b.libelle, "fr"));
  const lotChoisi = lots?.lots.find((l) => l.lot === v.lotCommission && (l.nature === "MIXTE") === (v.lotNature === "MIXTE"));
  const membre = membres.donnees?.find((m) => m.id === v.membreCommissionId);
  // Places déjà prises par d'autres dossiers que celui-ci
  const placesPrises = membre ? membre.saisis - (fiche?.membreCommissionId === membre.id ? 1 : 0) : 0;

  async function enregistrer(e: React.FormEvent | null, forcer = false) {
    e?.preventDefault();
    setErreur(null);
    setSucces(null);
    if (memeNaissance.length && !forcer) {
      setConfirmer(true);
      return;
    }
    setConfirmer(false);
    setEnvoi(true);
    const corps = {
      feuille: v.feuille,
      quota: v.quota ? Number(v.quota) : null,
      numeroOrdre: v.numeroOrdre ? Number(v.numeroOrdre) : null,
      nomComplet: v.nomComplet,
      dateNaissance: v.dateNaissance,
      dateDepot: v.dateDepot || null,
      lieuNaissance: v.lieuNaissance || null,
      diplomeCode: v.diplomeCode,
      departementId: v.departementId ? Number(v.departementId) : null,
      statut: v.statut || null,
      lotCommission: v.lotCommission || null,
      lotNature: v.lotCommission ? v.lotNature || null : null,
      membreCommissionId: v.membreCommissionId || null,
      lieuServiceBrut: v.lieuServiceBrut || null,
      origineBrute: v.origineBrute || null,
      observation: v.observation || null,
      forcerDoublon: forcer,
      agentRecenseId: v.agentRecenseId ? Number(v.agentRecenseId) : null,
    };
    try {
      const f = fiche ? await api.put<Fiche>(`/candidats/${fiche.id}`, corps) : await api.post<Fiche>("/candidats", corps);
      if (!fiche) {
        setSucces(
          `Fiche de ${f.nomComplet} enregistrée${f.numeroOrdre ? ` (n° d’ordre ${f.numeroOrdre}, ${f.lotCommission ?? "sans lot"})` : ""}. Vous pouvez saisir le candidat suivant.${f.avertissementVague ? ` Attention : ${f.avertissementVague}` : ""}`,
        );
        // On garde la liste, le quota, le département, le statut, le lot et la date de dépôt
        setV((s) => ({ ...s, numeroOrdre: "", nomComplet: "", dateNaissance: "", lieuNaissance: "", observation: "", lieuServiceBrut: "", origineBrute: "", agentRecenseId: "", personneBase: "" }));
        setDoublons([]);
        champNom.current?.focus();
      }
      apres(f);
    } catch (err) {
      setErreur((err as Error).message);
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <form onSubmit={enregistrer} className="space-y-5">
      <p className="flex items-center gap-1.5 text-[12px] text-zinc-500">
        Candidat de la liste du MEPPSA, à envoyer à la Fonction Publique.
        <Aide>
          Le <strong>quota « Autres »</strong> ne se saisit pas ici : ce sont les personnes que la FP nous renvoie sur ses textes sans que nous les ayons envoyées.
          Elles s’enregistrent dans « Réception des textes ».
        </Aide>
      </p>

      <ChercherDansLaBase
        choisie={v.agentRecenseId ? v.personneBase : null}
        retirer={() => setV((s) => ({ ...s, agentRecenseId: "", personneBase: "" }))}
        choisir={(p) =>
          setV((s) => ({
            ...s,
            agentRecenseId: String(p.id),
            personneBase: `${p.nomComplet} (${p.numeroFiche}, ${p.statut === "VOLONTAIRE" ? `volontaire, ${vagueLisible(p.vague)}` : "communautaire"})`,
            nomComplet: p.nomComplet,
            dateNaissance: p.dateNaissance ?? s.dateNaissance,
            lieuNaissance: p.lieuNaissance ?? s.lieuNaissance,
            diplomeCode: p.diplomeCode ?? s.diplomeCode,
            departementId: p.departementId ? String(p.departementId) : s.departementId,
            lieuServiceBrut: p.lieuService ?? s.lieuServiceBrut,
            statut: p.statut === "VOLONTAIRE" ? "Volontaire" : "Communautaire",
            lotCommission: "",
            lotNature: "",
          }))
        }
      />
      {!fiche && meppsa && <OrdreDesVagues quota={v.quota} version={succes} />}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Champ libelle="Nom et prénoms du candidat *" aide="Le nom de famille en MAJUSCULES, puis les prénoms s’il en a" className="md:col-span-2">
          <Saisie ref={champNom} value={v.nomComplet} onChange={(e) => maj("nomComplet", e.target.value)} placeholder="Ex. MOUANDA Jean Paul" autoFocus={!fiche} />
        </Champ>
        <Champ
          libelle="Date de naissance *"
          aide={
            ageDepot === null
              ? "Comme sur l’acte de naissance"
              : ageDepot < reglages.ageMin
                ? `${ageDepot} ans au dépôt : moins de ${reglages.ageMin} ans, le dossier sera refusé`
                : ageDepot > reglages.ageMax
                  ? `${ageDepot} ans au dépôt : au-delà de ${reglages.ageMax} ans, contentieux (décision du DG)`
                  : `${ageRef} ans aujourd’hui → ${ageRef! > limite ? "contractuel" : "fonctionnaire"} (prévision${regle ? `, limite ${limite} ans en catégorie ${regle.categorie}` : ""} ; le statut se fixe à la date de signature du texte de la FP)`
          }
        >
          <Saisie type="date" value={v.dateNaissance} onChange={(e) => maj("dateNaissance", e.target.value)} />
        </Champ>
        <Champ libelle="Lieu de naissance">
          <Saisie value={v.lieuNaissance} onChange={(e) => maj("lieuNaissance", e.target.value)} placeholder="Ex. Brazzaville" />
        </Champ>

        <Champ
          libelle="Diplôme le plus élevé *"
          aide={regle ? `Cycle : ${cycleLisible(regle.cycle)} · Grade : ${regle.grade ?? "à définir"} · Catégorie ${regle.categorie ?? "?"}, échelle ${regle.echelle ?? "?"}` : "Le cycle, le grade et la catégorie en découlent automatiquement"}
          className="md:col-span-2"
        >
          <Liste value={v.diplomeCode} onChange={(e) => setV((s) => ({ ...s, diplomeCode: e.target.value, lotCommission: "", lotNature: "" }))} vide="— Choisir le diplôme —" options={diplomes.map((r) => ({ valeur: r.code, libelle: r.libelle }))} />
        </Champ>
        <Champ libelle={meppsa ? "Département d’affectation *" : "Département (si connu)"} aide="Là où le candidat travaille">
          <Liste value={v.departementId} onChange={(e) => maj("departementId", e.target.value)} vide="— Choisir —" options={refs.departements.map((d) => ({ valeur: d.id, libelle: d.nom }))} />
        </Champ>
        <Champ libelle="Lieu de service" aide="École ou structure où il travaille (facultatif)">
          <SaisieReferentiel liste="ETABLISSEMENT" valeur={v.lieuServiceBrut} changer={(x) => maj("lieuServiceBrut", x)} departementId={v.departementId} placeholder="Ex. EP de Makoua" />
        </Champ>

        <>
            <Champ
              libelle={meppsa ? "Statut" : "Statut (facultatif)"}
              aide={
                v.agentRecenseId
                  ? "Repris de la base du personnel"
                  : meppsa
                    ? "Hors de la base : communautaire (un volontaire se choisit dans la base)"
                    : "Laissé vide : « Autres »"
              }
            >
              <Liste
                disabled={!!v.agentRecenseId}
                value={v.statut}
                onChange={(e) => setV((s) => ({ ...s, statut: e.target.value, lotCommission: "", lotNature: "" }))}
                vide="—"
                options={(meppsa ? STATUTS : [...STATUTS, "Autres"]).map((s) => ({ valeur: s, libelle: s }))}
              />
            </Champ>
            <Champ libelle={meppsa ? "Quota (année de recrutement) *" : "Quota (facultatif)"}>
              <Liste
                value={v.quota}
                onChange={(e) => setV((s) => ({ ...s, quota: e.target.value, lotCommission: "", lotNature: "", membreCommissionId: "" }))}
                vide={meppsa ? undefined : "—"}
                options={QUOTAS.map((q) => ({ valeur: q, libelle: String(q) }))}
              />
            </Champ>
            <Champ
              libelle={meppsa ? "Lot de la commission" : "Lot de la commission (facultatif)"}
              bulle={
                <>
                  <strong>Lot de volontaires</strong> : un seul diplôme professionnel (ex. tous CFEEN). <strong>Lot de communautaires</strong> : tous les
                  diplômes du même cycle ensemble (ex. BAC et CFEEN au primaire). <strong>Lot mixte</strong> : volontaires et communautaires du même cycle
                  sur la même liste. Choisissez un lot existant, ou ouvrez-en un nouveau, séparé ou mixte.
                </>
              }
              aide={!v.diplomeCode || !v.statut ? "Choisissez d’abord le diplôme et le statut" : undefined}
            >
              <Liste
                value={v.lotCommission ? `${v.lotCommission}|${v.lotNature}` : ""}
                disabled={!v.diplomeCode || !v.statut}
                onChange={(e) => {
                  const [lot, nature] = e.target.value.split("|");
                  setV((s) => ({ ...s, lotCommission: lot ?? "", lotNature: (nature as NatureLot) ?? "" }));
                }}
                vide="—"
                options={[
                  ...(lots?.lots ?? []).map((l) => ({
                    valeur: `${l.lot}|${l.nature}`,
                    libelle: `${l.lot} — ${NATURE_LOT[l.nature]} — ${l.n}/${lots!.taille}${l.plein ? " (plein)" : ""}`,
                  })),
                  ...(lots
                    ? [
                        {
                          valeur: `${lots.suivants.separe.lot}|${lots.suivants.separe.nature}`,
                          libelle: `${lots.suivants.separe.lot} — nouveau lot de ${NATURE_LOT[lots.suivants.separe.nature]}${lots.suivants.separe.nature === "VOLONTAIRE" && regle ? ` (${regle.libelle})` : ""}`,
                        },
                        { valeur: `${lots.suivants.mixte.lot}|MIXTE`, libelle: `${lots.suivants.mixte.lot} — nouveau lot mixte (volontaires et communautaires)` },
                      ]
                    : []),
                ]}
              />
              {lots && v.lotCommission && v.diplomeCode && v.statut && <RemplissageLot n={lotChoisi?.n ?? 0} taille={lots.taille} lot={lotChoisi} nouveau={!lotChoisi} />}
            </Champ>
            <Champ
              libelle={meppsa ? "N° d’ordre" : "N° d’ordre (facultatif)"}
              aide={!meppsa ? "Si le dossier en porte un" : fiche ? undefined : prochain ? `Laissez vide : le n° ${prochain} sera donné automatiquement` : "Donné automatiquement si vide"}
            >
              <Saisie inputMode="numeric" value={v.numeroOrdre} onChange={(e) => maj("numeroOrdre", e.target.value.replace(/\D/g, ""))} placeholder={meppsa && prochain ? String(prochain) : ""} />
            </Champ>
        </>
        <Champ libelle="Date de dépôt du dossier" aide="L’âge minimum s’apprécie à cette date">
          <Saisie type="date" value={v.dateDepot} onChange={(e) => maj("dateDepot", e.target.value)} />
        </Champ>
        <Champ libelle="Observation">
          <Zone className="min-h-10!" rows={1} value={v.observation} onChange={(e) => maj("observation", e.target.value)} />
        </Champ>
        {meppsa && (
          <Champ
            libelle="Apporté par un membre de la commission ?"
            bulle={
              <>
                Chaque membre de la commission a un <strong>nombre de places</strong> pour le quota (fixé par le DG dans « Membres de la commission »). Si ce
                dossier vient d’un membre, choisissez-le : sa place est comptée. Sinon, laissez « Non ».
              </>
            }
            aide={
              membres.donnees && !membres.donnees.length
                ? `Aucun membre enregistré pour le quota ${v.quota}`
                : membre
                  ? `${placesPrises} / ${membre.places} place(s) déjà utilisée(s) — ce dossier sera le ${placesPrises + 1}e`
                  : undefined
            }
            className="md:col-span-2"
          >
            <Liste
              value={v.membreCommissionId}
              disabled={!membres.donnees?.length}
              onChange={(e) => maj("membreCommissionId", e.target.value)}
              vide="— Non —"
              options={(membres.donnees ?? []).map((m) => {
                const prises = m.saisis - (fiche?.membreCommissionId === m.id ? 1 : 0);
                return {
                  valeur: m.id,
                  libelle: `${m.nom}${m.fonction ? ` (${m.fonction})` : ""} — ${prises} / ${m.places} places utilisées${prises >= m.places ? " · COMPLET" : ""}`,
                };
              })}
            />
            {membre && <Jauge valeur={placesPrises} max={membre.places} />}
          </Champ>
        )}
        <ChampOrigine
          valeur={v.origineBrute}
          changer={(x) => maj("origineBrute", x)}
          membre={membre?.nom ?? null}
          departement={refs.departements.find((d) => String(d.id) === v.departementId)?.nom ?? null}
        />
        {meppsa && (
          <QuotaBeneficiaire
            quota={v.quota}
            cycle={regle?.cycle ?? null}
            origine={v.origineBrute}
            viaMembre={!!v.membreCommissionId}
            ficheId={fiche?.id}
            version={succes}
          />
        )}
        {membre && placesPrises >= membre.places && (
          <div className="md:col-span-2 xl:col-span-4">
            <Alerte ton="jaune">
              Les <strong>{membre.places} place(s)</strong> de {membre.nom} sont déjà toutes utilisées. Vous pouvez enregistrer quand même : le dépassement
              apparaîtra dans « Membres de la commission » pour le DG.
            </Alerte>
          </div>
        )}
      </div>

      {memeNaissance.length > 0 ? (
        <Alerte ton="rouge">
          <div className="font-semibold">Cette personne semble déjà enregistrée (même date de naissance, nom identique ou écrit un peu autrement) :</div>
          <ListeDoublons liste={memeNaissance} />
        </Alerte>
      ) : (
        doublons.length > 0 && (
          <Alerte ton="jaune">
            <div className="font-semibold">Personnes qui ressemblent (un prénom de plus ou de moins, autre ordre, faute de frappe…) — vérifiez qu’il ne s’agit pas de la même personne :</div>
            <ListeDoublons liste={doublons} />
          </Alerte>
        )
      )}
      <Annonce ton="rouge" fermer={() => setErreur(null)}>
        {erreur}
      </Annonce>
      <Annonce fermer={() => setSucces(null)}>{succes}</Annonce>

      <div className="flex justify-end gap-2">
        {annuler ? (
          <Bouton type="button" onClick={annuler}>
            Annuler
          </Bouton>
        ) : (
          <Bouton type="button" onClick={() => setV((s) => ({ ...valeursDe(), feuille: s.feuille, quota: s.quota }))}>
            Effacer
          </Bouton>
        )}
        <Bouton variante="principal" type="submit" disabled={envoi}>
          {envoi ? "Enregistrement…" : fiche ? "Enregistrer les modifications" : "Enregistrer la fiche"}
        </Bouton>
      </div>

      <Modale titre="Enregistrer malgré tout ?" ouverte={confirmer} fermer={() => setConfirmer(false)}>
        <p className="text-[13px] leading-relaxed text-zinc-600">
          Une personne née le même jour, avec un nom identique ou presque, est déjà dans la base. Enregistrez seulement si vous êtes sûr qu’il s’agit d’une autre personne (homonyme).
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Bouton type="button" onClick={() => setConfirmer(false)}>
            Annuler
          </Bouton>
          <Bouton type="button" variante="principal" onClick={() => enregistrer(null, true)}>
            C’est une autre personne : enregistrer
          </Bouton>
        </div>
      </Modale>
    </form>
  );
}

function cycleLisible(c: string) {
  return { PRESCOLAIRE: "Préscolaire", PRIMAIRE: "Primaire", COLLEGE: "Collège", LYCEE: "Lycée", ADMINISTRATION: "Administration" }[c] ?? c;
}

function ListeDoublons({ liste }: { liste: Doublon[] }) {
  return (
    <ul className="mt-1.5 space-y-0.5 text-[12px]">
      {liste.map((d) => (
        <li key={d.id}>
          <strong>{d.nomComplet}</strong> — né(e) le {dateCourte(d.dateNaissance)} · {d.diplome ?? "—"} · {d.departement ?? "—"}
          {d.memeNaissance ? " · même date de naissance" : ""}
          {d.niveau === "PROBABLE" ? " · nom très proche" : " · noms en partie communs"}
          {d.feuille === "QUOTA_AUTRES" ? " · quota Autres" : ""}
          {d.ancien ? ` · déjà recruté(e)${d.ancien.annee ? ` en ${d.ancien.annee}` : " une année précédente"} (${d.ancien.source})` : ""}
          {d.lot ? ` · texte reçu (${d.lot})` : ""}
        </li>
      ))}
    </ul>
  );
}

/* --------------------------- Contrôle et renvoi --------------------------- */

function ControleFiche({ fiche, fermer, apres }: { fiche: Fiche; fermer: () => void; apres: (texte: string) => void }) {
  const [aCorriger, setACorriger] = useState(false);
  const [remarque, setRemarque] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);

  async function decider(conforme: boolean) {
    try {
      await api.post(`/candidats/${fiche.id}/controle`, { conforme, remarque: conforme ? undefined : remarque });
      apres(conforme ? `Fiche de ${fiche.nomComplet} contrôlée : elle attend maintenant la validation du DGRHAS.` : `Fiche de ${fiche.nomComplet} renvoyée pour correction.`);
    } catch (e) {
      setErreur((e as Error).message);
    }
  }

  const lignes: [string, React.ReactNode][] = [
    ["Nom et prénoms", fiche.nomComplet],
    ["Date de naissance", `${dateCourte(fiche.dateNaissance)}${fiche.ageAuDepot !== null ? ` (${fiche.ageAuDepot} ans au dépôt du ${dateCourte(fiche.dateDepot)})` : ""}`],
    ["Lieu de naissance", fiche.lieuNaissance ?? "—"],
    ["Diplôme", fiche.diplomeBrut ?? "—"],
    ["Cycle, grade, catégorie", `${fiche.cycle ?? "—"} · ${fiche.grade ? (fiche.contractuel ? `${fiche.grade.replace(/\.+$/, "")}.C.` : fiche.grade) : "à définir"} · cat. ${fiche.categorie ?? "?"}${fiche.contractuel ? " (contractuel)" : ""}`],
    ["Département · lieu de service", `${fiche.departement?.nom ?? "—"}${fiche.lieuServiceBrut ? ` · ${fiche.lieuServiceBrut}` : ""}`],
    ["Liste", fiche.feuille === "QUOTA_AUTRES" ? "Quota « Autres »" : `MEPPSA · quota ${fiche.quota} · n° d’ordre ${fiche.numeroOrdre}`],
    ["Statut · lot", [fiche.statut, fiche.lotCommission].filter(Boolean).join(" · ") || "—"],
    ["Origine du dossier", fiche.origineBrute ?? "—"],
    ["Observation", fiche.observation ?? "—"],
    ["Saisie par", fiche.saisiePar ?? "—"],
  ];

  return (
    <Modale titre="Contrôler la fiche" ouverte fermer={fermer}>
      <p className="mb-4 text-[13px] leading-relaxed text-zinc-500">
        Comparez chaque ligne avec le <strong>dossier papier</strong> du candidat (pièce d’identité, acte de naissance, diplôme).
      </p>
      {fiche.anomalies.length > 0 && (
        <div className="mb-3">
          <Alerte>À compléter : {fiche.anomalies.join(", ")}.</Alerte>
        </div>
      )}
      <dl className="divide-y divide-zinc-100 rounded-2xl bg-zinc-50 px-4 text-[13px]">
        {lignes.map(([k, val]) => (
          <div key={k} className="flex gap-4 py-2">
            <dt className="w-40 shrink-0 text-zinc-400">{k}</dt>
            <dd className="font-medium">{val}</dd>
          </div>
        ))}
      </dl>
      {aCorriger && (
        <Champ libelle="Ce qu’il faut corriger" className="mt-4">
          <Zone autoFocus value={remarque} onChange={(e) => setRemarque(e.target.value)} placeholder="Ex. la date de naissance ne correspond pas à l’acte" />
        </Champ>
      )}
      {erreur && (
        <div className="mt-3">
          <Alerte>{erreur}</Alerte>
        </div>
      )}
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Bouton onClick={fermer}>Fermer</Bouton>
        {aCorriger ? (
          <Bouton variante="danger" onClick={() => decider(false)}>
            Renvoyer pour correction
          </Bouton>
        ) : (
          <Bouton variante="danger" onClick={() => setACorriger(true)}>
            Il y a une erreur
          </Bouton>
        )}
        {!aCorriger && (
          <Bouton variante="principal" onClick={() => decider(true)}>
            <CheckCircle2 /> Conforme au dossier
          </Bouton>
        )}
      </div>
    </Modale>
  );
}

function Renvoi({ fiche, fermer, apres }: { fiche: Fiche; fermer: () => void; apres: () => void }) {
  const [remarque, setRemarque] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  return (
    <Modale titre={`Renvoyer la fiche de ${fiche.nomComplet}`} ouverte fermer={fermer}>
      <Champ libelle="Ce qu’il faut corriger">
        <Zone autoFocus value={remarque} onChange={(e) => setRemarque(e.target.value)} placeholder="Ex. remplacer le BAC par le BEPC" />
      </Champ>
      {erreur && (
        <div className="mt-3">
          <Alerte>{erreur}</Alerte>
        </div>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <Bouton onClick={fermer}>Annuler</Bouton>
        <Bouton
          variante="danger"
          onClick={async () => {
            try {
              await api.post(`/candidats/${fiche.id}/controle`, { conforme: false, remarque });
              apres();
            } catch (e) {
              setErreur((e as Error).message);
            }
          }}
        >
          <Scale /> Renvoyer pour correction
        </Bouton>
      </div>
    </Modale>
  );
}

/** Remplissage du lot choisi : de 0 au nombre configuré (Paramètres). */
function RemplissageLot({ n, taille, lot, nouveau }: { n: number; taille: number; lot?: EtatLots["lots"][number]; nouveau: boolean }) {
  const plein = n >= taille;
  return (
    <div className="space-y-1 pt-0.5">
      <Jauge valeur={n} max={taille} />
      <div className="flex flex-wrap justify-between gap-x-3 text-[11px]">
        <span className={plein ? "font-semibold text-rouge-600" : "text-zinc-500"}>
          {nouveau ? "Nouveau lot : vide" : `${n} / ${taille} dossiers`}
          {lot?.nature === "MIXTE" && !nouveau ? ` (${lot.volontaires} vol., ${lot.communautaires} comm.)` : ""}
        </span>
        <span className={plein ? "font-semibold text-rouge-600" : "text-zinc-500"}>
          {plein ? "Lot plein : choisissez un nouveau lot" : `ce candidat sera le ${n + 1}e · reste ${taille - n - 1} place(s) après lui`}
        </span>
      </div>
    </div>
  );
}

const francs = (n: number) => `${nf.format(Math.round(n))} F`;

/** Calcul commun : déjà engagé, cet envoi, encore en saisie, dépassement. */
function chiffresBudget(d: BudgetQuota, misAPart = 0) {
  const etape = (e: string) => d.etapes.find((x) => x.etape === e)?.annuel ?? 0;
  const deja = etape("ENVOYEE") + etape("TEXTE_RECU");
  const envoi = d.pretes.annuel - misAPart;
  const apres = deja + envoi;
  const enCours = Math.max(0, etape("SAISIE") - d.pretes.annuel);
  const depasse = d.enveloppe ? apres - d.enveloppe : 0;
  const moyen = d.pretes.effectif ? d.pretes.annuel / d.pretes.effectif : 0;
  return { deja, envoi, apres, enCours, depasse, aRetirer: depasse > 0 && moyen ? Math.ceil(depasse / moyen) : 0 };
}

/** Bandeau du DG : ce que coûtera l'envoi d'un quota, comparé à son enveloppe annuelle. */
function BudgetEnvoi({ quota, tour, compact, mettreApart }: { quota: number; tour?: number; compact?: boolean; mettreApart: () => void }) {
  const b = useApi<BudgetQuota>(`/pilotage/budget/${quota}`);
  const { recharger } = b;
  useEffect(() => {
    if (tour) recharger();
  }, [tour, recharger]);
  const d = b.donnees;
  if (!d) return compact ? null : <div className="rounded-2xl bg-zinc-50 px-4 py-3 text-[12px] text-zinc-400">Budget du quota {quota}…</div>;
  const c = chiffresBudget(d);
  const env = d.enveloppe;

  if (compact)
    return (
      <div className={`mt-1 text-[12px] ${c.depasse > 0 ? "font-semibold text-rouge-600" : "text-zinc-500"}`}>
        {env
          ? c.depasse > 0
            ? `Budget dépassé de ${francs(c.depasse)} par an après cet envoi. `
            : `Budget : ${francs(c.apres)} sur ${francs(env)} par an après cet envoi.`
          : "Aucune enveloppe fixée pour ce quota."}
        {c.depasse > 0 && (
          <button type="button" className="underline" onClick={mettreApart}>
            Choisir les dossiers à mettre à part
          </button>
        )}
      </div>
    );

  const echelle = Math.max(env ?? 0, c.apres) || 1;
  return (
    <div className={`space-y-3 rounded-2xl px-4 py-3 ring-1 ${c.depasse > 0 ? "bg-rouge-100/60 ring-rouge-600/30" : "bg-white ring-zinc-200"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[13px] font-semibold text-encre">
          <Scale className="size-4" /> Budget du quota {quota} (par an)
          <Aide>
            Le même calcul que le « Pilotage budgétaire » : salaire brut de chaque dossier (indice de son grade × valeur du point, plus les primes) × 12 mois.
            <br />
            <strong>Déjà engagé</strong> = dossiers déjà envoyés à la FP (texte attendu ou reçu). <strong>Cet envoi</strong> = les fiches validées de ce quota,
            prêtes à partir. Les fiches encore en saisie ou en contrôle sont montrées à part.
          </Aide>
        </div>
        <Bouton variante={c.depasse > 0 ? "danger" : "secondaire"} className="px-3! py-1.5!" onClick={mettreApart}>
          Mettre des dossiers à part pour le quota {quota + 1}
        </Bouton>
      </div>
      <div className="relative h-3 overflow-hidden rounded-full bg-zinc-200">
        <div className="absolute inset-y-0 left-0 bg-marque-700" style={{ width: `${(c.deja / echelle) * 100}%` }} />
        {/* Cet envoi : jaune dans l'enveloppe, rouge au-delà */}
        <div className="absolute inset-y-0 bg-or-400" style={{ left: `${(c.deja / echelle) * 100}%`, width: `${((Math.min(c.apres, env ?? c.apres) - c.deja) / echelle) * 100}%` }} />
        {env && c.apres > env && (
          <>
            <div className="absolute inset-y-0 bg-rouge-600" style={{ left: `${(Math.max(env, c.deja) / echelle) * 100}%`, right: 0 }} />
            <div className="absolute inset-y-0 w-0.5 bg-encre" style={{ left: `${(env / echelle) * 100}%` }} title="Limite de l’enveloppe" />
          </>
        )}
      </div>
      <div className="grid gap-x-6 gap-y-1 text-[12px] text-zinc-600 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          Enveloppe : <strong className="text-encre">{env ? francs(env) : "non fixée"}</strong>
        </div>
        <div>
          <span className="mr-1 inline-block size-2 rounded-full bg-marque-700" />
          Déjà engagé : <strong className="text-encre">{francs(c.deja)}</strong>
        </div>
        <div>
          <span className="mr-1 inline-block size-2 rounded-full bg-or-400" />
          Cet envoi, {d.pretes.effectif} dossier(s) : <strong className="text-encre">{francs(c.envoi)}</strong>
        </div>
        <div>
          {env ? (c.depasse > 0 ? "Dépassement" : "Reste après l’envoi") : "Total après l’envoi"} :{" "}
          <strong className={c.depasse > 0 ? "text-rouge-600" : "text-marque-700"}>{env ? francs(Math.abs(env - c.apres)) : francs(c.apres)}</strong>
        </div>
      </div>
      {c.enCours > 0 && <div className="text-[11px] text-zinc-400">Encore en saisie ou en contrôle dans ce quota : {francs(c.enCours)} par an (pas compté dans cet envoi).</div>}
      {!env && (
        <div className="text-[12px] text-or-700">
          Aucune enveloppe n’est fixée pour le quota {quota} : saisissez-la dans{" "}
          <Link href="/pilotage" className="font-semibold underline">
            Pilotage budgétaire
          </Link>
          .
        </div>
      )}
      {c.depasse > 0 && (
        <div className="text-[12px] text-rouge-600">
          Si tout part, l’enveloppe est dépassée de <strong>{francs(c.depasse)}</strong> par an : il faudrait mettre à part environ{" "}
          <strong>{c.aRetirer} dossier(s)</strong>. Vous choisissez vous-même, nom par nom, ceux qui passent au quota {quota + 1}.
        </div>
      )}
    </div>
  );
}

/** Le DG coche, nom par nom, les dossiers validés qui passent au quota suivant. */
function MettreApart({ quota, fermer, apres }: { quota: number; fermer: () => void; apres: (texte: string) => void }) {
  const fiches = useApi<Fiche[]>(`/candidats${qs({ etat: "VALIDEE", quota })}`);
  const budget = useApi<BudgetQuota>(`/pilotage/budget/${quota}`);
  const [coches, setCoches] = useState<Set<string>>(new Set());
  const [filtre, setFiltre] = useState("");
  const [motif, setMotif] = useState(`Enveloppe budgétaire du quota ${quota} dépassée`);
  const [erreur, setErreur] = useState<string | null>(null);
  const annuel = (f: Fiche) => (f.salaireBrut ?? 0) * 12;
  const toutes = fiches.donnees ?? [];
  const f2 = filtre.trim().toLowerCase();
  const visibles = f2
    ? toutes.filter((f) => [f.nomComplet, f.diplomeBrut, f.lotCommission, f.departement?.nom].some((t) => t?.toLowerCase().includes(f2)))
    : toutes;
  const economie = toutes.filter((f) => coches.has(f.id)).reduce((n, f) => n + annuel(f), 0);
  const c = budget.donnees ? chiffresBudget(budget.donnees, economie) : null;
  const env = budget.donnees?.enveloppe ?? null;
  const basculer = (id: string) =>
    setCoches((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const toutesVisiblesCochees = visibles.length > 0 && visibles.every((f) => coches.has(f.id));

  return (
    <Modale titre={`Mettre des dossiers à part pour le quota ${quota + 1}`} ouverte large fermer={fermer}>
      <div className="space-y-4 text-[13px] leading-relaxed text-zinc-600">
        <p>
          Cochez les dossiers qui <strong>ne partiront pas</strong> avec le quota {quota}. Ils restent validés et passent au <strong>quota {quota + 1}</strong>{" "}
          (avec un lot et un n° d’ordre de ce quota) : ils partiront avec sa prochaine transmission. Tant qu’ils ne sont pas partis, le bouton « Remettre dans le
          quota {quota} » annule.
        </p>
        {c && (
          <div className={`rounded-2xl px-4 py-3 ${env && c.depasse > 0 ? "bg-rouge-100/60" : "bg-marque-50"}`}>
            <div className="font-semibold text-encre">
              {coches.size} dossier(s) mis à part · {francs(economie)} par an en moins
            </div>
            <div className="text-[12px]">
              Après l’envoi : {francs(c.apres)}
              {env ? ` sur ${francs(env)} — ` : ""}
              {env ? (
                c.depasse > 0 ? (
                  <strong className="text-rouge-600">encore {francs(c.depasse)} de trop (environ {c.aRetirer} dossier(s) de plus)</strong>
                ) : (
                  <strong className="text-marque-700">dans l’enveloppe, il reste {francs(-c.depasse)}</strong>
                )
              ) : (
                "aucune enveloppe fixée pour ce quota"
              )}
            </div>
          </div>
        )}
        <div className="flex flex-wrap items-end gap-3">
          <Champ libelle="Chercher (nom, diplôme, lot, département)" className="min-w-64 flex-1">
            <Saisie value={filtre} onChange={(e) => setFiltre(e.target.value)} placeholder="Ex. CFEEN, Lot 3, Pool…" />
          </Champ>
          <Bouton
            onClick={() =>
              setCoches((s) => {
                const n = new Set(s);
                for (const f of visibles) {
                  if (toutesVisiblesCochees) n.delete(f.id);
                  else n.add(f.id);
                }
                return n;
              })
            }
          >
            {toutesVisiblesCochees ? "Tout décocher" : `Tout cocher (${visibles.length})`}
          </Bouton>
        </div>
        {!fiches.donnees ? (
          <Chargement />
        ) : !toutes.length ? (
          <Vide>Aucune fiche validée du quota {quota} en attente d’envoi.</Vide>
        ) : (
          <div className="max-h-[45vh] overflow-auto rounded-2xl ring-1 ring-zinc-200">
            <Tableau>
              <thead>
                <tr>
                  <th className="w-10" />
                  <th>Candidat</th>
                  <th>Diplôme · grade</th>
                  <th>Département · lot</th>
                  <th className="text-right">Coût par an</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((f) => (
                  <tr key={f.id} className={coches.has(f.id) ? "bg-or-100/60" : ""} onClick={() => basculer(f.id)} style={{ cursor: "pointer" }}>
                    <td>
                      <input type="checkbox" className="size-4 accent-marque-500" checked={coches.has(f.id)} onChange={() => basculer(f.id)} onClick={(e) => e.stopPropagation()} />
                    </td>
                    <td className="font-medium">{f.nomComplet}</td>
                    <td>
                      {f.diplomeBrut ?? "—"}
                      <div className="text-[11px] text-zinc-400">{f.grade ?? "grade à définir"}</div>
                    </td>
                    <td>
                      {f.departement?.nom ?? "—"}
                      <div className="text-[11px] text-zinc-400">
                        {f.statut} · {f.lotCommission ?? "sans lot"}
                      </div>
                    </td>
                    <td className="text-right tabular-nums">{f.salaireBrut ? francs(annuel(f)) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </Tableau>
          </div>
        )}
        <Champ libelle="Pourquoi ? (écrit sur chaque fiche et dans le journal) *">
          <Saisie value={motif} onChange={(e) => setMotif(e.target.value)} />
        </Champ>
        {erreur && <Alerte>{erreur}</Alerte>}
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Bouton onClick={fermer}>Annuler</Bouton>
        <Bouton
          variante="principal"
          disabled={!coches.size || !motif.trim()}
          onClick={async () => {
            setErreur(null);
            try {
              const r = await api.post<{ fiches: number }>("/candidats/reporter", { ids: [...coches], motif: motif.trim() });
              apres(`${r.fiches} dossier(s) mis à part : ils passent au quota ${quota + 1} et partiront avec sa prochaine transmission.`);
            } catch (e) {
              setErreur((e as Error).message);
            }
          }}
        >
          Mettre à part ({coches.size}) pour le quota {quota + 1}
        </Bouton>
      </div>
    </Modale>
  );
}

/**
 * Origine du dossier : choisie dans la liste tenue par le DG (« Administration › Origines »),
 * ou « Autre » pour l'écrire. « DDEPPSA du département » prend le département du candidat.
 */

/**
 * La personne présentée par un membre de la commission est en général déjà dans la base du personnel
 * (volontaire ou communautaire) : on la choisit au lieu de la ressaisir. Une personne absente de la
 * base est enregistrée comme communautaire (DG, 23/10/2026).
 */
function ChercherDansLaBase({ choisie, choisir, retirer }: { choisie: string | null; choisir: (p: PersonneBase) => void; retirer: () => void }) {
  const { refs } = useSession();
  const [q, setQ] = useState("");
  const [liste, setListe] = useState<PersonneBase[] | null>(null);
  useEffect(() => {
    if (q.trim().length < 3) return;
    let actif = true;
    const t = setTimeout(() => {
      api
        .get<PersonneBase[]>(`/candidats/personnel${qs({ recherche: q })}`)
        .then((r) => actif && setListe(r))
        .catch(() => actif && setListe([]));
    }, 350);
    return () => {
      actif = false;
      clearTimeout(t);
    };
  }, [q]);
  if (choisie)
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-marque-50 px-4 py-2.5 text-[13px]">
        <BadgeCheck className="size-4 text-marque-600" />
        <span>
          Personne de la base du personnel : <strong>{choisie}</strong>. Ses informations sont reprises ; complétez le reste.
        </span>
        <button type="button" className="ml-auto text-[12px] font-medium text-marque-700 hover:underline" onClick={retirer}>
          Ne plus la lier
        </button>
      </div>
    );
  return (
    <div className="space-y-2 rounded-2xl bg-zinc-50 p-3">
      <div className="text-[12px] font-medium text-zinc-600">Chercher d’abord dans la base du personnel (volontaires et communautaires)</div>
      <Saisie value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tapez au moins 3 lettres du nom…" className="bg-white" />
      {q.trim().length >= 3 && liste && (
        <ul className="max-h-60 divide-y divide-zinc-200/60 overflow-y-auto rounded-xl bg-white text-[13px]">
          {liste.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
              <div className="min-w-0 flex-1">
                <span className="font-medium">{p.nomComplet}</span>{" "}
                <span className="text-[11px] text-zinc-500">
                  {p.numeroFiche} · {p.statut === "VOLONTAIRE" ? `volontaire, ${vagueLisible(p.vague)}` : p.statut.toLowerCase()}
                  {p.dateNaissance && ` · né(e) le ${dateCourte(p.dateNaissance)}`}
                  {p.diplome && ` · ${p.diplome}`}
                  {p.departementId && ` · ${refs.departements.find((d) => d.id === p.departementId)?.nom ?? ""}`}
                  {p.registre === "SORTI" && " · sorti du registre"}
                </span>
                {p.candidat && <div className="text-[11px] text-or-700">Déjà candidat : {p.candidat}</div>}
                {!p.presentable && <div className="text-[11px] text-rouge-600">Déjà agent de l’État : ne passe plus par la commission</div>}
              </div>
              <Bouton type="button" variante="discret" disabled={!p.presentable || !!p.candidat} onClick={() => choisir(p)}>
                Choisir
              </Bouton>
            </li>
          ))}
          {!liste.length && <li className="px-3 py-2 text-[12px] text-zinc-500">Personne de ce nom dans la base. Saisissez la fiche ci-dessous : elle sera enregistrée comme communautaire.</li>}
        </ul>
      )}
    </div>
  );
}

/** Volontaires en poste par vague : les anciennes vagues sont présentées à la Fonction Publique d’abord. */
function OrdreDesVagues({ quota, version }: { quota: string; version: string | null }) {
  const vagues = useApi<{ vague: number | null; enPoste: number; presentes: number; presentesQuota: number }[]>(`/candidats/vagues${qs({ quota, v: version ?? "" })}`);
  const l = (vagues.donnees ?? []).filter((x) => x.enPoste > 0 || x.presentes > 0);
  if (!l.length) return null;
  return (
    <div className="rounded-2xl bg-zinc-50 px-4 py-2.5 text-[12px] text-zinc-600">
      <span className="font-medium">Volontaires par vague</span> (les anciennes vagues passent d’abord) :{" "}
      {l.map((x, i) => (
        <span key={String(x.vague)}>
          {i > 0 && " · "}
          {vagueLisible(x.vague)} : {x.enPoste} en poste, {x.presentesQuota} présenté(s) dans ce quota
        </span>
      ))}
    </div>
  );
}
