import { Suspense } from "react";
import { Chargement } from "@/components/ui";
import { VueAgents } from "./vue";

export default function Page() {
  return (
    <Suspense fallback={<Chargement />}>
      <VueAgents />
    </Suspense>
  );
}
