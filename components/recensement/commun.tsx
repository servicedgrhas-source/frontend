"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { useSession } from "@/components/session";
import { type ListeReference, SaisieReferentiel } from "@/components/saisie-referentiel";
import { Champ, Liste, Saisie, SaisieDate, Zone, cx } from "@/components/ui";
import { useApi } from "@/lib/api";
import type { Role } from "@/lib/api";

/* ------------------------------ Configuration ------------------------------ */

export type TypeChamp = "TEXTE" | "NOMBRE" | "DATE" | "LISTE" | "LISTE_MULTIPLE" | "TELEPHONE" | "EMAIL" | "LIGNES" | "TABLEAU" | "DEPARTEMENT";

/** Case d'une ligne de tableau (promotion : date, texte, nature…). */
export interface ColonneTableau {
  code: string;
  libelle: string;
  type: "TEXTE" | "DATE" | "NOMBRE" | "LISTE";
  options: OptionChamp[];
}

export interface OptionChamp {
  code: string;
  libelle: string;
  synonymes: string[];
}
export interface Condition {
  champ: string;
  valeurs: string[];
}
export interface ChampFiche {
  code: string;
  libelle: string;
  section: string;
  type: TypeChamp;
  obligatoirePour: string[];
  si: Condition | null;
  options: OptionChamp[];
  autreValeur: boolean;
  entetes: string[];
  aide: string;
  exemple: string;
  actif: boolean;
  systeme: boolean;
  colonnes: ColonneTableau[];
  /** Liste de référence (école, inspection, localité, matière, poste…) : choix avec recherche, saisie libre possible. */
  referentiel?: ListeReference | null;
}
export interface PieceExigee {
  code: string;
  libelle: string;
  exigeePour: string[];
  si: Condition | null;
  nombreSelon: string | null;
  actif: boolean;
}
export interface RegleCoherence {
  code: string;
  libelle: string;
  si: Condition;
  alors: Condition;
  actif: boolean;
}
export interface StatutAgent {
  code: string;
  libelle: string;
  synonymes: string[];
  actif: boolean;
}
export interface ConfigRecensement {
  version: 1;
  revision?: number;
  statuts: StatutAgent[];
  /** colonnes : cases par ligne à l'écran (3 par défaut ; 5 pour un diplôme sur une ligne). */
  sections: { code: string; libelle: string; colonnes?: number }[];
  champs: ChampFiche[];
  pieces: PieceExigee[];
  regles: RegleCoherence[];
  ageMinimum: number;
  /** Vide : aucun âge supposé quand la catégorie de l'agent est inconnue. */
  ageRetraite: number | null;
  /** Promotion du fonctionnaire (24 mois) et avancement du contractuel (28 mois). */
  delaiPromotionMois: number;
  delaiAvancementMois: number;
  telephonePartage: number;
  contentieuxHorsBase: boolean;
}
export interface ReponseConfigRecensement {
  configuration: ConfigRecensement;
  defaut: ConfigRecensement;
  types: Record<TypeChamp, string>;
}

export function useConfigRecensement() {
  return useApi<ReponseConfigRecensement>("/recensement/configuration");
}

/** Agents de la DGRHAS, DDEPPSA et comptes d'établissement : saisir, importer, corriger. */
export const peutRecenser = (r?: Role) => !!r && ["ADMIN", "AGENT", "CHEF_SERVICE", "DIRECTEUR", "BUREAU_ETUDES", "DG", "DDEPPSA", "STRUCTURE"].includes(r);

/** Bureau du contrôle : avis sur les agents ajoutés au recensement, avant la décision du DG. */
export const peutControlerAjout = (r?: Role) => !!r && ["ADMIN", "CHEF_SERVICE", "DIRECTEUR", "BUREAU_ETUDES"].includes(r);

/** Où en est un agent ajouté au recensement. */
export const ETAT_AJOUT: Record<ContentieuxAgent["etat"], { libelle: string; ton: "jaune" | "bleu" | "vert" | "rouge" }> = {
  EN_COURS: { libelle: "À contrôler", ton: "jaune" },
  CONTROLE: { libelle: "À décider par le DG", ton: "bleu" },
  CONFIRME: { libelle: "Accepté dans la base", ton: "vert" },
  REJETE: { libelle: "Rejeté", ton: "rouge" },
};

