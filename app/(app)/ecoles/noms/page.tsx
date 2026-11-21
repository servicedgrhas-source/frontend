"use client";

import { Save } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useSession } from "@/components/session";
import { Alerte, Bouton, Carte, Chargement, Chiffre, EnTete, Liste, Saisie, Segments, Tableau, Vide } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { accesDonne } from "@/lib/espaces";
import { CYCLES } from "@/lib/ecoles";
import { peut } from "@/lib/libelles";

/*
 * Noms des écoles (DG, 21/11/2026) : le type d'une école vient de son cycle, jamais de ce qui est
 * écrit. CEP (préscolaire), EP (primaire), CEG (collège), LEG (lycée), CA (alphabétisation), puis le
 * nom propre : « EP MINANGOU LAURENT ». Le serveur applique la règle à chaque enregistrement ; cette
 * page met d'un coup les écoles déjà enregistrées à la règle.
 */

interface Analyse {
  ecoles: number;
  changements: { id: number; avant: string; apres: string; cycle: string | null; departement: string | null; localite: string | null }[];
  doublons: { nom: string; departement: string | null; ecoles: { id: number; nom: string; localite: string | null; agents: number }[] }[];
  sansCycle: { id: number; nom: string; departement: string | null; localite: string | null }[];
}

type Onglet = "CHANGEMENTS" | "DOUBLONS" | "SANS_CYCLE";
const nf = new Intl.NumberFormat("fr-FR");
const TAILLE = 100;
const PREFIXES = [
  ["CEP", "Centre d’éducation préscolaire"],
  ["EP", "École primaire"],
  ["CEG", "Collège d’enseignement général"],
  ["LEG", "Lycée d’enseignement général"],
  ["CA", "Centre d’alphabétisation"],
];

export default function Page() {
  const { profil } = useSession();
  if (!peut.traiter(profil.role) && !accesDonne(profil)) return <Alerte>Accès réservé aux agents de la DGRHAS.</Alerte>;
  return <NomsEcoles peutEnregistrer={peut.modifierConfiguration(profil.role)} />;
}

