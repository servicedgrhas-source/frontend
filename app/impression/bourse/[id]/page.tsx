import { Suspense } from "react";
import { Chargement } from "@/components/ui";
import { ImpressionEtatPaiement } from "./vue";

export default function Page() {
  return (
    <Suspense fallback={<Chargement />}>
      <ImpressionEtatPaiement />
    </Suspense>
  );
}
