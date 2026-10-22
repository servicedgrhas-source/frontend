"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useSession } from "@/components/session";
import { Alerte, Annonce, Bouton, BoutonIcone, Carte, Chargement, EnTete, Saisie, Tableau } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { peut } from "@/lib/libelles";

interface Origine {
  id: number;
  libelle: string;
  ordre: number;
  actif: boolean;
  beneficiaireId: number | null;
}

/** Liste des origines proposées à la saisie d'un candidat (tenue par le DG). */
export default function Origines() {
  const { profil } = useSession();
  const liste = useApi<Origine[]>("/origines?toutes=1");
  const dgOuAdmin = peut.valider(profil.role);
  const benefs = useApi<{ id: number; nom: string; commission: boolean }[]>(dgOuAdmin ? "/pilotage/beneficiaires" : null);
  const [nouvelle, setNouvelle] = useState("");
  const [message, setMessage] = useState<{ ton: "vert" | "rouge"; texte: string } | null>(null);
  const dg = peut.valider(profil.role);
  if (!peut.parametrer(profil.role)) return <Alerte>Page réservée au DG.</Alerte>;

  const agir = async (fn: () => Promise<unknown>, texte: string) => {
    try {
      await fn();
      setMessage({ ton: "vert", texte });
      liste.recharger();
    } catch (e) {
      setMessage({ ton: "rouge", texte: (e as Error).message });
    }
  };

  return (
    <div className="space-y-6">
      <EnTete
        titre="Origines des dossiers"
        sousTitre="Les choix proposés dans « Origine du dossier » à la saisie d’un candidat. Une liste fixe évite les écritures différentes (« Cab. Ministre », « Cabinet du ministre »…) et permet de compter les dossiers par origine."
      />
      <Annonce ton={message?.ton} fermer={() => setMessage(null)}>
        {message?.texte}
      </Annonce>
      <Carte titre="Ajouter une origine">
        <form
          className="flex flex-wrap gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!nouvelle.trim()) return;
            void agir(() => api.post("/origines", { libelle: nouvelle }), `« ${nouvelle.trim()} » ajoutée.`).then(() => setNouvelle(""));
          }}
        >
          <Saisie className="min-w-80 flex-1" value={nouvelle} onChange={(e) => setNouvelle(e.target.value)} placeholder="Ex. Conseiller du Ministre" />
          <Bouton variante="principal" disabled={!nouvelle.trim() || !dg}>
            <Plus /> Ajouter
          </Bouton>
        </form>
        <p className="mt-2 text-[12px] text-zinc-400">
          Chaque origine compte pour un <strong>bénéficiaire du quota</strong> (colonne ci-dessous) : à la saisie, le formulaire montre ses places restantes. Les membres
          de la commission ne se mettent pas ici : ils ont leur propre liste, avec leurs places (« Membres de la commission »), et comptent pour la commission. À la
          saisie, « Autre » permet toujours d’écrire une origine qui n’est pas dans la liste (elle ne compte alors pour aucun bénéficiaire).
        </p>
      </Carte>
      <Carte titre="Liste proposée à la saisie">
        {!liste.donnees ? (
          <Chargement />
        ) : (
          <Tableau>
            <thead>
              <tr>
                <th>Origine</th>
                <th>
                  Bénéficiaire du quota{" "}
                  <span className="font-normal normal-case text-zinc-400">(ses places dans « Pilotage › Bénéficiaires du quota »)</span>
                </th>
                <th>Proposée</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {liste.donnees.map((o) => (
                <tr key={o.id}>
                  <td className={o.actif ? "" : "text-zinc-400 line-through"}>{o.libelle}</td>
                  <td>
                    {benefs.donnees ? (
                      <select
                        className="rounded-xl bg-zinc-100/80 px-2 py-1.5 text-[12px] disabled:opacity-60"
                        value={o.beneficiaireId ?? ""}
                        disabled={!dg}
                        onChange={(e) =>
                          agir(
                            () => api.put(`/pilotage/origines/${o.id}/beneficiaire`, { beneficiaireId: e.target.value ? Number(e.target.value) : null }),
                            e.target.value
                              ? `« ${o.libelle} » compte désormais pour « ${benefs.donnees!.find((b) => String(b.id) === e.target.value)?.nom} ».`
                              : `« ${o.libelle} » ne compte plus pour aucun bénéficiaire.`,
                          )
                        }
                      >
                        <option value="">— aucun —</option>
                        {benefs.donnees
                          .filter((b) => !b.commission)
                          .map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.nom}
                            </option>
                          ))}
                      </select>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                  <td>
                    <label className="inline-flex items-center gap-2 text-[12px]">
                      <input
                        type="checkbox"
                        className="size-4 accent-marque-500"
                        checked={o.actif}
                        disabled={!dg}
                        onChange={() => agir(() => api.put(`/origines/${o.id}`, { libelle: o.libelle, actif: !o.actif }), `« ${o.libelle} » ${o.actif ? "n’est plus proposée" : "est de nouveau proposée"}.`)}
                      />
                      {o.actif ? "oui" : "non (cachée)"}
                    </label>
                  </td>
                  <td>
                    {dg && (
                      <BoutonIcone libelle="Retirer de la liste (les fiches gardent leur origine)" ton="rouge" onClick={() => agir(() => api.delete(`/origines/${o.id}`), `« ${o.libelle} » retirée de la liste.`)}>
                        <Trash2 />
                      </BoutonIcone>
                    )}
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
