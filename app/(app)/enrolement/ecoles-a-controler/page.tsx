"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ControleEcoles } from "@/components/ecoles/controle-ecoles";
import { useSession } from "@/components/session";
import { Alerte, Chargement, EnTete } from "@/components/ui";
import { accesDonne } from "@/lib/espaces";
import { peut } from "@/lib/libelles";

/*
 * Écoles à contrôler, dans le volet Banque mondiale (17/11/2026) : écoles qui se ressemblent, noms à
 * harmoniser, écoles hors organigramme, décisions. Ce sont des décisions de comptage, propres à ce
 * volet : nos bases (fiches, organigramme) ne sont jamais modifiées.
 */
export default function Page() {
  return (
    <Suspense fallback={<Chargement />}>
      <EcolesAControler />
    </Suspense>
  );
}

function EcolesAControler() {
  const { profil } = useSession();
  const onglet = useSearchParams().get("controle") ?? undefined;
  if (!peut.traiter(profil.role) && !accesDonne(profil)) return <Alerte>Accès réservé aux agents de la DGRHAS.</Alerte>;
  return (
    <div className="space-y-4">
      <EnTete
        titre="Écoles à contrôler (Banque mondiale)"
        sousTitre="Les noms d’écoles écrits de plusieurs façons, les écoles qui se ressemblent, celles qui ne sont pas dans l’organigramme. On tranche ici pour compter juste dans les effectifs par école : rien n’est modifié dans nos bases."
      />
      <ControleEcoles key={onglet} ongletInitial={onglet} />
    </div>
  );
}
