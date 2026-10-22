"use client";

import { useRouter } from "next/navigation";
import { FormulaireMutation } from "@/components/formulaire-mutation";
import { EnTete } from "@/components/ui";

export default function NouvelleMutation() {
  const router = useRouter();
  return (
    <div>
      <EnTete titre="Nouvelle demande de mutation" sousTitre="La demande sera transmise pour avis au DDEPPSA du département d’origine." />
      <FormulaireMutation apres={(d) => router.push(`/mutation/${d.id}`)} />
    </div>
  );
}
