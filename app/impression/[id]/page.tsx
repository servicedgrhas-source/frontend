import { Suspense } from "react";
import { Chargement } from "@/components/ui";
import { Impression } from "./vue";

export default function Page() {
  return (
    <Suspense fallback={<Chargement />}>
      <Impression />
    </Suspense>
  );
}
