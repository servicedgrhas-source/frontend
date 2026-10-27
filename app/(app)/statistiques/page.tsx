"use client";

import { Printer } from "lucide-react";
import { useSession } from "@/components/session";
import { Aide, Alerte, Bouton, Carte, Chargement, EnTete, Tableau } from "@/components/ui";
import { useApi } from "@/lib/api";
import { accesDonne } from "@/lib/espaces";
import { peut } from "@/lib/libelles";

interface Quota {
  groupe: string;
  libelle: string;
  envoyes: number | null;
  recus: number;
  arretes: number;
  decretsPM: number;
  decretsPR: number;
  resteARecevoir: number | null;
  affectes: number;
  dontHorsSysteme: number;
  resteAAffecter: number;
}

interface Statistiques {
  groupes: { code: string; libelle: string }[];
  parQuota: Quota[];
  total: Omit<Quota, "groupe" | "libelle">;
  cycles: { code: string; libelle: string }[];
  parCycle: { groupe: string; valeurs: Record<string, number>; total: number }[];
  departements: string[];
  parDepartement: { groupe: string; valeurs: number[]; total: number }[];
}

const nf = new Intl.NumberFormat("fr-FR");
const n = (v: number | null | undefined) => (v === null || v === undefined ? "—" : nf.format(v));

