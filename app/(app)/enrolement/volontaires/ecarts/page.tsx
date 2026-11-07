"use client";

import { ArrowLeftRight, CheckCircle2, Database, FileUser } from "lucide-react";
import Link from "next/link";
import { Suspense, useState } from "react";
import { useSession } from "@/components/session";
import { Aide, Alerte, Annonce, Badge, Bouton, Carte, Chargement, EnTete, Modale, Saisie, Segments } from "@/components/ui";
import { api, qs, useApi } from "@/lib/api";

/**
 * Écarts entre le registre des volontaires et communautaires et la base du personnel (DG, 06/11/2026 :
 * « comparer, voir s'il y a des différences, surtout au niveau des lieux de service »). Pour chaque
 * rubrique : ce que la fiche du personnel sait et que le registre n'a pas (on le reprend d'un clic),
 * et les valeurs différentes (on choisit, pour tous ou personne par personne, laquelle garder).
 */

type Population = "VOLONTAIRE" | "COMMUNAUTAIRE";
type TypeEcart = "COMPLETER" | "DIFFERENT";
interface Bilan {
  reliees: number;
  enPoste?: number;
  sortis?: number;
  rubriques: { cle: string; libelle: string; completer: number; different: number }[];
}
interface Ligne {
  volontaireId: string;
  agentId: number;
  numeroFiche: string | null;
  nom: string;
  registre: string | null;
  personnel: string | null;
}
interface Page {
  total: number;
  page: number;
  pages: number;
  lignes: Ligne[];
}

const nf = new Intl.NumberFormat("fr-FR");

