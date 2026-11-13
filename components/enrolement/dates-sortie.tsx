"use client";

import { Check, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useConfigEnrolement, moisFr, nf } from "@/components/enrolement/volontaires";
import { useSession } from "@/components/session";
import { Alerte, Bouton, Champ, Liste, Modale, Saisie } from "@/components/ui";
import { api } from "@/lib/api";

interface Rapport {
  essai: boolean;
  n: number;
  parDepartement: Record<string, number>;
  parMotif: Record<string, number>;
  dernierMoisAvant: string | null;
  dernierMoisApres: string | null;
  exemples: string[];
}

const dernier = (m: string | null) => (!m ? "sans fin" : m === "0000-01" ? "aucun (bourse arrêtée)" : moisFr(m));

/**
 * Corriger des dates de sortie en série (DG, 13/11/2026 : les retirés de la Likouala sortis le 13/11
 * au lieu du 01/10, donc payés en octobre). On choisit les fiches (département, motif, date
 * actuelle), on voit combien et ce que ça change pour la paie, puis on corrige.
 */
export function DatesSortie({ population, fermer, apres }: { population: string; fermer: () => void; apres: () => void }) {
  const { refs } = useSession();
  const config = useConfigEnrolement();
  const motifs = config.donnees?.configuration.motifsSortie ?? [];
  const [departementId, setDepartementId] = useState("");
  const [motif, setMotif] = useState("");
  const [dateActuelle, setDateActuelle] = useState("");
  const [nouvelleDate, setNouvelleDate] = useState("");
  const [rapport, setRapport] = useState<Rapport | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState(false);
  const oublier = () => {
    setRapport(null);
    setFait(false);
  };
  async function envoyer(essai: boolean) {
    setEnvoi(true);
    setErreur(null);
    try {
      const r = await api.post<Rapport>("/enrolement/volontaires/dates-sortie", {
        population,
        departementId: departementId ? Number(departementId) : null,
        motif: motif || null,
        dateActuelle,
        nouvelleDate,
        essai,
      });
      setRapport(r);
      if (!essai) {
        setFait(true);
        apres();
      }
    } catch (x) {
      setErreur((x as Error).message);
    } finally {
      setEnvoi(false);
    }
  }
  const champ = (f: (v: string) => void) => (x: { target: { value: string } }) => {
    f(x.target.value);
    oublier();
  };
  const fr = (d: string) => d.split("-").reverse().join("/");
  return (
    <Modale titre="Corriger des dates de sortie en série" ouverte fermer={fermer}>
      <div className="space-y-4 text-[13px]">
        <p className="leading-relaxed text-zinc-600">
          Pour des {population === "COMMUNAUTAIRE" ? "communautaires" : "volontaires"} <strong>déjà sortis</strong> avec une mauvaise date (ex. les retirés de la Likouala
          sortis le 13/11/2026 au lieu du 01/10/2026). La date de sortie fixe le <strong>dernier mois payé</strong> (en général le mois d’avant). Choisissez les fiches, puis{" "}
          <strong>Vérifier</strong> : rien n’est encore changé.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Champ libelle="Département">
            <Liste value={departementId} onChange={champ(setDepartementId)} vide="Tous les départements" options={refs.departements.map((d) => ({ valeur: d.id, libelle: d.nom }))} />
          </Champ>
          <Champ libelle="Motif de sortie">
            <Liste value={motif} onChange={champ(setMotif)} vide="Tous les motifs" options={motifs.map((m) => ({ valeur: m.code, libelle: m.libelle }))} />
          </Champ>
          <Champ libelle="Date de sortie actuelle (celle à corriger)">
            <Saisie type="date" value={dateActuelle} onChange={champ(setDateActuelle)} />
          </Champ>
          <Champ libelle="Nouvelle date de sortie">
            <Saisie type="date" value={nouvelleDate} onChange={champ(setNouvelleDate)} />
          </Champ>
        </div>
        {erreur && <Alerte>{erreur}</Alerte>}
        {rapport && (
          <div className="space-y-2 rounded-2xl bg-white p-4 ring-1 ring-zinc-200">
            <div className={`rounded-xl px-3 py-2 font-medium ${rapport.essai ? "bg-or-100/60 text-or-700" : "bg-marque-50 text-marque-700"}`}>
              {rapport.essai
                ? rapport.n
                  ? `${nf.format(rapport.n)} fiche(s) sorties le ${fr(dateActuelle)} seront corrigées au ${fr(nouvelleDate)}. Rien n’est encore changé.`
                  : `Aucune fiche sortie le ${fr(dateActuelle)} avec ces choix.`
                : `C’est fait : ${nf.format(rapport.n)} date(s) de sortie corrigée(s). Recalculez l’état de paiement concerné (Paiement mensuel › Recalculer).`}
            </div>
            {rapport.n > 0 && (
              <>
                <p className="text-zinc-600">
                  Dernier mois payé : <strong>{dernier(rapport.dernierMoisAvant)}</strong> → <strong>{dernier(rapport.dernierMoisApres)}</strong> (selon la règle du motif).
                </p>
                <p className="text-[12px] text-zinc-500">
                  Par département : {Object.entries(rapport.parDepartement).map(([d, n]) => `${d} ${nf.format(n)}`).join(" · ")} — par motif :{" "}
                  {Object.entries(rapport.parMotif).map(([m, n]) => `${m} ${nf.format(n)}`).join(" · ")}
                </p>
                <details className="rounded-xl bg-zinc-50 px-3 py-2 text-[12px]">
                  <summary className="cursor-pointer font-medium text-zinc-700">Les fiches ({nf.format(rapport.n)})</summary>
                  <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-zinc-600">
                    {rapport.exemples.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                    {rapport.n > rapport.exemples.length && <li className="list-none text-zinc-400">… et {nf.format(rapport.n - rapport.exemples.length)} autre(s)</li>}
                  </ul>
                </details>
                <p className="text-[12px] text-zinc-500">L’ancienne date reste dans l’historique de chaque fiche ; la correction est notée dans le journal.</p>
              </>
            )}
          </div>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Bouton onClick={fermer}>{fait ? "Fermer" : "Annuler"}</Bouton>
          {!fait && (
            <>
              <Bouton disabled={!dateActuelle || !nouvelleDate || envoi} chargement={envoi && !rapport} onClick={() => envoyer(true)}>
                <RefreshCw /> Vérifier
              </Bouton>
              <Bouton variante="principal" disabled={!rapport?.essai || !rapport.n || envoi} chargement={envoi && !!rapport} onClick={() => envoyer(false)}>
                <Check /> Corriger ces dates
              </Bouton>
            </>
          )}
        </div>
      </div>
    </Modale>
  );
}

