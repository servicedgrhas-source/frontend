"use client";

/**
 * En-tête et signature des documents imprimés de la DGRHAS (dossier de carrière, bottin du
 * personnel, fiche d'évaluation, liste des codes des pièces…) : le ministère à gauche, la
 * République à droite, le titre du document au centre ; la signature du Directeur général en bas.
 */

/** « Édité le 28/10/2026 à 07:14 » : la date et l’heure où le document est produit (DG, 28/10/2026). */
export const editeLe = (d = new Date()) => `Édité le ${d.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).replace(" ", " à ")}`;

const SEP = <div className="leading-none">-------------------</div>;

export function EnteteOfficielle({
  titre,
  sousTitre,
  numero,
  sousNumero,
}: {
  titre: string;
  sousTitre?: string;
  /** N° du document (ex. N° de fiche), en gras sous le titre. */
  numero?: string | null;
  /** Sous le numéro (ex. date et heure de création de la fiche). */
  sousNumero?: string | null;
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-6 text-[9.5pt]">
        <div className="w-[58%] text-center font-bold leading-tight">
          <div>MINISTERE DE L’ENSEIGNEMENT PRESCOLAIRE, PRIMAIRE,</div>
          <div>SECONDAIRE ET DE L’ALPHABETISATION</div>
          {SEP}
          <div>CABINET</div>
          {SEP}
          <div>DIRECTION GENERALE DES RESSOURCES HUMAINES</div>
          <div>ET DE L’ADMINISTRATION SCOLAIRE</div>
          {SEP}
          <div>DIRECTION DES RECRUTEMENTS ET DU SUIVI DES CARRIERES</div>
          {SEP}
          <div>SERVICE DES RECRUTEMENTS</div>
          {SEP}
        </div>
        <div className="w-[34%] text-center leading-tight">
          <div className="font-bold">REPUBLIQUE DU CONGO</div>
          <div className="font-semibold">Unité-Travail-Progrès</div>
          {SEP}
        </div>
      </div>
      <div className="mt-6 mb-4 text-center">
        <div className="text-[14pt] font-bold">{titre}</div>
        {sousTitre && <div className="text-[10pt]">{sousTitre}</div>}
        {numero && <div className="mt-1 text-[12pt] font-bold">{numero}</div>}
        {sousNumero && <div className="text-[9.5pt]">{sousNumero}</div>}
      </div>
    </>
  );
}

/**
 * « Fait à Brazzaville, le … », le titre du signataire, la place de la signature, son nom : les trois
 * lignes commencent au même endroit (DG, 26/10/2026), une ligne vide sous la date, la place de la
 * signature sous le titre. Un seul bloc : il n'est jamais coupé entre deux pages.
 */
export function SignatureOfficielle({ titre, nom, lieu }: { titre: string; nom?: string | null; lieu?: string | null }) {
  return (
    <div className="mt-4 flex justify-end text-[10.5pt]" style={{ breakInside: "avoid" }}>
      <div className="mr-[6%] w-fit leading-[1.5]">
        <div>
          Fait à {lieu || "Brazzaville"}, le {new Date().toLocaleDateString("fr-FR")}
        </div>
        <div className="mt-[1.5em]">{titre}</div>
        <div className="h-[6.5em]" />
        <div className="font-bold">{nom ?? ""}</div>
      </div>
    </div>
  );
}
