"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useMemo } from "react";
import { type ColonneImprimee, ImpressionListe } from "@/components/impression-liste";
import { Chargement } from "@/components/ui";
import { useApi } from "@/lib/api";
import { decrire, DOMAINES, domaineDe, type Entree } from "@/lib/journal";
import type { Referentiels } from "@/lib/types";

interface LigneJournal {
  date: string;
  par: string;
  action: string;
  objet: string;
  texte: string;
}

const COLONNES: ColonneImprimee<LigneJournal>[] = [
  { titre: "N°", largeur: 4, valeur: (_l, i) => i + 1, droite: true },
  { titre: "Date", largeur: 11, valeur: (l) => l.date },
  { titre: "Par", largeur: 14, valeur: (l) => l.par },
  { titre: "Action", largeur: 24, valeur: (l) => l.action },
  { titre: "Concerne", largeur: 17, valeur: (l) => l.objet || "—" },
  { titre: "Détails", largeur: 30, valeur: (l) => l.texte || "—" },
];
const sousTitre = (d: Record<string, unknown>) => String(d.sousTitre ?? "");
const arrete = (n: number) => `Arrêté le présent journal à ${n.toLocaleString("fr-FR")} action(s).`;

/**
 * Journal des actions imprimable (DG, 08/11/2026), avec les filtres choisis sur la page du journal :
 * période, personne et connexions (au serveur), domaine et recherche (ici).
 */
function Impression() {
  const p = useSearchParams();
  const refs = useApi<Referentiels>("/referentiels");
  const params = useApi<{ cle: string; description: string }[]>("/parametres");
  const descriptions = useMemo(() => Object.fromEntries((params.donnees ?? []).map((x) => [x.cle, x.description])), [params.donnees]);
  const domaine = p.get("domaine") ?? "";
  const q = p.get("q") ?? "";
  const periode = p.get("periode") ?? "";
  const sansConnexions = !!p.get("sansConnexions");
  const adapter = useCallback(
    (brut: unknown) => {
      const r = q.toLowerCase();
      const lignes = (brut as { lignes: Entree[] }).lignes
        .filter((e) => !domaine || domaineDe(e.action) === domaine)
        .map((e) => ({ e, x: decrire(e, refs.donnees!, descriptions) }))
        .filter(({ e, x }) => !r || [x.titre, x.texte, e.objet, e.utilisateurNom].some((v) => v?.toLowerCase().includes(r)))
        .map(({ e, x }) => ({
          date: new Date(e.date).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Brazzaville" }),
          par: e.utilisateurNom ?? "Système",
          action: x.titre,
          objet: e.objet ?? "",
          texte: x.texte ?? "",
        }));
      const filtres = [
        `${lignes.length.toLocaleString("fr-FR")} action(s)${periode ? `, ${periode}` : ""}`,
        domaine && DOMAINES.find((x) => x.valeur === domaine)?.libelle,
        q && `recherche « ${q} »`,
        sansConnexions && "sans les connexions",
      ].filter(Boolean);
      return { lignes, sousTitre: filtres.join(" · ") };
    },
    [domaine, q, periode, sansConnexions, refs.donnees, descriptions],
  );
  return (
    <ImpressionListe
      chemin="/journal/recherche"
      titre="JOURNAL DES ACTIONS"
      sousTitre={sousTitre}
      colonnes={COLONNES}
      arrete={arrete}
      pied="Journal des actions"
      adapter={adapter}
      pret={!!refs.donnees && !!params.donnees}
    />
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Chargement />}>
      <Impression />
    </Suspense>
  );
}
