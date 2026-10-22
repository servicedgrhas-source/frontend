"use client";

import { CheckCircle2, PencilLine, TriangleAlert, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { CorrectionAnomalies, CorrectionCyclesGroupee } from "@/components/correction-anomalies";
import { GuideImports } from "@/components/guide-imports";
import { useSession } from "@/components/session";
import { Aide, Alerte, Annonce, Badge, Bouton, BoutonIcone, Carte, Champ, Chargement, EnTete, Liste, Modale, Pastille, Saisie, Tableau, Vide, ZoneFichier } from "@/components/ui";
import { api, qs, useApi } from "@/lib/api";
import { dateCourte, libelleAnomalie, libelleLot, peut } from "@/lib/libelles";
import type { Agent } from "@/lib/types";
import { useParametreUrl } from "@/lib/url";

interface Page {
  total: number;
  page: number;
  taille: number;
  items: Agent[];
}

interface Rapport {
  feuilles: { nom: string; lignes: number }[];
  lignesLues: number;
  crees: number;
  misAJour: number;
  affectationsCreees: number;
  lots: { numero: number; agents: number }[];
  anomalies: Record<string, number>;
}

export default function Recrutement() {
  const { profil } = useSession();
  const anomaliesUrl = useParametreUrl("anomalies");
  const [recherche, setRecherche] = useState("");
  const [saisie, setSaisie] = useState("");
  const [texte, setTexte] = useState("");
  const [feuille, setFeuille] = useState("");
  const [anomaliesChoisi, setAnomalies] = useState<boolean | null>(null);
  const anomalies = anomaliesChoisi ?? anomaliesUrl === "1";
  const [page, setPage] = useState(1);
  const [edition, setEdition] = useState<Agent | null>(null);
  const [correction, setCorrection] = useState<Agent | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const resumeAnomalies = useApi<{ anomalie: string; n: number }[]>("/agents/anomalies");
  const cyclesAVerifier = resumeAnomalies.donnees?.find((x) => x.anomalie === "Cycle de la base différent de celui du diplôme")?.n ?? 0;

  const { donnees, erreur, chargement, recharger } = useApi<Page>(
    anomaliesUrl === undefined ? null : `/agents${qs({ recherche, texte, feuille, anomalies, page, taille: 50 })}`,
  );
  const stats = useApi<{ total: number; textesRecus: number; enAttente: number; avecAnomalies: number; quotaAutres: number }>("/agents/statistiques");

  useEffect(() => {
    const t = setTimeout(() => {
      setRecherche(saisie);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [saisie]);

  return (
    <div className="space-y-4">
      <EnTete
        actions={
          peut.controler(profil.role) ? (
            <Bouton
              onClick={() =>
                api
                  .telecharger("/recrutes/export", peut.voirBudget(profil.role) ? "Base des recrutes - DGRHAS.xlsx" : "Base des recrutes - sans incidence.xlsx")
                  .catch(() => undefined)
              }
            >
              Exporter la base (Excel)
              <Aide>
                {peut.voirBudget(profil.role)
                  ? "Toute la base : commission, retour FP, incidence financière (salaires, total) et informations internes DGRHAS (origine, observations)."
                  : "Toute la base : commission et retour FP. Sans l’incidence financière ni les informations internes DGRHAS, réservées au DG."}
              </Aide>
            </Bouton>
          ) : undefined
        }
        titre="Base des recrutés"
        sousTitre="Liste générale des candidats retenus (commission) et retour de la Fonction Publique (textes reçus)."
      />
      {peut.importerBase(profil.role) ? (
        <ImportBase
          apres={() => {
            recharger();
            stats.recharger();
          }}
        />
      ) : (
        peut.traiter(profil.role) && (
          <p className="text-[12px] text-zinc-400">
            L’import de la fiche de suivi (entrée directe, sans le circuit) est réservé au chef de service et au DG.
          </p>
        )
      )}

      {stats.donnees && (
        <div className="flex flex-wrap gap-2 text-sm">
          <Badge>{stats.donnees.total} recrutés</Badge>
          <Badge ton="vert">{stats.donnees.textesRecus} textes reçus (pointés)</Badge>
          <Badge ton="jaune">{stats.donnees.enAttente} en attente du texte</Badge>
          <Badge ton="rouge">{stats.donnees.avecAnomalies} avec anomalies</Badge>
          <Badge ton="bleu">{stats.donnees.quotaAutres} quota « Autres »</Badge>
        </div>
      )}

      <Annonce fermer={() => setMessage(null)}>{message}</Annonce>
      {peut.traiter(profil.role) && (
        <CorrectionCyclesGroupee
          nombre={cyclesAVerifier}
          apres={(t) => {
            setMessage(t);
            recharger();
            stats.recharger();
            resumeAnomalies.recharger();
          }}
        />
      )}

      <Carte>
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <Champ libelle="Recherche (nom ou n° de texte)" className="w-72">
            <Saisie value={saisie} onChange={(e) => setSaisie(e.target.value)} placeholder="Ex. MOUANDA ou 6758" />
          </Champ>
          <Champ libelle="Texte de la FP">
            <Liste
              value={texte}
              onChange={(e) => {
                setTexte(e.target.value);
                setPage(1);
              }}
              vide="Tous"
              options={[
                { valeur: "recu", libelle: "Reçu (pointé)" },
                { valeur: "attente", libelle: "En attente" },
              ]}
            />
          </Champ>
          <Champ libelle="Liste">
            <Liste
              value={feuille}
              onChange={(e) => {
                setFeuille(e.target.value);
                setPage(1);
              }}
              vide="Toutes"
              options={[
                { valeur: "MEPPSA", libelle: "Liste MEPPSA" },
                { valeur: "QUOTA_AUTRES", libelle: "Quota Autres" },
              ]}
            />
          </Champ>
          <label className="flex items-center gap-2 pb-1.5 text-sm">
            <input
              type="checkbox"
              checked={anomalies}
              onChange={(e) => {
                setAnomalies(e.target.checked);
                setPage(1);
              }}
            />
            Uniquement avec anomalies
          </label>
        </div>

        {erreur && <Alerte>{erreur}</Alerte>}
        {!donnees && chargement && <Chargement />}
        {donnees && (
          <>
            <Tableau>
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Diplôme · département</th>
                  <th>Liste</th>
                  <th>Texte de la FP</th>
                  <th>Statut</th>
                  <th className="w-20" />
                </tr>
              </thead>
              <tbody>
                {donnees.items.map((a) => (
                  <tr key={a.id}>
                    <td className="min-w-60">
                      <div className="flex items-center gap-3">
                        <Pastille ton={a.anomalies.length ? "rouge" : a.lotPublication ? "vert" : "gris"} taille="sm">
                          {a.anomalies.length ? <TriangleAlert /> : a.lotPublication ? <CheckCircle2 /> : <UserRound />}
                        </Pastille>
                        <div className="min-w-0">
                          <div className="font-medium leading-snug">{a.nomComplet}</div>
                          <div className="text-[11px] text-zinc-400">
                            {a.dateNaissance ? (
                              <>
                                Né(e) le {dateCourte(a.dateNaissance)}
                                {a.age !== null && a.age !== undefined && ` · ${a.age} ans`}
                              </>
                            ) : (
                              <span className="text-rouge-600">Naissance : {a.dateNaissanceBrute ?? "absente"}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>{a.diplomeBrut ?? "—"}</div>
                      <div className="text-[11px] text-zinc-400">
                        {a.departement?.nom ?? (a.feuille === "QUOTA_AUTRES" ? (
                          <span className="text-or-700" title="Quota « Autres » : le département se donne par la répartition (Pilotage → Répartition du quota « Autres »)">
                            Département à répartir (quota « Autres »)
                          </span>
                        ) : (
                          <span className="text-rouge-600" title="Département d’affectation : il doit être l’un des 15 départements scolaires">
                            {a.departementBrut ? `Département « ${a.departementBrut} » non reconnu` : "Département d’affectation vide dans le fichier"}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="text-xs whitespace-nowrap text-zinc-500">
                      {a.feuille === "QUOTA_AUTRES" ? "Quota Autres" : `Quota ${a.quota ?? ""} · ${a.lotCommission ?? ""}`}
                    </td>
                    <td className="text-xs whitespace-nowrap">
                      {a.lotPublication ? (
                        <div className="flex items-center gap-2">
                          <Badge ton="vert">{libelleLot(a.lotPublication)}</Badge>
                          <span className="text-zinc-600">
                            {a.typeTexte === "DECRET" ? "Décret" : "Arrêté"} {a.reference ?? a.numeroTexte}
                          </span>
                        </div>
                      ) : (
                        <Badge ton="jaune">En attente du texte</Badge>
                      )}
                    </td>
                    <td className="max-w-64 text-[11px]">
                      {a.contractuel === true && <Badge ton="bleu" titre={a.contractuelForce !== null ? "Imposé par l’arrêté" : "Calculé par l’âge"}>Contractuel</Badge>}
                      {a.contractuel === false && <Badge>Fonctionnaire</Badge>}
                      {a.contractuel === null && <Badge ton="rouge">À préciser</Badge>}
                      {a.anomalies.length > 0 && (
                        <button
                          type="button"
                          disabled={!peut.traiter(profil.role)}
                          onClick={() => setCorrection(a)}
                          className="mt-1 block text-left text-rouge-600 enabled:hover:underline"
                          title={a.anomalies.map((x) => libelleAnomalie(x, a).titre).join("\n")}
                        >
                          {libelleAnomalie(a.anomalies[0], a).titre}
                          {a.anomalies.length > 1 && ` (+${a.anomalies.length - 1})`}
                        </button>
                      )}
                    </td>
                    <td className="text-right">
                      {peut.traiter(profil.role) && (
                        <div className="flex justify-end gap-1">
                          {a.anomalies.length > 0 && (
                            <BoutonIcone libelle="Corriger l’anomalie" ton="rouge" onClick={() => setCorrection(a)} className="text-rouge-600!">
                              <TriangleAlert />
                            </BoutonIcone>
                          )}
                          <BoutonIcone libelle="Corriger la fiche" onClick={() => setEdition(a)}>
                            <PencilLine />
                          </BoutonIcone>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Tableau>
            {!donnees.items.length && <Vide>Aucun résultat.</Vide>}
            <div className="mt-4 flex items-center justify-between text-xs text-zinc-400">
              <span>
                {donnees.total} fiche(s) — page {donnees.page} / {Math.max(1, Math.ceil(donnees.total / donnees.taille))}
              </span>
              <div className="flex gap-2">
                <Bouton disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Précédent
                </Bouton>
                <Bouton disabled={page * donnees.taille >= donnees.total} onClick={() => setPage((p) => p + 1)}>
                  Suivant
                </Bouton>
              </div>
            </div>
          </>
        )}
      </Carte>

      {correction && (
        <CorrectionAnomalies
          agent={correction}
          fermer={() => setCorrection(null)}
          apres={(t) => {
            setCorrection(null);
            setMessage(t);
            recharger();
            stats.recharger();
            resumeAnomalies.recharger();
          }}
        />
      )}
      {edition && (
        <EditionAgent
          agent={edition}
          fermer={() => setEdition(null)}
          apres={() => {
            setEdition(null);
            recharger();
            stats.recharger();
          }}
        />
      )}
    </div>
  );
}

function ImportBase({ apres }: { apres: () => void }) {
  const [envoi, setEnvoi] = useState(false);
  const [rapport, setRapport] = useState<Rapport | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  // Fichier en attente de la confirmation « ATTENTION »
  const [enAttente, setEnAttente] = useState<File | null>(null);

  async function envoyer(f: File) {
    setEnAttente(null);
    const fd = new FormData();
    fd.append("fichier", f);
    setEnvoi(true);
    setErreur(null);
    setRapport(null);
    try {
      setRapport(await api.post<Rapport>("/import/base", fd));
      apres();
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Carte titre="Importer / actualiser la base Excel">
      <p className="mb-4 max-w-4xl text-[13px] leading-relaxed text-zinc-500">
        Chargez la « Fiche de suivi Recrutement » à jour (feuilles visibles « Cumul » et « Quota Autres »). Les agents sont reconnus d’un import à
        l’autre : rien n’est dupliqué, les corrections faites ici sont conservées, et chaque agent dont le texte est arrivé est automatiquement
        pointé et préparé pour l’affectation. Une colonne facultative « Date de signature » est prise en compte si elle existe.
      </p>
      <div className="mb-4">
        <GuideImports ici="base" />
      </div>
      <ZoneFichier accept=".xlsx" envoi={envoi} envoyer={setEnAttente} aide="Fiche de suivi Recrutement (.xlsx)" />
      <Modale titre="ATTENTION : entrée directe dans la base" ouverte={!!enAttente} fermer={() => setEnAttente(null)}>
        <div className="space-y-3 text-[13px] leading-relaxed text-zinc-600">
          <p>
            Les personnes du fichier « {enAttente?.name} » vont entrer <strong>directement</strong> dans la base des recrutés, avec leurs textes s’ils sont notés :
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>sans</strong> contrôle, <strong>sans</strong> validation du DG et <strong>sans</strong> envoi à la FP dans le système ;
            </li>
            <li>celles dont le texte est noté seront tout de suite prêtes pour l’affectation ;</li>
            <li>l’import est noté dans le journal, avec votre nom.</li>
          </ul>
          <p>
            À utiliser seulement pour un <strong>travail fait avant le système ou en dehors</strong>. Pour de nouveaux candidats, passez par « Saisie des candidats » ;
            pour des textes qui reviennent de la FP, par « Réception des textes ».
          </p>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Bouton onClick={() => setEnAttente(null)}>Annuler</Bouton>
          <Bouton variante="danger" disabled={envoi} onClick={() => enAttente && envoyer(enAttente)}>
            Je comprends : importer
          </Bouton>
        </div>
      </Modale>
      <Annonce ton="rouge" fermer={() => setErreur(null)}>
        {erreur}
      </Annonce>
      <Annonce fermer={() => setRapport(null)}>
        {rapport && (
          <div className="space-y-3">
            <p>
              {rapport.lignesLues} lignes lues ({rapport.feuilles.map((f) => `${f.nom} : ${f.lignes}`).join(", ")}) — {rapport.crees} nouvelles fiches,{" "}
              {rapport.misAJour} mises à jour, {rapport.affectationsCreees} nouveaux agents à affecter.
            </p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {Object.entries(rapport.anomalies).map(([k, v]) => (
                <Badge key={k} ton="jaune" titre={libelleAnomalie(k).detail || undefined}>
                  {libelleAnomalie(k).titre} : {v}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </Annonce>
    </Carte>
  );
}

function EditionAgent({ agent, fermer, apres }: { agent: Agent; fermer: () => void; apres: () => void }) {
  const { refs } = useSession();
  const [f, setF] = useState({
    dateNaissance: agent.dateNaissance ?? "",
    departementId: agent.departementId ? String(agent.departementId) : "",
    diplomeCode: agent.diplomeCode ?? "",
    numeroTexte: agent.numeroTexte ?? "",
    dateSignatureTexte: agent.dateSignatureTexte ?? "",
    contractuel: agent.contractuelForce === null ? "" : agent.contractuelForce ? "1" : "0",
  });
  const [erreur, setErreur] = useState<string | null>(null);

  async function enregistrer() {
    const corps: Record<string, unknown> = {};
    if (f.dateNaissance && f.dateNaissance !== agent.dateNaissance) corps.dateNaissance = f.dateNaissance;
    if (f.departementId && Number(f.departementId) !== agent.departementId) corps.departementId = Number(f.departementId);
    if (f.diplomeCode && f.diplomeCode !== agent.diplomeCode) corps.diplomeCode = f.diplomeCode;
    if (f.numeroTexte && f.numeroTexte !== agent.numeroTexte) corps.numeroTexte = f.numeroTexte;
    if ((f.dateSignatureTexte || null) !== agent.dateSignatureTexte) corps.dateSignatureTexte = f.dateSignatureTexte || null;
    const c = f.contractuel === "" ? null : f.contractuel === "1";
    if (c !== agent.contractuelForce) corps.contractuelForce = c;
    try {
      await api.patch(`/agents/${agent.id}`, corps);
      apres();
    } catch (e) {
      setErreur((e as Error).message);
    }
  }

  return (
    <Modale titre={`Corriger la fiche – ${agent.nomComplet}`} ouverte fermer={fermer}>
      <div className="grid grid-cols-2 gap-3">
        {erreur && <div className="col-span-2"><Alerte>{erreur}</Alerte></div>}
        <Champ libelle="Date de naissance" aide={agent.dateNaissanceBrute ? `Dans le fichier : « ${agent.dateNaissanceBrute} »` : undefined}>
          <Saisie type="date" value={f.dateNaissance} onChange={(e) => setF({ ...f, dateNaissance: e.target.value })} />
        </Champ>
        <Champ libelle="Département" aide={agent.departementBrut ? `Dans le fichier : « ${agent.departementBrut} »` : undefined}>
          <Liste value={f.departementId} onChange={(e) => setF({ ...f, departementId: e.target.value })} vide="—" options={refs.departements.map((d) => ({ valeur: d.id, libelle: d.nom }))} />
        </Champ>
        <Champ libelle="Diplôme (règle appliquée)" aide={`Dans le fichier : « ${agent.diplomeBrut ?? "—"} »`}>
          <Liste value={f.diplomeCode} onChange={(e) => setF({ ...f, diplomeCode: e.target.value })} vide="—" options={refs.regles.map((r) => ({ valeur: r.code, libelle: `${r.libelle} → ${r.grade ?? "?"}` }))} />
        </Champ>
        <Champ libelle="N° du texte">
          <Saisie value={f.numeroTexte} onChange={(e) => setF({ ...f, numeroTexte: e.target.value })} />
        </Champ>
        <Champ libelle="Date de signature du texte" aide="Laisser vide pour utiliser celle du lot">
          <Saisie type="date" value={f.dateSignatureTexte} onChange={(e) => setF({ ...f, dateSignatureTexte: e.target.value })} />
        </Champ>
        <Champ libelle="Statut selon l’arrêté" aide="Si l’arrêté contredit le calcul par l’âge">
          <Liste
            value={f.contractuel}
            onChange={(e) => setF({ ...f, contractuel: e.target.value })}
            options={[
              { valeur: "", libelle: "Calcul automatique (âge)" },
              { valeur: "1", libelle: "Contractuel" },
              { valeur: "0", libelle: "Fonctionnaire" },
            ]}
          />
        </Champ>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Bouton onClick={fermer}>Annuler</Bouton>
        <Bouton variante="principal" onClick={enregistrer}>
          Enregistrer
        </Bouton>
      </div>
    </Modale>
  );
}
