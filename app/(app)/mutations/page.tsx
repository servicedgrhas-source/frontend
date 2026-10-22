"use client";

import { ArrowLeftRight, ArrowRight, ChevronRight, FileSpreadsheet, Printer } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useSession } from "@/components/session";
import { Alerte, Annonce, Badge, Bouton, BoutonIcone, Carte, Champ, Chargement, EnTete, Liste, Pastille, Saisie, Tableau, Vide, ZoneFichier } from "@/components/ui";
import { api, qs, useApi } from "@/lib/api";
import { CYCLES, duree, ETAT_MUTATION, GROUPES_MUTATION, peut } from "@/lib/libelles";
import type { DemandeMutation } from "@/lib/types";

export default function Mutations() {
  const { profil, refs } = useSession();
  const router = useRouter();
  const [motif, setMotif] = useState("");
  const [etat, setEtat] = useState("");
  const [groupe, setGroupe] = useState("");
  const [departementId, setDepartementId] = useState(profil.role === "DDEPPSA" && profil.departementId ? String(profil.departementId) : "");
  const [recherche, setRecherche] = useState("");
  const { donnees, erreur, recharger } = useApi<DemandeMutation[]>(`/mutations${qs({ motif, etat, groupe, departementId })}`);
  const libMotif = useMemo(() => Object.fromEntries(refs.motifs.map((m) => [m.code, m.libelle])), [refs]);

  const liste = useMemo(() => {
    const r = recherche.trim().toUpperCase();
    return r ? donnees?.filter((d) => d.nomComplet.toUpperCase().includes(r) || d.matricule?.toUpperCase().includes(r)) : donnees;
  }, [donnees, recherche]);

  return (
    <div className="space-y-4">
      <EnTete
        titre="Demandes de mutation"
        sousTitre="Chaque demande suit son circuit d’approbation : voie hiérarchique (établissement, inspection, DDEPPSA), puis bureau, service, direction et DGRHAS, qui décide. Les demandes accordées alimentent les notes de mutation."
        actions={
          peut.traiter(profil.role) && (
            <span className="flex gap-2">
            <Link href="/portail" target="_blank">
              <Bouton>Portail des agents (en ligne)</Bouton>
            </Link>
            <Link href="/mutations/nouvelle">
              <Bouton variante="principal">Nouvelle demande (dossier papier)</Bouton>
            </Link>
            </span>
          )
        }
      />
      {peut.traiter(profil.role) && <ImportMutations apres={recharger} />}
      <Carte>
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <Champ libelle="Recherche" className="w-full sm:w-56">
            <Saisie value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Nom ou matricule" />
          </Champ>
          <Champ libelle="Motif" className="w-48">
            <Liste value={motif} onChange={(e) => setMotif(e.target.value)} vide="Tous" options={refs.motifs.map((m) => ({ valeur: m.code, libelle: m.libelle }))} />
          </Champ>
          <Champ libelle="Étape" className="w-52">
            <Liste value={etat} onChange={(e) => setEtat(e.target.value)} vide="Toutes" options={Object.entries(ETAT_MUTATION).map(([k, v]) => ({ valeur: k, libelle: v.libelle }))} />
          </Champ>
          <Champ libelle="Cycles" className="w-48">
            <Liste value={groupe} onChange={(e) => setGroupe(e.target.value)} vide="Tous" options={Object.entries(GROUPES_MUTATION).map(([k, v]) => ({ valeur: k, libelle: v }))} />
          </Champ>
          <Champ libelle="Département" className="w-40">
            <Liste value={departementId} onChange={(e) => setDepartementId(e.target.value)} vide="Tous" options={refs.departements.map((d) => ({ valeur: d.id, libelle: d.nom }))} />
          </Champ>
        </div>
        {erreur && <Alerte>{erreur}</Alerte>}
        {!liste ? (
          <Chargement />
        ) : !liste.length ? (
          <Vide>Aucune demande.</Vide>
        ) : (
          <>
            <div className="mb-2 text-right text-xs text-zinc-400">{liste.length} demande(s)</div>
            <Tableau fixe>
              <thead>
                <tr>
                  <th className="w-[27%]">Agent</th>
                  <th className="w-[13%]">Grade</th>
                  <th className="w-[25%]">Mouvement demandé</th>
                  <th className="w-[17%]">Motif</th>
                  <th className="w-[14%]">Étape</th>
                  <th className="w-[7%]" />
                </tr>
              </thead>
              <tbody>
                {liste.map((d) => (
                  <tr key={d.id} className="cursor-pointer" onClick={() => router.push(`/mutation/${d.id}`)}>
                    <td>
                      <div className="flex items-center gap-3">
                        <Pastille ton={ETAT_MUTATION[d.etat].ton} taille="sm">
                          <ArrowLeftRight />
                        </Pastille>
                        <div className="min-w-0">
                          <div className="font-medium leading-snug">{d.nomComplet}</div>
                          <div className="text-[11px] text-zinc-400">
                            N° {d.numeroEnregistrement} · {d.typeAgent === "FINALISTE" ? "Finaliste" : (d.matricule ?? "Matricule ?")} ·{" "}
                            {d.statutAgent === "ENSEIGNANT" ? (d.genre === "F" ? "Ens. active" : "Ens. actif") : "Pers. adm."}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="font-medium">{[d.grade, d.echelon].filter((x) => x !== null).join(" ") || "—"}</div>
                      <div className="truncate text-[11px] text-zinc-400">
                        {d.cycle ? CYCLES[d.cycle] : "—"}
                        {d.specialite && d.specialite !== CYCLES[d.cycle ?? ""] && ` · ${d.specialite}`}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5 text-[13px]">
                        <span className="text-zinc-500">{d.departementOrigine?.nom ?? "?"}</span>
                        <ArrowRight className="size-3.5 text-zinc-300" />
                        <span className="font-medium">{d.departementSollicite?.nom ?? "?"}</span>
                      </div>
                      {d.lieuService && <div className="truncate text-[11px] text-zinc-400" title={d.lieuService}>{d.lieuService}</div>}
                    </td>
                    <td>
                      <div className="text-[13px]">{libMotif[d.motif]}</div>
                      <div className="text-[11px] text-zinc-400">{duree(d.dureeMoisCalculee)} dans le poste</div>
                    </td>
                    <td className="text-[11px]">
                      <Badge ton={ETAT_MUTATION[d.etat].ton}>{ETAT_MUTATION[d.etat].libelle}</Badge>
                      {d.etapeEnCours && (
                        <div className={`mt-1 ${(d.etapeEnCours.depuis ?? 0) > 7 ? "font-semibold text-rouge-600" : "text-zinc-500"}`}>
                          Chez {d.etapeEnCours.sigle}
                          {d.etapeEnCours.depuis !== null ? ` · ${d.etapeEnCours.depuis} j` : ""}
                        </div>
                      )}
                      {d.canal === "PORTAIL" && <div className="mt-1 text-sky-700">Faite en ligne</div>}
                      {d.noteId && <div className="mt-1 text-marque-700">Dans une note</div>}
                      {d.anomalies.length > 0 && (
                        <div className="mt-1 text-or-700" title={d.anomalies.join("\n")}>
                          {d.anomalies.length} point{d.anomalies.length > 1 ? "s" : ""} à vérifier
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap text-right">
                      <span className="inline-flex items-center gap-1">
                        <BoutonIcone
                          libelle="Imprimer la fiche individuelle"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`/impression/mutation/${d.id}`, "_blank");
                          }}
                        >
                          <Printer />
                        </BoutonIcone>
                        <ChevronRight className="inline size-4 text-zinc-300" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Tableau>
          </>
        )}
      </Carte>
    </div>
  );
}

function ImportMutations({ apres }: { apres: () => void }) {
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ ton: "vert" | "rouge"; texte: string } | null>(null);
  const [ouvert, setOuvert] = useState(false);

  async function envoyer(f: File) {
    const fd = new FormData();
    fd.append("fichier", f);
    setEnvoi(true);
    setMessage(null);
    try {
      const r = await api.post<{ lues: number; creees: number; misesAJour: number; feuilles: string[] }>("/mutations/import", fd);
      setMessage({ ton: "vert", texte: `${r.lues} demandes lues (${r.feuilles.join(", ")}) — ${r.creees} créées, ${r.misesAJour} mises à jour.` });
      apres();
    } catch (e) {
      setMessage({ ton: "rouge", texte: (e as Error).message });
    } finally {
      setEnvoi(false);
    }
  }

  if (!ouvert)
    return (
      <Bouton variante="secondaire" onClick={() => setOuvert(true)}>
        <FileSpreadsheet /> Reprendre un fichier Excel existant
      </Bouton>
    );
  return (
    <Carte titre="Reprise d’un fichier Excel de mutations">
      <p className="mb-4 text-[13px] leading-relaxed text-zinc-500">
        Le fichier « GESTIONS DES MUTATIONS » est lu depuis sa feuille « COMPIL » (ou, à défaut, toutes les feuilles visibles). Les demandes déjà
        tranchées par le Ministre ne sont pas modifiées.
      </p>
      <ZoneFichier accept=".xlsx" envoi={envoi} envoyer={envoyer} aide="GESTIONS DES MUTATIONS (.xlsx)" />
      <Annonce ton={message?.ton} fermer={() => setMessage(null)}>{message?.texte}</Annonce>
    </Carte>
  );
}
