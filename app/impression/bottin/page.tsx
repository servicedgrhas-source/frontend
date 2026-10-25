import { Suspense } from "react";
import { Chargement } from "@/components/ui";
import { ImpressionBottin } from "./vue";

export default function Page() {
  return (
    <Suspense fallback={<Chargement />}>
      <ImpressionBottin />
    </Suspense>
  );
}
