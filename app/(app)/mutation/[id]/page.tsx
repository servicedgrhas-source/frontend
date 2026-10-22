import { Suspense } from "react";
import { Chargement } from "@/components/ui";
import { VueMutation } from "./vue";

export default function Page() {
  return (
    <Suspense fallback={<Chargement />}>
      <VueMutation />
    </Suspense>
  );
}
