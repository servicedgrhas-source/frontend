import { redirect } from "next/navigation";

/** Ancienne adresse d'une fiche : le module s'appelle maintenant « Personnel ». */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/personnel/agents/${id}`);
}
