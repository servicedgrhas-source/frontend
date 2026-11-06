"use client";

import { useState } from "react";
import { useSession } from "@/components/session";
import { Alerte, Bouton, Champ, Liste, Modale, Saisie, Zone } from "@/components/ui";
import { api } from "@/lib/api";
import { SaisieReferentiel } from "@/components/saisie-referentiel";
import { ChoixNote, SaisieSpecialite, specialiteVide } from "@/components/enrolement/changer-note";
import type { Enrole } from "@/components/enrolement/commun";

/**
 * Proposer une recommandation (mutation, enrôlement) : autre département ou autre lieu que ce que la
 * règle donne. Le directeur donne ensuite son avis, puis le DG décide (page Recommandations).
 */
export function ProposerRecommandation({
  url,
  personne,
  avant,
  libelleLieu = "Établissement ou lieu demandé",
  enrole,
  fermer,
  apres,
}: {
  /** Enrôlement : on peut aussi recommander une autre note (et la spécialité qui va avec). */
  enrole?: Enrole;
  /** Ex. `/mutations/<id>/recommandations` */
  url: string;
  personne: string;
  /** Ce que la règle donne aujourd'hui (département, lieu). */
  avant: string;
  libelleLieu?: string;
  fermer: () => void;
  apres: () => void;
}) {
  const { refs, profil } = useSession();
  const [departementId, setDepartementId] = useState("");
  const [etablissement, setEtablissement] = useState("");
  const [origine, setOrigine] = useState("");
  const [motif, setMotif] = useState("");
  const [typeNote, setTypeNote] = useState<string | null>(null);
  const [specialite, setSpecialite] = useState("");
  const cibles = enrole?.notesPossibles ?? [];
  const choix = cibles.find((c) => c.note === typeNote && c.note !== enrole?.noteActuelle) ?? null;
  const [erreur, setErreur] = useState<string | null>(null);
  const directe = ["DIRECTEUR", "DG", "ADMIN"].includes(profil.role);
  return (
    <Modale titre={`Recommandation pour ${personne}`} ouverte fermer={fermer} large={!!enrole}>
      <div className="space-y-3">
        <p className="text-[12px] text-zinc-500">
          Aujourd’hui : <strong className="text-encre">{avant || "—"}</strong>. Une recommandation change ce que la règle donne ; elle
          {directe ? " va directement à la décision du DG" : " passe par l’avis du directeur, puis la décision du DG"}. Validée, elle s’applique au dossier et ressort sur la note.
        </p>
        {enrole && cibles.length > 0 && (
          <div className="rounded-2xl bg-zinc-50 p-3">
            <div className="mb-2 text-[13px] font-semibold text-encre">Note demandée</div>
            <p className="mb-2 text-[12px] text-zinc-500">Une recommandation peut aussi changer la note du volontaire (un instituteur dans la note du collège…). Laissez la note d’aujourd’hui si elle ne change pas.</p>
            <ChoixNote cibles={cibles} valeur={typeNote ?? enrole.noteActuelle ?? null} changer={setTypeNote} actuelle={enrole.noteActuelle} />
            {choix && !choix.specialite && (
              <div className="mt-3">
                <Champ
                  libelle="Spécialité (facultatif)"
                  aide={specialiteVide(enrole.specialite) ? "Ce volontaire n’a pas de matière : la colonne « Spécialité » de la note serait vide. Cela ne bloque pas la recommandation." : `Aujourd’hui : ${enrole.specialite}. Laissez vide pour la garder.`}
                >
                  <SaisieSpecialite campagneId={enrole.campagneId} valeur={specialite} changer={setSpecialite} />
                </Champ>
              </div>
            )}
            {choix?.specialite && !enrole.specialite?.trim() && <p className="mt-2 text-[12px] text-emerald-700">Sans spécialité : la règle lui donnera « {choix.specialite} ».</p>}
          </div>
        )}
        <Champ libelle="Département demandé">
          <Liste value={departementId} onChange={(e) => setDepartementId(e.target.value)} vide="— Inchangé —" options={refs.departements.map((d) => ({ valeur: d.id, libelle: d.nom }))} />
        </Champ>
        <Champ libelle={libelleLieu}>
          <SaisieReferentiel liste="ETABLISSEMENT" valeur={etablissement} changer={setEtablissement} departementId={departementId} placeholder="Laisser vide si inchangé" />
        </Champ>
        <Champ libelle="Qui recommande *" aide="L’intéressé lui-même, une autorité (« S/C Conseiller X »)…">
          <Saisie value={origine} onChange={(e) => setOrigine(e.target.value)} />
        </Champ>
        <Champ libelle="Motif">
          <Zone value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Ex. raison de santé, rapprochement de conjoints" />
        </Champ>
        {erreur && <Alerte>{erreur}</Alerte>}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Bouton onClick={fermer}>Annuler</Bouton>
        <Bouton
          variante="principal"
          onClick={async () => {
            setErreur(null);
            try {
              await api.post(url, {
                departementId: departementId ? Number(departementId) : null,
                etablissement: etablissement.trim() || null,
                ...(enrole ? { typeNote: choix?.note ?? null, specialite: specialite.trim() || null } : {}),
                origine,
                motif: motif.trim() || null,
              });
              apres();
            } catch (e) {
              setErreur((e as Error).message);
            }
          }}
        >
          Proposer
        </Bouton>
      </div>
    </Modale>
  );
}
