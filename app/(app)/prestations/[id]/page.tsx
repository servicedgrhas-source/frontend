"use client";

import { ArrowLeft, FileSignature, FileText, FileUp, Paperclip, Printer, Trash2, Undo2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { CircuitDemande } from "@/components/circuit-demande";
import { PresentationPrestation } from "@/components/prestations";
import { useSession } from "@/components/session";
import { Alerte, Badge, Bouton, BoutonIcone, Carte, Chargement, Champ, Liste, Modale, Saisie, useConfirmation } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { peut } from "@/lib/libelles";
import { ETAT_PRESTATION, valeurChamp, type FichePrestation } from "@/lib/prestations";

const taille = (o: number) => (o > 1024 * 1024 ? `${(o / 1024 / 1024).toFixed(1)} Mo` : `${Math.ceil(o / 1024)} Ko`);
const jour = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");

/**
 * Une demande de prestation : le demandeur (d'après sa fiche du personnel au dépôt), la demande et
 * ses renseignements, les pièces (manquantes signalées), le circuit avec les avis, la décision et
 * l'acte. Le formulaire de la DGRHAS s'imprime rempli à tout moment.
 */
export default function FicheDemandePrestation() {
  const { id } = useParams<{ id: string }>();
  const { profil } = useSession();
  const f = useApi<FichePrestation>(`/demandes-prestation/${id}`);
  const [retrait, setRetrait] = useState(false);
  const d = f.donnees;
  if (f.erreur) return <Alerte>{f.erreur}</Alerte>;
  if (!d) return <Chargement />;
  const def = d.definition;
  const etat = ETAT_PRESTATION[d.etat];
  const ligne = (l: string, v: string | null | undefined) =>
    v ? (
      <div className="flex gap-3 py-1 text-[13px]">
        <span className="w-40 shrink-0 text-zinc-500">{l}</span>
        <span className="min-w-0 font-medium">{v}</span>
      </div>
    ) : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/prestations" className="inline-flex items-center gap-1 text-[13px] text-marque-700 hover:underline">
            <ArrowLeft className="size-4" /> Demandes de prestations
          </Link>
          <h1 className="mt-1 flex flex-wrap items-center gap-2 text-[22px] font-semibold tracking-tight text-encre">
            <span className="text-zinc-400 tabular-nums">{d.numero}</span> {d.agent.nomComplet}
            <Badge ton={etat.ton}>{etat.libelle}</Badge>
          </h1>
          <p className="text-[13px] text-zinc-500">
            {def?.libelle ?? d.type} · déposée le {jour(d.creeLe)} {d.canal === "PORTAIL" ? "par l’agent sur le portail" : d.creePar ? `par ${d.creePar}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Bouton onClick={() => window.open(`/impression/prestation/${id}`, "_blank")} title="Le formulaire de demande de prestation de la DGRHAS, rempli avec les avis déjà donnés">
            <Printer /> Formulaire
          </Bouton>
          {d.etat === "ACCORDEE" && (
            <Bouton variante="principal" onClick={() => window.open(`/impression/prestation/${id}?doc=acte`, "_blank")} title="Modèle proposé, en attendant le modèle officiel">
              <FileSignature /> {def?.acte ?? "Acte"}
            </Bouton>
          )}
          {d.peutRetirer && (
            <Bouton variante="danger" onClick={() => setRetrait(true)}>
              <Undo2 /> Retirer
            </Bouton>
          )}
        </div>
      </div>

      {d.etat === "RETIREE" && <Alerte ton="jaune">Demande retirée : {d.motifRetrait}</Alerte>}
      {d.etat === "ACCORDEE" && (
        <Alerte ton="vert">
          Demande accordée. L’acte (<strong>{def?.acte.toLowerCase()}</strong>) est prêt : imprimez-le, faites-le signer ({def?.signataire.replace(/^Le /, "le ")}), puis remettez-le à
          l’agent. L’agent peut aussi le voir sur le portail avec son numéro et son code.
        </Alerte>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <Carte
            titre="Le demandeur"
            actions={
              <Link href={`/personnel/agents/${d.agentId}`} className="text-[12px] font-medium text-marque-700 hover:underline">
                Fiche du personnel
              </Link>
            }
          >
            {ligne("Nom et prénoms", d.agent.nomComplet)}
            {ligne("Matricule solde", d.agent.matricule)}
            {ligne("Grade / cat. / échelle / échelon", [d.agent.grade, d.agent.categorie, d.agent.echelle, d.agent.echelon].some(Boolean) ? [d.agent.grade, d.agent.categorie, d.agent.echelle, d.agent.echelon].map((x) => x ?? "—").join(" / ") : null)}
            {ligne("Fonction", d.agent.fonction)}
            {ligne("Lieu de service", d.agent.lieuService)}
            {ligne("Ville / district", d.agent.ville)}
            {ligne("Département", d.agent.departement)}
            {ligne("Téléphone", d.agent.telephone)}
            <p className="mt-2 text-[11px] text-zinc-400">Ce que disait la fiche du personnel au dépôt de la demande.</p>
          </Carte>

          <Carte titre="La demande">
            {ligne("Objet", d.objet)}
            {def?.champs.map((c) => (
              <div key={c.cle}>{ligne(c.libelle, valeurChamp(c, d.details))}</div>
            ))}
            {ligne("Précisions", d.precisions)}
            {def && (
              <div className="mt-3">
                <PresentationPrestation def={def} sansCircuit />
              </div>
            )}
          </Carte>

          <Pieces d={d} recharger={f.recharger} />
        </div>

        <CircuitDemande id={id} base={`/demandes-prestation/${id}/circuit`} apres={f.recharger} />
      </div>

      {retrait && (
        <Retrait
          id={id}
          fermer={() => setRetrait(false)}
          apres={() => {
            setRetrait(false);
            f.recharger();
          }}
          dgrhas={peut.traiter(profil.role)}
        />
      )}
    </div>
  );
}

/** Pièces jointes : les exigées encore manquantes, l'ajout d'un scan, la consultation. */
function Pieces({ d, recharger }: { d: FichePrestation; recharger: () => void }) {
  const { profil } = useSession();
  const exigees = d.definition?.pieces.map((p) => p.libelle) ?? [];
  const [libelle, setLibelle] = useState(d.manquantes[0] ?? exigees[0] ?? "Autre pièce");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmation, demander] = useConfirmation();
  const ajouter = async (fichiers: File[]) => {
    if (!fichiers.length) return;
    setErreur(null);
    setEnvoi(true);
    const fd = new FormData();
    for (const x of fichiers) {
      fd.append("fichiers", x);
      fd.append("libelles", libelle);
    }
    try {
      await api.post(`/demandes-prestation/${d.id}/pieces`, fd);
      recharger();
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  };
  return (
    <Carte titre={`Pièces jointes (${d.pieces.length})`}>
      {d.manquantes.length > 0 && (
        <div className="mb-3 rounded-2xl bg-or-100/70 px-3 py-2 text-[12px] text-or-700">
          <strong>À fournir :</strong> {d.manquantes.join(" ; ")}
        </div>
      )}
      <ul className="divide-y divide-zinc-100">
        {d.pieces.map((p) => (
          <li key={p.id} className="flex items-center gap-2 py-1.5 text-[13px]">
            <Paperclip className="size-4 shrink-0 text-zinc-400" />
            <button type="button" className="min-w-0 flex-1 text-left hover:underline" onClick={() => api.ouvrirFichier(`/demandes-prestation/${d.id}/pieces/${p.id}`).catch((e: Error) => setErreur(e.message))}>
              <span className="block truncate font-medium">{p.libelle}</span>
              <span className="block truncate text-[11px] text-zinc-500">
                {p.nomOrigine} · {taille(p.taille)} · {p.ajoutePar ?? ""} le {jour(p.creeLe)}
              </span>
            </button>
            {peut.traiter(profil.role) && (
              <BoutonIcone
                libelle="Retirer cette pièce"
                ton="rouge"
                onClick={() =>
                  demander(`Retirer « ${p.nomOrigine} » du dossier ?`).then(async (ok) => {
                    if (!ok) return;
                    try {
                      await api.delete(`/demandes-prestation/${d.id}/pieces/${p.id}`);
                      recharger();
                    } catch (e) {
                      setErreur((e as Error).message);
                    }
                  })
                }
              >
                <Trash2 />
              </BoutonIcone>
            )}
          </li>
        ))}
        {!d.pieces.length && <li className="py-2 text-[12px] text-zinc-500">Aucune pièce.</li>}
      </ul>
      {d.peutAjouterPiece && (
        <div className="mt-3 flex flex-wrap items-end gap-2 rounded-2xl bg-zinc-50 p-3">
          <Champ libelle="Pièce" className="min-w-56 flex-1">
            <Liste value={libelle} onChange={(e) => setLibelle(e.target.value)} options={[...exigees, "Autre pièce"].map((x) => ({ valeur: x, libelle: `${d.manquantes.includes(x) ? "⚠ " : ""}${x}` }))} />
          </Champ>
          <label className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-nuit px-3.5 py-2 text-[13px] font-medium text-white ${envoi ? "opacity-50" : ""}`}>
            <FileUp className="size-4" /> {envoi ? "Envoi…" : "Joindre un scan"}
            <input
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png"
              multiple
              disabled={envoi}
              onChange={(e) => {
                void ajouter(Array.from(e.target.files ?? []));
                e.target.value = "";
              }}
            />
          </label>
        </div>
      )}
      {erreur && (
        <div className="mt-2">
          <Alerte>{erreur}</Alerte>
        </div>
      )}
      {confirmation}
    </Carte>
  );
}

function Retrait({ id, fermer, apres, dgrhas }: { id: string; fermer: () => void; apres: () => void; dgrhas: boolean }) {
  const [motif, setMotif] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  return (
    <Modale titre="Retirer la demande" ouverte fermer={fermer}>
      <div className="space-y-3 text-[13px]">
        <p className="text-zinc-600">
          La demande sort du circuit (déposée par erreur, abandonnée par l’agent…). Elle reste dans l’historique.
          {!dgrhas && " Possible tant que vous ne l’avez pas visée."}
        </p>
        <Champ libelle="Pourquoi ? *">
          <Saisie value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Ex. Déposée en double" />
        </Champ>
        {erreur && <Alerte>{erreur}</Alerte>}
        <div className="flex justify-end gap-2">
          <Bouton onClick={fermer}>Annuler</Bouton>
          <Bouton
            variante="danger"
            disabled={motif.trim().length < 3}
            onClick={async () => {
              try {
                await api.post(`/demandes-prestation/${id}/retirer`, { motif });
                apres();
              } catch (e) {
                setErreur((e as Error).message);
              }
            }}
          >
            <FileText /> Retirer la demande
          </Bouton>
        </div>
      </div>
    </Modale>
  );
}
