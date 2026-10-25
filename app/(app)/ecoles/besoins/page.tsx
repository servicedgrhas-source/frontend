"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession } from "@/components/session";
import { Alerte, Badge, Carte, Chargement, Chiffre, EnTete, Liste, Segments, Tableau, Vide } from "@/components/ui";
import { useApi } from "@/lib/api";
import { CYCLES, decimal, ecartTexte, ETATS_BESOIN } from "@/lib/ecoles";
import { peut } from "@/lib/libelles";

interface Consolidation {
  annee: string;
  heuresEnseignant: number;
  ecoles: { id: number; nom: string; cycle: string | null; departement: string | null; classes: number; besoin: number; enPlace: number; ecart: number; etat: string; alertes: number }[];
  departements: { departement: string; ecoles: number; besoin: number; enPlace: number; deficit: number; plethore: number }[];
  /** Par cycle : préscolaire, primaire, collège, lycée… */
  cycles: { cycle: string; ecoles: number; classes: number; besoin: number; enPlace: number; ecart: number; deficit: number; plethore: number }[];
  matieres: { cycle: string; libelle: string; heures: number; besoin: number; enPlace: number; ecart: number }[];
}
const arrondi = (n: number) => Math.round(n * 10) / 10;

/**
 * Besoins en enseignants : de quoi montrer à la Fonction Publique et aux Finances où il manque des
 * enseignants (et où il y en a trop), calculé à partir des classes réellement ouvertes.
 */
