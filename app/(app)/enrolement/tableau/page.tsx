"use client";

import { AlertTriangle, ArrowRight, Banknote, Scale, Send, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { fcfa, moisFr, nf } from "@/components/enrolement/volontaires";
import { useSession } from "@/components/session";
import { Alerte, Badge, Carte, Chargement, Chiffre, EnTete, Segments, Tableau, Vide } from "@/components/ui";
import { useApi } from "@/lib/api";
import { accesDonne } from "@/lib/espaces";
import { peut } from "@/lib/libelles";

interface Effectifs {
  registre: { enPoste: number; sortis: number; sansCategorie: number; sansDepartement: number };
  parDepCat: { departementId: number | null; categorie: string | null; n: number }[];
  coutMensuel: number;
  categories: { code: string; libelle: string; bourse: number }[];
  /** Faux tant que le DG n'a pas fixé le barème (montants à 0). */
  baremeFixe: boolean;
}

interface TableauEnrolement {
  registre: Effectifs["registre"];
  parDepCat: Effectifs["parDepCat"];
  coutMensuel: number;
  communautaires: Effectifs;
  etats: { id: number; mois: string; statut: string; effectif: number; total: string; bloquants: number }[];
  sorties: { mois: string; motif: string; n: number }[];
  regularisations: { enAttente: number; complements: string; retenues: string; aRecouvrer: string };
  enrolesAIntegrer: number;
  misesEnRoute: { projets: number; valides: number; total: string };
  besoins: number;
  categories: { code: string; libelle: string; bourse: number }[];
  motifs: { code: string; libelle: string }[];
}

/** Tableau de bord de l'enrôlement : effectifs, coût, bourses, sorties et ce qui attend une action. */
export default function TableauEnrolement() {
  const { profil } = useSession();
  const { donnees: t, erreur } = useApi<TableauEnrolement>("/enrolement/tableau");
  if (!peut.traiter(profil.role) && !accesDonne(profil)) return <Alerte>Accès réservé aux agents de la DGRHAS.</Alerte>;
  if (erreur) return <Alerte>{erreur}</Alerte>;
  if (!t) return <Chargement />;

  const dernier = [...t.etats].reverse()[0];
  const max = Math.max(1, ...t.etats.map((e) => Number(e.total)));
  const actions = [
    t.enrolesAIntegrer > 0 && { href: "/enrolement/volontaires", texte: `${nf.format(t.enrolesAIntegrer)} enrôlé(s) de notes signées à intégrer au registre` },
    t.registre.sansCategorie + t.registre.sansDepartement > 0 && { href: "/enrolement/volontaires", texte: `${nf.format(t.registre.sansCategorie)} sans catégorie, ${nf.format(t.registre.sansDepartement)} sans département` },
    dernier && dernier.statut !== "VALIDE" && { href: "/enrolement/bourse", texte: `Bourse de ${moisFr(dernier.mois)} en projet${dernier.bloquants ? ` : ${nf.format(dernier.bloquants)} contrôle(s) bloquant(s)` : " : prête pour la validation du DG"}` },
    t.misesEnRoute.projets > 0 && { href: "/enrolement/mise-en-route", texte: `${nf.format(t.misesEnRoute.projets)} mise(s) en route en projet` },
    Number(t.regularisations.aRecouvrer) > 0 && { href: "/enrolement/regularisations", texte: `${fcfa(t.regularisations.aRecouvrer)} à recouvrer sur des volontaires sortis` },
  ].filter(Boolean) as { href: string; texte: string }[];

  return (
    <div className="space-y-6">
      <EnTete titre="Enrôlement : tableau de bord" sousTitre="Les enseignants volontaires en un coup d’œil. Le coût mensuel est calculé au barème actuel de la configuration (sans rappels ni régularisations)." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <Chiffre href="/enrolement/volontaires" icone={<Users />} ton="vert" libelle="Volontaires en poste" valeur={nf.format(t.registre.enPoste)} detail={`${nf.format(t.registre.sortis)} sortis`} />
        <Chiffre href="/enrolement/bourse" icone={<Banknote />} ton="bleu" libelle="Coût mensuel" valeur={fcfa(t.coutMensuel)} detail={`${fcfa(t.coutMensuel * 12)} par an`} />
        <Chiffre href="/enrolement/mise-en-route" icone={<Send />} ton="gris" libelle="Mises en route payées" valeur={fcfa(t.misesEnRoute.total)} detail={`${nf.format(t.misesEnRoute.valides)} fiche(s)`} />
        <Chiffre
          href="/enrolement/regularisations"
          icone={<Scale />}
          ton={t.regularisations.enAttente ? "jaune" : "gris"}
          libelle="Régularisations en attente"
          valeur={nf.format(t.regularisations.enAttente)}
          detail={`retenues ${fcfa(t.regularisations.retenues)} · compléments ${fcfa(t.regularisations.complements)}`}
        />
      </div>

      {actions.length > 0 && (
        <Carte titre="À faire">
          <ul className="divide-y divide-zinc-100">
            {actions.map((a) => (
              <li key={a.texte}>
                <Link href={a.href} className="-mx-2 flex items-center gap-3 rounded-2xl px-2 py-2.5 text-[13px] hover:bg-zinc-50">
                  <AlertTriangle className="size-4 text-or-700" />
                  <span className="flex-1">{a.texte}</span>
                  <ArrowRight className="size-4 text-zinc-300" />
                </Link>
              </li>
            ))}
          </ul>
        </Carte>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Carte titre="Bourses des derniers mois">
          {!t.etats.length ? (
            <Vide>Aucun état de bourse.</Vide>
          ) : (
            <div className="flex h-56 items-end gap-3 pt-6">
              {t.etats.map((e) => (
                <Link key={e.id} href="/enrolement/bourse" className="group flex max-w-20 flex-1 flex-col items-center gap-1.5" title={`${moisFr(e.mois)} : ${fcfa(e.total)} · ${nf.format(e.effectif)} volontaires`}>
                  <span className="text-[10px] tabular-nums text-zinc-500">{(Number(e.total) / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M</span>
                  <div className={`w-full rounded-t-lg transition-colors ${e.statut === "VALIDE" ? "bg-marque-500 group-hover:bg-marque-600" : "bg-or-400 group-hover:brightness-95"}`} style={{ height: `${Math.max(4, (Number(e.total) / max) * 150)}px` }} />
                  <span className="text-[11px] text-zinc-500">{moisFr(e.mois).replace(/ (\d{2})(\d{2})$/, " $2")}</span>
                </Link>
              ))}
            </div>
          )}
          <p className="mt-3 text-[11px] text-zinc-400">En vert : validé par le DG ; en jaune : projet.</p>
        </Carte>
        <Carte titre="Sorties des six derniers mois">
          {!t.sorties.length ? (
            <Vide>Aucune sortie.</Vide>
          ) : (
            <ul className="space-y-1.5 text-[13px]">
              {t.sorties.map((s) => (
                <li key={`${s.mois}-${s.motif}`} className="flex items-center gap-2">
                  <span className="w-28 text-zinc-500 first-letter:uppercase">{moisFr(s.mois)}</span>
                  <span className="flex-1">{t.motifs.find((m) => m.code === s.motif)?.libelle ?? s.motif}</span>
                  <Badge>{nf.format(s.n)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Carte>
      </div>

      <EffectifsParDepartement t={t} />
    </div>
  );
}

/**
 * Effectifs en poste par département et catégorie, pour l'une ou l'autre liste payée chaque mois :
 * les volontaires (bourse) ou les enseignants communautaires (leur propre barème).
 */
function EffectifsParDepartement({ t }: { t: TableauEnrolement }) {
  const { refs } = useSession();
  const [liste, setListe] = useState<"VOLONTAIRE" | "COMMUNAUTAIRE">("VOLONTAIRE");
  const e: Effectifs =
    liste === "COMMUNAUTAIRE" ? t.communautaires : { registre: t.registre, parDepCat: t.parDepCat, coutMensuel: t.coutMensuel, categories: t.categories, baremeFixe: true };
  const nom = (id: number | null) => refs.departements.find((d) => d.id === id)?.nom ?? "~";
  const deps = [...new Set(e.parDepCat.map((x) => x.departementId))].sort((a, b) => nom(a).localeCompare(nom(b), "fr"));
  const cats = e.categories.filter((c) => e.parDepCat.some((x) => x.categorie === c.code));
  const sansCat = e.parDepCat.some((x) => !x.categorie);
  const n = (d: number | null, c: string | null) => e.parDepCat.find((x) => x.departementId === d && x.categorie === c)?.n ?? 0;
  const parCat = (c: string | null) => e.parDepCat.filter((x) => x.categorie === c).reduce((s, x) => s + x.n, 0);
  const cout = (lignes: Effectifs["parDepCat"]) => lignes.reduce((s, x) => s + x.n * (e.categories.find((c) => c.code === x.categorie)?.bourse ?? 0), 0);
  const total = e.parDepCat.reduce((s, x) => s + x.n, 0);
  const libelle = liste === "COMMUNAUTAIRE" ? "Communautaires" : "Volontaires";

  return (
    <Carte
      titre={`${libelle} en poste par département et catégorie`}
      actions={
        <Segments
          valeur={liste}
          changer={setListe}
          options={[
            { valeur: "VOLONTAIRE", libelle: `Volontaires · ${nf.format(t.registre.enPoste)}` },
            { valeur: "COMMUNAUTAIRE", libelle: `Communautaires · ${nf.format(t.communautaires.registre.enPoste)}` },
          ]}
        />
      }
    >
      {liste === "COMMUNAUTAIRE" && (
        <p className="mb-3 text-[12px] text-zinc-500">
          {nf.format(e.registre.enPoste)} communautaire(s) en poste, {nf.format(e.registre.sortis)} sorti(s).{" "}
          {!e.baremeFixe && <span className="font-medium text-or-700">Le barème des communautaires n’est pas encore fixé par le DG : le coût mensuel reste à 0.</span>}
        </p>
      )}
      {!deps.length ? (
        <Vide>{liste === "COMMUNAUTAIRE" ? "Aucun communautaire en poste dans le registre." : "Le registre est vide."}</Vide>
      ) : (
        <Tableau>
          <thead>
            <tr>
              <th>Département</th>
              {cats.map((c) => (
                <th key={c.code} className="text-right">
                  {c.libelle}
                </th>
              ))}
              {sansCat && <th className="text-right">Sans catégorie</th>}
              <th className="text-right">Total</th>
              <th className="text-right">Coût mensuel</th>
            </tr>
          </thead>
          <tbody>
            {deps.map((d) => {
              const lignes = e.parDepCat.filter((x) => x.departementId === d);
              return (
                <tr key={String(d)}>
                  <td>{refs.departements.find((x) => x.id === d)?.nom ?? "Non renseigné"}</td>
                  {cats.map((c) => (
                    <td key={c.code} className="text-right tabular-nums">
                      {nf.format(n(d, c.code))}
                    </td>
                  ))}
                  {sansCat && <td className="text-right tabular-nums text-rouge-600">{nf.format(n(d, null))}</td>}
                  <td className="text-right font-medium tabular-nums">{nf.format(lignes.reduce((s, x) => s + x.n, 0))}</td>
                  <td className="text-right tabular-nums whitespace-nowrap">{fcfa(cout(lignes))}</td>
                </tr>
              );
            })}
            {deps.length > 1 && (
              <tr className="bg-marque-50 font-semibold">
                <td>Total</td>
                {cats.map((c) => (
                  <td key={c.code} className="text-right tabular-nums">
                    {nf.format(parCat(c.code))}
                  </td>
                ))}
                {sansCat && <td className="text-right tabular-nums text-rouge-600">{nf.format(parCat(null))}</td>}
                <td className="text-right tabular-nums">{nf.format(total)}</td>
                <td className="text-right tabular-nums whitespace-nowrap">{fcfa(e.coutMensuel)}</td>
              </tr>
            )}
          </tbody>
        </Tableau>
      )}
      {liste === "VOLONTAIRE" && t.besoins > 0 && (
        <p className="mt-3 text-[12px] text-zinc-500">
          Besoins exprimés par les DDEPPSA : {nf.format(t.besoins)} volontaires —{" "}
          <Link href="/enrolement/besoins" className="font-medium text-marque-700 hover:underline">
            voir la couverture
          </Link>
          .
        </p>
      )}
    </Carte>
  );
}
