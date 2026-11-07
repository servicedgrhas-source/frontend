"use client";

import { Check, Combine, FilePlus2, FileText, Hand, Hash, Pencil, Plus, Replace, Scissors, Tags, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useSession } from "./session";
import { Aide, Alerte, Badge, Bouton, Champ, Chargement, Liste, Modale, Saisie, Zone } from "./ui";
import { api, useApi } from "@/lib/api";
import { peut } from "@/lib/libelles";
import type { NoteDetail, NoteResume, Rectification } from "@/lib/types";

/**
 * Notes d'enrôlement (cadrage du 05/11/2026) : colonnes du tableau au choix pour chaque note, ADDITIF
 * à une note signée (noms oubliés), RECTIFICATIF d'une note signée (« au lieu de … lire … »).
 */

const COLONNES: { cle: string; libelle: string }[] = [
  { cle: "naissance", libelle: "Date de naissance" },
  { cle: "lieu", libelle: "Lieu de naissance" },
  { cle: "promotion", libelle: "Promotion" },
  { cle: "specialite", libelle: "Spécialité" },
  { cle: "diplome", libelle: "Diplôme (BET, CFEEN, CAPES…)" },
  { cle: "etablissement", libelle: "Établissement" },
];

/** Colonnes possibles d'une note de mutation ; « Durée » et « Justification » sont mises par défaut (DG, 06/11/2026). */
const COLONNES_MUTATION: { cle: string; libelle: string; permutation?: boolean }[] = [
  { cle: "ge", libelle: "G/E (grade et échelon)" },
  { cle: "matricule", libelle: "Matricule solde" },
  { cle: "cycle", libelle: "Cycle" },
  { cle: "specialite", libelle: "Spécialité" },
  { cle: "ancienPoste", libelle: "Ancien poste (lieu de service)" },
  { cle: "origine", libelle: "Département d’origine" },
  { cle: "accueil", libelle: "Département d’accueil", permutation: true },
  { cle: "lieuSollicite", libelle: "Lieu sollicité" },
  { cle: "duree", libelle: "Durée dans le poste (ancienneté)" },
  { cle: "justification", libelle: "Justification (pièce, raison, acte de mariage, permutant)" },
  { cle: "obs", libelle: "Obs (ens. actif, pers. adm., finaliste)" },
];

type Signaler = (ton: "vert" | "rouge", texte: string) => void;

/** Boutons de la barre de la note d'enrôlement. */
export function BoutonsEnrolement({ note, recharger, signaler }: { note: NoteDetail; recharger: () => void; signaler: Signaler }) {
  const { profil } = useSession();
  const router = useRouter();
  const [fenetre, setFenetre] = useState<"colonnes" | "additif" | "textes" | "decouper" | "regrouper" | null>(null);
  if ((note.module !== "ENROLEMENT" && note.module !== "MUTATION") || !peut.traiter(profil.role)) return null;
  const s = note.statut;
  const enrolement = note.module === "ENROLEMENT";

  async function rectifier() {
    try {
      const r = await api.post<{ id: string }>(`/notes/${note.id}/rectificatif`);
      router.push(`/note/${r.id}`);
    } catch (e) {
      signaler("rouge", (e as Error).message);
    }
  }

  return (
    <>
      {s === "BROUILLON" && peut.decider(profil.role) && (
        <Bouton onClick={() => setFenetre("textes")}>
          <FileText className="size-4" aria-hidden />
          Introduction et conclusion
          <Aide>
            {enrolement
              ? "Réécrire le texte d’introduction (« Les enseignants finalistes… ») et le texte de fin (bourse, « prend effet… ») de cette note. Réservé au DG."
              : "Réécrire le texte d’introduction (« Les agents … sont mutés … ») et le texte de fin (frais de voyage, « prend effet… ») de cette note. Réservé au DG."}
          </Aide>
        </Bouton>
      )}
      {s === "BROUILLON" && !note.rectificatifDe && note.contenu.total > 1 && (
        <Bouton onClick={() => setFenetre("decouper")}>
          <Scissors className="size-4" aria-hidden />
          Découper en plusieurs notes
          <Aide>Une note trop longue ? Partagez-la en plusieurs notes plus petites (lots) : par nombre de personnes, ou en cochant les personnes.</Aide>
        </Bouton>
      )}
      {s === "BROUILLON" && note.lotRangement != null && (
        <Bouton onClick={() => setFenetre("regrouper")}>
          <Combine className="size-4" aria-hidden />
          Remettre dans la note principale
          <Aide>Défait le découpage : les personnes de ce lot (et des autres lots à soumettre) reviennent dans la note principale.</Aide>
        </Bouton>
      )}
      {s !== "SIGNEE" && !note.rectificatifDe && (
        <Bouton onClick={() => setFenetre("colonnes")}>
          Colonnes
          <Aide>
            {enrolement
              ? "Choisissez les colonnes du tableau pour cette note : par exemple enlever « Spécialité » et mettre « Diplôme ». « Promotion » est mise partout."
              : "Choisissez les colonnes du tableau : la durée dans le poste et la justification sont là pour décider ; on peut les enlever avant la signature. Si le tableau est trop large, la note passe en paysage."}
          </Aide>
        </Bouton>
      )}
      {s === "BROUILLON" && !note.rectificatifDe && (
        <Bouton onClick={() => setFenetre("additif")}>
          {note.additifDe ? "Additif : changer" : "Faire un additif"}
          <Aide>
            {enrolement ? "Des noms oubliés, la même année, après une note déjà signée" : "D’autres mutations accordées pour le même motif, après une note déjà signée"} :
            cette note devient un <strong>ADDITIF</strong> « à la note de service n° … du … », sans refaire la note signée.
          </Aide>
        </Bouton>
      )}
      {s === "SIGNEE" && !note.rectificatifDe && (
        <Bouton onClick={rectifier}>
          <FilePlus2 className="size-4" aria-hidden />
          Faire un rectificatif
          <Aide>
            Corriger cette note signée : un nom mal écrit, un autre département, ou une personne qui ne part pas et qu’on remplace. Le RECTIFICATIF dit « au
            lieu de … lire … » ; le reste demeure sans changement.
          </Aide>
        </Bouton>
      )}
      {fenetre === "colonnes" && <FenetreColonnes note={note} fermer={() => setFenetre(null)} apres={() => { setFenetre(null); recharger(); signaler("vert", "Colonnes enregistrées."); }} signaler={signaler} />}
      {fenetre === "textes" && <FenetreTextes note={note} fermer={() => setFenetre(null)} apres={(t) => { setFenetre(null); recharger(); signaler("vert", t); }} signaler={signaler} />}
      {fenetre === "decouper" && <FenetreDecouper note={note} fermer={() => setFenetre(null)} apres={(t) => { setFenetre(null); recharger(); signaler("vert", t); }} signaler={signaler} />}
      {fenetre === "regrouper" && (
        <Modale titre="Remettre dans la note principale ?" ouverte fermer={() => setFenetre(null)}>
          <p className="text-[13px] leading-relaxed text-zinc-600">
            Les personnes de ce lot, et des autres lots encore « à soumettre au DG », reviennent dans la note principale de ce type. Les notes des lots sont retirées. Les
            lots déjà soumis ou validés ne bougent pas.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Bouton onClick={() => setFenetre(null)}>Annuler</Bouton>
            <Bouton
              variante="principal"
              onClick={async () => {
                try {
                  const r = await api.post<{ id: string; lots: number }>(`/notes/${note.id}/lots/regrouper`);
                  setFenetre(null);
                  signaler("vert", `${r.lots} lot(s) remis dans la note principale.`);
                  router.push(`/note/${r.id}`);
                } catch (e) {
                  signaler("rouge", (e as Error).message);
                }
              }}
            >
              Remettre ensemble
            </Bouton>
          </div>
        </Modale>
      )}
      {fenetre === "additif" && <FenetreAdditif note={note} fermer={() => setFenetre(null)} apres={(t) => { setFenetre(null); recharger(); signaler("vert", t); }} signaler={signaler} />}
    </>
  );
}

