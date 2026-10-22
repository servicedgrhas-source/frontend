import { Suspense } from "react";
import { Chargement } from "@/components/ui";
import { ImpressionSoitTransmis } from "./vue";

export default function Page() {
  return (
    <Suspense fallback={<Chargement />}>
      <ImpressionSoitTransmis />
    </Suspense>
  );
}
