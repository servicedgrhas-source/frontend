"use client";

import { ArrowRight, Search, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ETAT_AJOUT, libelleStatut, type Manques, peutControlerAjout, peutRecenser, Taux, useConfigRecensement } from "@/components/recensement/commun";
import { ApercuFiche } from "@/components/recensement/apercu-fiche";
import { ControleModifications } from "@/components/recensement/controle-modifications";
import { ImportFichier } from "@/components/recensement/import-fichier";
import { useSession } from "@/components/session";
import { Alerte, Badge, Bouton, Carte, Chargement, EnTete, Saisie, Segments, Tableau, Vide } from "@/components/ui";
import { qs, useApi } from "@/lib/api";
import { accesDonne } from "@/lib/espaces";

interface Ligne {
  id: number;
  numeroFiche: string;
  statut: string;
  nomComplet: string;
  dateNaissance: string | null;
  matricule: string | null;
  structureNom: string | null;
  lieuService: string | null;
  taux: number;
  complet: boolean;
  manques: Manques;
  contentieux: "EN_COURS" | "CONTROLE" | "CONFIRME" | "REJETE" | null;
  ajouteLe: string | null;
  ajoutePar: string | null;
  motifAjout: string | null;
  avisControle: "FAVORABLE" | "DEFAVORABLE" | null;
  controlePar: string | null;
}
type Reponse = { total: number; page: number; parPage: number; lignes: Ligne[] };

const dateFr = (d: string | null | undefined) => (d ? d.slice(0, 10).split("-").reverse().join("/") : "—");
const ONGLETS = [
  { valeur: "controler", libelle: "À contrôler" },
  { valeur: "decider", libelle: "À décider par le DG" },
  { valeur: "acceptes", libelle: "Acceptés" },
  { valeur: "rejetes", libelle: "Rejetés" },
] as const;
type Onglet = (typeof ONGLETS)[number]["valeur"];

/**
 * Recensement : compléter ce qui manque aux agents déjà dans la base, ajouter ceux qui manquent (contrôle, puis DG),
 * et importer le fichier d'un recensement fait sur le terrain.
 */
export default function Page() {
  return (
    <Suspense fallback={<Chargement />}>
      <Recensement />
    </Suspense>
  );
}

