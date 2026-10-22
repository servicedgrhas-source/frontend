"use client";

import { UserRoundCheck } from "lucide-react";
import { useState } from "react";
import { Aide, Alerte, Bouton, Carte, Champ, Chargement, Liste, Saisie } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { dateCourte } from "@/lib/libelles";

interface EtatDelegation {
  delegueId: string | null;
  delegationFin: string | null;
  active: boolean;
  candidats: { id: string; nom: string }[];
  recues: { nom: string; fin: string }[];
}

/**
 * Délégation pendant une absence : un collègue vise et donne les avis à ma place jusqu'à une
 * date. Ses visas portent « par délégation de … ».
 */
export function Delegation() {
  const d = useApi<EtatDelegation>("/auth/delegation");
  const [choix, setChoix] = useState<{ delegueId: string; fin: string } | null>(null);
  const [message, setMessage] = useState<{ ton: "vert" | "rouge"; texte: string } | null>(null);
  if (!d.donnees) return <Chargement />;
  const v = choix ?? { delegueId: d.donnees.delegueId ?? "", fin: d.donnees.delegationFin ?? "" };
  const nom = (id: string | null) => d.donnees!.candidats.find((c) => c.id === id)?.nom ?? "—";

  async function enregistrer(arreter = false) {
    try {
      await api.put("/auth/delegation", arreter ? { delegueId: null } : { delegueId: v.delegueId, fin: v.fin });
      setMessage({ ton: "vert", texte: arreter ? "Délégation arrêtée : vous traitez de nouveau vos dossiers." : `Délégation enregistrée : ${nom(v.delegueId)} agit à votre place jusqu’au ${dateCourte(v.fin)}.` });
      setChoix(null);
      d.recharger();
    } catch (e) {
      setMessage({ ton: "rouge", texte: (e as Error).message });
    }
  }

  return (
    <Carte
      titre={
        <span className="flex items-center gap-1.5">
          <UserRoundCheck className="size-4" /> Délégation pendant une absence
          <Aide>
            Vous partez en congé ou en mission ? Choisissez un collègue et une date de fin : jusqu’à cette date, il voit vos dossiers à traiter et peut viser et
            donner l’avis à votre place. Chaque visa porte « par délégation de » votre nom. Après la date, tout redevient normal tout seul.
          </Aide>
        </span>
      }
    >
      <div className="space-y-3 text-[13px]">
        {d.donnees.recues.length > 0 && (
          <Alerte ton="jaune">
            Vous remplacez en ce moment : {d.donnees.recues.map((r) => `${r.nom} (jusqu’au ${dateCourte(r.fin)})`).join(", ")}. Leurs dossiers apparaissent dans « Dossiers à traiter ».
          </Alerte>
        )}
        {d.donnees.active && (
          <div className="rounded-2xl bg-marque-50 px-4 py-3">
            <strong>{nom(d.donnees.delegueId)}</strong> agit à votre place jusqu’au <strong>{dateCourte(d.donnees.delegationFin)}</strong>.
          </div>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          <Champ libelle="Collègue qui me remplace">
            <Liste value={v.delegueId} onChange={(e) => setChoix({ ...v, delegueId: e.target.value })} vide="— Choisir —" options={d.donnees.candidats.map((c) => ({ valeur: c.id, libelle: c.nom }))} />
          </Champ>
          <Champ libelle="Jusqu’au (inclus)">
            <Saisie type="date" value={v.fin} onChange={(e) => setChoix({ ...v, fin: e.target.value })} />
          </Champ>
        </div>
        {message && <div className={`rounded-xl px-3 py-2 text-[12px] ${message.ton === "vert" ? "bg-marque-50 text-marque-700" : "bg-rouge-100 text-rouge-600"}`}>{message.texte}</div>}
        <div className="flex flex-wrap gap-2">
          <Bouton variante="principal" disabled={!v.delegueId || !v.fin} onClick={() => enregistrer()}>
            Enregistrer la délégation
          </Bouton>
          {d.donnees.active && <Bouton onClick={() => enregistrer(true)}>Arrêter la délégation (je suis de retour)</Bouton>}
        </div>
      </div>
    </Carte>
  );
}
