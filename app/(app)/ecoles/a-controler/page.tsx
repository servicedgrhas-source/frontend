"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ControleEcoles } from "@/components/ecoles/controle-ecoles";
import { useSession } from "@/components/session";
import { Alerte, Chargement, EnTete } from "@/components/ui";
import { accesDonne } from "@/lib/espaces";
import { peut } from "@/lib/libelles";

/*
 * Écoles à contrôler, dans Structures scolaires (DG, 18/11/2026 : à sa place, près des écoles) :
 * écoles qui se ressemblent, écoles hors organigramme (à proposer au DG), décisions. Des décisions de
 * comptage, et une école rattachée à l'organigramme met à jour les fiches (19/11/2026).
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
        titre="Écoles à contrôler"
        sousTitre="Les écoles qui se ressemblent et celles qui ne sont pas dans l’organigramme. On tranche ici, et nos bases suivent : une école rattachée à une école de l’organigramme met à jour les fiches de ses personnes (lieu de service, DDEPPSA). Une vraie école absente de l’organigramme est proposée au DG."
      />
      <ControleEcoles key={onglet} ongletInitial={onglet} />
    </div>
  );
}
