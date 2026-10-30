"use client";

import { ArrowLeft, Eye, GitMerge, Paperclip, Trash2, Upload, UserCheck, X } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import {
  type AgentRecense,
  type ChampFiche,
  ChoixStructure,
  type ConfigRecensement,
  type EtapeStatut,
  estVide,
  libelleStatut,
  obligatoire,
  peutControlerAjout,
  peutRecenser,
  piecesAttendues,
  SaisieRubrique,
  type StructureCourte,
  Taux,
  useConfigRecensement,
} from "@/components/recensement/commun";
import { ProblemesFiche } from "@/components/recensement/anomalies";
import { CarteCarriere } from "@/components/recensement/carriere";
import { CarteEvaluations } from "@/components/recensement/evaluation";
import { useSession } from "@/components/session";
import { Alerte, Annonce, Badge, BoutonIcone, Bouton, Carte, Champ, Chargement, EnTete, Liste, Modale, Saisie, SaisieDate, Segments, Zone, useConfirmation } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { peut } from "@/lib/libelles";

interface Fiche {
  parcours: EtapeStatut[];
  agent: AgentRecense;
  volontaire: { id: string; statut: string; motifSortie: string | null; dateSortie: string | null; categorie: string | null; etablissement: string | null } | null;
  structure: { id: number; nom: string; sigle: string } | null;
  pieces: { id: string; type: string; nomOrigine: string; mime: string; taille: number; ligne: number | null; ajoutePar: string | null; creeLe: string }[];
  historique: { date: string; utilisateurNom: string | null; action: string; details: Record<string, unknown> | null }[];
}
interface MemePersonne {
  id: number;
  numeroFiche: string;
  statut: string;
  nomComplet: string;
  dateNaissance: string | null;
  matricule: string | null;
  lieuService: string | null;
  volontaireId: string | null;
  ressemblance: "PROBABLE" | "POSSIBLE";
  visible: boolean;
}

const ACTIONS: Record<string, string> = {
  RECENSEMENT_CREATION: "Fiche créée",
  RECENSEMENT_MODIFICATION: "Fiche modifiée",
  RECENSEMENT_PIECE: "Pièce ajoutée",
  RECENSEMENT_PIECE_RETIREE: "Pièce retirée",
  PERSONNEL_STATUT: "Changement de statut",
  PERSONNEL_CONTENTIEUX: "Décision du DG (agent ajouté au recensement)",
  PERSONNEL_CONTENTIEUX_CONTROLE: "Avis du bureau du contrôle (agent ajouté au recensement)",
  PERSONNEL_FUSION: "Fusion avec une autre fiche",
  PERSONNEL_DISTINCTS: "Déclarée différente d’une autre fiche",
  PERSONNEL_RECRUTE_FP: "Recruté à la Fonction Publique",
};
const dateFr = (d: string | null | undefined) => (d ? d.slice(0, 10).split("-").reverse().join("/") : "");
/** Contrôles fixes du serveur (pas dans les règles de cohérence réglables). */
const REGLES_FIXES: Record<string, string> = {
  "REGLE:INTEGRATION_PAR_ARRETE": "Fonctionnaire entré par une note de service : son texte d’intégration est un arrêté ou un décret",
};
/** Cases par ligne d'une section (classes écrites en entier pour Tailwind). */
const GRILLES: Record<number, string> = {
  1: "grid gap-4",
  2: "grid gap-4 sm:grid-cols-2",
  3: "grid gap-4 sm:grid-cols-2 xl:grid-cols-3",
  4: "grid gap-4 sm:grid-cols-2 xl:grid-cols-4",
  5: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
  6: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6",
};

/** Fiche de renseignements d'un agent : saisie, pièces justificatives et historique. */
export function VueFiche() {
  const { id } = useParams<{ id: string }>();
  const nouveau = id === "nouveau";
  const fiche = useApi<Fiche>(nouveau ? null : `/recensement/agents/${id}`);
  const config = useConfigRecensement();
  const structures = useApi<StructureCourte[]>("/recensement/structures");
  const { profil } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  // « Enregistrer et fiche suivante » : nouveau formulaire vide, avec la fiche enregistrée rappelée
  const precedente = params.get("cree");
  // Ajout depuis la page Recensement : agent absent de la base, qui part au contrôle puis au DG
  const ajout = nouveau && params.get("recensement") === "1";
  // Fiche complétée depuis la page Recensement : ses modifications partent au contrôle
  const viaRecensement = !nouveau && params.get("recensement") === "1";

  const c = config.donnees?.configuration;
  if (!peutRecenser(profil.role)) return <Alerte>Accès réservé aux agents de la DGRHAS, aux DDEPPSA et aux chefs d’établissement.</Alerte>;
  if (fiche.erreur) return <Alerte>{fiche.erreur}</Alerte>;
  if (!c || !structures.donnees || (!nouveau && !fiche.donnees)) return <Chargement />;
  return (
    <Formulaire
      c={c}
      precedente={nouveau ? precedente : null}
      ajout={ajout}
      viaRecensement={viaRecensement}
      nomPropose={nouveau ? (params.get("nom") ?? "") : ""}
      structurePropose={nouveau ? (params.get("structure") ?? "") : ""}
      corriger={nouveau ? null : params.get("corriger")}
      key={nouveau ? `nouveau-${params.get("t") ?? ""}` : `${fiche.donnees!.agent.id}-${fiche.donnees!.agent.modifieLe}`}
      fiche={nouveau ? null : fiche.donnees}
      structures={structures.donnees}
      recharger={fiche.recharger}
      apresCreation={(a, suivant) =>
        suivant
          ? router.replace(`/personnel/agents/nouveau?t=${Date.now()}&cree=${encodeURIComponent(`${a.nomComplet} (${a.numeroFiche})`)}`)
          : router.replace(`/personnel/agents/${a.id}`)
      }
      apresSuppression={() => router.push(ajout ? "/recensement" : "/personnel/agents")}
    />
  );
}

