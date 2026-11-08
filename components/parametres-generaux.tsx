"use client";

import { CheckCircle2, Loader2, PencilLine } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Alerte, Carte, Champ, Chargement, Saisie } from "@/components/ui";
import { useSession } from "@/components/session";
import { api, useApi } from "@/lib/api";
import { peut } from "@/lib/libelles";

/** Paramètres à choisir dans une liste plutôt qu'à écrire. */
const CHOIX: Record<string, [string, string][]> = {
  // DG, 07/11/2026 : les demandes à problème n'entrent pas d'abord dans les notes de mutation
  MUTATION_NOTE_SANS_POINTS: [
    ["OUI", "Oui : une demande accordée qui a encore des points à vérifier attend hors de la note"],
    ["NON", "Non : toutes les demandes accordées entrent dans la note"],
  ],
  POLICE_NOTES: [
    ["Times New Roman", "Times New Roman (d’origine)"],
    ["Sylfaen", "Sylfaen"],
  ],
  // DG, 01/11/2026 : « PROJET DE NOTE DE SERVICE » jusqu'à la fin du circuit, ou comme avant
  PROJET_DE_NOTE: [
    ["OUI", "Oui : « PROJET DE NOTE DE SERVICE » jusqu’à la validation du DG et les trois avis conformes"],
    ["NON", "Non : toujours « NOTE DE SERVICE » (comme avant)"],
  ],
};

interface Parametre {
  cle: string;
  valeur: string;
  description: string;
}

/** Les paramètres rangés selon l'endroit où ils s'appliquent, avec l'effet d'un changement. */
const GROUPES: { titre: string; effet: string; cles: string[] }[] = [
  {
    titre: "Notes de service (affectation, mutation et enrôlement)",
    effet:
      "Pris en compte immédiatement par les notes « à soumettre au DG » et « soumises au DG ». Une note validée ou signée garde les réglages du jour de sa validation ; pour qu’elle reprenne les nouveaux, le DG la rouvre (tant que le ministre n’a pas signé).",
    cles: ["ANNEE_SCOLAIRE", "ANNEE_SCOLAIRE_MUTATION", "SIGNATAIRE_TITRE", "SIGNATAIRE_NOM", "LIEU_SIGNATURE", "POLICE_NOTES", "PROJET_DE_NOTE", "MUTATION_NOTE_SANS_POINTS", "REFERENCE_NOTE", "PIED_PAGE_DROITE", "ADRESSE_PIED", "MENTION_BOURSE_ENROLEMENT"],
  },
  {
    titre: "Statut contractuel, âges et calculs",
    effet:
      "Les âges du statut contractuel et le point indiciaire sont recalculés aussitôt pour toutes les personnes qui ne sont pas encore dans une note validée (grade « Inst. » / « Inst.C. », salaire, incidence du Pilotage). Les âges minimum et maximum et la taille des lots s’appliquent aux prochaines saisies : les fiches déjà enregistrées ne changent pas.",
    cles: ["CONTRACTUEL_AGE_LIMITE", "CONTRACTUEL_AGE_LIMITE_CAT_I", "POINT_INDICIAIRE", "AGE_MINIMUM", "AGE_MAXIMUM", "TAILLE_LOT_COMMISSION"],
  },
  {
    titre: "Envoi à la Fonction Publique",
    effet: "Imprimé sur les listes et le soit-transmis de la Fonction Publique, à chaque impression (y compris si l’on réimprime une ancienne transmission).",
    cles: ["CAMPAGNE_RECRUTEMENT", "SIGNATAIRE_LISTE_TITRE", "SIGNATAIRE_LISTE_NOM", "SOIT_TRANSMIS_DESTINATAIRE", "SOIT_TRANSMIS_REFERENCE", "SOIT_TRANSMIS_APPEL"],
  },
  {
    titre: "Écoles : besoins en enseignants et emplois du temps",
    effet: "Pris en compte au prochain calcul : besoins en enseignants (Structures et besoins) et emplois du temps générés ensuite. Les emplois du temps déjà générés ne changent pas tant qu’on ne les regénère pas.",
    cles: ["HEURES_ENSEIGNANT", "HEURES_ENSEIGNANT_LYCEE", "EDT_JOURS", "EDT_CRENEAUX"],
  },
  {
    titre: "Fiche de demande de mutation",
    effet: "Imprimé sur la fiche de demande (bouton « Imprimer la fiche » d’une demande), à chaque impression.",
    cles: ["DG_TITRE", "DG_NOM"],
  },
];

type Etat = { ton: "modifie" | "envoi" | "ok" | "erreur"; texte: string };

/**
 * Paramètres généraux : chaque champ s'enregistre avec Entrée ou en cliquant ailleurs,
 * et dit clairement s'il est enregistré.
 */
