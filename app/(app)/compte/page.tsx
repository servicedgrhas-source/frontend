"use client";

import { Delegation } from "@/components/delegation";
import { useSession } from "@/components/session";
import { Carte, EnTete } from "@/components/ui";
import { ROLES } from "@/lib/libelles";

export default function Compte() {
  const { profil } = useSession();
  return (
    <div className="max-w-lg space-y-4">
      <EnTete titre="Mon compte" sousTitre={`${profil.nom} – ${ROLES[profil.role]} – ${profil.email}`} />
      <Delegation />
      <Carte titre="Mot de passe et code personnel">
        {/* Décision du DG : personne ne change seul son mot de passe (un intrus pourrait exclure le vrai titulaire) */}
        <p className="text-[13px] leading-relaxed text-zinc-600">
          Pour vous connecter, il faut votre e-mail, votre mot de passe et votre <strong>code personnel de 12 caractères</strong>. Pour votre sécurité, vous ne
          pouvez pas les changer vous-même : si vous les avez oubliés, ou si vous pensez que quelqu’un les connaît, demandez à l’administrateur ou au DG de vous en
          donner de nouveaux.
        </p>
      </Carte>
    </div>
  );
}
