"use client";

import { ArrowRight, Download, FileUp, Plus, Printer, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Pagination } from "@/components/pagination";
import { ouCorriger, type AnomalieFiche } from "@/components/recensement/anomalies";
import { libelleStatut, peutRecenser, Taux, useConfigRecensement, type Manques } from "@/components/recensement/commun";
import { useSession } from "@/components/session";
import { Alerte, Bouton, Carte, Chargement, EnTete, Liste, Saisie, Tableau, Vide, cx } from "@/components/ui";
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
  genre: string | null;
  lieuNaissance: string | null;
  taux: number;
  complet: boolean;
  manques: Manques;
  contentieux: string | null;
  /** Fiches présentant des anomalies : ses problèmes (mode « anomalies »). */
  anomalies?: AnomalieFiche[];
}

const dateFr = (d: string | null) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : "—");

/** Base du personnel, par ordre alphabétique : recherche, filtres (ce qui manque, contrôles), accès aux fiches, export et bottin. */
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
    anomalies: params.get("anomalies") ?? "",
    page: Number(params.get("page") ?? 1),
  };
  const liste = useApi<{ total: number; page: number; parPage: number; lignes: Ligne[]; parAnomalie?: { code: string; libelle: string; n: number }[] }>(`/recensement/agents${qs(f)}`);
  // Mode « fiches présentant des anomalies » : tous les problèmes, ou un seul (filtre « controle »)
  const enAnomalies = !!f.anomalies || !!f.controle;
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
            <Bouton variante={enAnomalies ? "sombre" : "secondaire"} onClick={() => aller(enAnomalies ? { anomalies: "", controle: "" } : { anomalies: "1", controle: "" })} title="Les fiches qui ont un problème (doublon, matricule commun, valeur fausse, incohérence…), et où le corriger">
              <TriangleAlert /> {enAnomalies ? "Toutes les fiches" : "Afficher les fiches présentant des anomalies"}
            </Bouton>
            <Bouton onClick={() => api.telecharger(`/recensement/export${qs(f)}`, "Base du personnel.xlsx")}>
              <Download /> Exporter en Excel
            </Bouton>
            <Bouton onClick={() => window.open(`/impression/bottin${qs({ ...f, page: undefined })}`, "_blank")} title="Liste imprimable (en-tête, pages numérotées, signature), avec les filtres choisis">
              <Printer /> Imprimer le bottin
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
        {enAnomalies && liste.donnees?.parAnomalie && (
          <div className="mt-4 rounded-2xl bg-or-50 p-3 ring-1 ring-or-200">
            <div className="mb-2 text-[13px] font-semibold text-or-800">Fiches présentant des anomalies : choisissez un problème, puis « Corriger » sur chaque fiche</div>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={() => aller({ anomalies: "1", controle: "" })} className={cx("rounded-full px-3 py-1 text-[12px] ring-1", !f.controle ? "bg-nuit text-white ring-nuit" : "bg-white ring-zinc-200 hover:bg-zinc-50")}>
                Tous les problèmes
              </button>
              {liste.donnees.parAnomalie.map((x) => (
                <button
                  key={x.code}
                  type="button"
                  onClick={() => aller({ anomalies: "1", controle: x.code })}
                  className={cx("rounded-full px-3 py-1 text-left text-[12px] ring-1", f.controle === x.code ? "bg-or-500 text-white ring-or-500" : "bg-white ring-zinc-200 hover:bg-zinc-50")}
                >
                  {x.libelle} · <strong>{x.n.toLocaleString("fr-FR")}</strong>
                </button>
              ))}
            </div>
          </div>
        )}
        {!enAnomalies && (filtreManque || filtreControle) && (
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
                  <th>Genre</th>
                  <th>Type</th>
                  <th>Date de naissance</th>
                  <th>Lieu de naissance</th>
                  <th>Lieu de service</th>
                  <th>Département</th>
                  <th>{enAnomalies ? "Problèmes et où corriger" : "Fiche"}</th>
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
                    <td className="text-[12px]" title={l.genre === "F" ? "Féminin" : l.genre === "M" ? "Masculin" : undefined}>
                      {l.genre === "F" ? "F" : l.genre === "M" ? "M" : "—"}
                    </td>
                    <td className="text-[12px]">
                      {libelleStatut(c, l.statut)}
                      {l.contentieux === "EN_COURS" && <div className="text-[11px] font-medium text-or-700">Ajouté au recensement : à contrôler</div>}
                      {l.contentieux === "CONTROLE" && <div className="text-[11px] font-medium text-marque-700">Ajouté au recensement : à décider par le DG</div>}
                      {l.contentieux === "REJETE" && <div className="text-[11px] font-medium text-rouge-600">Rejeté par le DG</div>}
                    </td>
                    <td className="text-[12px] whitespace-nowrap tabular-nums">{dateFr(l.dateNaissance)}</td>
                    <td className="max-w-40 truncate text-[12px]">{l.lieuNaissance ?? "—"}</td>
                    <td className="max-w-64 truncate text-[12px]">{l.structureNom ?? l.lieuService ?? "—"}</td>
                    <td className="text-[12px]">{nomDep(l.departementId)}</td>
                    {enAnomalies ? (
                      <td className="min-w-72">
                        <ul className="space-y-1.5">
                          {(l.anomalies ?? []).map((x) => {
                            const o = c ? ouCorriger(x.code, c, { manques: l.manques, nomComplet: l.nomComplet }) : null;
                            return (
                              <li key={x.code} className="text-[12px]">
                                <div className="flex items-start gap-1.5">
                                  <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-or-600" />
                                  <span className="min-w-0 flex-1">{x.libelle}</span>
                                  <Link href={o?.lien && !o.cible ? o.lien : `/personnel/agents/${l.id}?corriger=${encodeURIComponent(x.code)}`} className="inline-flex shrink-0 items-center gap-0.5 font-semibold text-marque-700 hover:underline">
                                    Corriger <ArrowRight className="size-3" />
                                  </Link>
                                </div>
                                {!!x.avec.length && (
                                  <div className="ml-5 text-[11px] text-zinc-500">
                                    avec{" "}
                                    {x.avec.map((y, i) => (
                                      <span key={y.id}>
                                        {i > 0 && ", "}
                                        <Link href={`/personnel/agents/${y.id}`} className="underline">
                                          {y.nomComplet} ({y.numeroFiche})
                                        </Link>
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </td>
                    ) : (
                      <td title={!l.complet ? `${(l.manques.champs ?? []).length} rubrique(s) et ${(l.manques.pieces ?? []).length} pièce(s) à fournir` : undefined}>
                        <Taux taux={l.taux} complet={l.complet} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </Tableau>
            <Pagination page={f.page} pages={pages} aller={(p) => aller({ ...f, page: p })} />
          </>
        )}
      </Carte>
    </div>
  );
}
