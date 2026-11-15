"use client";

import { Download } from "lucide-react";
import { useMemo, useState } from "react";
import { fcfa, nf } from "@/components/enrolement/volontaires";
import { Alerte, Bouton, Carte, Chargement, Chiffre, Saisie, Segments, Tableau, Vide } from "@/components/ui";
import { useApi } from "@/lib/api";

interface Groupe {
  libelle: string;
  n: number;
  mensuel: number;
  annee: number;
}

interface Sortants {
  moisEnClair: string;
  dernierMoisPaye: string;
  finAnnee: string;
  moisRestants: number;
  lignes: {
    id: string;
    nom: string;
    departement: string;
    cycle: string;
    etablissement: string;
    motif: string;
    precision: string;
    dateSortie: string;
    taux: number;
    economieAnnee: number;
  }[];
  parMotif: Groupe[];
  parDepartement: Groupe[];
  parCycle: Groupe[];
  total: { n: number; mensuel: number; annee: number; sansBareme: number };
  /** Pas payés ce mois pour un problème (sans nom, doublon, absent non ajouté, sans barème). */
  misDeCote: {
    lignes: { raison: string; nom: string; departement: string; cycle: string; etablissement: string; montant: number; precision: string; origine: string }[];
    parRaison: { libelle: string; n: number; montant: number }[];
    total: { n: number; montant: number };
    reprise: { fichier: string; le: string; par: string } | null;
  };
  ensemble: { n: number; mensuel: number };
}

/**
 * Volet « Sortants du mois » de Paiement mensuel (14/11/2026) : les personnes dont la bourse s'arrête
 * ce mois-ci, leur motif en clair, et l'incidence financière (la bourse qu'elles auraient touchée ce
 * mois, et jusqu'à août). Le même contenu que l'Excel des sortants.
 */
