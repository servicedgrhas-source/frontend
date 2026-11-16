"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { nf } from "@/components/enrolement/volontaires";
import { useSession } from "@/components/session";
import { Alerte, Badge, Bouton, Carte, Chargement, Chiffre, EnTete, Liste, Saisie, Segments, Tableau, Vide } from "@/components/ui";
import { api, qs, useApi } from "@/lib/api";
import { accesDonne } from "@/lib/espaces";
import { peut } from "@/lib/libelles";

type Effectif = "volontaires" | "communautaires" | "contractuels" | "fonctionnaires";
const EFFECTIFS: [Effectif, string][] = [
  ["volontaires", "Volontaires"],
  ["communautaires", "Communautaires"],
  ["contractuels", "Contractuels"],
  ["fonctionnaires", "Fonctionnaires"],
];

const CYCLES: Record<string, string> = {
  PRESCOLAIRE: "Préscolaire",
  PRIMAIRE: "Primaire",
  COLLEGE: "Collège",
  LYCEE: "Lycée",
  ALPHABETISATION: "Alphabétisation",
};

type Nombres = Record<Effectif, number> & { total: number };

interface Ecole extends Nombres {
  departementId: number | null;
  departement: string;
  cycle: string | null;
  nom: string;
  organigramme: boolean;
  ecritures: number;
}

interface Effectifs {
  totaux: Nombres & { ecoles: number; sousSeuil: number };
  parDeppsa: (Nombres & { departement: string; ecoles: number; sousSeuil: number })[];
  sansEcole: { effectif: Effectif; libelle: string; sans: number; administration: number }[];
  reclassees: number;
  aHarmoniser: number;
  horsOrganigramme: number;
  total: number;
  ecoles: Ecole[];
}

/**
 * Effectifs par école (demande de la Banque mondiale, 16/11/2026) : pour chaque école, rangée par
 * DEPPSA, le nombre de volontaires, de communautaires, de contractuels et de fonctionnaires. Les
 * écoles qui ont moins de 3 fonctionnaires sont signalées : elles passent en priorité. Aucun nom de
 * personne, seulement des nombres ; la page ne modifie rien.
 */
