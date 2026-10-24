import { Suspense } from "react";
import { Chargement } from "@/components/ui";
import { VueFiche } from "./vue";

export default function Page() {
  return (
    <Suspense fallback={<Chargement />}>
      <VueFiche />
    </Suspense>
  );
}
