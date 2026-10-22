"use client";

import { Building2, PencilLine, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useSession } from "@/components/session";
import { Aide, Alerte, Annonce, Badge, Bouton, BoutonIcone, Carte, Champ, Chargement, EnTete, Liste, Modale, Saisie, Segments, useConfirmation } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { peut } from "@/lib/libelles";

interface Structure {
  id: number;
  type: string;
  sigle: string;
  nom: string;
  parentId: number | null;
  departementId: number | null;
  actif: boolean;
}

const LIBELLES: Record<string, string> = {
  ETABLISSEMENT: "Établissement scolaire",
  INSPECTION: "Inspection (circonscription)",
  DDEPPSA: "Direction départementale (DDEPPSA)",
  SERVICE: "Service",
  DIRECTION_CENTRALE: "Direction centrale",
  DIRECTION_GENERALE: "Direction générale",
  BUREAU_DGRHAS: "Bureau de la DGRHAS",
  SERVICE_DGRHAS: "Service de la DGRHAS",
  DIRECTION_DGRHAS: "Direction de la DGRHAS",
  DGRHAS: "DGRHAS",
};
/** Structure supérieure attendue pour chaque type (voie hiérarchique). */
const PARENTS: Record<string, string[]> = {
  ETABLISSEMENT: ["INSPECTION", "DDEPPSA"],
  INSPECTION: ["DDEPPSA"],
  SERVICE: ["DIRECTION_CENTRALE"],
  DIRECTION_CENTRALE: ["DIRECTION_GENERALE"],
  BUREAU_DGRHAS: ["SERVICE_DGRHAS"],
  SERVICE_DGRHAS: ["DIRECTION_DGRHAS"],
  DIRECTION_DGRHAS: ["DGRHAS"],
};
/** Ce que l'on peut ajouter sous une structure. */
const ENFANTS: Record<string, string> = {
  DDEPPSA: "INSPECTION",
  INSPECTION: "ETABLISSEMENT",
  DIRECTION_GENERALE: "DIRECTION_CENTRALE",
  DIRECTION_CENTRALE: "SERVICE",
  DGRHAS: "DIRECTION_DGRHAS",
  DIRECTION_DGRHAS: "SERVICE_DGRHAS",
  SERVICE_DGRHAS: "BUREAU_DGRHAS",
};

type Edition = Partial<Structure> & { type: string };

/**
 * Organigramme : les structures par lesquelles passent les demandes. Le circuit d'une demande
 * se calcule en remontant d'une structure à sa structure supérieure.
 */
