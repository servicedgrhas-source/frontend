"use client";

import { ArrowLeftRight, ArrowRight, ChevronRight, Download, FileSpreadsheet, Lightbulb, Printer } from "lucide-react";
import { ProposerRecommandation } from "@/components/recommandation";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useSession } from "@/components/session";
import { Aide, Alerte, Annonce, Badge, Bouton, BoutonIcone, Carte, Champ, Chargement, EnTete, Liste, Modale, Pastille, Saisie, Tableau, Vide, Zone } from "@/components/ui";
import { api, qs, useApi } from "@/lib/api";
import { ImportMutations as ImportMutationsAssistant } from "@/components/mutations-import";
import { CompleterPersonnel, CorrigerPoints, PointsAVerifier } from "@/components/mutation-points";
import { CYCLES, duree, ETAT_MUTATION, GROUPES_MUTATION, peut } from "@/lib/libelles";
import type { DemandeMutation } from "@/lib/types";

export default function Mutations() {
  const { profil, refs } = useSession();
  const router = useRouter();
  // « Demandes de prestations › Suivi des prestations » ouvre la liste filtrée (?motif=PRESTATION)
  const [motif, setMotif] = useState(() => (typeof window === "undefined" ? "" : (new URLSearchParams(window.location.search).get("motif") ?? "")));
  const [etat, setEtat] = useState("");
  const [groupe, setGroupe] = useState("");
  const [departementId, setDepartementId] = useState(profil.role === "DDEPPSA" && profil.departementId ? String(profil.departementId) : "");
  const [recherche, setRecherche] = useState("");
  // Points à vérifier (06/11/2026) : « * » toutes les demandes qui en ont, sinon un point précis
  const [anomalie, setAnomalie] = useState(() => (typeof window === "undefined" ? "" : (new URLSearchParams(window.location.search).get("anomalie") ?? "")));
  const [corriger, setCorriger] = useState<DemandeMutation | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  // Sélection pour compléter le circuit en série (DG, 07/11/2026) ; recommandation depuis la ligne
  const [coches, setCoches] = useState<Set<string>>(new Set());
  const [serie, setSerie] = useState<"FAVORABLE" | "DEFAVORABLE" | null>(null);
  const [recommander, setRecommander] = useState<DemandeMutation | null>(null);
  const decide = profil.role === "DG" || profil.role === "ADMIN";
  const { donnees, erreur, recharger } = useApi<DemandeMutation[]>(`/mutations${qs({ motif, etat, groupe, departementId })}`);
  const libMotif = useMemo(() => Object.fromEntries(refs.motifs.map((m) => [m.code, m.libelle])), [refs]);

  const liste = useMemo(() => {
    const r = recherche.trim().toUpperCase();
    let l = r ? donnees?.filter((d) => d.nomComplet.toUpperCase().includes(r) || d.matricule?.toUpperCase().includes(r)) : donnees;
    // « - » : sans aucun point à vérifier ; « * » : avec au moins un point ; sinon un point précis
    if (anomalie) l = l?.filter((d) => (anomalie === "-" ? d.anomalies.length === 0 : anomalie === "*" ? d.anomalies.length > 0 : d.anomalies.includes(anomalie)));
    return l;
  }, [donnees, recherche, anomalie]);
  // Les demandes qu'on peut encore faire avancer : en circuit, pas retirées, pas dans une note
  const enCircuit = (d: DemandeMutation) => !!d.etapeEnCours && !d.noteId && d.etat !== "RETIREE";
  const cochables = (liste ?? []).filter(enCircuit);
  const toutCoche = cochables.length > 0 && cochables.every((d) => coches.has(d.id));
  const basculer = (id: string) =>
    setCoches((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  // La suivante à corriger : la prochaine demande de la liste affichée qui a encore des points
  const suivanteDe = (d: DemandeMutation) => {
    const l = (liste ?? []).filter((x) => x.anomalies.length && !x.noteId);
    const i = l.findIndex((x) => x.id === d.id);
    return l[i + 1] ?? null;
  };

  return (
    <div className="space-y-4">
      <EnTete
        titre="Demandes de mutation"
        sousTitre="Chaque demande suit son circuit d’approbation : voie hiérarchique (établissement, inspection, DDEPPSA), puis bureau, service, direction et DGRHAS, qui décide. Les demandes accordées alimentent les notes de mutation."
        actions={
          peut.traiter(profil.role) && (
            <span className="flex flex-wrap gap-2">
            {/* La base des mutations en Excel, avec les filtres de la liste ; points à vérifier en orange (07/11/2026) */}
            <Bouton
              onClick={() =>
                api
                  .telecharger(`/mutations/excel${qs({ motif, etat, groupe, departementId, recherche })}`, `Base des mutations ${new Date().toISOString().slice(0, 10)}.xlsx`)
                  .catch((e: Error) => setMessage(e.message))
              }
            >
              <Download className="size-4" aria-hidden /> Excel
              <Aide>Toutes les demandes de la liste (avec les filtres choisis), une ligne par demande. Celles qui ont encore des points à vérifier sont en orange ; une deuxième feuille les compte.</Aide>
            </Bouton>
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
      {peut.traiter(profil.role) && (
        <div className="flex flex-wrap items-start gap-2">
          <ImportMutations apres={recharger} />
          <CompleterPersonnel
            apres={(t) => {
              setMessage(t);
              recharger();
            }}
          />
        </div>
      )}
      {/* Le rattachement à la base du personnel se fait sur la note signée (« Importer dans la base du personnel », 06/11/2026) */}
      <Carte>
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <Champ libelle="Recherche" className="w-full sm:w-56">
            <Saisie value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Nom ou matricule" />
          </Champ>
          <Champ libelle="Motif" className="w-48">
            <Liste value={motif} onChange={(e) => setMotif(e.target.value)} vide="Tous" options={[...refs.motifs.map((m) => ({ valeur: m.code, libelle: m.libelle })), { valeur: "PRESTATION", libelle: "Prestations (congés, attestations, primes…)" }]} />
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
        {donnees && peut.traiter(profil.role) && (
          <div className="mb-3">
            <PointsAVerifier demandes={donnees} choisi={anomalie} choisir={setAnomalie} />
          </div>
        )}
        <Annonce fermer={() => setMessage(null)}>{message}</Annonce>
        {!liste ? (
          <Chargement />
        ) : !liste.length ? (
          <Vide>Aucune demande.</Vide>
        ) : (
          <>
            {decide && coches.size > 0 && (
              <div className="sticky top-2 z-20 mb-3 flex flex-wrap items-center gap-2 rounded-2xl bg-encre px-4 py-3 text-[13px] text-white shadow-lg">
                <strong>{coches.size} demande(s) cochée(s)</strong>
                <span className="text-white/60">· compléter tout leur circuit d’approbation d’un coup :</span>
                <span className="ml-auto flex flex-wrap gap-2">
                  <button type="button" onClick={() => setSerie("FAVORABLE")} className="rounded-xl bg-marque-500 px-3.5 py-2 font-semibold text-white hover:bg-marque-600">
                    Compléter favorablement
                  </button>
                  <button type="button" onClick={() => setSerie("DEFAVORABLE")} className="rounded-xl bg-rouge-600 px-3.5 py-2 font-semibold text-white hover:opacity-90">
                    Compléter défavorablement
                  </button>
                  <button type="button" onClick={() => setCoches(new Set())} className="rounded-xl px-3 py-2 text-white/80 ring-1 ring-white/30 hover:bg-white/10">
                    Tout décocher
                  </button>
                </span>
              </div>
            )}
            <div className="mb-2 flex items-center justify-between text-xs text-zinc-400">
              {decide && cochables.length > 0 ? (
                <span>Cochez des demandes (ou toutes, en haut à gauche) pour compléter leur circuit d’approbation sans ouvrir chaque fiche.</span>
              ) : (
                <span />
              )}
              <span>{liste.length} demande(s)</span>
            </div>
            <Tableau fixe>
              <thead>
                <tr>
                  {decide && (
                    <th className="w-[3%]">
                      <input
                        type="checkbox"
                        className="size-4 accent-marque-600"
                        checked={toutCoche}
                        disabled={!cochables.length}
                        onChange={() => setCoches(toutCoche ? new Set() : new Set(cochables.map((d) => d.id)))}
                        title="Cocher toutes les demandes en circuit de la liste"
                        aria-label="Tout cocher"
                      />
                    </th>
                  )}
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
                  <tr key={d.id} className={`cursor-pointer ${coches.has(d.id) ? "bg-marque-50/60" : ""}`} onClick={() => router.push(`/mutation/${d.id}`)}>
                    {decide && (
                      <td onClick={(e) => e.stopPropagation()}>
                        {enCircuit(d) ? (
                          <input type="checkbox" className="size-4 accent-marque-600" checked={coches.has(d.id)} onChange={() => basculer(d.id)} aria-label={`Cocher ${d.nomComplet}`} />
                        ) : null}
                      </td>
                    )}
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
                          {peut.traiter(profil.role) && !d.noteId && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCorriger(d);
                              }}
                              className="ml-1.5 rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-900 ring-1 ring-amber-300 hover:bg-amber-200"
                            >
                              Corriger
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap text-right">
                      <span className="inline-flex items-center gap-1">
                        {peut.traiter(profil.role) && !d.noteId && d.etat !== "RETIREE" && (
                          <BoutonIcone
                            libelle="Recommandation (autre département, autre lieu ou autre motif)"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRecommander(d);
                            }}
                          >
                            <Lightbulb />
                          </BoutonIcone>
                        )}
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
      {serie && (
        <CircuitEnSerie
          sens={serie}
          ids={[...coches]}
          fermer={() => setSerie(null)}
          apres={(t) => {
            setSerie(null);
            setCoches(new Set());
            setMessage(t);
            recharger();
          }}
        />
      )}
      {recommander && (
        <ProposerRecommandation
          url={`/mutations/${recommander.id}/recommandations`}
          personne={recommander.nomComplet}
          motifActuel={recommander.motif}
          avant={[recommander.departementSollicite?.nom, recommander.lieuSollicite].filter(Boolean).join(" · ")}
          libelleLieu="Lieu demandé (établissement, structure)"
          fermer={() => setRecommander(null)}
          apres={() => {
            setRecommander(null);
            setMessage("Recommandation proposée : elle est dans la page Recommandations (avis du directeur, puis décision du DG).");
          }}
        />
      )}
      {corriger && donnees && (
        <CorrigerPoints
          key={corriger.id}
          demande={corriger}
          toutes={donnees}
          suivante={suivanteDe(corriger)}
          fermer={() => setCorriger(null)}
          apres={(texte, ensuite) => {
            setMessage(texte);
            setCorriger(ensuite);
            recharger();
          }}
        />
      )}
    </div>
  );
}

/**
 * Compléter le circuit des demandes cochées (DG, 07/11/2026) : toutes leurs étapes restantes reçoivent
 * le même avis, avec la même motivation ; puis la décision finale, si on le laisse coché.
 */
function CircuitEnSerie({ sens, ids, fermer, apres }: { sens: "FAVORABLE" | "DEFAVORABLE"; ids: string[]; fermer: () => void; apres: (texte: string) => void }) {
  const favorable = sens === "FAVORABLE";
  const [motivation, setMotivation] = useState(favorable ? "Avis favorable : dossier complet et conforme." : "Avis défavorable.");
  const [jusquaDecision, setJusquaDecision] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  async function valider() {
    setEnvoi(true);
    setErreur(null);
    try {
      const r = await api.post<{ completees: number; decidees: number; laissees: string[] }>("/mutations/circuit/serie", { ids, sens, motivation, jusquaDecision });
      apres(
        `${r.completees} demande(s) : circuit complété ${favorable ? "favorablement" : "défavorablement"}${r.decidees ? `, ${r.decidees} ${favorable ? "accordée(s)" : "rejetée(s)"}` : ""}.${r.laissees.length ? ` ${r.laissees.length} laissée(s) (déjà décidées, dans une note ou retirées).` : ""}`,
      );
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  }
  return (
    <Modale titre={favorable ? "Compléter favorablement le circuit" : "Compléter défavorablement le circuit"} ouverte fermer={fermer}>
      <div className={`mb-3 rounded-2xl px-4 py-3 text-[13px] leading-relaxed ring-1 ${favorable ? "bg-marque-50 text-marque-900 ring-marque-200" : "bg-rouge-100 text-rouge-600 ring-rouge-600/30"}`}>
        Pour les <strong>{ids.length}</strong> demande(s) cochée(s), toutes les étapes qui restent (établissement, inspection, DDEPPSA, bureau, service, direction…)
        reçoivent un avis <strong>{favorable ? "favorable" : "défavorable"}</strong>, avec la motivation ci-dessous. Chaque étape portera « circuit complété en série par
        vous » ; tout est inscrit au journal et les structures du circuit sont prévenues.
      </div>
      <Champ libelle="Motivation (la même pour toutes)">
        <Zone rows={3} value={motivation} onChange={(e) => setMotivation(e.target.value)} />
      </Champ>
      <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-2xl bg-zinc-50 px-4 py-3 text-[13px] ring-1 ring-zinc-200">
        <input type="checkbox" className="mt-0.5 size-4 accent-marque-600" checked={jusquaDecision} onChange={(e) => setJusquaDecision(e.target.checked)} />
        <span>
          <strong>Aller jusqu’à la décision finale</strong> : les demandes sont {favorable ? "accordées" : "rejetées"}.
          <span className="block text-zinc-500">Décoché : le circuit s’arrête juste avant la dernière étape, qui décide ensuite demande par demande.</span>
        </span>
      </label>
      {erreur && (
        <div className="mt-3">
          <Alerte>{erreur}</Alerte>
        </div>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <Bouton onClick={fermer}>Annuler</Bouton>
        <Bouton variante="principal" chargement={envoi} disabled={motivation.trim().length < 3} onClick={valider}>
          {favorable ? "Compléter favorablement" : "Compléter défavorablement"} ({ids.length})
        </Bouton>
      </div>
    </Modale>
  );
}

function ImportMutations({ apres }: { apres: () => void }) {
  const [message, setMessage] = useState<string | null>(null);
  const [ouvert, setOuvert] = useState(false);
  if (!ouvert)
    return (
      <Bouton variante="secondaire" onClick={() => setOuvert(true)}>
        <FileSpreadsheet /> Reprendre un fichier Excel existant
      </Bouton>
    );
  return (
    <Carte titre="Reprise d’un fichier Excel de mutations" className="order-last w-full">
      <p className="mb-4 text-[13px] leading-relaxed text-zinc-500">
        Choisissez le fichier « GESTIONS DES MUTATIONS » : vous choisirez ensuite la feuille (la compilation), le système montre ce qui est déjà dans la base des
        mutations, ce qui est en double, et vous décidez avant d’importer. Les demandes déjà dans une note ou tranchées par le Ministre ne sont pas modifiées.
      </p>
      <ImportMutationsAssistant
        apres={(t) => {
          setMessage(t);
          apres();
        }}
      />
      <Annonce fermer={() => setMessage(null)}>{message}</Annonce>
    </Carte>
  );
}