export function SortantsDuMois({ etatId, telecharger, ouvrir }: { etatId: number; telecharger: () => void; ouvrir: (id: string) => void }) {
  const d = useApi<Sortants>(`/enrolement/bourse/${etatId}/sortants`);
  const [par, setPar] = useState<"motif" | "departement" | "cycle">("motif");
  const [recherche, setRecherche] = useState("");
  const visibles = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    const l = d.donnees?.lignes ?? [];
    return q ? l.filter((x) => `${x.nom} ${x.departement} ${x.motif} ${x.cycle}`.toLowerCase().includes(q)) : l;
  }, [d.donnees, recherche]);

  if (d.erreur) return <Alerte>{d.erreur}</Alerte>;
  if (!d.donnees) return <Chargement texte="Calcul des sortants du mois…" />;
  const s = d.donnees;
  const groupes = par === "motif" ? s.parMotif : par === "departement" ? s.parDepartement : s.parCycle;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Chiffre libelle={`Sortants de ${s.moisEnClair}`} valeur={nf.format(s.total.n)} ton="rouge" detail={`dernier mois payé : ${s.dernierMoisPaye}`} />
        <Chiffre libelle={`Bourse qui n’est plus payée en ${s.moisEnClair}`} valeur={fcfa(s.total.mensuel)} ton="vert" detail="ce qu’ils auraient touché ce mois (barème de leur cycle)" />
        <Chiffre
          libelle={`Jusqu’à ${s.finAnnee} (${s.moisRestants} mois)`}
          valeur={fcfa(s.total.annee)}
          ton="vert"
          detail={s.total.sansBareme ? `${nf.format(s.total.sansBareme)} sans cycle, comptés à 0` : "jusqu’à la fin de l’année scolaire"}
        />
      </div>

      <Carte
        titre="Incidence financière"
        actions={
          <Bouton onClick={telecharger}>
            <Download /> Excel des sortants
          </Bouton>
        }
      >
        <div className="mb-3">
          <Segments
            valeur={par}
            changer={setPar}
            options={[
              { valeur: "motif", libelle: "Par motif" },
              { valeur: "departement", libelle: "Par département" },
              { valeur: "cycle", libelle: "Par cycle" },
            ]}
          />
        </div>
        {!s.total.n ? (
          <Vide>Aucun sortant ce mois-ci.</Vide>
        ) : (
          <Tableau>
            <thead>
              <tr>
                <th>{par === "motif" ? "Motif de sortie" : par === "departement" ? "Département" : "Cycle"}</th>
                <th className="text-right">Personnes</th>
                <th className="text-right">Par mois ({s.moisEnClair})</th>
                <th className="text-right">Jusqu’à {s.finAnnee}</th>
              </tr>
            </thead>
            <tbody>
              {groupes.map((g) => (
                <tr key={g.libelle}>
                  <td>{g.libelle}</td>
                  <td className="text-right tabular-nums">{nf.format(g.n)}</td>
                  <td className="text-right tabular-nums">{fcfa(g.mensuel)}</td>
                  <td className="text-right tabular-nums">{fcfa(g.annee)}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td>Total</td>
                <td className="text-right tabular-nums">{nf.format(s.total.n)}</td>
                <td className="text-right tabular-nums">{fcfa(s.total.mensuel)}</td>
                <td className="text-right tabular-nums">{fcfa(s.total.annee)}</td>
              </tr>
            </tbody>
          </Tableau>
        )}
      </Carte>

      {/* Les mis de côté et l'ensemble (15/11/2026) */}
      <Carte titre={`Mis de côté : pas payés en ${s.moisEnClair} pour un problème`}>
        <p className="mb-3 text-[12px] text-zinc-500">
          Ils ne sortent pas du registre : ligne sans nom, doublon dans l’état du DG, absent du registre non ajouté, cycle non renseigné.
          {s.misDeCote.reprise
            ? ` Lignes du DG d’après « ${s.misDeCote.reprise.fichier} » (reprise du ${new Date(s.misDeCote.reprise.le).toLocaleDateString("fr-FR")} par ${s.misDeCote.reprise.par}).`
            : " Les lignes du DG mises de côté apparaissent après « Reprendre un mois déjà payé » ; ici, seulement les lignes de l’état sans barème."}
        </p>
        {!s.misDeCote.total.n ? (
          <Vide>Personne n’est mis de côté ce mois-ci.</Vide>
        ) : (
          <Tableau>
            <thead>
              <tr>
                <th>Raison</th>
                <th className="text-right">Personnes</th>
                <th className="text-right">Montant du mois</th>
              </tr>
            </thead>
            <tbody>
              {s.misDeCote.parRaison.map((g) => (
                <tr key={g.libelle}>
                  <td>{g.libelle}</td>
                  <td className="text-right tabular-nums">{nf.format(g.n)}</td>
                  <td className="text-right tabular-nums">{fcfa(g.montant)}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td>Total</td>
                <td className="text-right tabular-nums">{nf.format(s.misDeCote.total.n)}</td>
                <td className="text-right tabular-nums">{fcfa(s.misDeCote.total.montant)}</td>
              </tr>
            </tbody>
          </Tableau>
        )}
        <div className="mt-4 grid gap-2 rounded-xl bg-zinc-50 p-3 text-[13px] sm:grid-cols-3">
          <div>
            <div className="text-[11px] text-zinc-500">Sortants</div>
            <div className="font-semibold tabular-nums">
              {nf.format(s.total.n)} · {fcfa(s.total.mensuel)}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-zinc-500">Mis de côté</div>
            <div className="font-semibold tabular-nums">
              {nf.format(s.misDeCote.total.n)} · {fcfa(s.misDeCote.total.montant)}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-zinc-500">Ensemble, non payés en {s.moisEnClair}</div>
            <div className="font-semibold tabular-nums text-marque-700">
              {nf.format(s.ensemble.n)} · {fcfa(s.ensemble.mensuel)}
            </div>
          </div>
        </div>
        {s.misDeCote.total.n > 0 && (
          <details className="mt-3 rounded-xl bg-zinc-50 px-3 py-2 text-[12px]">
            <summary className="cursor-pointer font-medium">La liste des mis de côté ({nf.format(s.misDeCote.total.n)})</summary>
            <Tableau>
              <thead>
                <tr>
                  <th>Nom et prénoms</th>
                  <th>Département · cycle</th>
                  <th>Raison</th>
                  <th>Précision</th>
                  <th className="text-right">Montant</th>
                </tr>
              </thead>
              <tbody>
                {s.misDeCote.lignes.slice(0, 300).map((x, i) => (
                  <tr key={`${x.origine}-${i}`}>
                    <td className="font-medium">{x.nom}</td>
                    <td className="text-zinc-600">{[x.departement, x.cycle].filter(Boolean).join(" · ")}</td>
                    <td>{x.raison}</td>
                    <td className="max-w-80 text-zinc-500">{x.precision}</td>
                    <td className="text-right tabular-nums">{x.montant ? fcfa(x.montant) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </Tableau>
          </details>
        )}
      </Carte>

      {s.total.n > 0 && (
        <Carte titre={`Les sortants de ${s.moisEnClair}`} actions={<Saisie className="w-64" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher un nom, un motif…" />}>
          <Tableau>
            <thead>
              <tr>
                <th>Nom et prénoms</th>
                <th>Département · cycle</th>
                <th>Motif de sortie</th>
                <th>Ce qui a été constaté</th>
                <th>Sortie</th>
                <th className="text-right">Aurait touché</th>
              </tr>
            </thead>
            <tbody>
              {visibles.slice(0, 300).map((x) => (
                <tr key={x.id}>
                  <td>
                    <button type="button" className="text-left font-medium underline decoration-zinc-300 decoration-dotted underline-offset-2 hover:text-marque-700" onClick={() => ouvrir(x.id)}>
                      {x.nom}
                    </button>
                  </td>
                  <td className="text-zinc-600">
                    {x.departement} · {x.cycle}
                  </td>
                  <td>{x.motif}</td>
                  <td className="max-w-80 text-[12px] text-zinc-500">{x.precision}</td>
                  <td className="tabular-nums">{x.dateSortie}</td>
                  <td className="text-right tabular-nums">{x.taux ? fcfa(x.taux) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </Tableau>
          {visibles.length > 300 && <p className="mt-2 text-[12px] text-zinc-500">300 premiers sur {nf.format(visibles.length)} : la liste entière est dans l’Excel.</p>}
        </Carte>
      )}
    </div>
  );
}