export interface Manques {
  champs?: string[];
  pieces?: { code: string; manque: number }[];
  aVerifier?: string[];
}

export interface EtapeStatut {
  statut: string;
  depuis: string | null;
  texte: string | null;
  par: string | null;
  le: string;
}
/** Agent ajouté au recensement (absent de la base) : à contrôler (EN_COURS), à décider par le DG (CONTROLE), accepté ou rejeté. */
export interface ContentieuxAgent {
  etat: "EN_COURS" | "CONTROLE" | "CONFIRME" | "REJETE";
  motif: string;
  ouvertPar: string | null;
  ouvertLe: string;
  avisControle?: "FAVORABLE" | "DEFAVORABLE" | null;
  noteControle?: string | null;
  controlePar?: string | null;
  controleLe?: string | null;
  decidePar?: string | null;
  decideLe?: string | null;
  note?: string | null;
}
export interface AgentRecense {
  id: number;
  numeroFiche: string | null;
  statut: string;
  nomComplet: string;
  dateNaissance: string | null;
  matricule: string | null;
  telephone: string | null;
  departementId: number | null;
  structureId: number | null;
  donnees: Record<string, unknown>;
  manques: Manques;
  taux: number;
  complet: boolean;
  parcours?: EtapeStatut[];
  contentieux?: ContentieuxAgent | null;
  distinctes?: number[];
  source: string;
  creePar: string | null;
  modifiePar: string | null;
  creeLe: string;
  modifieLe: string;
}

/* ------------------------------ Règles (comme le serveur) ------------------------------ */

export const estVide = (v: unknown) => v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);

export function conditionRemplie(cd: Condition | null, d: Record<string, unknown>) {
  if (!cd) return true;
  const v = d[cd.champ];
  if (estVide(v)) return false;
  if (!cd.valeurs.length) return true;
  const vals = Array.isArray(v) ? v.map(String) : [String(v)];
  return vals.some((x) => cd.valeurs.includes(x));
}

export const obligatoire = (ch: ChampFiche, statut: string, d: Record<string, unknown>) =>
  ch.obligatoirePour.includes(statut) && conditionRemplie(ch.si, d);

export function nombreDe(v: unknown) {
  if (Array.isArray(v)) return v.length;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), 30) : 0;
}

/** Pièces attendues pour une fiche : exigées (avec leur nombre) puis facultatives. */
export function piecesAttendues(c: ConfigRecensement, statut: string, d: Record<string, unknown>) {
  return c.pieces
    .filter((p) => p.actif)
    .map((p) => {
      const exigee = p.exigeePour.includes(statut) && conditionRemplie(p.si, d);
      const nombre = p.nombreSelon ? nombreDe(d[p.nombreSelon]) : 1;
      return { piece: p, exigee: exigee && nombre > 0, nombre: exigee ? nombre : 0 };
    })
    .sort((a, b) => Number(b.exigee) - Number(a.exigee));
}

export const libelleStatut = (c: ConfigRecensement | undefined, code: string) => c?.statuts.find((s) => s.code === code)?.libelle ?? code;

/** « 54 % » coloré : rouge, jaune, vert. */
export function Taux({ taux, complet }: { taux: number; complet: boolean }) {
  const ton = complet ? "bg-marque-100 text-marque-700" : taux >= 70 ? "bg-or-100 text-or-700" : "bg-rouge-100 text-rouge-600";
  return <span className={cx("inline-flex min-w-12 justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums", ton)}>{complet ? "Complet" : `${taux} %`}</span>;
}

/* ------------------------------ Saisie d'une rubrique ------------------------------ */

const enTexte = (v: unknown) => (estVide(v) ? "" : String(v));

/** Champ de saisie d'une rubrique, selon son type (texte, date, liste, plusieurs lignes…). */
/* ------------------------------ Suggestions et contrôles de saisie (DG, 30/10/2026) ------------------------------ */

/** Grade tapé à la main : à relire. */
const AVERTIR_GRADE = "Veuillez relire ce que vous venez de taper, ou choisissez ce qui s’affiche dans les suggestions.";
/** Autres rubriques : tapé à la main, gardé tel quel. */
const AVERTIR_MAIN = "Tapé à la main : ce n’est pas identique à ce que le système connaît (vous pouvez le garder).";

