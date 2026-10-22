import { Suspense } from "react";
import { Coquille } from "@/components/session";
import { Chargement } from "@/components/ui";

// Les pages ne s'affichent qu'après vérification de la session (données
// sensibles) : la navigation vers cet espace est donc autorisée à attendre.
export const instant = false;

export default function LayoutApplication({ children }: { children: React.ReactNode }) {
  // La coquille lit l'URL courante (menu actif) : elle est rendue côté client.
  return (
    <Suspense fallback={<Chargement texte="Ouverture de la session…" />}>
      <Coquille>{children}</Coquille>
    </Suspense>
  );
}