function FenetreColonnes({ note, fermer, apres, signaler }: { note: NoteDetail; fermer: () => void; apres: () => void; signaler: Signaler }) {
  const mutation = note.module === "MUTATION";
  const liste = mutation ? COLONNES_MUTATION.filter((c) => !c.permutation || note.motif === "PERMUTATION") : COLONNES;
  const actuelles = note.contenu.colonnes.map((c) => c.cle).filter((c) => c !== "nom");
  const [choix, setChoix] = useState<string[]>(actuelles);
  const basculer = (cle: string) => setChoix((x) => (x.includes(cle) ? x.filter((y) => y !== cle) : liste.map((c) => c.cle).filter((c) => c === cle || x.includes(c))));
  async function enregistrer(colonnes: string[] | null) {
    try {
      await api.put(`/notes/${note.id}/colonnes`, { colonnes });
      apres();
    } catch (e) {
      signaler("rouge", (e as Error).message);
    }
  }
  return (
    <Modale titre="Colonnes du tableau" ouverte fermer={fermer}>
      <p className="mb-3 text-[13px] text-zinc-600">« N° » et « Noms et prénoms » sont toujours là. Cochez les autres colonnes de cette note.</p>
      <div className="space-y-1.5">
        {liste.map((c) => (
          <label key={c.cle} className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm ring-1 transition ${choix.includes(c.cle) ? "bg-marque-50 ring-marque-300" : "ring-zinc-200 hover:ring-zinc-300"}`}>
            <input type="checkbox" className="size-4 accent-marque-600" checked={choix.includes(c.cle)} onChange={() => basculer(c.cle)} />
            {c.libelle}
          </label>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Bouton variante="discret" onClick={() => enregistrer(null)}>
          {mutation ? "Colonnes par défaut" : "Colonnes du type de note"}
        </Bouton>
        <Bouton onClick={fermer}>Annuler</Bouton>
        <Bouton variante="principal" disabled={!choix.length} onClick={() => enregistrer(choix)}>
          Enregistrer
        </Bouton>
      </div>
    </Modale>
  );
}

function FenetreAdditif({ note, fermer, apres, signaler }: { note: NoteDetail; fermer: () => void; apres: (texte: string) => void; signaler: Signaler }) {
  const notes = useApi<NoteResume[]>(`/notes?module=${note.module}`);
  // Les notes du même diplôme d'abord : un additif complète la note de son diplôme (06/11/2026)
  const memeType = (n: NoteResume) => [n.typeNote, ...(n.groupes ?? [])].includes(note.typeNote);
  const signees = (notes.donnees ?? [])
    .filter((n) => n.statut === "SIGNEE" && n.id !== note.id && (note.module === "MUTATION" ? n.motif === note.motif : n.campagneId === note.campagneId) && !n.rectificatifDe)
    .sort((a, b) => Number(memeType(b)) - Number(memeType(a)));
  const [de, setDe] = useState<string>(note.additifDe ?? "");
  async function enregistrer(valeur: string | null) {
    try {
      await api.put(`/notes/${note.id}/additif`, { de: valeur });
      apres(valeur ? "La note est maintenant un ADDITIF à la note signée choisie." : "La note redevient une note de service.");
    } catch (e) {
      signaler("rouge", (e as Error).message);
    }
  }
  return (
    <Modale titre="Faire un additif" ouverte fermer={fermer}>
      <p className="mb-3 text-[13px] leading-relaxed text-zinc-600">
        Les personnes de cette note complètent une note déjà signée. Le titre devient <strong>ADDITIF</strong> et l’introduction « À la note de service n° … du
        …, {note.module === "MUTATION" ? "relative à la mutation des agents … (le motif), au titre de l’année scolaire …" : "relative à l’affectation des enseignants finalistes, titulaires du …"} ».
      </p>
      {notes.chargement && <Chargement />}
      {!notes.chargement && !signees.length && (
        <Alerte ton="jaune">
          {note.module === "MUTATION"
            ? "Aucune note de mutation signée (numéro et date enregistrés) pour ce motif."
            : "Aucune note d’enrôlement signée (numéro et date enregistrés) dans cette campagne."}
        </Alerte>
      )}
      <div className="max-h-72 space-y-1.5 overflow-y-auto">
        {signees.map((n) => (
          <label key={n.id} className={`flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2 text-[13px] ring-1 ${de === n.id ? "bg-marque-50 ring-marque-300" : "ring-zinc-200 hover:ring-zinc-300"}`}>
            <input type="radio" name="additif" className="mt-0.5 size-4 accent-marque-600" checked={de === n.id} onChange={() => setDe(n.id)} />
            <span>
              <span className="font-medium text-encre">{n.libelle}</span>
              <span className="block text-[12px] text-zinc-500">
                N° {n.numero} du {n.dateSignature?.split("-").reverse().join("/")} · {n.total} personne(s)
              </span>
              {!memeType(n) && <span className="mt-0.5 block text-[11px] font-medium text-amber-700">Autre diplôme que cette note : l’introduction de l’additif citerait le mauvais diplôme.</span>}
            </span>
          </label>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        {note.additifDe && (
          <Bouton variante="discret" onClick={() => enregistrer(null)}>
            Redevenir une note de service
          </Bouton>
        )}
        <Bouton onClick={fermer}>Annuler</Bouton>
        <Bouton variante="principal" disabled={!de} onClick={() => enregistrer(de)}>
          Enregistrer
        </Bouton>
      </div>
    </Modale>
  );
}

/* ------------------------------- Rectificatif ------------------------------- */

interface Personne {
  id: string;
  nom: string;
  /** Mutation */
  matricule?: string | null;
  ge?: string | null;
  cycle?: string | null;
  ancienPoste?: string | null;
  lieuSollicite?: string | null;
  naissance?: string | null;
  lieu?: string | null;
  promotion?: string | null;
  specialite: string | null;
  diplome?: string | null;
  departementId: number | null;
  n?: number;
  departement?: string;
}

const lireDe = (p: Personne, enroleId: string | null): Rectification["lire"] => ({
  enroleId,
  nom: p.nom,
  naissance: p.naissance ?? null,
  lieu: p.lieu ?? null,
  promotion: p.promotion ?? null,
  specialite: p.specialite,
  diplome: p.diplome ?? null,
  departementId: p.departementId,
  matricule: p.matricule ?? null,
  ge: p.ge ?? null,
  cycle: p.cycle ?? null,
  ancienPoste: p.ancienPoste ?? null,
  lieuSollicite: p.lieuSollicite ?? null,
});

/** Corrections d'un rectificatif : une ligne par personne de la note signée. */
export function CorrectionsRectificatif({ note, recharger, signaler }: { note: NoteDetail; recharger: () => void; signaler: Signaler }) {
  const { profil, refs } = useSession();
  const choix = useApi<{ note: { id: string; numero: string | null; libelle: string }; personnes: Personne[]; remplacants: Personne[] }>(
    note.rectificatifDe ? `/notes/${note.id}/rectificatif/choix` : null,
  );
  const [edition, setEdition] = useState<Rectification | "nouvelle" | null>(null);
  if (!note.rectificatifDe) return null;
  const modifiable = note.statut === "BROUILLON" && peut.traiter(profil.role);
  const liste = note.rectifications ?? [];
  const parId = new Map((choix.donnees?.personnes ?? []).map((p) => [p.id, p]));
  const dep = (id: number | null) => refs.departements.find((d) => d.id === id)?.nom ?? "—";

  async function enregistrer(nouvelle: Rectification[]) {
    try {
      await api.put(`/notes/${note.id}/rectifications`, { rectifications: nouvelle });
      setEdition(null);
      recharger();
      choix.recharger();
      signaler("vert", "Rectificatif enregistré.");
    } catch (e) {
      signaler("rouge", (e as Error).message);
    }
  }

  return (
    <div className="rounded-3xl bg-white p-5 shadow-doux">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold">Corrections du rectificatif</h2>
          <p className="text-[13px] text-zinc-500">
            Rectifie {choix.donnees ? <strong>{choix.donnees.note.libelle}</strong> : "la note signée"}
            {choix.donnees?.note.numero ? ` (n° ${choix.donnees.note.numero})` : ""}. Chaque correction s’écrit « au lieu de … lire … » dans le département de la
            personne. À la signature, la base suit.
          </p>
        </div>
        {modifiable && (
          <Bouton variante="principal" onClick={() => setEdition("nouvelle")}>
            <Plus className="size-4" aria-hidden />
            Ajouter une correction
          </Bouton>
        )}
      </div>
      {choix.chargement && <Chargement />}
      {!liste.length && !choix.chargement && <p className="mt-3 text-[13px] text-zinc-500">Aucune correction pour l’instant.</p>}
      <ul className="mt-3 divide-y divide-zinc-100 rounded-xl ring-1 ring-zinc-200">
        {liste.map((r) => {
          const p = parId.get(r.enroleId);
          return (
            <li key={r.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-[13px]">
              <Badge ton={r.type === "REMPLACEMENT" ? "jaune" : "bleu"}>{r.type === "REMPLACEMENT" ? "Remplacement" : "Correction"}</Badge>
              <span className="min-w-0 flex-1">
                <span className="text-zinc-500">Au lieu de </span>
                <strong>{p ? `${p.n}. ${p.nom}` : "?"}</strong>
                <span className="text-zinc-500"> · lire </span>
                <strong>{r.lire.nom}</strong>
                {r.lire.departementId && p && r.lire.departementId !== p.departementId && <span className="text-zinc-500"> · département {dep(r.lire.departementId)}</span>}
              </span>
              {modifiable && (
                <span className="flex gap-1">
                  <Bouton variante="discret" onClick={() => setEdition(r)}>
                    <Pencil className="size-3.5" aria-hidden />
                    Modifier
                  </Bouton>
                  <Bouton variante="discret" onClick={() => enregistrer(liste.filter((x) => x.id !== r.id))}>
                    <Trash2 className="size-3.5" aria-hidden />
                    Retirer
                  </Bouton>
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {edition && choix.donnees && (
        <FenetreCorrection
          existante={edition === "nouvelle" ? null : edition}
          mutation={note.module === "MUTATION"}
          personnes={choix.donnees.personnes.filter((p) => p.id === (edition === "nouvelle" ? "" : edition.enroleId) || !liste.some((r) => r.enroleId === p.id))}
          remplacants={choix.donnees.remplacants}
          fermer={() => setEdition(null)}
          ok={(r) => enregistrer(edition === "nouvelle" ? [...liste, r] : liste.map((x) => (x.id === r.id ? r : x)))}
        />
      )}
    </div>
  );
}

function FenetreCorrection({
  existante,
  mutation = false,
  personnes,
  remplacants,
  fermer,
  ok,
}: {
  existante: Rectification | null;
  /** Rectificatif d'une note de mutation : matricule, G/E, ancien poste, destination. */
  mutation?: boolean;
  personnes: Personne[];
  remplacants: Personne[];
  fermer: () => void;
  ok: (r: Rectification) => void;
}) {
  const { refs } = useSession();
  const [enroleId, setEnroleId] = useState(existante?.enroleId ?? "");
  const [type, setType] = useState<Rectification["type"]>(existante?.type ?? "CORRECTION");
  const [lire, setLire] = useState<Rectification["lire"] | null>(existante?.lire ?? null);
  const [cherche, setCherche] = useState("");
  const personne = personnes.find((p) => p.id === enroleId) ?? null;
  const trouve = useMemo(() => {
    const k = cherche.trim().toUpperCase();
    return k.length < 2 ? [] : remplacants.filter((p) => p.nom.toUpperCase().includes(k)).slice(0, 8);
  }, [cherche, remplacants]);

  const choisirPersonne = (id: string) => {
    setEnroleId(id);
    const p = personnes.find((x) => x.id === id);
    if (p && type === "CORRECTION") setLire(lireDe(p, null));
  };
  const choisirType = (t: Rectification["type"]) => {
    setType(t);
    setLire(
      t === "CORRECTION" && personne
        ? lireDe(personne, null)
        : personne
          ? { ...lireDe(personne, null), nom: "", naissance: null, lieu: null, promotion: null, matricule: null, ge: null, ancienPoste: null, enroleId: null }
          : null,
    );
  };
  const champ = (cle: keyof Rectification["lire"], valeur: string) => setLire((x) => (x ? { ...x, [cle]: valeur || null } : x));

  return (
    <Modale titre={existante ? "Modifier la correction" : "Ajouter une correction"} ouverte fermer={fermer} large>
      <div className="space-y-4 text-[13px]">
        <Champ libelle="Au lieu de : la personne de la note signée">
          <Liste
            value={enroleId}
            onChange={(e) => choisirPersonne(e.target.value)}
            vide="Choisir…"
            options={personnes.map((p) => ({ valeur: p.id, libelle: `${p.departement ?? ""} · ${p.n}. ${p.nom}` }))}
          />
        </Champ>
        {personne && (
          <>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["CORRECTION", mutation ? "Corriger (nom, matricule, destination…)" : "Corriger (nom, date, département…)", Pencil],
                  ["REMPLACEMENT", "Remplacer par une autre personne", Replace],
                ] as const
              ).map(([t, libelle, Icone]) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => choisirType(t)}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 font-medium ring-1 transition ${type === t ? "bg-marque-50 text-marque-800 ring-marque-300" : "ring-zinc-200 hover:ring-zinc-300"}`}
                >
                  <Icone className="size-4" aria-hidden />
                  {libelle}
                </button>
              ))}
            </div>
            {type === "REMPLACEMENT" && (
              <Champ
                libelle={mutation ? "Chercher la personne qui remplace (mutations accordées pas encore dans une note)" : "Chercher la personne qui remplace (dossiers pas encore dans une note)"}
                aide="Ou écrivez directement son nom et ses informations ci-dessous."
              >
                <Saisie value={cherche} onChange={(e) => setCherche(e.target.value)} placeholder="Nom…" />
                {!!trouve.length && (
                  <ul className="mt-1 divide-y divide-zinc-100 rounded-xl ring-1 ring-zinc-200">
                    {trouve.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          className="w-full px-3 py-1.5 text-left hover:bg-zinc-50"
                          onClick={() => {
                            setLire({ ...lireDe(p, p.id), departementId: personne.departementId });
                            setCherche("");
                          }}
                        >
                          {p.nom}{" "}
                          <span className="text-zinc-500">
                            {mutation ? `· ${p.matricule ?? "sans matricule"} · ${p.ancienPoste ?? ""}` : `· ${p.diplome ?? ""} ${p.naissance ? `· ${p.naissance.split("-").reverse().join("/")}` : ""}`}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Champ>
            )}
            {lire && (
              <div className="rounded-xl bg-zinc-50 p-3 ring-1 ring-zinc-200">
                <div className="mb-2 font-medium">Lire :</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Champ libelle="Noms et prénoms">
                    <Saisie value={lire.nom} onChange={(e) => champ("nom", e.target.value)} />
                  </Champ>
                  {mutation ? (
                    <>
                      <Champ libelle="Matricule solde">
                        <Saisie value={lire.matricule ?? ""} onChange={(e) => champ("matricule", e.target.value)} />
                      </Champ>
                      <Champ libelle="Grade / échelon (G/E)">
                        <Saisie value={lire.ge ?? ""} onChange={(e) => champ("ge", e.target.value)} />
                      </Champ>
                      <Champ libelle="Cycle">
                        <Saisie value={lire.cycle ?? ""} onChange={(e) => champ("cycle", e.target.value)} />
                      </Champ>
                      <Champ libelle="Ancien poste">
                        <Saisie value={lire.ancienPoste ?? ""} onChange={(e) => champ("ancienPoste", e.target.value)} />
                      </Champ>
                      <Champ libelle="Lieu sollicité">
                        <Saisie value={lire.lieuSollicite ?? ""} onChange={(e) => champ("lieuSollicite", e.target.value)} />
                      </Champ>
                    </>
                  ) : (
                    <>
                      <Champ libelle="Date de naissance">
                        <Saisie type="date" value={lire.naissance ?? ""} onChange={(e) => champ("naissance", e.target.value)} />
                      </Champ>
                      <Champ libelle="Lieu de naissance">
                        <Saisie value={lire.lieu ?? ""} onChange={(e) => champ("lieu", e.target.value)} />
                      </Champ>
                      <Champ libelle="Promotion">
                        <Saisie value={lire.promotion ?? ""} onChange={(e) => champ("promotion", e.target.value)} />
                      </Champ>
                    </>
                  )}
                  <Champ libelle="Spécialité">
                    <Saisie value={lire.specialite ?? ""} onChange={(e) => champ("specialite", e.target.value)} />
                  </Champ>
                  <Champ libelle={mutation ? "Département sollicité" : "Département"}>
                    <Liste
                      value={lire.departementId ?? ""}
                      onChange={(e) => setLire({ ...lire, departementId: e.target.value ? Number(e.target.value) : null })}
                      options={refs.departements.map((d) => ({ valeur: d.id, libelle: d.nom }))}
                    />
                  </Champ>
                </div>
                {lire.enroleId && (
                  <p className="mt-2 text-xs text-zinc-500">
                    {mutation
                      ? "Demande de la base : à la signature, cette mutation entre dans le rectificatif (la demande remplacée est retirée)."
                      : "Dossier de la base : à la signature, cette personne est retenue dans ce département."}
                  </p>
                )}
              </div>
            )}
          </>
        )}
        <div className="flex justify-end gap-2">
          <Bouton onClick={fermer}>Annuler</Bouton>
          <Bouton
            variante="principal"
            disabled={!personne || !lire?.nom.trim()}
            onClick={() => lire && ok({ id: existante?.id ?? "", type, enroleId, lire })}
          >
            Enregistrer
          </Bouton>
        </div>
      </div>
    </Modale>
  );
}