function Formulaire({
  c,
  precedente,
  ajout = false,
  viaRecensement = false,
  nomPropose = "",
  structurePropose = "",
  corriger = null,
  fiche,
  structures,
  recharger,
  apresCreation,
  apresSuppression,
}: {
  c: ConfigRecensement;
  precedente?: string | null;
  ajout?: boolean;
  /** Ouverte depuis le Recensement : les modifications partent au contrôle (DG, 30/10/2026). */
  viaRecensement?: boolean;
  nomPropose?: string;
  /** Nouvelle fiche ouverte depuis une structure (Structures administratives › « Enregistrer un agent ici »). */
  structurePropose?: string;
  /** Ouverte depuis « Corriger » (Base du personnel › anomalies) : le problème à corriger. */
  corriger?: string | null;
  fiche: Fiche | null;
  structures: StructureCourte[];
  recharger: () => void;
  apresCreation: (a: AgentRecense, suivant: boolean) => void;
  apresSuppression: () => void;
}) {
  const { profil, refs } = useSession();
  const a = fiche?.agent ?? null;
  const statuts = c.statuts.filter((s) => s.actif || s.code === a?.statut);
  const [statut, setStatut] = useState(a?.statut ?? statuts[0]?.code ?? "");
  const [structureId, setStructureId] = useState<string>(String(a?.structureId ?? (profil.role === "STRUCTURE" ? (profil.structureId ?? "") : structurePropose)));
  const [d, setD] = useState<Record<string, unknown>>(() => ({ ...(a?.donnees ?? (nomPropose.trim() ? { NOMS_PRENOMS: nomPropose.trim() } : {})) }));
  const [verifier, setVerifier] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [doublon, setDoublon] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [horsBase, setHorsBase] = useState(ajout);
  // Actes de naissance choisis avant l'enregistrement de la fiche (par n° de ligne d'enfant) : envoyés juste après
  const [actesEnAttente, setActesEnAttente] = useState<Record<number, File>>({});
  const [confirmation, demander] = useConfirmation();
  const central = !["DDEPPSA", "STRUCTURE"].includes(profil.role);
  const modifie = !a || statut !== a.statut || structureId !== String(a.structureId ?? "") || JSON.stringify(d) !== JSON.stringify(a.donnees);

  const champs = c.champs.filter((x) => x.actif);
  const manquants = champs.filter((ch) => obligatoire(ch, statut, d) && estVide(nettoyer(ch, d[ch.code])));

  /** Envoie les actes choisis avant l'enregistrement ; rend le nombre d'envois manqués. */
  async function envoyerActes(id: number) {
    let echecs = 0;
    for (const [ligne, f] of Object.entries(actesEnAttente)) {
      const fd = new FormData();
      fd.append("type", "ACTE_NAISSANCE_ENFANT");
      fd.append("ligne", ligne);
      fd.append("fichier", f);
      try {
        await api.post(`/recensement/agents/${id}/pieces`, fd);
      } catch {
        echecs++;
      }
    }
    setActesEnAttente({});
    return echecs;
  }

  async function enregistrer(suivant = false, forcer = false) {
    setErreur(null);
    setVerifier(true);
    if (estVide(nettoyer(champs.find((x) => x.code === "NOMS_PRENOMS")!, d.NOMS_PRENOMS))) {
      setErreur("Écrivez au moins les noms et prénoms de l’agent.");
      return;
    }
    setEnvoi(true);
    try {
      const donnees = Object.fromEntries(champs.map((ch) => [ch.code, nettoyer(ch, d[ch.code]) ?? null]));
      const corps = { statut, structureId: structureId ? Number(structureId) : null, donnees, forcer, ...(a ? { recensement: viaRecensement } : { contentieux: horsBase }) };
      if (a) {
        await api.put(`/recensement/agents/${a.id}`, corps);
        const echecs = await envoyerActes(a.id);
        setMessage(viaRecensement && !a.contentieux ? "Fiche enregistrée. Les modifications partent au bureau du contrôle." : "Fiche enregistrée.");
        if (echecs) setErreur(`Fiche enregistrée, mais ${echecs} acte(s) de naissance n’ont pas pu être envoyés : déposez-les de nouveau sur la ligne de l’enfant.`);
        setDoublon(null);
        recharger();
      } else {
        const cree = await api.post<AgentRecense>("/recensement/agents", corps);
        // Un acte non envoyé : on reste sur la fiche créée, où il apparaît à déposer
        const echecs = await envoyerActes(cree.id);
        apresCreation(cree, suivant && !echecs);
      }
    } catch (x) {
      const m = (x as Error).message;
      if (m.startsWith("Déjà recensé")) setDoublon(m);
      else setErreur(m);
    } finally {
      setEnvoi(false);
    }
  }

  // Écoles, inspections, DDEPPSA, mais aussi directions et services (le personnel administratif)
  const structuresProposees = structures.filter((s) => profil.role === "STRUCTURE" || s.type !== "MINISTERE" || String(s.id) === structureId);

  return (
    <div className="space-y-6 pb-24">
      <div>
        <Link href={ajout || viaRecensement || a?.contentieux ? "/recensement" : "/personnel/agents"} className="inline-flex items-center gap-1 text-xs font-medium text-marque-700 hover:underline">
          <ArrowLeft className="size-3.5" /> {ajout || viaRecensement || a?.contentieux ? "Recensement" : "Base du personnel"}
        </Link>
      </div>
      <EnTete
        titre={a ? a.nomComplet : "Nouvelle fiche de renseignements"}
        sousTitre={
          a
            ? `Fiche ${a.numeroFiche}, créée le ${new Date(a.creeLe).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).replace(" ", " à ")} · ${libelleStatut(c, a.statut)} · saisie par ${a.creePar ?? "—"}${a.source === "IMPORT" ? " (import Excel)" : ""}, modifiée par ${a.modifiePar ?? "—"}`
            : "Les rubriques marquées * sont obligatoires pour ce type d’agent. Vous pouvez enregistrer une fiche incomplète : ce qui manque reste signalé jusqu’à ce qu’il soit fourni."
        }
        actions={
          a && (
            <div className="flex items-center gap-3">
              {/* Agent ajouté au recensement : pas de demande avant son acceptation dans la base */}
              {!a.contentieux || a.contentieux.etat === "CONFIRME" ? (
                <Link href={`/demandes/nouvelle?agent=${a.id}`} className="text-[13px] font-medium text-marque-700 hover:underline">
                  Déposer une demande de prestation
                </Link>
              ) : (
                <span className="text-[12px] text-zinc-400" title="L’agent doit d’abord être contrôlé, puis accepté dans la base par le DG.">
                  Demandes possibles après l’acceptation dans la base
                </span>
              )}
              <Taux taux={a.taux} complet={a.complet} />
            </div>
          )
        }
      />
      <Annonce fermer={() => setMessage(null)}>{message}</Annonce>
      {precedente && <Alerte ton="vert">Fiche de {precedente} enregistrée. Saisissez l’agent suivant.</Alerte>}
      {viaRecensement && a && !a.contentieux && (
        <Alerte ton="bleu">
          <strong>Complément au recensement.</strong> Ce que vous changez est appliqué tout de suite et part au <strong>bureau du contrôle</strong>, avec l’ancienne et la nouvelle
          valeur : il valide, ou rejette et la fiche reprend ses anciennes valeurs.
        </Alerte>
      )}
      {ajout && (
        <Alerte ton="bleu">
          <strong>Ajout d’un agent absent de la base.</strong> Remplissez ce que vous savez, puis enregistrez : la fiche part au <strong>bureau du contrôle</strong>, puis au{" "}
          <strong>DG</strong>, qui l’accepte dans la base ou la rejette. Si le système vous dit qu’un agent semblable existe déjà, ouvrez sa fiche pour la compléter au lieu d’en créer une
          deuxième.
        </Alerte>
      )}

      {/* Agent ajouté au recensement : contrôle puis décision du DG, avant tout le reste */}
      {a?.contentieux && fiche && (
        <div id="bloc-contentieux" className="scroll-mt-24 transition-shadow">
          <Contentieux fiche={fiche} recharger={recharger} />
        </div>
      )}
      {/* Les problèmes de la fiche, chacun avec « Corriger » qui mène à l'endroit où il se règle */}
      {a && <ProblemesFiche c={c} agent={a} corriger={corriger} />}
      {a && !a.complet && (
        <Alerte ton="jaune">
          <strong>À compléter :</strong>{" "}
          {[
            ...(a.manques.champs ?? []).map((k) => c.champs.find((x) => x.code === k)?.libelle ?? k),
            ...(a.manques.pieces ?? []).map((p) => `${c.pieces.find((x) => x.code === p.code)?.libelle ?? p.code}${p.manque > 1 ? ` (${p.manque})` : ""} — pièce`),
          ].join(" · ")}
        </Alerte>
      )}
      {a && !!a.manques.aVerifier?.length && (
        <Alerte ton="bleu">
          <strong>À vérifier :</strong>{" "}
          {a.manques.aVerifier
            .map((k) =>
              k.startsWith("REGLE:")
                ? (c.regles.find((r) => `REGLE:${r.code}` === k)?.libelle ?? REGLES_FIXES[k] ?? k)
                : `« ${c.champs.find((x) => x.code === k)?.libelle ?? k} » : valeur hors liste`,
            )
            .join(" · ")}
        </Alerte>
      )}


      {a && fiche?.volontaire && (
        <Alerte ton="bleu">
          <strong>Volontaire du registre de l’enrôlement</strong> ({fiche.volontaire.statut === "EN_POSTE" ? "en poste, payé en bourse" : `sorti du registre${fiche.volontaire.dateSortie ? ` le ${fiche.volontaire.dateSortie.split("-").reverse().join("/")}` : ""}`}). Le département, l’établissement, la note et le téléphone suivent le registre tant que vous ne les corrigez pas ici.{" "}
          <Link href="/enrolement/volontaires" className="font-semibold underline">
            Voir le registre
          </Link>
        </Alerte>
      )}
      <Carte titre="Type d’agent et rattachement">
        <div className="space-y-4">
          <Segments valeur={statut} changer={setStatut} options={statuts.map((s) => ({ valeur: s.code, libelle: s.libelle }))} />
          {a && statut !== a.statut && (
            <p className="text-[12px] text-or-700">
              Le statut passera de « {libelleStatut(c, a.statut)} » à « {libelleStatut(c, statut)} » à l’enregistrement. Pour une intégration (texte de la FP), préférez « Changer de statut » plus bas : la date et le texte
              y sont gardés.
            </p>
          )}
          <div className="max-w-2xl">
            <div className="mb-1.5 text-xs font-medium text-zinc-500">Établissement ou structure de rattachement</div>
            <ChoixStructure
              structures={structuresProposees}
              valeur={structureId}
              changer={setStructureId}
              desactive={profil.role === "STRUCTURE" && structuresProposees.length <= 1}
              vide={profil.role === "STRUCTURE" ? null : "Aucune"}
            />
            <p className="mt-1 text-[11px] text-zinc-400">
              {profil.role === "STRUCTURE"
                ? "Les agents que vous recensez sont rattachés à votre établissement."
                : "Choisie dans l’organigramme : le lieu de service, l’inspection, le département et la localité de la fiche en sont repris. Si l’école n’y est pas encore, laissez vide et écrivez le lieu de service plus bas."}
            </p>
          </div>
          {!a && central && (
            <label className="flex items-start gap-2 text-[13px]">
              <input type="checkbox" className="mt-0.5 size-4 accent-marque-600" checked={horsBase} onChange={(e) => setHorsBase(e.target.checked)} />
              <span>
                Agent rencontré au recensement mais <strong>absent de la base</strong> : la fiche part au bureau du contrôle, puis au DG qui l’accepte ou la rejette.
              </span>
            </label>
          )}
          {!a && !central && c.contentieuxHorsBase !== false && (
            <p className="text-[12px] text-zinc-500">Un agent que vous ajoutez ici n’est pas dans la base de la DGRHAS : sa fiche part au bureau du contrôle, puis au DG qui l’accepte ou la rejette.</p>
          )}
        </div>
      </Carte>

      {c.sections.map((sec) => {
        const liste = champs.filter((ch) => ch.section === sec.code);
        if (!liste.length) return null;
        return (
          <Carte key={sec.code} titre={sec.libelle}>
            <div className={GRILLES[sec.colonnes ?? 3] ?? GRILLES[3]}>
              {liste.map((ch) => {
                const requis = obligatoire(ch, statut, d);
                return (
                  <SaisieRubrique
                    key={ch.code}
                    ch={ch}
                    valeur={d[ch.code]}
                    changer={(v) => {
                      // Une ligne d'enfant supprimée décale les suivantes : les actes choisis sont à rechoisir
                      if (ch.code === "ENFANTS" && (Array.isArray(v) ? v.length : 0) < (Array.isArray(d.ENFANTS) ? d.ENFANTS.length : 0)) setActesEnAttente({});
                      setD((x) => ({ ...x, [ch.code]: v }));
                    }}
                    requis={requis}
                    manquant={verifier && requis && estVide(nettoyer(ch, d[ch.code]))}
                    departementId={refs.departements.find((x) => x.code === d.DEPARTEMENT)?.id ?? null}
                    extraLigne={
                      ch.code === "ENFANTS" && c.pieces.some((p) => p.code === "ACTE_NAISSANCE_ENFANT" && p.actif)
                        ? (i) => (
                            <ActeEnfant
                              fiche={fiche}
                              ligne={i + 1}
                              differe={!a || modifie}
                              enAttente={actesEnAttente[i + 1] ?? null}
                              choisir={(f) =>
                                setActesEnAttente((x) => {
                                  const y = { ...x };
                                  if (f) y[i + 1] = f;
                                  else delete y[i + 1];
                                  return y;
                                })
                              }
                              recharger={recharger}
                            />
                          )
                        : undefined
                    }
                  />
                );
              })}
            </div>
          </Carte>
        );
      })}

      {a && <Pieces c={c} fiche={fiche!} statut={statut} donnees={d} recharger={recharger} />}

      {a && <Parcours c={c} fiche={fiche!} recharger={recharger} />}

      {a && (
        <div id="bloc-carriere" className="scroll-mt-24 transition-shadow">
          <CarteCarriere
            c={c}
            agentId={a.id}
            peutModifier={peut.traiter(profil.role)}
            departementId={refs.departements.find((x) => x.code === d.DEPARTEMENT)?.id ?? null}
            attente={modifie ? "Enregistrez d’abord les modifications de la fiche." : null}
            apres={recharger}
          />
        </div>
      )}

      {a && <CarteEvaluations agentId={a.id} nom={a.nomComplet} />}

      {a && (
        <div id="bloc-memes" className="scroll-mt-24 transition-shadow">
          <MemesPersonnes c={c} agent={a} recharger={recharger} />
        </div>
      )}

      {a && !!fiche!.historique.length && (
        <Carte titre="Historique">
          <ul className="space-y-1.5 text-[12px] text-zinc-600">
            {fiche!.historique.map((h, i) => (
              <li key={i}>
                <span className="text-zinc-400">{new Date(h.date).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</span> · {ACTIONS[h.action] ?? h.action}
                {h.utilisateurNom && ` par ${h.utilisateurNom}`}
                {Array.isArray(h.details?.champs) && !!(h.details.champs as string[]).length && ` : ${(h.details.champs as string[]).join(", ")}`}
                {typeof h.details?.piece === "string" && ` : ${c.pieces.find((p) => p.code === h.details!.piece)?.libelle ?? h.details.piece}`}
              </li>
            ))}
          </ul>
        </Carte>
      )}

      {/* Barre d'enregistrement, toujours visible */}
      <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-2xl bg-white/95 px-5 py-3 shadow-lg ring-1 ring-zinc-200 backdrop-blur">
        <div className="min-w-0 flex-1 text-[12px]">
          {erreur ? (
            <span className="font-medium text-rouge-600">{erreur}</span>
          ) : manquants.length ? (
            <span className="text-or-700">
              {manquants.length} rubrique(s) obligatoire(s) vide(s){verifier ? " (en rouge)" : ""} : la fiche peut être enregistrée, elle restera « à compléter ».
            </span>
          ) : (
            <span className="text-marque-700">Toutes les rubriques obligatoires sont remplies.</span>
          )}
          {doublon && (
            <div className="mt-1 text-rouge-600">
              {doublon}{" "}
              <button type="button" className="font-semibold underline" onClick={() => enregistrer(false, true)}>
                C’est une autre personne : enregistrer quand même
              </button>
            </div>
          )}
        </div>
        {a && (
          <BoutonIcone
            libelle="Supprimer la fiche"
            onClick={async () => {
              if (!(await demander(`Supprimer la fiche de ${a.nomComplet} (${a.numeroFiche}) et ses pièces ? Cette suppression est définitive.`, "Supprimer"))) return;
              try {
                await api.delete(`/recensement/agents/${a.id}`);
                apresSuppression();
              } catch (x) {
                setErreur((x as Error).message);
              }
            }}
          >
            <Trash2 />
          </BoutonIcone>
        )}
        {!a && (
          <Bouton disabled={envoi} onClick={() => enregistrer(true)}>
            Enregistrer et fiche suivante
          </Bouton>
        )}
        <Bouton variante="principal" disabled={envoi || (!!a && !modifie)} onClick={() => enregistrer(false)}>
          {a ? "Enregistrer les modifications" : "Enregistrer la fiche"}
        </Bouton>
      </div>
      {confirmation}
    </div>
  );
}

/** Valeur envoyée au serveur : lignes vides retirées, texte nettoyé. */
function nettoyer(ch: ChampFiche, v: unknown): unknown {
  if (ch.type === "TABLEAU" && Array.isArray(v)) {
    // Lignes du tableau : cases vides retirées, lignes vides retirées
    const l = v
      .map((x) =>
        x && typeof x === "object"
          ? Object.fromEntries(
              Object.entries(x as Record<string, unknown>)
                .map(([k, c]) => [k, typeof c === "string" ? c.trim() : c])
                .filter(([, c]) => c !== null && c !== undefined && c !== ""),
            )
          : String(x).trim(),
      )
      .filter((x) => (typeof x === "string" ? !!x : Object.keys(x).length > 0));
    return l.length ? l : null;
  }
  if (Array.isArray(v)) {
    const l = v.map((x) => String(x).trim()).filter(Boolean);
    return l.length ? l : null;
  }
  if (typeof v === "string") return v.trim() || null;
  return v ?? null;
}

/**
 * Acte de naissance d'un enfant, déposé sur sa ligne (DG, 24/10/2026) : il ne bloque pas la fiche,
 * il peut venir plus tard. Un nouveau scan remplace celui de cet enfant.
 */
/**
 * Acte de naissance d'un enfant, sur sa ligne. Fiche pas encore enregistrée (ou modifiée) : le fichier
 * est choisi tout de suite et envoyé à l'enregistrement de la fiche (`differe`).
 */
function ActeEnfant({
  fiche,
  ligne,
  differe,
  enAttente,
  choisir,
  recharger,
}: {
  fiche: Fiche | null;
  ligne: number;
  differe: boolean;
  enAttente: File | null;
  choisir: (f: File | null) => void;
  recharger: () => void;
}) {
  const fichier = useRef<HTMLInputElement>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const piece = fiche?.pieces.find((p) => p.type === "ACTE_NAISSANCE_ENFANT" && p.ligne === ligne);
  async function deposer(f: File) {
    if (!fiche) return;
    setErreur(null);
    setEnvoi(true);
    try {
      const fd = new FormData();
      fd.append("type", "ACTE_NAISSANCE_ENFANT");
      fd.append("ligne", String(ligne));
      fd.append("fichier", f);
      await api.post(`/recensement/agents/${fiche.agent.id}/pieces`, fd);
      recharger();
    } catch (x) {
      setErreur((x as Error).message);
    } finally {
      setEnvoi(false);
    }
  }
  return (
    <div className="flex items-center gap-1" title={erreur ?? undefined}>
      <input
        ref={fichier}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f && differe) choisir(f);
          else if (f) void deposer(f);
        }}
      />
      {enAttente ? (
        <>
          <span
            title={`${enAttente.name} : envoyé à l’enregistrement de la fiche`}
            className="inline-flex max-w-36 items-center gap-1 rounded-lg bg-or-50 px-2 py-1.5 text-[11px] font-medium whitespace-nowrap text-or-700"
          >
            <Paperclip className="size-3 shrink-0" /> <span className="truncate">Acte prêt</span>
          </span>
          <button type="button" onClick={() => choisir(null)} title="Retirer ce fichier" aria-label="Retirer ce fichier" className="rounded-lg p-1.5 text-zinc-400 hover:bg-white hover:text-rouge-600">
            <X className="size-3.5" />
          </button>
        </>
      ) : piece ? (
        <>
          <button
            type="button"
            onClick={() => api.ouvrirFichier(`/recensement/agents/${fiche!.agent.id}/pieces/${piece.id}`)}
            title={`Acte de naissance déposé : ${piece.nomOrigine}`}
            className="inline-flex items-center gap-1 rounded-lg bg-marque-50 px-2 py-1.5 text-[11px] font-medium whitespace-nowrap text-marque-700 hover:bg-marque-100"
          >
            <Paperclip className="size-3" /> Voir l’acte
          </button>
          <button
            type="button"
            disabled={envoi}
            onClick={() => fichier.current?.click()}
            title={differe ? "Remplacer l’acte par un autre scan (envoyé à l’enregistrement de la fiche)" : "Remplacer l’acte par un autre scan"}
            aria-label="Remplacer l’acte"
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-white hover:text-marque-700 disabled:opacity-50"
          >
            <Upload className="size-3.5" />
          </button>
        </>
      ) : (
        <button
          type="button"
          disabled={envoi}
          onClick={() => fichier.current?.click()}
          title={differe ? "Choisissez le scan : il sera envoyé à l’enregistrement de la fiche" : undefined}
          className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1.5 text-[11px] font-medium whitespace-nowrap text-zinc-600 ring-1 ring-zinc-200 hover:text-marque-700 disabled:opacity-50"
        >
          <Upload className="size-3" /> {envoi ? "Envoi…" : "Déposer l’acte"}
        </button>
      )}
      {erreur && <span className="text-[10px] text-rouge-600">!</span>}
    </div>
  );
}