export default function EffectifsEcoles() {
  const { profil, refs } = useSession();
  const [cycle, setCycle] = useState("PRESCOLAIRE");
  const [departementId, setDepartementId] = useState("");
  const [seuil, setSeuil] = useState("3");
  const [sousSeuil, setSousSeuil] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [page, setPage] = useState(1);
  const [vue, setVue] = useState<"deppsa" | "ecoles">("deppsa");
  const [erreur, setErreur] = useState<string | null>(null);
  const s = Math.min(50, Math.max(1, Number(seuil) || 3));
  const filtres = { cycle, departementId: departementId || undefined, seuil: s, sousSeuil: sousSeuil ? 1 : undefined, recherche: recherche.trim() || undefined };
  const d = useApi<Effectifs>(`/enrolement/effectifs-ecoles${qs({ ...filtres, page, taille: 50 })}`);
  if (!peut.traiter(profil.role) && !accesDonne(profil)) return <Alerte>Accès réservé aux agents de la DGRHAS.</Alerte>;

  const changer = (f: (v: string) => void) => (v: string) => {
    f(v);
    setPage(1);
  };
  const telecharger = () =>
    api.telecharger(`/enrolement/effectifs-ecoles/excel${qs(filtres)}`, "Effectifs par école.xlsx").catch((x: Error) => setErreur(x.message));
  const t = d.donnees?.totaux;
  const pages = d.donnees ? Math.max(1, Math.ceil(d.donnees.total / 50)) : 1;
  const voirEcoles = (dep: string | null, sous: boolean) => {
    const id = dep ? refs.departements.find((x) => x.nom === dep)?.id : undefined;
    if (dep && id) setDepartementId(String(id));
    setSousSeuil(sous);
    setVue("ecoles");
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <EnTete
        titre="Effectifs par école (Banque mondiale)"
        sousTitre={`Pour chaque école, rangée par DEPPSA : le nombre de volontaires, de communautaires, de contractuels et de fonctionnaires. En orange, les écoles qui ont moins de ${s} fonctionnaires : elles passent en priorité. La même école écrite de plusieurs façons est comptée une seule fois. Seulement des nombres, aucun nom de personne.`}
        actions={
          <Bouton onClick={telecharger} title="Par école, par DEPPSA, personnes sans école, noms à harmoniser et DEPPSA reclassées (en-tête officiel)">
            <Download /> Excel
          </Bouton>
        }
      />
      {erreur && <Alerte>{erreur}</Alerte>}

      <Carte>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Liste
            value={cycle}
            onChange={(e) => changer(setCycle)(e.target.value)}
            vide="Tous les cycles"
            options={[...Object.entries(CYCLES).map(([valeur, libelle]) => ({ valeur, libelle })), { valeur: "SANS", libelle: "Cycle non reconnu" }]}
          />
          <Liste value={departementId} onChange={(e) => changer(setDepartementId)(e.target.value)} vide="Toutes les DEPPSA" options={refs.departements.map((x) => ({ valeur: x.id, libelle: x.nom }))} />
          <label className="flex items-center gap-2 whitespace-nowrap text-[13px]">
            Seuil :
            <Saisie type="number" min={1} max={50} className="w-20 shrink-0" value={seuil} onChange={(e) => changer(setSeuil)(e.target.value)} />
            fonctionnaires
          </label>
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" className="size-4 accent-marque-600" checked={sousSeuil} onChange={(e) => { setSousSeuil(e.target.checked); setPage(1); }} />
            Seulement les écoles de moins de {s} fonctionnaires
          </label>
        </div>
      </Carte>

      {d.erreur && <Alerte>{d.erreur}</Alerte>}
      {!d.donnees || !t ? (
        <Chargement texte="Comptage : tout le registre et toute la base du personnel sont rangés par école (quelques secondes la première fois)…" />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3 2xl:grid-cols-6">
            <Chiffre libelle="Écoles" valeur={nf.format(t.ecoles)} ton="gris" detail={cycle ? (CYCLES[cycle] ?? "cycle non reconnu") : "tous les cycles"} />
            <Chiffre libelle={`Moins de ${s} fonctionnaires`} valeur={nf.format(t.sousSeuil)} ton="rouge" detail={t.ecoles ? `${Math.round((t.sousSeuil * 100) / t.ecoles)} % des écoles` : ""} />
            {EFFECTIFS.map(([k, libelle]) => (
              <Chiffre key={k} libelle={libelle} valeur={nf.format(t[k])} ton={k === "fonctionnaires" ? "vert" : k === "contractuels" ? "bleu" : "gris"} detail={t.total ? `${Math.round((t[k] * 100) / t.total)} % du personnel compté` : ""} />
            ))}
          </div>

          <Segments
            valeur={vue}
            changer={setVue}
            options={[
              { valeur: "deppsa", libelle: "Par DEPPSA" },
              { valeur: "ecoles", libelle: `Par école (${nf.format(d.donnees.total)})` },
            ]}
          />

          {vue === "deppsa" && (
            <div className="space-y-6">
              <Carte titre="Par DEPPSA">
                <Tableau>
                  <thead>
                    <tr>
                      <th>DEPPSA</th>
                      <th className="text-right">Écoles</th>
                      <th className="text-right">Moins de {s} fonct.</th>
                      {EFFECTIFS.map(([k, l]) => (
                        <th key={k} className="text-right">
                          {l}
                        </th>
                      ))}
                      <th className="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.donnees.parDeppsa.map((x) => (
                      <tr key={x.departement}>
                        <td>
                          <button type="button" className="text-left hover:underline" onClick={() => voirEcoles(x.departement, false)} title="Voir les écoles de cette DEPPSA">
                            {x.departement}
                          </button>
                        </td>
                        <td className="text-right tabular-nums">{nf.format(x.ecoles)}</td>
                        <td className="text-right tabular-nums">
                          {x.sousSeuil ? (
                            <button type="button" className="font-semibold text-rouge-600 hover:underline" onClick={() => voirEcoles(x.departement, true)} title="Voir ces écoles">
                              {nf.format(x.sousSeuil)}
                            </button>
                          ) : (
                            0
                          )}
                        </td>
                        {EFFECTIFS.map(([k]) => (
                          <td key={k} className="text-right tabular-nums">
                            {nf.format(x[k])}
                          </td>
                        ))}
                        <td className="text-right tabular-nums">{nf.format(x.total)}</td>
                      </tr>
                    ))}
                    <tr className="font-semibold">
                      <td>Total</td>
                      <td className="text-right tabular-nums">{nf.format(t.ecoles)}</td>
                      <td className="text-right tabular-nums">{nf.format(t.sousSeuil)}</td>
                      {EFFECTIFS.map(([k]) => (
                        <td key={k} className="text-right tabular-nums">
                          {nf.format(t[k])}
                        </td>
                      ))}
                      <td className="text-right tabular-nums">{nf.format(t.total)}</td>
                    </tr>
                  </tbody>
                </Tableau>
              </Carte>
              <div className="grid gap-6 lg:grid-cols-2">
                <Carte titre="Personnes sans école connue">
                  <p className="mb-2 text-[12px] text-zinc-500">Pas comptées dans le tableau : école (ou lieu de service) non renseignée, ou poste dans une inspection, une direction, un cabinet. Tous cycles confondus.</p>
                  <Tableau>
                    <thead>
                      <tr>
                        <th></th>
                        <th className="text-right">École non renseignée</th>
                        <th className="text-right">Administration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.donnees.sansEcole.map((x) => (
                        <tr key={x.effectif}>
                          <td>{x.libelle}</td>
                          <td className="text-right tabular-nums">{nf.format(x.sans)}</td>
                          <td className="text-right tabular-nums">{nf.format(x.administration)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Tableau>
                </Carte>
                <Carte titre="Qualité des données (retours à faire)">
                  <ul className="space-y-2 text-[13px] text-zinc-700">
                    <li>
                      <strong className="tabular-nums">{nf.format(d.donnees.aHarmoniser)}</strong> école(s) dont le nom est écrit de plusieurs façons : la liste est dans l’Excel (feuille « Noms à harmoniser »).
                    </li>
                    <li>
                      <strong className="tabular-nums">{nf.format(d.donnees.horsOrganigramme)}</strong> école(s) absentes de l’organigramme (Établissements) : connues seulement par le nom écrit dans les fichiers.
                    </li>
                    <li>
                      <strong className="tabular-nums">{nf.format(d.donnees.reclassees)}</strong> fonctionnaire(s) ou contractuel(s) comptés dans une nouvelle DEPPSA (Congo-Oubangui, Djoué-Léfini, Nkéni-Alima) d’après leur école : la base du personnel est encore sur les anciens départements. Leur fiche n’est pas modifiée (feuille « DEPPSA reclassées »).
                    </li>
                  </ul>
                </Carte>
              </div>
            </div>
          )}

          {vue === "ecoles" && (
            <Carte
              titre={`Par école (${nf.format(d.donnees.total)})`}
              actions={<Saisie className="w-64" value={recherche} onChange={(e) => { setRecherche(e.target.value); setPage(1); }} placeholder="Nom de l’école…" />}
            >
              {!d.donnees.ecoles.length ? (
                <Vide>Aucune école pour ces filtres.</Vide>
              ) : (
                <Tableau>
                  <thead>
                    <tr>
                      <th>DEPPSA</th>
                      <th>École</th>
                      {EFFECTIFS.map(([k, l]) => (
                        <th key={k} className="text-right">
                          {l}
                        </th>
                      ))}
                      <th className="text-right">Total</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.donnees.ecoles.map((e) => {
                      const sous = e.fonctionnaires < s;
                      return (
                        <tr key={`${e.departementId}|${e.cycle}|${e.nom}`} className={sous ? "bg-or-100/50" : undefined}>
                          <td className="text-[12px] text-zinc-600">{e.departement}</td>
                          <td>
                            <span className="font-medium">{e.nom}</span>
                            {!cycle && e.cycle && <span className="ml-1 text-[11px] text-zinc-500">· {CYCLES[e.cycle]}</span>}
                            {e.ecritures > 1 && <div className="text-[11px] text-zinc-500">{e.ecritures} écritures du nom</div>}
                          </td>
                          {EFFECTIFS.map(([k]) => (
                            <td key={k} className={`text-right tabular-nums ${k === "fonctionnaires" && sous ? "font-semibold text-rouge-600" : ""}`}>
                              {nf.format(e[k])}
                            </td>
                          ))}
                          <td className="text-right tabular-nums font-semibold">{nf.format(e.total)}</td>
                          <td>{!e.organigramme && <Badge ton="gris">hors organigramme</Badge>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Tableau>
              )}
              {pages > 1 && (
                <div className="mt-3 flex items-center justify-between text-[13px]">
                  <Bouton variante="discret" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    ← Précédent
                  </Bouton>
                  <span className="text-zinc-500">
                    Page {page} sur {nf.format(pages)}
                  </span>
                  <Bouton variante="discret" disabled={page >= pages} onClick={() => setPage(page + 1)}>
                    Suivant →
                  </Bouton>
                </div>
              )}
            </Carte>
          )}
        </>
      )}
    </div>
  );
}
