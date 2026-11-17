"use client";

import { ArrowRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import { Alerte, Badge, Bouton, Carte, Modale, Saisie, Segments, Tableau, Vide } from "@/components/ui";
import { qs, useApi } from "@/lib/api";
import type { Ton } from "@/lib/libelles";

/*
 * Les listes du suivi de l'intégration (DG, 17/11/2026) : chaque carte s'ouvre sur la liste des
 * personnes qu'elle compte ; un clic sur un nom ouvre sa fiche. Lecture seule : le traitement se
 * fait dans la base du personnel.
 */

const nf = new Intl.NumberFormat("fr-FR");

const TONS: Record<Ton, { fond: string; texte: string; anneau: string }> = {
  vert: { fond: "bg-white", texte: "text-encre", anneau: "hover:ring-marque-300" },
  bleu: { fond: "bg-white", texte: "text-encre", anneau: "hover:ring-sky-300" },
  jaune: { fond: "bg-or-100", texte: "text-or-700", anneau: "hover:ring-or-400" },
  rouge: { fond: "bg-rouge-100", texte: "text-rouge-600", anneau: "hover:ring-rouge-600" },
  gris: { fond: "bg-white", texte: "text-encre", anneau: "hover:ring-zinc-300" },
};

/** Une carte chiffrée qui ouvre la liste des personnes qu'elle compte. */
export function CarteListe({
  libelle,
  valeur,
  detail,
  aide,
  ton = "gris",
  active,
  ouvrir,
}: {
  libelle: ReactNode;
  valeur: number;
  detail?: ReactNode;
  aide?: ReactNode;
  ton?: Ton;
  active?: boolean;
  ouvrir: () => void;
}) {
  const t = TONS[ton];
  return (
    <button
      type="button"
      onClick={ouvrir}
      className={`group flex h-full w-full flex-col rounded-3xl p-5 text-left shadow-doux ring-2 transition ${t.fond} ${active ? "ring-marque-500" : "ring-transparent"} ${t.anneau} hover:-translate-y-0.5`}
      title="Voir la liste"
    >
      <div className={`text-xs ${ton === "jaune" ? "text-or-700" : "text-zinc-500"}`}>
        {libelle} {aide}
      </div>
      <div className={`mt-0.5 text-2xl font-semibold tabular-nums ${t.texte}`}>{nf.format(valeur)}</div>
      {detail && <div className={`mt-1 text-[12px] ${ton === "jaune" ? "text-or-700" : "text-zinc-500"}`}>{detail}</div>}
      <div className="mt-auto flex items-center gap-1 pt-2 text-[11px] font-medium text-marque-700 opacity-60 transition group-hover:opacity-100">
        Voir la liste <ArrowRight className="size-3 transition group-hover:translate-x-0.5" />
      </div>
    </button>
  );
}

interface LignePersonnel {
  id: number;
  nom: string;
  statut: string;
  naissance: string | null;
  matricule: string | null;
  lieu: string | null;
  departement: string | null;
  grade: string | null;
}

const statutLisible = (s: string) =>
  s === "CONTRACTUEL" ? "Contractuel" : s === "FONCTIONNAIRE" ? "Fonctionnaire" : s === "VOLONTAIRE" ? "Volontaire" : s === "COMMUNAUTAIRE" ? "Communautaire" : s;

/** Toute la base du personnel, carte par carte : liste en lecture seule, fiche au clic. */
export function ListePersonnelSuivi({ groupe, changerGroupe, departementId }: { groupe: string; changerGroupe: (g: string) => void; departementId?: string }) {
  const [recherche, setRecherche] = useState("");
  const [page, setPage] = useState(1);
  const [fiche, setFiche] = useState<number | null>(null);
  const d = useApi<{ groupe: string; libelle: string; groupes: Record<string, string>; total: number; lignes: LignePersonnel[] }>(
    `/enrolement/suivi-integration/personnel${qs({ groupe, departementId: departementId || undefined, recherche: recherche.trim() || undefined, page })}`,
  );
  const pages = d.donnees ? Math.max(1, Math.ceil(d.donnees.total / 50)) : 1;
  return (
    <Carte
      titre={d.donnees ? `${d.donnees.libelle} (${nf.format(d.donnees.total)})` : "Base du personnel"}
      actions={<Saisie className="w-64" value={recherche} onChange={(e) => { setRecherche(e.target.value); setPage(1); }} placeholder="Nom ou matricule…" />}
    >
      <p className="mb-3 text-[13px] text-zinc-600">
        Les fonctionnaires et contractuels de la base du personnel. Cliquez sur un nom pour voir sa fiche. Ici on lit seulement : les corrections se font dans{" "}
        <Link href="/personnel" className="font-medium text-marque-700 hover:underline">
          Personnel
        </Link>
        .
      </p>
      {d.donnees && (
        <div className="mb-3">
          <Segments
            valeur={groupe}
            changer={(g) => { changerGroupe(g); setPage(1); }}
            options={Object.entries(d.donnees.groupes).map(([valeur, libelle]) => ({ valeur, libelle }))}
          />
        </div>
      )}
      {d.erreur && <Alerte>{d.erreur}</Alerte>}
      {!d.donnees || d.chargement ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="h-9 animate-pulse rounded-lg bg-zinc-200" />
          ))}
        </div>
      ) : !d.donnees.lignes.length ? (
        <Vide>Personne pour ce choix.</Vide>
      ) : (
        <Tableau>
          <thead>
            <tr>
              <th>Nom et prénoms</th>
              <th>Statut · grade</th>
              <th>Matricule solde</th>
              <th>Structure (où il travaille)</th>
              <th>Département</th>
            </tr>
          </thead>
          <tbody>
            {d.donnees.lignes.map((l) => (
              <tr key={l.id} className="cursor-pointer hover:bg-zinc-50" onClick={() => setFiche(l.id)}>
                <td>
                  <button type="button" className="text-left font-medium text-marque-700 hover:underline">
                    {l.nom}
                  </button>
                  {l.naissance && <div className="text-[11px] text-zinc-500">né(e) le {l.naissance}</div>}
                </td>
                <td className="text-[12px] text-zinc-600">
                  {statutLisible(l.statut)}
                  {l.grade && <> · {l.grade}</>}
                </td>
                <td className="text-[12px] tabular-nums">{l.matricule ?? <span className="text-or-700">en attente</span>}</td>
                <td className="text-[12px]">{l.lieu ?? <span className="text-or-700">à compléter</span>}</td>
                <td className="text-[12px] text-zinc-600">{l.departement ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </Tableau>
      )}
      {pages > 1 && (
        <div className="mt-3 flex items-center justify-between text-[13px]">
          <Bouton variante="discret" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            ← Précédent
          </Bouton>
          <span className="text-zinc-500">
            Page {page} sur {nf.format(pages)}
          </span>
          <Bouton variante="discret" disabled={page >= pages} onClick={() => setPage(page + 1)}>
            Suivant →
          </Bouton>
        </div>
      )}
      {fiche !== null && <ModaleFichePersonnel id={fiche} fermer={() => setFiche(null)} />}
    </Carte>
  );
}

interface FichePersonnel {
  id: number;
  numeroFiche: string | null;
  nom: string;
  statut: string;
  sexe: string | null;
  naissance: string | null;
  matricule: string | null;
  telephone: string | null;
  departement: string | null;
  lieu: string | null;
  grade: string | null;
  categorie: string | null;
  echelle: string | null;
  echelon: string | null;
  indice: string | null;
  position: string | null;
  fonction: string | null;
  dateRecrutement: string | null;
  texteRecrutement: string | null;
  noteAffectation: string | null;
  registre: { population: string; statut: string; motif: string | null; etablissement: string | null } | null;
}

/** Une ligne « libellé : valeur » d'une fiche ; vide : un tiret discret. */
function Info({ libelle, children, attention }: { libelle: string; children: ReactNode; attention?: string }) {
  return (
    <div className="rounded-xl bg-zinc-50 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-zinc-500">{libelle}</div>
      <div className="mt-0.5 text-[13px] font-medium text-encre">{children || (attention ? <span className="text-or-700">{attention}</span> : <span className="font-normal text-zinc-400">—</span>)}</div>
    </div>
  );
}

/** La fiche d'un agent, en lecture seule, avec le lien vers la base du personnel. */
export function ModaleFichePersonnel({ id, fermer }: { id: number; fermer: () => void }) {
  const d = useApi<FichePersonnel>(`/enrolement/suivi-integration/personnel/${id}`);
  const f = d.donnees;
  return (
    <Modale titre={f ? f.nom : "Fiche du personnel"} ouverte fermer={fermer} large>
      {d.erreur && <Alerte>{d.erreur}</Alerte>}
      {!f ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-zinc-200" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge ton={f.statut === "FONCTIONNAIRE" ? "vert" : "bleu"}>{statutLisible(f.statut)}</Badge>
            {f.matricule ? <Badge ton="vert">Payé · matricule {f.matricule}</Badge> : <Badge ton="jaune">En attente de matricule solde</Badge>}
            {f.numeroFiche && <span className="text-[12px] text-zinc-500">Fiche n° {f.numeroFiche}</span>}
          </div>
          <div>
            <h3 className="mb-2 text-[13px] font-semibold text-encre">Identité</h3>
            <div className="grid gap-2 sm:grid-cols-3">
              <Info libelle="Date de naissance">{f.naissance}</Info>
              <Info libelle="Sexe">{f.sexe === "M" ? "Masculin" : f.sexe === "F" ? "Féminin" : f.sexe}</Info>
              <Info libelle="Téléphone">{f.telephone}</Info>
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-[13px] font-semibold text-encre">Où il travaille</h3>
            <div className="grid gap-2 sm:grid-cols-3">
              <Info libelle="Structure" attention="à compléter">{f.lieu}</Info>
              <Info libelle="Département">{f.departement}</Info>
              <Info libelle="Fonction">{f.fonction}</Info>
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-[13px] font-semibold text-encre">Carrière et salaire</h3>
            <div className="grid gap-2 sm:grid-cols-3">
              <Info libelle="Grade">{f.grade}</Info>
              <Info libelle="Catégorie · échelle · échelon">{[f.categorie, f.echelle, f.echelon].filter(Boolean).join(" · ")}</Info>
              <Info libelle="Position">{f.position}</Info>
              <Info libelle="Matricule solde" attention="en attente">{f.matricule}</Info>
              <Info libelle="Indice">{f.indice}</Info>
              <Info libelle="Date de recrutement">{f.dateRecrutement && /^\d{4}-\d{2}-\d{2}/.test(f.dateRecrutement) ? f.dateRecrutement.slice(0, 10).split("-").reverse().join("/") : f.dateRecrutement}</Info>
              <Info libelle="Texte de recrutement">{f.texteRecrutement}</Info>
              <Info libelle="Note d’affectation">{f.noteAffectation}</Info>
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-[13px] font-semibold text-encre">Passage par la bourse</h3>
            {f.registre ? (
              <div className="grid gap-2 sm:grid-cols-3">
                <Info libelle="Liste">{statutLisible(f.registre.population)}</Info>
                <Info libelle="Dans le registre">{f.registre.statut === "SORTI" ? `Sorti${f.registre.motif ? ` : ${f.registre.motif}` : ""}` : "En poste (payé en bourse)"}</Info>
                <Info libelle="École (registre)">{f.registre.etablissement}</Info>
              </div>
            ) : (
              <p className="text-[13px] text-zinc-500">Pas relié au registre de la bourse.</p>
            )}
          </div>
          <div className="flex justify-end border-t border-zinc-100 pt-3">
            <Link href={`/personnel/agents/${f.id}`} className="inline-flex items-center gap-1.5 rounded-full bg-marque-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-marque-700">
              Ouvrir dans la base du personnel <ExternalLink className="size-3.5" />
            </Link>
          </div>
        </div>
      )}
    </Modale>
  );
}