/* ------------------------------ Textes de la note ------------------------------ */

/** Introduction et conclusion de la note, réécrites (06/11/2026) ; « Texte du modèle » : celui d'origine. */
function FenetreTextes({ note, fermer, apres, signaler }: { note: NoteDetail; fermer: () => void; apres: (t: string) => void; signaler: Signaler }) {
  const [intro, setIntro] = useState(note.textesLibres?.introduction ?? note.contenu.introduction);
  const [fin, setFin] = useState((note.textesLibres?.mentions ?? note.contenu.mentions).join("\n\n"));
  async function enregistrer(modele: boolean) {
    try {
      await api.put(`/notes/${note.id}/textes`, modele ? { introduction: null, mentions: null } : { introduction: intro, mentions: fin.split(/\n\s*\n/) });
      apres(modele ? "La note reprend les textes du modèle." : "Textes de la note enregistrés.");
    } catch (e) {
      signaler("rouge", (e as Error).message);
    }
  }
  return (
    <Modale titre="Introduction et conclusion" ouverte fermer={fermer} large>
      <div className="space-y-4 text-[13px]">
        <Champ libelle="Introduction" aide="Le paragraphe sous « NOTE DE SERVICE ». « {annee} » sera remplacé par l’année scolaire.">
          <Zone className="min-h-36 w-full" value={intro} onChange={(e) => setIntro(e.target.value)} />
        </Champ>
        <Champ libelle="Texte de conclusion" aide="Les paragraphes avant la signature (bourse, « prend effet à compter… »). Laissez une ligne vide entre deux paragraphes.">
          <Zone className="min-h-32 w-full" value={fin} onChange={(e) => setFin(e.target.value)} />
        </Champ>
        <div className="flex flex-wrap justify-end gap-2">
          {note.textesLibres && (
            <Bouton variante="discret" onClick={() => enregistrer(true)}>
              Revenir au texte du modèle
            </Bouton>
          )}
          <Bouton onClick={fermer}>Annuler</Bouton>
          <Bouton variante="principal" disabled={!intro.trim()} onClick={() => enregistrer(false)}>
            Enregistrer
          </Bouton>
        </div>
      </div>
    </Modale>
  );
}

