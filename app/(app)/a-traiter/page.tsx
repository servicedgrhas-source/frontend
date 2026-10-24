"use client";

import { ArrowRight, Clock3, Megaphone, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "@/components/session";
import { Aide, Alerte, Badge, Bouton, Chargement, EnTete, Liste, Saisie, Segments, Vide } from "@/components/ui";
import { qs, useApi } from "@/lib/api";

interface Ligne {
  id: string;
  numero: number;
  nomComplet: string;
  objet: string | null;
  typePrestation: string | null;
  canal: string;
  etape: { sigle: string; nom: string; phase: string };
  rang: number;
  etapes: number;
  /** Arrivée à l'étape en cours (date d'enregistrement pour les anciens dossiers). */
  arriveeLe: string | null;
  depuis: number | null;
  decision: string | null;
  instruction: { texte: string; echeance: string | null; parStructure: string | null } | null;
}

interface PageDossiers {
  onglet: "aTraiter" | "aSuivre";
  page: number;
  taille: number;
  total: number;
  lignes: Ligne[];
  compte: { aTraiter: number; aSuivre: number; enRetard: number };
  filtres: { types: { code: string; libelle: string; n: number }[]; etapes: { sigle: string; n: number }[] };
}

interface TacheNote {
  id: string;
  libelle?: string;
  nomComplet?: string;
  numero?: number;
  module?: string;
  action: string;
  detail: string;
  depuis: number | null;
  /** Page à ouvrir quand ce n'est ni une note ni une demande (agents ajoutés au recensement…). */
  lien?: string;
}

const ACTION: Record<string, { libelle: string; ton: "gris" | "vert" | "jaune" | "rouge" | "bleu" }> = {
  CONFORMITE: { libelle: "Avis de conformité à donner", ton: "jaune" },
  NON_CONFORME: { libelle: "Note jugée non conforme", ton: "rouge" },
  ORDONNER: { libelle: "Ordonner l’impression", ton: "bleu" },
  EN_ATTENTE: { libelle: "En attente des avis", ton: "gris" },
  IMPRIMER: { libelle: "À imprimer", ton: "bleu" },
  SCANNER: { libelle: "Scan de la note signée à joindre", ton: "jaune" },
  ENVOYER: { libelle: "À envoyer au secrétariat", ton: "jaune" },
  IMPRIMER_DOSSIER: { libelle: "Fiche et pièces à imprimer", ton: "bleu" },
  RECENSEMENT_CONTROLE: { libelle: "Agents ajoutés à contrôler", ton: "jaune" },
  RECENSEMENT_DECISION: { libelle: "Agents ajoutés à accepter ou rejeter", ton: "bleu" },
};

/** Actions qui portent sur un dossier (demande), les autres sur une note. */
const ACTIONS_DOSSIER = new Set(["ENVOYER", "IMPRIMER_DOSSIER"]);

type Onglet = "aTraiter" | "aSuivre" | "notes";
interface Etat {
  onglet: Onglet | null;
  recherche: string;
  type: string;
  etape: string;
  retard: boolean;
  page: number;
}
const ETAT_VIDE: Etat = { onglet: null, recherche: "", type: "", etape: "", retard: false, page: 1 };
/** Choix gardés le temps de la session : ouvrir un dossier puis revenir ne fait pas tout perdre. */
const CLE_ETAT = "dgrhas.a-traiter";

const nf = new Intl.NumberFormat("fr-FR");
const dateFr = (iso: string | null) => (iso ? new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString("fr-FR") : "");

function depuisTexte(j: number | null, arrivee = false) {
  if (j === null) return "—";
  if (j <= 0) return arrivee ? "arrivée aujourd’hui" : "aujourd’hui";
  if (j === 1) return arrivee ? "arrivée hier" : "depuis hier";
  return `depuis ${nf.format(j)} jours`;
}

/** Ce qui attend le compte : les dossiers à son étape, et ceux qu'il suit plus haut dans le circuit. */
export default function ATraiter() {
  const { profil } = useSession();
  const [etat, setEtatBrut] = useState<Etat>(() => {
    try {
      const e = sessionStorage.getItem(CLE_ETAT);
      return e ? { ...ETAT_VIDE, ...(JSON.parse(e) as Partial<Etat>) } : ETAT_VIDE;
    } catch {
      return ETAT_VIDE;
    }
  });
  const setEtat = (maj: Partial<Etat>) =>
    setEtatBrut((e) => {
      // Changer un filtre ramène à la première page
      const suivant = { ...e, ...maj, page: maj.page ?? 1 };
      try {
        sessionStorage.setItem(CLE_ETAT, JSON.stringify(suivant));
      } catch {
        /* stockage indisponible */
      }
      return suivant;
    });

  // Recherche envoyée 300 ms après la dernière frappe
  const [saisie, setSaisie] = useState(etat.recherche);
  useEffect(() => {
    if (saisie === etat.recherche) return;
    const t = setTimeout(() => setEtat({ recherche: saisie }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saisie]);

  const taches = useApi<{ notes: TacheNote[]; dossiers: TacheNote[]; total: number }>(profil.role === "STRUCTURE" ? null : "/notes/a-faire");
  const totalTaches = taches.donnees?.total ?? 0;
  // Onglet par défaut : le secrétariat travaille sur les impressions ; sinon « à traiter »,
  // ou les notes s'il n'y a aucun dossier mais des notes en attente
  const ongletCircuit: "aTraiter" | "aSuivre" = etat.onglet === "aSuivre" ? "aSuivre" : "aTraiter";
  const r = useApi<PageDossiers>(
    etat.onglet === "notes"
      ? null
      : `/circuit/a-traiter${qs({ onglet: ongletCircuit, recherche: etat.recherche.trim(), type: etat.type, etape: etat.etape, retard: etat.retard, page: etat.page })}`,
  );
  // Les compteurs des onglets restent connus quand on regarde les notes
  const [compte, setCompte] = useState<PageDossiers["compte"] | null>(null);
  const compteAJour = r.donnees?.compte;
  if (compteAJour && compteAJour !== compte) setCompte(compteAJour);
  const ongletAuto: Onglet =
    profil.role === "SECRETARIAT" || (compte && !compte.aTraiter && !compte.aSuivre && totalTaches > 0) ? "notes" : "aTraiter";
  const onglet: Onglet = etat.onglet ?? ongletAuto;

  const sansStructure = !profil.structureId && ["AGENT", "CHEF_SERVICE", "DIRECTEUR", "BUREAU_ETUDES"].includes(profil.role);
  const tachesNotes = [...(taches.donnees?.dossiers ?? []), ...(taches.donnees?.notes ?? [])];
  const d = onglet === "notes" ? null : r.donnees;
  const filtresActifs = !!(etat.recherche.trim() || etat.type || etat.etape || etat.retard);
  const pages = d ? Math.max(1, Math.ceil(d.total / d.taille)) : 1;

  return (
    <div className="space-y-5">
      <EnTete
        titre="Dossiers à traiter"
        sousTitre="Les demandes qui attendent votre visa et votre avis, du plus ancien au plus récent. Dans « À suivre », celles qui viendront chez vous : vous voyez où elles sont et depuis quand, et vous pouvez donner une instruction."
      />
      <div className="flex flex-wrap items-center gap-3">
        <Segments
          valeur={onglet}
          changer={(o) => {
            setSaisie("");
            setEtat({ onglet: o, recherche: "", type: "", etape: "", retard: false });
          }}
          options={[
            { valeur: "aTraiter" as const, libelle: `À traiter par moi${compte ? ` (${nf.format(compte.aTraiter)})` : ""}` },
            { valeur: "aSuivre" as const, libelle: `À suivre${compte ? ` (${nf.format(compte.aSuivre)})` : ""}` },
            ...(profil.role !== "STRUCTURE" ? [{ valeur: "notes" as const, libelle: `Notes et impressions${taches.donnees ? ` (${totalTaches})` : ""}` }] : []),
          ]}
        />
        <Aide>
          Le niveau supérieur <strong>attend</strong> le traitement du niveau inférieur : il ne fait pas le travail à sa place, mais il peut lui donner une instruction
          (ouvrez le dossier, puis « Donner une instruction »). Un dossier qui attend depuis plus de 7 jours apparaît en rouge. Pour un dossier repris de l’ancienne
          base, l’attente part de sa date d’enregistrement : depuis quand l’agent attend.
          <br />
          <br />
          <strong>Notes et impressions</strong> : ce que vous avez à faire sur les notes de service et les dossiers accordés. Chef de bureau, chef de service et
          directeur : lire une note validée et dire si elle est conforme. DG : ordonner l’impression quand les trois avis sont « conforme », rouvrir une note jugée
          non conforme, envoyer au secrétariat une demande accordée. Directeur ou secrétariat : imprimer la note demandée par le DG ; le secrétariat imprime aussi la
          fiche et les pièces jointes des dossiers reçus. Après la signature du ministre : joindre le scan PDF de la note signée pour clôturer. Cliquez sur une ligne
          pour ouvrir la note ou la demande.
        </Aide>
      </div>
      {sansStructure && (
        <Alerte ton="jaune">
          Votre compte n’est rattaché à aucun bureau : vous voyez les dossiers de <strong>tous</strong> les{" "}
          {profil.role === "AGENT" ? "bureaux" : profil.role === "CHEF_SERVICE" ? "services" : "directions"} de la DGRHAS. Demandez au DG de rattacher votre compte à
          votre bureau (« Administration › Utilisateurs ») : vous ne verrez plus que les vôtres.
        </Alerte>
      )}

      {onglet === "notes" ? (
        taches.erreur ? (
          <Alerte>{taches.erreur}</Alerte>
        ) : !taches.donnees ? (
          <Chargement />
        ) : !tachesNotes.length ? (
          <Vide>Aucune note ni aucun dossier n’attend votre action.</Vide>
        ) : (
          <ul className="space-y-2.5">
            {tachesNotes.map((x) => {
              const dossier = ACTIONS_DOSSIER.has(x.action);
              const retard = (x.depuis ?? 0) > 7;
              return (
                <li key={`${x.action}-${x.id}`}>
                  <Link href={x.lien ?? (dossier ? `/mutation/${x.id}` : `/note/${x.id}`)} className="flex flex-wrap items-center gap-4 rounded-3xl bg-white px-5 py-4 shadow-doux transition hover:-translate-y-0.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[14px] font-semibold">{dossier ? x.nomComplet : x.libelle}</span>
                        {dossier && x.numero != null && <span className="text-[12px] text-zinc-400">demande n° {x.numero}</span>}
                        <Badge ton={ACTION[x.action]?.ton ?? "gris"}>{ACTION[x.action]?.libelle ?? x.action}</Badge>
                      </div>
                      <div className="text-[12px] text-zinc-500">{x.detail}</div>
                    </div>
                    <div className={`inline-flex items-center gap-1 text-[12px] ${retard ? "font-semibold text-rouge-600" : "text-zinc-500"}`}>
                      <Clock3 className="size-3.5" /> {depuisTexte(x.depuis)}
                    </div>
                    <ArrowRight className="size-4 text-zinc-300" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )
      ) : (
        <>
          {/* Recherche et filtres */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-60 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
              <Saisie
                type="search"
                value={saisie}
                onChange={(e) => setSaisie(e.target.value)}
                placeholder="Nom, n° de la demande, objet…"
                maxLength={100}
                className="w-full pl-9"
              />
            </div>
            {!!d?.filtres.types.length && (
              <Liste
                value={etat.type}
                onChange={(e) => setEtat({ type: e.target.value })}
                vide="Tous les types de demande"
                options={d.filtres.types.map((t) => ({ valeur: t.code, libelle: `${t.libelle} (${t.n})` }))}
                className="max-w-64"
              />
            )}
            {(d?.filtres.etapes.length ?? 0) > 1 && (
              <Liste
                value={etat.etape}
                onChange={(e) => setEtat({ etape: e.target.value })}
                vide="Toutes les étapes"
                options={d!.filtres.etapes.map((e) => ({ valeur: e.sigle, libelle: `Chez ${e.sigle} (${e.n})` }))}
                className="max-w-56"
              />
            )}
            {onglet === "aTraiter" && !!compte?.enRetard && (
              <Bouton variante={etat.retard ? "sombre" : "secondaire"} onClick={() => setEtat({ retard: !etat.retard })} aria-pressed={etat.retard}>
                En retard ({nf.format(compte.enRetard)})
              </Bouton>
            )}
            {filtresActifs && (
              <button
                type="button"
                className="text-[12px] text-zinc-500 hover:text-encre hover:underline"
                onClick={() => {
                  setSaisie("");
                  setEtat({ recherche: "", type: "", etape: "", retard: false });
                }}
              >
                Effacer les filtres
              </button>
            )}
          </div>

          {r.erreur && <Alerte>{r.erreur}</Alerte>}
          {!d ? (
            <Chargement />
          ) : !d.lignes.length ? (
            <Vide>
              {filtresActifs
                ? "Aucun dossier ne correspond à ces critères."
                : onglet === "aTraiter"
                  ? "Aucun dossier ne vous attend. Bravo !"
                  : "Aucun dossier en route vers vous."}
            </Vide>
          ) : (
            <>
              <ul className={`space-y-2.5 transition-opacity ${r.chargement ? "opacity-60" : ""}`}>
                {d.lignes.map((x) => {
                  const retard = (x.depuis ?? 0) > 7;
                  return (
                    <li key={x.id}>
                      <Link href={`/mutation/${x.id}`} className="flex flex-wrap items-center gap-4 rounded-3xl bg-white px-5 py-4 shadow-doux transition hover:-translate-y-0.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[14px] font-semibold">{x.nomComplet}</span>
                            <span className="text-[12px] text-zinc-400">demande n° {x.numero}</span>
                            {x.canal === "PORTAIL" && <Badge ton="bleu">faite en ligne</Badge>}
                            {x.decision === "EN_INSTANCE" && <Badge ton="jaune">en instance</Badge>}
                          </div>
                          <div className="text-[12px] text-zinc-500">{x.objet ?? "Demande de mutation"}</div>
                          {x.instruction && (
                            <div className="mt-1.5 inline-flex items-start gap-1.5 rounded-xl bg-or-100 px-2.5 py-1 text-[12px] text-or-700">
                              <Megaphone className="mt-0.5 size-3.5 shrink-0" />
                              Instruction de {x.instruction.parStructure} : « {x.instruction.texte} »
                              {x.instruction.echeance ? ` — pour le ${x.instruction.echeance.split("-").reverse().join("/")}` : ""}
                            </div>
                          )}
                        </div>
                        <div className="text-right text-[12px]">
                          <div className="font-medium">
                            Chez {x.etape.sigle} <span className="text-zinc-400">· étape {x.rang}/{x.etapes}</span>
                          </div>
                          <div
                            className={`inline-flex items-center gap-1 ${retard ? "font-semibold text-rouge-600" : "text-zinc-500"}`}
                            title={x.arriveeLe ? `À cette étape depuis le ${dateFr(x.arriveeLe)}` : undefined}
                          >
                            <Clock3 className="size-3.5" /> {depuisTexte(x.depuis, true)}
                          </div>
                          {x.arriveeLe && (x.depuis ?? 0) > 30 && <div className="text-[11px] text-zinc-400">depuis le {dateFr(x.arriveeLe)}</div>}
                        </div>
                        <ArrowRight className="size-4 text-zinc-300" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
                <span>
                  {nf.format((d.page - 1) * d.taille + 1)}–{nf.format(Math.min(d.page * d.taille, d.total))} sur {nf.format(d.total)} dossier(s)
                </span>
                {pages > 1 && (
                  <div className="flex items-center gap-2">
                    <Bouton disabled={d.page <= 1 || r.chargement} onClick={() => setEtat({ page: d.page - 1 })}>
                      Précédent
                    </Bouton>
                    <span>
                      page {d.page} / {pages}
                    </span>
                    <Bouton disabled={d.page >= pages || r.chargement} onClick={() => setEtat({ page: d.page + 1 })}>
                      Suivant
                    </Bouton>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
