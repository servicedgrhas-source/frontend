"use client";

import { ArrowDown, ArrowUp, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  type ChampFiche,
  type ColonneTableau,
  type Condition,
  type ConfigRecensement,
  type PieceExigee,
  type RegleCoherence,
  type TypeChamp,
  useConfigRecensement,
} from "@/components/recensement/commun";
import { useSession } from "@/components/session";
import { Alerte, Annonce, Badge, Bouton, BoutonIcone, Carte, Champ, Chargement, EnTete, Liste, Modale, Saisie, Segments, Tableau, Zone, useConfirmation } from "@/components/ui";
import { api } from "@/lib/api";
import { peut } from "@/lib/libelles";

type Onglet = "rubriques" | "pieces" | "statuts" | "controles";

/** « Date de naissance » → « DATE_DE_NAISSANCE » (comme le serveur). */
const versCode = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);

const deplacer = <T,>(l: T[], i: number, d: -1 | 1) => {
  const j = i + d;
  if (j < 0 || j >= l.length) return l;
  const c = [...l];
  [c[i], c[j]] = [c[j], c[i]];
  return c;
};

/** Configuration du recensement : rubriques de la fiche, obligations par type d'agent, pièces, contrôles. */
export default function ConfigurationRecensement() {
  const { profil } = useSession();
  const rep = useConfigRecensement();
  const [c, setC] = useState<ConfigRecensement | null>(null);
  const [onglet, setOnglet] = useState<Onglet>("rubriques");
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [rubrique, setRubrique] = useState<{ i: number | null; x: ChampFiche } | null>(null);
  const [piece, setPiece] = useState<{ i: number | null; x: PieceExigee } | null>(null);
  const [confirmation, demander] = useConfirmation();
  const modifiable = peut.parametrer(profil.role);

  if (rep.donnees && !c) setC(structuredClone(rep.donnees.configuration));
  if (rep.erreur) return <Alerte>{rep.erreur}</Alerte>;
  if (!rep.donnees || !c) return <Chargement />;
  const r = rep.donnees;
  const change = JSON.stringify(c) !== JSON.stringify(r.configuration);
  const maj = (p: Partial<ConfigRecensement>) => setC({ ...c, ...p });
  const statuts = c.statuts;
  const nomChamp = (code: string) => c.champs.find((x) => x.code === code)?.libelle ?? code;
  const resumeCondition = (cd: Condition | null) => {
    if (!cd) return "";
    const ch = c.champs.find((x) => x.code === cd.champ);
    return `si « ${nomChamp(cd.champ)} »${cd.valeurs.length ? ` = ${cd.valeurs.map((v) => ch?.options.find((o) => o.code === v)?.libelle ?? v).join(" ou ")}` : " est rempli"}`;
  };

  async function enregistrer() {
    setErreur(null);
    try {
      const nouvelle = await api.put<ConfigRecensement>("/recensement/configuration", c);
      setC(structuredClone(nouvelle));
      rep.recharger();
      setMessage("Configuration enregistrée. Ce qui manque à chaque fiche a été recalculé.");
    } catch (x) {
      setErreur((x as Error).message);
    }
  }

  const caseStatut = (liste: string[], code: string, changer: (l: string[]) => void) => (
    <input type="checkbox" className="size-4 accent-marque-600" checked={liste.includes(code)} onChange={(e) => changer(e.target.checked ? [...liste, code] : liste.filter((x) => x !== code))} />
  );

  return (
    <div className="space-y-6">
      <EnTete
        titre="Configuration du recensement"
        sousTitre="La fiche de renseignements telle que la DGRHAS la veut : ses rubriques, ce qui est obligatoire pour chaque type d’agent, les pièces justificatives à joindre et les contrôles. Tout se règle ici ; le modèle Excel, la saisie et l’import suivent aussitôt."
        actions={
          modifiable && (
            <>
              <Bouton
                onClick={async () => {
                  if (await demander("Remettre dans le formulaire la fiche de renseignements d’origine (GRH-SIGE) ? Rien n’est enregistré tant que vous ne cliquez pas sur « Enregistrer ».", "Reprendre la fiche d’origine")) setC(structuredClone(r.defaut));
                }}
              >
                <RotateCcw /> Fiche d’origine
              </Bouton>
              <Bouton disabled={!change} onClick={() => setC(structuredClone(r.configuration))}>
                Annuler les changements
              </Bouton>
              <Bouton variante="principal" disabled={!change} onClick={enregistrer}>
                Enregistrer
              </Bouton>
            </>
          )
        }
      />
      {!modifiable && <Alerte ton="bleu">Consultation seulement : le DG modifie cette configuration.</Alerte>}
      <Annonce fermer={() => setMessage(null)}>{message}</Annonce>
      {erreur && <Alerte>{erreur}</Alerte>}

      <Segments
        valeur={onglet}
        changer={setOnglet}
        options={[
          { valeur: "rubriques", libelle: `Rubriques de la fiche (${c.champs.length})` },
          { valeur: "pieces", libelle: `Pièces justificatives (${c.pieces.length})` },
          { valeur: "statuts", libelle: "Types d’agent et sections" },
          { valeur: "controles", libelle: "Contrôles et cohérence" },
        ]}
      />

      <fieldset disabled={!modifiable} className="min-w-0 space-y-6">
        {onglet === "rubriques" &&
          c.sections.map((sec) => {
            const indices = c.champs.map((x, i) => ({ x, i })).filter(({ x }) => x.section === sec.code);
            return (
              <Carte
                key={sec.code}
                titre={sec.libelle}
                actions={
                  <Bouton
                    variante="discret"
                    onClick={() =>
                      setRubrique({
                        i: null,
                        x: { code: "", libelle: "", section: sec.code, type: "TEXTE", obligatoirePour: [], si: null, options: [], autreValeur: false, entetes: [], aide: "", exemple: "", actif: true, systeme: false, colonnes: [] },
                      })
                    }
                  >
                    <Plus /> Ajouter une rubrique
                  </Bouton>
                }
              >
                {!indices.length ? (
                  <p className="text-[12px] text-zinc-400">Aucune rubrique dans cette section.</p>
                ) : (
                  <Tableau>
                    <thead>
                      <tr>
                        <th className="w-16" />
                        <th>Rubrique</th>
                        <th>Type</th>
                        {statuts.map((s) => (
                          <th key={s.code} className="w-24 text-center text-[11px]">
                            Obligatoire
                            <br />
                            {s.libelle.toLowerCase()}
                          </th>
                        ))}
                        <th className="w-16 text-center">Active</th>
                        <th className="w-20" />
                      </tr>
                    </thead>
                    <tbody>
                      {indices.map(({ x, i }, k) => {
                        const set = (p: Partial<ChampFiche>) => maj({ champs: c.champs.map((y, j) => (j === i ? { ...y, ...p } : y)) });
                        return (
                          <tr key={x.code || i} className={x.actif ? "" : "opacity-50"}>
                            <td className="whitespace-nowrap">
                              <BoutonIcone libelle="Monter" onClick={() => k > 0 && maj({ champs: swap(c.champs, i, indices[k - 1].i) })}>
                                <ArrowUp />
                              </BoutonIcone>
                              <BoutonIcone libelle="Descendre" onClick={() => k < indices.length - 1 && maj({ champs: swap(c.champs, i, indices[k + 1].i) })}>
                                <ArrowDown />
                              </BoutonIcone>
                            </td>
                            <td>
                              <div className="font-medium">{x.libelle}</div>
                              <div className="text-[11px] text-zinc-400">
                                {x.code}
                                {x.si && ` · ${resumeCondition(x.si)}`}
                                {x.systeme && " · utilisée par le système"}
                              </div>
                            </td>
                            <td className="text-[12px]">
                              {r.types[x.type]}
                              {!!x.options.length && <div className="text-[11px] text-zinc-400">{x.options.length} valeur(s)</div>}
                            </td>
                            {statuts.map((s) => (
                              <td key={s.code} className="text-center">
                                {caseStatut(x.obligatoirePour, s.code, (l) => set({ obligatoirePour: l }))}
                              </td>
                            ))}
                            <td className="text-center">
                              <input type="checkbox" className="size-4 accent-marque-600" disabled={x.systeme} checked={x.actif} onChange={(e) => set({ actif: e.target.checked })} />
                            </td>
                            <td className="text-right whitespace-nowrap">
                              <BoutonIcone libelle="Modifier" onClick={() => setRubrique({ i, x: structuredClone(x) })}>
                                <Pencil />
                              </BoutonIcone>
                              {!x.systeme && (
                                <BoutonIcone
                                  libelle="Supprimer"
                                  onClick={async () => {
                                    if (await demander(`Supprimer la rubrique « ${x.libelle} » ? Les valeurs déjà saisies restent dans les fiches mais ne s’affichent plus. Pour la cacher sans la perdre, décochez plutôt « Active ».`, "Supprimer"))
                                      maj({ champs: c.champs.filter((_, j) => j !== i) });
                                  }}
                                >
                                  <Trash2 />
                                </BoutonIcone>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Tableau>
                )}
              </Carte>
            );
          })}

        {onglet === "pieces" && (
          <Carte
            titre="Pièces justificatives"
            actions={
              <Bouton variante="discret" onClick={() => setPiece({ i: null, x: { code: "", libelle: "", exigeePour: [], si: null, nombreSelon: null, actif: true } })}>
                <Plus /> Ajouter une pièce
              </Bouton>
            }
          >
            <p className="-mt-2 mb-4 text-[12px] text-zinc-500">
              Une pièce cochée pour un type d’agent est exigée pour lui ; non cochée, elle reste possible (facultative). Le code sert à nommer les scans déposés en masse (ex. REC-000123_CNI.pdf).
            </p>
            <Tableau>
              <thead>
                <tr>
                  <th>Pièce</th>
                  {statuts.map((s) => (
                    <th key={s.code} className="w-24 text-center text-[11px]">
                      Exigée
                      <br />
                      {s.libelle.toLowerCase()}
                    </th>
                  ))}
                  <th>Condition</th>
                  <th className="w-16 text-center">Active</th>
                  <th className="w-20" />
                </tr>
              </thead>
              <tbody>
                {c.pieces.map((x, i) => {
                  const set = (p: Partial<PieceExigee>) => maj({ pieces: c.pieces.map((y, j) => (j === i ? { ...y, ...p } : y)) });
                  return (
                    <tr key={x.code || i} className={x.actif ? "" : "opacity-50"}>
                      <td>
                        <div className="font-medium">{x.libelle}</div>
                        <div className="text-[11px] text-zinc-400">{x.code}</div>
                      </td>
                      {statuts.map((s) => (
                        <td key={s.code} className="text-center">
                          {caseStatut(x.exigeePour, s.code, (l) => set({ exigeePour: l }))}
                        </td>
                      ))}
                      <td className="text-[12px] text-zinc-600">
                        {[resumeCondition(x.si), x.nombreSelon && (x.nombreSelon === "NOMBRE_ENFANTS" || x.nombreSelon === "ENFANTS" ? "une par enfant" : `une par ligne de « ${nomChamp(x.nombreSelon)} »`)].filter(Boolean).join(" ; ") || "—"}
                      </td>
                      <td className="text-center">
                        <input type="checkbox" className="size-4 accent-marque-600" checked={x.actif} onChange={(e) => set({ actif: e.target.checked })} />
                      </td>
                      <td className="text-right whitespace-nowrap">
                        <BoutonIcone libelle="Modifier" onClick={() => setPiece({ i, x: structuredClone(x) })}>
                          <Pencil />
                        </BoutonIcone>
                        <BoutonIcone
                          libelle="Supprimer"
                          onClick={async () => {
                            if (await demander(`Supprimer la pièce « ${x.libelle} » ? Les scans déjà déposés restent dans les fiches. Pour ne plus l’exiger, décochez plutôt les types d’agent.`, "Supprimer"))
                              maj({ pieces: c.pieces.filter((_, j) => j !== i) });
                          }}
                        >
                          <Trash2 />
                        </BoutonIcone>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Tableau>
          </Carte>
        )}

        {onglet === "statuts" && (
          <div className="grid gap-6 xl:grid-cols-2">
            <Carte
              titre="Types d’agent"
              actions={
                <Bouton variante="discret" onClick={() => maj({ statuts: [...statuts, { code: "", libelle: "", synonymes: [], actif: true }] })}>
                  <Plus /> Ajouter un type
                </Bouton>
              }
            >
              <p className="-mt-2 mb-4 text-[12px] text-zinc-500">Les écritures reconnues servent à lire la colonne « Type d’agent » des fichiers Excel.</p>
              <Tableau>
                <thead>
                  <tr>
                    <th>Type d’agent</th>
                    <th>Écritures reconnues (séparées par des virgules)</th>
                    <th className="w-16 text-center">Actif</th>
                  </tr>
                </thead>
                <tbody>
                  {statuts.map((x, i) => {
                    const set = (p: Partial<typeof x>) => maj({ statuts: statuts.map((y, j) => (j === i ? { ...y, ...p } : y)) });
                    return (
                      <tr key={i}>
                        <td>
                          <Saisie value={x.libelle} onChange={(e) => set({ libelle: e.target.value })} className="w-full" />
                          <div className="mt-1 text-[11px] text-zinc-400">{x.code || "nouveau"}</div>
                        </td>
                        <td>
                          <Saisie value={x.synonymes.join(", ")} onChange={(e) => set({ synonymes: e.target.value.split(",").map((s) => s.trim()) })} className="w-full" />
                        </td>
                        <td className="text-center">
                          <input type="checkbox" className="size-4 accent-marque-600" checked={x.actif} onChange={(e) => set({ actif: e.target.checked })} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Tableau>
              <p className="mt-3 text-[11px] text-zinc-400">Un type déjà utilisé ne se supprime pas : désactivez-le.</p>
            </Carte>
            <Carte
              titre="Sections de la fiche"
              actions={
                <Bouton variante="discret" onClick={() => maj({ sections: [...c.sections, { code: "", libelle: "" }] })}>
                  <Plus /> Ajouter une section
                </Bouton>
              }
            >
              <Tableau>
                <tbody>
                  {c.sections.map((x, i) => (
                    <tr key={i}>
                      <td className="w-16 whitespace-nowrap">
                        <BoutonIcone libelle="Monter" onClick={() => maj({ sections: deplacer(c.sections, i, -1) })}>
                          <ArrowUp />
                        </BoutonIcone>
                        <BoutonIcone libelle="Descendre" onClick={() => maj({ sections: deplacer(c.sections, i, 1) })}>
                          <ArrowDown />
                        </BoutonIcone>
                      </td>
                      <td>
                        <Saisie
                          value={x.libelle}
                          onChange={(e) => maj({ sections: c.sections.map((y, j) => (j === i ? { ...y, code: y.code || "", libelle: e.target.value } : y)) })}
                          onBlur={() => !x.code && x.libelle && maj({ sections: c.sections.map((y, j) => (j === i ? { ...y, code: versCode(y.libelle) } : y)) })}
                          className="w-full"
                        />
                      </td>
                      <td className="w-24 text-right text-[11px] text-zinc-400">{c.champs.filter((ch) => ch.section === x.code).length} rubrique(s)</td>
                      <td className="w-10 text-right">
                        {!c.champs.some((ch) => ch.section === x.code) && (
                          <BoutonIcone libelle="Supprimer" onClick={() => maj({ sections: c.sections.filter((_, j) => j !== i) })}>
                            <Trash2 />
                          </BoutonIcone>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Tableau>
            </Carte>
          </div>
        )}

        {onglet === "controles" && (
          <>
            <Carte titre="Contrôles">
              <div className="grid gap-4 md:grid-cols-3">
                <Champ libelle="Âge minimum" aide="En dessous : date de naissance à vérifier.">
                  <Saisie inputMode="numeric" value={String(c.ageMinimum)} onChange={(e) => maj({ ageMinimum: Number(e.target.value.replace(/\D/g, "")) || 0 })} />
                </Champ>
                <Champ
                  libelle="Âge de la retraite (catégorie inconnue)"
                  aide="Chaque catégorie a son âge dans Administration › Référentiels › Catégories d’agents. Laissez vide : un agent sans catégorie n’a pas d’âge de retraite supposé (sa catégorie est signalée manquante)."
                >
                  <Saisie inputMode="numeric" value={c.ageRetraite ? String(c.ageRetraite) : ""} placeholder="Vide : aucun âge supposé" onChange={(e) => maj({ ageRetraite: Number(e.target.value.replace(/\D/g, "")) || null })} />
                </Champ>
                <Champ libelle="Promotion du fonctionnaire (mois)" aide="Délai entre deux promotions ordinaires : 24 mois (2 ans). Au-delà, la promotion est signalée « due ».">
                  <Saisie inputMode="numeric" value={String(c.delaiPromotionMois ?? 24)} onChange={(e) => maj({ delaiPromotionMois: Number(e.target.value.replace(/\D/g, "")) || 0 })} />
                </Champ>
                <Champ libelle="Avancement du contractuel (mois)" aide="Délai entre deux avancements ordinaires : 28 mois (2 ans et 4 mois).">
                  <Saisie inputMode="numeric" value={String(c.delaiAvancementMois ?? 28)} onChange={(e) => maj({ delaiAvancementMois: Number(e.target.value.replace(/\D/g, "")) || 0 })} />
                </Champ>
                <Champ libelle="Téléphone partagé" aide="Même numéro pour ce nombre d’agents ou plus : signalé.">
                  <Saisie inputMode="numeric" value={String(c.telephonePartage)} onChange={(e) => maj({ telephonePartage: Number(e.target.value.replace(/\D/g, "")) || 0 })} />
                </Champ>
              </div>
              <label className="mt-4 flex items-start gap-2 text-[13px]">
                <input type="checkbox" className="mt-0.5 size-4 accent-marque-600" checked={c.contentieuxHorsBase !== false} onChange={(e) => maj({ contentieuxHorsBase: e.target.checked })} />
                <span>
                  Recensement sur le terrain : une fiche créée par un DDEPPSA ou un établissement (agent absent des bases de la DGRHAS) est mise <strong>en contentieux</strong>, à vérifier puis à décider par le DG.
                </span>
              </label>
              <p className="mt-3 text-[11px] text-zinc-400">
                Sont aussi signalés : même nom et même date de naissance, même personne probable sous deux fiches (à fusionner), même matricule pour plusieurs agents, valeurs hors des listes.
              </p>
            </Carte>
            <Carte
              titre="Règles de cohérence"
              actions={
                <Bouton
                  variante="discret"
                  onClick={() => maj({ regles: [...c.regles, { code: "", libelle: "", si: { champ: "", valeurs: [] }, alors: { champ: "", valeurs: [] }, actif: true }] })}
                >
                  <Plus /> Ajouter une règle
                </Bouton>
              }
            >
              <p className="-mt-2 mb-4 text-[12px] text-zinc-500">
                « Si la rubrique X vaut A, alors la rubrique Y doit valoir B ou C. » Une fiche qui ne la respecte pas est signalée dans le tableau de bord (ex. une licence avec le cycle primaire).
              </p>
              <div className="space-y-4">
                {c.regles.map((x, i) => (
                  <EditeurRegle
                    key={i}
                    regle={x}
                    champs={c.champs.filter((ch) => ch.options.length)}
                    changer={(p) => maj({ regles: c.regles.map((y, j) => (j === i ? { ...y, ...p } : y)) })}
                    supprimer={() => maj({ regles: c.regles.filter((_, j) => j !== i) })}
                  />
                ))}
              </div>
            </Carte>
          </>
        )}
      </fieldset>

      {rubrique && (
        <EditeurRubrique
          depart={rubrique.x}
          nouvelle={rubrique.i === null}
          config={c}
          types={r.types}
          fermer={() => setRubrique(null)}
          valider={(x) => {
            const champs = [...c.champs];
            if (rubrique.i === null) champs.push(x);
            else champs[rubrique.i] = x;
            maj({ champs });
            setRubrique(null);
          }}
        />
      )}
      {piece && (
        <EditeurPiece
          depart={piece.x}
          nouvelle={piece.i === null}
          config={c}
          fermer={() => setPiece(null)}
          valider={(x) => {
            const pieces = [...c.pieces];
            if (piece.i === null) pieces.push(x);
            else pieces[piece.i] = x;
            maj({ pieces });
            setPiece(null);
          }}
        />
      )}
      {confirmation}
    </div>
  );
}

function swap<T>(l: T[], i: number, j: number) {
  const c = [...l];
  [c[i], c[j]] = [c[j], c[i]];
  return c;
}

/** Choix d'une condition : rubrique, puis ses valeurs (cases à cocher pour une liste). */
function EditeurCondition({ cd, config, changer, vide }: { cd: Condition | null; config: ConfigRecensement; changer: (c: Condition | null) => void; vide: string }) {
  const ch = config.champs.find((x) => x.code === cd?.champ);
  return (
    <div className="space-y-2">
      <Liste
        value={cd?.champ ?? ""}
        onChange={(e) => changer(e.target.value ? { champ: e.target.value, valeurs: [] } : null)}
        vide={vide}
        options={config.champs.map((x) => ({ valeur: x.code, libelle: x.libelle }))}
      />
      {cd && ch && ch.options.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 rounded-xl bg-zinc-50 px-3 py-2">
          {ch.options.map((o) => (
            <label key={o.code} className="flex items-center gap-1.5 text-[12px]">
              <input
                type="checkbox"
                className="size-4 accent-marque-600"
                checked={cd.valeurs.includes(o.code)}
                onChange={(e) => changer({ ...cd, valeurs: e.target.checked ? [...cd.valeurs, o.code] : cd.valeurs.filter((v) => v !== o.code) })}
              />
              {o.libelle}
            </label>
          ))}
        </div>
      )}
      {cd && ch && !ch.options.length && <p className="text-[11px] text-zinc-400">Condition : la rubrique est remplie.</p>}
    </div>
  );
}

function EditeurRubrique({
  depart,
  nouvelle,
  config,
  types,
  fermer,
  valider,
}: {
  depart: ChampFiche;
  nouvelle: boolean;
  config: ConfigRecensement;
  types: Record<TypeChamp, string>;
  fermer: () => void;
  valider: (x: ChampFiche) => void;
}) {
  const [x, setX] = useState(depart);
  const [options, setOptions] = useState(depart.options.map((o) => [o.libelle, ...o.synonymes].join(" | ")).join("\n"));
  const [erreur, setErreur] = useState<string | null>(null);
  const set = (p: Partial<ChampFiche>) => setX({ ...x, ...p });
  const avecListe = x.type === "LISTE" || x.type === "LISTE_MULTIPLE";
  const [colonnes, setColonnes] = useState(
    (depart.colonnes ?? []).map((c) => [c.libelle, c.type.toLowerCase(), ...(c.type === "LISTE" ? [c.options.map((o) => o.libelle).join(" ; ")] : [])].join(" | ")).join("\n"),
  );

  function ok() {
    if (!x.libelle.trim()) return setErreur("Écrivez le libellé de la rubrique.");
    const code = x.code || versCode(x.libelle);
    if (nouvelle && config.champs.some((c) => c.code === code)) return setErreur(`Une rubrique a déjà le code « ${code} » : changez le libellé ou le code.`);
    const opts = avecListe
      ? options
          .split("\n")
          .map((l) => l.split("|").map((s) => s.trim()))
          .filter((l) => l[0])
          .map(([libelle, ...syn]) => ({ code: depart.options.find((o) => o.libelle === libelle)?.code ?? versCode(libelle), libelle, synonymes: syn.filter(Boolean) }))
      : [];
    if (avecListe && !opts.length) return setErreur("Une liste a besoin d’au moins une valeur.");
    const typesCase: Record<string, ColonneTableau["type"]> = { TEXTE: "TEXTE", DATE: "DATE", NOMBRE: "NOMBRE", LISTE: "LISTE" };
    const anciennes = depart.colonnes ?? [];
    const cols: ColonneTableau[] =
      x.type === "TABLEAU"
        ? colonnes
            .split("\n")
            .map((l) => l.split("|").map((v) => v.trim()))
            .filter((l) => l[0])
            .map(([libelle, type, valeurs]) => {
              const t = typesCase[versCode(type ?? "")] ?? "TEXTE";
              const options = (valeurs ?? "")
                .split(";")
                .map((v) => v.trim())
                .filter(Boolean)
                .map((v) => ({ code: anciennes.flatMap((c) => c.options).find((o) => o.libelle === v)?.code ?? versCode(v), libelle: v, synonymes: [] }));
              return { code: anciennes.find((c) => c.libelle === libelle)?.code ?? versCode(libelle), libelle, type: t === "LISTE" && !options.length ? "TEXTE" : t, options };
            })
        : [];
    if (x.type === "TABLEAU" && !cols.length) return setErreur("Un tableau a besoin d’au moins une case.");
    valider({ ...x, code, libelle: x.libelle.trim(), options: opts, colonnes: cols });
  }

  return (
    <Modale titre={nouvelle ? "Nouvelle rubrique" : `Rubrique « ${depart.libelle} »`} ouverte fermer={fermer} large>
      <div className="grid gap-3 sm:grid-cols-2">
        <Champ libelle="Libellé" className="sm:col-span-2">
          <Saisie value={x.libelle} onChange={(e) => set({ libelle: e.target.value })} placeholder="Ex. Numéro CNI" />
        </Champ>
        <Champ libelle="Code" aide={nouvelle ? "Laissé vide : tiré du libellé." : "Le code ne change pas (il relie les valeurs déjà saisies)."}>
          <Saisie value={x.code} disabled={!nouvelle} onChange={(e) => set({ code: versCode(e.target.value) })} placeholder={versCode(x.libelle)} />
        </Champ>
        <Champ libelle="Section">
          <Liste value={x.section} onChange={(e) => set({ section: e.target.value })} options={config.sections.map((s) => ({ valeur: s.code, libelle: s.libelle }))} />
        </Champ>
        <Champ libelle="Type de réponse">
          <Liste value={x.type} disabled={x.systeme} onChange={(e) => set({ type: e.target.value as TypeChamp })} options={Object.entries(types).map(([k, l]) => ({ valeur: k, libelle: l }))} />
        </Champ>
        {x.type === "TEXTE" && (
          <Champ libelle="Liste de référence" aide="Avec une liste, la valeur se choisit avec une recherche (Administration › Référentiels) ; une autre valeur reste possible.">
            <Liste
              value={x.referentiel ?? ""}
              onChange={(e) => set({ referentiel: (e.target.value || null) as ChampFiche["referentiel"] })}
              vide="— Aucune (texte libre) —"
              options={[
                { valeur: "ETABLISSEMENT", libelle: "Écoles (organigramme)" },
                { valeur: "INSPECTION", libelle: "Inspections (organigramme)" },
                { valeur: "STRUCTURE", libelle: "Structures administratives" },
                { valeur: "LOCALITE", libelle: "Districts, communes, arrondissements, villes" },
                { valeur: "MATIERE", libelle: "Matières" },
                { valeur: "POSTE", libelle: "Postes et fonctions" },
                { valeur: "NIVEAU", libelle: "Niveaux" },
                { valeur: "CYCLE", libelle: "Cycles" },
              ]}
            />
          </Champ>
        )}
        <Champ libelle="Exemple (montré dans le formulaire et le modèle Excel)">
          <Saisie value={x.exemple} onChange={(e) => set({ exemple: e.target.value })} />
        </Champ>
        {avecListe && (
          <>
            <Champ libelle="Valeurs de la liste" aide="Une valeur par ligne. Après « | », les autres écritures reconnues à l’import : « Marié(e) | MARIEE | MARRIED »." className="sm:col-span-2">
              <Zone value={options} onChange={(e) => setOptions(e.target.value)} className="min-h-32" />
            </Champ>
            <label className="flex items-center gap-2 text-[13px] sm:col-span-2">
              <input type="checkbox" className="size-4 accent-marque-600" checked={x.autreValeur} onChange={(e) => set({ autreValeur: e.target.checked })} />
              Accepter une autre valeur que celles de la liste (elle sera signalée « à vérifier »)
            </label>
          </>
        )}
        {x.type === "TABLEAU" && (
          <Champ
            libelle="Cases de chaque ligne"
            aide="Une case par ligne : « Libellé | type », le type étant texte, date, nombre ou liste. Pour une liste, ajoutez ses valeurs : « Nature | liste | Promotion ; Avancement d’échelon »."
            className="sm:col-span-2"
          >
            <Zone value={colonnes} onChange={(e) => setColonnes(e.target.value)} className="min-h-28" placeholder={"Date | date\nTexte (arrêté n°… du…) | texte"} />
          </Champ>
        )}
        <Champ libelle="Aide (sous le champ)" className="sm:col-span-2">
          <Saisie value={x.aide} onChange={(e) => set({ aide: e.target.value })} />
        </Champ>
        <Champ libelle="Autres titres de colonne reconnus à l’import" aide="Séparés par des virgules (ex. « SEXE » pour « Genre »)." className="sm:col-span-2">
          <Saisie value={x.entetes.join(", ")} onChange={(e) => set({ entetes: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
        </Champ>
        <div className="sm:col-span-2">
          <div className="mb-1.5 text-xs font-medium text-zinc-500">Obligatoire pour</div>
          <div className="flex flex-wrap gap-4">
            {config.statuts.map((s) => (
              <label key={s.code} className="flex items-center gap-1.5 text-[13px]">
                <input
                  type="checkbox"
                  className="size-4 accent-marque-600"
                  checked={x.obligatoirePour.includes(s.code)}
                  onChange={(e) => set({ obligatoirePour: e.target.checked ? [...x.obligatoirePour, s.code] : x.obligatoirePour.filter((v) => v !== s.code) })}
                />
                {s.libelle}
              </label>
            ))}
          </div>
        </div>
        <Champ libelle="…seulement si (facultatif)" className="sm:col-span-2">
          <EditeurCondition cd={x.si} config={{ ...config, champs: config.champs.filter((c) => c.code !== x.code) }} changer={(si) => set({ si })} vide="— Toujours —" />
        </Champ>
      </div>
      {erreur && (
        <div className="mt-4">
          <Alerte>{erreur}</Alerte>
        </div>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <Bouton onClick={fermer}>Annuler</Bouton>
        <Bouton variante="principal" onClick={ok}>
          Valider
        </Bouton>
      </div>
      <p className="mt-2 text-right text-[11px] text-zinc-400">Rien n’est enregistré avant « Enregistrer » en haut de la page.</p>
    </Modale>
  );
}

function EditeurPiece({
  depart,
  nouvelle,
  config,
  fermer,
  valider,
}: {
  depart: PieceExigee;
  nouvelle: boolean;
  config: ConfigRecensement;
  fermer: () => void;
  valider: (x: PieceExigee) => void;
}) {
  const [x, setX] = useState(depart);
  const [erreur, setErreur] = useState<string | null>(null);
  const set = (p: Partial<PieceExigee>) => setX({ ...x, ...p });
  return (
    <Modale titre={nouvelle ? "Nouvelle pièce justificative" : `Pièce « ${depart.libelle} »`} ouverte fermer={fermer} large>
      <div className="grid gap-3 sm:grid-cols-2">
        <Champ libelle="Libellé" className="sm:col-span-2">
          <Saisie value={x.libelle} onChange={(e) => set({ libelle: e.target.value })} placeholder="Ex. Certificat de prise de service" />
        </Champ>
        <Champ libelle="Code (nom des scans en masse)" aide={nouvelle ? "Laissé vide : tiré du libellé." : "Le code ne change pas."}>
          <Saisie value={x.code} disabled={!nouvelle} onChange={(e) => set({ code: versCode(e.target.value) })} placeholder={versCode(x.libelle)} />
        </Champ>
        <Champ libelle="Une pièce par unité de…" aide="Ex. une par enfant (Nombre d’enfants), une par promotion.">
          <Liste
            value={x.nombreSelon ?? ""}
            onChange={(e) => set({ nombreSelon: e.target.value || null })}
            vide="— Une seule pièce —"
            options={config.champs.filter((c) => ["NOMBRE", "LIGNES", "LISTE_MULTIPLE", "TABLEAU"].includes(c.type)).map((c) => ({ valeur: c.code, libelle: c.libelle }))}
          />
        </Champ>
        <div className="sm:col-span-2">
          <div className="mb-1.5 text-xs font-medium text-zinc-500">Exigée pour</div>
          <div className="flex flex-wrap gap-4">
            {config.statuts.map((s) => (
              <label key={s.code} className="flex items-center gap-1.5 text-[13px]">
                <input
                  type="checkbox"
                  className="size-4 accent-marque-600"
                  checked={x.exigeePour.includes(s.code)}
                  onChange={(e) => set({ exigeePour: e.target.checked ? [...x.exigeePour, s.code] : x.exigeePour.filter((v) => v !== s.code) })}
                />
                {s.libelle}
              </label>
            ))}
          </div>
        </div>
        <Champ libelle="…seulement si (facultatif)" aide="Ex. Situation matrimoniale = Marié(e) pour l’acte de mariage." className="sm:col-span-2">
          <EditeurCondition cd={x.si} config={config} changer={(si) => set({ si })} vide="— Toujours —" />
        </Champ>
      </div>
      {erreur && (
        <div className="mt-4">
          <Alerte>{erreur}</Alerte>
        </div>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <Bouton onClick={fermer}>Annuler</Bouton>
        <Bouton
          variante="principal"
          onClick={() => {
            if (!x.libelle.trim()) return setErreur("Écrivez le libellé de la pièce.");
            const code = x.code || versCode(x.libelle);
            if (nouvelle && config.pieces.some((p) => p.code === code)) return setErreur(`Une pièce a déjà le code « ${code} ».`);
            valider({ ...x, code, libelle: x.libelle.trim() });
          }}
        >
          Valider
        </Bouton>
      </div>
    </Modale>
  );
}

function EditeurRegle({ regle, champs, changer, supprimer }: { regle: RegleCoherence; champs: ChampFiche[]; changer: (p: Partial<RegleCoherence>) => void; supprimer: () => void }) {
  const config = { champs } as ConfigRecensement;
  return (
    <div className={`rounded-2xl border border-zinc-200 p-4 ${regle.actif ? "" : "opacity-60"}`}>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Saisie value={regle.libelle} onChange={(e) => changer({ libelle: e.target.value })} placeholder="Nom de la règle (ex. Licence avec le cycle primaire)" className="min-w-0 flex-1" />
        <label className="flex items-center gap-1.5 text-[12px]">
          <input type="checkbox" className="size-4 accent-marque-600" checked={regle.actif} onChange={(e) => changer({ actif: e.target.checked })} />
          Active
        </label>
        <BoutonIcone libelle="Supprimer la règle" onClick={supprimer}>
          <Trash2 />
        </BoutonIcone>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Badge ton="bleu">Si</Badge>
          <div className="mt-2">
            <EditeurCondition cd={regle.si.champ ? regle.si : null} config={config} changer={(si) => changer({ si: si ?? { champ: "", valeurs: [] } })} vide="— Choisir la rubrique —" />
          </div>
        </div>
        <div>
          <Badge ton="vert">Alors elle doit valoir</Badge>
          <div className="mt-2">
            <EditeurCondition cd={regle.alors.champ ? regle.alors : null} config={config} changer={(alors) => changer({ alors: alors ?? { champ: "", valeurs: [] } })} vide="— Choisir la rubrique —" />
          </div>
        </div>
      </div>
    </div>
  );
}
