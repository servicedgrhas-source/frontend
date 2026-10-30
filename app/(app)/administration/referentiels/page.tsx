"use client";

import { Download, PencilLine, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { SaisieReferentiel } from "@/components/saisie-referentiel";
import { useSession } from "@/components/session";
import { Alerte, Annonce, Badge, Bouton, BoutonIcone, Carte, Champ, Chargement, Chiffre, EnTete, Liste, Modale, Saisie, Segments, Tableau, Vide, useConfirmation } from "@/components/ui";
import { api, qs, useApi } from "@/lib/api";
import { accesDonne } from "@/lib/espaces";
import { peut } from "@/lib/libelles";

interface TypeRef {
  code: string;
  libelle: string;
  aide: string;
  parent?: string;
  n: number;
  actifs: number;
}
interface Resume {
  types: TypeRef[];
  organigramme: { ecoles: number; inspections: number; anciens: number };
}
interface Valeur {
  id: number;
  type: string;
  code: string;
  libelle: string;
  parent: string | null;
  departementId: number | null;
  donnees: Record<string, unknown>;
  actif: boolean;
  ordre: number;
  source: string;
}

const LOCALITES: Record<string, string> = { DISTRICT: "District", COMMUNE: "Commune", ARRONDISSEMENT: "Arrondissement" };
const nb = new Intl.NumberFormat("fr-FR");

/**
 * Référentiels : les listes où l'on choisit une valeur dans l'application (localités, matières,
 * postes…) et le référentiel de la carte scolaire (cycles, niveaux, matières, programmes).
 * Les écoles et les inspections sont dans l'Organigramme.
 */
export default function Referentiels() {
  const { profil } = useSession();
  const resume = useApi<Resume>("/referentiels/resume");
  const [type, setType] = useState("LOCALITE");
  const [q, setQ] = useState("");
  const [cycle, setCycle] = useState("");
  const valeurs = useApi<Valeur[]>(`/referentiels/valeurs${qs({ type, q, parent: ["NIVEAU", "MATIERE", "PROGRAMME"].includes(type) ? cycle : "" })}`);
  const cycles = useApi<Valeur[]>("/referentiels/valeurs?type=CYCLE");
  // Échelles : la suivante se choisit parmi les autres
  const echelles = useApi<Valeur[]>("/referentiels/valeurs?type=ECHELLE");
  const [edition, setEdition] = useState<Partial<Valeur> | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmation, demander] = useConfirmation();
  if (!peut.traiter(profil.role) && profil.role !== "DDEPPSA" && !accesDonne(profil)) return <Alerte>Accès réservé à la DGRHAS.</Alerte>;
  const dg = profil.role === "DG" || profil.role === "ADMIN";
  const t = resume.donnees?.types.find((x) => x.code === type);
  const parCycle = ["NIVEAU", "MATIERE", "PROGRAMME"].includes(type);

  return (
    <div className="space-y-5">
      <EnTete
        titre="Référentiels"
        sousTitre="Les listes où l’on choisit une valeur dans l’application, avec une recherche : localités, matières, postes… (une autre valeur reste toujours possible). Et le référentiel de la carte scolaire : cycles, niveaux, matières et programmes (heures par semaine et coefficient), qui servira au calcul du déficit d’enseignants. Les écoles et les inspections sont dans l’Organigramme."
        actions={
          dg && (
            <Bouton
              onClick={async () => {
                if (!(await demander("Reprendre les référentiels de l’ancien système (SGRH) ? Seules les valeurs manquantes sont ajoutées : rien de ce qui existe n’est modifié.", "Reprendre"))) return;
                setErreur(null);
                try {
                  const r = await api.post<{
                    valeurs: number;
                    inspections: { creees: number; completees: number };
                    ecoles: { creees: number; completees: number; renommees: number };
                    centrale: { creees: number; completees: number };
                  }>("/referentiels/import-ancien");
                  setMessage(
                    `${nb.format(r.valeurs)} valeur(s) ajoutée(s) ; organigramme : ${nb.format(r.inspections.creees)} inspection(s), ${nb.format(r.ecoles.creees)} école(s) et ${nb.format(r.centrale.creees)} structure(s) de l’administration centrale ajoutées, ${nb.format(r.ecoles.completees + r.inspections.completees + r.centrale.completees)} complétée(s), ${nb.format(r.ecoles.renommees)} nom(s) d’école corrigé(s).`,
                  );
                  resume.recharger();
                  valeurs.recharger();
                } catch (e) {
                  setErreur((e as Error).message);
                }
              }}
            >
              <Download /> Reprendre l’ancien système
            </Bouton>
          )
        }
      />
      <Annonce fermer={() => setMessage(null)}>{message}</Annonce>
      {erreur && <Alerte>{erreur}</Alerte>}

      {resume.donnees && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Chiffre libelle="Écoles dans l’organigramme" valeur={nb.format(resume.donnees.organigramme.ecoles)} detail={<Link href="/administration/organigramme" className="text-marque-700 hover:underline">Voir l’organigramme</Link>} />
          <Chiffre libelle="Inspections" valeur={nb.format(resume.donnees.organigramme.inspections)} />
          <Chiffre libelle="Structures reprises de l’ancien système" valeur={nb.format(resume.donnees.organigramme.anciens)} detail="avec leur code d’origine" />
        </div>
      )}

      <Segments
        valeur={type}
        changer={(v) => {
          setType(v);
          setQ("");
          setCycle("");
        }}
        options={(resume.donnees?.types ?? []).map((x) => ({ valeur: x.code, libelle: `${x.libelle} (${x.n})` }))}
      />

      <Carte
        titre={t?.libelle ?? ""}
        actions={
          dg && (
            <Bouton variante="principal" onClick={() => setEdition({ type, actif: true, donnees: {}, parent: parCycle ? cycle || null : null })}>
              <Plus /> Ajouter
            </Bouton>
          )
        }
      >
        {t && <p className="-mt-2 mb-4 text-[12px] text-zinc-500">{t.aide}</p>}
        <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_16rem]">
          <Saisie value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" />
          {parCycle && <Liste value={cycle} onChange={(e) => setCycle(e.target.value)} vide="Tous les cycles" options={(cycles.donnees ?? []).map((c) => ({ valeur: c.code, libelle: c.libelle }))} />}
        </div>
        {!valeurs.donnees ? (
          <Chargement />
        ) : !valeurs.donnees.length ? (
          <Vide>Aucune valeur.</Vide>
        ) : type === "PROGRAMME" ? (
          <Programmes valeurs={valeurs.donnees} modifier={dg ? setEdition : undefined} />
        ) : (
          <ListeValeurs type={type} valeurs={valeurs.donnees} modifier={dg ? setEdition : undefined} />
        )}
      </Carte>
      {edition && (
        <Edition
          v={edition}
          cycles={cycles.donnees ?? []}
          echelles={echelles.donnees ?? []}
          fermer={() => setEdition(null)}
          apres={() => {
            setEdition(null);
            valeurs.recharger();
            resume.recharger();
          }}
        />
      )}
      {confirmation}
    </div>
  );
}

