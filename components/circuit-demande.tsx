"use client";

import { Check, Clock3, CornerDownRight, FileSignature, Megaphone, MinusCircle, X } from "lucide-react";
import { useState } from "react";
import { Aide, Alerte, Badge, Bouton, Carte, Chargement, Champ, Saisie, Segments, Zone } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { dateCourte } from "@/lib/libelles";
import type { EtapeCircuit } from "@/lib/types";

interface EtatCircuit {
  circuit: EtapeCircuit[];
  etapeCourante: number | null;
  decideur: string | null;
  decision: "ACCORDEE" | "REJETEE" | "EN_INSTANCE" | null;
  decisionMotivation: string | null;
  decisionPar: string | null;
  decisionLe: string | null;
  canal: string;
  peutAgir: boolean;
  peutRecopier: boolean;
  peutSauter: boolean;
  peutInstruire: boolean;
  responsables: { mode: "STRUCTURE" | "ROLE" | "AUCUN"; noms: string[]; delegations: string[] };
  instructions: { id: number; etape: number; texte: string; echeance: string | null; par: string | null; parStructure: string | null; creeLe: string }[];
}

const DECISION: Record<string, { libelle: string; ton: "vert" | "rouge" | "jaune" }> = {
  ACCORDEE: { libelle: "Prestation accordée", ton: "vert" },
  REJETEE: { libelle: "Prestation rejetée", ton: "rouge" },
  EN_INSTANCE: { libelle: "Prestation en instance", ton: "jaune" },
};

const jours = (iso: string | null) => (iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)) : null);
const quand = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—");

/**
 * Circuit d'approbation d'une demande : chaque étape vise et donne un avis motivé ; favorable
 * ou non, le dossier monte toujours jusqu'au décideur final, qui accorde, rejette ou met en instance.
 */
export function CircuitDemande({ id, apres }: { id: string; apres: () => void }) {
  const c = useApi<EtatCircuit>(`/mutations/${id}/circuit`);
  const [message, setMessage] = useState<{ ton: "vert" | "rouge"; texte: string } | null>(null);
  const d = c.donnees;
  const recharger = (texte: string) => {
    setMessage({ ton: "vert", texte });
    c.recharger();
    apres();
  };
  if (c.erreur) return <Alerte>{c.erreur}</Alerte>;
  if (!d) return <Chargement />;
  if (!d.circuit.length) return <Alerte ton="jaune">Cette demande n’a pas encore de circuit.</Alerte>;
  const i = d.etapeCourante;
  const enCours = i !== null && d.decision !== "ACCORDEE" && d.decision !== "REJETEE";
  const derniere = i !== null && i === d.circuit.length - 1;
  const externes = d.circuit.map((e, k) => ({ e, k })).filter((x) => x.e.phase === "EXTERNE");
  const internes = d.circuit.map((e, k) => ({ e, k })).filter((x) => x.e.phase === "INTERNE");

  return (
    <Carte
      titre={
        <span className="flex items-center gap-1.5">
          Circuit d’approbation
          <Aide>
            Chaque niveau <strong>vise</strong> le dossier (« je l’ai vu ») et donne un <strong>avis favorable ou un rejet, toujours motivé</strong>. Favorable ou
            non, le dossier <strong>monte toujours</strong> au niveau suivant : la rétention est interdite. Le dernier niveau prend la décision : accordée, rejetée ou
            en instance. Pour une mutation dans le même département, c’est le DDEPPSA qui décide.
          </Aide>
        </span>
      }
      actions={<span className="text-[12px] text-zinc-500">Décision : {d.decideur === "DDEPPSA" ? "Directeur départemental" : d.decideur === "LIEU_SERVICE" ? "lieu de service" : "DGRHAS"}</span>}
    >
      <div className="space-y-4">
        {d.decision && (
          <div className={`rounded-2xl px-4 py-3 text-[13px] ${d.decision === "ACCORDEE" ? "bg-marque-50" : d.decision === "REJETEE" ? "bg-rouge-100/60" : "bg-or-100"}`}>
            <div className="flex flex-wrap items-center gap-2">
              <Badge ton={DECISION[d.decision].ton}>{DECISION[d.decision].libelle}</Badge>
              <span className="text-zinc-500">
                par {d.decisionPar} le {quand(d.decisionLe)}
              </span>
            </div>
            {d.decisionMotivation && <p className="mt-1 text-zinc-700">« {d.decisionMotivation} »</p>}
          </div>
        )}
        {message && (
          <div className={`rounded-xl px-3 py-2 text-[12px] ${message.ton === "vert" ? "bg-marque-50 text-marque-700" : "bg-rouge-100 text-rouge-600"}`}>{message.texte}</div>
        )}

        {externes.length > 0 && <Groupe titre="Voie hiérarchique" />}
        {externes.map(({ e, k }) => (
          <Etape key={k} e={e} k={k} d={d} />
        ))}
        {internes.length > 0 && <Groupe titre="Traitement à la DGRHAS" />}
        {internes.map(({ e, k }) => (
          <Etape key={k} e={e} k={k} d={d} />
        ))}

        {enCours && d.peutAgir && <Agir id={id} derniere={derniere} sigle={d.circuit[i!].sigle} apres={recharger} erreur={(t) => setMessage({ ton: "rouge", texte: t })} />}
        {enCours && !d.peutAgir && d.peutRecopier && (
          <details className="rounded-2xl bg-zinc-50 px-4 py-3">
            <summary className="cursor-pointer text-[13px] font-medium text-zinc-700">
              <FileSignature className="mr-1 inline size-4" /> Recopier l’avis porté sur le formulaire papier ({d.circuit[i!].sigle})
            </summary>
            <p className="mt-2 text-[12px] text-zinc-500">
              Pour un dossier papier, ou une structure qui n’a pas encore de compte : recopiez l’avis et la motivation écrits et visés sur le formulaire.
            </p>
            <Agir id={id} derniere={derniere} sigle={d.circuit[i!].sigle} papier apres={recharger} erreur={(t) => setMessage({ ton: "rouge", texte: t })} />
          </details>
        )}
        {enCours && d.peutInstruire && <Instruire id={id} sigle={d.circuit[i!].sigle} apres={recharger} erreur={(t) => setMessage({ ton: "rouge", texte: t })} />}
        {enCours && d.peutSauter && (
          <Franchir id={id} sigle={d.circuit[i!].sigle} apres={recharger} erreur={(t) => setMessage({ ton: "rouge", texte: t })} />
        )}
      </div>
    </Carte>
  );
}

