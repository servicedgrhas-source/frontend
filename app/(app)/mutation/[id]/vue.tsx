"use client";

import { ArrowLeft, ArrowLeftRight, ArrowRight, Printer, Send } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { CircuitDemande } from "@/components/circuit-demande";
import { FormulaireMutation } from "@/components/formulaire-mutation";
import { PiecesDemande } from "@/components/pieces-demande";
import { useSession } from "@/components/session";
import { Alerte, Annonce, Badge, Bouton, Carte, Champ, Chargement, Modale, Pastille, Saisie } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { CYCLES, dateCourte, duree, ETAT_MUTATION, peut } from "@/lib/libelles";
import type { DemandeMutation } from "@/lib/types";

export function VueMutation() {
  const { id } = useParams<{ id: string }>();
  const { profil, refs } = useSession();
  const { donnees: d, erreur, recharger, setDonnees } = useApi<DemandeMutation>(`/mutations/${id}`);
  const [edition, setEdition] = useState(false);
  const [message, setMessage] = useState<{ ton: "vert" | "rouge"; texte: string } | null>(null);
  const types = useApi<{ code: string; libelle: string; pieces: string[] }[]>("/prestations");
  // Fenêtre de retrait (motif obligatoire) ou de réintégration
  const [dialogueRetrait, setDialogueRetrait] = useState<"retirer" | "reintegrer" | null>(null);
  const [motifRetrait, setMotifRetrait] = useState("");

  if (erreur) return <Alerte>{erreur}</Alerte>;
  if (!d) return <Chargement />;

  async function retrait(retirer: boolean) {
    setDialogueRetrait(null);
    try {
      setDonnees(await api.post<DemandeMutation>(`/mutations/${id}/retrait`, { retirer, motif: retirer ? motifRetrait.trim() : "" }));
      setMessage({ ton: "vert", texte: retirer ? "Demande retirée : elle n’entrera dans aucune note de mutation." : "Demande réintégrée : elle reprend sa place." });
    } catch (e) {
      setMessage({ ton: "rouge", texte: (e as Error).message });
    }
  }

  // Dossier accordé : le DG le confie à son secrétariat, qui imprime la fiche et les pièces jointes
  const accordee = !d.retiree && (d.decision === "ACCORDEE" || d.instructionMinistre === "ACCORDEE");
  async function envoyerSecretariat() {
    try {
      setDonnees(await api.post<DemandeMutation>(`/mutations/${id}/secretariat`));
      setMessage({ ton: "vert", texte: "Dossier envoyé au secrétariat : il imprimera la fiche individuelle et les pièces jointes." });
    } catch (e) {
      setMessage({ ton: "rouge", texte: (e as Error).message });
    }
  }

  const motif = refs.motifs.find((m) => m.code === d.motif)?.libelle;
  const type = types.donnees?.find((t) => t.code === d.typePrestation);
  const verrouillee = !!d.noteId;
  const modifiable = !verrouillee && !d.instructionMinistre && peut.traiter(profil.role);

  if (edition)
    return (
      <div>
        <Bouton variante="discret" onClick={() => setEdition(false)}>← Annuler la modification</Bouton>
        <h1 className="mb-4 text-xl font-semibold">Modifier la demande n° {d.numeroEnregistrement}</h1>
        <FormulaireMutation
          demande={d}
          apres={() => {
            setEdition(false);
            recharger();
          }}
        />
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/mutations" className="inline-flex items-center gap-1 text-xs font-medium text-marque-700 hover:underline">
            <ArrowLeft className="size-3.5" /> Demandes de mutation
          </Link>
          <h1 className="mt-2 text-[26px] font-semibold tracking-tight">{d.nomComplet}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-zinc-500">
            <span>Demande n° {d.numeroEnregistrement} du {dateCourte(d.dateEnregistrement)}</span>
            <Badge ton={ETAT_MUTATION[d.etat].ton}>{ETAT_MUTATION[d.etat].libelle}</Badge>
            {verrouillee && <Badge ton="vert">Dans une note validée</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Bouton onClick={() => window.open(`/impression/mutation/${id}`, "_blank")}>
            <Printer /> Imprimer la fiche
          </Bouton>
          {accordee && profil.role === "DG" && (
            <Bouton variante={d.envoyeSecretariatLe ? "secondaire" : "principal"} onClick={envoyerSecretariat}>
              <Send /> {d.envoyeSecretariatLe ? "Renvoyer au secrétariat" : "Envoyer au secrétariat"}
            </Bouton>
          )}
          {modifiable && <Bouton onClick={() => setEdition(true)}>Modifier</Bouton>}
          {!verrouillee && peut.traiter(profil.role) && (
            <Bouton
              variante={d.retiree ? "secondaire" : "danger"}
              onClick={() => {
                setMotifRetrait("");
                setDialogueRetrait(d.retiree ? "reintegrer" : "retirer");
              }}
            >
              {d.retiree ? "Réintégrer" : "Retirer"}
            </Bouton>
          )}
        </div>
      </div>
      <Annonce ton={message?.ton} fermer={() => setMessage(null)}>{message?.texte}</Annonce>
      {d.retiree && <Alerte>Demande retirée : {d.motifRetrait}</Alerte>}
      {accordee && !d.envoyeSecretariatLe && profil.role === "DG" && (
        <Alerte ton="jaune">
          <strong>Dossier accordé, pas encore envoyé au secrétariat.</strong> Cliquez sur « Envoyer au secrétariat » : sans cela, personne n’imprime la fiche
          individuelle ni les pièces jointes pour la signature du ministre.
        </Alerte>
      )}
      {accordee && d.envoyeSecretariatLe && (
        <Alerte ton="bleu">
          Envoyé au secrétariat le {dateCourte(d.envoyeSecretariatLe)}
          {d.envoyeSecretariatPar ? ` par ${d.envoyeSecretariatPar}` : ""} : le secrétariat imprime la fiche individuelle et les pièces jointes (bouton « Imprimer les pièces
          jointes » ci-dessous).
        </Alerte>
      )}
      {!modifiable && !verrouillee && d.instructionMinistre && peut.traiter(profil.role) && (
        <Alerte ton="bleu">
          La demande a été tranchée : elle ne se modifie plus, car la décision porte sur ce qui y est écrit. En cas d’erreur, retirez-la (bouton « Retirer ») et
          enregistrez une nouvelle demande correcte.
        </Alerte>
      )}
      <Modale titre={dialogueRetrait === "retirer" ? "Retirer cette demande ?" : "Réintégrer cette demande ?"} ouverte={!!dialogueRetrait} fermer={() => setDialogueRetrait(null)}>
        {dialogueRetrait === "retirer" ? (
          <Champ libelle="Motif du retrait *" aide="Écrit sur la demande. La demande n’entrera dans aucune note de mutation.">
            <Saisie autoFocus value={motifRetrait} onChange={(e) => setMotifRetrait(e.target.value)} list="motifs-retrait" placeholder="Ex. déjà muté" />
            <datalist id="motifs-retrait">
              <option value="Note individuelle" />
              <option value="Déjà muté" />
              <option value="Détachement" />
              <option value="Demande retirée par l’agent" />
              <option value="Doublon" />
            </datalist>
          </Champ>
        ) : (
          <p className="text-[13px] leading-relaxed text-zinc-600">La demande reprend sa place : si elle est accordée, elle entrera dans la note de mutation.</p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Bouton onClick={() => setDialogueRetrait(null)}>Annuler</Bouton>
          <Bouton
            variante={dialogueRetrait === "retirer" ? "danger" : "principal"}
            disabled={dialogueRetrait === "retirer" && !motifRetrait.trim()}
            onClick={() => retrait(dialogueRetrait === "retirer")}
          >
            {dialogueRetrait === "retirer" ? "Retirer la demande" : "Réintégrer"}
          </Bouton>
        </div>
      </Modale>
      {d.anomalies.length > 0 && <Alerte ton="jaune">{d.anomalies.join(" · ")}</Alerte>}

      <section className="flex flex-wrap items-center gap-4 rounded-3xl bg-nuit px-6 py-5 text-white">
        <Pastille ton="jaune" taille="lg">
          <ArrowLeftRight />
        </Pastille>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-[0.14em] text-white/40">{motif}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-lg font-semibold">
            <span className="text-white/60">{d.departementOrigine?.nom ?? "?"}</span>
            <ArrowRight className="size-4 text-or-400" />
            <span>{d.departementSollicite?.nom ?? "?"}</span>
          </div>
          <div className="truncate text-xs text-white/45">
            {d.lieuService ?? "Lieu de service non précisé"} · {duree(d.dureeMoisCalculee)} dans le poste
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Carte titre="Agent et demande">
          <dl className="grid grid-cols-[11rem_1fr] gap-x-4 gap-y-2.5 text-[13px]">
            <Ligne l="Type de demande">{type?.libelle ?? motif}</Ligne>
            {d.objet && <Ligne l="Objet">{d.objet}</Ligne>}
            <Ligne l="Reçue par">{d.canal === "PORTAIL" ? "le portail (faite par l’agent en ligne)" : d.canal === "IMPORT" ? "fichier Excel (DDEPPSA)" : "dossier papier saisi à la DGRHAS"}</Ligne>
            {d.telephone && <Ligne l="Téléphone de l’agent">{d.telephone}</Ligne>}
            {d.structureOrigineTexte && <Ligne l="Établissement (écrit par l’agent)">{d.structureOrigineTexte}</Ligne>}
            <Ligne l="Grade / échelon">{[d.grade, d.echelon].filter((x) => x !== null).join(" ") || "—"}</Ligne>
            <Ligne l="Matricule solde">{d.matricule ?? "—"}</Ligne>
            <Ligne l="Type">{d.typeAgent === "FINALISTE" ? "Finaliste" : "Fonctionnaire"}</Ligne>
            <Ligne l="Statut">{d.statutAgent === "ENSEIGNANT" ? "Enseignant actif" : "Personnel administratif"}</Ligne>
            <Ligne l="Cycle / spécialité">{[d.cycle && CYCLES[d.cycle], d.specialite].filter(Boolean).join(" – ") || "—"}</Ligne>
            <Ligne l="Département d’origine">{d.departementOrigine?.nom ?? "—"}</Ligne>
            <Ligne l="Lieu de service">{d.lieuService ?? "—"}</Ligne>
            <Ligne l="Durée dans le poste">{duree(d.dureeMoisCalculee)}{d.datePriseService && ` (depuis le ${dateCourte(d.datePriseService)})`}</Ligne>
            <Ligne l="Département sollicité"><strong>{d.departementSollicite?.nom ?? "—"}</strong></Ligne>
            <Ligne l="Lieu sollicité">{d.lieuSollicite ?? "—"}</Ligne>
            <Ligne l="Motif">{motif}</Ligne>
            {d.permutant && (
              <Ligne l="Permute avec">
                <Link className="underline" href={`/mutation/${d.permutant.id}`}>{d.permutant.nomComplet}</Link>
              </Ligne>
            )}
            <Ligne l="Justificatif">
              {d.justificatif ?? "—"}
              {d.justificatifFichier && (
                <button className="ml-2 text-marque-700 underline" onClick={() => api.ouvrirFichier(`/mutations/${id}/justificatif`)}>
                  Voir la pièce jointe
                </button>
              )}
            </Ligne>
            <Ligne l="Origine">{d.origine ?? "—"}</Ligne>
            <Ligne l="Observation">{d.observation ?? "—"}</Ligne>
            <Ligne l="Saisie par">{d.saisiePar ?? "—"}</Ligne>
          </dl>
          <div className="mt-5 border-t border-zinc-100 pt-4">
            <div className="mb-2 text-[12px] font-semibold text-zinc-500">Pièces jointes (demande scannée et justificatifs)</div>
            <PiecesDemande id={d.id} exigees={type?.pieces ?? []} modifiable={!verrouillee && peut.traiter(profil.role)} ancien={!!d.justificatifFichier} />
          </div>
        </Carte>

        <div className="space-y-4">
          <CircuitDemande id={d.id} apres={recharger} />
        </div>
      </div>
    </div>
  );
}

function Ligne({ l, children }: { l: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-zinc-500">{l}</dt>
      <dd>{children}</dd>
    </>
  );
}