function detailDe(type: string, v: Valeur) {
  const d = v.donnees ?? {};
  switch (type) {
    case "LOCALITE":
      return LOCALITES[String(d.typeLocalite)] ?? "";
    case "MATIERE":
      return [d.type, d.specialiste ? "enseignant spécialisé" : ""].filter(Boolean).join(" · ");
    case "CATEGORIE_AGENT":
      return d.ageRetraite ? `retraite à ${d.ageRetraite} ans` : "";
    case "ECHELLE":
      return [
        d.nombreEchelons && `${d.nombreEchelons} échelons`,
        d.dureeEchelonMois && `${d.dureeEchelonMois} mois par échelon`,
        // Rien de réglé : 4 échelons hors classe (DG, 29/10/2026)
        Number(d.echelonsHorsClasse ?? 4) > 0 ? `puis ${String(d.libelleHorsClasse || "hors classe").toLowerCase()} HC 1 à HC ${d.echelonsHorsClasse ?? 4}` : "pas de hors classe",
        d.echelleSuivante && `puis échelle ${d.echelleSuivante}`,
      ]
        .filter(Boolean)
        .join(" · ");
    case "CYCLE":
      return [d.description, d.quotaDefaut !== undefined && `quota par défaut ${d.quotaDefaut}`].filter(Boolean).join(" · ");
    case "NIVEAU":
    case "TYPE_MATIERE":
      return String(d.description ?? "");
    default:
      return "";
  }
}

