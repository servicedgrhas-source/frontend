import { Suspense } from "react";
import { Chargement } from "@/components/ui";
import { ImpressionCarriere } from "./vue";

export default function Page() {
  return (
    <Suspense fallback={<Chargement />}>
      <ImpressionCarriere />
    </Suspense>
  );
}