export default function Organigramme() {
  const { profil, refs } = useSession();
  const structures = useApi<Structure[]>("/structures");
  const comptes = useApi<{ structureId: number | null; actif: boolean }[]>(peut.administrer(profil.role) ? "/utilisateurs" : null);
  const [vue, setVue] = useState<"departements" | "centrale" | "dgrhas">("departements");
  const [departement, setDepartement] = useState(String(refs.departements[0]?.id ?? ""));
  const [edition, setEdition] = useState<Edition | null>(null);
  const [message, setMessage] = useState<{ ton: "vert" | "rouge"; texte: string } | null>(null);
  const [confirmation, demander] = useConfirmation();
  const dg = peut.parametrer(profil.role);
  if (!peut.traiter(profil.role)) return <Alerte>Accès réservé à la DGRHAS.</Alerte>;

  const liste = structures.donnees ?? [];
  const enfants = (id: number | null, types?: string[]) => liste.filter((s) => s.parentId === id && (!types || types.includes(s.type)));
  const nbComptes = (id: number) => (comptes.donnees ?? []).filter((c) => c.structureId === id && c.actif).length;
  const racines =
    vue === "departements"
      ? liste.filter((s) => s.type === "DDEPPSA" && String(s.departementId) === departement)
      : vue === "centrale"
        ? liste.filter((s) => s.type === "DIRECTION_GENERALE")
        : liste.filter((s) => s.type === "DGRHAS");
  // Écoles et inspections rattachées directement au département (sans structure supérieure)
  // Structures de la voie hiérarchique sans aucun compte : leurs dossiers resteraient bloqués
  const sansCompte = comptes.donnees
    ? liste.filter((s) => s.actif && ["ETABLISSEMENT", "INSPECTION", "SERVICE", "DIRECTION_CENTRALE", "DIRECTION_GENERALE", "BUREAU_DGRHAS", "SERVICE_DGRHAS", "DIRECTION_DGRHAS"].includes(s.type) && !nbComptes(s.id))
    : [];
  const orphelines = vue === "departements" ? liste.filter((s) => ["INSPECTION", "ETABLISSEMENT"].includes(s.type) && !s.parentId && String(s.departementId) === departement) : [];

  function Noeud({ s, niveau }: { s: Structure; niveau: number }) {
    const sous = enfants(s.id);
    const n = nbComptes(s.id);
    return (
      <div style={{ marginLeft: niveau * 22 }} className="space-y-1.5">
        <div className={`flex flex-wrap items-center gap-2 rounded-2xl px-3 py-2 ${s.actif ? "bg-white ring-1 ring-zinc-200" : "bg-zinc-50 text-zinc-400"}`}>
          <Building2 className="size-4 text-zinc-400" />
          <strong className="text-[13px]">{s.sigle}</strong>
          {s.nom !== s.sigle && <span className="min-w-0 flex-1 truncate text-[12px] text-zinc-500">{s.nom}</span>}
          <Badge>{LIBELLES[s.type]}</Badge>
          {!s.actif && <Badge ton="rouge">désactivée</Badge>}
          <span className={`text-[11px] ${n ? "text-marque-700" : "text-or-700"}`}>{n ? `${n} compte(s)` : "aucun compte"}</span>
          {dg && (
            <span className="flex gap-1">
              {(() => {
                // Structures du même niveau, dans l'ordre affiché
                const freres = s.parentId
                  ? enfants(s.parentId)
                  : liste.filter((x) => !x.parentId && x.type === s.type && x.departementId === s.departementId);
                const i = freres.findIndex((x) => x.id === s.id);
                if (freres.length < 2) return null;
                const deplacer = async (sens: "haut" | "bas") => {
                  try {
                    await api.post(`/structures/${s.id}/deplacer`, { sens });
                    structures.recharger();
                  } catch (e) {
                    setMessage({ ton: "rouge", texte: (e as Error).message });
                  }
                };
                return (
                  <>
                    <BoutonIcone libelle="Monter (avant la précédente)" disabled={i <= 0} onClick={() => deplacer("haut")}>
                      <ChevronUp />
                    </BoutonIcone>
                    <BoutonIcone libelle="Descendre (après la suivante)" disabled={i >= freres.length - 1} onClick={() => deplacer("bas")}>
                      <ChevronDown />
                    </BoutonIcone>
                  </>
                );
              })()}
              {ENFANTS[s.type] && (
                <BoutonIcone libelle={`Ajouter : ${LIBELLES[ENFANTS[s.type]]}`} onClick={() => setEdition({ type: ENFANTS[s.type], parentId: s.id, departementId: s.departementId })}>
                  <Plus />
                </BoutonIcone>
              )}
              <BoutonIcone libelle="Modifier" onClick={() => setEdition({ ...s })}>
                <PencilLine />
              </BoutonIcone>
              {!["DGRHAS", "DDEPPSA"].includes(s.type) && (
                <BoutonIcone
                  libelle="Supprimer"
                  ton="rouge"
                  onClick={async () => {
                    if (!(await demander(`Supprimer « ${s.sigle} » de l’organigramme ?`, "Oui, supprimer"))) return;
                    try {
                      await api.delete(`/structures/${s.id}`);
                      setMessage({ ton: "vert", texte: `« ${s.sigle} » supprimée.` });
                      structures.recharger();
                    } catch (e) {
                      setMessage({ ton: "rouge", texte: (e as Error).message });
                    }
                  }}
                >
                  <Trash2 />
                </BoutonIcone>
              )}
            </span>
          )}
        </div>
        {sous.map((x) => (
          <Noeud key={x.id} s={x} niveau={niveau + 1} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {confirmation}
      <EnTete
        titre="Organigramme"
        sousTitre="Les structures par lesquelles passent les demandes : établissements, inspections et DDEPPSA dans les départements ; services et directions de l’administration centrale ; bureaux, services et directions de la DGRHAS."
      />
      <Annonce ton={message?.ton} fermer={() => setMessage(null)}>
        {message?.texte}
      </Annonce>
      <div className="flex flex-wrap items-center gap-3">
        <Segments
          valeur={vue}
          changer={setVue}
          options={[
            { valeur: "departements", libelle: "Départements scolaires" },
            { valeur: "centrale", libelle: "Administration centrale" },
            { valeur: "dgrhas", libelle: "DGRHAS (circuit interne)" },
          ]}
        />
        {vue === "departements" && (
          <Liste className="w-56" value={departement} onChange={(e) => setDepartement(e.target.value)} options={refs.departements.map((d) => ({ valeur: d.id, libelle: d.nom }))} />
        )}
        <Aide>
          Le circuit d’une demande <strong>remonte</strong> de la structure de l’agent à sa structure supérieure : école → inspection → DDEPPSA, ou service →
          direction centrale → direction générale. Rattachez chaque école à son inspection. Les personnes qui visent les dossiers ont un compte rattaché à leur
          structure (« Utilisateurs et paramètres »).
        </Aide>
      </div>
      {sansCompte.length > 0 && (
        <Alerte ton="jaune">
          <strong>
            {sansCompte.length} structure(s) n’ont encore aucun compte
          </strong>{" "}
          (signalées « aucun compte » ci-dessous). Une demande qui arrive chez elles <strong>reste bloquée</strong> : personne ne peut la viser. Créez au moins un
          compte par structure (rôle « Responsable de structure »). En attendant, la DGRHAS peut recopier l’avis porté sur le formulaire papier, et le DG peut
          franchir l’étape en écrivant pourquoi.
        </Alerte>
      )}
      {vue === "centrale" && dg && (
        <Bouton variante="principal" onClick={() => setEdition({ type: "DIRECTION_GENERALE" })}>
          <Plus /> Ajouter une direction générale
        </Bouton>
      )}
      {vue === "departements" && dg && (
        <div className="flex flex-wrap gap-2">
          <Bouton onClick={() => setEdition({ type: "INSPECTION", parentId: racines[0]?.id ?? null, departementId: Number(departement) })}>
            <Plus /> Ajouter une inspection
          </Bouton>
          <Bouton onClick={() => setEdition({ type: "ETABLISSEMENT", parentId: null, departementId: Number(departement) })}>
            <Plus /> Ajouter un établissement
          </Bouton>
        </div>
      )}
      <Carte titre={vue === "departements" ? `Département : ${refs.departements.find((d) => String(d.id) === departement)?.nom ?? ""}` : vue === "centrale" ? "Administration centrale" : "DGRHAS"}>
        {!structures.donnees ? (
          <Chargement />
        ) : !racines.length && !orphelines.length ? (
          <p className="text-[13px] text-zinc-500">Rien pour l’instant.{dg ? " Utilisez les boutons « Ajouter »." : ""}</p>
        ) : (
          <div className="space-y-2">
            {racines.map((s) => (
              <Noeud key={s.id} s={s} niveau={0} />
            ))}
            {orphelines.length > 0 && (
              <div className="pt-2">
                <div className="mb-1 text-[12px] text-or-700">Rattachées au département sans structure supérieure (le circuit passera directement au DDEPPSA) :</div>
                {orphelines.map((s) => (
                  <Noeud key={s.id} s={s} niveau={0} />
                ))}
              </div>
            )}
          </div>
        )}
      </Carte>
      <p className="text-[12px] text-zinc-500">
        Les comptes se créent dans{" "}
        <Link href="/administration" className="font-medium text-marque-700 underline">
          Utilisateurs et paramètres
        </Link>{" "}
        : choisissez le rôle « Responsable de structure » et la structure.
      </p>
      {edition && (
        <EditionStructure
          s={edition}
          liste={liste}
          fermer={() => setEdition(null)}
          apres={(texte) => {
            setEdition(null);
            setMessage({ ton: "vert", texte });
            structures.recharger();
          }}
        />
      )}
    </div>
  );
}

function EditionStructure({ s, liste, fermer, apres }: { s: Edition; liste: Structure[]; fermer: () => void; apres: (t: string) => void }) {
  const { refs } = useSession();
  const [f, setF] = useState({
    type: s.type,
    nom: s.nom ?? "",
    sigle: s.sigle ?? "",
    parentId: s.parentId ? String(s.parentId) : "",
    departementId: s.departementId ? String(s.departementId) : "",
    actif: s.actif ?? true,
  });
  const [erreur, setErreur] = useState<string | null>(null);
  const parents = liste.filter((x) => (PARENTS[f.type] ?? []).includes(x.type) && x.id !== s.id && (!f.departementId || !x.departementId || String(x.departementId) === f.departementId));
  const departemental = ["ETABLISSEMENT", "INSPECTION", "DDEPPSA"].includes(f.type);
  return (
    <Modale titre={s.id ? `Modifier ${s.sigle}` : `Ajouter : ${LIBELLES[f.type]}`} ouverte fermer={fermer}>
      <div className="space-y-3">
        {erreur && <Alerte>{erreur}</Alerte>}
        <Champ libelle="Type">
          <Liste
            value={f.type}
            disabled={!!s.id && ["DGRHAS", "DDEPPSA"].includes(s.type)}
            onChange={(e) => setF({ ...f, type: e.target.value, parentId: "" })}
            options={Object.entries(LIBELLES)
              .filter(([k]) => !["DGRHAS", "DDEPPSA"].includes(k) || k === s.type)
              .map(([k, v]) => ({ valeur: k, libelle: v }))}
          />
        </Champ>
        <Champ libelle="Nom complet *">
          <Saisie autoFocus value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} placeholder={f.type === "ETABLISSEMENT" ? "Ex. CEG de Madingou" : f.type === "INSPECTION" ? "Ex. Inspection de l’enseignement primaire de Nkayi" : ""} />
        </Champ>
        <Champ libelle="Sigle" aide="Court, il s’affiche dans le circuit (ex. IEP Nkayi). Laissé vide : le nom.">
          <Saisie value={f.sigle} onChange={(e) => setF({ ...f, sigle: e.target.value })} />
        </Champ>
        {departemental && (
          <Champ libelle="Département">
            <Liste value={f.departementId} onChange={(e) => setF({ ...f, departementId: e.target.value })} vide="—" options={refs.departements.map((d) => ({ valeur: d.id, libelle: d.nom }))} />
          </Champ>
        )}
        {PARENTS[f.type] && (
          <Champ libelle="Structure supérieure" aide="Le dossier montera ensuite vers elle.">
            <Liste value={f.parentId} onChange={(e) => setF({ ...f, parentId: e.target.value })} vide="— Aucune —" options={parents.map((x) => ({ valeur: x.id, libelle: `${x.sigle} (${LIBELLES[x.type]})` }))} />
          </Champ>
        )}
        {s.id && (
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" checked={f.actif} onChange={(e) => setF({ ...f, actif: e.target.checked })} /> Structure active (proposée sur le portail)
          </label>
        )}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Bouton onClick={fermer}>Annuler</Bouton>
        <Bouton
          variante="principal"
          disabled={!f.nom.trim()}
          onClick={async () => {
            const corps = { ...f, parentId: f.parentId ? Number(f.parentId) : null, departementId: f.departementId ? Number(f.departementId) : null };
            try {
              if (s.id) await api.put(`/structures/${s.id}`, corps);
              else await api.post("/structures", corps);
              apres(`« ${f.sigle || f.nom} » enregistrée.`);
            } catch (e) {
              setErreur((e as Error).message);
            }
          }}
        >
          Enregistrer
        </Bouton>
      </div>
    </Modale>
  );
}