/** Pièces justificatives : exigées (avec leur nombre), puis facultatives ; dépôt d'un scan par type. */
function Pieces({ c, fiche, statut, donnees, recharger }: { c: ConfigRecensement; fiche: Fiche; statut: string; donnees: Record<string, unknown>; recharger: () => void }) {
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [confirmation, demander] = useConfirmation();
  const fichier = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<string | null>(null);
  const attendues = piecesAttendues(c, statut, donnees);
  const a = fiche.agent;

  async function deposer(f: File) {
    if (!type) return;
    setErreur(null);
    setEnvoi(type);
    try {
      const fd = new FormData();
      fd.append("type", type);
      fd.append("fichier", f);
      await api.post(`/recensement/agents/${a.id}/pieces`, fd);
      recharger();
    } catch (x) {
      setErreur((x as Error).message);
    } finally {
      setEnvoi(null);
    }
  }

  return (
    <Carte titre="Pièces justificatives (scans)">
      <p className="-mt-2 mb-4 text-[12px] text-zinc-500">
        PDF, JPG ou PNG, 15 Mo au plus par fichier. Les pièces exigées dépendent du type d’agent et de la fiche (acte de mariage si marié(e), un acte de naissance par enfant…). Pour déposer beaucoup de scans d’un coup :{" "}
        <Link href="/personnel/import" className="font-medium text-marque-700 hover:underline">
          Recensement › scans en masse
        </Link>{" "}
        (fichiers nommés <code>{a.numeroFiche}_CNI.pdf</code>…).
      </p>
      {erreur && (
        <div className="mb-3">
          <Alerte>{erreur}</Alerte>
        </div>
      )}
      <input
        ref={fichier}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void deposer(f);
        }}
      />
      <ul className="divide-y divide-zinc-100">
        {attendues.map(({ piece, exigee, nombre }) => {
          const fournies = fiche.pieces.filter((p) => p.type === piece.code);
          const ok = exigee ? fournies.length >= nombre : true;
          return (
            <li key={piece.code} className="flex flex-wrap items-start gap-3 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-[13px] font-medium">
                  {piece.libelle}
                  {exigee ? (
                    <Badge ton={ok ? "vert" : "rouge"}>{nombre > 1 ? `${Math.min(fournies.length, nombre)} / ${nombre}` : ok ? "fournie" : "manquante"}</Badge>
                  ) : (
                    <Badge ton="gris">facultative</Badge>
                  )}
                  <span className="text-[11px] font-normal text-zinc-400">{piece.code}</span>
                </div>
                {!!fournies.length && (
                  <ul className="mt-1.5 space-y-1">
                    {fournies.map((p) => (
                      <li key={p.id} className="flex items-center gap-2 text-[12px] text-zinc-600">
                        <Paperclip className="size-3.5 text-zinc-400" />
                        {p.ligne && <span className="rounded bg-zinc-100 px-1.5 text-[11px] font-medium">enfant n° {p.ligne}</span>}
                        <span className="truncate">{p.nomOrigine}</span>
                        <span className="text-zinc-400">· {Math.round(p.taille / 1024)} Ko</span>
                        <BoutonIcone libelle="Ouvrir" onClick={() => api.ouvrirFichier(`/recensement/agents/${a.id}/pieces/${p.id}`)}>
                          <Eye />
                        </BoutonIcone>
                        <BoutonIcone
                          libelle="Retirer"
                          onClick={async () => {
                            if (!(await demander(`Retirer « ${p.nomOrigine} » ?`, "Retirer"))) return;
                            try {
                              await api.delete(`/recensement/agents/${a.id}/pieces/${p.id}`);
                              recharger();
                            } catch (x) {
                              setErreur((x as Error).message);
                            }
                          }}
                        >
                          <Trash2 />
                        </BoutonIcone>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <Bouton
                variante="discret"
                disabled={!!envoi}
                onClick={() => {
                  setType(piece.code);
                  fichier.current?.click();
                }}
              >
                <Upload /> {envoi === piece.code ? "Envoi…" : "Déposer un scan"}
              </Bouton>
            </li>
          );
        })}
      </ul>
      {confirmation}
    </Carte>
  );
}

/**
 * Agent ajouté au recensement, absent de la base : le bureau du contrôle vérifie et donne son avis,
 * puis le DG l'accepte dans la base ou le rejette. Tant que ce n'est pas fait, il ne compte nulle part.
 */
function Contentieux({ fiche, recharger }: { fiche: Fiche; recharger: () => void }) {
  const { profil } = useSession();
  const x = fiche.agent.contentieux!;
  const [action, setAction] = useState<"FAVORABLE" | "DEFAVORABLE" | "CONFIRMER" | "REJETER" | null>(null);
  const [note, setNote] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const dg = profil.role === "DG" || profil.role === "ADMIN";
  const controleur = peutControlerAjout(profil.role);
  if (x.etat === "CONFIRME" || x.etat === "REJETE")
    return (
      <Alerte ton={x.etat === "CONFIRME" ? "vert" : "rouge"}>
        <strong>{x.etat === "CONFIRME" ? "Accepté dans la base par le DG" : "Rejeté par le DG"}</strong>
        {x.decidePar && ` (${x.decidePar}, le ${dateFr(x.decideLe)})`}
        {x.note && ` : ${x.note}`}
        {x.controlePar && (
          <div className="mt-1 text-[12px]">
            Avis du contrôle : {x.avisControle === "FAVORABLE" ? "favorable" : "défavorable"} ({x.controlePar}, le {dateFr(x.controleLe)}){x.noteControle ? ` — ${x.noteControle}` : ""}
          </div>
        )}
      </Alerte>
    );
  const sansControle = x.etat === "EN_COURS";
  const noteObligatoire = action === "DEFAVORABLE" || action === "REJETER" || (action === "CONFIRMER" && sansControle);
  const titres: Record<string, string> = {
    FAVORABLE: "Avis favorable : transmettre au DG",
    DEFAVORABLE: "Avis défavorable : transmettre au DG",
    CONFIRMER: "Accepter l’agent dans la base",
    REJETER: "Rejeter l’agent",
  };
  return (
    <Alerte ton="jaune">
      <div className="space-y-3">
        <div>
          <strong>Agent ajouté au recensement, absent de la base.</strong> {x.motif}. Ajouté par {x.ouvertPar ?? "—"} le {dateFr(x.ouvertLe)}.
        </div>
        {/* Où en est la fiche : 1. contrôle, 2. décision du DG */}
        <ol className="grid gap-2 sm:grid-cols-2">
          <li className={`rounded-xl px-3 py-2 text-[12px] ${sansControle ? "bg-white font-medium" : "bg-white/60"}`}>
            <span className="font-semibold">1. Contrôle</span> (bureau du contrôle) :{" "}
            {sansControle ? "à faire" : `avis ${x.avisControle === "FAVORABLE" ? "favorable" : "défavorable"} de ${x.controlePar}, le ${dateFr(x.controleLe)}${x.noteControle ? ` — « ${x.noteControle} »` : ""}`}
          </li>
          <li className={`rounded-xl px-3 py-2 text-[12px] ${!sansControle ? "bg-white font-medium" : "bg-white/60"}`}>
            <span className="font-semibold">2. Décision du DG</span> : {sansControle ? "après le contrôle" : "à prendre"}
          </li>
        </ol>
        <div className="text-[12px]">
          Avant de décider, vérifiez les pièces et que l’agent n’est pas déjà dans la base sous un autre nom (carte « Même personne ? » plus bas : « Fusionner ici » s’il y est déjà). Tant qu’il
          n’est pas accepté, il ne compte ni dans les effectifs ni dans les besoins des écoles.
        </div>
        {sansControle && controleur && (
          <div className="flex flex-wrap gap-2">
            <Bouton variante="principal" onClick={() => setAction("FAVORABLE")}>
              <UserCheck /> Contrôlé : avis favorable
            </Bouton>
            <Bouton variante="danger" onClick={() => setAction("DEFAVORABLE")}>
              Avis défavorable
            </Bouton>
          </div>
        )}
        {dg && (
          <div className="flex flex-wrap items-center gap-2">
            <Bouton variante="principal" onClick={() => setAction("CONFIRMER")}>
              <UserCheck /> Accepter dans la base
            </Bouton>
            <Bouton variante="danger" onClick={() => setAction("REJETER")}>
              Rejeter
            </Bouton>
            {sansControle && <span className="text-[12px]">Pas encore contrôlé : si vous décidez maintenant, écrivez pourquoi.</span>}
          </div>
        )}
        {!dg && !(sansControle && controleur) && (
          <div className="text-[12px]">{sansControle ? "Le contrôle revient au bureau du contrôle (chef de service, directeur, bureau d’études)." : "La décision revient au DG."}</div>
        )}
      </div>
      <Modale titre={action ? titres[action] : ""} ouverte={!!action} fermer={() => setAction(null)}>
        <Champ libelle={noteObligatoire ? "Pourquoi (obligatoire)" : "Observation (facultative)"}>
          <Zone
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              action === "DEFAVORABLE" || action === "REJETER"
                ? "Ex. inconnu de l’établissement, pièces non conformes, déjà dans la base"
                : "Ex. pièces vues, présent à son poste, oublié lors de la constitution de la base"
            }
          />
        </Champ>
        {erreur && (
          <div className="mt-3">
            <Alerte>{erreur}</Alerte>
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Bouton onClick={() => setAction(null)}>Annuler</Bouton>
          <Bouton
            variante={action === "DEFAVORABLE" || action === "REJETER" ? "danger" : "principal"}
            chargement={envoi}
            disabled={noteObligatoire && !note.trim()}
            onClick={async () => {
              setErreur(null);
              setEnvoi(true);
              try {
                if (action === "FAVORABLE" || action === "DEFAVORABLE") await api.post(`/recensement/agents/${fiche.agent.id}/controle`, { avis: action, note });
                else await api.post(`/recensement/agents/${fiche.agent.id}/contentieux`, { decision: action, note });
                setAction(null);
                setNote("");
                recharger();
              } catch (e) {
                setErreur((e as Error).message);
              } finally {
                setEnvoi(false);
              }
            }}
          >
            Valider
          </Bouton>
        </div>
      </Modale>
    </Alerte>
  );
}

/** Statuts successifs de la même personne, et le changement de statut (intégration…). */
function Parcours({ c, fiche, recharger }: { c: ConfigRecensement; fiche: Fiche; recharger: () => void }) {
  const a = fiche.agent;
  const [ouvert, setOuvert] = useState(false);
  const autres = c.statuts.filter((s) => s.actif && s.code !== a.statut);
  const [statut, setStatut] = useState(autres.find((s) => s.code === "FONCTIONNAIRE")?.code ?? autres[0]?.code ?? "");
  const [date, setDate] = useState("");
  const [texte, setTexte] = useState("");
  const [matricule, setMatricule] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  // Statut proposé par les règles (âge à la date du texte, catégorie) tant qu'on n'a pas choisi soi-même
  const [touche, setTouche] = useState(false);
  const prevu = useApi<{ statut: string | null; explication: string }>(ouvert ? `/recensement/agents/${a.id}/statut-prevu?date=${date}` : null);
  const proposition = prevu.donnees?.statut && autres.some((s) => s.code === prevu.donnees!.statut) ? prevu.donnees.statut : null;
  const choisi = !touche && proposition && ["FONCTIONNAIRE", "CONTRACTUEL"].includes(statut) ? proposition : statut;
  const etat = ["FONCTIONNAIRE", "CONTRACTUEL"].includes(choisi);
  return (
    <Carte
      titre="Parcours (statuts successifs)"
      actions={
        <Bouton variante="discret" onClick={() => setOuvert(true)}>
          Changer de statut
        </Bouton>
      }
    >
      <p className="-mt-2 mb-3 text-[12px] text-zinc-500">
        C’est la même personne d’un bout à l’autre : un volontaire ou un communautaire qui reçoit son texte d’intégration devient fonctionnaire ou contractuel sur la même fiche. Les informations propres au nouveau statut (matricule, grade…) se complètent ensuite.
      </p>
      <ol className="space-y-1.5 text-[13px]">
        {fiche.parcours.map((e, i) => (
          <li key={i} className="flex flex-wrap items-baseline gap-2">
            <Badge ton={i === fiche.parcours.length - 1 ? "vert" : "gris"}>{libelleStatut(c, e.statut)}</Badge>
            <span className="text-zinc-600">
              {e.depuis ? `depuis le ${dateFr(e.depuis)}` : i === 0 ? "à l’entrée dans la base" : ""}
              {e.texte && ` · ${e.texte}`}
            </span>
            {e.par && <span className="text-[11px] text-zinc-400">({e.par})</span>}
          </li>
        ))}
      </ol>
      <Modale titre={`Changer le statut de ${a.nomComplet}`} ouverte={ouvert} fermer={() => setOuvert(false)}>
        <div className="space-y-3">
          <Champ libelle="Nouveau statut">
            <Liste
              value={choisi}
              onChange={(e) => {
                setStatut(e.target.value);
                setTouche(true);
              }}
              options={autres.map((s) => ({ valeur: s.code, libelle: s.libelle }))}
            />
          </Champ>
          {etat && prevu.donnees && (
            <p className={`text-[12px] ${proposition && choisi !== proposition ? "text-or-700" : "text-zinc-500"}`}>
              Selon les règles des paramètres : {prevu.donnees.explication}
              {proposition && choisi !== proposition && " Vous avez choisi un autre statut : il doit être celui écrit sur l’arrêté."}
            </p>
          )}
          <Champ libelle="Date d’effet" aide="Date du texte d’intégration (ou de la prise d’effet).">
            <SaisieDate aria-label="Date d’effet" value={date} onChange={setDate} />
          </Champ>
          <Champ libelle="Texte" aide={etat ? "Arrêté ou décret d’intégration : il remplace le texte de recrutement de la fiche." : "Note, contrat…"}>
            <Saisie value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Ex. Arrêté n° 1234 du 12/09/2026" />
          </Champ>
          {etat && (
            <Champ libelle="Matricule solde (s’il est connu)" aide="Sinon il viendra du pointage du bottin ou du recensement.">
              <Saisie value={matricule} onChange={(e) => setMatricule(e.target.value)} />
            </Champ>
          )}
          {a.statut === "VOLONTAIRE" && etat && (
            <p className="text-[12px] text-or-700">
              La bourse ne s’arrête pas ici : elle continue jusqu’au premier salaire, que le pointage du bottin repère (Enrôlement › Pointage du bottin).
            </p>
          )}
          {erreur && <Alerte>{erreur}</Alerte>}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Bouton onClick={() => setOuvert(false)}>Annuler</Bouton>
          <Bouton
            variante="principal"
            onClick={async () => {
              setErreur(null);
              try {
                await api.post(`/recensement/agents/${a.id}/statut`, { statut: choisi, date: date || null, texte: texte || null, matricule: matricule || null });
                setOuvert(false);
                recharger();
              } catch (e) {
                setErreur((e as Error).message);
              }
            }}
          >
            Changer le statut
          </Bouton>
        </div>
      </Modale>
    </Carte>
  );
}

/** Fiches qui sont peut-être la même personne (venue d'une autre base) : fusionner, ou déclarer différente. */
function MemesPersonnes({ c, agent, recharger }: { c: ConfigRecensement; agent: AgentRecense; recharger: () => void }) {
  const { profil } = useSession();
  const liste = useApi<MemePersonne[]>(`/recensement/agents/${agent.id}/memes-personnes`);
  const [confirmation, demander] = useConfirmation();
  const [erreur, setErreur] = useState<string | null>(null);
  const traiter = !["DDEPPSA", "STRUCTURE"].includes(profil.role);
  if (!liste.donnees?.length) return null;
  return (
    <Carte titre="Même personne ?">
      <p className="-mt-2 mb-3 text-[12px] text-zinc-500">
        Ces fiches ont un nom proche{agent.dateNaissance ? " et une date de naissance égale ou inconnue" : ""}. La même personne peut venir de deux bases (volontaire puis fonctionnaire, nom écrit autrement). Fusionner garde cette fiche et y
        reprend ce qui lui manque, les pièces et le parcours de l’autre ; un statut de fonctionnaire ou de contractuel l’emporte.
      </p>
      {erreur && (
        <div className="mb-3">
          <Alerte>{erreur}</Alerte>
        </div>
      )}
      <ul className="divide-y divide-zinc-100">
        {liste.donnees.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center gap-3 py-2.5 text-[13px]">
            <Badge ton={m.ressemblance === "PROBABLE" ? "rouge" : "jaune"}>{m.ressemblance === "PROBABLE" ? "probable" : "possible"}</Badge>
            <div className="min-w-0 flex-1">
              {m.visible ? (
                <Link href={`/personnel/agents/${m.id}`} className="font-medium text-marque-700 hover:underline">
                  {m.nomComplet}
                </Link>
              ) : (
                <span className="font-medium">{m.nomComplet}</span>
              )}{" "}
              <span className="text-zinc-500">
                · {m.numeroFiche} · {libelleStatut(c, m.statut)}
                {m.dateNaissance && ` · né(e) le ${dateFr(m.dateNaissance)}`}
                {m.matricule && ` · matricule ${m.matricule}`}
                {m.lieuService && ` · ${m.lieuService}`}
                {m.volontaireId && " · registre des volontaires"}
              </span>
            </div>
            {traiter && m.visible && (
              <div className="flex gap-2">
                <Bouton
                  variante="discret"
                  onClick={async () => {
                    if (!(await demander(`Fusionner la fiche ${m.numeroFiche} (${m.nomComplet}) dans celle-ci ? L’autre fiche disparaît ; ses informations, ses pièces et son parcours sont repris ici.`, "Fusionner"))) return;
                    setErreur(null);
                    try {
                      await api.post(`/recensement/agents/${agent.id}/fusionner`, { avec: m.id });
                      liste.recharger();
                      recharger();
                    } catch (e) {
                      setErreur((e as Error).message);
                    }
                  }}
                >
                  <GitMerge /> Fusionner ici
                </Bouton>
                <Bouton
                  variante="discret"
                  onClick={async () => {
                    setErreur(null);
                    try {
                      await api.post(`/recensement/agents/${agent.id}/distinct`, { de: m.id });
                      liste.recharger();
                    } catch (e) {
                      setErreur((e as Error).message);
                    }
                  }}
                >
                  Autre personne
                </Bouton>
              </div>
            )}
          </li>
        ))}
      </ul>
      {confirmation}
    </Carte>
  );
}
