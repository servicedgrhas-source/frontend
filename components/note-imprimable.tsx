"use client";

import { SpecimenVisa, type StyleVisa } from "@/components/visa-specimen";
import { Fragment, useMemo } from "react";
import { dateLongue } from "@/lib/libelles";
import { largeurTexte, plusLongMot } from "@/lib/largeur-texte";
import type { NoteDetail } from "@/lib/types";
import { PagesA4, type Bloc, type Tableau } from "./pages-a4";

const SEP = <div className="leading-none">-----------------</div>;

/** L'en-tête habituel ; le service ne vient que si la référence finit par « -SR ». */
export function enteteParDefaut(reference: string) {
  return [
    "MINISTERE DE L’ENSEIGNEMENT PRESCOLAIRE,",
    "PRIMAIRE, SECONDAIRE ET DE L’ALPHABETISATION",
    "---",
    "CABINET",
    "---",
    "DIRECTION GENERALE DES RESSOURCES HUMAINES",
    "ET DE L’ADMINISTRATION SCOLAIRE",
    "---",
    "DIRECTION DES RECRUTEMENTS",
    "ET DU SUIVI DES CARRIERES",
    "---",
    ...(/-SR[./ ]*$/.test(reference) ? ["SERVICE DES RECRUTEMENTS", "---"] : []),
  ];
}

/** Blocs entre les traits, avec le visa de chacun (null : un trait) — comme dans Word. */
export function blocsEntete(lignes: string[]) {
  const res: ({ lignes: string[]; visa: "DG" | "DIRECTION" | "SERVICE" | null } | null)[] = [];
  let cour: string[] = [];
  const fermer = () => {
    if (!cour.length) return;
    const t = cour.join(" ").toUpperCase();
    res.push({ lignes: cour, visa: /DIRECTION\s+GENERALE/.test(t) ? "DG" : /^DIRECTION\b/.test(t) ? "DIRECTION" : /^SERVICE\b/.test(t) ? "SERVICE" : null });
    cour = [];
  };
  for (const l of lignes) {
    if (l === "---") {
      fermer();
      res.push(null);
    } else cour.push(l);
  }
  fermer();
  return res;
}

/** Largeur des colonnes (mm) : la mise en page fixe garantit le découpage en pages. */
const LARGEUR: Record<string, number> = {
  n: 7,
  grade: 16,
  cat: 8,
  ech: 9,
  echl: 10,
  reference: 31,
  cycle: 19,
  specialite: 21,
  etablissement: 26,
  structure: 26,
  obs: 16,
  ge: 13,
  matricule: 18,
  // Noms d'établissements longs (« Lycée Nestor MAKOUDZIWOLO ») : DG, 30/10/2026
  ancienPoste: 34,
  nouveauPoste: 34,
  vague: 11,
  origine: 19,
  naissance: 20,
  lieu: 22,
  promotion: 19,
  accueil: 19,
  // Notes d'enrôlement : « BET-Préscolaire », « CFEEN-Préscolaire » (cadrage du 05/11/2026)
  diplome: 26,
};

/** Tailles de police essayées, de la normale à 80 % (lignes de mutation hautes) : la plus grande qui donne la meilleure mise en page. */
const ECHELLES = [1, 0.97, 0.94, 0.91, 0.88, 0.85, 0.82, 0.8];

/** Rendu officiel d'une note de service, découpé en pages A4 par le système. */
export function NoteImprimable({
  note,
  visas = true,
  surEchelle,
}: {
  note: NoteDetail;
  /** Imprimer avec les spécimens de visa (sinon sans). */
  visas?: boolean;
  /** Taille de police retenue pour la note (le Word la reprend). */
  surEchelle?: (echelle: number) => void;
}) {
  const { blocs, tableaux } = useMemo(() => construire(note, visas), [note, visas]);
  const sylfaen = note.entete.police === "Sylfaen";
  return (
    // Police réglée dans les paramètres : Times New Roman (d'origine) ou Sylfaen (DG, 01/11/2026)
    <div style={sylfaen ? ({ "--font-note": "Sylfaen, 'Times New Roman', Times, serif" } as React.CSSProperties) : undefined}>
      <PagesA4
        key={`${note.id}-${note.statut}-${note.contenu.total}-${note.introduction.length}-${visas}-${note.entete.police ?? ""}`}
        blocs={blocs}
        tableaux={tableaux}
        classeFeuille="feuille-note"
        pied={{ gauche: note.contenu.piedDePage, droite: note.entete.piedDroite }}
        // Notes d'enrôlement : une police un peu plus petite plutôt qu'une page presque vide
        // (une note de 1 à 4 personnes tient sur une page) — 06/11/2026
        echelles={note.module === "ENROLEMENT" || note.module === "MUTATION" ? ECHELLES : undefined}
        surEchelle={surEchelle}
      />
    </div>
  );
}

