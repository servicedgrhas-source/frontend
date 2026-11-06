import { Suspense } from "react";
import { Chargement } from "@/components/ui";
import { ImpressionVolontaires } from "./vue";

export default function Page() {
  return (
    <Suspense fallback={<Chargement />}>
      <ImpressionVolontaires />
    </Suspense>
  );
}