/**
 * Rubriques avec des suggestions : on propose ce que le système connaît, la personne peut toujours
 * écrire autre chose (une phrase en jaune le signale, sans bloquer). Lieu de naissance et nationalité :
 * des suggestions seulement, sans phrase (un lieu ou une nationalité d'ailleurs est normal).
 */
const SUGGESTIONS: Record<string, { liste: ListeReference; avertissement: string | null }> = {
  GRADE: { liste: "GRADE", avertissement: AVERTIR_GRADE },
  CATEGORIE: { liste: "CATEGORIE", avertissement: AVERTIR_MAIN },
  ECHELLE: { liste: "ECHELLE", avertissement: AVERTIR_MAIN },
  ECHELON: { liste: "ECHELON", avertissement: AVERTIR_MAIN },
  LIEU_NAISSANCE: { liste: "LIEU_NAISSANCE", avertissement: null },
  NATIONALITE: { liste: "NATIONALITE", avertissement: null },
  FONCTION_STRUCTURE: { liste: "POSTE", avertissement: AVERTIR_MAIN },
  // Cases des tableaux : « rubrique.case »
  "PROMOTIONS.GRADE": { liste: "GRADE", avertissement: AVERTIR_GRADE },
  "PROMOTIONS.ECHELON": { liste: "ECHELON", avertissement: AVERTIR_MAIN },
  "AUTRES_DIPLOMES.SPECIALITE": { liste: "SPECIALITE", avertissement: AVERTIR_MAIN },
};

/** Années d'obtention : quatre chiffres, de 1940 à cette année. */
const ANNEES = new Set(["PROMOTION_FORMATION", "AUTRES_DIPLOMES.ANNEE"]);

/** Même règle que le serveur : un ou deux numéros (séparés par « / »), 8 à 15 chiffres sans le +242. */
export function telephoneFaux(v: string) {
  const numeros = v
    .split(/\s*[/;|]\s*|\s+(?:ou|et)\s+/i)
    .map((t) => t.replace(/[^\d+]/g, "").replace(/^\+?242/, "").replace(/\D/g, ""))
    .filter(Boolean);
  return !!v.trim() && (!numeros.length || numeros.some((n) => n.length < 8 || n.length > 15));
}
export const emailFaux = (v: string) => !!v.trim() && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v.trim());
const anneeFausse = (v: string) => !!v.trim() && (!/^\d{4}$/.test(v.trim()) || +v < 1940 || +v > new Date().getFullYear());

/** Saisie contrôlée : seuls les caractères permis passent, et un message rouge dit ce qui ne va pas (à la sortie du champ). */
function SaisieControlee({
  valeur,
  changer,
  filtre,
  faux,
  message,
  desactive,
  placeholder,
  className,
  inputMode,
  maxLength,
  type = "text",
  "aria-label": libelle,
}: {
  valeur: string;
  changer: (v: string) => void;
  filtre?: (v: string) => string;
  faux: (v: string) => boolean;
  message: string;
  desactive?: boolean;
  placeholder?: string;
  className?: string;
  inputMode?: "numeric" | "tel" | "email";
  maxLength?: number;
  type?: string;
  "aria-label"?: string;
}) {
  const [vu, setVu] = useState(false);
  const erreur = vu && faux(valeur);
  return (
    <span className="flex flex-col gap-0.5">
      <Saisie
        type={type}
        inputMode={inputMode}
        maxLength={maxLength}
        aria-label={libelle}
        aria-invalid={erreur || undefined}
        value={valeur}
        disabled={desactive}
        placeholder={placeholder}
        onChange={(e) => changer(filtre ? filtre(e.target.value) : e.target.value)}
        onBlur={() => setVu(true)}
        className={cx(className, erreur && "ring-2 ring-rouge-400")}
      />
      {erreur && <span className="text-[11px] text-rouge-600">{message}</span>}
    </span>
  );
}

