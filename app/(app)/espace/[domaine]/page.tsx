import { Suspense } from "react";
import { Chargement } from "@/components/ui";
import { VueEspace } from "./vue";

export default function Page() {
  return (
    <Suspense fallback={<Chargement />}>
      <VueEspace />
    </Suspense>
  );
}
