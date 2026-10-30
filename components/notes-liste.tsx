"use client";

import { FilePen, FileSignature, Lock, Send, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useCampagne } from "./enrolement/commun";
import { useSession } from "./session";
import { Aide, Alerte, Annonce, Badge, Bouton, Carte, Champ, Chargement, EnTete, Liste, Modale, Pastille, Saisie, Tableau, Vide } from "./ui";
import { api, qs, useApi } from "@/lib/api";
import { dateCourte, peut, STATUT_NOTE } from "@/lib/libelles";
import type { NoteResume, StatutNote } from "@/lib/types";
import type { Ton } from "@/lib/libelles";

const ETAPES: { statut: StatutNote; texte: string; icone: LucideIcon; ton: Ton }[] = [
  { statut: "BROUILLON", texte: "Préparée, à relire puis à envoyer au DG ; se met à jour toute seule", icone: FilePen, ton: "gris" },
  { statut: "SOUMISE", texte: "Transmise pour validation", icone: Send, ton: "jaune" },
  { statut: "VALIDEE", texte: "Contenu figé, agents marqués comme traités", icone: Lock, ton: "bleu" },
  { statut: "SIGNEE", texte: "Numéro et date de signature reportés", icone: FileSignature, ton: "vert" },
];

const TITRES = {
  AFFECTATION: {
    titre: "Notes d’affectation",
    aide: "Une note par type (préscolaire, primaire, DEMA, établissements, personnel administratif, décrets) et par lot (un lot = un quota et un type de texte dans un paquet). Les notes se préparent depuis l’écran « Traitement des affectations ».",
  },
  MUTATION: { titre: "Notes de mutation", aide: "Une note par motif et par groupe de cycles, avec les demandes accordées par le Ministre." },
  NOMINATION: {
    titre: "Notes de nomination",
    aide: "Une note par fonction (directeurs d’école, directeurs des études, surveillants généraux, économes, proviseurs, inspecteurs…), avec les nominations validées dans « Nominations », par département puis par circonscription. Les personnes relevées n’y figurent pas.",
  },
  ENROLEMENT: {
    titre: "Notes d’enrôlement",
    aide: "Une note par diplôme avec les volontaires retenus par la DGRHAS, classés par département puis par établissement. Pas de lots ici : on choisit la campagne et l’année scolaire.",
  },
};

