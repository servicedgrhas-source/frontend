import { Suspense } from "react";
import { Chargement } from "@/components/ui";
import { ImpressionRetards } from "./vue";

export default function Page() {
  return (
    <Suspense fallback={<Chargement />}>
      <ImpressionRetards />
    </Suspense>
  );
}