export interface LigneParcours {
  id: string;
  nom: string;
  naissance?: string | null;
  population: "VOLONTAIRE" | "COMMUNAUTAIRE";
  registre: "EN_POSTE" | "SORTI" | "ABSENT";
  motifSortie: string | null;
  dernierMoisBourse: string | null;
  vague: number | null;
  departement: string;
  cycle: string;
  texte: { nature: string; numero: string; date: string | null; source: string } | null;
  note: { numero: string | null; date: string | null; lieu: string | null; departement?: string | null; source: string } | null;
  salaire: { statut: string | null; matricule: string | null; indice: string | null; premierMois: string | null } | null;
  piste: string | null;
  situation: string;
  aRegler: string[];
}

/** Le parcours d'une personne du registre, étape par étape (lecture seule). */
export function ModaleParcours({ l, situation, ton, fermer }: { l: LigneParcours; situation: string; ton: Ton; fermer: () => void }) {
  const etapes: { titre: string; fait: boolean; contenu: ReactNode }[] = [
    {
      titre: "Payé en bourse",
      fait: l.registre !== "ABSENT",
      contenu:
        l.registre === "EN_POSTE" ? "En poste : payé chaque mois en bourse." : l.registre === "SORTI" ? `Sorti de la bourse${l.motifSortie ? ` : ${l.motifSortie}` : ""}${l.dernierMoisBourse ? ` (dernier mois : ${l.dernierMoisBourse})` : ""}.` : "Absent du registre de la bourse.",
    },
    {
      titre: "Recruté (texte d’intégration)",
      fait: !!l.texte || !!l.salaire,
      contenu: l.texte ? `${l.texte.nature} n° ${l.texte.numero}${l.texte.date ? ` du ${l.texte.date}` : ""}` : l.salaire ? `${statutLisible(l.salaire.statut ?? "")} dans la base du personnel (texte non retrouvé)` : "Pas encore recruté.",
    },
    {
      titre: "Affecté (où il travaille)",
      fait: !!l.note,
      contenu: l.note ? `${l.note.lieu ?? "structure à compléter"}${l.note.departement ? ` · ${l.note.departement}` : ""}${l.note.numero ? ` — note n° ${l.note.numero}${l.note.date ? ` du ${l.note.date}` : ""}` : ""}` : "Pas encore affecté.",
    },
    {
      titre: "Payé (matricule solde)",
      fait: !!l.salaire?.matricule,
      contenu: l.salaire?.matricule ? `Matricule ${l.salaire.matricule}${l.salaire.premierMois ? `, payé depuis ${l.salaire.premierMois}` : ""}` : l.salaire ? "En attente de matricule solde." : l.piste ? `À vérifier : ${l.piste}` : "—",
    },
  ];
  return (
    <Modale titre={l.nom} ouverte fermer={fermer} large>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <Badge ton={ton}>{situation}</Badge>
          <span className="text-zinc-500">
            {l.population === "COMMUNAUTAIRE" ? "Communautaire" : `Volontaire${l.vague ? ` · ${l.vague}e vague` : ""}`} · {l.departement} · {l.cycle}
            {l.naissance ? ` · né(e) le ${l.naissance}` : ""}
          </span>
        </div>
        <ol className="space-y-2">
          {etapes.map((e, i) => (
            <li key={e.titre} className={`flex gap-3 rounded-2xl border p-3 ${e.fait ? "border-marque-200 bg-marque-50" : "border-zinc-200 bg-white"}`}>
              <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${e.fait ? "bg-marque-600 text-white" : "bg-zinc-200 text-zinc-500"}`}>{i + 1}</span>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-encre">{e.titre}</div>
                <div className="text-[13px] text-zinc-600">{e.contenu}</div>
              </div>
            </li>
          ))}
        </ol>
        {l.aRegler.length > 0 && (
          <div className="rounded-2xl bg-rouge-100 p-3 text-[13px] text-rouge-600">
            <strong>À régler :</strong> {l.aRegler.join(" · ")}
          </div>
        )}
        <p className="text-[12px] text-zinc-500">Lecture seule : les corrections se font dans la base du personnel ou dans le registre de la bourse.</p>
      </div>
    </Modale>
  );
}