function NomsEcoles({ peutEnregistrer }: { peutEnregistrer: boolean }) {
  const a = useApi<Analyse>("/ecoles-noms");
  const [onglet, setOnglet] = useState<Onglet>("CHANGEMENTS");
  const [dep, setDep] = useState("");
  const [recherche, setRecherche] = useState("");
  const [page, setPage] = useState(1);
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ ton: "vert" | "rouge"; texte: string } | null>(null);

  if (a.erreur) return <Alerte>{a.erreur}</Alerte>;
  const r = a.donnees;
  if (!r) return <Chargement />;

  const q = recherche.trim().toUpperCase();
  const garde = (d: string | null, ...textes: (string | null)[]) => (!dep || d === dep) && (!q || textes.join(" ").toUpperCase().includes(q));
  const changements = r.changements.filter((c) => garde(c.departement, c.avant, c.apres));
  const doublons = r.doublons.filter((d) => garde(d.departement, d.nom, ...d.ecoles.map((e) => e.nom)));
  const sansCycle = r.sansCycle.filter((s) => garde(s.departement, s.nom));
  const departements = [...new Set([...r.changements.map((c) => c.departement), ...r.doublons.map((d) => d.departement), ...r.sansCycle.map((s) => s.departement)].filter((x): x is string => !!x))].sort((x, y) => x.localeCompare(y, "fr"));
  const total = onglet === "CHANGEMENTS" ? changements.length : onglet === "DOUBLONS" ? doublons.length : sansCycle.length;
  const pages = Math.max(1, Math.ceil(total / TAILLE));
  const p0 = Math.min(page, pages);
  const tranche = <T,>(l: T[]) => l.slice((p0 - 1) * TAILLE, p0 * TAILLE);

  // Fusionner : on garde l'école choisie, les autres du groupe y passent (agents, classes, présence…)
  const fusionner = async (d: Analyse["doublons"][number], garder: Analyse["doublons"][number]["ecoles"][number]) => {
    const autres = d.ecoles.filter((e) => e.id !== garder.id);
    const agents = autres.reduce((n, e) => n + e.agents, 0);
    if (
      !confirm(
        `Garder « ${garder.nom} » (${garder.localite ?? "—"}) et y fusionner ${autres.length > 1 ? `les ${autres.length} autres` : "l’autre"} ?\n\n` +
          `${nf.format(agents)} agent(s), les classes, salles, présence et emplois du temps passeront à l’école gardée ; l’autre sera fermée (son nom reste reconnu).`,
      )
    )
      return;
    setEnvoi(true);
    setMessage(null);
    try {
      let deplaces = 0;
      let restes = 0;
      for (const e of autres) {
        const x = await api.post<{ agents: number; restes: number }>("/ecoles-noms/fusionner", { garder: garder.id, fermer: e.id });
        deplaces += x.agents;
        restes += x.restes;
      }
      setMessage({
        ton: "vert",
        texte: `« ${garder.nom} » gardée : ${nf.format(deplaces)} agent(s) y sont passés, l’autre école est fermée.${restes ? ` ${restes} élément(s) déjà présents des deux côtés (semaine de présence, emploi du temps, poste du cadre organique) sont restés à l’école fermée.` : ""}`,
      });
      a.recharger();
    } catch (e) {
      setMessage({ ton: "rouge", texte: (e as Error).message });
    } finally {
      setEnvoi(false);
    }
  };

  const enregistrer = async () => {
    if (!confirm(`Donner le nom normé à ${nf.format(r.changements.length)} école(s) ? L’ancien nom de chacune reste reconnu (fiches, notes, fichiers Excel).`)) return;
    setEnvoi(true);
    setMessage(null);
    try {
      const x = await api.post<{ renommees: number }>("/ecoles-noms/appliquer", {});
      setMessage({ ton: "vert", texte: `${nf.format(x.renommees)} école(s) renommée(s). Elles portent maintenant le préfixe de leur cycle partout dans le système.` });
      a.recharger();
    } catch (e) {
      setMessage({ ton: "rouge", texte: (e as Error).message });
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="space-y-4">
      <EnTete
        titre="Noms des écoles"
        sousTitre="Le type d’une école vient de son cycle, jamais de ce qui est écrit : « Lycée », « École primaire », « Centre d’alphabétisation »… tapés à la main ne comptent pas. Partout dans le système, une école s’appelle : préfixe de son cycle + son nom propre."
      />
      {message && <Alerte ton={message.ton}>{message.texte}</Alerte>}

      <Carte titre="La règle">
        <div className="flex flex-wrap gap-2 text-[13px]">
          {PREFIXES.map(([p, l]) => (
            <span key={p} className="rounded-full bg-zinc-100 px-3 py-1">
              <b>{p}</b> · {l}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[12px] text-zinc-500">
          Exemple : « EP MINANGOU LAURENT », « CEG MINANGOU LAURENT ». Quand on crée ou corrige une école, quand on importe le répertoire ou un fichier, le système retire le type écrit et met le préfixe du cycle. Changer
          le cycle d’une école change son préfixe. L’ancien nom reste reconnu.
        </p>
      </Carte>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Chiffre libelle="Écoles" valeur={nf.format(r.ecoles)} />
        <Chiffre libelle="Nom à mettre à la règle" valeur={nf.format(r.changements.length)} ton={r.changements.length ? "jaune" : "vert"} />
        <Chiffre libelle="Écoles en double" valeur={nf.format(r.doublons.length)} ton={r.doublons.length ? "rouge" : "vert"} detail="même nom, cycle et département" />
        <Chiffre libelle="Sans cycle" valeur={nf.format(r.sansCycle.length)} ton={r.sansCycle.length ? "rouge" : "vert"} detail="pas de préfixe possible" />
      </div>

      <Carte titre="Vérifier">
        <div className="space-y-3 text-[13px]">
          <Segments
            valeur={onglet}
            changer={(o) => (setOnglet(o), setPage(1))}
            options={[
              { valeur: "CHANGEMENTS" as Onglet, libelle: `Noms qui changent (${nf.format(r.changements.length)})` },
              { valeur: "DOUBLONS" as Onglet, libelle: `En double (${nf.format(r.doublons.length)})` },
              { valeur: "SANS_CYCLE" as Onglet, libelle: `Sans cycle (${nf.format(r.sansCycle.length)})` },
            ]}
          />
          <p className="text-zinc-600">
            {onglet === "CHANGEMENTS"
              ? "Le nom actuel et le nom qu’il prendra. Rien ne change avant « Enregistrer »."
              : onglet === "DOUBLONS"
                ? "Même nom, même cycle, au même endroit : sans doute la même école enregistrée deux fois. « Garder celle-ci » : l’autre y est fusionnée (ses agents, classes, salles, présence passent à celle-ci) puis fermée ; son nom reste reconnu. Gardez en général celle qui a le plus d’agents. Si ce sont deux écoles, distinguez plutôt leurs noms (A, B…) dans l’organigramme."
                : "Ces écoles n’ont pas de cycle dans l’organigramme : le système ne peut pas leur donner de préfixe. Renseignez leur cycle (Structures › l’école), le préfixe suivra."}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Liste value={dep} onChange={(e) => (setDep(e.target.value), setPage(1))} vide="Tous les départements" options={departements.map((d) => ({ valeur: d, libelle: d }))} />
            <Saisie placeholder="Chercher une école…" value={recherche} onChange={(e) => (setRecherche(e.target.value), setPage(1))} className="w-64" />
            <span className="ml-auto text-zinc-500">{nf.format(total)} ligne(s)</span>
          </div>
          {!total ? (
            <Vide>Rien dans cette liste.</Vide>
          ) : onglet === "CHANGEMENTS" ? (
            <Tableau>
              <thead>
                <tr>
                  <th>Nom actuel</th>
                  <th>Nouveau nom</th>
                  <th>Cycle</th>
                  <th>Département</th>
                </tr>
              </thead>
              <tbody>
                {tranche(changements).map((c) => (
                  <tr key={c.id}>
                    <td className="text-zinc-500">{c.avant}</td>
                    <td className="font-medium">{c.apres}</td>
                    <td>{c.cycle ? (CYCLES[c.cycle] ?? c.cycle) : "—"}</td>
                    <td>
                      {c.departement ?? "—"}
                      {c.localite ? <span className="text-zinc-500"> · {c.localite}</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Tableau>
          ) : onglet === "DOUBLONS" ? (
            <Tableau>
              <thead>
                <tr>
                  <th>Nom normé</th>
                  <th>Écoles enregistrées</th>
                  <th>Département</th>
                </tr>
              </thead>
              <tbody>
                {tranche(doublons).map((d) => (
                  <tr key={d.ecoles.map((e) => e.id).join("-")}>
                    <td className="font-medium">{d.nom}</td>
                    <td>
                      {d.ecoles.map((e) => (
                        <div key={e.id} className="flex flex-wrap items-center gap-x-2 py-0.5">
                          <Link className="text-marque-700 hover:underline" href={`/ecoles/${e.id}`}>
                            {e.nom}
                          </Link>
                          <span className="text-[11px] text-zinc-500">
                            · {nf.format(e.agents)} agent(s){e.localite ? ` · ${e.localite}` : ""}
                          </span>
                          {peutEnregistrer && (
                            <button
                              type="button"
                              disabled={envoi}
                              onClick={() => fusionner(d, e)}
                              className="cursor-pointer rounded-full border border-marque-200 px-2.5 py-0.5 text-[11px] font-medium text-marque-700 hover:bg-marque-50 disabled:opacity-50"
                              title="Garder cette école et y fusionner l’autre"
                            >
                              Garder celle-ci
                            </button>
                          )}
                        </div>
                      ))}
                    </td>
                    <td>{d.departement ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </Tableau>
          ) : (
            <Tableau>
              <thead>
                <tr>
                  <th>École</th>
                  <th>Département</th>
                </tr>
              </thead>
              <tbody>
                {tranche(sansCycle).map((s) => (
                  <tr key={s.id}>
                    <td>
                      <Link className="text-marque-700 hover:underline" href={`/ecoles/${s.id}`}>
                        {s.nom}
                      </Link>
                    </td>
                    <td>
                      {s.departement ?? "—"}
                      {s.localite ? <span className="text-zinc-500"> · {s.localite}</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Tableau>
          )}
          {pages > 1 && (
            <div className="flex items-center justify-between">
              <Bouton variante="discret" disabled={p0 <= 1} onClick={() => setPage(p0 - 1)}>
                ← Précédent
              </Bouton>
              <span className="text-zinc-500">
                Page {p0} sur {pages}
              </span>
              <Bouton variante="discret" disabled={p0 >= pages} onClick={() => setPage(p0 + 1)}>
                Suivant →
              </Bouton>
            </div>
          )}
        </div>
      </Carte>

      <Carte titre="Enregistrer">
        <div className="flex flex-wrap items-center gap-3 text-[13px]">
          <span>
            <b>{nf.format(r.changements.length)}</b> école(s) prendront le nom normé. Leur ancien nom reste reconnu (lieu de service des fiches, notes, fichiers Excel).
          </span>
          {peutEnregistrer ? (
            <Bouton variante="principal" className="ml-auto" chargement={envoi} disabled={!r.changements.length} onClick={enregistrer}>
              <Save /> Enregistrer
            </Bouton>
          ) : (
            <span className="ml-auto text-zinc-500">L’enregistrement est réservé au DG (et aux administrateurs).</span>
          )}
        </div>
      </Carte>
    </div>
  );
}
