"use client";

import { AlertTriangle, ArrowRightLeft, BookOpen, Check, RotateCcw, Wand2 } from "lucide-react";
import { useId, useState } from "react";
import { Bouton, Champ, Modale, Saisie } from "@/components/ui";
import { api, qs, useApi } from "@/lib/api";
import type { Enrole } from "./commun";

/** Les notes où l'on peut envoyer un volontaire (le serveur envoie la liste avec chaque dossier). */
export type NoteCible = { note: string; libelle: string; cycle: string; specialite: string | null };

/** Couleur de chaque cycle, la même partout (pastilles des notes). */
const TEINTE: Record<string, string> = {
  Préscolaire: "bg-pink-50 text-pink-800 ring-pink-200",
  Primaire: "bg-amber-50 text-amber-800 ring-amber-200",
  Collège: "bg-sky-50 text-sky-800 ring-sky-200",
  Lycée: "bg-violet-50 text-violet-800 ring-violet-200",
  Administration: "bg-zinc-100 text-zinc-700 ring-zinc-200",
};
export const teinteCycle = (cycle: string) => TEINTE[cycle] ?? TEINTE.Administration;

/** Les notes en cartes à cocher : la note actuelle est marquée, la règle aussi. */
export function ChoixNote({ cibles, valeur, changer, actuelle }: { cibles: NoteCible[]; valeur: string | null; changer: (n: string) => void; actuelle?: string | null }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {cibles.map((c) => {
        const choisi = valeur === c.note;
        return (
          <button
            key={c.note}
            type="button"
            onClick={() => changer(c.note)}
            className={`flex items-start gap-2.5 rounded-2xl p-3 text-left ring-1 transition ${choisi ? "bg-marque-50 ring-2 ring-marque-300" : "bg-white ring-zinc-200 hover:ring-zinc-300"}`}
          >
            <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${choisi ? "bg-marque-600 text-white" : "ring-2 ring-zinc-300"}`}>{choisi && <Check className="size-3.5" aria-hidden />}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold text-encre">{c.libelle}</span>
              <span className="mt-1 flex flex-wrap gap-1">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${teinteCycle(c.cycle)}`}>{c.cycle}</span>
                {actuelle === c.note && <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] font-medium text-white">aujourd’hui</span>}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Saisie de la spécialité avec les spécialités connues (liste de référence et celles de la campagne). */
export function SaisieSpecialite({ campagneId, valeur, changer, placeholder }: { campagneId: number; valeur: string; changer: (v: string) => void; placeholder?: string }) {
  const id = useId();
  const connues = useApi<string[]>(`/enrolement/specialites${qs({ campagne: campagneId })}`);
  return (
    <>
      <Saisie list={id} value={valeur} onChange={(e) => changer(e.target.value)} placeholder={placeholder ?? "Ex. Anglais, Mathématiques…"} />
      <datalist id={id}>
        {(connues.donnees ?? []).map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </>
  );
}

/**
 * Changer la note d'un ou de plusieurs volontaires (06/11/2026). Par défaut la note suit le
 * diplôme (une licence de langue ou de philosophie va au lycée) ; ici on l'envoie dans n'importe
 * quelle note, comme une recommandation, ou on le remet à la règle. Envoyé au collège ou au lycée
 * sans matière, le système demande sa spécialité (sans bloquer) ; au préscolaire ou au primaire,
 * il la donne lui-même.
 */
export function ChangerNote({ dossiers, fermer, apres }: { dossiers: Enrole[]; fermer: () => void; apres: (texte: string, ton?: "vert" | "jaune") => void }) {
  const cibles = dossiers.find((d) => d.notesPossibles?.length)?.notesPossibles ?? [];
  const dejaSignes = dossiers.filter((d) => d.noteId).length;
  const [cible, setCible] = useState<string | null>(null);
  const [specialite, setSpecialite] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const un = dossiers.length === 1 ? dossiers[0] : null;
  const choix = cibles.find((c) => c.note === cible) ?? null;
  // Envoyés au collège ou au lycée sans matière : on propose d'en écrire une
  const sansMatiere = choix && !choix.specialite ? dossiers.filter((d) => !d.noteId && specialiteVide(d.specialite)).length : 0;
  const sansSpecialiteRegle = choix?.specialite ? dossiers.filter((d) => !d.noteId && !d.specialite?.trim()).length : 0;

  async function appliquer() {
    if (!cible) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const r = await api.post<{ changes: number; dansUneNote: number; specialitesDonnees: number; sansSpecialite: number }>("/enrolement/dossiers/note", {
        ids: dossiers.map((d) => d.id),
        cible: cible === "REGLE" ? null : cible,
        specialite: specialite.trim() || null,
      });
      const plus = [
        r.specialitesDonnees ? `${r.specialitesDonnees} ont reçu la spécialité « ${choix?.specialite ?? "de la règle"} »` : "",
        r.sansSpecialite ? `${r.sansSpecialite} sans spécialité : à préciser (pastille orange)` : "",
        r.dansUneNote ? `${r.dansUneNote} déjà dans une note validée : non changé(s)` : "",
      ].filter(Boolean);
      const ou = cible === "REGLE" ? "remis à la règle automatique" : `envoyé(s) dans la « ${choix?.libelle} »`;
      apres(`${r.changes} volontaire(s) ${ou}.${plus.length ? ` ${plus.join(" ; ")}.` : ""}`, r.sansSpecialite || r.dansUneNote ? "jaune" : "vert");
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Modale titre={un ? `Changer la note de ${un.nomComplet}` : `Changer la note de ${dossiers.length} volontaire(s)`} ouverte fermer={fermer} large>
      <div className="space-y-4 text-[13px]">
        <div className="flex items-start gap-3 rounded-2xl bg-zinc-50 px-4 py-3 leading-relaxed text-zinc-600">
          <ArrowRightLeft className="mt-0.5 size-4 shrink-0 text-marque-600" aria-hidden />
          {un ? (
            <span>
              {un.diplomeLibelle}
              {un.specialite ? ` · spécialité ${un.specialite}` : " · sans spécialité"}. Aujourd’hui :{" "}
              <strong className="text-encre">{un.noteAutre ?? cibles.find((c) => c.note === un.noteActuelle)?.libelle ?? "la note de son diplôme"}</strong>.
            </span>
          ) : (
            <span>Le système range chaque volontaire selon son diplôme et sa spécialité. Choisissez la note où envoyer les {dossiers.length} cochés.</span>
          )}
        </div>

        <div>
          <div className="mb-2 font-semibold text-encre">1. Dans quelle note ?</div>
          <ChoixNote cibles={cibles} valeur={cible} changer={setCible} actuelle={un?.noteActuelle} />
          <button
            type="button"
            onClick={() => setCible("REGLE")}
            className={`mt-2 flex w-full items-center gap-2.5 rounded-2xl p-3 text-left ring-1 transition ${cible === "REGLE" ? "bg-marque-50 ring-2 ring-marque-300" : "bg-white ring-zinc-200 hover:ring-zinc-300"}`}
          >
            <RotateCcw className="size-4 shrink-0 text-zinc-500" aria-hidden />
            <span>
              <span className="font-semibold text-encre">Remettre à la règle automatique</span>
              <span className="block text-[12px] text-zinc-500">La note de son diplôme (une licence de langue ou de philosophie va au lycée).</span>
            </span>
          </button>
        </div>

        {choix && !choix.specialite && (
          <div className="rounded-2xl bg-sky-50/60 p-4 ring-1 ring-sky-200">
            <div className="mb-2 flex items-center gap-2 font-semibold text-encre">
              <BookOpen className="size-4 text-sky-700" aria-hidden />
              2. Sa spécialité (facultatif)
            </div>
            {sansMatiere > 0 ? (
              <p className="mb-2 flex items-start gap-1.5 text-[12px] text-amber-800">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                {un ? "Ce volontaire n’a pas de matière" : `${sansMatiere} volontaire(s) n’ont pas de matière`} : la colonne « Spécialité » de la note serait vide. Écrivez-la si vous la connaissez, sinon
                elle restera « à préciser » (cela ne bloque pas).
              </p>
            ) : (
              <p className="mb-2 text-[12px] text-zinc-500">Laissez vide pour garder la spécialité de chacun.</p>
            )}
            <Champ libelle="Spécialité">
              <SaisieSpecialite campagneId={dossiers[0].campagneId} valeur={specialite} changer={setSpecialite} />
            </Champ>
          </div>
        )}
        {choix?.specialite && sansSpecialiteRegle > 0 && (
          <p className="flex items-start gap-1.5 rounded-2xl bg-emerald-50 px-4 py-3 text-[12px] text-emerald-800 ring-1 ring-emerald-200">
            <Wand2 className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {sansSpecialiteRegle} sans spécialité : la règle leur donnera « {choix.specialite} ».
          </p>
        )}
        {dejaSignes > 0 && <p className="text-[12px] text-or-700">{dejaSignes} coché(s) déjà dans une note validée : ils ne bougeront pas.</p>}
        {erreur && <p className="text-[12px] font-medium text-rouge-600">{erreur}</p>}
        <div className="flex justify-end gap-2">
          <Bouton onClick={fermer}>Annuler</Bouton>
          <Bouton variante="principal" chargement={envoi} disabled={!cible} onClick={appliquer}>
            Appliquer
          </Bouton>
        </div>
      </div>
    </Modale>
  );
}

/** Même idée que le serveur : vide, ou « primaire » / « préscolaire » qui ne disent pas la matière. */
export function specialiteVide(sp: string | null | undefined) {
  const t = (sp ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
  return !t || /^(PRES?CO|PRECOLAIRE|PRIMAIRE|NEANT|AUCUNE?|RAS|ND)/.test(t);
}

/** Écrire la spécialité d'un ou de plusieurs volontaires (ou la règle, au préscolaire et au primaire). */
export function EcrireSpecialite({ dossiers, fermer, apres }: { dossiers: Enrole[]; fermer: () => void; apres: (texte: string) => void }) {
  const [valeur, setValeur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const un = dossiers.length === 1 ? dossiers[0] : null;
  async function envoyer(regle: boolean) {
    setEnvoi(true);
    setErreur(null);
    try {
      const r = await api.post<{ changes: number; ignores: number }>("/enrolement/dossiers/specialite", { ids: dossiers.map((d) => d.id), specialite: regle ? null : valeur.trim() });
      apres(`${r.changes} spécialité(s) écrite(s)${r.ignores ? ` (${r.ignores} non concerné(s))` : ""}.`);
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  }
  return (
    <Modale titre={un ? `Spécialité de ${un.nomComplet}` : `Spécialité de ${dossiers.length} volontaire(s)`} ouverte fermer={fermer}>
      <div className="space-y-3 text-[13px]">
        <p className="text-zinc-600">
          {un ? `${un.diplomeLibelle} · ${un.noteAutre ?? "note de son diplôme"}.` : "La même spécialité sera écrite pour tous."} La spécialité sort dans la colonne « Spécialité » de la
          note.
        </p>
        <Champ libelle="Spécialité">
          <SaisieSpecialite campagneId={dossiers[0].campagneId} valeur={valeur} changer={setValeur} />
        </Champ>
        {erreur && <p className="text-[12px] font-medium text-rouge-600">{erreur}</p>}
        <div className="flex justify-end gap-2">
          <Bouton onClick={fermer}>Annuler</Bouton>
          <Bouton variante="principal" chargement={envoi} disabled={!valeur.trim()} onClick={() => envoyer(false)}>
            Enregistrer
          </Bouton>
        </div>
      </div>
    </Modale>
  );
}

/** Pastille de la spécialité d'une ligne : « à préciser » (orange) ou « règle : Primaire » (vert). */
export function PastilleSpecialite({ e, ouvrir }: { e: Enrole; ouvrir: (regle: boolean) => void }) {
  const s = e.specialiteEtat;
  if (!s || e.noteId) return null;
  return s.etat === "aPreciser" ? (
    <button
      type="button"
      onClick={() => ouvrir(false)}
      title="Collège ou lycée sans matière : la colonne « Spécialité » de la note serait vide"
      className="ml-1 mt-0.5 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-amber-200 hover:bg-amber-100"
    >
      <AlertTriangle className="size-3" aria-hidden /> Spécialité à préciser
    </button>
  ) : (
    <button
      type="button"
      onClick={() => ouvrir(true)}
      title={`Sans spécialité : la règle donne « ${s.valeur} »`}
      className="ml-1 mt-0.5 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100"
    >
      <Wand2 className="size-3" aria-hidden /> Spécialité : {s.valeur} ?
    </button>
  );
}

/**
 * Bandeau « Spécialités à compléter » (06/11/2026) : au préscolaire et au primaire, la règle donne
 * la spécialité d'un clic (un par un ou tous) ; au collège et au lycée, la matière est à écrire.
 */
export function SpecialitesACompleter({ dossiers, apres }: { dossiers: Enrole[]; apres: (texte: string, ton?: "vert" | "jaune") => void }) {
  const regle = dossiers.filter((d) => !d.noteId && d.specialiteEtat?.etat === "regle");
  const aPreciser = dossiers.filter((d) => !d.noteId && d.specialiteEtat?.etat === "aPreciser");
  const [envoi, setEnvoi] = useState(false);
  if (!regle.length && !aPreciser.length) return null;
  async function appliquerRegle() {
    setEnvoi(true);
    try {
      const r = await api.post<{ changes: number }>("/enrolement/dossiers/specialite", { ids: regle.map((d) => d.id), specialite: null });
      apres(`Règle appliquée : ${r.changes} spécialité(s) écrite(s) (« Préscolaire » ou « Primaire »).`);
    } catch (e) {
      apres((e as Error).message, "jaune");
    } finally {
      setEnvoi(false);
    }
  }
  return (
    <div className="mb-4 grid gap-3 md:grid-cols-2">
      {regle.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
          <span className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
            <Wand2 className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1 text-[13px]">
            <div className="font-semibold text-encre">{regle.length} au préscolaire ou au primaire sans spécialité</div>
            <p className="mt-0.5 text-zinc-600">La règle leur donne « Préscolaire » ou « Primaire ». Un par un : la pastille verte sur la ligne.</p>
            <Bouton className="mt-2" variante="principal" chargement={envoi} onClick={appliquerRegle}>
              Appliquer la règle aux {regle.length}
            </Bouton>
          </div>
        </div>
      )}
      {aPreciser.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
          <span className="rounded-xl bg-or-100 p-2 text-or-700">
            <AlertTriangle className="size-5" aria-hidden />
          </span>
          <div className="text-[13px]">
            <div className="font-semibold text-encre">{aPreciser.length} au collège ou au lycée sans matière</div>
            <p className="mt-0.5 text-zinc-600">
              Leur colonne « Spécialité » serait vide sur la note. Cliquez sur la pastille orange « Spécialité à préciser » de chaque ligne. Cela ne bloque ni la note ni les
              recommandations.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
