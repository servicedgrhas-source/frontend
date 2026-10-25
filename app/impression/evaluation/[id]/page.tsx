import { Suspense } from "react";
import { Chargement } from "@/components/ui";
import { ImpressionEvaluation } from "./vue";

export default function Page() {
  return (
    <Suspense fallback={<Chargement />}>
      <ImpressionEvaluation />
    </Suspense>
  );
}
