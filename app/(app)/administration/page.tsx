"use client";

import { ChevronRight, GraduationCap, KeyRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useCodesPersonnels } from "@/components/codes-personnels";
import { ParametresGeneraux } from "@/components/parametres-generaux";
import { useSession } from "@/components/session";
import { Alerte, Annonce, Badge, Bouton, Carte, Champ, Chargement, EnTete, Liste, Modale, Pastille, Saisie, Tableau } from "@/components/ui";
import { api, useApi, type Role } from "@/lib/api";
import { peut, ROLES } from "@/lib/libelles";

interface Utilisateur {
  id: string;
  email: string;
  nom: string;
  initiales: string | null;
  role: Role;
  departementId: number | null;
  structureId: number | null;
  actif: boolean;
  /** A un code personnel de connexion (12 caractères). */
  aCode?: boolean;
  codeCreeLe?: string | null;
}

interface StructureCourte {
  id: number;
  type: string;
  sigle: string;
  nom: string;
}

export default function Administration() {
  const { profil, refs } = useSession();
  const users = useApi<Utilisateur[]>(peut.administrer(profil.role) ? "/utilisateurs" : null);
  const structures = useApi<StructureCourte[]>(peut.administrer(profil.role) ? "/structures" : null);
  const [edition, setEdition] = useState<Utilisateur | "nouveau" | null>(null);
  const [message, setMessage] = useState<{ ton: "vert" | "rouge"; texte: string } | null>(null);
  const [codeNouveau, setCodeNouveau] = useState<{ nom: string; code: string } | null>(null);
  const codes = useCodesPersonnels(() => users.recharger());

  if (!peut.parametrer(profil.role)) return <Alerte>Accès réservé au DG et à l’administrateur.</Alerte>;




  return (
    <div className="space-y-4">
      <EnTete titre="Administration" sousTitre="Utilisateurs, paramètres des notes et règles diplôme → grade." />
      <Annonce ton={message?.ton} fermer={() => setMessage(null)}>{message?.texte}</Annonce>

      {peut.administrer(profil.role) &&
        (() => {
          const sansBureau = (users.donnees ?? []).filter((u) => u.actif && ["AGENT", "CHEF_SERVICE", "DIRECTEUR", "BUREAU_ETUDES"].includes(u.role) && !u.structureId);
          return sansBureau.length ? (
            <Alerte ton="jaune">
              <strong>{sansBureau.length} compte(s) de la DGRHAS ne sont rattachés à aucun bureau</strong> : {sansBureau.map((u) => u.nom).join(", ")}. Pour les
              demandes de mutation, un compte sans structure peut agir à l’étape de <strong>tous</strong> les bureaux (chef de bureau), de tous les services (chef
              de service) ou de la DRSC, selon son rôle. Ouvrez chaque compte (« Modifier ») et choisissez sa structure : ensuite, chacun n’agit qu’à sa propre
              étape.
            </Alerte>
          ) : null;
        })()}
      {peut.administrer(profil.role) && (
      <Carte
        titre="Utilisateurs"
        actions={
          <div className="flex flex-wrap gap-2">
            <Bouton onClick={() => codes.demander({ action: "regenerer", libelle: "Un nouveau code de 12 caractères sera créé pour tous les comptes, sauf le vôtre." })}>
              <KeyRound /> Régénérer les codes de tous les comptes
            </Bouton>
            <Bouton onClick={() => codes.demander({ action: "voir", libelle: "Les codes de tous les comptes (sauf le vôtre) vont s’afficher." })}>Voir tous les codes</Bouton>
            <Bouton variante="principal" onClick={() => setEdition("nouveau")}>Ajouter un utilisateur</Bouton>
          </div>
        }
      >
        {(users.donnees ?? []).some((u) => u.actif && !u.aCode) && (
          <div className="mb-3">
            <Alerte ton="jaune">
              <strong>{(users.donnees ?? []).filter((u) => u.actif && !u.aCode).length} compte(s) sans code personnel</strong> : ils se connectent encore avec l’e-mail et
              le mot de passe seulement. Générez leur code (bouton « Code » de la ligne, ou « Régénérer les codes de tous les comptes ») et remettez-le leur.
            </Alerte>
          </div>
        )}
        {!users.donnees ? (
          <Chargement />
        ) : (
          <Tableau>
            <thead>
              <tr>
                <th>Nom</th>
                <th>E-mail</th>
                <th>Initiales</th>
                <th>Rôle</th>
                <th>Département · structure</th>
                <th>État</th>
                <th>Code personnel</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.donnees.map((u) => (
                <tr key={u.id}>
                  <td className="font-medium">{u.nom}</td>
                  <td>{u.email}</td>
                  <td>{u.initiales}</td>
                  <td>{ROLES[u.role]}</td>
                  <td>
                    {refs.departements.find((d) => d.id === u.departementId)?.nom ?? "—"}
                    {u.structureId ? (
                      <div className="text-[11px] text-zinc-500">{structures.donnees?.find((s) => s.id === u.structureId)?.sigle ?? "…"}</div>
                    ) : ["AGENT", "CHEF_SERVICE", "DIRECTEUR", "BUREAU_ETUDES", "STRUCTURE"].includes(u.role) ? (
                      <div className="text-[11px] text-or-700">sans structure</div>
                    ) : null}
                  </td>
                  <td>{u.actif ? <Badge ton="vert">Actif</Badge> : <Badge ton="rouge">Désactivé</Badge>}</td>
                  <td>
                    {u.aCode ? <Badge ton="vert">Oui</Badge> : <Badge ton="jaune">Pas encore</Badge>}
                    {u.codeCreeLe && <div className="text-[11px] text-zinc-400">depuis le {new Date(u.codeCreeLe).toLocaleDateString("fr-FR")}</div>}
                  </td>
                  <td>
                    <div className="flex flex-wrap justify-end gap-1">
                      {u.aCode && (
                        <Bouton variante="discret" onClick={() => codes.demander({ action: "voir", ids: [u.id], libelle: `Le code de ${u.nom} va s’afficher.` })}>
                          Voir le code
                        </Bouton>
                      )}
                      <Bouton
                        variante="discret"
                        onClick={() =>
                          codes.demander({
                            action: "regenerer",
                            ids: [u.id],
                            libelle: u.aCode ? `Un nouveau code va remplacer celui de ${u.nom}.` : `Un code personnel va être créé pour ${u.nom}.`,
                          })
                        }
                      >
                        {u.aCode ? "Nouveau code" : "Créer le code"}
                      </Bouton>
                      <Bouton variante="discret" onClick={() => setEdition(u)}>Modifier</Bouton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Tableau>
        )}
      </Carte>
      )}

      <ParametresGeneraux />

      <Link href="/administration/regles" className="group flex items-center gap-4 rounded-3xl bg-white p-5 shadow-doux transition-all hover:-translate-y-0.5 hover:shadow-lg">
        <Pastille ton="vert" taille="lg">
          <GraduationCap />
        </Pastille>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold">Règles des diplômes et grades</div>
          <div className="text-[13px] text-zinc-500">
            Ajouter un diplôme, lui attribuer un cycle, une note et un grade, ou modifier la classification d’un grade — avec un assistant pas à pas.
          </div>
        </div>
        <ChevronRight className="size-5 text-zinc-300 group-hover:text-marque-600" />
      </Link>

      {codes.modales}
      <Modale titre="Compte créé : son code personnel" ouverte={!!codeNouveau} fermer={() => setCodeNouveau(null)}>
        {codeNouveau && (
          <div className="space-y-3 text-[13px] text-zinc-600">
            <p>
              Remettez à <strong>{codeNouveau.nom}</strong> son mot de passe et ce code, en main propre. Il lui faudra les deux, avec son e-mail, pour se connecter.
            </p>
            <div className="rounded-2xl bg-zinc-100 py-4 text-center font-mono text-[22px] tracking-[0.2em] text-encre">{codeNouveau.code}</div>
            <p className="text-[12px] text-zinc-500">Vous pourrez le revoir plus tard (bouton « Voir le code »), après avoir confirmé votre mot de passe et votre code.</p>
            <div className="flex justify-end">
              <Bouton variante="principal" onClick={() => setCodeNouveau(null)}>
                C’est noté
              </Bouton>
            </div>
          </div>
        )}
      </Modale>
      {edition && (
        <EditionUtilisateur
          u={edition === "nouveau" ? null : edition}
          fermer={() => setEdition(null)}
          apres={(cree) => {
            setEdition(null);
            users.recharger();
            if (cree?.code) setCodeNouveau({ nom: cree.nom, code: cree.code });
          }}
        />
      )}
    </div>
  );
}

function EditionUtilisateur({ u, fermer, apres }: { u: Utilisateur | null; fermer: () => void; apres: (cree?: { nom: string; code?: string }) => void }) {
  const { refs, profil } = useSession();
  const structures = useApi<StructureCourte[]>("/structures");
  const [f, setF] = useState({
    nom: u?.nom ?? "",
    email: u?.email ?? "",
    initiales: u?.initiales ?? "",
    role: u?.role ?? ("AGENT" as Role),
    departementId: u?.departementId?.toString() ?? "",
    structureId: u?.structureId?.toString() ?? "",
    motDePasse: "",
    actif: u?.actif ?? true,
  });
  const [erreur, setErreur] = useState<string | null>(null);

  async function ok() {
    const corps = {
      ...f,
      departementId: f.departementId ? Number(f.departementId) : null,
      structureId: f.structureId ? Number(f.structureId) : null,
      motDePasse: f.motDePasse || undefined,
    };
    try {
      if (u) {
        await api.put(`/utilisateurs/${u.id}`, corps);
        apres();
      } else apres(await api.post<{ nom: string; code?: string }>("/utilisateurs", corps));
    } catch (e) {
      setErreur((e as Error).message);
    }
  }

  return (
    <Modale titre={u ? `Modifier – ${u.nom}` : "Nouvel utilisateur"} ouverte fermer={fermer}>
      <div className="grid grid-cols-2 gap-3">
        {erreur && <div className="col-span-2"><Alerte>{erreur}</Alerte></div>}
        <Champ libelle="Nom complet">
          <Saisie value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} />
        </Champ>
        <Champ libelle="Initiales" aide="Traçabilité des lignes traitées">
          <Saisie value={f.initiales} onChange={(e) => setF({ ...f, initiales: e.target.value })} />
        </Champ>
        <Champ libelle="E-mail" className="col-span-2">
          <Saisie type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        </Champ>
        <Champ libelle="Rôle">
          <Liste
            value={f.role}
            onChange={(e) => setF({ ...f, role: e.target.value as Role })}
            options={Object.entries(ROLES)
              .filter(([k]) => profil.role === "ADMIN" || k !== "ADMIN")
              .map(([k, v]) => ({ valeur: k, libelle: v }))}
          />
        </Champ>
        <Champ libelle="Département (DDEPPSA)">
          <Liste value={f.departementId} onChange={(e) => setF({ ...f, departementId: e.target.value })} vide="—" options={refs.departements.map((d) => ({ valeur: d.id, libelle: d.nom }))} />
        </Champ>
        <Champ
          libelle="Structure (organigramme)"
          aide={
            f.role === "STRUCTURE"
              ? "Obligatoire : l’école, l’inspection ou le service de la personne. Sans structure, elle ne voit aucun dossier."
              : ["AGENT", "CHEF_SERVICE", "DIRECTEUR", "BUREAU_ETUDES"].includes(f.role)
                ? "Son bureau, son service ou sa direction. Laissée vide, la personne peut agir à l’étape de tous les bureaux (ou services) de son rôle."
                : "Là où la personne vise et donne son avis dans le circuit des demandes."
          }
          className="col-span-2"
        >
          <Liste
            value={f.structureId}
            onChange={(e) => setF({ ...f, structureId: e.target.value })}
            vide="— Aucune (selon le rôle) —"
            options={(structures.donnees ?? []).map((s) => ({ valeur: s.id, libelle: `${s.sigle}${s.nom !== s.sigle ? ` – ${s.nom}` : ""}` }))}
          />
        </Champ>
        <Champ libelle={u ? "Nouveau mot de passe (facultatif)" : "Mot de passe"} aide="8 caractères minimum" className="col-span-2">
          <Saisie type="password" autoComplete="new-password" value={f.motDePasse} onChange={(e) => setF({ ...f, motDePasse: e.target.value })} />
        </Champ>
        {u && (
          <label className="col-span-2 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.actif} onChange={(e) => setF({ ...f, actif: e.target.checked })} /> Compte actif
          </label>
        )}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Bouton onClick={fermer}>Annuler</Bouton>
        <Bouton variante="principal" onClick={ok}>Enregistrer</Bouton>
      </div>
    </Modale>
  );
}
