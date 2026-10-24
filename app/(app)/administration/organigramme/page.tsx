"use client";

import { Building2, Download, PencilLine, Plus, Trash2, ChevronDown, ChevronUp, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "@/components/session";
import { Aide, Alerte, Annonce, Badge, Bouton, BoutonIcone, Carte, Champ, Chargement, EnTete, Liste, Modale, Saisie, Segments, ZoneFichier, useConfirmation } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { peut } from "@/lib/libelles";

interface Structure {
  id: number;
  type: string;
  sigle: string;
  nom: string;
  parentId: number | null;
  departementId: number | null;
  cycle: string | null;
  typeLocalite: string | null;
  localite: string | null;
  actif: boolean;
  /** 0 ministère, 1 cabinet, 2 directions générales, 3 directions centrales, 4 services et DDEPPSA, 5 inspections et bureaux, 6 écoles. */
  niveau: number | null;
  posteResponsable: string;
  responsable: { id: number; nom: string } | null;
  responsableInterim: boolean;
}

const CYCLES: Record<string, string> = {
  PRESCOLAIRE: "Préscolaire",
  PRIMAIRE: "Primaire",
  COLLEGE: "Collège (CEG)",
  LYCEE: "Lycée",
  ALPHABETISATION: "Alphabétisation",
};
const LOCALITES: Record<string, string> = { DISTRICT: "District", COMMUNE: "Commune", ARRONDISSEMENT: "Arrondissement" };

interface RapportImport {
  essai: boolean;
  lues: number;
  inspections: { creees: number; existantes: number; exemples: string[] };
  etablissements: { crees: number; misAJour: number; inchanges: number; exemples: string[] };
  sansInspection: number;
  sansCycle: number;
  ignorees: { raison: string; n: number; exemples: string[] }[];
}

const LIBELLES: Record<string, string> = {
  MINISTERE: "Ministère",
  CABINET: "Cabinet",
  ETABLISSEMENT: "Établissement scolaire",
  INSPECTION: "Inspection (circonscription)",
  DDEPPSA: "Direction départementale (DDEPPSA)",
  SERVICE: "Service",
  BUREAU: "Bureau",
  DIRECTION_CENTRALE: "Direction centrale",
  DIRECTION_GENERALE: "Direction générale",
  INSPECTION_GENERALE: "Inspection générale",
  BUREAU_DGRHAS: "Bureau de la DGRHAS",
  SERVICE_DGRHAS: "Service de la DGRHAS",
  DIRECTION_DGRHAS: "Direction de la DGRHAS",
  DGRHAS: "DGRHAS",
};
/** Structure supérieure attendue pour chaque type (voie hiérarchique). */
const PARENTS: Record<string, string[]> = {
  ETABLISSEMENT: ["INSPECTION", "DDEPPSA"],
  INSPECTION: ["DDEPPSA"],
  CABINET: ["MINISTERE"],
  DIRECTION_GENERALE: ["MINISTERE", "CABINET"],
  INSPECTION_GENERALE: ["MINISTERE"],
  DGRHAS: ["MINISTERE"],
  SERVICE: ["DIRECTION_CENTRALE", "DIRECTION_GENERALE", "INSPECTION_GENERALE", "CABINET"],
  BUREAU: ["SERVICE"],
  DIRECTION_CENTRALE: ["DIRECTION_GENERALE", "INSPECTION_GENERALE", "CABINET"],
  BUREAU_DGRHAS: ["SERVICE_DGRHAS"],
  SERVICE_DGRHAS: ["DIRECTION_DGRHAS", "DGRHAS"],
  DIRECTION_DGRHAS: ["DGRHAS"],
};
/** Ce que l'on peut ajouter sous une structure. */
const ENFANTS: Record<string, string> = {
  MINISTERE: "DIRECTION_GENERALE",
  CABINET: "DIRECTION_CENTRALE",
  INSPECTION_GENERALE: "DIRECTION_CENTRALE",
  SERVICE: "BUREAU",
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
  const [nomination, setNomination] = useState<Structure | null>(null);
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
        ? // Du ministère jusqu'aux bureaux ; à défaut, les directions générales sans supérieure
          liste.filter((s) => s.type === "MINISTERE" || (["DIRECTION_GENERALE", "INSPECTION_GENERALE", "CABINET"].includes(s.type) && !s.parentId))
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
          {s.niveau !== null && (
            <span className="text-[11px] text-zinc-400" title="Niveau dans l’organigramme : 0 ministère … 6 écoles">
              niveau {s.niveau}
            </span>
          )}
          {s.cycle && <Badge ton="gris">{CYCLES[s.cycle] ?? s.cycle}</Badge>}
          {s.localite && <span className="text-[11px] text-zinc-500">{s.typeLocalite ? `${LOCALITES[s.typeLocalite]} : ` : ""}{s.localite}</span>}
          {!s.actif && <Badge ton="rouge">désactivée</Badge>}
          <span className={`text-[11px] ${n ? "text-marque-700" : "text-or-700"}`}>{n ? `${n} compte(s)` : "aucun compte"}</span>
          <span className="text-[11px] text-zinc-500">
            {s.posteResponsable} :{" "}
            {s.responsable ? (
              <Link href={`/personnel/agents/${s.responsable.id}`} className="font-medium text-encre hover:underline">
                {s.responsable.nom}
                {s.responsableInterim ? " (intérim)" : ""}
              </Link>
            ) : (
              <span className="text-or-700">poste vacant</span>
            )}
          </span>
          {dg && (
            <span className="flex gap-1">
              <BoutonIcone libelle={`Responsable : ${s.posteResponsable}`} onClick={() => setNomination(s)}>
                <UserRound />
              </BoutonIcone>
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
          structure (« Administration › Utilisateurs »).
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
      {vue === "departements" && dg && <ImportEtablissements apres={() => structures.recharger()} />}
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
          Administration › Utilisateurs
        </Link>{" "}
        : choisissez le rôle « Responsable de structure » et la structure.
      </p>
      {nomination && (
        <Responsable
          s={nomination}
          fermer={() => setNomination(null)}
          apres={(texte) => {
            setNomination(null);
            setMessage({ ton: "vert", texte });
            structures.recharger();
          }}
        />
      )}
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

/** Responsable en poste d'une structure (agent de la base du personnel), ou intérim ; vide : vacant. */
function Responsable({ s, fermer, apres }: { s: Structure; fermer: () => void; apres: (t: string) => void }) {
  const [q, setQ] = useState("");
  const [recherche, setRecherche] = useState("");
  const [choisi, setChoisi] = useState<{ id: number; nom: string } | null>(s.responsable);
  const [interim, setInterim] = useState(s.responsableInterim);
  const [erreur, setErreur] = useState<string | null>(null);
  const agents = useApi<{ lignes: { id: number; nomComplet: string; numeroFiche: string; structureNom: string | null; lieuService: string | null }[] }>(
    recherche.length >= 2 ? `/recensement/agents?recherche=${encodeURIComponent(recherche)}${s.type === "ETABLISSEMENT" ? `&structure=${s.id}` : ""}` : null,
  );
  useEffect(() => {
    const t = setTimeout(() => setRecherche(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);
  const enregistrer = async (agentId: number | null) => {
    setErreur(null);
    try {
      await api.put(`/structures/${s.id}/responsable`, { agentId, interim });
      apres(agentId ? `${s.posteResponsable} de « ${s.sigle} » : ${choisi?.nom}${interim ? " (intérim)" : ""}.` : `« ${s.sigle} » : poste de ${s.posteResponsable.toLowerCase()} vacant.`);
    } catch (e) {
      setErreur((e as Error).message);
    }
  };
  return (
    <Modale titre={`${s.posteResponsable} — ${s.sigle}`} ouverte fermer={fermer}>
      <div className="space-y-3">
        <p className="text-[12px] text-zinc-500">Choisissez l’agent qui occupe le poste, dans la base du personnel.{s.type === "ETABLISSEMENT" ? " La recherche se limite aux agents rattachés à cette école." : ""}</p>
        {choisi && (
          <div className="flex items-center gap-2 rounded-xl bg-marque-50 px-3 py-2 text-[13px]">
            <UserRound className="size-4 text-marque-700" />
            <strong>{choisi.nom}</strong>
            <button type="button" className="ml-auto text-[12px] text-zinc-500 underline" onClick={() => setChoisi(null)}>
              changer
            </button>
          </div>
        )}
        {!choisi && (
          <>
            <Saisie autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom de l’agent (2 lettres au moins)…" />
            <ul className="max-h-60 divide-y divide-zinc-100 overflow-y-auto rounded-xl ring-1 ring-zinc-200">
              {(agents.donnees?.lignes ?? []).map((a) => (
                <li key={a.id}>
                  <button type="button" className="w-full px-3 py-1.5 text-left text-[13px] hover:bg-zinc-50" onClick={() => setChoisi({ id: a.id, nom: a.nomComplet })}>
                    <span className="font-medium">{a.nomComplet}</span>
                    <span className="ml-2 text-[11px] text-zinc-400">{[a.numeroFiche, a.structureNom ?? a.lieuService].filter(Boolean).join(" · ")}</span>
                  </button>
                </li>
              ))}
              {recherche.length >= 2 && agents.donnees && !agents.donnees.lignes.length && <li className="px-3 py-2 text-[12px] text-zinc-500">Aucun agent trouvé.</li>}
            </ul>
          </>
        )}
        <label className="flex items-center gap-2 text-[13px]">
          <input type="checkbox" checked={interim} onChange={(e) => setInterim(e.target.checked)} /> Il n’assure qu’un intérim
        </label>
        {s.responsable && s.responsable.id === choisi?.id && <CompteResponsable s={s} />}
        {erreur && <Alerte>{erreur}</Alerte>}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        {s.responsable && (
          <Bouton variante="danger" onClick={() => enregistrer(null)}>
            Déclarer le poste vacant
          </Bouton>
        )}
        <Bouton onClick={fermer}>Annuler</Bouton>
        <Bouton variante="principal" disabled={!choisi} onClick={() => choisi && enregistrer(choisi.id)}>
          Enregistrer
        </Bouton>
      </div>
    </Modale>
  );
}

/**
 * Compte « Responsable de structure » du responsable en poste : il vise les demandes de sa structure,
 * pointe la présence, évalue ses agents, gère ses classes. Mot de passe et code montrés une seule fois.
 */
function CompteResponsable({ s }: { s: Structure }) {
  const [email, setEmail] = useState("");
  const [cree, setCree] = useState<{ email: string; nom: string; motDePasse: string; code: string } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  if (cree)
    return (
      <div className="space-y-1 rounded-xl bg-marque-50 p-3 text-[13px]">
        <div className="font-semibold text-marque-700">Compte créé pour {cree.nom}</div>
        <div>
          Identifiant : <strong>{cree.email}</strong>
        </div>
        <div>
          Mot de passe provisoire : <strong className="font-mono">{cree.motDePasse}</strong>
        </div>
        <div>
          Code personnel : <strong className="font-mono tracking-wider">{cree.code}</strong>
        </div>
        <p className="text-[12px] text-or-700">Notez-les maintenant et remettez-les à la personne : ils ne seront plus affichés. Elle changera son mot de passe dans « Mon compte ».</p>
      </div>
    );
  return (
    <div className="space-y-2 rounded-xl bg-zinc-50 p-3 ring-1 ring-zinc-200">
      <div className="text-[12px] font-semibold text-zinc-700">Compte du responsable</div>
      <p className="text-[12px] text-zinc-500">Pour qu’il vise les demandes de sa structure, pointe la présence et évalue ses agents. Laissez l’adresse vide si elle est déjà dans sa fiche.</p>
      <div className="flex gap-2">
        <Saisie type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Adresse e-mail (identifiant)" />
        <Bouton
          onClick={async () => {
            setErreur(null);
            try {
              setCree(await api.post(`/structures/${s.id}/compte-responsable`, { email: email.trim() || null }));
            } catch (e) {
              setErreur((e as Error).message);
            }
          }}
        >
          Créer son compte
        </Bouton>
      </div>
      {erreur && <Alerte>{erreur}</Alerte>}
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
    cycle: s.cycle ?? "",
    typeLocalite: s.typeLocalite ?? "",
    localite: s.localite ?? "",
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
        {["ETABLISSEMENT", "INSPECTION"].includes(f.type) && (
          <Champ libelle="Cycle" aide="Une inspection par cycle (préscolaire, primaire, CEG, lycée) dans chaque département.">
            <Liste value={f.cycle} onChange={(e) => setF({ ...f, cycle: e.target.value })} vide="—" options={Object.entries(CYCLES).map(([k, v]) => ({ valeur: k, libelle: v }))} />
          </Champ>
        )}
        {f.type === "ETABLISSEMENT" && (
          <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
            <Champ libelle="Localisation">
              <Liste value={f.typeLocalite} onChange={(e) => setF({ ...f, typeLocalite: e.target.value })} vide="—" options={Object.entries(LOCALITES).map(([k, v]) => ({ valeur: k, libelle: v }))} />
            </Champ>
            <Champ libelle="Nom" aide="District en zone rurale, commune ou arrondissement en ville (pas de village ni de quartier).">
              <Saisie value={f.localite} onChange={(e) => setF({ ...f, localite: e.target.value })} placeholder="Ex. Loudima, Moungali" />
            </Champ>
          </div>
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
            const corps = {
              ...f,
              parentId: f.parentId ? Number(f.parentId) : null,
              departementId: f.departementId ? Number(f.departementId) : null,
              cycle: f.cycle || null,
              typeLocalite: f.typeLocalite || null,
              localite: f.localite.trim() || null,
            };
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

/**
 * Import des établissements et des inspections (fichier remis par le DG) : chaque école est rangée
 * dans son inspection et son département. Ensuite, on choisit l'école dans une liste au lieu de la taper.
 */
function ImportEtablissements({ apres }: { apres: () => void }) {
  const [ouvert, setOuvert] = useState(false);
  const [rapport, setRapport] = useState<RapportImport | null>(null);
  const [fichier, setFichier] = useState<File | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);

  async function envoyer(f: File, essai: boolean) {
    setErreur(null);
    setEnvoi(true);
    try {
      const fd = new FormData();
      fd.append("fichier", f);
      const r = await api.post<RapportImport>(`/structures/import?essai=${essai ? 1 : 0}`, fd);
      if (essai) {
        setRapport(r);
        setFichier(f);
      } else {
        setRapport(null);
        setFichier(null);
        setFait(`${r.inspections.creees} inspection(s) et ${r.etablissements.crees} établissement(s) ajoutés, ${r.etablissements.misAJour} mis à jour.`);
        apres();
      }
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  }

  if (!ouvert)
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Bouton variante="principal" onClick={() => setOuvert(true)}>
          <Download /> Importer les établissements et inspections (Excel)
        </Bouton>
        {fait && <span className="text-[12px] text-marque-700">{fait}</span>}
      </div>
    );
  return (
    <Carte titre="Importer les établissements et les inspections" actions={<Bouton variante="discret" onClick={() => setOuvert(false)}>Fermer</Bouton>}>
      <p className="-mt-2 mb-3 text-[12px] text-zinc-500">
        Une ligne par école : département, inspection, cycle, établissement, type de localité et localité. Les inspections manquantes sont créées sous la DDEPPSA du département ; une école déjà connue n’est pas créée deux
        fois (son cycle, sa localisation et son inspection sont mis à jour).{" "}
        <button type="button" className="font-medium text-marque-700 hover:underline" onClick={() => api.telecharger("/structures/modele", "Etablissements et inspections.xlsx")}>
          Télécharger le modèle
        </button>
      </p>
      <ZoneFichier accept=".xlsx" envoi={envoi} envoyer={(f) => envoyer(f, true)} libelleBouton="Vérifier le fichier" />
      {erreur && (
        <div className="mt-3">
          <Alerte>{erreur}</Alerte>
        </div>
      )}
      {rapport && (
        <div className="mt-4 space-y-2 rounded-2xl bg-zinc-50 p-4 text-[13px]">
          <div>
            {rapport.lues} ligne(s) lue(s) : <strong>{rapport.inspections.creees}</strong> inspection(s) à créer ({rapport.inspections.existantes} déjà connue(s)), <strong>{rapport.etablissements.crees}</strong> établissement(s)
            à créer, {rapport.etablissements.misAJour} à mettre à jour, {rapport.etablissements.inchanges} inchangé(s).
          </div>
          {!!rapport.inspections.exemples.length && <div className="text-[12px] text-zinc-600">Inspections : {rapport.inspections.exemples.join(" · ")}</div>}
          {!!rapport.etablissements.exemples.length && <div className="text-[12px] text-zinc-600">Établissements : {rapport.etablissements.exemples.join(" · ")}</div>}
          {rapport.sansInspection > 0 && <div className="text-[12px] text-or-700">{rapport.sansInspection} école(s) sans inspection : rattachées directement à la DDEPPSA (à compléter).</div>}
          {rapport.sansCycle > 0 && <div className="text-[12px] text-or-700">{rapport.sansCycle} ligne(s) sans cycle reconnu.</div>}
          {rapport.ignorees.map((x) => (
            <div key={x.raison} className="text-[12px] text-rouge-600">
              {x.n} ligne(s) ignorée(s) : {x.raison} ({x.exemples.join(" · ")})
            </div>
          ))}
          <Bouton variante="principal" disabled={!fichier || envoi} onClick={() => fichier && envoyer(fichier, false)}>
            Enregistrer dans l’organigramme
          </Bouton>
        </div>
      )}
    </Carte>
  );
}
