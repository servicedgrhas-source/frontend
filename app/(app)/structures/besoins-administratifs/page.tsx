"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession } from "@/components/session";
import { type DemandeBesoin, ModaleReponse, SituationBesoins, StatutBesoin } from "@/components/structures/besoins-administratifs";
import { Alerte, Bouton, Carte, Chargement, Chiffre, EnTete, Liste, Segments, Tableau, Vide } from "@/components/ui";
import { qs, useApi } from "@/lib/api";
import { accesDonne } from "@/lib/espaces";
import { peut } from "@/lib/libelles";

interface Reponse {
  lignes: DemandeBesoin[];
  enAttente: number;
  accordees: number;
  refusees: number;
  peutDecider: boolean;
}

/**
 * Besoins en personnel des structures administratives (DG, 28/10/2026). Le responsable d'une structure
 * y fixe son effectif normal et exprime ses besoins ; la DGRHAS voit toutes les demandes et répond.
 */
export default function BesoinsAdministratifs() {
  const { profil, refs } = useSession();
  const chef = profil.role === "STRUCTURE";
  const [statut, setStatut] = useState<"EN_ATTENTE" | "ACCORDE" | "REFUSE" | "">("EN_ATTENTE");
  const [departement, setDepartement] = useState("");
  const [reponse, setReponse] = useState<DemandeBesoin | null>(null);
  const ouvert = peut.traiter(profil.role) || profil.role === "DDEPPSA" || chef || accesDonne(profil);
  const r = useApi<Reponse>(ouvert && !chef ? `/besoins-administratifs${qs({ statut, departement })}` : null);

  if (!ouvert) return <Alerte>Accès réservé à la DGRHAS, aux DDEPPSA et aux responsables des structures.</Alerte>;
  if (chef)
    return (
      <div className="space-y-5">
        <EnTete
          titre="Besoins en personnel de votre structure"
          sousTitre="Fixez à l’avance l’effectif normal de chaque poste (directeur, chef de service, collaborateurs…), puis exprimez vos besoins : la DGRHAS les voit, les compare à l’effectif normal et vous répond."
        />
        {profil.structureId ? <SituationBesoins structureId={profil.structureId} /> : <Alerte>Votre compte n’est rattaché à aucune structure : demandez à l’administrateur de l’indiquer.</Alerte>}
      </div>
    );
  const d = r.donnees;
  return (
    <div className="space-y-5">
      <EnTete
        titre="Besoins des administrations"
        sousTitre="Les besoins en personnel exprimés par les structures administratives (directions, services, bureaux, DDEPPSA, inspections), comparés à l’effectif normal de chaque poste. Pour fixer l’effectif normal d’une structure, ouvrez sa fiche dans « Structures administratives »."
      />
      {r.erreur && <Alerte>{r.erreur}</Alerte>}
      {!d ? (
        <Chargement />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Chiffre libelle="En attente de réponse" valeur={d.enAttente} ton={d.enAttente ? "jaune" : "gris"} />
            <Chiffre libelle="Accordées" valeur={d.accordees} ton="vert" />
            <Chiffre libelle="Refusées" valeur={d.refusees} ton="gris" />
          </div>
          <Carte>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <Segments
                valeur={statut}
                changer={setStatut}
                options={[
                  { valeur: "EN_ATTENTE", libelle: "En attente" },
                  { valeur: "ACCORDE", libelle: "Accordées" },
                  { valeur: "REFUSE", libelle: "Refusées" },
                  { valeur: "", libelle: "Toutes" },
                ]}
              />
              {profil.role !== "DDEPPSA" && (
                <Liste className="w-56" aria-label="Département" value={departement} onChange={(e) => setDepartement(e.target.value)} vide="Tous les départements" options={refs.departements.map((x) => ({ valeur: x.id, libelle: x.nom }))} />
              )}
            </div>
            {!d.lignes.length ? (
              <Vide>Aucune demande{statut === "EN_ATTENTE" ? " en attente" : ""}.</Vide>
            ) : (
              <Tableau>
                <thead>
                  <tr>
                    <th>Structure</th>
                    <th>Poste</th>
                    <th className="text-right">Demandé</th>
                    <th className="text-right">Effectif normal</th>
                    <th className="text-right">En poste</th>
                    <th>Pourquoi</th>
                    <th>Réponse</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {d.lignes.map((x) => (
                    <tr key={x.id}>
                      <td>
                        <Link href={`/structures/${x.structureId}`} className="font-medium text-marque-700 hover:underline">
                          {x.sigle || x.structure}
                        </Link>
                        <div className="text-[11px] text-zinc-400">
                          le {new Date(x.creeLe).toLocaleDateString("fr-FR")}
                          {x.creePar ? `, par ${x.creePar}` : ""}
                        </div>
                      </td>
                      <td className="font-medium">{x.poste}</td>
                      <td className="text-right tabular-nums">{x.nombre}</td>
                      <td className="text-right tabular-nums">{x.normal ?? <span className="text-zinc-400">non fixé</span>}</td>
                      <td className="text-right tabular-nums">
                        {x.enPoste ?? "—"}
                        {x.depasse && <div className="text-[11px] text-rouge-700">au-delà du cadre</div>}
                      </td>
                      <td className="text-[12px]">{x.motif}</td>
                      <td className="text-[12px]">
                        <StatutBesoin d={x} />
                        {x.decision && <div className="mt-1 text-zinc-600">{x.decision}</div>}
                      </td>
                      <td className="text-right">
                        {x.statut === "EN_ATTENTE" && d.peutDecider && (
                          <Bouton variante="principal" onClick={() => setReponse(x)}>
                            Répondre
                          </Bouton>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Tableau>
            )}
          </Carte>
        </>
      )}
      {reponse && <ModaleReponse d={reponse} fermer={() => setReponse(null)} apres={() => r.recharger()} />}
    </div>
  );
}