/** Statistiques de suivi du recrutement et des affectations (tenues jusque-là à la main). */
export default function StatistiquesSuivi() {
  const { profil } = useSession();
  const s = useApi<Statistiques>(peut.traiter(profil.role) ? "/statistiques/recrutement" : null);
  if (!peut.traiter(profil.role) && !accesDonne(profil)) return <Alerte>Accès réservé aux agents de la DGRHAS.</Alerte>;
  if (s.erreur) return <Alerte>{s.erreur}</Alerte>;
  if (!s.donnees) return <Chargement />;
  const d = s.donnees;
  const libelle = (g: string) => d.groupes.find((x) => x.code === g)?.libelle ?? g;

  return (
    <div className="space-y-6">
      <EnTete
        titre="Statistiques de suivi"
        sousTitre={`Calculées à partir de la base, à jour au ${new Date().toLocaleDateString("fr-FR")}. Une personne compte comme affectée si elle est dans une note validée du système, ou dans une note signée hors du système (fichier de contrôle des affectations).`}
        actions={
          <Bouton className="no-print" onClick={() => window.print()}>
            <Printer /> Imprimer
          </Bouton>
        }
      />

      <Carte titre="Par quota : envois, textes reçus et affectations">
        <Tableau>
          <thead>
            <tr>
              <th>Quota</th>
              <th className="text-right">
                Dossiers envoyés à la FP <Aide>Fiches parties dans une transmission. Le quota « Autres » n’a pas été envoyé par nous.</Aide>
              </th>
              <th className="text-right">Textes reçus</th>
              <th className="text-right text-zinc-400">dont arrêtés</th>
              <th className="text-right text-zinc-400">décrets PM</th>
              <th className="text-right text-zinc-400">décrets PR</th>
              <th className="text-right">Reste à recevoir</th>
              <th className="text-right">
                Affectés <Aide>Dans une note validée du système, ou dans une note signée hors du système (reprise du fichier de contrôle).</Aide>
              </th>
              <th className="text-right">Reste à affecter</th>
            </tr>
          </thead>
          <tbody>
            {d.parQuota.map((q) => (
              <tr key={q.groupe}>
                <td className="font-medium">{q.libelle}</td>
                <td className="text-right tabular-nums">{n(q.envoyes)}</td>
                <td className="text-right font-semibold tabular-nums">{n(q.recus)}</td>
                <td className="text-right text-zinc-500 tabular-nums">{n(q.arretes)}</td>
                <td className="text-right text-zinc-500 tabular-nums">{n(q.decretsPM)}</td>
                <td className="text-right text-zinc-500 tabular-nums">{n(q.decretsPR)}</td>
                <td className="text-right tabular-nums">{n(q.resteARecevoir)}</td>
                <td className="text-right tabular-nums">
                  {n(q.affectes)}
                  {q.dontHorsSysteme > 0 && <div className="text-[11px] text-zinc-400">dont {n(q.dontHorsSysteme)} hors système</div>}
                </td>
                <td className={`text-right font-semibold tabular-nums ${q.resteAAffecter ? "text-or-700" : "text-marque-700"}`}>{n(q.resteAAffecter)}</td>
              </tr>
            ))}
            <tr className="font-semibold">
              <td>Total</td>
              <td className="text-right tabular-nums">{n(d.total.envoyes)}</td>
              <td className="text-right tabular-nums">{n(d.total.recus)}</td>
              <td className="text-right tabular-nums">{n(d.total.arretes)}</td>
              <td className="text-right tabular-nums">{n(d.total.decretsPM)}</td>
              <td className="text-right tabular-nums">{n(d.total.decretsPR)}</td>
              <td className="text-right tabular-nums">{n(d.total.resteARecevoir)}</td>
              <td className="text-right tabular-nums">{n(d.total.affectes)}</td>
              <td className="text-right tabular-nums">{n(d.total.resteAAffecter)}</td>
            </tr>
          </tbody>
        </Tableau>
      </Carte>

      <Carte titre="Textes reçus par cycle">
        <p className="mb-3 text-[13px] text-zinc-500">
          Le cycle écrit dans la base. « Non renseigné » : le cycle manquait dans la base (le système retient alors celui du diplôme pour les notes).
        </p>
        <Tableau>
          <thead>
            <tr>
              <th>Quota</th>
              {d.cycles.map((c) => (
                <th key={c.code} className={`text-right ${c.code === "VIDE" ? "text-or-700" : ""}`}>
                  {c.libelle}
                </th>
              ))}
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {d.parCycle.map((l) => (
              <tr key={l.groupe}>
                <td className="font-medium">{libelle(l.groupe)}</td>
                {d.cycles.map((c) => (
                  <td key={c.code} className={`text-right tabular-nums ${c.code === "VIDE" && l.valeurs[c.code] ? "text-or-700" : ""}`}>
                    {n(l.valeurs[c.code])}
                  </td>
                ))}
                <td className="text-right font-semibold tabular-nums">{n(l.total)}</td>
              </tr>
            ))}
            <tr className="font-semibold">
              <td>Total</td>
              {d.cycles.map((c) => (
                <td key={c.code} className="text-right tabular-nums">
                  {n(d.parCycle.reduce((t, l) => t + (l.valeurs[c.code] ?? 0), 0))}
                </td>
              ))}
              <td className="text-right tabular-nums">{n(d.parCycle.reduce((t, l) => t + l.total, 0))}</td>
            </tr>
          </tbody>
        </Tableau>
      </Carte>

      <Carte titre="Textes reçus par département d’affectation">
        <div className="overflow-x-auto">
          <Tableau>
            <thead>
              <tr>
                <th>Département</th>
                {d.groupes.map((g) => (
                  <th key={g.code} className="text-right">
                    {g.libelle}
                  </th>
                ))}
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {d.departements.map((dep, i) => {
                const total = d.parDepartement.reduce((t, l) => t + l.valeurs[i], 0);
                return (
                  <tr key={dep}>
                    <td className={`font-medium ${dep === "Sans département" ? "text-or-700" : ""}`}>{dep}</td>
                    {d.parDepartement.map((l) => (
                      <td key={l.groupe} className="text-right tabular-nums">
                        {n(l.valeurs[i])}
                      </td>
                    ))}
                    <td className="text-right font-semibold tabular-nums">{n(total)}</td>
                  </tr>
                );
              })}
              <tr className="font-semibold">
                <td>Total</td>
                {d.parDepartement.map((l) => (
                  <td key={l.groupe} className="text-right tabular-nums">
                    {n(l.total)}
                  </td>
                ))}
                <td className="text-right tabular-nums">{n(d.parDepartement.reduce((t, l) => t + l.total, 0))}</td>
              </tr>
            </tbody>
          </Tableau>
        </div>
      </Carte>
    </div>
  );
}