/**
 * Visas de l'en-tête (DG, 30/10/2026) : à droite du service des recrutements (chef de service, sinon
 * chef de bureau), de la direction des recrutements (directeur), de la direction générale (DG qui
 * a validé). Seuls les avis « conforme » (et la validation du DG) donnent un visa.
 */
function visasDe(note: NoteDetail) {
  const avis = (n: string) => (note.conformite ?? []).find((x) => x.niveau === n && x.conforme);
  const service = avis("SERVICE") ?? avis("BUREAU");
  const direction = avis("DIRECTION");
  return {
    SERVICE: service ? { nom: service.par, le: service.le } : null,
    DIRECTION: direction ? { nom: direction.par, le: direction.le } : null,
    DG: note.valideePar ? { nom: note.valideePar, le: note.valideeLe } : null,
  };
}

/** Une entité de l'en-tête, avec le visa de son responsable juste à sa droite. */
function AvecVisa({ visa, style, children }: { visa: { nom: string; le: string | null } | null; style: StyleVisa; children: React.ReactNode }) {
  return (
    <div className="relative">
      <span className="relative inline-block">
        {children}
        {visa && <SpecimenVisa style={style} nom={visa.nom} date={visa.le} className="absolute top-1/2 left-full ml-1 -translate-y-1/2" />}
      </span>
    </div>
  );
}