export default function BesoinsEnseignants() {
  const { profil, refs } = useSession();
  const [departement, setDepartement] = useState("");
  const [cycle, setCycle] = useState("");
  const [vue, setVue] = useState<"ecoles" | "cycles" | "departements" | "matieres">("ecoles");
  const d = useApi<Consolidation>(`/etablissements/besoins?departement=${departement}&cycle=${cycle}`);
  if (!peut.traiter(profil.role) && profil.role !== "DDEPPSA") return <Alerte>Accès réservé à la DGRHAS et aux DDEPPSA.</Alerte>;
  const deficit = arrondi((d.donnees?.ecoles ?? []).reduce((t, e) => t + (e.ecart < 0 ? -e.ecart : 0), 0));
  const plethore = arrondi((d.donnees?.ecoles ?? []).reduce((t, e) => t + (e.ecart > 0 ? e.ecart : 0), 0));
  return (
    <div className="space-y-5">
      <EnTete
        titre="Besoins en enseignants"
        sousTitre={`Calculés à partir des classes ouvertes de chaque école : au collège et au lycée, les heures du programme divisées par ${d.donnees?.heuresEnseignant ?? 20} h par enseignant et par semaine ; au primaire et au préscolaire, un maître par classe. Seules les écoles dont les classes sont saisies sont comptées.`}
      />
      <div className="flex flex-wrap gap-3">
        {profil.role !== "DDEPPSA" && (
          <Liste
            className="w-56"
            value={departement}
            onChange={(e) => setDepartement(e.target.value)}
            vide="Tous les départements"
            options={refs.departements.map((x) => ({ valeur: x.id, libelle: x.nom }))}
          />
        )}
        <Liste className="w-48" value={cycle} onChange={(e) => setCycle(e.target.value)} vide="Tous les cycles" options={Object.entries(CYCLES).map(([k, v]) => ({ valeur: k, libelle: v }))} />
      </div>
      {d.erreur && <Alerte>{d.erreur}</Alerte>}
      {!d.donnees ? (
        <Chargement />
      ) : !d.donnees.ecoles.length ? (
        <Carte titre={`Année ${d.donnees.annee}`}>
          <Vide>
            Aucune école n’a encore ses classes saisies pour {d.donnees.annee}. Ouvrez les classes de chaque école dans{" "}
            <Link href="/ecoles" className="text-marque-700 underline">
              Écoles et classes
            </Link>
            .
          </Vide>
        </Carte>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <Chiffre libelle="Écoles calculées" valeur={d.donnees.ecoles.length} detail={`année ${d.donnees.annee}`} />
            <Chiffre libelle="Enseignants manquants" valeur={decimal(deficit)} ton="rouge" detail={`${d.donnees.ecoles.filter((e) => e.etat === "DEFICIT").length} école(s) en déficit`} />
            <Chiffre libelle="Enseignants en trop" valeur={decimal(plethore)} ton="jaune" detail={`${d.donnees.ecoles.filter((e) => e.etat === "PLETHORE").length} école(s) en pléthore`} />
            <Chiffre
              libelle="Besoin couvert"
              valeur={`${Math.round(
                (100 * d.donnees.ecoles.reduce((t, e) => t + Math.min(e.enPlace, e.besoin), 0)) /
                  Math.max(
                    1,
                    d.donnees.ecoles.reduce((t, e) => t + e.besoin, 0),
                  ),
              )} %`}
            />
          </div>
          <Segments
            valeur={vue}
            changer={setVue}
            options={[
              { valeur: "ecoles", libelle: "Par école" },
              { valeur: "cycles", libelle: "Par cycle" },
              { valeur: "departements", libelle: "Par département" },
              { valeur: "matieres", libelle: "Par matière (collège, lycée)" },
            ]}
          />
          <Carte titre={vue === "ecoles" ? "Écoles (les plus en déficit d’abord)" : vue === "cycles" ? "Cycles" : vue === "departements" ? "Départements" : "Matières"}>
            {vue === "cycles" && (
              <Tableau>
                <thead>
                  <tr>
                    <th>Cycle</th>
                    <th className="text-right">Écoles calculées</th>
                    <th className="text-right">Classes</th>
                    <th className="text-right">Besoin</th>
                    <th className="text-right">Existant</th>
                    <th className="text-right">Écart</th>
                    <th className="text-right">Manquants</th>
                    <th className="text-right">En trop</th>
                  </tr>
                </thead>
                <tbody>
                  {d.donnees.cycles.map((x) => (
                    <tr key={x.cycle}>
                      <td className="font-medium">{CYCLES[x.cycle] ?? x.cycle}</td>
                      <td className="text-right tabular-nums">{x.ecoles}</td>
                      <td className="text-right tabular-nums">{x.classes}</td>
                      <td className="text-right tabular-nums">{decimal(x.besoin)}</td>
                      <td className="text-right tabular-nums">{x.enPlace}</td>
                      <td className={`text-right font-semibold tabular-nums ${x.ecart < 0 ? "text-rouge-600" : x.ecart > 0 ? "text-or-700" : ""}`}>{ecartTexte(x.ecart)}</td>
                      <td className="text-right font-semibold text-rouge-600 tabular-nums">{decimal(x.deficit)}</td>
                      <td className="text-right text-or-700 tabular-nums">{decimal(x.plethore)}</td>
                    </tr>
                  ))}
                </tbody>
              </Tableau>
            )}
            {vue === "ecoles" && (
              <Tableau>
                <thead>
                  <tr>
                    <th>École</th>
                    <th>Département</th>
                    <th className="text-right">Classes</th>
                    <th className="text-right">Besoin</th>
                    <th className="text-right">Existant</th>
                    <th className="text-right">Écart</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {d.donnees.ecoles.map((e) => (
                    <tr key={e.id}>
                      <td>
                        <Link href={`/ecoles/${e.id}`} className="font-medium text-marque-700 hover:underline">
                          {e.nom}
                        </Link>
                        {e.cycle && <span className="ml-2 text-[11px] text-zinc-400">{CYCLES[e.cycle]}</span>}
                        {e.alertes > 0 && <span className="ml-2 text-[11px] text-or-700">{e.alertes} point(s) à compléter</span>}
                      </td>
                      <td className="text-[12px]">{e.departement ?? "—"}</td>
                      <td className="text-right tabular-nums">{e.classes}</td>
                      <td className="text-right tabular-nums">{decimal(e.besoin)}</td>
                      <td className="text-right tabular-nums">{e.enPlace}</td>
                      <td className={`text-right font-semibold tabular-nums ${e.ecart < 0 ? "text-rouge-600" : e.ecart > 0 ? "text-or-700" : ""}`}>{ecartTexte(e.ecart)}</td>
                      <td className="text-right">
                        <Badge ton={ETATS_BESOIN[e.etat].ton}>{ETATS_BESOIN[e.etat].libelle}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Tableau>
            )}
            {vue === "departements" && (
              <Tableau>
                <thead>
                  <tr>
                    <th>Département</th>
                    <th className="text-right">Écoles calculées</th>
                    <th className="text-right">Besoin</th>
                    <th className="text-right">Existant</th>
                    <th className="text-right">Manquants</th>
                    <th className="text-right">En trop</th>
                  </tr>
                </thead>
                <tbody>
                  {d.donnees.departements.map((x) => (
                    <tr key={x.departement}>
                      <td className="font-medium">{x.departement}</td>
                      <td className="text-right tabular-nums">{x.ecoles}</td>
                      <td className="text-right tabular-nums">{decimal(x.besoin)}</td>
                      <td className="text-right tabular-nums">{x.enPlace}</td>
                      <td className="text-right font-semibold text-rouge-600 tabular-nums">{decimal(x.deficit)}</td>
                      <td className="text-right text-or-700 tabular-nums">{decimal(x.plethore)}</td>
                    </tr>
                  ))}
                </tbody>
              </Tableau>
            )}
            {vue === "matieres" &&
              (d.donnees.matieres.length ? (
                <Tableau>
                  <thead>
                    <tr>
                      <th>Matière</th>
                      <th>Cycle</th>
                      <th className="text-right">Heures par semaine</th>
                      <th className="text-right">Besoin</th>
                      <th className="text-right">Existant</th>
                      <th className="text-right">Écart</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.donnees.matieres.map((m) => (
                      <tr key={`${m.cycle}-${m.libelle}`}>
                        <td className="font-medium">{m.libelle}</td>
                        <td className="text-[12px]">{CYCLES[m.cycle] ?? m.cycle}</td>
                        <td className="text-right tabular-nums">{m.heures} h</td>
                        <td className="text-right tabular-nums">{decimal(m.besoin)}</td>
                        <td className="text-right tabular-nums">{m.enPlace}</td>
                        <td className={`text-right font-semibold tabular-nums ${m.ecart < 0 ? "text-rouge-600" : m.ecart > 0 ? "text-or-700" : ""}`}>{ecartTexte(m.ecart)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Tableau>
              ) : (
                <Vide>Aucune classe de collège ou de lycée saisie.</Vide>
              ))}
          </Carte>
        </>
      )}
    </div>
  );
}
