import { Suspense } from "react";
import { Chargement } from "@/components/ui";
import { VueNote } from "./vue";

export default function Page() {
  return (
    <Suspense fallback={<Chargement />}>
      <VueNote />
    </Suspense>
  );
}
