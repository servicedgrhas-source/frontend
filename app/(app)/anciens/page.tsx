import { redirect } from "next/navigation";

/** Ancienne adresse : la page fait partie de « Rapprochement et contrôles ». */
export default function Page() {
  redirect("/rapprochement?onglet=annees");
}
