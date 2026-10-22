import { Suspense } from "react";
import { Chargement } from "@/components/ui";
import { ImpressionListes } from "./vue";

export default function Page() {
  return (
    <Suspense fallback={<Chargement />}>
      <ImpressionListes />
    </Suspense>
  );
}