function construire(note: NoteDetail, avecVisas: boolean) {
  const v = avecVisas ? visasDe(note) : { SERVICE: null, DIRECTION: null, DG: null };
  const c = note.contenu;
  const e = note.entete;
  const autres = c.colonnes.filter((x) => !["nom", "grade", "reference"].includes(x.cle));
  const avecGrade = c.colonnes.some((x) => x.cle === "grade");
  const refCol = c.colonnes.find((x) => x.cle === "reference");
  const colsMutation = c.colonnes.filter((x) => x.cle !== "nom");
  const repere = `${new Date().toLocaleDateString("fr-FR")}/${c.repere}`;
  const intro = c.introduction.split(note.anneeScolaire);

  // Spécialité : assez large pour son plus long mot, jamais coupé au milieu (« Mathématiques »,
  // DG 31/10/2026) ; « Histoire-Géographie » passe à la ligne après le trait d'union
  const elargi = note.entete.police === "Sylfaen" ? 1.06 : 1;
  const motSpecialite =
    plusLongMot(
      c.sections.flatMap((s) => s.lignes.map((l) => String(l.specialite ?? ""))),
      10,
    ) * elargi;
  // Grade : toujours sur une seule ligne (« Com. des SAF.C. », DG 31/10/2026)
  const plusLongGrade = Math.max(0, ...c.sections.flatMap((s) => s.lignes.map((l) => largeurTexte(String(l.grade ?? ""), 10)))) * elargi;
  // N° : le plus grand numéro tient sur une ligne (« 233 » et non « 23 / 3 », DG 01/11/2026)
  const plusLongNumero = Math.max(0, ...c.sections.flatMap((s) => s.lignes.map((l) => largeurTexte(String(l.n ?? ""), 10)))) * elargi;
  const largeur = (k: string) =>
    k === "n"
      ? Math.max(LARGEUR.n, Math.ceil(plusLongNumero + 3))
      : k === "specialite"
      ? Math.min(36, Math.max(LARGEUR.specialite, Math.ceil(motSpecialite + 3)))
      : k === "grade"
        ? Math.min(36, Math.max(LARGEUR.grade, Math.ceil(plusLongGrade + 3)))
        : (LARGEUR[k] ?? 20);
  // Colonnes du tableau (dans l'ordre d'affichage), le nom prend la place restante
  const cles = c.classification
    ? ["n", "nom", ...(avecGrade ? ["grade"] : []), "cat", "ech", "echl", ...(refCol ? ["reference"] : []), ...autres.map((x) => x.cle)]
    : ["n", "nom", ...colsMutation.map((x) => x.cle)];
  const colonnes = (
    <colgroup>
      {cles.map((k) => (
        <col key={k} style={k === "nom" ? undefined : { width: `${largeur(k)}mm` }} />
      ))}
    </colgroup>
  );
  const entete = c.classification ? (
    <>
      <tr>
        <th rowSpan={2}>N°</th>
        <th rowSpan={2}>Noms et prénoms</th>
        {avecGrade && <th rowSpan={2}>Grade</th>}
        <th colSpan={3}>Classification</th>
        {refCol && <th rowSpan={2}>{refCol.libelle}</th>}
        {autres.map((x) => (
          <th key={x.cle} rowSpan={2}>
            {x.libelle}
          </th>
        ))}
      </tr>
      <tr>
        {/* Sur une seule ligne, jamais « Ec/h » (DG, 31/10/2026) */}
        <th className="whitespace-nowrap" style={{ paddingInline: 1 }}>Cat</th>
        <th className="whitespace-nowrap" style={{ paddingInline: 1 }}>Ech</th>
        <th className="whitespace-nowrap" style={{ paddingInline: 1 }}>Echl</th>
      </tr>
    </>
  ) : (
    <tr>
      <th>N°</th>
      <th>Noms et prénoms</th>
      {colsMutation.map((x) => (
        <th key={x.cle}>{x.libelle}</th>
      ))}
    </tr>
  );

  const blocs: Bloc[] = [
    {
      cle: "entete",
      type: "libre",
      contenu: (
        <>
          <div className="text-center text-[8pt]">{repere}</div>
          <div className="mt-2 flex items-start justify-between gap-6 text-[10pt]">
            <div className="w-[60%] text-center font-semibold leading-tight">
              {/* Les lignes de l'en-tête, modifiables note par note (06/11/2026) ; les visas vont
                  sur la direction générale, la direction et le service */}
              {blocsEntete(e.lignes ?? enteteParDefaut(e.reference)).map((b, i) =>
                b === null ? (
                  <Fragment key={i}>{SEP}</Fragment>
                ) : b.visa ? (
                  <AvecVisa key={i} visa={v[b.visa]} style={b.visa}>
                    {b.lignes.map((l, j) => (
                      <div key={j}>{l}</div>
                    ))}
                  </AvecVisa>
                ) : (
                  <Fragment key={i}>
                    {b.lignes.map((l, j) => (
                      <div key={j}>{l}</div>
                    ))}
                  </Fragment>
                ),
              )}
              {/* Plus de place pour écrire le numéro (DG, 01/11/2026) ; la référence est un paramètre */}
              <div className="mt-1 whitespace-nowrap font-semibold">
                N°{note.numero ? ` ${note.numero}` : "______________________"}/{e.reference}
              </div>
            </div>
            {/* Un peu plus à droite (DG, 01/11/2026) */}
            <div className="w-[32%] text-center leading-tight">
              <div className="font-semibold">REPUBLIQUE DU CONGO</div>
              <div className="text-[9.5pt]">Unité-Travail-Progrès</div>
              {SEP}
            </div>
          </div>
          <h1 className="mt-5 text-center text-[16pt] font-bold tracking-wide">{c.titre}</h1>
        </>
      ),
    },
    {
      cle: "intro",
      type: "libre",
      garderAvecSuivant: true,
      ancre: true,
      contenu: (
        // Paragraphes « à l'américaine » : alignés à gauche, sans retrait, justifiés (demande du DG, 20/10/2026)
        <p className="mt-3 text-justify">
          {intro.map((morceau, i) => (
            <Fragment key={i}>
              {i > 0 && <strong>{note.anneeScolaire}</strong>}
              {morceau}
            </Fragment>
          ))}
        </p>
      ),
    },
  ];
  const tableaux: Record<string, Tableau> = {};

  c.sections.forEach((s, i) => {
    const tableau = `t${i}`;
    tableaux[tableau] = { colonnes, entete, className: "t-note", enteteUneFois: true };
    blocs.push({
      cle: `s${i}`,
      type: "libre",
      garderAvecSuivant: true,
      contenu: (
        <div className={s.titre ? "pt-4" : "pt-3"}>
          {s.titre && <h2 className="mb-1 font-bold">{s.titre}</h2>}
          {/* « Effectif : Quatre-vingt-deux (82) » sous le département (notes d'enrôlement) */}
          {s.effectif && <div className="mb-2 ml-4">Effectif : {s.effectif}</div>}
          {s.sousTitre && <h3 className="mb-1 ml-8 font-bold">{s.sousTitre}</h3>}
        </div>
      ),
    });
    for (const l of s.lignes)
      blocs.push({
        cle: `${tableau}-${l.id}`,
        type: "ligne",
        tableau,
        contenu: (
          <tr data-ligne={`${tableau}-${l.id}`}>
            <td className="whitespace-nowrap text-center">{l.n}</td>
            <td>{l.nom}</td>
            {c.classification ? (
              <>
                {avecGrade && <td className="whitespace-nowrap">{l.grade}</td>}
                <td className="text-center">{l.cat}</td>
                <td className="text-center">{l.ech}</td>
                <td className="text-center">{l.echl}</td>
                {refCol && <td className="text-center">{l.reference}</td>}
                {autres.map((x) => (
                  <td key={x.cle} className="text-center">
                    {l[x.cle]}
                  </td>
                ))}
              </>
            ) : (
              colsMutation.map((x) => (
                <td key={x.cle} className={x.cle === "ancienPoste" ? "" : "text-center"}>
                  {l[x.cle]}
                </td>
              ))
            )}
          </tr>
        ),
      });
  });

  blocs.push(
    {
      cle: "mentions",
      type: "libre",
      garderAvecPrecedent: true,
      contenu: (
        // Une ligne vide entre la fin du tableau et les mentions (DG, 31/10/2026)
        <div className="space-y-1" style={{ paddingTop: "calc(1rem + 1lh)" }}>
          {c.mentions.map((m) => (
            <p key={m} className="text-justify">
              {m}
            </p>
          ))}
        </div>
      ),
    },
    {
      cle: "signature",
      type: "libre",
      garderAvecPrecedent: true,
      contenu: (
        // « Fait à », le titre et le nom alignés sur la même verticale (3e colonne, aussi large que
        // la plus longue des trois lignes), poussés de deux tabulations vers la droite (DG, 31/10/2026) :
        // la 2e colonne (25 mm) rétrécit si une date longue ne tiendrait plus avant la marge.
        // « Ampliations : » sur la même ligne que le nom du signataire
        <div className="grid grid-cols-[calc(56%-2rem)_2rem_minmax(0,25mm)_max-content_minmax(0,1fr)] pt-6">
          {/* Sans date : « le » seul, la date est écrite à la main (DG, 31/10/2026) */}
          <div className="col-start-4 whitespace-nowrap">Fait à {e.lieu}, le{note.dateSignature ? ` ${dateLongue(note.dateSignature)}` : ""}</div>
          {/* Un peu d'espace sous « Fait à » (DG, 31/10/2026) */}
          <div className="col-start-4 mt-4 whitespace-nowrap">{e.signataireTitre}</div>
          {/* Plus d'espace pour la signature (DG, 19/10/2026), plus deux lignes (31/10/2026) */}
          <div className="t-note col-start-1 self-end font-bold underline" style={{ marginTop: "calc(6rem + 3em)" }}>Ampliations :</div>
          <div className="col-start-4 self-end whitespace-nowrap font-bold" style={{ marginTop: "calc(6rem + 3em)" }}>{e.signataireNom}</div>
          <table className="ampliations col-start-1 w-auto justify-self-start">
            <tbody>
              {c.ampliations.map((a) => (
                <tr key={a.libelle}>
                  <td>{a.libelle}</td>
                  <td>{a.nombre}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ),
    },
  );
  return { blocs, tableaux };
}