/** Préparer les notes d'enrôlement : choix de la campagne et de l'année scolaire. */
function PreparerEnrolement({ fermer, apres }: { fermer: () => void; apres: (texte: string) => void }) {
  const { liste, campagne, choisir } = useCampagne();
  const [annee, setAnnee] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const valeur = annee || campagne?.anneeScolaire || "";
  async function preparer() {
    if (!campagne) return;
    setErreur(null);
    setEnvoi(true);
    try {
      const n = await api.post<NoteResume[]>("/notes/preparer/enrolement", { campagneId: campagne.id, anneeScolaire: valeur });
      apres(
        n.length
          ? `${n.length} note(s) d’enrôlement préparée(s) pour ${valeur}.`
          : `Les notes déjà en préparation ont été mises à jour (année ${valeur}) : ouvrez-les ci-dessous.`,
      );
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  }
  return (
    <Modale titre="Préparer les notes d’enrôlement" ouverte fermer={fermer}>
      <div className="space-y-4">
        <p className="text-[13px] text-zinc-600">
          Les volontaires <strong>retenus</strong> par la DGRHAS et pas encore dans une note sont mis dans une note par diplôme (licence, master, BET…).
        </p>
        <Champ libelle="Campagne">
          <Liste value={String(campagne?.id ?? "")} onChange={(e) => choisir(Number(e.target.value))} options={liste.map((c) => ({ valeur: c.id, libelle: `Enrôlement ${c.annee} — ${c.retenus} retenu(s)` }))} />
        </Champ>
        <Champ libelle="Année scolaire de la note" aide="Format 2026-2027">
          <Saisie value={valeur} onChange={(e) => setAnnee(e.target.value)} placeholder="2026-2027" />
        </Champ>
        {erreur && <Alerte>{erreur}</Alerte>}
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Bouton onClick={fermer}>Annuler</Bouton>
        <Bouton variante="principal" disabled={!campagne || !valeur || envoi} onClick={preparer}>
          Préparer les notes
        </Bouton>
      </div>
    </Modale>
  );
}

export function NotesListe({ module }: { module: "AFFECTATION" | "MUTATION" | "ENROLEMENT" | "NOMINATION" }) {
  const { profil } = useSession();
  const { donnees, erreur, recharger } = useApi<NoteResume[]>(`/notes${qs({ module })}`);
  const [message, setMessage] = useState<{ ton: "vert" | "rouge"; texte: string } | null>(null);
  const [enrolement, setEnrolement] = useState(false);

  async function preparerNominations() {
    try {
      const n = await api.post<NoteResume[]>("/notes/preparer/nomination", {});
      setMessage({
        ton: "vert",
        texte: n.length ? `${n.length} note(s) de nomination préparée(s).` : "Aucune nouvelle nomination validée à mettre en note (ou leurs notes sont déjà en préparation).",
      });
      recharger();
    } catch (e) {
      setMessage({ ton: "rouge", texte: (e as Error).message });
    }
  }

  async function preparerMutations() {
    try {
      const n = await api.post<NoteResume[]>("/notes/preparer/mutation");
      setMessage({
        ton: "vert",
        texte: n.length ? `${n.length} note(s) de mutation préparée(s).` : "Aucune nouvelle demande accordée à mettre en note.",
      });
      recharger();
    } catch (e) {
      setMessage({ ton: "rouge", texte: (e as Error).message });
    }
  }

  return (
    <div className="space-y-4">
      <EnTete
        titre={TITRES[module].titre}
        sousTitre={TITRES[module].aide}
        actions={
          peut.traiter(profil.role) &&
          (module === "MUTATION" ? (
            <Bouton variante="principal" onClick={preparerMutations}>
              Préparer les notes de mutation
            </Bouton>
          ) : module === "NOMINATION" ? (
            <Bouton variante="principal" onClick={preparerNominations}>
              Préparer les notes de nomination
            </Bouton>
          ) : module === "ENROLEMENT" ? (
            <Bouton variante="principal" onClick={() => setEnrolement(true)}>
              Préparer les notes de service
            </Bouton>
          ) : null)
        }
      />
      <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {ETAPES.map((e, i) => (
          <li key={e.statut} className="flex items-start gap-3 rounded-3xl bg-white p-4 shadow-doux">
            <Pastille ton={e.ton}>
              <e.icone />
            </Pastille>
            <div className="min-w-0">
              <div className="text-[11px] text-zinc-400">Étape {i + 1}</div>
              <div className="flex items-center gap-1.5 text-[13px] font-semibold">
                {STATUT_NOTE[e.statut].libelle}
                <Aide>{STATUT_NOTE[e.statut].aide}</Aide>
              </div>
              <div className="mt-0.5 text-[11px] leading-snug text-zinc-500">{e.texte}</div>
            </div>
          </li>
        ))}
      </ol>
      <Annonce ton={message?.ton} fermer={() => setMessage(null)}>{message?.texte}</Annonce>
      {enrolement && (
        <PreparerEnrolement
          fermer={() => setEnrolement(false)}
          apres={(texte) => {
            setEnrolement(false);
            setMessage({ ton: "vert", texte });
            recharger();
          }}
        />
      )}
      {erreur && <Alerte>{erreur}</Alerte>}
      <Carte>
        {!donnees ? (
          <Chargement />
        ) : !donnees.length ? (
          <Vide>Aucune note pour le moment.</Vide>
        ) : (
          <Tableau>
            <thead>
              <tr>
                <th>Note</th>
                <th className="text-right">Agents</th>
                <th>Statut</th>
                <th>N° / date de signature</th>
                <th>Suivi</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {donnees.map((n) => (
                <tr key={n.id}>
                  <td className="font-medium">
                    {n.libelle}
                    <div className="text-xs font-normal text-zinc-500">Année scolaire {n.anneeScolaire}</div>
                    {n.commentaire && n.statut === "BROUILLON" && <div className="text-xs font-normal text-rouge-600">Renvoyée par le DG : {n.commentaire}</div>}
                  </td>
                  <td className="text-right tabular-nums">
                    {n.total}
                    {!!n.enAttente && ["BROUILLON", "SOUMISE"].includes(n.statut) && (
                      <div className="text-[11px] font-medium text-or-700">+ {n.enAttente} retenu(s) sans département retenu : à placer</div>
                    )}
                    {n.total === 0 && !n.enAttente && ["BROUILLON", "SOUMISE"].includes(n.statut) && <div className="text-[11px] font-medium text-or-700">vide : à supprimer</div>}
                  </td>
                  <td>
                    <span className="inline-flex items-center gap-1">
                      <Badge ton={STATUT_NOTE[n.statut].ton}>{STATUT_NOTE[n.statut].libelle}</Badge>
                      <Aide>{STATUT_NOTE[n.statut].aide}</Aide>
                    </span>
                  </td>
                  <td className="text-xs">{n.numero ? `N° ${n.numero} du ${dateCourte(n.dateSignature)}` : "—"}</td>
                  <td className="text-xs text-zinc-600">
                    Préparée par {n.creePar ?? "—"}
                    {n.soumisePar && <div>Soumise par {n.soumisePar}</div>}
                    {n.valideePar && <div>Validée par {n.valideePar} le {dateCourte(n.valideeLe)}</div>}
                  </td>
                  <td>
                    <Link href={`/note/${n.id}`}>
                      <Bouton variante="discret">Ouvrir</Bouton>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </Tableau>
        )}
      </Carte>
    </div>
  );
}
