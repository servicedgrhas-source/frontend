"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useRef, useState } from "react";
import { NoteImprimable } from "@/components/note-imprimable";
import { FenetreEntete } from "@/components/fenetre-entete";
import { BoutonPersonnel } from "@/components/mutation-personnel";
import { BoutonsEnrolement, CorrectionsRectificatif } from "@/components/notes-enrolement";
import { useSession } from "@/components/session";
import { Aide, Alerte, Annonce, Badge, Bouton, Carte, Champ, Chargement, Modale, Saisie, Zone } from "@/components/ui";
import { api, qs, useApi } from "@/lib/api";
import { dateCourte, peut, STATUT_NOTE } from "@/lib/libelles";
import type { NoteDetail, NoteResume } from "@/lib/types";

type Ampliation = { libelle: string; nombre: string };

export function VueNote() {
  const { id } = useParams<{ id: string }>();
  const { profil } = useSession();
  const { donnees: note, erreur, recharger } = useApi<NoteDetail>(`/notes/${id}`);
  const [message, setMessage] = useState<{ ton: "vert" | "rouge"; texte: string } | null>(null);
  const [avecVisas, setAvecVisas] = useState(true);
  // Police réduite retenue à l'écran (notes courtes) : le Word la reprend (06/11/2026)
  const [echelle, setEchelle] = useState(1);
  const [dialogue, setDialogue] = useState<"renvoyer" | "signer" | "intro" | "rouvrir" | "supprimer" | "reunir" | "separer" | "ampliations" | "entete" | null>(null);

  if (erreur) return <Alerte>{erreur}</Alerte>;
  if (!note) return <Chargement />;

  async function action(chemin: string, corps?: unknown, succes?: string) {
    try {
      await api.post(`/notes/${id}/${chemin}`, corps);
      setMessage({ ton: "vert", texte: succes ?? "Action enregistrée." });
      setDialogue(null);
      recharger();
    } catch (e) {
      setMessage({ ton: "rouge", texte: (e as Error).message });
    }
  }

  async function supprimer() {
    try {
      await api.delete(`/notes/${id}`);
      // Un rectificatif ou un additif supprimé : retour à la note signée qu'il complétait, d'où l'on
      // peut le refaire (06/11/2026) ; sinon la liste des notes
      const parent = note!.rectificatifDe ?? note!.additifDe;
      window.location.href = parent ? `/note/${parent}` : `/notes/${note!.module.toLowerCase()}`;
    } catch (e) {
      setMessage({ ton: "rouge", texte: (e as Error).message });
    }
  }

  const s = note.statut;
  const bloques = note.contenu.bloques ?? [];
  // Visas dans l'en-tête : la note s'imprime avec ou sans eux (DG, 30/10/2026)
  const aDesVisas = !!note.valideePar || (note.conformite ?? []).some((a) => a.conforme);

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={`/notes/${note.module.toLowerCase()}`} className="text-sm text-marque-700 underline">
            ← Retour aux notes
          </Link>
          <h1 className="mt-1 text-xl font-semibold">{note.libelle}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-600">
            <Badge ton={STATUT_NOTE[s].ton}>{STATUT_NOTE[s].libelle}</Badge>
            <Aide>{STATUT_NOTE[s].aide}</Aide>
            <span>{note.contenu.total} agent(s)</span>
            <span>· {note.contenu.departements} département(s)</span>
            {note.valideePar && <span>· validée par {note.valideePar}</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Police des notes (paramètre commun à toutes les notes), DG 01/11/2026 */}
          {peut.parametrer(profil.role) && (
            <label className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-[13px] ring-1 ring-zinc-200" title="Police de toutes les notes, à l’impression comme dans Word">
              Police
              <select
                className="bg-transparent font-medium outline-none"
                value={note.entete.police ?? "Times New Roman"}
                onChange={async (e) => {
                  try {
                    await api.put("/parametres/POLICE_NOTES", { valeur: e.target.value });
                    setMessage({ ton: "vert", texte: `Police des notes : ${e.target.value}.` });
                    recharger();
                  } catch (err) {
                    setMessage({ ton: "rouge", texte: (err as Error).message });
                  }
                }}
              >
                <option value="Times New Roman">Times New Roman (d’origine)</option>
                <option value="Sylfaen">Sylfaen</option>
              </select>
            </label>
          )}
          {/* Ampliations à cocher, archives recalculées (DG, 01/11/2026) */}
          {peut.traiter(profil.role) && s !== "SIGNEE" && note.ampliationsToutes?.length ? (
            <Bouton onClick={() => setDialogue("ampliations")}>
              Ampliations
              <Aide>Cochez ou décochez les destinataires des copies de la note. Le nombre des archives (2 sur le total des exemplaires) se recalcule tout seul.</Aide>
            </Bouton>
          ) : null}
          {aDesVisas && (
            <label className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-[13px] ring-1 ring-zinc-200" title="Les spécimens de visa du service, de la direction et de la direction générale, à droite de leur ligne dans l’en-tête">
              <input type="checkbox" className="size-4 accent-marque-600" checked={avecVisas} onChange={(e) => setAvecVisas(e.target.checked)} />
              Avec les visas
            </label>
          )}
          <Bouton onClick={() => window.open(`/impression/${id}${aDesVisas && !avecVisas ? "?visas=0" : ""}`, "_blank")}>
            Imprimer / PDF
            <Aide>Ouvre la note telle qu’elle sera imprimée (pages A4, bas de page). De là, imprimez-la ou enregistrez-la en PDF.</Aide>
          </Bouton>
          <Bouton
            onClick={() =>
              api.telecharger(`/notes/${id}/excel`, `${note.libelle}.xlsx`).catch((e: Error) => setMessage({ ton: "rouge", texte: e.message }))
            }
          >
            Excel
            <Aide>Télécharge le contenu de la note dans un fichier Excel (une ligne par agent), pour la vérifier ou la retravailler.</Aide>
          </Bouton>
          <Bouton
            onClick={() =>
              api.telecharger(`/notes/${id}/word${qs({ visas: aDesVisas && !avecVisas ? 0 : "", echelle: echelle < 1 ? echelle : "" })}`, `${note.libelle}.docx`).catch((e: Error) => setMessage({ ton: "rouge", texte: e.message }))
            }
          >
            Word
            <Aide>Télécharge la note dans Word, avec la même mise en page que la version imprimée, pour retoucher la présentation (espacer, faire descendre un tableau). La signature reste toujours avec la dernière ligne du tableau.</Aide>
          </Bouton>
          {/* Récapitulatif : la note de base + ses additifs + ses rectificatifs = la liste définitive (DG, 06/11/2026) */}
          {(note.module === "ENROLEMENT" || note.module === "MUTATION") && (s === "SIGNEE" || note.additifDe || note.rectificatifDe) && (
            <Link href={`/note/${id}/recapitulatif`}>
              <Bouton>
                Récapitulatif
                <Aide>La liste définitive de cette note : la note signée, plus les personnes de ses additifs, avec les corrections de ses rectificatifs.</Aide>
              </Bouton>
            </Link>
          )}
          {/* Notes d'enrôlement : colonnes, additif, rectificatif (cadrage du 05/11/2026) */}
          <BoutonsEnrolement note={note} recharger={recharger} signaler={(ton, texte) => setMessage({ ton, texte })} />
          <BoutonPersonnel note={note} recharger={recharger} signaler={(ton, texte) => setMessage({ ton, texte })} />
          {/* En-tête de la note : enlever ou ajouter une ligne, un trait (06/11/2026) */}
          {s === "BROUILLON" && peut.traiter(profil.role) && (
            <Bouton onClick={() => setDialogue("entete")}>
              En-tête{note.entete.libre ? " (modifié)" : ""}
              <Aide>Enlever ou ajouter une ligne de l’en-tête (ministère, cabinet, direction, service…), un trait, ou changer la référence du numéro, pour cette note seulement.</Aide>
            </Bouton>
          )}
          {s === "BROUILLON" && peut.decider(profil.role) && note.module !== "ENROLEMENT" && note.module !== "MUTATION" && (
            <Bouton onClick={() => setDialogue("intro")}>
              Modifier l’introduction
              <Aide>
                Change le paragraphe d’introduction de la note (textes de référence, « Le Ministre … »). <strong>Réservé au DG.</strong>
              </Aide>
            </Bouton>
          )}
          {s === "BROUILLON" && peut.traiter(profil.role) && (
            <>
              {(note.module === "AFFECTATION" || ((note.module === "ENROLEMENT" || note.module === "MUTATION") && !note.additifDe && !note.rectificatifDe && note.lotRangement == null)) && (
                <Bouton onClick={() => setDialogue("reunir")}>
                  Réunir avec une autre note
                  <Aide>
                    {note.module === "MUTATION"
                      ? "Une seule note pour le même motif : le préscolaire-primaire et le collège-lycée-administration ensemble. Les demandes de l’autre note passent dans celle-ci."
                      : note.module === "ENROLEMENT"
                      ? "Une seule note au lieu de deux, au choix : par exemple le préscolaire et le primaire. Les volontaires de l’autre note passent dans celle-ci et l’introduction cite les deux diplômes."
                      : "Une seule note au lieu de plusieurs : les personnes d’une autre note du même type (un autre lot, par exemple le lot 8 avec le lot 7) passent dans celle-ci. Possible tant que les notes sont « à soumettre au DG »."}
                  </Aide>
                </Bouton>
              )}
              {(!!note.lotsReunis?.length || ((note.module === "ENROLEMENT" || note.module === "MUTATION") && !!note.groupes?.length && note.lotRangement == null)) && (
                <Bouton onClick={() => setDialogue("separer")}>
                  {note.module === "ENROLEMENT" || note.module === "MUTATION" ? "Séparer" : "Séparer les lots"}
                  <Aide>Défait la réunion : cette note garde son premier type (ou lot) ; chaque autre retrouve sa note.</Aide>
                </Bouton>
              )}
              <Bouton variante="danger" onClick={() => setDialogue("supprimer")}>
                Supprimer
                <Aide>
                  Efface cette <strong>note</strong> si elle a été préparée par erreur. Les personnes, elles, ne sont pas effacées : elles redeviennent « pas
                  encore affectées », et une nouvelle note pourra être préparée.
                </Aide>
              </Bouton>
              <Bouton variante="principal" onClick={() => action("soumettre", undefined, "Note soumise au Directeur général.")}>
                Soumettre au DG
                <Aide>
                  Envoie la note au DG pour validation. Elle n’est alors plus modifiable par les agents. Si le DG la renvoie pour correction, elle redevient « à
                  soumettre au DG ».
                </Aide>
              </Bouton>
            </>
          )}
          {s === "SOUMISE" && peut.decider(profil.role) && (
            <>
              <Bouton variante="danger" onClick={() => setDialogue("renvoyer")}>
                Renvoyer pour correction
                <Aide>Renvoie la note aux agents avec un commentaire : elle redevient « à soumettre au DG » et peut être corrigée.</Aide>
              </Bouton>
              <Bouton variante="principal" onClick={() => action("valider", undefined, "Note validée : son contenu est figé.")}>
                Valider la note
                <Aide>Le contenu est figé et les personnes comptent comme « affectées ». Vous pourrez encore la rouvrir tant que le ministre n’a pas signé.</Aide>
              </Bouton>
            </>
          )}
          {s === "VALIDEE" && peut.decider(profil.role) && (
            <Bouton onClick={() => setDialogue("rouvrir")}>
              Rouvrir pour modifier
              <Aide>La note redevient « à soumettre au DG » pour être corrigée. Possible tant que le ministre ne l’a pas signée.</Aide>
            </Bouton>
          )}
          {(s === "VALIDEE" || s === "SIGNEE") && peut.traiter(profil.role) && (
            <Bouton variante="principal" onClick={() => setDialogue("signer")}>
              {s === "SIGNEE" ? "Corriger n° / date" : "Enregistrer la signature"}
              <Aide>Reportez le numéro et la date de signature écrits par le ministre sur la note signée. La note ne sera plus modifiable.</Aide>
            </Bouton>
          )}
        </div>
      </div>

      <Annonce ton={message?.ton} fermer={() => setMessage(null)}>{message?.texte}</Annonce>
      {note.commentaire && s === "BROUILLON" && <Alerte ton="jaune">Renvoyée par le DG : {note.commentaire}</Alerte>}
      <CorrectionsRectificatif note={note} recharger={recharger} signaler={(ton, texte) => setMessage({ ton, texte })} />
      {(s === "BROUILLON" || s === "SOUMISE") && note.contenu.total === 0 && !note.rectificatifDe && (
        <Alerte ton="jaune">
          <strong>Cette note ne contient plus personne.</strong> Les personnes qui y figuraient ont changé de lot (diplôme ou type de texte corrigé), ont été
          exclues, ou sont déjà dans une autre note. Elle ne peut pas être soumise au DG : {s === "BROUILLON" ? "supprimez-la avec le bouton « Supprimer »" : "le DG peut la renvoyer pour qu’elle soit supprimée"}.
        </Alerte>
      )}
      {(s === "BROUILLON" || s === "SOUMISE") && (
        <Alerte ton="bleu">
          Cette note est recalculée en direct à partir de la base : toute correction (département, grade, recommandation validée…) y apparaît
          immédiatement. Elle est figée à la validation du DG, mais le DG peut la rouvrir tant que le ministre ne l’a pas signée.
        </Alerte>
      )}

      {(s === "VALIDEE" || s === "SIGNEE") && <CirculationNote note={note} recharger={recharger} signalerErreur={(texte) => setMessage({ ton: "rouge", texte })} signalerSucces={(texte) => setMessage({ ton: "vert", texte })} />}

      {bloques.length > 0 && (
        <Carte titre={`${bloques.length} agent(s) de ce type non inclus (à compléter)`}>
          <ul className="max-h-48 space-y-0.5 overflow-y-auto text-sm">
            {bloques.map((b) => (
              <li key={b.id}>
                <span className="font-medium">{b.nom}</span> — <span className="text-rouge-600">{b.raisons.join(" ; ")}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-zinc-500">Une fois complétées, ces personnes rejoignent la note automatiquement.</p>
            {note.module === "AFFECTATION" && note.lotNumero && (
              <Link href={`/affectations?lot=${note.lotNumero}&typeNote=${note.typeNote}&probleme=bloquant`}>
                <Bouton variante="principal">Voir et compléter ces {bloques.length} personne(s) →</Bouton>
              </Link>
            )}
            {note.module === "ENROLEMENT" && (
              <Link href="/enrolement/base">
                <Bouton variante="principal">Choisir leur département (Base des enrôlés) →</Bouton>
              </Link>
            )}
          </div>
        </Carte>
      )}

      <div className="overflow-x-auto rounded-3xl bg-zinc-200/70 p-8">
        <NoteImprimable note={note} visas={avecVisas} surEchelle={setEchelle} />
      </div>

      <Modale titre="Supprimer cette note ?" ouverte={dialogue === "supprimer"} fermer={() => setDialogue(null)}>
        <div className="space-y-3 text-[13px] leading-relaxed text-zinc-600">
          <p>
            La note <strong>« {note.libelle} »</strong> sera effacée.
          </p>
          {/* Ce que la suppression veut dire, selon la note (06/11/2026) */}
          <ul className="list-disc space-y-1 pl-5">
            {note.rectificatifDe ? (
              <>
                <li>les corrections écrites dans ce rectificatif sont effacées ; la note signée ne change pas ;</li>
                <li>
                  vous pourrez refaire un rectificatif quand vous voudrez : bouton <strong>« Faire un rectificatif »</strong> sur la note signée (vous y serez ramené).
                </li>
              </>
            ) : note.lotRangement != null ? (
              <li>
                les <strong>{note.contenu.total} personne(s)</strong> de ce lot reviennent dans la note principale (à la prochaine préparation des notes).
              </li>
            ) : note.module === "MUTATION" ? (
              <>
                <li>
                  les <strong>{note.contenu.total} demande(s)</strong> ne sont pas effacées : elles restent accordées, pas encore dans une note ;
                </li>
                <li>une nouvelle note pourra être préparée avec « Préparer les notes de mutation ».</li>
                {note.additifDe && <li>la note signée qu’elle complétait ne change pas.</li>}
              </>
            ) : note.module === "ENROLEMENT" ? (
              <>
                <li>
                  les <strong>{note.contenu.total} volontaire(s)</strong> ne sont pas effacés : ils restent retenus, pas encore dans une note ;
                </li>
                <li>une nouvelle note pourra être préparée avec « Préparer les notes de service ».</li>
              </>
            ) : (
              <>
                <li>
                  les <strong>{note.contenu.total} personne(s)</strong> ne sont pas effacées : elles redeviennent « pas encore affectées » ;
                </li>
                <li>une nouvelle note pourra être préparée depuis « Traitement des affectations » (« Préparer les notes de ce lot »).</li>
              </>
            )}
          </ul>
          <p className="text-[12px] text-zinc-500">{note.rectificatifDe ? "Rien d’autre ne bouge." : "À faire seulement si la note a été préparée par erreur."}</p>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Bouton onClick={() => setDialogue(null)}>Garder la note</Bouton>
          <Bouton variante="danger" onClick={supprimer}>
            {note.rectificatifDe ? "Supprimer ce rectificatif" : "Supprimer la note"}
          </Bouton>
        </div>
      </Modale>
      {dialogue === "reunir" && (
        <Reunir note={note} fermer={() => setDialogue(null)} ok={(avec) => action("fusionner", { avec }, note.module === "AFFECTATION" ? "Notes réunies : une seule note pour ces lots." : "Notes réunies : une seule note.")} />
      )}
      <Modale titre={note.module === "ENROLEMENT" || note.module === "MUTATION" ? "Séparer les notes ?" : "Séparer les lots ?"} ouverte={dialogue === "separer"} fermer={() => setDialogue(null)}>
        <p className="text-[13px] leading-relaxed text-zinc-600">
          {note.module === "MUTATION" ? (
            <>Cette note ne gardera que son premier groupe. L’autre groupe (préscolaire-primaire ou collège-lycée-administration) retrouve sa note « à soumettre au DG », avec ses demandes.</>
          ) : note.module === "ENROLEMENT" ? (
            <>Cette note ne gardera que son premier type. Les autres types réunis retrouvent chacun leur note « à soumettre au DG », avec leurs volontaires : vous pourrez les réunir de nouveau.</>
          ) : (
            <>
              Cette note ne gardera que son premier lot. Les lots <strong>{(note.lotsReunis ?? []).map((l) => l.libelle).join(", ")}</strong> retrouvent chacun leur
              note « à soumettre au DG », avec leurs personnes : vous pourrez les réunir de nouveau quand vous voudrez.
            </>
          )}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Bouton onClick={() => setDialogue(null)}>Annuler</Bouton>
          <Bouton
            variante="principal"
            onClick={() =>
              action("separer", undefined, note.module === "AFFECTATION" ? "Lots séparés : chaque lot a retrouvé sa note." : "Notes séparées : chacune a retrouvé sa note « à soumettre au DG ».")
            }
          >
            {note.module === "AFFECTATION" ? "Séparer les lots" : "Séparer"}
          </Bouton>
        </div>
      </Modale>
      <Modale titre="Rouvrir cette note ?" ouverte={dialogue === "rouvrir"} fermer={() => setDialogue(null)}>
        <p className="text-[13px] leading-relaxed text-zinc-600">
          La note redevient <strong>« à soumettre au DG »</strong> : ses agents peuvent de nouveau être modifiés (recommandation, département…). Elle devra être soumise et
          validée à nouveau. Possible tant que le ministre n’a pas signé.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Bouton onClick={() => setDialogue(null)}>Annuler</Bouton>
          <Bouton variante="principal" onClick={() => action("rouvrir", undefined, "Note rouverte : elle est de nouveau modifiable.")}>
            Rouvrir la note
          </Bouton>
        </div>
      </Modale>
      {dialogue === "renvoyer" && <Renvoi fermer={() => setDialogue(null)} ok={(c) => action("renvoyer", { commentaire: c }, "Note renvoyée aux agents.")} />}
      {dialogue === "signer" && (
        <Signature note={note} fermer={() => setDialogue(null)} ok={(numero, date) => action("signer", { numero, dateSignature: date }, "Signature enregistrée.")} />
      )}
      {dialogue === "entete" && (
        <FenetreEntete
          note={note}
          fermer={() => setDialogue(null)}
          apres={(texte, ton = "vert") => {
            if (ton === "vert") setDialogue(null);
            setMessage({ ton, texte });
            recharger();
          }}
        />
      )}
      {dialogue === "ampliations" && (
        <Ampliations
          note={note}
          fermer={() => setDialogue(null)}
          ok={async (exclues, ajoutees) => {
            try {
              await api.put(`/notes/${id}/ampliations`, { exclues, ajoutees });
              setMessage({ ton: "vert", texte: "Ampliations enregistrées." });
              setDialogue(null);
              recharger();
            } catch (e) {
              setMessage({ ton: "rouge", texte: (e as Error).message });
            }
          }}
        />
      )}
      {dialogue === "intro" && (
        <Introduction
          note={note}
          fermer={() => setDialogue(null)}
          ok={async (t) => {
            try {
              await api.patch(`/notes/${id}`, { introduction: t });
              setDialogue(null);
              recharger();
            } catch (e) {
              setMessage({ ton: "rouge", texte: (e as Error).message });
            }
          }}
        />
      )}
    </div>
  );
}

const NIVEAUX = [
  { code: "BUREAU", libelle: "Chef de bureau" },
  { code: "SERVICE", libelle: "Chef de service" },
  { code: "DIRECTION", libelle: "Directeur" },
] as const;

/**
 * Après la validation du DG : lecture et avis de conformité (bureau, service, direction), ordre d'impression,
 * puis, après la signature du ministre, le scan PDF de la note signée qui clôture l'opération.
 */
function CirculationNote({
  note,
  recharger,
  signalerErreur,
  signalerSucces,
}: {
  note: NoteDetail;
  recharger: () => void;
  signalerErreur: (t: string) => void;
  signalerSucces: (t: string) => void;
}) {
  const { profil } = useSession();
  const [avisPour, setAvisPour] = useState<{ niveau?: string; conforme: boolean } | null>(null);
  const [remarque, setRemarque] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const champ = useRef<HTMLInputElement>(null);
  const avis = note.conformite ?? [];
  const signee = note.statut === "SIGNEE";
  const peutDonner = ["AGENT", "CHEF_SERVICE", "DIRECTEUR", "BUREAU_ETUDES", "ADMIN"].includes(profil.role);
  const tousConformes = NIVEAUX.every((n) => avis.some((a) => a.niveau === n.code && a.conforme));
  const dg = peut.decider(profil.role);

  async function appel(chemin: string, corps: unknown, succes: string) {
    try {
      await api.post(`/notes/${note.id}/${chemin}`, corps);
      signalerSucces(succes);
      setAvisPour(null);
      setRemarque("");
      recharger();
    } catch (e) {
      signalerErreur((e as Error).message);
    }
  }

  async function envoyerScan(f: File | undefined) {
    if (!f) return;
    const fd = new FormData();
    fd.append("fichier", f);
    setEnvoi(true);
    try {
      await api.post(`/notes/${note.id}/scan`, fd);
      signalerSucces("Scan enregistré : l’opération est clôturée et la note est aux archives.");
      recharger();
    } catch (e) {
      signalerErreur((e as Error).message);
    } finally {
      setEnvoi(false);
      if (champ.current) champ.current.value = "";
    }
  }

  return (
    <Carte titre={signee ? "Clôture de la note" : "Lecture, avis de conformité et impression"}>
      {!signee && (
        <>
          <p className="mb-3 text-[13px] leading-relaxed text-zinc-600">
            Avant que la note parte à la signature du ministre, le chef de bureau, le chef de service et le directeur la <strong>lisent</strong> (à l’écran ou sur papier) et
            disent chacun si elle est <strong>conforme</strong> : leur visa les engage. Quand les trois avis sont « conforme », le DG ordonne l’impression.
          </p>
          <ul className="space-y-2">
            {NIVEAUX.map((n) => {
              const a = avis.find((x) => x.niveau === n.code);
              return (
                <li key={n.code} className="flex flex-wrap items-center gap-3 rounded-2xl bg-zinc-50 px-3 py-2 text-[13px]">
                  <span className="w-32 font-medium">{n.libelle}</span>
                  {!a ? (
                    <Badge ton="gris">Avis attendu</Badge>
                  ) : a.conforme ? (
                    <Badge ton="vert">Conforme</Badge>
                  ) : (
                    <Badge ton="rouge">Pas conforme</Badge>
                  )}
                  {a && (
                    <span className="text-[12px] text-zinc-500">
                      {a.par} · {dateCourte(a.le)}
                      {a.remarque ? ` · « ${a.remarque} »` : ""}
                    </span>
                  )}
                  {profil.role === "ADMIN" && (
                    <span className="ml-auto flex gap-2">
                      <Bouton onClick={() => setAvisPour({ niveau: n.code, conforme: true })}>Conforme</Bouton>
                      <Bouton variante="danger" onClick={() => setAvisPour({ niveau: n.code, conforme: false })}>Pas conforme</Bouton>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          {peutDonner && profil.role !== "ADMIN" && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Bouton variante="principal" onClick={() => setAvisPour({ conforme: true })}>
                J’ai lu la note : elle est conforme
              </Bouton>
              <Bouton variante="danger" onClick={() => setAvisPour({ conforme: false })}>
                Elle n’est pas conforme
              </Bouton>
              <Aide>Votre avis remplace celui que vous auriez déjà donné. « Pas conforme » : dites ce qu’il faut corriger, le DG rouvrira la note.</Aide>
            </div>
          )}
          {note.impressionPour ? (
            <Alerte ton="vert">
              <strong>Impression ordonnée</strong> à {note.impressionPour === "DIRECTEUR" ? "le directeur" : "le secrétariat"} par {note.impressionOrdonneePar} le{" "}
              {dateCourte(note.impressionOrdonneeLe)} : la version imprimée part à la signature du ministre. Au retour, enregistrez le numéro et la date de signature (bouton en
              haut), puis joignez le scan.
            </Alerte>
          ) : (
            dg && (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-3">
                <span className="text-[13px] font-medium">Ordonner l’impression :</span>
                <Bouton variante="principal" disabled={!tousConformes} onClick={() => appel("ordre-impression", { pour: "DIRECTEUR" }, "Impression demandée au directeur.")}>
                  Demander au directeur d’imprimer
                </Bouton>
                <Bouton variante="principal" disabled={!tousConformes} onClick={() => appel("ordre-impression", { pour: "SECRETARIAT" }, "Impression demandée au secrétariat.")}>
                  Demander au secrétariat d’imprimer
                </Bouton>
                {!tousConformes && <span className="text-[12px] text-zinc-500">Possible quand les trois avis sont « conforme ».</span>}
              </div>
            )
          )}
        </>
      )}
      {signee && (
        <div className="space-y-3 text-[13px]">
          {note.scanFichier ? (
            <>
              <Alerte ton="vert">
                <strong>Opération clôturée.</strong> Note n° {note.numero} signée le {dateCourte(note.dateSignature)} ; scan joint le {dateCourte(note.scanLe)}
                {note.scanPar ? ` par ${note.scanPar}` : ""}.
              </Alerte>
              <div className="flex flex-wrap gap-2">
                <Bouton onClick={() => api.ouvrirFichier(`/notes/${note.id}/scan`).catch((e: Error) => signalerErreur(e.message))}>Voir la note signée (scan)</Bouton>
                {peut.traiter(profil.role) && (
                  <Bouton chargement={envoi} onClick={() => champ.current?.click()}>
                    Remplacer le scan
                  </Bouton>
                )}
              </div>
            </>
          ) : (
            <>
              <Alerte ton="jaune">
                <strong>À clôturer.</strong> La note n° {note.numero} est signée. Joignez maintenant la version numérisée (PDF) de la note signée : elle est conservée aux archives
                et dans le dossier. Tant qu’elle n’est pas jointe, l’opération reste ouverte.
              </Alerte>
              <Bouton variante="principal" chargement={envoi} onClick={() => champ.current?.click()}>
                Joindre le scan PDF de la note signée
              </Bouton>
            </>
          )}
          <input ref={champ} type="file" accept=".pdf,application/pdf" className="hidden" onChange={(e) => envoyerScan(e.target.files?.[0])} />
        </div>
      )}
      {avisPour && (
        <Modale titre={avisPour.conforme ? "Note conforme" : "Note non conforme"} ouverte fermer={() => setAvisPour(null)}>
          <Champ
            libelle={avisPour.conforme ? "Remarque (facultative)" : "Ce qui n’est pas conforme *"}
            aide={avisPour.conforme ? "Votre avis est enregistré avec votre nom et la date." : "Une phrase suffit : le DG rouvrira la note pour la corriger."}
          >
            <Zone className="w-full" value={remarque} onChange={(e) => setRemarque(e.target.value)} />
          </Champ>
          <div className="mt-3 flex justify-end gap-2">
            <Bouton onClick={() => setAvisPour(null)}>Annuler</Bouton>
            <Bouton
              variante={avisPour.conforme ? "principal" : "danger"}
              disabled={!avisPour.conforme && !remarque.trim()}
              onClick={() => appel("conformite", { conforme: avisPour.conforme, remarque, niveau: avisPour.niveau }, "Votre avis est enregistré.")}
            >
              Enregistrer mon avis
            </Bouton>
          </div>
        </Modale>
      )}
    </Carte>
  );
}

function Renvoi({ fermer, ok }: { fermer: () => void; ok: (c: string) => void }) {
  const [c, setC] = useState("");
  return (
    <Modale titre="Renvoyer la note pour correction" ouverte fermer={fermer}>
      <Zone className="w-full" placeholder="Observations du DG" value={c} onChange={(e) => setC(e.target.value)} />
      <div className="mt-3 flex justify-end gap-2">
        <Bouton onClick={fermer}>Annuler</Bouton>
        <Bouton variante="danger" disabled={!c.trim()} onClick={() => ok(c)}>Renvoyer</Bouton>
      </div>
    </Modale>
  );
}

function Signature({ note, fermer, ok }: { note: NoteDetail; fermer: () => void; ok: (n: string, d: string) => void }) {
  const [numero, setNumero] = useState(note.numero ?? "");
  const [date, setDate] = useState(note.dateSignature ?? "");
  return (
    <Modale titre="Signature de la note" ouverte fermer={fermer}>
      <div className="grid grid-cols-2 gap-3">
        <Champ libelle="N° de la note" aide={`Sera imprimé : N° ${numero || "…"}/${note.entete.reference}`}>
          <Saisie value={numero} onChange={(e) => setNumero(e.target.value)} />
        </Champ>
        <Champ libelle="Date de signature">
          <Saisie type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Champ>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Bouton onClick={fermer}>Annuler</Bouton>
        <Bouton variante="principal" disabled={!numero.trim() || !date} onClick={() => ok(numero, date)}>Enregistrer</Bouton>
      </div>
    </Modale>
  );
}

/** Lignes d’ampliation à garder, ou à ajouter ; les archives (2 sur le total) suivent et ne se décochent pas. */
function Ampliations({ note, fermer, ok }: { note: NoteDetail; fermer: () => void; ok: (exclues: string[], ajoutees: Ampliation[]) => void }) {
  const toutes: (Ampliation & { ajoutee?: boolean })[] = note.ampliationsToutes ?? note.contenu.ampliations;
  const calculees = toutes.filter((a) => a.libelle !== "Archives" && !a.ajoutee);
  const [ajoutees, setAjoutees] = useState<Ampliation[]>(toutes.filter((a) => a.ajoutee).map(({ libelle, nombre }) => ({ libelle, nombre })));
  const [exclues, setExclues] = useState<string[]>(note.ampliationsExclues ?? []);
  const [libelle, setLibelle] = useState("");
  const [nombre, setNombre] = useState("1");
  const [erreur, setErreur] = useState<string | null>(null);
  const lignes = [...calculees, ...ajoutees];
  const somme = lignes.filter((a) => !exclues.includes(a.libelle)).reduce((t, a) => t + (Number(a.nombre) || 0), 0) + 2;
  const basculer = (l: string) => setExclues((x) => (x.includes(l) ? x.filter((y) => y !== l) : [...x, l]));
  const ajouter = () => {
    const l = libelle.replace(/\s+/g, " ").trim();
    const n = Number(nombre);
    if (!l) return setErreur("Écrivez le destinataire de la copie.");
    if (!Number.isInteger(n) || n < 1 || n > 99) return setErreur("Nombre d’exemplaires : de 1 à 99.");
    if (l.toLowerCase() === "archives" || lignes.some((a) => a.libelle.toLowerCase() === l.toLowerCase())) return setErreur(`« ${l} » figure déjà dans la liste.`);
    setAjoutees((x) => [...x, { libelle: l, nombre: String(n) }]);
    setLibelle("");
    setNombre("1");
    setErreur(null);
  };
  const retirer = (l: string) => {
    setAjoutees((x) => x.filter((a) => a.libelle !== l));
    setExclues((x) => x.filter((y) => y !== l));
  };
  return (
    <Modale titre="Ampliations" ouverte fermer={fermer}>
      <p className="mb-3 text-sm text-zinc-600">Décochez les destinataires qui ne reçoivent pas de copie de cette note, ou ajoutez-en un en bas. Les archives gardent 2 exemplaires sur le total, recalculé ici.</p>
      <ul className="divide-y divide-zinc-100 rounded-xl ring-1 ring-zinc-200">
        {lignes.map((a) => {
          const exclue = exclues.includes(a.libelle);
          const ajoutee = ajoutees.includes(a);
          return (
            <li key={a.libelle} className="flex items-center gap-2 pr-2 hover:bg-zinc-50">
              <label className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-3 py-2 pl-3 text-sm">
                <span className="flex min-w-0 items-center gap-3">
                  <input type="checkbox" className="size-4 shrink-0 accent-marque-600" checked={!exclue} onChange={() => basculer(a.libelle)} />
                  <span className={`truncate ${exclue ? "text-zinc-400 line-through" : ""}`}>{a.libelle}</span>
                  {ajoutee && <Badge ton="bleu">ajoutée</Badge>}
                </span>
                <span className={`tabular-nums ${exclue ? "text-zinc-400" : ""}`}>{a.nombre}</span>
              </label>
              {ajoutee && (
                <button type="button" className="rounded-lg px-1.5 text-lg leading-none text-zinc-400 hover:bg-red-50 hover:text-red-600" title={`Retirer « ${a.libelle} »`} aria-label={`Retirer ${a.libelle}`} onClick={() => retirer(a.libelle)}>
                  ×
                </button>
              )}
            </li>
          );
        })}
        <li className="flex items-center justify-between gap-3 bg-zinc-50 px-3 py-2 text-sm">
          <span className="flex items-center gap-3">
            <input type="checkbox" className="size-4" checked disabled />
            Archives
          </span>
          <span className="font-semibold tabular-nums">2/{somme}</span>
        </li>
      </ul>
      <p className="mt-2 text-sm">
        Total : <span className="font-semibold tabular-nums">{somme}</span> exemplaire(s)
      </p>
      <form
        className="mt-4 rounded-xl bg-zinc-50 p-3 ring-1 ring-zinc-200"
        onSubmit={(e) => {
          e.preventDefault();
          ajouter();
        }}
      >
        <p className="mb-2 text-sm font-medium">Ajouter une ampliation</p>
        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-0 flex-1 text-xs text-zinc-600">
            Destinataire
            <Saisie className="mt-1 w-full" placeholder="Ex. : DDEPPSA Pool, Trésor public…" maxLength={60} value={libelle} onChange={(e) => setLibelle(e.target.value)} />
          </label>
          <label className="w-24 text-xs text-zinc-600">
            Exemplaires
            <Saisie className="mt-1 w-full" type="number" min={1} max={99} value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </label>
          <Bouton type="submit">Ajouter</Bouton>
        </div>
        {erreur && <p className="mt-2 text-sm text-red-600">{erreur}</p>}
      </form>
      <p className="mt-2 text-xs text-zinc-500">La ligne ajoutée ne vaut que pour cette note ; elle s’écrit avant les archives.</p>
      <div className="mt-3 flex justify-end gap-2">
        <Bouton onClick={fermer}>Annuler</Bouton>
        <Bouton variante="principal" onClick={() => ok(exclues.filter((x) => lignes.some((a) => a.libelle === x)), ajoutees)}>
          Enregistrer
        </Bouton>
      </div>
    </Modale>
  );
}

function Introduction({ note, fermer, ok }: { note: NoteDetail; fermer: () => void; ok: (t: string) => void }) {
  const [t, setT] = useState(note.introduction);
  return (
    <Modale titre="Texte d’introduction" ouverte fermer={fermer} large>
      <Zone className="min-h-40 w-full" value={t} onChange={(e) => setT(e.target.value)} />
      <p className="mt-1 text-xs text-zinc-500">« {"{annee}"} » est remplacé par l’année scolaire ({note.anneeScolaire}).</p>
      <div className="mt-3 flex justify-end gap-2">
        <Bouton onClick={fermer}>Annuler</Bouton>
        <Bouton variante="principal" onClick={() => ok(t)}>Enregistrer</Bouton>
      </div>
    </Modale>
  );
}

/** Choisir les notes du même type (autres lots) à réunir dans celle-ci. */
function Reunir({ note, fermer, ok }: { note: NoteDetail; fermer: () => void; ok: (avec: string[]) => void }) {
  const enrolement = note.module === "ENROLEMENT";
  const mutation = note.module === "MUTATION";
  const notes = useApi<NoteResume[]>(`/notes?module=${note.module === "NOMINATION" ? "AFFECTATION" : note.module}`);
  const [choix, setChoix] = useState<string[]>([]);
  // Enrôlement : n'importe quel autre type de la même campagne (au choix) ; affectation : le même type
  const candidates = (notes.donnees ?? []).filter(
    (n) =>
      n.id !== note.id &&
      n.statut === "BROUILLON" &&
      (mutation
        ? n.motif === note.motif && !n.additifDe && !n.rectificatifDe && n.lotRangement == null
        : enrolement
          ? n.campagneId === note.campagneId && !n.additifDe && !n.rectificatifDe && n.lotRangement == null
          : n.typeNote === note.typeNote),
  );
  return (
    <Modale titre="Réunir avec une autre note" ouverte fermer={fermer}>
      <p className="text-[13px] leading-relaxed text-zinc-600">
        Les personnes des notes cochées passent dans <strong>« {note.libelle} »</strong>, et ces notes sont retirées.{" "}
        {mutation
          ? "Les notes du même motif encore « à soumettre au DG » sont proposées (l’autre groupe de cycles) ; l’introduction citera tous les agents."
          : enrolement
          ? "Toutes les notes d’enrôlement de la campagne encore « à soumettre au DG » sont proposées, quel que soit leur type ; l’introduction citera tous les diplômes."
          : "Seules les notes du même type, encore « à soumettre au DG », sont proposées."}
      </p>
      <div className="mt-4 max-h-72 space-y-1.5 overflow-y-auto">
        {notes.chargement && <Chargement />}
        {!notes.chargement && !candidates.length && <Alerte ton="jaune">Aucune autre note de ce type n’est à soumettre au DG.</Alerte>}
        {candidates.map((n) => (
          <label key={n.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 px-3 py-2.5 text-[13px] hover:border-marque-300">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-marque-600"
              checked={choix.includes(n.id)}
              onChange={(e) => setChoix((c) => (e.target.checked ? [...c, n.id] : c.filter((x) => x !== n.id)))}
            />
            <span>
              <span className="font-medium text-encre">{n.libelle}</span>
              <span className="block text-[12px] text-zinc-500">{n.total} personne(s)</span>
            </span>
          </label>
        ))}
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Bouton onClick={fermer}>Annuler</Bouton>
        <Bouton variante="principal" disabled={!choix.length} onClick={() => ok(choix)}>
          Réunir {choix.length ? `(${choix.length + 1} notes en une)` : ""}
        </Bouton>
      </div>
    </Modale>
  );
}