function Groupe({ titre }: { titre: string }) {
  return <div className="pt-1 text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">{titre}</div>;
}

function Etape({ e, k, d }: { e: EtapeCircuit; k: number; d: EtatCircuit }) {
  const courante = k === d.etapeCourante && d.decision !== "ACCORDEE" && d.decision !== "REJETEE";
  const fait = !!e.visaLe;
  const icone = e.sautee ? <MinusCircle /> : fait ? e.avis === "REJET" ? <X /> : <Check /> : courante ? <Clock3 /> : null;
  const ton = e.sautee ? "bg-zinc-200 text-zinc-500" : fait ? (e.avis === "REJET" ? "bg-rouge-600 text-white" : "bg-marque-500 text-white") : courante ? "bg-or-400 text-zinc-900" : "bg-zinc-100 text-zinc-300";
  const instructions = d.instructions.filter((x) => x.etape === k);
  const attente = courante ? jours(e.arriveeLe) : null;
  return (
    <div className="flex gap-3">
      <span className={`mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full [&_svg]:size-4 ${ton}`}>{icone ?? <span className="text-[11px] font-semibold">{k + 1}</span>}</span>
      <div className={`min-w-0 flex-1 rounded-2xl px-3 py-2 ${courante ? "bg-or-100/60 ring-1 ring-or-400/50" : ""}`}>
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <strong>{e.sigle}</strong>
          {e.nom !== e.sigle && <span className="text-zinc-500">{e.nom}</span>}
          {fait && !e.sautee && e.avis && <Badge ton={e.avis === "FAVORABLE" ? "vert" : "rouge"}>{e.avis === "FAVORABLE" ? "Avis favorable" : "Rejet"}</Badge>}
          {e.surPapier && <Badge>recopié du papier</Badge>}
        </div>
        {fait && (
          <div className="text-[11px] text-zinc-500">
            {e.sautee ? `Franchie sans avis : ${e.sautee}` : `Visé le ${quand(e.visaLe)} par ${e.visaPar}`}
            {e.arriveeLe && !e.sautee ? ` · arrivé le ${quand(e.arriveeLe)}` : ""}
          </div>
        )}
        {e.motivation && <p className="mt-1 text-[12px] text-zinc-700">« {e.motivation} »</p>}
        {courante && (
          <div className="mt-1 text-[12px] text-or-700">
            {d.decision === "EN_INSTANCE" ? "Mise en instance : la décision reste à prendre" : "En attente de traitement"}
            {attente !== null ? ` depuis ${attente === 0 ? "aujourd’hui" : `${attente} jour${attente > 1 ? "s" : ""}`}` : ""}
            {d.responsables.noms.length > 0 ? ` · ${d.responsables.noms.join(", ")}` : ""}
          </div>
        )}
        {courante && d.responsables.delegations.map((t) => (
          <div key={t} className="mt-1 text-[12px] text-marque-700">
            {t}
          </div>
        ))}
        {courante && d.responsables.mode === "AUCUN" && (
          <div className="mt-2 rounded-xl bg-rouge-100/70 px-3 py-2 text-[12px] leading-relaxed text-rouge-600">
            <strong>Personne n’a encore de compte pour « {e.sigle} » : le dossier est bloqué ici.</strong> Personne ne peut le viser, il ne montera pas tout seul.
            <ul className="mt-1 list-disc pl-4 text-zinc-700">
              <li>
                <strong>La bonne solution</strong> : créer un compte pour cette structure (« Administration › Utilisateurs et paramètres », rôle « Responsable de
                structure », structure « {e.sigle} »).
              </li>
              <li>
                <strong>En attendant</strong>, si l’avis est écrit et visé sur le formulaire papier, un agent de la DGRHAS le <strong>recopie</strong> (« Recopier
                l’avis porté sur le formulaire papier », plus bas).
              </li>
              <li>
                S’il n’y a pas d’avis du tout (structure fermée, pas de responsable), le <strong>DG franchit l’étape</strong> en écrivant pourquoi.
              </li>
            </ul>
          </div>
        )}
        {courante && d.responsables.mode === "ROLE" && (
          <div className="mt-2 rounded-xl bg-or-100 px-3 py-2 text-[12px] leading-relaxed text-or-700">
            Aucun compte n’est rattaché à « {e.sigle} » : <strong>tous les comptes de ce rôle</strong> qui n’ont pas de structure peuvent agir ici (
            {d.responsables.noms.join(", ")}). Pour que seul le responsable de « {e.sigle} » puisse le faire, rattachez son compte à cette structure dans
            « Administration › Utilisateurs et paramètres ».
          </div>
        )}
        {instructions.map((x) => (
          <div key={x.id} className="mt-1.5 flex items-start gap-1.5 rounded-xl bg-white px-2.5 py-1.5 text-[12px] ring-1 ring-or-400/40">
            <Megaphone className="mt-0.5 size-3.5 shrink-0 text-or-700" />
            <span>
              <strong>Instruction de {x.parStructure}</strong> ({x.par}, {quand(x.creeLe)}) : « {x.texte} »{x.echeance ? ` — pour le ${dateCourte(x.echeance)}` : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Visa + avis motivé, ou décision à la dernière étape. */
function Agir({ id, derniere, sigle, papier, apres, erreur }: { id: string; derniere: boolean; sigle: string; papier?: boolean; apres: (t: string) => void; erreur: (t: string) => void }) {
  const [motivation, setMotivation] = useState("");
  const [decision, setDecision] = useState<"ACCORDEE" | "REJETEE" | "EN_INSTANCE">("ACCORDEE");
  const envoyer = async (corps: Record<string, unknown>, texte: string) => {
    try {
      await api.post(`/mutations/${id}/circuit/agir`, { ...corps, motivation, surPapier: !!papier });
      setMotivation("");
      apres(texte);
    } catch (e) {
      erreur((e as Error).message);
    }
  };
  const ok = motivation.trim().length >= 3;
  return (
    <div className={`space-y-3 rounded-2xl px-4 py-3 ${papier ? "mt-3 bg-white" : "bg-marque-50/70 ring-1 ring-marque-200"}`}>
      {!papier && (
        <div className="flex items-center gap-1.5 text-[13px] font-semibold text-encre">
          <CornerDownRight className="size-4" /> {derniere ? `Votre décision (${sigle})` : `Votre visa et votre avis (${sigle})`}
        </div>
      )}
      {derniere && (
        <Segments
          valeur={decision}
          changer={setDecision}
          options={[
            { valeur: "ACCORDEE", libelle: "Accordée" },
            { valeur: "REJETEE", libelle: "Rejetée" },
            { valeur: "EN_INSTANCE", libelle: "En instance" },
          ]}
        />
      )}
      <Champ libelle="Motivation (obligatoire, même pour un avis favorable) *" aide={derniere && decision === "EN_INSTANCE" ? "Ex. pièce manquante : acte de mariage à fournir" : "Pourquoi cet avis ? Elle sera lue par les niveaux suivants."}>
        <Zone rows={2} value={motivation} onChange={(e) => setMotivation(e.target.value)} placeholder={derniere ? "Ex. Conditions remplies, dossier médical probant" : "Ex. Dossier complet, situation de santé confirmée"} />
      </Champ>
      <div className="flex flex-wrap gap-2">
        {derniere ? (
          <Bouton variante={decision === "REJETEE" ? "danger" : "principal"} disabled={!ok} onClick={() => envoyer({ decision }, `Décision enregistrée : ${DECISION[decision].libelle.toLowerCase()}.`)}>
            <FileSignature /> Enregistrer la décision
          </Bouton>
        ) : (
          <>
            <Bouton variante="principal" disabled={!ok} onClick={() => envoyer({ avis: "FAVORABLE" }, "Avis favorable enregistré : le dossier passe au niveau suivant.")}>
              <Check /> Viser : avis favorable
            </Bouton>
            <Bouton variante="danger" disabled={!ok} onClick={() => envoyer({ avis: "REJET" }, "Rejet enregistré : le dossier monte quand même au niveau suivant, avec votre motivation.")}>
              <X /> Viser : rejet
            </Bouton>
          </>
        )}
      </div>
      {!derniere && <p className="text-[11px] text-zinc-500">Favorable ou non, le dossier monte au niveau suivant avec votre avis.</p>}
    </div>
  );
}

function Instruire({ id, sigle, apres, erreur }: { id: string; sigle: string; apres: (t: string) => void; erreur: (t: string) => void }) {
  const [texte, setTexte] = useState("");
  const [echeance, setEcheance] = useState("");
  const [aujourdhui] = useState(() => Date.now());
  const jour = (n: number) => new Date(aujourdhui + n * 86400000).toISOString().slice(0, 10);
  return (
    <details className="rounded-2xl bg-or-100/50 px-4 py-3">
      <summary className="cursor-pointer text-[13px] font-medium text-zinc-700">
        <Megaphone className="mr-1 inline size-4" /> Donner une instruction à {sigle}
      </summary>
      <p className="mt-2 text-[12px] text-zinc-500">Vous êtes au-dessus dans le circuit : vous pouvez demander de traiter ce dossier, sans le faire à sa place.</p>
      <div className="mt-2 space-y-2">
        <Saisie className="w-full" value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Ex. Traitez ce dossier en urgence" />
        <div className="flex flex-wrap items-center gap-2 text-[12px]">
          Pour :
          {[
            ["Aujourd’hui", jour(0)],
            ["Demain", jour(1)],
          ].map(([l, v]) => (
            <button key={v} type="button" onClick={() => setEcheance(v)} className={`rounded-full px-2.5 py-0.5 ring-1 ${echeance === v ? "bg-nuit text-white ring-nuit" : "ring-zinc-300"}`}>
              {l}
            </button>
          ))}
          <Saisie type="date" className="w-40" value={echeance} onChange={(e) => setEcheance(e.target.value)} />
        </div>
        <Bouton
          variante="principal"
          disabled={!texte.trim()}
          onClick={async () => {
            try {
              await api.post(`/mutations/${id}/circuit/instruction`, { texte, echeance: echeance || null });
              setTexte("");
              setEcheance("");
              apres(`Instruction envoyée à ${sigle}.`);
            } catch (e) {
              erreur((e as Error).message);
            }
          }}
        >
          <Megaphone /> Envoyer l’instruction
        </Bouton>
      </div>
    </details>
  );
}

function Franchir({ id, sigle, apres, erreur }: { id: string; sigle: string; apres: (t: string) => void; erreur: (t: string) => void }) {
  const [motif, setMotif] = useState("");
  return (
    <details className="rounded-2xl bg-zinc-50 px-4 py-3">
      <summary className="cursor-pointer text-[12px] text-zinc-500">Franchir l’étape {sigle} sans avis (structure sans responsable)…</summary>
      <div className="mt-2 flex flex-wrap gap-2">
        <Saisie className="min-w-64 flex-1" value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Ex. Établissement fermé, pas de chef d’établissement" />
        <Bouton
          disabled={!motif.trim()}
          onClick={async () => {
            try {
              await api.post(`/mutations/${id}/circuit/franchir`, { motif });
              apres(`Étape ${sigle} franchie : ${motif}.`);
            } catch (e) {
              erreur((e as Error).message);
            }
          }}
        >
          Franchir
        </Bouton>
      </div>
    </details>
  );
}