const SaisieAnnee = (p: { valeur: string; changer: (v: string) => void; desactive?: boolean; className?: string; "aria-label"?: string }) => (
  <SaisieControlee
    {...p}
    inputMode="numeric"
    maxLength={4}
    placeholder="Ex. 2015"
    filtre={(v) => v.replace(/\D/g, "").slice(0, 4)}
    faux={anneeFausse}
    message={`Une année sur quatre chiffres, au plus ${new Date().getFullYear()}.`}
  />
);

export function SaisieRubrique({
  ch,
  valeur,
  changer,
  requis,
  manquant,
  desactive,
  departementId,
  extraLigne,
}: {
  ch: ChampFiche;
  valeur: unknown;
  changer: (v: unknown) => void;
  requis: boolean;
  /** Tableau : une case de plus au bout de chaque ligne (l'acte de naissance de l'enfant…). */
  extraLigne?: (i: number) => React.ReactNode;
  /** Rubrique obligatoire encore vide (après une tentative d'enregistrement). */
  manquant: boolean;
  desactive?: boolean;
  /** Département de la fiche : il restreint la liste des écoles, inspections et localités. */
  departementId?: number | null;
}) {
  const { refs } = useSession();
  const aide = [ch.aide, ch.exemple && `Ex. ${ch.exemple}`].filter(Boolean).join(" ");
  const libelle = `${ch.libelle}${requis ? " *" : ""}`;
  const erreur = manquant ? "À remplir" : null;
  const large = ch.type === "LIGNES" || ch.type === "LISTE_MULTIPLE" || ch.type === "TABLEAU";
  let saisie: React.ReactNode;
  switch (ch.type) {
    case "LISTE": {
      const v = enTexte(valeur);
      const horsListe = !!v && !ch.options.some((o) => o.code === v);
      saisie = (
        <div className="flex flex-col gap-1.5">
          <Liste
            value={horsListe ? "__AUTRE__" : v}
            disabled={desactive}
            onChange={(e) => changer(e.target.value === "__AUTRE__" ? " " : e.target.value || null)}
            vide="— Choisir —"
            options={[...ch.options.map((o) => ({ valeur: o.code, libelle: o.libelle })), ...(ch.autreValeur ? [{ valeur: "__AUTRE__", libelle: "Autre (à préciser)…" }] : [])]}
          />
          {horsListe && <Saisie value={v.trim()} disabled={desactive} onChange={(e) => changer(e.target.value || " ")} placeholder="Précisez" />}
        </div>
      );
      break;
    }
    case "LISTE_MULTIPLE": {
      const vals = Array.isArray(valeur) ? (valeur as string[]) : [];
      const autres = vals.filter((x) => !ch.options.some((o) => o.code === x));
      saisie = (
        <div className="space-y-2 rounded-xl bg-zinc-100/80 px-3 py-2">
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {ch.options.map((o) => (
              <label key={o.code} className="flex items-center gap-1.5 text-[13px]">
                <input
                  type="checkbox"
                  className="size-4 accent-marque-600"
                  disabled={desactive}
                  checked={vals.includes(o.code)}
                  onChange={(e) => changer(e.target.checked ? [...vals, o.code] : vals.filter((x) => x !== o.code))}
                />
                {o.libelle}
              </label>
            ))}
          </div>
          {ch.autreValeur && (
            <Saisie
              value={autres.join(" ; ")}
              disabled={desactive}
              onChange={(e) =>
                changer([
                  ...vals.filter((x) => ch.options.some((o) => o.code === x)),
                  ...e.target.value
                    .split(";")
                    .map((s) => s.trim())
                    .filter(Boolean),
                ])
              }
              placeholder="Autres (séparés par « ; »)"
              className="bg-white"
            />
          )}
        </div>
      );
      break;
    }
    case "LIGNES":
      saisie = (
        <Zone
          value={Array.isArray(valeur) ? (valeur as string[]).join("\n") : enTexte(valeur)}
          disabled={desactive}
          onChange={(e) => changer(e.target.value.split("\n"))}
          placeholder="Une ligne par élément"
        />
      );
      break;
    case "TABLEAU":
      saisie = <SaisieTableau ch={ch} valeur={valeur} changer={changer} desactive={desactive} extraLigne={extraLigne} />;
      break;
    case "DEPARTEMENT":
      saisie = (
        <Liste
          value={enTexte(valeur)}
          disabled={desactive}
          onChange={(e) => changer(e.target.value || null)}
          vide="— Choisir —"
          options={refs.departements.map((d) => ({ valeur: d.code, libelle: d.nom }))}
        />
      );
      break;
    case "DATE":
      // Date tapée au clavier ; le calendrier ne s'ouvre qu'avec son bouton (DG, 30/10/2026)
      saisie = <SaisieDate aria-label={ch.libelle} value={enTexte(valeur)} disabled={desactive} onChange={(v) => changer(v || null)} />;
      break;
    case "NOMBRE":
      saisie = <Saisie inputMode="numeric" value={enTexte(valeur)} disabled={desactive} onChange={(e) => changer(e.target.value.replace(/[^\d]/g, "") || null)} placeholder={ch.exemple ? `Ex. ${ch.exemple}` : undefined} />;
      break;
    case "TEXTE":
      if (ANNEES.has(ch.code)) {
        saisie = <SaisieAnnee aria-label={ch.libelle} valeur={enTexte(valeur)} changer={(v) => changer(v || null)} desactive={desactive} />;
        break;
      }
      if (!ch.referentiel && SUGGESTIONS[ch.code]) {
        saisie = (
          <SaisieReferentiel
            liste={SUGGESTIONS[ch.code].liste}
            avertissement={SUGGESTIONS[ch.code].avertissement}
            valeur={enTexte(valeur)}
            changer={(v) => changer(v || null)}
            desactive={desactive}
            placeholder={ch.exemple ? `Ex. ${ch.exemple}` : undefined}
          />
        );
        break;
      }
      if (ch.referentiel) {
        saisie = (
          <SaisieReferentiel
            liste={ch.referentiel}
            valeur={enTexte(valeur)}
            changer={(v) => changer(v || null)}
            departementId={["ETABLISSEMENT", "INSPECTION", "LOCALITE"].includes(ch.referentiel) ? departementId : null}
            desactive={desactive}
            placeholder={ch.exemple ? `Ex. ${ch.exemple}` : undefined}
          />
        );
        break;
      }
      saisie = (
        <Saisie
          type="text"
          value={enTexte(valeur)}
          disabled={desactive}
          onChange={(e) => changer(e.target.value)}
          placeholder={ch.exemple ? `Ex. ${ch.exemple}` : undefined}
        />
      );
      break;
    case "TELEPHONE":
      // Chiffres, espaces, « + » et « / » (deux numéros) seulement
      saisie = (
        <SaisieControlee
          inputMode="tel"
          aria-label={ch.libelle}
          valeur={enTexte(valeur)}
          changer={(v) => changer(v || null)}
          filtre={(v) => v.replace(/[^\d\s+/]/g, "")}
          faux={telephoneFaux}
          message="Numéro incomplet ou trop long : 9 chiffres au Congo (ex. 06 649 12 52), deux numéros séparés par « / »."
          desactive={desactive}
          placeholder={ch.exemple ? `Ex. ${ch.exemple}` : "Ex. 06 649 12 52"}
        />
      );
      break;
    case "EMAIL":
      saisie = (
        <SaisieControlee
          type="email"
          inputMode="email"
          aria-label={ch.libelle}
          valeur={enTexte(valeur)}
          changer={(v) => changer(v.trim() || null)}
          faux={emailFaux}
          message="Adresse e-mail incomplète (ex. nom@exemple.com)."
          desactive={desactive}
          placeholder={ch.exemple ? `Ex. ${ch.exemple}` : "Ex. nom@exemple.com"}
        />
      );
      break;
    default:
      saisie = (
        <Saisie
          type="text"
          value={enTexte(valeur)}
          disabled={desactive}
          onChange={(e) => changer(e.target.value)}
          placeholder={ch.exemple ? `Ex. ${ch.exemple}` : undefined}
        />
      );
  }
  // Noms et prénoms : deux cases, chacune son libellé (« Nom(s) », « Prénom(s) »)
  if (ch.code === "NOMS_PRENOMS" && ch.type === "TEXTE")
    return (
      <div id={`champ-${ch.code}`} className="scroll-mt-24 transition-shadow sm:col-span-2">
        <SaisieNom valeur={enTexte(valeur)} changer={(v) => changer(v || null)} desactive={desactive} requis={requis} erreur={erreur} aide={aide || undefined} />
      </div>
    );
  // Repère de la rubrique : « Corriger » (anomalies de la fiche) y mène directement
  return (
    <div id={`champ-${ch.code}`} className={cx("scroll-mt-24 transition-shadow", large ? "col-span-full" : ch.code === "NOMS_PRENOMS" ? "sm:col-span-2" : undefined)}>
      <Champ libelle={libelle} aide={aide || undefined} erreur={erreur}>
        {saisie}
      </Champ>
    </div>
  );
}