function Ecarts() {
  const { profil } = useSession();
  const decide = profil.role === "DG" || profil.role === "CHEF_SERVICE" || profil.role === "ADMIN";
  const [population, setPopulation] = useState<Population>(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("population") === "COMMUNAUTAIRE" ? "COMMUNAUTAIRE" : "VOLONTAIRE",
  );
  const bilan = useApi<Bilan>(`/enrolement/volontaires/ecarts${qs({ population })}`);
  const [ouvert, setOuvert] = useState<{ cle: string; libelle: string; type: TypeEcart } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const L = population === "VOLONTAIRE" ? { des: "volontaires", titre: "Volontaires" } : { des: "communautaires", titre: "Communautaires" };
  const totalCompleter = bilan.donnees?.rubriques.reduce((t, r) => t + r.completer, 0) ?? 0;
  const totalDifferent = bilan.donnees?.rubriques.reduce((t, r) => t + r.different, 0) ?? 0;

  return (
    <div className="space-y-5">
      <div>
        <Link href="/enrolement/volontaires" className="text-[13px] text-marque-700 hover:underline">
          ← Retour au registre
        </Link>
      </div>
      <EnTete
        titre="Écarts avec la base du personnel"
        sousTitre={`Chaque personne du registre a sa fiche dans la base du personnel. Ici, ce que les deux ne disent pas pareil : ce que la fiche du personnel connaît et que le registre n’a pas, et les valeurs différentes. Rien ne change sans votre choix.`}
        actions={<Segments valeur={population} changer={(p) => { setPopulation(p); setOuvert(null); }} options={[{ valeur: "VOLONTAIRE", libelle: "Volontaires" }, { valeur: "COMMUNAUTAIRE", libelle: "Communautaires" }]} />}
      />
      <Annonce fermer={() => setMessage(null)}>{message}</Annonce>
      {bilan.chargement && !bilan.donnees ? (
        <Chargement />
      ) : bilan.erreur ? (
        <Alerte>{bilan.erreur}</Alerte>
      ) : bilan.donnees ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Chiffre icone={<FileUser className="size-5" />} valeur={bilan.donnees.reliees} libelle={`${L.des} reliés à une fiche du personnel`} detail={bilan.donnees.enPoste !== undefined ? `dont ${nf.format(bilan.donnees.enPoste)} en poste et ${nf.format(bilan.donnees.sortis ?? 0)} sortis (recrutés, déserteurs, retirés…) : le registre garde aussi les sortis` : undefined} />
            <Chiffre icone={<Database className="size-5" />} valeur={totalCompleter} libelle="informations à reprendre de la base du personnel" ton="vert" />
            <Chiffre icone={<ArrowLeftRight className="size-5" />} valeur={totalDifferent} libelle="valeurs différentes à trancher" ton="jaune" />
          </div>
          <Carte titre={`Par rubrique · ${L.titre}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead className="text-left text-[12px] text-zinc-500">
                  <tr>
                    <th className="py-2 pr-3 font-medium">Rubrique</th>
                    <th className="py-2 pr-3 font-medium">
                      Le registre ne l’a pas, la fiche du personnel l’a
                      <Aide>Le registre est vide, la fiche du personnel connaît la valeur : on peut la reprendre dans le registre.</Aide>
                    </th>
                    <th className="py-2 font-medium">
                      Valeurs différentes
                      <Aide>Le registre et la fiche du personnel disent autre chose : on choisit laquelle garder.</Aide>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {bilan.donnees.rubriques.map((r) => (
                    <tr key={r.cle} className="border-t border-zinc-100">
                      <td className="py-2.5 pr-3 font-medium text-zinc-900">{r.libelle}</td>
                      <td className="py-2.5 pr-3">
                        {r.completer ? (
                          <button type="button" onClick={() => setOuvert({ cle: r.cle, libelle: r.libelle, type: "COMPLETER" })} className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100">
                            {nf.format(r.completer)} à reprendre →
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-zinc-400"><CheckCircle2 className="size-4" /> rien</span>
                        )}
                      </td>
                      <td className="py-2.5">
                        {r.different ? (
                          <button type="button" onClick={() => setOuvert({ cle: r.cle, libelle: r.libelle, type: "DIFFERENT" })} className="rounded-full bg-amber-50 px-3 py-1 font-semibold text-amber-900 ring-1 ring-amber-200 hover:bg-amber-100">
                            {nf.format(r.different)} à trancher →
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-zinc-400"><CheckCircle2 className="size-4" /> aucune</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Carte>
        </>
      ) : null}
      {ouvert && (
        <FenetreEcart
          population={population}
          ecart={ouvert}
          decide={decide}
          fermer={() => setOuvert(null)}
          apres={(t) => {
            setMessage(t);
            bilan.recharger();
          }}
        />
      )}
    </div>
  );
}

function Chiffre({ icone, valeur, libelle, detail, ton = "gris" }: { icone: React.ReactNode; valeur: number; libelle: string; detail?: string; ton?: "gris" | "vert" | "jaune" }) {
  const c = ton === "vert" ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : ton === "jaune" ? "bg-amber-50 text-amber-900 ring-amber-200" : "bg-white text-zinc-800 ring-zinc-200";
  return (
    <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 ring-1 ${c}`}>
      <span className="opacity-70">{icone}</span>
      <div>
        <div className="text-xl font-semibold">{nf.format(valeur)}</div>
        <div className="text-[12px] opacity-80">{libelle}</div>
        {detail && <div className="mt-1 text-[11.5px] leading-snug opacity-70">{detail}</div>}
      </div>
    </div>
  );
}

/** Les personnes d'un écart : les deux valeurs côte à côte, le choix pour tous ou pour celles cochées. */
function FenetreEcart({
  population,
  ecart,
  decide,
  fermer,
  apres,
}: {
  population: Population;
  ecart: { cle: string; libelle: string; type: TypeEcart };
  decide: boolean;
  fermer: () => void;
  apres: (texte: string) => void;
}) {
  const [page, setPage] = useState(1);
  const [recherche, setRecherche] = useState("");
  const [coches, setCoches] = useState<string[]>([]);
  const [confirmer, setConfirmer] = useState<{ choix: "PERSONNEL" | "REGISTRE"; tous: boolean } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const liste = useApi<Page>(`/enrolement/volontaires/ecarts/liste${qs({ population, cle: ecart.cle, type: ecart.type, page, recherche })}`);
  const completer = ecart.type === "COMPLETER";
  const basculer = (id: string) => setCoches((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id]));
  const tousCoches = !!liste.donnees?.lignes.length && liste.donnees.lignes.every((l) => coches.includes(l.volontaireId));

  async function appliquer(choix: "PERSONNEL" | "REGISTRE", tous: boolean) {
    setEnvoi(true);
    setErreur(null);
    try {
      const r = await api.post<{ modifiees: number }>("/enrolement/volontaires/ecarts/appliquer", {
        population,
        cle: ecart.cle,
        type: ecart.type,
        choix,
        ids: tous ? undefined : coches,
      });
      setConfirmer(null);
      setCoches([]);
      liste.recharger();
      apres(
        choix === "PERSONNEL"
          ? `${r.modifiees} fiche(s) du registre ont pris la valeur de la base du personnel (${ecart.libelle.toLowerCase()}).`
          : `${r.modifiees} fiche(s) du personnel ont repris la valeur du registre (${ecart.libelle.toLowerCase()}).`,
      );
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  }

  const n = confirmer?.tous ? (liste.donnees?.total ?? 0) : coches.length;
  return (
    <Modale titre={`${ecart.libelle} · ${completer ? "à reprendre de la base du personnel" : "valeurs différentes"}`} ouverte fermer={fermer} ecran>
      <p className="mb-3 text-[13px] leading-relaxed text-zinc-600">
        {completer
          ? "Le registre n’a pas cette information ; la fiche du personnel l’a. Reprenez-la dans le registre pour tout le monde, ou cochez les personnes."
          : "Le registre et la fiche du personnel ne disent pas la même chose. Choisissez la valeur à garder : pour tout le monde, ou pour les personnes cochées. Celle qui n’est pas gardée est remplacée."}
      </p>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Saisie value={recherche} onChange={(e) => { setRecherche(e.target.value); setPage(1); }} placeholder="Chercher un nom" className="max-w-xs" />
        <span className="text-[12px] text-zinc-500">{nf.format(liste.donnees?.total ?? 0)} personne(s){coches.length ? ` · ${coches.length} cochée(s)` : ""}</span>
      </div>
      {erreur && <Alerte>{erreur}</Alerte>}
      <div className="h-[50vh] overflow-auto rounded-xl ring-1 ring-zinc-200">
        {liste.chargement && !liste.donnees ? (
          <Chargement />
        ) : (
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 z-10 bg-zinc-50 text-left text-[12px] text-zinc-500">
              <tr>
                <th className="w-8 px-3 py-2">
                  <input type="checkbox" className="size-4 accent-marque-600" checked={tousCoches} onChange={() => setCoches(tousCoches ? [] : [...new Set([...coches, ...(liste.donnees?.lignes ?? []).map((l) => l.volontaireId)])])} aria-label="Cocher la page" />
                </th>
                <th className="px-3 py-2 font-medium">Personne</th>
                <th className="px-3 py-2 font-medium">Dans le registre</th>
                <th className="px-3 py-2 font-medium">Dans la base du personnel</th>
              </tr>
            </thead>
            <tbody>
              {liste.donnees?.lignes.map((l) => (
                <tr key={l.volontaireId} className={`border-t border-zinc-100 ${coches.includes(l.volontaireId) ? "bg-marque-50/50" : ""}`}>
                  <td className="px-3 py-2">
                    <input type="checkbox" className="size-4 accent-marque-600" checked={coches.includes(l.volontaireId)} onChange={() => basculer(l.volontaireId)} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-zinc-900">{l.nom}</div>
                    <Link href={`/personnel/agents/${l.agentId}`} target="_blank" className="text-[11.5px] text-marque-700 hover:underline">
                      Fiche {l.numeroFiche ?? ""}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-zinc-700">{l.registre ?? <span className="text-zinc-400">vide</span>}</td>
                  <td className="px-3 py-2 font-medium text-emerald-800">{l.personnel}</td>
                </tr>
              ))}
              {liste.donnees && !liste.donnees.lignes.length && (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-zinc-500">
                    Plus rien ici.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
      {liste.donnees && liste.donnees.pages > 1 && (
        <div className="mt-2 flex items-center justify-center gap-2 text-[13px]">
          <Bouton variante="discret" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Précédente</Bouton>
          <span className="text-zinc-500">Page {page} / {liste.donnees.pages}</span>
          <Bouton variante="discret" disabled={page >= liste.donnees.pages} onClick={() => setPage(page + 1)}>Suivante →</Bouton>
        </div>
      )}
      {decide ? (
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-zinc-100 pt-4">
          {!completer && (
            <>
              <Bouton disabled={!coches.length || envoi} onClick={() => setConfirmer({ choix: "REGISTRE", tous: false })}>Garder le registre (cochées)</Bouton>
              <Bouton disabled={!liste.donnees?.total || envoi} onClick={() => setConfirmer({ choix: "REGISTRE", tous: true })}>Garder le registre pour tous</Bouton>
            </>
          )}
          <Bouton disabled={!coches.length || envoi} onClick={() => setConfirmer({ choix: "PERSONNEL", tous: false })}>
            {completer ? "Reprendre pour les cochées" : "Garder la base du personnel (cochées)"}
          </Bouton>
          <Bouton variante="principal" disabled={!liste.donnees?.total || envoi} onClick={() => setConfirmer({ choix: "PERSONNEL", tous: true })}>
            {completer ? `Reprendre pour tous (${nf.format(liste.donnees?.total ?? 0)})` : "Garder la base du personnel pour tous"}
          </Bouton>
        </div>
      ) : (
        <p className="mt-4 text-[12px] text-zinc-500">Le choix est fait par le chef de service ou le DG.</p>
      )}
      {confirmer && (
        <Modale titre="Confirmer" ouverte fermer={() => setConfirmer(null)}>
          <p className="text-[13px] leading-relaxed text-zinc-700">
            {confirmer.choix === "PERSONNEL" ? (
              <>
                <strong>{nf.format(n)}</strong> fiche(s) du <strong>registre</strong> vont prendre la valeur de la <strong>base du personnel</strong> pour « {ecart.libelle} ».
              </>
            ) : (
              <>
                <strong>{nf.format(n)}</strong> fiche(s) de la <strong>base du personnel</strong> vont reprendre la valeur du <strong>registre</strong> pour « {ecart.libelle} ».
              </>
            )}{" "}
            Chaque changement est inscrit au journal.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Bouton onClick={() => setConfirmer(null)}>Annuler</Bouton>
            <Bouton variante="principal" disabled={envoi} onClick={() => appliquer(confirmer.choix, confirmer.tous)}>
              {envoi ? "En cours…" : "Confirmer"}
            </Bouton>
          </div>
        </Modale>
      )}
      <div className="mt-2 text-right">
        <Badge ton="gris">{population === "VOLONTAIRE" ? "Volontaires" : "Communautaires"}</Badge>
      </div>
    </Modale>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Chargement />}>
      <Ecarts />
    </Suspense>
  );
}