function ListeValeurs({ type, valeurs, modifier }: { type: string; valeurs: Valeur[]; modifier?: (v: Valeur) => void }) {
  const { refs } = useSession();
  return (
    <Tableau>
      <thead>
        <tr>
          <th>Libellé</th>
          <th>Code</th>
          <th>Rattachement</th>
          <th>Détail</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {valeurs.map((v) => (
          <tr key={v.id} className={v.actif ? "" : "text-zinc-400"}>
            <td className="font-medium">
              {v.libelle} {!v.actif && <Badge ton="gris">désactivé</Badge>}
            </td>
            <td className="text-[12px] text-zinc-500">{v.code}</td>
            <td className="text-[12px]">{v.departementId ? refs.departements.find((d) => d.id === v.departementId)?.nom : (v.parent ?? "—")}</td>
            <td className="text-[12px] text-zinc-600">{detailDe(type, v)}</td>
            <td className="text-right">
              {modifier && (
                <BoutonIcone libelle="Modifier" onClick={() => modifier(v)}>
                  <PencilLine />
                </BoutonIcone>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </Tableau>
  );
}

/** Programmes : un tableau par cycle, niveaux en lignes, matières en colonnes, « heures (coefficient) ». */
function Programmes({ valeurs, modifier }: { valeurs: Valeur[]; modifier?: (v: Valeur) => void }) {
  const parCycle = new Map<string, Valeur[]>();
  for (const v of valeurs) parCycle.set(v.parent ?? "", [...(parCycle.get(v.parent ?? "") ?? []), v]);
  return (
    <div className="space-y-6">
      {[...parCycle.entries()].map(([cycle, liste]) => {
        const niveaux = [...new Set(liste.map((v) => String(v.donnees.niveau)))];
        const matieres = [...new Set(liste.map((v) => v.libelle.split(" · ")[1] ?? String(v.donnees.matiere)))];
        const cellule = (n: string, m: string) => liste.find((v) => String(v.donnees.niveau) === n && (v.libelle.split(" · ")[1] ?? "") === m);
        return (
          <div key={cycle}>
            <div className="mb-2 text-[13px] font-semibold">{cycle}</div>
            <Tableau>
              <thead>
                <tr>
                  <th>Niveau</th>
                  {matieres.map((m) => (
                    <th key={m}>{m}</th>
                  ))}
                  <th>Total / semaine</th>
                </tr>
              </thead>
              <tbody>
                {niveaux.map((n) => {
                  const total = liste.filter((v) => String(v.donnees.niveau) === n).reduce((t, v) => t + Number(v.donnees.heures ?? 0), 0);
                  return (
                    <tr key={n}>
                      <td className="font-medium whitespace-nowrap">{n}</td>
                      {matieres.map((m) => {
                        const c = cellule(n, m);
                        return (
                          <td key={m} className="text-center text-[12px]">
                            {c ? (
                              <button type="button" disabled={!modifier} onClick={() => modifier?.(c)} className="rounded px-1 hover:bg-marque-50 disabled:hover:bg-transparent">
                                {String(c.donnees.heures)} h <span className="text-zinc-400">(c{String(c.donnees.coefficient)})</span>
                              </button>
                            ) : (
                              <span className="text-zinc-300">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="text-center font-medium tabular-nums">{Math.round(total * 10) / 10} h</td>
                    </tr>
                  );
                })}
              </tbody>
            </Tableau>
          </div>
        );
      })}
      <p className="text-[11px] text-zinc-400">
        Heures par semaine et coefficient (« c ») de chaque matière à chaque niveau. Les programmes manquants (préscolaire, primaire au-delà du CP1, une partie du lycée) sont à compléter avec « Ajouter ».
      </p>
    </div>
  );
}

function Edition({ v, cycles, echelles, fermer, apres }: { v: Partial<Valeur>; cycles: Valeur[]; echelles: Valeur[]; fermer: () => void; apres: () => void }) {
  const { refs } = useSession();
  const [f, setF] = useState({
    libelle: v.libelle ?? "",
    code: v.code ?? "",
    parent: v.parent ?? "",
    departementId: v.departementId ? String(v.departementId) : "",
    actif: v.actif ?? true,
    ordre: String(v.ordre ?? 0),
    donnees: { ...(v.donnees ?? {}) } as Record<string, unknown>,
  });
  const [erreur, setErreur] = useState<string | null>(null);
  const type = v.type!;
  const d = (k: string) => String(f.donnees[k] ?? "");
  const setD = (k: string, val: unknown) => setF({ ...f, donnees: { ...f.donnees, [k]: val } });
  const parCycle = ["NIVEAU", "MATIERE", "PROGRAMME"].includes(type);
  const parDepartement = ["LOCALITE", "VILLE"].includes(type);
  return (
    <Modale titre={v.id ? `Modifier « ${v.libelle} »` : "Nouvelle valeur"} ouverte fermer={fermer}>
      <div className="space-y-3">
        {erreur && <Alerte>{erreur}</Alerte>}
        <Champ libelle="Libellé *">
          <Saisie autoFocus value={f.libelle} onChange={(e) => setF({ ...f, libelle: e.target.value })} placeholder={type === "PROGRAMME" ? "Ex. Sixième · Anglais" : ""} />
        </Champ>
        <Champ libelle="Code" aide={v.id ? "Le code ne change pas." : "Laissé vide : tiré du libellé."}>
          <Saisie value={f.code} disabled={!!v.id} onChange={(e) => setF({ ...f, code: e.target.value })} />
        </Champ>
        {parCycle && (
          <Champ libelle="Cycle">
            <Liste value={f.parent} onChange={(e) => setF({ ...f, parent: e.target.value })} vide="—" options={cycles.map((c) => ({ valeur: c.code, libelle: c.libelle }))} />
          </Champ>
        )}
        {parDepartement && (
          <Champ libelle="Département">
            <Liste
              value={f.departementId}
              onChange={(e) => {
                const dep = refs.departements.find((x) => String(x.id) === e.target.value);
                setF({ ...f, departementId: e.target.value, parent: dep?.code ?? "" });
              }}
              vide="—"
              options={refs.departements.map((x) => ({ valeur: x.id, libelle: x.nom }))}
            />
          </Champ>
        )}
        {type === "LOCALITE" && (
          <Champ libelle="Type de localité">
            <Liste value={d("typeLocalite")} onChange={(e) => setD("typeLocalite", e.target.value)} vide="—" options={Object.entries(LOCALITES).map(([k, l]) => ({ valeur: k, libelle: l }))} />
          </Champ>
        )}
        {type === "PROGRAMME" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Champ libelle="Code du niveau">
              <Saisie value={d("niveau")} onChange={(e) => setD("niveau", e.target.value)} placeholder="6EME" />
            </Champ>
            <Champ libelle="Code de la matière">
              <Saisie value={d("matiere")} onChange={(e) => setD("matiere", e.target.value)} placeholder="ANG_COL" />
            </Champ>
            <Champ libelle="Heures par semaine">
              <Saisie inputMode="decimal" value={d("heures")} onChange={(e) => setD("heures", Number(e.target.value.replace(",", ".")) || 0)} />
            </Champ>
            <Champ libelle="Coefficient">
              <Saisie inputMode="numeric" value={d("coefficient")} onChange={(e) => setD("coefficient", Number(e.target.value) || 0)} />
            </Champ>
          </div>
        )}
        {type === "MATIERE" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Champ libelle="Type de matière">
              <SaisieReferentiel liste="TYPE_MATIERE" valeur={d("type")} changer={(x) => setD("type", x)} placeholder="Scientifique" />
            </Champ>
            <label className="mt-6 flex items-center gap-2 text-[13px]">
              <input type="checkbox" className="size-4 accent-marque-600" checked={f.donnees.specialiste === true} onChange={(e) => setD("specialiste", e.target.checked)} />
              Enseignant spécialisé exigé
            </label>
          </div>
        )}
        {type === "CATEGORIE_AGENT" && (
          <Champ libelle="Âge de la retraite">
            <Saisie inputMode="numeric" value={d("ageRetraite")} onChange={(e) => setD("ageRetraite", Number(e.target.value) || null)} />
          </Champ>
        )}
        {type === "ECHELLE" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Champ libelle="Nombre d’échelons">
              <Saisie inputMode="numeric" value={d("nombreEchelons")} onChange={(e) => setD("nombreEchelons", Number(e.target.value) || null)} />
            </Champ>
            <Champ libelle="Durée d’un échelon (mois)" aide="Vide : le délai général des promotions (configuration du personnel).">
              <Saisie inputMode="numeric" value={d("dureeEchelonMois")} onChange={(e) => setD("dureeEchelonMois", Number(e.target.value) || null)} />
            </Champ>
            <Champ libelle="Échelons hors classe" aide="Après le dernier échelon (16), l’agent passe hors classe : HC 1, HC 2… Vide : 4 ; 0 : pas de hors classe.">
              <Saisie
                inputMode="numeric"
                value={d("echelonsHorsClasse")}
                placeholder="4"
                onChange={(e) => setD("echelonsHorsClasse", e.target.value.trim() === "" ? null : Number(e.target.value.replace(/\D/g, "")) || 0)}
              />
            </Champ>
            <Champ libelle="Nom du hors classe" aide="Le nom affiché (« Hors classe », « Hors catégorie »…) ; dans la fiche on écrit « HC 1 », « HC 2 »…">
              <Saisie value={d("libelleHorsClasse")} placeholder="Hors classe" onChange={(e) => setD("libelleHorsClasse", e.target.value || null)} />
            </Champ>
            <Champ libelle="Après le dernier échelon hors classe" aide="L’agent passe au 1er échelon de l’échelle choisie ; « aucune » : le dernier échelon hors classe est le dernier." className="sm:col-span-2">
              <Liste
                value={d("echelleSuivante")}
                onChange={(e) => setD("echelleSuivante", e.target.value || null)}
                vide="Aucune : pas de promotion d’échelon après le dernier"
                options={echelles.filter((x) => x.code !== f.code).map((x) => ({ valeur: x.code, libelle: `Passage à : ${x.libelle}` }))}
              />
            </Champ>
          </div>
        )}
        <Champ libelle="Ordre d’affichage">
          <Saisie inputMode="numeric" value={f.ordre} onChange={(e) => setF({ ...f, ordre: e.target.value.replace(/[^\d-]/g, "") })} />
        </Champ>
        <label className="flex items-center gap-2 text-[13px]">
          <input type="checkbox" className="size-4 accent-marque-600" checked={f.actif} onChange={(e) => setF({ ...f, actif: e.target.checked })} />
          Active (proposée dans les listes)
        </label>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Bouton onClick={fermer}>Annuler</Bouton>
        <Bouton
          variante="principal"
          disabled={!f.libelle.trim()}
          onClick={async () => {
            setErreur(null);
            const corps = {
              type,
              code: f.code || undefined,
              libelle: f.libelle,
              parent: f.parent || null,
              departementId: f.departementId ? Number(f.departementId) : null,
              donnees: f.donnees,
              actif: f.actif,
              ordre: Number(f.ordre) || 0,
            };
            try {
              if (v.id) await api.put(`/referentiels/valeurs/${v.id}`, corps);
              else await api.post("/referentiels/valeurs", corps);
              apres();
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
