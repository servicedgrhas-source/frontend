import { Suspense } from "react";
import { Chargement } from "@/components/ui";
import { ImpressionFichePriseEnCharge } from "./vue";

export default function Page() {
  return (
    <Suspense fallback={<Chargement />}>
      <ImpressionFichePriseEnCharge />
    </Suspense>
  );
}
