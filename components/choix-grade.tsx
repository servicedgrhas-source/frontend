"use client";

import { useSession } from "./session";
import { Champ, Liste } from "./ui";

/**
 * Grade d'une personne (DG, 31/10/2026) : par défaut celui de son diplôme ; à la demande, un des
 * autres grades rattachés au diplôme dans « Règles des diplômes et grades ».
 */
export function ChoixGrade({ diplomeCode, valeur, changer }: { diplomeCode: string | null; valeur: string; changer: (code: string) => void }) {
  const { refs } = useSession();
  const regle = refs.regles.find((r) => r.code === diplomeCode);
  const grades = refs.grades ?? [];
  const nom = (code: string | null) => {
    const g = grades.find((x) => x.code === code);
    return g ? `${g.libelle} (${g.abreviation}) · ${g.categorie ?? "?"}/${g.echelle ?? "?"}/${g.echelon ?? "?"}` : "aucun grade";
  };
  if (!regle) return null;
  const autres = regle.gradesAutres ?? [];
  // Sans diplôme (DG, 31/10/2026) : pas de grade par défaut, on donne le grade à la personne
  if (!regle.gradeCode && !autres.length)
    return (
      <Champ libelle="Grade">
        <div className="rounded-xl bg-or-100/40 px-3 py-2 text-[13px] text-zinc-700">
          Aucun grade n’est encore rattaché à « {regle.libelle} » : rattachez-en dans Administration › Règles des diplômes et grades (grade › Diplômes rattachés).
        </div>
      </Champ>
    );
  if (!autres.length)
    return (
      <Champ libelle="Grade" aide="Seul grade de ce diplôme. D’autres grades se rattachent au diplôme dans « Règles des diplômes et grades ».">
        <div className="rounded-xl bg-zinc-50 px-3 py-2 text-[13px]">{nom(regle.gradeCode)}</div>
      </Champ>
    );
  return (
    <Champ
      libelle="Grade"
      aide={
        regle.gradeCode
          ? "Par défaut : celui du diplôme. Un autre se choisit seulement si le texte ou la situation le demande."
          : `${regle.libelle} : choisissez le grade donné à la personne (elle va dans l’administration).`
      }
    >
      <Liste
        value={valeur}
        onChange={(e) => changer(e.target.value)}
        options={[
          { valeur: "", libelle: regle.gradeCode ? `Par défaut : ${nom(regle.gradeCode)}` : "— Choisir le grade —" },
          ...autres.map((c) => ({ valeur: c, libelle: nom(c) })),
        ]}
      />
    </Champ>
  );
}
