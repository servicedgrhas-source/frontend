"use client";

import { ChevronRight, GraduationCap, Users } from "lucide-react";
import Link from "next/link";
import { ParametresGeneraux } from "@/components/parametres-generaux";
import { useSession } from "@/components/session";
import { Alerte, EnTete, Pastille } from "@/components/ui";
import { peut } from "@/lib/libelles";

/** Administration › Paramètres : les réglages des notes, des calculs, de l'envoi à la FP et de la fiche de mutation. */
export default function Parametres() {
  const { profil } = useSession();
  if (!peut.parametrer(profil.role)) return <Alerte>Accès réservé au DG et à l’administrateur.</Alerte>;

  const lien = (href: string, icone: React.ReactNode, titre: string, texte: string) => (
    <Link href={href} className="group flex items-center gap-4 rounded-3xl bg-white p-5 shadow-doux transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <Pastille ton="vert" taille="lg">
        {icone}
      </Pastille>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-semibold">{titre}</div>
        <div className="text-[13px] text-zinc-500">{texte}</div>
      </div>
      <ChevronRight className="size-5 text-zinc-300 group-hover:text-marque-600" />
    </Link>
  );

  return (
    <div className="space-y-4">
      <EnTete
        titre="Paramètres"
        sousTitre="Les réglages du système : notes de service, statut contractuel, âges et calculs, envoi à la Fonction Publique, fiche de mutation. Chaque groupe dit ce que change une modification. Les comptes sont dans « Administration › Utilisateurs »."
      />
      <ParametresGeneraux />
      <div className="grid gap-4 lg:grid-cols-2">
        {lien(
          "/administration/regles",
          <GraduationCap />,
          "Règles des diplômes et grades",
          "Ajouter un diplôme, lui attribuer un cycle, une note et un grade, ou modifier la classification d’un grade — avec un assistant pas à pas.",
        )}
        {lien("/administration", <Users />, "Utilisateurs", "Créer les comptes, choisir leur rôle et leur structure, gérer les codes personnels.")}
      </div>
    </div>
  );
}
