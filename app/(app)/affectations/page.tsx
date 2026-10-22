"use client";

import {
  Ban,
  CheckCircle2,
  PencilLine,
  RotateCcw,
  Search,
  Stamp,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CorrectionAnomalies } from "@/components/correction-anomalies";
import { ResoudreProbleme } from "@/components/resoudre-probleme";
import { ChoixEtablissement } from "@/components/choix-etablissement";
import { useSession } from "@/components/session";
import { Aide, Alerte, Annonce, Badge, Bouton, BoutonIcone, Carte, Champ, Chargement, EnTete, Liste, Modale, Pastille, Saisie, Tableau, Vide, Zone } from "@/components/ui";
import { api, qs, useApi } from "@/lib/api";
import { peut, STATUT_AFFECTATION, libelleAnomalie } from "@/lib/libelles";
import type { Affectation, Lot, NoteResume } from "@/lib/types";
import { useParametreUrl } from "@/lib/url";

type Resume = Record<
  string,
  {
    total: number;
    prets: number;
    bloques: number;
    exclus: number;
    affectes: number;
  }
>;

export default function Affectations() {
  const { profil, refs } = useSession();
  const lotUrl = useParametreUrl("lot");
  const lots = useApi<Lot[]>("/lots");
  const [lotChoisi, setLot] = useState<number | null>(null);
  // « ?typeNote=… » (lien depuis une note) : ce type de note seulement
  const typeUrl = useParametreUrl("typeNote");
  const [typeChoisi, setTypeNote] = useState<string | null>(null);
  const typeNote = typeChoisi ?? typeUrl ?? "";
  const [departementId, setDepartementId] = useState("");
  const [statut, setStatut] = useState("A_TRAITER");
  // « ?probleme=bloquant » (lien depuis « Lots de textes ») : seulement les personnes à compléter
  const problemeUrl = useParametreUrl("probleme");
  const [problemeChoisi, setProbleme] = useState<string | null>(null);
  const probleme = problemeChoisi ?? (problemeUrl === "bloquant" ? "bloquant" : "");
  const [recherche, setRecherche] = useState("");
  const [action, setAction] = useState<{
    type: "modifier" | "recommander" | "exclure" | "resoudre" | "anomalies";
    aff: Affectation;
    /** Problème cliqué (fenêtre « Régler le problème »). */
    focus?: string;
  } | null>(null);
  const [message, setMessage] = useState<{
    ton: "vert" | "rouge";
    texte: React.ReactNode;
  } | null>(null);

  // Lot affiché : celui choisi, sinon celui de l'URL, sinon le dernier reçu
  const lot = useMemo(() => {
    if (lotChoisi !== null) return lotChoisi;
    if (lotUrl === undefined || !lots.donnees) return null;
    const n = Number(lotUrl);
    return lots.donnees.some((l) => l.numero === n)
      ? n
      : (lots.donnees.at(-1)?.numero ?? null);
  }, [lotChoisi, lotUrl, lots.donnees]);

  const liste = useApi<Affectation[]>(
    lot
      ? `/affectations${qs({ lot, typeNote, departementId, statut, probleme })}`
      : null,
  );
  const resume = useApi<Resume>(lot ? `/lots/${lot}/resume` : null);
  const libelleChoisi = lots.donnees?.find((l) => l.numero === lot)?.libelle ?? `Lot ${lot}`;
  const libType = useMemo(
    () => Object.fromEntries(refs.typesNote.map((t) => [t.code, t.libelle])),
    [refs],
  );

  const filtres = useMemo(() => {
    const r = recherche.trim().toUpperCase();
    if (!liste.donnees || !r) return liste.donnees;
    return liste.donnees.filter(
      (a) =>
        a.agent.nomComplet.toUpperCase().includes(r) ||
        a.agent.numeroTexte === recherche.trim(),
    );
  }, [liste.donnees, recherche]);

  // Affiche seulement les personnes qui ne peuvent pas encore entrer dans une note
  function voirACompleter(t = "") {
    setTypeNote(t);
    setStatut("A_TRAITER");
    setProbleme("bloquant");
    setMessage(null);
    setTimeout(
      () =>
        document
          .getElementById("liste-affectations")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      80,
    );
  }

  const rafraichir = () => {
    liste.recharger();
    resume.recharger();
  };

  async function preparer() {
    try {
      const notes = await api.post<NoteResume[]>(
        `/notes/preparer/affectation/${lot}`,
      );
      const r = resume.donnees ?? {};
      const bloques = Object.values(r).reduce((n, x) => n + x.bloques, 0);
      setMessage({
        ton: "vert",
        texte: (
          <div className="space-y-3 text-left">
            <p className="text-center">
              {notes.length
                ? `${notes.length} note(s) préparée(s) pour ${libelleChoisi}, une par type de note :`
                : "Aucune nouvelle note : les notes ouvertes de ce lot sont déjà à jour (elles se recalculent automatiquement)."}
            </p>
            {notes.length > 0 && (
              <ul className="rounded-2xl bg-zinc-50 px-4 py-2 text-[12px]">
                {notes.map((n) => (
                  <li key={n.id} className="flex justify-between gap-3 py-0.5">
                    <span>{libType[n.typeNote] ?? n.typeNote}</span>
                    <strong className="tabular-nums">
                      {r[n.typeNote]?.prets ?? 0} personne(s)
                    </strong>
                  </li>
                ))}
              </ul>
            )}
            {bloques > 0 && (
              <Alerte ton="jaune">
                <strong>
                  {bloques} personne(s) ne sont pas encore dans les notes
                </strong>{" "}
                : il leur manque une information (date de signature, diplôme,
                département…). Une fois complétées, elles entrent{" "}
                <strong>automatiquement</strong> dans leur note.{" "}
                <button
                  type="button"
                  className="font-semibold underline"
                  onClick={() => voirACompleter()}
                >
                  Voir et compléter ces {bloques} personne(s)
                </button>
              </Alerte>
            )}
            {notes.length > 0 && (
              <p className="text-center">
                <Link
                  href="/notes/affectation"
                  className="font-medium text-marque-700 underline"
                >
                  Ouvrir les notes
                </Link>
              </p>
            )}
          </div>
        ),
      });
    } catch (e) {
      setMessage({ ton: "rouge", texte: (e as Error).message });
    }
  }

  async function reintegrer(a: Affectation) {
    try {
      await api.post(`/affectations/${a.id}/reintegrer`);
      rafraichir();
    } catch (e) {
      setMessage({ ton: "rouge", texte: (e as Error).message });
    }
  }

  return (
    <div className="space-y-4">
      <EnTete
        titre="Traitement des affectations"
        sousTitre="Grade, classification, statut contractuel, référence du texte et département sont remplis automatiquement. Vérifiez, complétez et préparez les notes."
        actions={
          peut.traiter(profil.role) &&
          lot && (
            <Bouton variante="principal" onClick={preparer}>
              Préparer les notes de ce lot
            </Bouton>
          )
        }
      />
      <Annonce ton={message?.ton} fermer={() => setMessage(null)}>
        {message?.texte}
      </Annonce>

      {lots.donnees && (
        <label className="flex flex-wrap items-center gap-3 rounded-2xl bg-white px-4 py-3 text-[13px] shadow-doux">
          <span className="font-medium text-zinc-600">Lot traité</span>
          <select
            value={lot ?? ""}
            onChange={(e) => setLot(Number(e.target.value))}
            className="min-w-72 flex-1 rounded-xl bg-zinc-100/80 px-3 py-2 text-[13px] text-encre outline-none focus:bg-white focus:ring-4 focus:ring-marque-100"
          >
            {/* Un groupe par paquet, le plus récent en haut */}
            {[...new Map(lots.donnees.map((l) => [l.paquet?.libelle ?? "Sans paquet", l.paquet?.dateReception ?? ""])).entries()]
              .sort((x, y) => y[1].localeCompare(x[1]))
              .map(([paquet]) => (
                <optgroup key={paquet} label={paquet}>
                  {lots.donnees!
                    .filter((l) => (l.paquet?.libelle ?? "Sans paquet") === paquet)
                    .map((l) => (
                      <option key={l.numero} value={l.numero}>
                        {l.libelle} ({l.arretes + l.decrets}){l.aTraiter ? ` · ${l.aTraiter} pas encore affectés` : " · terminé"}
                      </option>
                    ))}
                </optgroup>
              ))}
          </select>
          <Aide>
            Un lot = les textes d’un même quota et d’un même type (Arrêtés, Décrets PM, Décrets PR) arrivés dans un même paquet. Les lots sont rangés par paquet
            (date de réception).
          </Aide>
        </label>
      )}

      {resume.donnees &&
        (() => {
          const lignes = Object.values(resume.donnees);
          const somme = (
            k: "total" | "prets" | "bloques" | "affectes" | "exclus",
          ) => lignes.reduce((n, r) => n + r[k], 0);
          return (
            <button
              type="button"
              onClick={() => setTypeNote("")}
              className={`flex w-full flex-wrap items-center gap-x-6 gap-y-2 rounded-3xl bg-nuit px-6 py-4 text-left text-white shadow-doux transition-all hover:-translate-y-0.5 ${typeNote === "" ? "ring-2 ring-or-400" : ""}`}
            >
              <div>
                <div className="text-[11px] text-white/60">
                  {libelleChoisi}
                </div>
                <div className="text-3xl font-semibold tabular-nums">
                  {somme("total")} agents
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 text-[12px]">
                <Badge ton="vert">{somme("prets")} prêts</Badge>
                {somme("bloques") > 0 && (
                  <BadgeACompleter
                    n={somme("bloques")}
                    voir={() => voirACompleter()}
                  />
                )}
                {somme("affectes") > 0 && (
                  <Badge ton="bleu">{somme("affectes")} affectés</Badge>
                )}
                {somme("exclus") > 0 && <Badge>{somme("exclus")} exclus</Badge>}
              </div>
            </button>
          );
        })()}

      {resume.donnees && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-3">
          {Object.entries(resume.donnees).map(([t, r]) => (
            <button
              key={t}
              onClick={() => setTypeNote(typeNote === t ? "" : t)}
              className={`min-w-0 overflow-hidden rounded-3xl bg-white p-4 text-left shadow-doux transition-all hover:-translate-y-0.5 ${typeNote === t ? "ring-2 ring-marque-500" : ""}`}
            >
              <div
                className="truncate text-xs text-zinc-500"
                title={libType[t] ?? "Diplôme non reconnu"}
              >
                {libType[t] ?? "Diplôme non reconnu"}
              </div>
              <div className="mt-0.5 text-2xl font-semibold tabular-nums">
                {r.total}
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                <Badge ton="vert">{r.prets} prêts</Badge>
                {r.bloques > 0 && (
                  <BadgeACompleter
                    n={r.bloques}
                    voir={() => voirACompleter(t)}
                  />
                )}
                {r.affectes > 0 && (
                  <Badge ton="bleu">{r.affectes} affectés</Badge>
                )}
                {r.exclus > 0 && <Badge>{r.exclus} exclus</Badge>}
              </div>
            </button>
          ))}
        </div>
      )}

      <div id="liste-affectations" className="scroll-mt-4">
        <Carte>
          <div className="mb-5 flex flex-wrap items-end gap-3">
            <Champ libelle="Recherche" className="w-full sm:w-64">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
                <Saisie
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  placeholder="Nom ou n° de texte"
                  className="w-full pl-9"
                />
              </div>
            </Champ>
            <Champ libelle="Note" className="w-48">
              <Liste
                value={typeNote}
                onChange={(e) => setTypeNote(e.target.value)}
                vide="Toutes"
                options={refs.typesNote.map((t) => ({
                  valeur: t.code,
                  libelle: t.libelle,
                }))}
              />
            </Champ>
            <Champ libelle="Département retenu" className="w-44">
              <Liste
                value={departementId}
                onChange={(e) => setDepartementId(e.target.value)}
                vide="Tous"
                options={refs.departements.map((d) => ({
                  valeur: d.id,
                  libelle: d.nom,
                }))}
              />
            </Champ>
            <Champ libelle="Statut" className="w-36">
              <Liste
                value={statut}
                onChange={(e) => setStatut(e.target.value)}
                vide="Tous"
                options={Object.entries(STATUT_AFFECTATION).map(([k, v]) => ({
                  valeur: k,
                  libelle: v.libelle,
                }))}
              />
            </Champ>
            <Champ libelle="Contrôle" className="w-48">
              <Liste
                value={probleme}
                onChange={(e) => setProbleme(e.target.value)}
                vide="Toutes les lignes"
                options={[
                  { valeur: "bloquant", libelle: "À compléter" },
                  { valeur: "avertissement", libelle: "Avec avertissement" },
                ]}
              />
            </Champ>
            {filtres && (
              <span className="ml-auto pb-2.5 text-xs text-zinc-400">
                {filtres.length} agent(s)
              </span>
            )}
          </div>

          {probleme === "bloquant" && (
            <div className="mb-4">
              <Alerte ton="jaune">
                Ces personnes <strong>ne sont pas encore dans une note</strong>{" "}
                : la raison est écrite en rouge sur chaque ligne. Cliquez sur le
                crayon <strong>« Compléter »</strong> au bout de la ligne pour
                la corriger. Une date de signature manquante se saisit dans{" "}
                <Link href="/lots" className="font-semibold underline">
                  « Lots de textes »
                </Link>
                . Une fois complétée, la personne{" "}
                <strong>entre automatiquement</strong> dans sa note à soumettre au DG
                : inutile de préparer les notes à nouveau.{" "}
                <button
                  type="button"
                  className="font-semibold underline"
                  onClick={() => setProbleme("")}
                >
                  Revoir toutes les lignes
                </button>
              </Alerte>
            </div>
          )}
          {liste.erreur && <Alerte>{liste.erreur}</Alerte>}
          {!filtres ? (
            <Chargement />
          ) : !filtres.length ? (
            <Vide>Aucun agent pour ces critères.</Vide>
          ) : (
            <Tableau>
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Grade</th>
                  <th>Réf. du texte</th>
                  <th>Affectation</th>
                  <th>Contrôles</th>
                  <th className="w-28" />
                </tr>
              </thead>
              <tbody>
                {filtres.map((a) => {
                  const d = a.derive;
                  const deplace =
                    a.agent.departementId &&
                    a.departementId !== a.agent.departementId;
                  return (
                    <tr
                      key={a.id}
                      className={a.statut === "EXCLU" ? "opacity-55" : ""}
                    >
                      <td className="min-w-56">
                        <div className="flex items-center gap-3">
                          <Pastille
                            ton={
                              a.statut === "AFFECTE"
                                ? "vert"
                                : a.statut === "EXCLU"
                                  ? "gris"
                                  : d.bloquants.length
                                    ? "rouge"
                                    : "jaune"
                            }
                            taille="sm"
                          >
                            {a.statut === "AFFECTE" ? (
                              <CheckCircle2 />
                            ) : a.statut === "A_TRAITER" &&
                              d.bloquants.length ? (
                              <TriangleAlert />
                            ) : (
                              <UserRound />
                            )}
                          </Pastille>
                          <div className="min-w-0">
                            <div className="font-medium leading-snug">
                              {a.agent.nomComplet}
                            </div>
                            <div className="text-[11px] text-zinc-400">
                              {a.agent.diplomeBrut ?? "Diplôme inconnu"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap">
                        <div className="font-medium">{d.grade ?? "—"}</div>
                        <div className="text-[11px] tabular-nums text-zinc-400">
                          {d.categorie ?? "—"} / {d.echelle ?? "—"} /{" "}
                          {d.echelon ?? "—"}
                          {d.contractuel &&
                            ` · ${d.age} ans${d.contractuelImpose ? " (arrêté)" : ""}`}
                        </div>
                      </td>
                      <td className="text-xs whitespace-nowrap text-zinc-600">
                        {d.reference ?? (
                          <span className="text-rouge-600">
                            {a.agent.numeroTexte ?? "—"}
                          </span>
                        )}
                      </td>
                      <td className="min-w-48">
                        <div className="font-medium">
                          {a.departement?.nom ?? (
                            <button
                              type="button"
                              disabled={!peut.traiter(profil.role) || a.statut !== "A_TRAITER"}
                              onClick={() => setAction({ type: "resoudre", aff: a, focus: "Département retenu manquant" })}
                              className="text-rouge-600 underline decoration-dotted underline-offset-2 disabled:no-underline"
                            >
                              Département d’affectation à choisir
                            </button>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-400">
                          {libType[a.typeNote] ??
                            "Note à définir (diplôme non reconnu)"}
                          {[a.structure, a.etablissement, a.specialite]
                            .filter(Boolean)
                            .map((x) => ` · ${x}`)}
                        </div>
                        {deplace && (
                          <div className="text-[11px] text-sky-700">
                            Base : {a.agent.departement?.nom}
                          </div>
                        )}
                        {a.origine && (
                          <div className="text-[11px] text-sky-700">
                            Origine : {a.origine}
                          </div>
                        )}
                      </td>
                      <td className="max-w-72 text-[11px] leading-relaxed">
                        <Badge ton={STATUT_AFFECTATION[a.statut].ton}>
                          {STATUT_AFFECTATION[a.statut].libelle}
                        </Badge>
                        {a.statut === "EXCLU" && (
                          <div className="mt-1 text-zinc-500">
                            {a.motifExclusion}
                          </div>
                        )}
                        {a.statut === "A_TRAITER" &&
                          d.bloquants.map((b) => (
                            <button
                              key={b}
                              type="button"
                              disabled={!peut.traiter(profil.role)}
                              onClick={() => setAction({ type: "resoudre", aff: a, focus: b })}
                              title="Cliquer pour régler ce problème"
                              className="mt-1 flex w-full items-start gap-1 rounded-lg px-1 py-0.5 text-left text-rouge-600 transition hover:bg-rouge-100 disabled:pointer-events-none"
                            >
                              <span className="flex-1">{libelleAnomalie(b, { ...a.agent, quotaAutres: !!a.agent.lotPublication?.autres }).titre}</span>
                              <span className="shrink-0 font-semibold underline">Régler</span>
                            </button>
                          ))}
                        {a.statut === "A_TRAITER" &&
                          d.avertissements.map((w) => (
                            <button
                              key={w}
                              type="button"
                              disabled={!peut.traiter(profil.role)}
                              onClick={() => setAction({ type: "resoudre", aff: a, focus: w })}
                              title="Cliquer pour vérifier ce point"
                              className="mt-1 flex w-full items-start gap-1 rounded-lg px-1 py-0.5 text-left text-or-700 transition hover:bg-or-100 disabled:pointer-events-none"
                            >
                              <span className="flex-1">{w}</span>
                              <span className="shrink-0 font-semibold underline">Voir</span>
                            </button>
                          ))}
                      </td>
                      <td className="whitespace-nowrap text-right">
                        {peut.traiter(profil.role) &&
                          a.statut === "A_TRAITER" && (
                            <div className="inline-flex items-center gap-0.5">
                              <BoutonIcone
                                libelle="Détails de la note"
                                onClick={() =>
                                  setAction({ type: "modifier", aff: a })
                                }
                              >
                                <PencilLine />
                              </BoutonIcone>
                              <BoutonIcone
                                libelle={
                                  a.recommandationEnAttente
                                    ? "Recommandation en attente du DG"
                                    : "Proposer une recommandation"
                                }
                                ton="vert"
                                disabled={a.recommandationEnAttente}
                                onClick={() =>
                                  setAction({ type: "recommander", aff: a })
                                }
                              >
                                <Stamp />
                              </BoutonIcone>
                              <BoutonIcone
                                libelle="Retirer de la note"
                                ton="rouge"
                                onClick={() =>
                                  setAction({ type: "exclure", aff: a })
                                }
                              >
                                <Ban />
                              </BoutonIcone>
                            </div>
                          )}
                        {peut.traiter(profil.role) && a.statut === "EXCLU" && (
                          <BoutonIcone
                            libelle="Réintégrer"
                            ton="vert"
                            onClick={() => reintegrer(a)}
                          >
                            <RotateCcw />
                          </BoutonIcone>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Tableau>
          )}
        </Carte>
      </div>

      {action?.type === "modifier" && (
        <Completer
          aff={action.aff}
          fermer={() => setAction(null)}
          apres={() => {
            setAction(null);
            rafraichir();
          }}
        />
      )}
      {action?.type === "recommander" && (
        <Recommander
          aff={action.aff}
          fermer={() => setAction(null)}
          apres={() => {
            setAction(null);
            rafraichir();
            setMessage({
              ton: "vert",
              texte:
                "Recommandation transmise au Directeur général pour validation.",
            });
          }}
        />
      )}
      {action?.type === "resoudre" && (
        <ResoudreProbleme
          aff={action.aff}
          derive={action.aff.derive}
          focus={action.focus}
          fermer={() => setAction(null)}
          anomalies={() => setAction({ type: "anomalies", aff: action.aff })}
          apres={(texte) => {
            setAction(null);
            rafraichir();
            setMessage({ ton: "vert", texte });
          }}
        />
      )}
      {action?.type === "anomalies" && (
        <CorrectionAnomalies
          agent={action.aff.agent}
          fermer={() => setAction(null)}
          apres={(texte) => {
            setAction(null);
            rafraichir();
            setMessage({ ton: "vert", texte });
          }}
        />
      )}
      {action?.type === "exclure" && (
        <Exclure
          aff={action.aff}
          fermer={() => setAction(null)}
          apres={() => {
            setAction(null);
            rafraichir();
          }}
        />
      )}
    </div>
  );
}

function Completer({
  aff,
  fermer,
  apres,
}: {
  aff: Affectation;
  fermer: () => void;
  apres: () => void;
}) {
  const { refs } = useSession();
  const [f, setF] = useState({
    specialite: aff.specialite ?? "",
    structure: aff.structure ?? "",
    etablissement: aff.etablissement ?? "",
    obs: aff.obs ?? "",
  });
  const [erreur, setErreur] = useState<string | null>(null);
  async function ok() {
    try {
      await api.patch(`/affectations/${aff.id}`, f);
      apres();
    } catch (e) {
      setErreur((e as Error).message);
    }
  }
  return (
    <Modale
      titre={`Détails de la note – ${aff.agent.nomComplet}`}
      ouverte
      fermer={fermer}
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-2xl bg-zinc-50 px-4 py-3 text-[13px]">
          <span className="text-zinc-500">Note :</span>
          <strong>{refs.typesNote.find((t) => t.code === aff.typeNote)?.libelle ?? "à définir (diplôme non reconnu)"}</strong>
          <Aide>
            Ces champs remplissent les <strong>colonnes de la note de service</strong> qui ne viennent ni du fichier ni du texte de la FP : spécialité (notes
            DEMA et Décrets), structure (personnel administratif), établissement (note Établissements) et observation. Ils ne règlent pas les problèmes en
            rouge : pour ceux-là, cliquez sur « Régler » dans la liste. Le département ou le type de note se changent par une recommandation validée par le DG.
          </Aide>
        </div>
        {erreur && <Alerte>{erreur}</Alerte>}
        <Champ
          libelle="Spécialité"
          aide="Pour les notes DEMA et décrets (ex. Musique, Arts plastiques, Français…)"
        >
          <Saisie
            value={f.specialite}
            onChange={(e) => setF({ ...f, specialite: e.target.value })}
          />
        </Champ>
        <Champ
          libelle="Structure (personnel administratif)"
          aide="Par défaut : DDEPPSA du département"
        >
          <Saisie
            value={f.structure}
            onChange={(e) => setF({ ...f, structure: e.target.value })}
          />
        </Champ>
        <Champ
          libelle="Établissement d’affectation"
          aide="L’école ou le lycée où la personne est envoyée. Sans établissement, elle est à la disposition de la DDEPPSA, qui l’affecte selon les besoins. Dans la note, les personnes sont rangées par département puis par établissement."
        >
          <ChoixEtablissement
            departementId={aff.departementId}
            valeur={f.etablissement}
            changer={(v) => setF({ ...f, etablissement: v })}
          />
        </Champ>
        <Champ
          libelle="Observation (colonne Obs)"
          aide="Ex. Ens. actif / Ens. active"
        >
          <Saisie
            value={f.obs}
            onChange={(e) => setF({ ...f, obs: e.target.value })}
          />
        </Champ>
        <p className="text-xs text-zinc-500">
          Un changement de département ou de note passe par une recommandation
          validée par le DG.
        </p>
        <div className="flex justify-end gap-2">
          <Bouton onClick={fermer}>Annuler</Bouton>
          <Bouton variante="principal" onClick={ok}>
            Enregistrer
          </Bouton>
        </div>
      </div>
    </Modale>
  );
}

function Recommander({
  aff,
  fermer,
  apres,
}: {
  aff: Affectation;
  fermer: () => void;
  apres: () => void;
}) {
  const { refs } = useSession();
  const [f, setF] = useState({
    typeNote: "",
    departementId: "",
    structure: "",
    etablissement: "",
    origine: "",
    motif: "",
  });
  const [erreur, setErreur] = useState<string | null>(null);
  async function ok() {
    try {
      await api.post(`/affectations/${aff.id}/recommandations`, {
        typeNote: f.typeNote || null,
        departementId: f.departementId ? Number(f.departementId) : null,
        structure: f.structure || null,
        etablissement: f.etablissement || null,
        origine: f.origine,
        motif: f.motif || null,
      });
      apres();
    } catch (e) {
      setErreur((e as Error).message);
    }
  }
  return (
    <Modale
      titre={`Recommandation – ${aff.agent.nomComplet}`}
      ouverte
      fermer={fermer}
    >
      <div className="space-y-3">
        {erreur && <Alerte>{erreur}</Alerte>}
        <p className="text-sm text-zinc-600">
          Actuellement :{" "}
          <strong>
            {refs.typesNote.find((t) => t.code === aff.typeNote)?.libelle}
          </strong>{" "}
          – {aff.departement?.nom ?? "sans département"}. La modification ne
          s’applique qu’après validation du Directeur général.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Champ libelle="Nouveau département">
            <Liste
              value={f.departementId}
              onChange={(e) => setF({ ...f, departementId: e.target.value })}
              vide="Inchangé"
              options={refs.departements.map((d) => ({
                valeur: d.id,
                libelle: d.nom,
              }))}
            />
          </Champ>
          <Champ libelle="Nouvelle note">
            <Liste
              value={f.typeNote}
              onChange={(e) => setF({ ...f, typeNote: e.target.value })}
              vide="Inchangée"
              options={refs.typesNote.map((t) => ({
                valeur: t.code,
                libelle: t.libelle,
              }))}
            />
          </Champ>
          {f.typeNote === "PERS_ADM" && (
            <Champ libelle="Structure administrative" className="col-span-2">
              <Saisie
                value={f.structure}
                onChange={(e) => setF({ ...f, structure: e.target.value })}
                placeholder="Ex. DGEB, DDEPPSA Brazzaville…"
              />
            </Champ>
          )}
          <Champ libelle="Établissement" className="col-span-2">
            <ChoixEtablissement
              departementId={f.departementId ? Number(f.departementId) : aff.departementId}
              valeur={f.etablissement}
              changer={(v) => setF({ ...f, etablissement: v })}
            />
          </Champ>
        </div>
        <Champ
          libelle="Origine de la recommandation *"
          aide="Qui a proposé ce déplacement (ex. S/C Conseiller X, DDEPPSA Likouala…)"
        >
          <Saisie
            value={f.origine}
            onChange={(e) => setF({ ...f, origine: e.target.value })}
          />
        </Champ>
        <Champ libelle="Motif">
          <Zone
            value={f.motif}
            onChange={(e) => setF({ ...f, motif: e.target.value })}
          />
        </Champ>
        <div className="flex justify-end gap-2">
          <Bouton onClick={fermer}>Annuler</Bouton>
          <Bouton variante="principal" onClick={ok}>
            Soumettre au DG
          </Bouton>
        </div>
      </div>
    </Modale>
  );
}

function Exclure({
  aff,
  fermer,
  apres,
}: {
  aff: Affectation;
  fermer: () => void;
  apres: () => void;
}) {
  const [motif, setMotif] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  async function ok() {
    try {
      await api.post(`/affectations/${aff.id}/exclure`, { motif });
      apres();
    } catch (e) {
      setErreur((e as Error).message);
    }
  }
  return (
    <Modale
      titre={`Retirer de la note – ${aff.agent.nomComplet}`}
      ouverte
      fermer={fermer}
    >
      <div className="space-y-3">
        {erreur && <Alerte>{erreur}</Alerte>}
        <Champ
          libelle="Motif *"
          aide="Ex. Déjà affecté (note CBD), absent du projet de note, doublon…"
        >
          <Saisie
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            list="motifs-exclusion"
          />
          <datalist id="motifs-exclusion">
            <option value="Déjà affecté (note CBD)" />
            <option value="Déjà affecté dans un lot précédent" />
            <option value="Absent du projet de note" />
            <option value="Doublon" />
            <option value="Maintien au poste" />
          </datalist>
        </Champ>
        <div className="flex justify-end gap-2">
          <Bouton onClick={fermer}>Annuler</Bouton>
          <Bouton variante="danger" disabled={!motif.trim()} onClick={ok}>
            Retirer de la note
          </Bouton>
        </div>
      </div>
    </Modale>
  );
}

/** Badge rouge « N à compléter » : un clic affiche ces personnes dans la liste. */
function BadgeACompleter({ n, voir }: { n: number; voir: () => void }) {
  return (
    <span
      role="button"
      tabIndex={0}
      title="Voir et compléter ces personnes"
      onClick={(e) => {
        e.stopPropagation();
        voir();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          voir();
        }
      }}
      className="cursor-pointer rounded-full transition hover:ring-2 hover:ring-rouge-600/40"
    >
      <Badge ton="rouge">{n} à compléter →</Badge>
    </span>
  );
}
