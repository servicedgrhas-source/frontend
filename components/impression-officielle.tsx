"use client";

/**
 * En-tête et signature des documents imprimés de la DGRHAS (dossier de carrière, bottin du
 * personnel, fiche d'évaluation, liste des codes des pièces…) : le ministère à gauche, la
 * République à droite, le titre du document au centre ; la signature du Directeur général en bas.
 */

const SEP = <div className="leading-none">-------------------</div>;

export function EnteteOfficielle({ titre, sousTitre }: { titre: string; sousTitre?: string }) {
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
      </div>
    </>
  );
}

/** « Fait à Brazzaville, le … », le titre du signataire, la place de la signature, son nom. */
export function SignatureOfficielle({ titre, nom, lieu }: { titre: string; nom?: string | null; lieu?: string | null }) {
  return (
    <div className="mt-3 flex justify-end text-[10.5pt]">
      <div className="w-[45%] text-center">
        <div>
          Fait à {lieu || "Brazzaville"}, le {new Date().toLocaleDateString("fr-FR")}
        </div>
        <div className="mt-1 font-bold">{titre}</div>
        <div className="h-12" />
        <div className="font-bold underline">{nom ?? ""}</div>
      </div>
    </div>
  );
}
