"use client";

import { ArrowRight, Clock3, Megaphone } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useSession } from "@/components/session";
import { Aide, Alerte, Badge, Chargement, EnTete, Segments, Vide } from "@/components/ui";
import { useApi } from "@/lib/api";

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
  depuis: number | null;
  decision: string | null;
  instruction: { texte: string; echeance: string | null; parStructure: string | null } | null;
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
};

/** Ce qui attend le compte : les dossiers à son étape, et ceux qu'il suit plus haut dans le circuit. */
export default function ATraiter() {
  const r = useApi<{ aTraiter: Ligne[]; aSuivre: Ligne[] }>("/circuit/a-traiter");
  const taches = useApi<{ notes: TacheNote[]; dossiers: TacheNote[]; total: number }>("/notes/a-faire");
  const [onglet, setOnglet] = useState<"aTraiter" | "aSuivre" | "notes">("aTraiter");
  const { profil } = useSession();
  const sansStructure = !profil.structureId && ["AGENT", "CHEF_SERVICE", "DIRECTEUR", "BUREAU_ETUDES"].includes(profil.role);
  const liste = onglet === "notes" ? [] : (r.donnees?.[onglet] ?? []);
  const tachesNotes = [...(taches.donnees?.dossiers ?? []), ...(taches.donnees?.notes ?? [])];

  return (
    <div className="space-y-5">
      <EnTete
        titre="Dossiers à traiter"
        sousTitre="Les demandes qui attendent votre visa et votre avis, du plus ancien au plus récent. Dans « À suivre », celles qui viendront chez vous : vous voyez où elles sont et depuis quand, et vous pouvez donner une instruction."
      />
      <div className="flex flex-wrap items-center gap-3">
        <Segments
          valeur={onglet}
          changer={setOnglet}
          options={[
            { valeur: "aTraiter", libelle: `À traiter par moi${r.donnees ? ` (${r.donnees.aTraiter.length})` : ""}` },
            { valeur: "aSuivre", libelle: `À suivre${r.donnees ? ` (${r.donnees.aSuivre.length})` : ""}` },
            ...(taches.donnees?.total || profil.role !== "STRUCTURE" ? [{ valeur: "notes" as const, libelle: `Notes et impressions${taches.donnees ? ` (${taches.donnees.total})` : ""}` }] : []),
          ]}
        />
        <Aide>
          Le niveau supérieur <strong>attend</strong> le traitement du niveau inférieur : il ne fait pas le travail à sa place, mais il peut lui donner une instruction
          (ouvrez le dossier, puis « Donner une instruction »). Un dossier qui attend depuis plus de 7 jours apparaît en rouge.
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
          votre bureau (« Administration › Utilisateurs et paramètres ») : vous ne verrez plus que les vôtres.
        </Alerte>
      )}
      {r.erreur && <Alerte>{r.erreur}</Alerte>}
      {onglet === "notes" ? (
        !taches.donnees ? (
          <Chargement />
        ) : !tachesNotes.length ? (
          <Vide>Aucune note ni aucun dossier n’attend votre action.</Vide>
        ) : (
          <ul className="space-y-2.5">
            {tachesNotes.map((x) => {
              const dossier = x.numero !== undefined;
              const retard = (x.depuis ?? 0) > 7;
              return (
                <li key={`${x.action}-${x.id}`}>
                  <Link href={dossier ? `/mutation/${x.id}` : `/note/${x.id}`} className="flex flex-wrap items-center gap-4 rounded-3xl bg-white px-5 py-4 shadow-doux transition hover:-translate-y-0.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[14px] font-semibold">{dossier ? x.nomComplet : x.libelle}</span>
                        {dossier && <span className="text-[12px] text-zinc-400">demande n° {x.numero}</span>}
                        <Badge ton={ACTION[x.action]?.ton ?? "gris"}>{ACTION[x.action]?.libelle ?? x.action}</Badge>
                      </div>
                      <div className="text-[12px] text-zinc-500">{x.detail}</div>
                    </div>
                    <div className={`inline-flex items-center gap-1 text-[12px] ${retard ? "font-semibold text-rouge-600" : "text-zinc-500"}`}>
                      <Clock3 className="size-3.5" /> {x.depuis === null ? "—" : x.depuis === 0 ? "aujourd’hui" : `depuis ${x.depuis} jour${x.depuis > 1 ? "s" : ""}`}
                    </div>
                    <ArrowRight className="size-4 text-zinc-300" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )
      ) : !r.donnees ? (
        <Chargement />
      ) : !liste.length ? (
        <Vide>{onglet === "aTraiter" ? "Aucun dossier ne vous attend. Bravo !" : "Aucun dossier en route vers vous."}</Vide>
      ) : (
        <ul className="space-y-2.5">
          {liste.map((x) => {
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
                        Instruction de {x.instruction.parStructure} : « {x.instruction.texte} »{x.instruction.echeance ? ` — pour le ${x.instruction.echeance.split("-").reverse().join("/")}` : ""}
                      </div>
                    )}
                  </div>
                  <div className="text-right text-[12px]">
                    <div className="font-medium">
                      Chez {x.etape.sigle} <span className="text-zinc-400">· étape {x.rang}/{x.etapes}</span>
                    </div>
                    <div className={`inline-flex items-center gap-1 ${retard ? "font-semibold text-rouge-600" : "text-zinc-500"}`}>
                      <Clock3 className="size-3.5" /> {x.depuis === null ? "—" : x.depuis === 0 ? "arrivée aujourd’hui" : `depuis ${x.depuis} jour${x.depuis > 1 ? "s" : ""}`}
                    </div>
                  </div>
                  <ArrowRight className="size-4 text-zinc-300" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