function Recensement() {
  const { profil } = useSession();
  const params = useSearchParams();
  const router = useRouter();
  const config = useConfigRecensement();
  const c = config.donnees?.configuration;
  const [texte, setTexte] = useState(params.get("recherche") ?? "");
  const [cherche, setCherche] = useState(params.get("recherche") ?? "");
  const ongletInitial = ONGLETS.some((o) => o.valeur === params.get("onglet")) ? (params.get("onglet") as Onglet) : profil.role === "DG" ? "decider" : "controler";
  const [onglet, setOnglet] = useState<Onglet>(ongletInitial);
  // Fiche ouverte dans une fenêtre depuis les onglets (DG, 30/10/2026)
  const [apercu, setApercu] = useState<number | null>(null);

  // Recherche lancée un court instant après la frappe
  useEffect(() => {
    const t = setTimeout(() => setCherche(texte.trim()), 400);
    return () => clearTimeout(t);
  }, [texte]);

  const resultats = useApi<Reponse>(cherche.length >= 2 ? `/recensement/agents${qs({ recherche: cherche })}` : null);
  const listes: Record<Onglet, ReturnType<typeof useApi<Reponse>>> = {
    controler: useApi<Reponse>("/recensement/agents?ajout=A_CONTROLER"),
    decider: useApi<Reponse>("/recensement/agents?ajout=A_DECIDER"),
    acceptes: useApi<Reponse>("/recensement/agents?ajout=ACCEPTES"),
    rejetes: useApi<Reponse>("/recensement/agents?ajout=REJETES"),
  };
  const courante = listes[onglet];
  const toutRecharger = () => Object.values(listes).forEach((l) => l.recharger());

  if (!peutRecenser(profil.role) && !accesDonne(profil)) return <Alerte>Accès réservé aux agents de la DGRHAS, aux DDEPPSA et aux chefs d’établissement.</Alerte>;

  const ceQuiManque = (l: Ligne) =>
    [
      ...(l.manques.champs ?? []).map((k) => c?.champs.find((x) => x.code === k)?.libelle ?? k),
      ...(l.manques.pieces ?? []).map((p) => `${c?.pieces.find((x) => x.code === p.code)?.libelle ?? p.code} (pièce)`),
    ];
  const ajouter = () => router.push(`/personnel/agents/nouveau${qs({ recensement: 1, nom: cherche || undefined })}`);

  return (
    <div className="space-y-6">
      <EnTete
        titre="Recensement"
        sousTitre="Depuis Brazzaville, on ne voit pas tout ce qui se passe sur le terrain : le recensement sert à compléter les fiches des agents déjà dans la base, et à ajouter ceux qui manquent. Un agent ajouté passe d’abord par le bureau du contrôle, puis par le DG qui l’accepte dans la base ou le rejette."
      />

      {/* 1. Rechercher un agent, voir ce qui lui manque */}
      <Carte titre="1. Rechercher un agent et compléter ce qui lui manque">
        <div className="relative max-w-2xl">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-zinc-400" />
          <Saisie
            autoFocus
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            placeholder="Nom et prénoms, matricule, n° de fiche, téléphone ou date de naissance"
            className="w-full py-3 pl-10 text-[15px]"
          />
        </div>
        {cherche.length < 2 ? (
          <p className="mt-3 text-[12px] text-zinc-500">Tapez au moins deux lettres. Exemple : « Jean Paul MOUANDA » trouve aussi « MOUANDA Jean Paul ».</p>
        ) : !resultats.donnees ? (
          <Chargement />
        ) : !resultats.donnees.lignes.length ? (
          <div className="mt-4 rounded-2xl bg-or-100/50 px-5 py-4">
            <div className="text-[14px] font-semibold text-encre">Aucun agent ne correspond à « {cherche} ».</div>
            <p className="mt-1 text-[13px] text-zinc-600">Vérifiez l’orthographe, ou cherchez par le matricule ou la date de naissance. Si l’agent n’est vraiment pas dans la base :</p>
            <Bouton variante="principal" className="mt-3" onClick={ajouter}>
              <UserPlus /> L’agent n’existe pas ? Cliquez ici pour l’ajouter
            </Bouton>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            <p className="text-[12px] text-zinc-500">
              {resultats.donnees.total > resultats.donnees.lignes.length
                ? `${resultats.donnees.total} agents trouvés, les ${resultats.donnees.lignes.length} premiers affichés : précisez la recherche.`
                : `${resultats.donnees.total} agent(s) trouvé(s).`}
            </p>
            <ul className="space-y-2">
              {resultats.donnees.lignes.map((l) => {
                const manque = ceQuiManque(l);
                return (
                  <li key={l.id} className="flex flex-wrap items-center gap-4 rounded-2xl bg-zinc-50 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[14px] font-semibold">{l.nomComplet}</span>
                        <span className="text-[12px] text-zinc-400">
                          {l.numeroFiche} · {libelleStatut(c, l.statut)}
                          {l.matricule ? ` · matricule ${l.matricule}` : ""} · né(e) le {dateFr(l.dateNaissance)}
                        </span>
                        {l.contentieux && <Badge ton={ETAT_AJOUT[l.contentieux].ton}>{ETAT_AJOUT[l.contentieux].libelle}</Badge>}
                      </div>
                      <div className="text-[12px] text-zinc-500">{l.structureNom ?? l.lieuService ?? "Lieu de service inconnu"}</div>
                      <div className={`mt-1 text-[12px] ${l.complet ? "text-marque-700" : "text-or-700"}`}>
                        {l.complet ? "Fiche complète." : `Il manque : ${manque.slice(0, 6).join(" · ")}${manque.length > 6 ? ` · et ${manque.length - 6} autre(s)` : ""}`}
                      </div>
                    </div>
                    <Taux taux={l.taux} complet={l.complet} />
                    {/* Ouverte d'ici : ce qui est changé part au contrôle (DG, 30/10/2026) */}
                    <Link href={`/personnel/agents/${l.id}?recensement=1`}>
                      <Bouton variante={l.complet ? "secondaire" : "principal"}>
                        {l.complet ? "Voir la fiche" : "Compléter la fiche"} <ArrowRight />
                      </Bouton>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <p className="pt-1 text-[13px] text-zinc-600">
              L’agent cherché n’est pas dans cette liste ?{" "}
              <button type="button" className="font-semibold text-marque-700 hover:underline" onClick={ajouter}>
                Ajoutez-le
              </button>{" "}
              : il passera au contrôle, puis au DG.
            </p>
          </div>
        )}
      </Carte>

      {/* 2. Importer le fichier d'un recensement */}
      <ImportFichier titre="2. Importer le fichier d’un recensement" recensement apres={toutRecharger} />

      {/* 3. Les agents ajoutés : contrôle, puis décision du DG */}
      <Carte titre="3. Agents ajoutés au recensement : contrôle, puis décision du DG">
        <p className="-mt-2 mb-4 text-[13px] leading-relaxed text-zinc-600">
          {profil.role === "DG"
            ? "Les agents contrôlés attendent votre décision : ouvrez chaque fiche, lisez l’avis du contrôle, puis acceptez l’agent dans la base ou rejetez-le."
            : peutControlerAjout(profil.role)
              ? "Ouvrez chaque fiche « à contrôler » : vérifiez les pièces et que l’agent n’est pas déjà dans la base sous un autre nom, puis donnez votre avis. La fiche part alors au DG."
              : "Les agents que vous avez ajoutés, et où ils en sont. Tant qu’un agent n’est pas accepté par le DG, il ne compte ni dans les effectifs ni dans les besoins des écoles."}
        </p>
        <Segments
          valeur={onglet}
          changer={(v) => {
            setOnglet(v);
            router.replace(`/recensement${qs({ onglet: v })}`, { scroll: false });
          }}
          options={ONGLETS.map((o) => ({ valeur: o.valeur, libelle: `${o.libelle}${listes[o.valeur].donnees ? ` (${listes[o.valeur].donnees!.total})` : ""}` }))}
        />
        <div className="mt-4">
          {courante.erreur ? (
            <Alerte>{courante.erreur}</Alerte>
          ) : !courante.donnees ? (
            <Chargement />
          ) : !courante.donnees.lignes.length ? (
            <Vide>
              {onglet === "controler" ? "Aucun agent ajouté n’attend le contrôle." : onglet === "decider" ? "Aucun agent n’attend la décision du DG." : onglet === "acceptes" ? "Aucun agent accepté pour l’instant." : "Aucun agent rejeté."}
            </Vide>
          ) : (
            <Tableau>
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Ajouté</th>
                  <th>Pourquoi / d’où</th>
                  <th>Avis du contrôle</th>
                  <th>Fiche</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {courante.donnees.lignes.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <button type="button" onClick={() => setApercu(l.id)} className="text-left font-medium text-marque-700 hover:underline" title="Voir toutes ses informations">
                        {l.nomComplet}
                      </button>
                      <div className="text-[11px] text-zinc-400">
                        {l.numeroFiche} · {libelleStatut(c, l.statut)} · né(e) le {dateFr(l.dateNaissance)}
                      </div>
                    </td>
                    <td className="text-[12px] whitespace-nowrap">
                      {dateFr(l.ajouteLe)}
                      <div className="text-[11px] text-zinc-400">{l.ajoutePar ?? "—"}</div>
                    </td>
                    <td className="max-w-96 text-[12px] text-zinc-600">{l.motifAjout ?? "—"}</td>
                    <td className="text-[12px]">
                      {l.avisControle ? (
                        <>
                          <Badge ton={l.avisControle === "FAVORABLE" ? "vert" : "rouge"}>{l.avisControle === "FAVORABLE" ? "Favorable" : "Défavorable"}</Badge>
                          <div className="text-[11px] text-zinc-400">{l.controlePar}</div>
                        </>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td>
                      <Taux taux={l.taux} complet={l.complet} />
                    </td>
                    <td className="text-right">
                      <Link href={`/personnel/agents/${l.id}`}>
                        <Bouton variante={onglet === "controler" || onglet === "decider" ? "principal" : "secondaire"}>
                          {onglet === "controler" && peutControlerAjout(profil.role) ? "Contrôler" : onglet === "decider" && profil.role === "DG" ? "Décider" : "Ouvrir"} <ArrowRight />
                        </Bouton>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Tableau>
          )}
          {!!courante.donnees && courante.donnees.total > courante.donnees.lignes.length && (
            <p className="mt-3 text-[12px] text-zinc-500">
              {courante.donnees.lignes.length} affichés sur {courante.donnees.total}.{" "}
              <Link href={`/personnel/agents${qs({ controle: onglet === "controler" ? "CONTENTIEUX" : onglet === "decider" ? "CONTENTIEUX_DG" : undefined })}`} className="font-medium text-marque-700 hover:underline">
                Voir toute la liste
              </Link>
            </p>
          )}
        </div>
      </Carte>
      <ControleModifications />
      {apercu !== null && (
        <ApercuFiche
          id={apercu}
          c={c}
          fermer={() => setApercu(null)}
          action={onglet === "controler" && peutControlerAjout(profil.role) ? "Contrôler la fiche" : onglet === "decider" && profil.role === "DG" ? "Décider" : undefined}
        />
      )}
    </div>
  );
}