/* ------------------------------ Noms et prénoms ------------------------------ */

const lettres = (m: string) => m.replace(/[^\p{L}]/gu, "");
const enMajuscules = (m: string) => !!lettres(m) && lettres(m) === lettres(m).toUpperCase();
/** « jEAN-pierre » → « Jean-Pierre » : majuscule au début de chaque prénom. */
export const prenomsJolis = (t: string) => t.toLowerCase().replace(/(^|[\s'’-])(\p{L})/gu, (_, sep: string, l: string) => sep + l.toUpperCase());

/** « MOUKOKO Jean Pierre » → nom « MOUKOKO », prénoms « Jean Pierre » (tout en majuscules : tout dans le nom). */
export function couperNom(v: string) {
  const mots = v.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  let n = 0;
  while (n < mots.length && enMajuscules(mots[n])) n++;
  return { nom: mots.slice(0, n).join(" "), prenoms: mots.slice(n).join(" ") };
}

/**
 * Le nom et les prénoms dans deux cases (DG, 24/10/2026) : le NOM s'écrit tout seul en majuscules,
 * les Prénoms avec une majuscule au début ; on voit ainsi où finit le nom, même avec plusieurs noms.
 */
function SaisieNom({
  valeur,
  changer,
  desactive,
  requis,
  erreur,
  aide,
}: {
  valeur: string;
  changer: (v: string) => void;
  desactive?: boolean;
  requis?: boolean;
  erreur?: string | null;
  aide?: string;
}) {
  const [p, setP] = useState(() => couperNom(valeur));
  const maj = (x: { nom: string; prenoms: string }) => {
    setP(x);
    changer(`${x.nom.toUpperCase()} ${x.prenoms}`.replace(/\s+/g, " ").trim());
  };
  const toutEnMajuscules = !!p.nom && !p.prenoms && p.nom.includes(" ");
  return (
    <div className="space-y-1">
      <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
        <Champ libelle={`Nom(s)${requis ? " *" : ""}`} erreur={erreur}>
          <Saisie value={p.nom.toUpperCase()} disabled={desactive} onChange={(e) => maj({ ...p, nom: e.target.value.toUpperCase() })} placeholder="NOM (ex. MOUKOKO)" />
        </Champ>
        <Champ libelle="Prénom(s)">
          <Saisie value={p.prenoms} disabled={desactive} onChange={(e) => maj({ ...p, prenoms: prenomsJolis(e.target.value) })} placeholder="Prénoms (ex. Jean Pierre)" />
        </Champ>
      </div>
      {aide && <p className="text-[11px] text-zinc-400">{aide}</p>}
      {toutEnMajuscules && <p className="text-[11px] text-or-700">Tout est écrit en majuscules : laissez le nom à gauche et écrivez les prénoms dans la case de droite.</p>}
    </div>
  );
}

/* ------------------------------ Tableau (promotions, affectations, enfants…) ------------------------------ */

type LigneTableau = Record<string, unknown>;

/**
 * Lignes d'un tableau : un ancien historique en texte (« Arrêté n° 12 du 03/02/2020 ») devient une
 * ligne ; une ancienne valeur d'une liste (« CEPE » d'une liste de diplômes) va dans la case de la liste.
 */
export function lignesTableau(ch: ChampFiche, v: unknown): LigneTableau[] {
  if (!Array.isArray(v)) return [];
  const texte = ch.colonnes.find((c) => c.type === "TEXTE") ?? ch.colonnes[0];
  const liste = ch.colonnes.find((c) => c.type === "LISTE");
  return v.map((l) => {
    if (l && typeof l === "object") return l as LigneTableau;
    if (liste?.options.some((o) => o.code === String(l))) return { [liste.code]: String(l) };
    return texte ? { [texte.code]: String(l) } : {};
  });
}

/** Une ligne par élément (une promotion : date, texte, nature), ajoutée ou retirée à la main. */
function SaisieTableau({
  ch,
  valeur,
  changer,
  desactive,
  extraLigne,
}: {
  ch: ChampFiche;
  valeur: unknown;
  changer: (v: unknown) => void;
  desactive?: boolean;
  extraLigne?: (i: number) => React.ReactNode;
}) {
  const lignes = lignesTableau(ch, valeur);
  const maj = (i: number, code: string, v: unknown) => changer(lignes.map((l, j) => (j === i ? { ...l, [code]: v === "" ? null : v } : l)));
  const grille = { gridTemplateColumns: `repeat(${ch.colonnes.length}, minmax(0, 1fr))${extraLigne ? " 10.5rem" : ""} 2rem` };
  return (
    <div className="space-y-2 rounded-xl bg-zinc-100/80 p-2">
      {!!lignes.length && (
        <div className="hidden gap-2 px-1 text-[11px] font-medium text-zinc-400 sm:grid" style={grille}>
          {ch.colonnes.map((c) => (
            <span key={c.code}>{c.libelle}</span>
          ))}
          {extraLigne && <span>Pièce</span>}
        </div>
      )}
      {lignes.map((l, i) => (
        <div key={i} className="grid gap-2 sm:items-center" style={grille}>
          {ch.colonnes.map((c) =>
            c.type === "LISTE" ? (
              <Liste
                key={c.code}
                aria-label={c.libelle}
                value={enTexte(l[c.code])}
                disabled={desactive}
                onChange={(e) => maj(i, c.code, e.target.value)}
                vide="—"
                options={[
                  ...c.options.map((o) => ({ valeur: o.code, libelle: o.libelle })),
                  ...(l[c.code] && !c.options.some((o) => o.code === l[c.code]) ? [{ valeur: String(l[c.code]), libelle: String(l[c.code]) }] : []),
                ]}
                className="bg-white"
              />
            ) : c.type === "DATE" ? (
              // Date au clavier ; le calendrier par son bouton seulement
              <SaisieDate key={c.code} aria-label={c.libelle} value={enTexte(l[c.code])} disabled={desactive} onChange={(v) => maj(i, c.code, v)} className="[&>input]:bg-white" />
            ) : ANNEES.has(`${ch.code}.${c.code}`) ? (
              <SaisieAnnee key={c.code} aria-label={c.libelle} valeur={enTexte(l[c.code])} changer={(v) => maj(i, c.code, v)} desactive={desactive} className="bg-white" />
            ) : SUGGESTIONS[`${ch.code}.${c.code}`] ? (
              <SaisieReferentiel
                key={c.code}
                liste={SUGGESTIONS[`${ch.code}.${c.code}`].liste}
                avertissement={SUGGESTIONS[`${ch.code}.${c.code}`].avertissement}
                valeur={enTexte(l[c.code])}
                changer={(v) => maj(i, c.code, v)}
                desactive={desactive}
                placeholder={c.libelle}
              />
            ) : (
              <Saisie
                key={c.code}
                aria-label={c.libelle}
                placeholder={c.libelle}
                type="text"
                inputMode={c.type === "NOMBRE" ? "numeric" : undefined}
                value={enTexte(l[c.code])}
                disabled={desactive}
                onChange={(e) => maj(i, c.code, e.target.value)}
                className="bg-white"
              />
            ),
          )}
          {extraLigne?.(i)}
          <button
            type="button"
            disabled={desactive}
            title="Retirer cette ligne"
            onClick={(e) => {
              e.preventDefault();
              changer(lignes.filter((_, j) => j !== i));
            }}
            className="justify-self-center rounded-full p-1 text-zinc-400 hover:bg-rouge-100 hover:text-rouge-600"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        disabled={desactive}
        onClick={(e) => {
          e.preventDefault();
          changer([...lignes, {}]);
        }}
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-medium text-marque-700 hover:bg-white"
      >
        <Plus className="size-3.5" /> Ajouter une ligne
      </button>
    </div>
  );
}

/* ------------------------------ Choix d'une structure (école, inspection…) ------------------------------ */

export interface StructureCourte {
  id: number;
  nom: string;
  sigle: string;
  type: string;
  departementId: number | null;
  parentId?: number | null;
  cycle?: string | null;
  localite?: string | null;
}

const cleRecherche = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase();

/**
 * Choix d'une structure de l'organigramme avec recherche : des milliers d'écoles ne tiennent pas
 * dans une liste déroulante. On filtre par département et on tape quelques lettres du nom.
 */
export function ChoixStructure({
  structures,
  valeur,
  changer,
  desactive,
  vide = "Aucune",
}: {
  structures: StructureCourte[];
  valeur: string;
  changer: (id: string) => void;
  desactive?: boolean;
  /** null : le choix est obligatoire (pas de « Retirer »). */
  vide?: string | null;
}) {
  const { refs } = useSession();
  const choisie = structures.find((s) => String(s.id) === valeur);
  const [dep, setDep] = useState<string>(choisie?.departementId ? String(choisie.departementId) : "");
  const [q, setQ] = useState("");
  const [ouvert, setOuvert] = useState(false);
  const parId = new Map(structures.map((s) => [s.id, s]));
  const mots = cleRecherche(q).split(/\s+/).filter(Boolean);
  const trouvees = structures
    .filter((s) => !dep || String(s.departementId) === dep)
    .filter((s) => mots.every((m) => cleRecherche(`${s.nom} ${s.sigle} ${s.localite ?? ""}`).includes(m)))
    .slice(0, 60);
  const decrire = (s: StructureCourte) => {
    const parent = s.parentId ? parId.get(s.parentId) : undefined;
    return [parent?.sigle, s.localite, refs.departements.find((d) => d.id === s.departementId)?.nom].filter(Boolean).join(" · ");
  };
  return (
    <div className="space-y-2">
      {choisie ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-marque-50 px-3 py-2 text-[13px]">
          <span className="font-medium text-marque-700">{choisie.nom}</span>
          <span className="text-[11px] text-zinc-500">{decrire(choisie)}</span>
          {!desactive && (
            <span className="ml-auto flex gap-3">
              <button type="button" className="text-[12px] font-medium text-marque-700 hover:underline" onClick={() => setOuvert((x) => !x)}>
                Changer
              </button>
              {vide !== null && (
                <button type="button" className="text-[12px] text-zinc-500 hover:underline" onClick={() => changer("")}>
                  Retirer
                </button>
              )}
            </span>
          )}
        </div>
      ) : (
        !ouvert && (
          <button
            type="button"
            disabled={desactive}
            className="w-full rounded-xl border border-dashed border-zinc-300 bg-white px-3 py-2 text-left text-[13px] text-zinc-500 hover:border-marque-300"
            onClick={() => setOuvert(true)}
          >
            {vide ?? "À choisir"} : cliquez pour chercher dans l’organigramme
          </button>
        )
      )}
      {ouvert && !desactive && (
        <div className="space-y-2 rounded-xl bg-zinc-100/80 p-2">
          <div className="grid gap-2 sm:grid-cols-[12rem_1fr]">
            <Liste value={dep} onChange={(e) => setDep(e.target.value)} vide="Tous les départements" options={refs.departements.map((d) => ({ valeur: d.id, libelle: d.nom }))} className="bg-white" />
            <Saisie autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom de l’école, de l’inspection, localité…" className="bg-white" />
          </div>
          <ul className="max-h-64 divide-y divide-zinc-200/60 overflow-y-auto rounded-lg bg-white">
            {trouvees.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className="w-full px-3 py-1.5 text-left text-[13px] hover:bg-marque-50"
                  onClick={() => {
                    changer(String(s.id));
                    setOuvert(false);
                    setQ("");
                  }}
                >
                  <span className="font-medium">{s.nom}</span> <span className="text-[11px] text-zinc-400">{decrire(s)}</span>
                </button>
              </li>
            ))}
            {!trouvees.length && (
              <li className="px-3 py-2 text-[12px] text-zinc-500">Aucune structure trouvée. L’école n’est peut-être pas encore dans l’organigramme (Administration › Organigramme › importer les établissements).</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
