"use client";

import { Archive, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "@/components/session";
import { Alerte, Bouton, Carte, Chargement, EnTete, Saisie, Segments, Tableau, Vide } from "@/components/ui";
import { api, qs, useApi } from "@/lib/api";
import { accesDonne } from "@/lib/espaces";
import { peut } from "@/lib/libelles";

/*
 * Base des retraits (DG, 23/11/2026 : « les retraits ne doivent plus apparaître parmi les effectifs ;
 * ils auront leur base, on peut la consulter ; on ne les supprime pas, il y a encore des contrôles à
 * faire »). Volontaires et communautaires non payés en bourse : leur fiche reste (numéro,
 * historique), mais elle ne compte plus nulle part. Réintégrer la remet dans la base.
 */

interface Groupe {
  code: string;
  libelle: string;
  aRetirer: number;
  gardes: number;
}
interface Apercu {
  groupes: Groupe[];
  aRetirer: number;
  gardes: { total: number; nomination: number; matricule: number; recensement: number };
  dejaRetires: number;
}
interface Ligne {
  id: number;
  nom: string;
  statut: string;
  naissance: string | null;
  motif: string;
  motifLibelle: string;
  le: string | null;
  par: string | null;
  departement: string | null;
  lieu: string | null;
}
interface Reponse {
  total: number;
  page: number;
  lignes: Ligne[];
  parMotif: { code: string; libelle: string; n: number }[];
  parStatut: { statut: string; n: number }[];
  totalRetraits: number;
}

const nf = (n: number) => new Intl.NumberFormat("fr-FR").format(n);
const STATUTS: Record<string, string> = { VOLONTAIRE: "Volontaire", COMMUNAUTAIRE: "Communautaire" };

export default function BaseDesRetraits() {
  const { profil } = useSession();
  const dg = profil.role === "DG" || profil.role === "ADMIN";
  const [motif, setMotif] = useState("");
  const [statut, setStatut] = useState("");
  const [texte, setTexte] = useState("");
  const [recherche, setRecherche] = useState("");
  const [page, setPage] = useState(1);
  const [coches, setCoches] = useState<Set<number>>(new Set());
  const [message, setMessage] = useState<{ ton: "vert" | "rouge"; texte: string } | null>(null);
  const [encours, setEncours] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => {
      setRecherche(texte.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [texte]);
  const r = useApi<Reponse>(`/recensement/retraits${qs({ motif: motif || undefined, statut: statut || undefined, recherche: recherche || undefined, page })}`);

  if (!peut.traiter(profil.role) && !accesDonne(profil)) return <Alerte>Accès réservé aux agents de la DGRHAS.</Alerte>;

  const reintegrer = async () => {
    if (!coches.size || !confirm(`Réintégrer ${coches.size} fiche(s) ? Elles reviennent dans la base du personnel et comptent de nouveau dans les effectifs.`)) return;
    setEncours(true);
    setMessage(null);
    try {
      const x = await api.post<{ reintegres: number }>("/recensement/retraits/reintegrer", { ids: [...coches] });
      setMessage({ ton: "vert", texte: `${nf(x.reintegres)} fiche(s) réintégrée(s) dans la base du personnel.` });
      setCoches(new Set());
      r.recharger();
    } catch (e) {
      setMessage({ ton: "rouge", texte: (e as Error).message });
    } finally {
      setEncours(false);
    }
  };

  const lignes = r.donnees?.lignes ?? [];
  const pages = Math.max(1, Math.ceil((r.donnees?.total ?? 0) / 100));
  return (
    <div className="space-y-6">
      <EnTete
        titre="Base des retraits"
        sousTitre="Volontaires et communautaires qui ne sont pas payés en bourse. Ils ne comptent plus dans les effectifs, les listes ni les statistiques. Rien n’est supprimé : chaque fiche reste ici, consultable, et peut être réintégrée."
      />
      {message && <Alerte ton={message.ton}>{message.texte}</Alerte>}
      {dg && <MiseEnRetrait apres={(t) => (setMessage({ ton: "vert", texte: t }), r.recharger())} erreur={(t) => setMessage({ ton: "rouge", texte: t })} />}

      <Carte titre={`Fiches dans la base des retraits${r.donnees ? ` (${nf(r.donnees.totalRetraits)})` : ""}`}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Segments
            valeur={motif}
            changer={(v) => (setMotif(v), setPage(1), setCoches(new Set()))}
            options={[{ valeur: "", libelle: `Tous${r.donnees ? ` (${nf(r.donnees.totalRetraits)})` : ""}` }, ...(r.donnees?.parMotif ?? []).map((m) => ({ valeur: m.code, libelle: `${m.libelle} (${nf(m.n)})` }))]}
          />
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <Segments
            valeur={statut}
            changer={(v) => (setStatut(v), setPage(1), setCoches(new Set()))}
            options={[{ valeur: "", libelle: "Volontaires et communautaires" }, ...(r.donnees?.parStatut ?? []).map((s) => ({ valeur: s.statut, libelle: `${STATUTS[s.statut]}s (${nf(s.n)})` }))]}
          />
          <Saisie className="w-72" placeholder="Rechercher un nom ou un matricule…" value={texte} onChange={(e) => setTexte(e.target.value)} />
          {dg && (
            <Bouton disabled={!coches.size || encours} chargement={encours} onClick={() => void reintegrer()}>
              <RotateCcw /> Réintégrer ({coches.size})
            </Bouton>
          )}
        </div>
        {!r.donnees ? (
          <Chargement />
        ) : !lignes.length ? (
          <Vide>{r.donnees.totalRetraits ? "Aucune fiche ne correspond." : "La base des retraits est vide."}</Vide>
        ) : (
          <>
            <Tableau>
              <thead>
                <tr>
                  {dg && (
                    <th className="w-8">
                      <input type="checkbox" aria-label="Tout cocher sur cette page" checked={lignes.every((l) => coches.has(l.id))} onChange={(e) => setCoches(e.target.checked ? new Set([...coches, ...lignes.map((l) => l.id)]) : new Set([...coches].filter((id) => !lignes.some((l) => l.id === id))))} />
                    </th>
                  )}
                  <th>Nom et prénoms</th>
                  <th>Statut</th>
                  <th>Pourquoi</th>
                  <th>Département · lieu</th>
                  <th>Retiré</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((l) => (
                  <tr key={l.id}>
                    {dg && (
                      <td>
                        <input type="checkbox" aria-label={`Cocher ${l.nom}`} checked={coches.has(l.id)} onChange={() => setCoches((c) => { const n = new Set(c); if (n.has(l.id)) n.delete(l.id); else n.add(l.id); return n; })} />
                      </td>
                    )}
                    <td>
                      <Link href={`/personnel/agents/${l.id}`} className="font-medium text-marque-700 hover:underline">
                        {l.nom}
                      </Link>
                      {l.naissance && <div className="text-[12px] text-zinc-400">{l.naissance.split("-").reverse().join("/")}</div>}
                    </td>
                    <td>{STATUTS[l.statut] ?? l.statut}</td>
                    <td className="text-zinc-700">{l.motifLibelle}</td>
                    <td className="text-zinc-600">{[l.departement, l.lieu].filter(Boolean).join(" · ") || "—"}</td>
                    <td className="text-[12px] text-zinc-500">{[l.le ? new Date(l.le).toLocaleDateString("fr-FR") : null, l.par].filter(Boolean).join(" · ")}</td>
                  </tr>
                ))}
              </tbody>
            </Tableau>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-zinc-600">
              {nf(r.donnees.total)} fiche(s) · page {page} sur {pages}
              <Bouton disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Précédentes
              </Bouton>
              <Bouton disabled={page >= pages} onClick={() => setPage(page + 1)}>
                Suivantes
              </Bouton>
            </div>
          </>
        )}
      </Carte>
    </div>
  );
}

/** Le DG met en retrait, groupe par groupe, après avoir vu combien de fiches partiraient. */
function MiseEnRetrait({ apres, erreur }: { apres: (t: string) => void; erreur: (t: string) => void }) {
  const [apercu, setApercu] = useState<Apercu | null>(null);
  const [calcul, setCalcul] = useState(false);
  const [choisis, setChoisis] = useState<Set<string>>(new Set());
  const [envoi, setEnvoi] = useState(false);
  const calculer = async () => {
    setCalcul(true);
    try {
      const a = await api.get<Apercu>("/recensement/retraits/apercu");
      setApercu(a);
      setChoisis(new Set(a.groupes.filter((g) => g.aRetirer).map((g) => g.code)));
    } catch (e) {
      erreur((e as Error).message);
    } finally {
      setCalcul(false);
    }
  };
  const total = apercu?.groupes.filter((g) => choisis.has(g.code)).reduce((s, g) => s + g.aRetirer, 0) ?? 0;
  const appliquer = async () => {
    if (!total || !confirm(`Mettre ${nf(total)} fiche(s) dans la base des retraits ? Elles ne compteront plus dans les effectifs. Rien n’est supprimé : on peut les réintégrer.`)) return;
    setEnvoi(true);
    try {
      const x = await api.post<{ retires: number }>("/recensement/retraits/appliquer", { motifs: [...choisis] });
      apres(`${nf(x.retires)} fiche(s) mises dans la base des retraits. Elles ne comptent plus dans les effectifs.`);
      setApercu(null);
    } catch (e) {
      erreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  };
  return (
    <Carte titre="Mettre en retrait (DG)">
      {!apercu ? (
        <div className="flex flex-wrap items-center gap-3 text-[13px] text-zinc-600">
          <span>Voir d’abord combien de volontaires et communautaires non payés en bourse partiraient, groupe par groupe.</span>
          <Bouton chargement={calcul} onClick={() => void calculer()}>
            <Archive /> Calculer
          </Bouton>
        </div>
      ) : !apercu.aRetirer ? (
        <Vide>Plus aucune fiche à mettre en retrait{apercu.dejaRetires ? ` (${nf(apercu.dejaRetires)} déjà dans la base des retraits)` : ""}.</Vide>
      ) : (
        <div className="space-y-3 text-[13px]">
          <Tableau>
            <thead>
              <tr>
                <th className="w-8" />
                <th>Groupe</th>
                <th>Partent en retrait</th>
                <th>Gardés dans la base</th>
              </tr>
            </thead>
            <tbody>
              {apercu.groupes.map((g) => (
                <tr key={g.code}>
                  <td>
                    <input type="checkbox" aria-label={g.libelle} disabled={!g.aRetirer} checked={choisis.has(g.code)} onChange={() => setChoisis((c) => { const n = new Set(c); if (n.has(g.code)) n.delete(g.code); else n.add(g.code); return n; })} />
                  </td>
                  <td>{g.libelle}</td>
                  <td className="font-medium">{nf(g.aRetirer)}</td>
                  <td className="text-zinc-500">{nf(g.gardes)}</td>
                </tr>
              ))}
            </tbody>
          </Tableau>
          {apercu.gardes.total > 0 && (
            <p className="text-zinc-600">
              <strong>{nf(apercu.gardes.total)}</strong> fiche(s) restent dans la base malgré tout, parce qu’un signe dit qu’elles sont réelles : {nf(apercu.gardes.nomination)} avec une nomination, {nf(apercu.gardes.matricule)} avec un matricule solde, {nf(apercu.gardes.recensement)} passées par le contrôle du recensement. Elles sont à vérifier.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Bouton variante="principal" chargement={envoi} disabled={!total} onClick={() => void appliquer()}>
              <Archive /> Mettre {nf(total)} fiche(s) en retrait
            </Bouton>
            <Bouton disabled={envoi} onClick={() => setApercu(null)}>
              Annuler
            </Bouton>
          </div>
        </div>
      )}
    </Carte>
  );
}
