import { redirect } from "next/navigation";

/** Ancienne adresse du recensement : le module s'appelle maintenant « Personnel ». */
export default function Page() {
  redirect("/personnel/import");
}
