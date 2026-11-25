"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ETAT_AJOUT, libelleStatut, type Manques, peutControlerAjout, peutRecenser, Taux, useConfigRecensement } from "@/components/recensement/commun";
import { ApercuFiche } from "@/components/recensement/apercu-fiche";
import { PropositionsAgents } from "@/components/banque-mondiale/propositions";
import { ControleModifications } from "@/components/recensement/controle-modifications";
import { AgentsSignales, EcolesAuControle } from "@/components/recensement/controle-terrain";
import { jourFr, type Campagne } from "@/components/recensement/recensement-ouvert";
import { useSession } from "@/components/session";
import { Alerte, Badge, Bouton, Carte, Chargement, EnTete, Segments, Tableau, Vide } from "@/components/ui";
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
 * Contrôle des données d'un recensement (DG, 25/11/2026) : les agents ajoutés (à contrôler, à décider
 * par le DG, acceptés, rejetés) et les fiches modifiées. Sans recensement choisi : tous.
 */
export default function Page() {
  return (
    <Suspense fallback={<Chargement />}>
      <Controle />
    </Suspense>
  );
}

function Controle() {
  const { profil } = useSession();
  const params = useSearchParams();
  const router = useRouter();
  const config = useConfigRecensement();
  const c = config.donnees?.configuration;
  const campagne = /^\d+$/.test(params.get("campagne") ?? "") ? Number(params.get("campagne")) : undefined;
  const ongletInitial = ONGLETS.some((o) => o.valeur === params.get("onglet")) ? (params.get("onglet") as Onglet) : profil.role === "DG" ? "decider" : "controler";
  const [onglet, setOnglet] = useState<Onglet>(ongletInitial);
  // Fiche ouverte dans une fenêtre depuis les onglets (DG, 30/10/2026)
  const [apercu, setApercu] = useState<number | null>(null);

  const campagnes = useApi<{ lignes: Campagne[] }>("/recensement/campagnes");
  const recensement = campagne ? campagnes.donnees?.lignes.find((x) => x.id === campagne) : undefined;
  const listes: Record<Onglet, ReturnType<typeof useApi<Reponse>>> = {
    controler: useApi<Reponse>(`/recensement/agents${qs({ ajout: "A_CONTROLER", campagne })}`),
    decider: useApi<Reponse>(`/recensement/agents${qs({ ajout: "A_DECIDER", campagne })}`),
    acceptes: useApi<Reponse>(`/recensement/agents${qs({ ajout: "ACCEPTES", campagne })}`),
    rejetes: useApi<Reponse>(`/recensement/agents${qs({ ajout: "REJETES", campagne })}`),
  };
  const courante = listes[onglet];

  if (!peutRecenser(profil.role) && !accesDonne(profil)) return <Alerte>Accès réservé aux agents de la DGRHAS, aux DDEPPSA et aux chefs d’établissement.</Alerte>;

  return (
    <div className="space-y-6">
      <Link href={campagne ? `/recensement/campagnes/${campagne}` : "/recensement"} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-marque-700 hover:underline">
        <ArrowLeft className="size-4" /> {recensement ? recensement.nom : campagne ? "Le recensement" : "Les recensements"}
      </Link>
      <EnTete
        titre="Contrôle des données"
        sousTitre={
          recensement
            ? `${recensement.nom}${recensement.anneeScolaire ? ` · année scolaire ${recensement.anneeScolaire}` : ""} · du ${jourFr(recensement.debut)}${recensement.fin ? ` au ${jourFr(recensement.fin)}` : ""}. Les agents ajoutés par ce recensement passent d’abord par le bureau du contrôle, puis par le DG qui les accepte dans la base ou les rejette.`
            : "Tous les recensements. Un agent ajouté passe d’abord par le bureau du contrôle, puis par le DG qui l’accepte dans la base ou le rejette."
        }
      />

      <Carte titre="Agents ajoutés : contrôle, puis décision du DG">
        <p className="-mt-2 mb-4 text-[13px] leading-relaxed text-zinc-600">
          {profil.role === "DG"
            ? "Les agents contrôlés attendent votre décision : ouvrez chaque fiche, lisez l’avis du contrôle, puis acceptez l’agent dans la base ou rejetez-le."
            : peutControlerAjout(profil.role)
              ? "Ouvrez chaque fiche « à contrôler » : vérifiez les pièces et que l’agent n’est pas déjà dans la base sous un autre nom, puis donnez votre avis. La fiche part alors au DG."
              : "Les agents ajoutés, et où ils en sont. Tant qu’un agent n’est pas accepté par le DG, il ne compte ni dans les effectifs ni dans les besoins des écoles."}
        </p>
        <Segments
          valeur={onglet}
          changer={(v) => {
            setOnglet(v);
            router.replace(`/recensement/controle${qs({ campagne, onglet: v })}`, { scroll: false });
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
                      {l.contentieux && (
                        <div className="mt-0.5">
                          <Badge ton={ETAT_AJOUT[l.contentieux].ton}>{ETAT_AJOUT[l.contentieux].libelle}</Badge>
                        </div>
                      )}
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
      <ControleModifications campagne={campagne} />
      <AgentsSignales />
      <EcolesAuControle />
      <PropositionsAgents />
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