export function ParametresGeneraux() {
  const params = useApi<Parametre[]>("/parametres");
  // Compte Informatique : les paramètres se consultent seulement (DG, 08/11/2026)
  const { profil } = useSession();
  const lecture = !peut.modifierConfiguration(profil.role);
  const [etats, setEtats] = useState<Record<string, Etat>>({});
  const changer = (cle: string, e: Etat | null) =>
    setEtats((s) => {
      const n = { ...s };
      if (e) n[cle] = e;
      else delete n[cle];
      return n;
    });

  async function enregistrer(p: Parametre, champ: HTMLInputElement) {
    if (lecture) return;
    // Dernière valeur enregistrée depuis ce champ (Entrée puis clic ailleurs : un seul envoi)
    const reference = champ.dataset.enregistre ?? p.valeur;
    if (champ.value.trim() === reference) {
      if (etats[p.cle]?.ton === "modifie") changer(p.cle, null);
      return;
    }
    changer(p.cle, { ton: "envoi", texte: "Enregistrement…" });
    try {
      await api.put(`/parametres/${p.cle}`, { valeur: champ.value });
      champ.dataset.enregistre = champ.value.trim();
      const heure = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
      changer(p.cle, { ton: "ok", texte: `Enregistré à ${heure}.` });
      params.recharger();
    } catch (e) {
      // La valeur refusée n'est pas gardée : le champ reprend la valeur en vigueur
      champ.value = reference;
      changer(p.cle, { ton: "erreur", texte: `${(e as Error).message} La valeur précédente (« ${reference} ») est conservée.` });
    }
  }

  const parCle = new Map((params.donnees ?? []).map((p) => [p.cle, p]));
  const rangees = new Set(GROUPES.flatMap((g) => g.cles));
  const autres = (params.donnees ?? []).filter((p) => !rangees.has(p.cle));
  const groupes = [...GROUPES, ...(autres.length ? [{ titre: "Autres paramètres", effet: "", cles: autres.map((p) => p.cle) }] : [])];

  return (
    <Carte titre="Paramètres des notes et des calculs">
      <p className="mb-4 text-[13px] text-zinc-600">
        Tapez la nouvelle valeur puis appuyez sur <strong>Entrée</strong> (ou cliquez ailleurs) : le paramètre est enregistré et le message « Enregistré » apparaît
        sous le champ. Les pages déjà ouvertes dans d’autres onglets se mettent à jour quand vous y revenez.
      </p>
      {params.erreur && <Alerte>{params.erreur}</Alerte>}
      {!params.donnees ? (
        <Chargement />
      ) : (
        <div className="space-y-6">
          {groupes.map((g) => (
            <section key={g.titre}>
              <h3 className="text-[14px] font-semibold">{g.titre}</h3>
              {g.effet && <p className="mt-0.5 mb-3 text-[12px] leading-relaxed text-zinc-500">{g.effet}</p>}
              <div className="grid gap-3 md:grid-cols-2">
                {g.cles
                  .map((c) => parCle.get(c))
                  .filter((p): p is Parametre => !!p)
                  .map((p) => {
                    const e = etats[p.cle];
                    return (
                      <Champ key={p.cle} libelle={p.description}>
                        {CHOIX[p.cle] ? (
                          <select
                            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[13px]"
                            defaultValue={
                              p.cle === "POLICE_NOTES"
                                ? p.valeur.trim().toLowerCase() === "sylfaen"
                                  ? "Sylfaen"
                                  : "Times New Roman"
                                : p.valeur.trim().toUpperCase() === "NON"
                                  ? "NON"
                                  : "OUI"
                            }
                            disabled={lecture}
                            onChange={async (ev) => {
                              changer(p.cle, { ton: "envoi", texte: "Enregistrement…" });
                              try {
                                await api.put(`/parametres/${p.cle}`, { valeur: ev.target.value });
                                changer(p.cle, { ton: "ok", texte: `Enregistré : ${CHOIX[p.cle].find(([v]) => v === ev.target.value)?.[1] ?? ev.target.value}.` });
                                params.recharger();
                              } catch (err) {
                                changer(p.cle, { ton: "erreur", texte: (err as Error).message });
                              }
                            }}
                          >
                            {CHOIX[p.cle].map(([v, libelle]) => (
                              <option key={v} value={v}>
                                {libelle}
                              </option>
                            ))}
                          </select>
                        ) : (
                        <Saisie
                          defaultValue={p.valeur}
                          readOnly={lecture}
                          className={e?.ton === "modifie" ? "ring-2 ring-or-400" : e?.ton === "erreur" ? "ring-2 ring-rouge-400" : ""}
                          onChange={(ev) => changer(p.cle, ev.target.value.trim() === (ev.target.dataset.enregistre ?? p.valeur) ? null : { ton: "modifie", texte: "Modifié, pas encore enregistré : appuyez sur Entrée." })}
                          onKeyDown={(ev) => {
                            if (ev.key === "Enter") {
                              ev.preventDefault();
                              void enregistrer(p, ev.currentTarget);
                            }
                            if (ev.key === "Escape") {
                              ev.currentTarget.value = ev.currentTarget.dataset.enregistre ?? p.valeur;
                              changer(p.cle, null);
                            }
                          }}
                          onBlur={(ev) => void enregistrer(p, ev.currentTarget)}
                        />
                        )}
                        {e && (
                          <p
                            role="status"
                            className={`mt-1 flex items-start gap-1 text-[12px] ${
                              e.ton === "erreur" ? "font-medium text-rouge-600" : e.ton === "modifie" ? "font-medium text-or-700" : e.ton === "ok" ? "text-marque-700" : "text-zinc-500"
                            }`}
                          >
                            {e.ton === "envoi" ? (
                              <Loader2 className="mt-0.5 size-3.5 shrink-0 animate-spin" />
                            ) : e.ton === "ok" ? (
                              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
                            ) : e.ton === "modifie" ? (
                              <PencilLine className="mt-0.5 size-3.5 shrink-0" />
                            ) : null}
                            {e.texte}
                          </p>
                        )}
                      </Champ>
                    );
                  })}
              </div>
            </section>
          ))}
          <p className="text-[12px] text-zinc-500">
            L’enveloppe accordée par la Fonction Publique se règle quota par quota dans{" "}
            <Link href="/pilotage" className="font-medium text-marque-700 hover:underline">
              Pilotage → Incidences et enveloppe
            </Link>
            .
          </p>
        </div>
      )}
    </Carte>
  );
}
