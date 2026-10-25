import { Suspense } from "react";
import { Chargement } from "@/components/ui";
import { ImpressionEmploiDuTemps } from "./vue";

export default function Page() {
  return (
    <Suspense fallback={<Chargement />}>
      <ImpressionEmploiDuTemps />
    </Suspense>
  );
}
