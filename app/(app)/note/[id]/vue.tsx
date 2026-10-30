"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useRef, useState } from "react";
import { NoteImprimable } from "@/components/note-imprimable";
import { useSession } from "@/components/session";
import { Aide, Alerte, Annonce, Badge, Bouton, Carte, Champ, Chargement, Modale, Saisie, Zone } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { dateCourte, peut, STATUT_NOTE } from "@/lib/libelles";
import type { NoteDetail, NoteResume } from "@/lib/types";

export function VueNote() {
  const { id } = useParams<{ id: string }>();
  const { profil } = useSession();
  const { donnees: note, erreur, recharger } = useApi<NoteDetail>(`/notes/${id}`);
  const [message, setMessage] = useState<{ ton: "vert" | "rouge"; texte: string } | null>(null);
  const [avecVisas, setAvecVisas] = useState(true);
  const [dialogue, setDialogue] = useState<"renvoyer" | "signer" | "intro" | "rouvrir" | "supprimer" | "reunir" | "separer" | null>(null);

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
      window.location.href = `/notes/${note!.module.toLowerCase()}`;
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
              api.telecharger(`/notes/${id}/word${aDesVisas && !avecVisas ? "?visas=0" : ""}`, `${note.libelle}.docx`).catch((e: Error) => setMessage({ ton: "rouge", texte: e.message }))
            }
          >
            Word
            <Aide>Télécharge la note dans Word, avec la même mise en page que la version imprimée, pour retoucher la présentation (espacer, faire descendre un tableau). La signature reste toujours avec la dernière ligne du tableau.</Aide>
          </Bouton>
          {s === "BROUILLON" && peut.decider(profil.role) && (
            <Bouton onClick={() => setDialogue("intro")}>
              Modifier l’introduction
              <Aide>
                Change le paragraphe d’introduction de la note (textes de référence, « Le Ministre … »). <strong>Réservé au DG.</strong>
              </Aide>
            </Bouton>
          )}
          {s === "BROUILLON" && peut.traiter(profil.role) && (
            <>
              {note.module === "AFFECTATION" && (
                <Bouton onClick={() => setDialogue("reunir")}>
                  Réunir avec une autre note
                  <Aide>
                    Une seule note au lieu de plusieurs : les personnes d’une autre note du même type (un autre lot, par exemple le lot 8 avec le lot 7) passent dans
                    celle-ci. Possible tant que les notes sont « à soumettre au DG ».
                  </Aide>
                </Bouton>
              )}
              {!!note.lotsReunis?.length && (
                <Bouton onClick={() => setDialogue("separer")}>
                  Séparer les lots
                  <Aide>Défait la réunion : cette note garde son premier lot ; chaque autre lot retrouvera sa note en la préparant.</Aide>
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
      {(s === "BROUILLON" || s === "SOUMISE") && note.contenu.total === 0 && (
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
        <NoteImprimable note={note} visas={avecVisas} />
      </div>

      <Modale titre="Supprimer cette note ?" ouverte={dialogue === "supprimer"} fermer={() => setDialogue(null)}>
        <div className="space-y-3 text-[13px] leading-relaxed text-zinc-600">
          <p>
            La note <strong>« {note.libelle} »</strong> sera effacée.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              les <strong>{note.contenu.total} personne(s)</strong> ne sont pas effacées : elles redeviennent « pas encore affectées » ;
            </li>
            <li>une nouvelle note pourra être préparée depuis « Traitement des affectations » (« Préparer les notes de ce lot »).</li>
          </ul>
          <p className="text-[12px] text-zinc-500">À faire seulement si la note a été préparée par erreur.</p>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Bouton onClick={() => setDialogue(null)}>Garder la note</Bouton>
          <Bouton variante="danger" onClick={supprimer}>
            Supprimer la note
          </Bouton>
        </div>
      </Modale>
      {dialogue === "reunir" && (
        <Reunir note={note} fermer={() => setDialogue(null)} ok={(avec) => action("fusionner", { avec }, "Notes réunies : une seule note pour ces lots.")} />
      )}
      <Modale titre="Séparer les lots ?" ouverte={dialogue === "separer"} fermer={() => setDialogue(null)}>
        <p className="text-[13px] leading-relaxed text-zinc-600">
          Cette note ne gardera que son premier lot. Les personnes des lots{" "}
          <strong>{(note.lotsReunis ?? []).map((l) => l.libelle).join(", ")}</strong> en sortent : pour elles, cliquez de nouveau sur « Préparer les notes de ce lot »
          dans « Traitement des affectations ».
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Bouton onClick={() => setDialogue(null)}>Annuler</Bouton>
          <Bouton variante="principal" onClick={() => action("separer", undefined, "Lots séparés.")}>
            Séparer les lots
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
  const notes = useApi<NoteResume[]>("/notes?module=AFFECTATION");
  const [choix, setChoix] = useState<string[]>([]);
  const candidates = (notes.donnees ?? []).filter((n) => n.id !== note.id && n.statut === "BROUILLON" && n.typeNote === note.typeNote);
  return (
    <Modale titre="Réunir avec une autre note" ouverte fermer={fermer}>
      <p className="text-[13px] leading-relaxed text-zinc-600">
        Les personnes des notes cochées passent dans <strong>« {note.libelle} »</strong>, et ces notes sont retirées. Seules les notes du même type, encore « à
        soumettre au DG », sont proposées.
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