/* ------------------------------ Découper en lots ------------------------------ */

/** Personnes de la note, par département, dans l'ordre de la note. */
function departementsDe(note: NoteDetail) {
  const deps: { titre: string; gens: { id: string; nom: string }[] }[] = [];
  for (const s of note.contenu.sections) {
    if (s.titre || !deps.length) deps.push({ titre: (s.titre ?? "").replace(/^[IVXLC]+- /, ""), gens: [] });
    deps[deps.length - 1].gens.push(...s.lignes.map((l) => ({ id: l.id, nom: String(l.nom ?? "") })));
  }
  return deps;
}

/** Même découpage que le serveur : des parts de « taille » au plus, départements entiers si possible. */
function apercuParts(deps: { gens: unknown[] }[], taille: number, entiers: boolean) {
  const parts = [0];
  for (const d of deps) {
    const n = d.gens.length;
    if (entiers && parts[parts.length - 1] && parts[parts.length - 1] + n > taille && n <= taille) parts.push(0);
    for (let i = 0; i < n; i++) {
      if (parts[parts.length - 1] >= taille) parts.push(0);
      parts[parts.length - 1]++;
    }
  }
  return parts.filter((x) => x > 0);
}

function FenetreDecouper({ note, fermer, apres, signaler }: { note: NoteDetail; fermer: () => void; apres: (t: string) => void; signaler: Signaler }) {
  const [mode, setMode] = useState<"nombre" | "main" | "critere" | null>(null);
  const deps = useMemo(() => departementsDe(note), [note]);
  const total = deps.reduce((t, d) => t + d.gens.length, 0);
  const [taille, setTaille] = useState(String(Math.max(1, Math.min(100, Math.ceil(total / 2)))));
  const [entiers, setEntiers] = useState(true);
  const [coches, setCoches] = useState<Set<string>>(new Set());
  const [cherche, setCherche] = useState("");
  const [premiers, setPremiers] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const t = Math.floor(Number(taille));
  const parts = t >= 1 ? apercuParts(deps, t, entiers) : [];
  const tous = deps.flatMap((d) => d.gens);
  const visibles = (g: { nom: string }) => !cherche.trim() || g.nom.toUpperCase().includes(cherche.trim().toUpperCase());
  const basculer = (ids: string[], oui: boolean) =>
    setCoches((c) => {
      const n = new Set(c);
      for (const id of ids) {
        if (oui) n.add(id);
        else n.delete(id);
      }
      return n;
    });

  async function lancer(fn: () => Promise<string>) {
    setEnvoi(true);
    try {
      apres(await fn());
    } catch (e) {
      signaler("rouge", (e as Error).message);
    } finally {
      setEnvoi(false);
    }
  }

  const choix = (cle: "nombre" | "main" | "critere", Icone: typeof Hash, titre: string, texte: string) => (
    <button
      type="button"
      onClick={() => setMode(cle)}
      className={`flex flex-1 items-start gap-3 rounded-2xl p-4 text-left ring-1 transition ${mode === cle ? "bg-marque-50 ring-marque-300" : "bg-white ring-zinc-200 hover:ring-zinc-300"}`}
    >
      <span className={`rounded-xl p-2 ${mode === cle ? "bg-marque-100 text-marque-700" : "bg-zinc-100 text-zinc-500"}`}>
        <Icone className="size-5" aria-hidden />
      </span>
      <span>
        <span className="block text-[14px] font-semibold text-encre">{titre}</span>
        <span className="mt-0.5 block text-[12px] leading-snug text-zinc-500">{texte}</span>
      </span>
    </button>
  );

  return (
    <Modale titre="Découper en plusieurs notes" ouverte fermer={fermer} large>
      <div className="space-y-4 text-[13px]">
        <p className="leading-relaxed text-zinc-600">
          Cette note compte <strong>{total} personne(s)</strong>. Vous pouvez la partager en plusieurs notes plus petites : chaque part devient une nouvelle note « – lot … ».
          La première part reste dans cette note. On peut tout remettre ensemble plus tard.
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          {choix("nombre", Hash, "Par nombre de personnes", "Des notes de 100 personnes au plus, par exemple. Le système partage tout seul.")}
          {choix("main", Hand, "En cochant les personnes", "Vous choisissez qui part dans une nouvelle note : un par un, un département, ou les N premiers.")}
          {note.module === "MUTATION"
            ? choix("critere", Tags, "Par département (ou autre)", "Une note par département sollicité, par cycle, par spécialité ou par département d’origine.")
            : choix("critere", Tags, "Par spécialité (ou autre)", "Une note pour l’anglais, une pour les maths… ou par diplôme, promotion, département.")}
        </div>

        {mode === "nombre" && (
          <div className="space-y-3 rounded-2xl bg-zinc-50 p-4 ring-1 ring-zinc-200">
            <div className="flex flex-wrap items-end gap-4">
              <Champ libelle="Personnes par note, au plus">
                <Saisie type="number" min={1} className="w-32" value={taille} onChange={(e) => setTaille(e.target.value)} />
              </Champ>
              <label className="flex items-center gap-2 pb-2">
                <input type="checkbox" className="size-4 accent-marque-600" checked={entiers} onChange={(e) => setEntiers(e.target.checked)} />
                Garder chaque département dans la même note (si possible)
              </label>
            </div>
            {parts.length > 1 ? (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {parts.map((n, i) => (
                    <span key={i} className={`rounded-full px-3 py-1 font-medium ring-1 ${i === 0 ? "bg-white text-encre ring-zinc-300" : "bg-sky-50 text-sky-800 ring-sky-200"}`}>
                      {i === 0 ? "Reste dans cette note" : `Nouvelle note ${i}`} : <strong className="tabular-nums">{n}</strong>
                    </span>
                  ))}
                </div>
                <div className="flex justify-end">
                  <Bouton
                    variante="principal"
                    chargement={envoi}
                    onClick={() =>
                      lancer(async () => {
                        const r = await api.post<{ notes: number[] }>(`/notes/${note.id}/lots/nombre`, { taille: t, garderDepartements: entiers });
                        return `Note découpée en ${r.notes.length} notes (${r.notes.join(", ")} personnes). Les nouvelles notes sont dans la liste des notes d’enrôlement.`;
                      })
                    }
                  >
                    <Scissors className="size-4" aria-hidden />
                    Découper en {parts.length} notes
                  </Bouton>
                </div>
              </>
            ) : (
              <p className="text-zinc-500">{t >= 1 ? `Avec ${t} personnes par note, tout tient dans cette note.` : "Indiquez un nombre."}</p>
            )}
          </div>
        )}

        {mode === "critere" && <DecouperParCritere note={note} apres={apres} signaler={signaler} />}

        {mode === "main" && (
          <div className="space-y-3 rounded-2xl bg-zinc-50 p-4 ring-1 ring-zinc-200">
            <div className="flex flex-wrap items-center gap-2">
              <Saisie className="w-60" placeholder="Chercher un nom…" value={cherche} onChange={(e) => setCherche(e.target.value)} />
              <span className="text-zinc-500">ou cocher les</span>
              <Saisie type="number" min={1} className="w-24" placeholder="N" value={premiers} onChange={(e) => setPremiers(e.target.value)} />
              <Bouton disabled={!(Number(premiers) >= 1)} onClick={() => setCoches(new Set(tous.slice(0, Math.floor(Number(premiers))).map((g) => g.id)))}>
                premiers
              </Bouton>
              {coches.size > 0 && (
                <Bouton variante="discret" onClick={() => setCoches(new Set())}>
                  Tout décocher
                </Bouton>
              )}
            </div>
            <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
              {deps.map((d) => {
                const gens = d.gens.filter(visibles);
                if (!gens.length) return null;
                const tousCoches = d.gens.every((g) => coches.has(g.id));
                return (
                  <div key={d.titre}>
                    <label className="flex items-center gap-2 rounded-lg bg-white px-2 py-1.5 font-semibold ring-1 ring-zinc-200">
                      <input type="checkbox" className="size-4 accent-marque-600" checked={tousCoches} onChange={(e) => basculer(d.gens.map((g) => g.id), e.target.checked)} />
                      {d.titre || "Sans département"} <span className="font-normal text-zinc-500">({d.gens.length})</span>
                    </label>
                    <div className="mt-1 grid gap-x-4 sm:grid-cols-2">
                      {gens.map((g) => (
                        <label key={g.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-0.5 hover:bg-white">
                          <input type="checkbox" className="size-4 accent-marque-600" checked={coches.has(g.id)} onChange={(e) => basculer([g.id], e.target.checked)} />
                          <span className="truncate">{g.nom}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-zinc-600">
                <strong className="tabular-nums">{coches.size}</strong> cochée(s) → nouvelle note · <strong className="tabular-nums">{total - coches.size}</strong> restent ici
              </span>
              <Bouton
                variante="principal"
                chargement={envoi}
                disabled={!coches.size || coches.size >= total}
                onClick={() =>
                  lancer(async () => {
                    const r = await api.post<{ deplaces: number }>(`/notes/${note.id}/lots/main`, { ids: [...coches] });
                    return `${r.deplaces} personne(s) mise(s) dans une nouvelle note (lot). Elle est dans la liste des notes d’enrôlement.`;
                  })
                }
              >
                <Scissors className="size-4" aria-hidden />
                Mettre les {coches.size} cochées dans une nouvelle note
              </Bouton>
            </div>
          </div>
        )}
      </div>
    </Modale>
  );
}

type Critere = { critere: string; libelle: string; valeurs: { valeur: string; n: number }[] };

/** Une note pour les valeurs choisies d'un critère : une par valeur, ou une seule pour toutes. */
function DecouperParCritere({ note, apres, signaler }: { note: NoteDetail; apres: (t: string) => void; signaler: Signaler }) {
  const criteres = useApi<Critere[]>(`/notes/${note.id}/lots/criteres`);
  // Le premier critère proposé par le serveur : la spécialité (enrôlement), le département (mutation)
  const [critere, setCritere] = useState<string | null>(null);
  const [choisies, setChoisies] = useState<string[]>([]);
  const [ensemble, setEnsemble] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  if (criteres.erreur) return <Alerte>{criteres.erreur}</Alerte>;
  if (!criteres.donnees) return <Chargement />;
  const c = criteres.donnees.find((x) => x.critere === critere) ?? criteres.donnees[0];
  const total = c.valeurs.reduce((t, v) => t + v.n, 0);
  const partent = c.valeurs.filter((v) => choisies.includes(v.valeur)).reduce((t, v) => t + v.n, 0);
  const notes = !choisies.length ? 0 : ensemble ? 1 : choisies.length;
  const basculer = (v: string) => setChoisies((l) => (l.includes(v) ? l.filter((x) => x !== v) : [...l, v]));
  return (
    <div className="space-y-3 rounded-2xl bg-zinc-50 p-4 ring-1 ring-zinc-200">
      <div className="flex flex-wrap gap-1.5">
        {criteres.donnees.map((x) => (
          <button
            key={x.critere}
            type="button"
            onClick={() => {
              setCritere(x.critere);
              setChoisies([]);
            }}
            className={`rounded-full px-3 py-1.5 text-[12px] font-medium ring-1 transition ${x.critere === c.critere ? "bg-nuit text-white ring-nuit" : "bg-white text-zinc-600 ring-zinc-200 hover:ring-zinc-300"}`}
          >
            {x.libelle}
          </button>
        ))}
      </div>
      <p className="text-zinc-600">Cochez les valeurs qui partent dans une nouvelle note. Les autres restent dans cette note.</p>
      <div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto">
        {c.valeurs.map((v) => {
          const oui = choisies.includes(v.valeur);
          return (
            <button
              key={v.valeur}
              type="button"
              onClick={() => basculer(v.valeur)}
              className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-left ring-1 transition ${oui ? "bg-marque-50 ring-2 ring-marque-300" : "bg-white ring-zinc-200 hover:ring-zinc-300"}`}
            >
              <span className={`grid size-4 place-items-center rounded ${oui ? "bg-marque-600 text-white" : "ring-2 ring-zinc-300"}`}>{oui && <Check className="size-3" aria-hidden />}</span>
              {v.valeur}
              <span className="rounded-full bg-zinc-100 px-1.5 text-[11px] tabular-nums text-zinc-600">{v.n}</span>
            </button>
          );
        })}
      </div>
      {choisies.length > 1 && (
        <div className="inline-flex rounded-full bg-white p-1 ring-1 ring-zinc-200">
          <button type="button" onClick={() => setEnsemble(false)} className={`rounded-full px-3 py-1 text-[12px] font-medium ${!ensemble ? "bg-encre text-white" : "text-zinc-600"}`}>
            Une note par valeur ({choisies.length})
          </button>
          <button type="button" onClick={() => setEnsemble(true)} className={`rounded-full px-3 py-1 text-[12px] font-medium ${ensemble ? "bg-encre text-white" : "text-zinc-600"}`}>
            Une seule note pour toutes
          </button>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-zinc-600">
          {choisies.length ? (
            <>
              <strong className="tabular-nums">{partent}</strong> personne(s) → <strong>{notes}</strong> nouvelle(s) note(s) · <strong className="tabular-nums">{total - partent}</strong> restent ici
            </>
          ) : (
            "Rien de coché."
          )}
        </span>
        <Bouton
          variante="principal"
          chargement={envoi}
          disabled={!choisies.length || partent >= total}
          onClick={async () => {
            setEnvoi(true);
            try {
              const r = await api.post<{ notes: { libelle: string; total: number }[]; reste: number }>(`/notes/${note.id}/lots/critere`, { critere: c.critere, valeurs: choisies, ensemble });
              apres(`${r.notes.length} nouvelle(s) note(s) : ${r.notes.map((x) => `« ${x.libelle} » (${x.total})`).join(", ")} ; ${r.reste} personne(s) restent dans cette note.`);
            } catch (e) {
              signaler("rouge", (e as Error).message);
            } finally {
              setEnvoi(false);
            }
          }}
        >
          <Scissors className="size-4" aria-hidden />
          Créer {notes > 1 ? `les ${notes} notes` : "la note"}
        </Bouton>
      </div>
      {partent >= total && choisies.length > 0 && <p className="text-[12px] text-amber-700">Toute la note partirait : laissez au moins une valeur ici.</p>}
    </div>
  );
}
