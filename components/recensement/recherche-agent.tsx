"use client";

import { ArrowRight, Search, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ETAT_AJOUT, libelleStatut, type Manques, Taux, useConfigRecensement } from "@/components/recensement/commun";
import { Badge, Bouton, Carte, Chargement, Saisie } from "@/components/ui";
import { qs, useApi } from "@/lib/api";

interface Ligne {
  id: number;
  numeroFiche: string;
  statut: string;
  nomComplet: string;
  dateNaissance: string | null;
  matricule: string | null;
  structureNom: string | null;
  lieuService: string | null;
  taux: number;
  complet: boolean;
  manques: Manques;
  contentieux: "EN_COURS" | "CONTROLE" | "CONFIRME" | "REJETE" | null;
}
type Reponse = { total: number; page: number; parPage: number; lignes: Ligne[] };

const dateFr = (d: string | null | undefined) => (d ? d.slice(0, 10).split("-").reverse().join("/") : "—");

/** Rechercher un agent, voir ce qui lui manque, compléter sa fiche ; l'ajouter s'il n'est pas dans la base. */
export function RechercheAgent({ titre = "Rechercher un agent et compléter ce qui lui manque", rechercheInitiale = "" }: { titre?: string; rechercheInitiale?: string }) {
  const router = useRouter();
  const config = useConfigRecensement();
  const c = config.donnees?.configuration;
  const [texte, setTexte] = useState(rechercheInitiale);
  const [cherche, setCherche] = useState(rechercheInitiale);

  // Recherche lancée un court instant après la frappe
  useEffect(() => {
    const t = setTimeout(() => setCherche(texte.trim()), 400);
    return () => clearTimeout(t);
  }, [texte]);

  const resultats = useApi<Reponse>(cherche.length >= 2 ? `/recensement/agents${qs({ recherche: cherche })}` : null);
  const ceQuiManque = (l: Ligne) => [
    ...(l.manques.champs ?? []).map((k) => c?.champs.find((x) => x.code === k)?.libelle ?? k),
    ...(l.manques.pieces ?? []).map((p) => `${c?.pieces.find((x) => x.code === p.code)?.libelle ?? p.code} (pièce)`),
  ];
  const ajouter = () => router.push(`/personnel/agents/nouveau${qs({ recensement: 1, nom: cherche || undefined })}`);

  return (
    <Carte titre={titre}>
      <div className="relative max-w-2xl">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-zinc-400" />
        <Saisie value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Nom et prénoms, matricule, n° de fiche, téléphone ou date de naissance" className="w-full py-3 pl-10 text-[15px]" />
      </div>
      {cherche.length < 2 ? (
        <p className="mt-3 text-[12px] text-zinc-500">Tapez au moins deux lettres. Exemple : « Jean Paul MOUANDA » trouve aussi « MOUANDA Jean Paul ».</p>
      ) : !resultats.donnees ? (
        <Chargement />
      ) : !resultats.donnees.lignes.length ? (
        <div className="mt-4 rounded-2xl bg-or-100/50 px-5 py-4">
          <div className="text-[14px] font-semibold text-encre">Aucun agent ne correspond à « {cherche} ».</div>
          <p className="mt-1 text-[13px] text-zinc-600">Vérifiez l’orthographe, ou cherchez par le matricule ou la date de naissance. Si l’agent n’est vraiment pas dans la base :</p>
          <Bouton variante="principal" className="mt-3" onClick={ajouter}>
            <UserPlus /> L’agent n’existe pas ? Cliquez ici pour l’ajouter
          </Bouton>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          <p className="text-[12px] text-zinc-500">
            {resultats.donnees.total > resultats.donnees.lignes.length
              ? `${resultats.donnees.total} agents trouvés, les ${resultats.donnees.lignes.length} premiers affichés : précisez la recherche.`
              : `${resultats.donnees.total} agent(s) trouvé(s).`}
          </p>
          <ul className="space-y-2">
            {resultats.donnees.lignes.map((l) => {
              const manque = ceQuiManque(l);
              return (
                <li key={l.id} className="flex flex-wrap items-center gap-4 rounded-2xl bg-zinc-50 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[14px] font-semibold">{l.nomComplet}</span>
                      <span className="text-[12px] text-zinc-400">
                        {l.numeroFiche} · {libelleStatut(c, l.statut)}
                        {l.matricule ? ` · matricule ${l.matricule}` : ""} · né(e) le {dateFr(l.dateNaissance)}
                      </span>
                      {l.contentieux && <Badge ton={ETAT_AJOUT[l.contentieux].ton}>{ETAT_AJOUT[l.contentieux].libelle}</Badge>}
                    </div>
                    <div className="text-[12px] text-zinc-500">{l.structureNom ?? l.lieuService ?? "Lieu de service inconnu"}</div>
                    <div className={`mt-1 text-[12px] ${l.complet ? "text-marque-700" : "text-or-700"}`}>
                      {l.complet ? "Fiche complète." : `Il manque : ${manque.slice(0, 6).join(" · ")}${manque.length > 6 ? ` · et ${manque.length - 6} autre(s)` : ""}`}
                    </div>
                  </div>
                  <Taux taux={l.taux} complet={l.complet} />
                  {/* Ouverte d'ici : ce qui est changé part au contrôle (DG, 30/10/2026) */}
                  <Link href={`/personnel/agents/${l.id}?recensement=1`}>
                    <Bouton variante={l.complet ? "secondaire" : "principal"}>
                      {l.complet ? "Voir la fiche" : "Compléter la fiche"} <ArrowRight />
                    </Bouton>
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="pt-1 text-[13px] text-zinc-600">
            L’agent cherché n’est pas dans cette liste ?{" "}
            <button type="button" className="font-semibold text-marque-700 hover:underline" onClick={ajouter}>
              Ajoutez-le
            </button>{" "}
            : il passera au contrôle, puis au DG.
          </p>
        </div>
      )}
    </Carte>
  );
}
