"use client";

import { SpecimenVisa, type StyleVisa } from "@/components/visa-specimen";
import { Fragment, useMemo } from "react";
import { dateLongue } from "@/lib/libelles";
import type { NoteDetail } from "@/lib/types";
import { PagesA4, type Bloc, type Tableau } from "./pages-a4";

const SEP = <div className="leading-none">-----------------</div>;

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
  promotion: 15,
  accueil: 19,
};

/** Rendu officiel d'une note de service, découpé en pages A4 par le système. */
export function NoteImprimable({ note, visas = true }: { note: NoteDetail; /** Imprimer avec les spécimens de visa (sinon sans). */ visas?: boolean }) {
  const { blocs, tableaux } = useMemo(() => construire(note, visas), [note, visas]);
  return (
    <PagesA4
      key={`${note.id}-${note.statut}-${note.contenu.total}-${note.introduction.length}-${visas}`}
      blocs={blocs}
      tableaux={tableaux}
      classeFeuille="feuille-note"
      pied={{ gauche: note.contenu.piedDePage, droite: note.entete.piedDroite }}
    />
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

  // Colonnes du tableau (dans l'ordre d'affichage), le nom prend la place restante
  const cles = c.classification
    ? ["n", "nom", ...(avecGrade ? ["grade"] : []), "cat", "ech", "echl", ...(refCol ? ["reference"] : []), ...autres.map((x) => x.cle)]
    : ["n", "nom", ...colsMutation.map((x) => x.cle)];
  const colonnes = (
    <colgroup>
      {cles.map((k) => (
        <col key={k} style={k === "nom" ? undefined : { width: `${LARGEUR[k] ?? 20}mm` }} />
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
            <div className="w-[58%] text-center font-semibold leading-tight">
              <div>MINISTERE DE L’ENSEIGNEMENT PRESCOLAIRE,</div>
              <div>PRIMAIRE, SECONDAIRE ET DE L’ALPHABETISATION</div>
              {SEP}
              <div>CABINET</div>
              {SEP}
              <AvecVisa visa={v.DG} style="DG">
                <div>DIRECTION GENERALE DES RESSOURCES HUMAINES</div>
                <div>ET DE L’ADMINISTRATION SCOLAIRE</div>
              </AvecVisa>
              {SEP}
              <AvecVisa visa={v.DIRECTION} style="DIRECTION">
                <div>DIRECTION DES RECRUTEMENTS</div>
                <div>ET DU SUIVI DES CARRIERES</div>
              </AvecVisa>
              {SEP}
              {/* Le service suit le numéro : « …-DRSC-SR » (une note signée avant garde son en-tête) */}
              {/-SR$/.test(e.reference) && (
                <>
                  <AvecVisa visa={v.SERVICE} style="SERVICE">
                    <div>SERVICE DES RECRUTEMENTS</div>
                  </AvecVisa>
                  {SEP}
                </>
              )}
              <div className="mt-1 font-semibold">
                N°{note.numero ? ` ${note.numero}` : "__________"}/{e.reference}
              </div>
            </div>
            <div className="w-[34%] text-center leading-tight">
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
    tableaux[tableau] = { colonnes, entete, className: "text-[10pt]", enteteUneFois: true };
    blocs.push({
      cle: `s${i}`,
      type: "libre",
      garderAvecSuivant: true,
      contenu: (
        <div className={s.titre ? "pt-4" : "pt-3"}>
          {s.titre && <h2 className="mb-1 font-bold">{s.titre}</h2>}
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
            <td className="text-center">{l.n}</td>
            <td>{l.nom}</td>
            {c.classification ? (
              <>
                {avecGrade && <td>{l.grade}</td>}
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
        <div className="space-y-1 pt-4">
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
        // « Fait à », le titre et le nom alignés sur la même verticale ;
        // « Ampliations : » sur la même ligne que le nom du signataire
        <div className="grid grid-cols-[1fr_44%] gap-x-8 pt-6">
          <div />
          {/* Sans date : « le » seul, la date est écrite à la main (DG, 31/10/2026) */}
          <div>Fait à {e.lieu}, le{note.dateSignature ? ` ${dateLongue(note.dateSignature)}` : ""}</div>
          <div />
          <div className="mt-2">{e.signataireTitre}</div>
          {/* Plus d'espace pour la signature (DG, 19/10/2026), plus deux lignes (31/10/2026) */}
          <div className="self-end text-[10pt] font-bold underline" style={{ marginTop: "calc(6rem + 3em)" }}>Ampliations :</div>
          <div className="self-end font-bold" style={{ marginTop: "calc(6rem + 3em)" }}>{e.signataireNom}</div>
          <table className="ampliations w-auto justify-self-start text-[9pt]">
            <tbody>
              {c.ampliations.map((a) => (
                <tr key={a.libelle}>
                  <td>{a.libelle}</td>
                  <td>{a.nombre}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div />
        </div>
      ),
    },
  );
  return { blocs, tableaux };
}
