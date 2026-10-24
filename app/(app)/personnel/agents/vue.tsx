"use client";

import { Download, FileUp, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { libelleStatut, peutRecenser, Taux, useConfigRecensement, type Manques } from "@/components/recensement/commun";
import { useSession } from "@/components/session";
import { Alerte, Bouton, Carte, Chargement, EnTete, Liste, Saisie, Tableau, Vide } from "@/components/ui";
import { api, qs, useApi } from "@/lib/api";

interface Ligne {
  id: number;
  numeroFiche: string;
  statut: string;
  nomComplet: string;
  dateNaissance: string | null;
  matricule: string | null;
  telephone: string | null;
  departementId: number | null;
  structureNom: string | null;
  lieuService: string | null;
  taux: number;
  complet: boolean;
  manques: Manques;
  contentieux: string | null;
}

const dateFr = (d: string | null) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : "—");

/** Base du personnel : recherche, filtres (ce qui manque, contrôles), accès aux fiches. */
export function VueAgents() {
  const { profil, refs } = useSession();
  const config = useConfigRecensement();
  const params = useSearchParams();
  const router = useRouter();
  const [recherche, setRecherche] = useState(params.get("recherche") ?? "");
  const f = {
    recherche: params.get("recherche") ?? "",
    statut: params.get("statut") ?? "",
    departement: params.get("departement") ?? "",
    complet: params.get("complet") ?? "",
    manque: params.get("manque") ?? "",
    controle: params.get("controle") ?? "",
    page: Number(params.get("page") ?? 1),
  };
  const liste = useApi<{ total: number; page: number; parPage: number; lignes: Ligne[] }>(`/recensement/agents${qs(f)}`);
  const tableau = useApi<{ controles: { code: string; libelle: string; n: number }[] }>("/recensement/tableau");
  const c = config.donnees?.configuration;
  if (!peutRecenser(profil.role)) return <Alerte>Accès réservé aux agents de la DGRHAS, aux DDEPPSA et aux chefs d’établissement.</Alerte>;

  const aller = (p: Partial<typeof f>) => router.replace(`/personnel/agents${qs({ ...f, page: 1, ...p })}`);
  const filtreManque = f.manque.startsWith("piece:") ? c?.pieces.find((x) => `piece:${x.code}` === f.manque)?.libelle : c?.champs.find((x) => x.code === f.manque)?.libelle;
  const filtreControle = tableau.donnees?.controles.find((x) => x.code === f.controle)?.libelle;
  const pages = liste.donnees ? Math.max(1, Math.ceil(liste.donnees.total / liste.donnees.parPage)) : 1;
  const nomDep = (id: number | null) => refs.departements.find((d) => d.id === id)?.nom ?? "—";

  return (
    <div className="space-y-6">
      <EnTete
        titre="Base du personnel"
        sousTitre={
          profil.role === "STRUCTURE"
            ? "Les agents de votre établissement : créez leur fiche, corrigez-la, déposez leurs pièces, ou importez-les depuis le modèle Excel."
            : "Une seule fiche par personne : fonctionnaires, contractuels, volontaires (venus du registre de l’enrôlement) et communautaires, avec leurs pièces. Cliquez sur un nom pour ouvrir la fiche."
        }
        actions={
          <>
            <Bouton onClick={() => api.telecharger(`/recensement/export${qs(f)}`, "Base du personnel.xlsx")}>
              <Download /> Excel (pour corriger)
            </Bouton>
            <Link href="/personnel/import">
              <Bouton>
                <FileUp /> Importer
              </Bouton>
            </Link>
            <Link href="/personnel/agents/nouveau">
              <Bouton variante="principal">
                <Plus /> Nouvelle fiche
              </Bouton>
            </Link>
          </>
        }
      />

      <Carte>
        <form
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-5"
          onSubmit={(e) => {
            e.preventDefault();
            aller({ recherche });
          }}
        >
          <Saisie placeholder="Nom, n° de fiche, matricule, téléphone, lieu de service…" value={recherche} onChange={(e) => setRecherche(e.target.value)} onBlur={() => recherche !== f.recherche && aller({ recherche })} className="xl:col-span-2" />
          <Liste value={f.statut} onChange={(e) => aller({ statut: e.target.value })} vide="Tous les types d’agent" options={(c?.statuts ?? []).map((s) => ({ valeur: s.code, libelle: s.libelle }))} />
          {profil.role !== "DDEPPSA" && profil.role !== "STRUCTURE" ? (
            <Liste value={f.departement} onChange={(e) => aller({ departement: e.target.value })} vide="Tous les départements" options={refs.departements.map((d) => ({ valeur: d.id, libelle: d.nom }))} />
          ) : (
            <span />
          )}
          <Liste
            value={f.complet}
            onChange={(e) => aller({ complet: e.target.value })}
            vide="Complètes et incomplètes"
            options={[
              { valeur: "non", libelle: "À compléter" },
              { valeur: "oui", libelle: "Complètes" },
            ]}
          />
        </form>
        {(filtreManque || filtreControle) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px]">
            <span className="text-zinc-500">Filtre :</span>
            <span className="rounded-full bg-or-100 px-3 py-1 font-medium text-or-700">{filtreManque ? `${f.manque.startsWith("piece:") ? "pièce manquante" : "rubrique vide"} : ${filtreManque}` : filtreControle}</span>
            <button type="button" className="font-medium text-marque-700 hover:underline" onClick={() => aller({ manque: "", controle: "" })}>
              retirer
            </button>
          </div>
        )}
      </Carte>

      <Carte titre={liste.donnees ? `${liste.donnees.total.toLocaleString("fr-FR")} agent(s)` : undefined}>
        {liste.erreur && <Alerte>{liste.erreur}</Alerte>}
        {!liste.donnees ? (
          <Chargement />
        ) : !liste.donnees.lignes.length ? (
          <Vide>
            Aucun agent.{" "}
            <Link href="/personnel/agents/nouveau" className="font-medium text-marque-700 hover:underline">
              Créer une fiche
            </Link>{" "}
            ou{" "}
            <Link href="/personnel/import" className="font-medium text-marque-700 hover:underline">
              importer un fichier Excel
            </Link>
            .
          </Vide>
        ) : (
          <>
            <Tableau>
              <thead>
                <tr>
                  <th>N° fiche</th>
                  <th>Noms et prénoms</th>
                  <th>Type</th>
                  <th>Naissance</th>
                  <th>Lieu de service</th>
                  <th>Département</th>
                  <th>Fiche</th>
                </tr>
              </thead>
              <tbody>
                {liste.donnees.lignes.map((l) => (
                  <tr key={l.id}>
                    <td className="text-[12px] whitespace-nowrap text-zinc-500 tabular-nums">{l.numeroFiche}</td>
                    <td>
                      <Link href={`/personnel/agents/${l.id}`} className="font-medium text-encre underline decoration-zinc-300 decoration-dotted underline-offset-4 hover:text-marque-700">
                        {l.nomComplet}
                      </Link>
                      {l.matricule && <div className="text-[11px] text-zinc-400">Matricule {l.matricule}</div>}
                    </td>
                    <td className="text-[12px]">
                      {libelleStatut(c, l.statut)}
                      {l.contentieux === "EN_COURS" && <div className="text-[11px] font-medium text-or-700">Ajouté au recensement : à contrôler</div>}
                      {l.contentieux === "CONTROLE" && <div className="text-[11px] font-medium text-marque-700">Ajouté au recensement : à décider par le DG</div>}
                      {l.contentieux === "REJETE" && <div className="text-[11px] font-medium text-rouge-600">Rejeté par le DG</div>}
                    </td>
                    <td className="text-[12px] whitespace-nowrap tabular-nums">{dateFr(l.dateNaissance)}</td>
                    <td className="max-w-64 truncate text-[12px]">{l.structureNom ?? l.lieuService ?? "—"}</td>
                    <td className="text-[12px]">{nomDep(l.departementId)}</td>
                    <td title={!l.complet ? `${(l.manques.champs ?? []).length} rubrique(s) et ${(l.manques.pieces ?? []).length} pièce(s) à fournir` : undefined}>
                      <Taux taux={l.taux} complet={l.complet} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </Tableau>
            {pages > 1 && (
              <div className="mt-4 flex items-center justify-end gap-2 text-[12px] text-zinc-500">
                <Bouton variante="discret" disabled={f.page <= 1} onClick={() => aller({ ...f, page: f.page - 1 })}>
                  Précédente
                </Bouton>
                Page {f.page} sur {pages}
                <Bouton variante="discret" disabled={f.page >= pages} onClick={() => aller({ ...f, page: f.page + 1 })}>
                  Suivante
                </Bouton>
              </div>
            )}
          </>
        )}
      </Carte>
    </div>
  );
}
