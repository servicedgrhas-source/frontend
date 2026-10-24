"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { FicheVolontaire, STATUT_REGULARISATION, fcfa, nf, peutGerer } from "@/components/enrolement/volontaires";
import { useSession } from "@/components/session";
import { Alerte, Annonce, Badge, Bouton, Carte, Champ, Chargement, Chiffre, EnTete, Liste, Modale, Saisie, Segments, Tableau, Vide, Zone } from "@/components/ui";
import { api, qs, useApi } from "@/lib/api";
import { peut } from "@/lib/libelles";

interface TropPercu {
  volontaireId: string;
  nomComplet: string;
  statut: string;
  origine: string;
  detail: string;
  montant: number;
  dejaTraite: number;
  aTraiter: number;
}

interface Regularisation {
  id: number;
  volontaireId: string;
  nomComplet: string;
  statutVolontaire: string;
  type: "COMPLEMENT" | "RETENUE";
  montant: number;
  reste: number;
  motif: string;
  origine: string;
  statut: string;
  creePar: string | null;
  creeLe: string;
}

interface ListeRegs {
  lignes: Regularisation[];
  resume: { type: string; statut: string; n: number; reste: string }[];
  origines: Record<string, string>;
}

/** Régularisations : trop-perçus détectés, compléments et retenues, sommes à recouvrer. */
export default function Regularisations() {
  const { profil } = useSession();
  const [vue, setVue] = useState<"detectes" | "toutes" | "recouvrer">("detectes");
  const [statut, setStatut] = useState("EN_ATTENTE");
  const [recherche, setRecherche] = useState("");
  const detectes = useApi<TropPercu[]>(vue === "detectes" ? "/enrolement/regularisations/trop-percus" : null);
  const liste = useApi<ListeRegs>(`/enrolement/regularisations${qs({ statut: vue === "recouvrer" ? "A_RECOUVRER" : statut, recherche })}`);
  const [fiche, setFiche] = useState<string | null>(null);
  const [annuler, setAnnuler] = useState<Regularisation | null>(null);
  const [motif, setMotif] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  if (!peut.traiter(profil.role)) return <Alerte>Accès réservé aux agents de la DGRHAS.</Alerte>;
  const gerer = peutGerer(profil.role);
  const somme = (type: string, st: string) => (liste.donnees?.resume ?? []).filter((r) => r.type === type && r.statut === st).reduce((t, r) => t + Number(r.reste), 0);
  const aTraiter = (detectes.donnees ?? []).filter((t) => t.aTraiter > 0);

  async function agir(f: () => Promise<unknown>, ok: string) {
    setErreur(null);
    try {
      await f();
      setMessage(ok);
      detectes.recharger();
      liste.recharger();
    } catch (x) {
      setErreur((x as Error).message);
    }
  }

  const lien = (id: string, nom: string) => (
    <button type="button" className="text-left font-medium underline decoration-zinc-300 decoration-dotted underline-offset-2 hover:text-marque-700" onClick={() => setFiche(id)}>
      {nom}
    </button>
  );

  return (
    <div className="space-y-6">
      <EnTete
        titre="Régularisations"
        sousTitre="Les sommes versées à tort ou restées dues. Un complément est payé avec la prochaine bourse ; une retenue est déduite des prochaines bourses, dans la limite de ce qui est payé. Pour un volontaire sorti, il n’y a plus de bourse : la retenue reste « à recouvrer » (liste Excel pour le recouvrement). Une régularisation se crée aussi depuis la fiche d’un volontaire."
      />
      <Annonce fermer={() => setMessage(null)}>{message}</Annonce>
      {erreur && <Alerte>{erreur}</Alerte>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <Chiffre ton={aTraiter.length ? "rouge" : "gris"} libelle="Trop-perçus non traités" valeur={detectes.donnees ? nf.format(aTraiter.length) : "…"} detail={detectes.donnees ? fcfa(aTraiter.reduce((t, x) => t + x.aTraiter, 0)) : "voir l’onglet"} />
        <Chiffre ton="jaune" libelle="Retenues en attente" valeur={fcfa(somme("RETENUE", "EN_ATTENTE"))} detail="déduites des prochaines bourses" />
        <Chiffre ton="bleu" libelle="Compléments en attente" valeur={fcfa(somme("COMPLEMENT", "EN_ATTENTE"))} detail="versés avec la prochaine bourse" />
        <Chiffre ton={somme("RETENUE", "A_RECOUVRER") ? "rouge" : "gris"} libelle="À recouvrer" valeur={fcfa(somme("RETENUE", "A_RECOUVRER"))} detail="volontaires sortis" />
      </div>

      <Segments
        valeur={vue}
        changer={setVue}
        options={[
          { valeur: "detectes", libelle: "Trop-perçus détectés" },
          { valeur: "toutes", libelle: "Régularisations" },
          { valeur: "recouvrer", libelle: "À recouvrer" },
        ]}
      />

      {vue === "detectes" && (
        <Carte
          titre="Sommes versées à tort"
          actions={
            gerer &&
            aTraiter.length > 0 && (
              <Bouton variante="principal" onClick={() => agir(() => api.post("/enrolement/regularisations/trop-percus/retenues", {}), `${aTraiter.length} retenue(s) créée(s) : elles seront déduites des prochaines bourses (ou à recouvrer pour les sortis).`)}>
                {aTraiter.length === 1 ? "Créer la retenue" : `Créer les ${nf.format(aTraiter.length)} retenues`}
              </Bouton>
            )
          }
        >
          <p className="-mt-2 mb-4 text-[12px] text-zinc-500">
            Calculés à partir des états validés et du registre tel qu’il est aujourd’hui : bourse de mois situés après la sortie (ou la fin de la durée), mise en route payée plusieurs fois. Corrigez d’abord la fiche si la date de sortie est fausse : la liste se met à jour.
          </p>
          {!detectes.donnees ? (
            <Chargement />
          ) : !detectes.donnees.length ? (
            <Vide>Aucun trop-perçu détecté.</Vide>
          ) : (
            <Tableau>
              <thead>
                <tr>
                  <th>Volontaire</th>
                  <th>Ce qui a été payé à tort</th>
                  <th className="text-right">Montant</th>
                  <th className="text-right">Déjà en retenue</th>
                  <th className="text-right">À traiter</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {detectes.donnees.map((t) => (
                  <tr key={`${t.volontaireId}-${t.origine}`}>
                    <td>
                      {lien(t.volontaireId, t.nomComplet)}
                      <div className="text-[11px] text-zinc-400">{t.statut === "SORTI" ? "sorti" : "en poste"}</div>
                    </td>
                    <td className="text-[12px] text-zinc-600">
                      <Badge ton={t.origine === "DOUBLE_MISE_EN_ROUTE" ? "rouge" : "jaune"}>{t.origine === "DOUBLE_MISE_EN_ROUTE" ? "Mise en route" : "Bourse"}</Badge> {t.detail}
                    </td>
                    <td className="text-right tabular-nums whitespace-nowrap">{fcfa(t.montant)}</td>
                    <td className="text-right tabular-nums whitespace-nowrap text-zinc-500">{fcfa(t.dejaTraite)}</td>
                    <td className="text-right font-medium tabular-nums whitespace-nowrap">{fcfa(t.aTraiter)}</td>
                    <td className="text-right">
                      {gerer && t.aTraiter > 0 && (
                        <Bouton variante="discret" onClick={() => agir(() => api.post("/enrolement/regularisations/trop-percus/retenues", { choix: [{ volontaireId: t.volontaireId, origine: t.origine }] }), `Retenue de ${fcfa(t.aTraiter)} créée pour ${t.nomComplet}.`)}>
                          Créer la retenue
                        </Bouton>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Tableau>
          )}
        </Carte>
      )}

      {vue !== "detectes" && (
        <Carte
          titre={vue === "recouvrer" ? "Retenues sur des volontaires sortis" : "Compléments et retenues"}
          actions={
            vue === "recouvrer" && (
              <Bouton onClick={() => api.telecharger("/enrolement/regularisations/a-recouvrer/excel", "Sommes à recouvrer - volontaires.xlsx")}>
                <Download /> Liste Excel
              </Bouton>
            )
          }
        >
          <div className="mb-4 grid gap-3 md:grid-cols-2">
            <Saisie placeholder="Rechercher un nom…" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
            {vue === "toutes" && (
              <Liste
                value={statut}
                onChange={(e) => setStatut(e.target.value)}
                vide="Tous les statuts"
                options={[
                  { valeur: "EN_ATTENTE", libelle: "En attente" },
                  { valeur: "SOLDEE", libelle: "Soldées" },
                  { valeur: "ANNULEE", libelle: "Annulées" },
                ]}
              />
            )}
          </div>
          {!liste.donnees ? (
            <Chargement />
          ) : !liste.donnees.lignes.length ? (
            <Vide>Aucune régularisation.</Vide>
          ) : (
            <Tableau>
              <thead>
                <tr>
                  <th>Volontaire</th>
                  <th>Type</th>
                  <th>Motif</th>
                  <th className="text-right">Montant</th>
                  <th className="text-right">Reste</th>
                  <th>Statut</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {liste.donnees.lignes.map((r) => {
                  const st = r.statut === "EN_ATTENTE" && r.type === "RETENUE" && r.statutVolontaire === "SORTI" ? "A_RECOUVRER" : r.statut;
                  return (
                    <tr key={r.id}>
                      <td>
                        {lien(r.volontaireId, r.nomComplet)}
                        <div className="text-[11px] text-zinc-400">
                          {liste.donnees!.origines[r.origine] ?? r.origine} · {r.creePar}
                        </div>
                      </td>
                      <td className={r.type === "RETENUE" ? "text-rouge-600" : "text-marque-700"}>{r.type === "RETENUE" ? "Retenue" : "Complément"}</td>
                      <td className="max-w-md text-[12px] text-zinc-600">{r.motif}</td>
                      <td className="text-right tabular-nums whitespace-nowrap">{fcfa(r.montant)}</td>
                      <td className="text-right tabular-nums whitespace-nowrap">{fcfa(r.reste)}</td>
                      <td>
                        <Badge ton={STATUT_REGULARISATION[st]?.ton ?? "gris"}>{STATUT_REGULARISATION[st]?.libelle ?? st}</Badge>
                      </td>
                      <td className="text-right">
                        {gerer && r.statut === "EN_ATTENTE" && (
                          <Bouton variante="discret" onClick={() => setAnnuler(r)}>
                            Annuler
                          </Bouton>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Tableau>
          )}
        </Carte>
      )}

      {fiche && (
        <FicheVolontaire
          id={fiche}
          fermer={() => {
            setFiche(null);
            detectes.recharger();
            liste.recharger();
          }}
        />
      )}
      <Modale titre="Annuler la régularisation" ouverte={!!annuler} fermer={() => setAnnuler(null)}>
        <p className="mb-4 text-[13px] text-zinc-600">
          {annuler?.type === "RETENUE" ? "Retenue" : "Complément"} de {fcfa(annuler?.reste ?? 0)} restant pour {annuler?.nomComplet}. Ce qui a déjà été imputé sur une bourse validée reste acquis.
        </p>
        <Champ libelle="Pourquoi l’annuler ?">
          <Zone value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Ex. : remboursé en espèces au Trésor (quittance n° …)." />
        </Champ>
        <div className="mt-6 flex justify-end gap-2">
          <Bouton onClick={() => setAnnuler(null)}>Retour</Bouton>
          <Bouton
            variante="danger"
            onClick={async () => {
              const r = annuler!;
              await agir(() => api.post(`/enrolement/regularisations/${r.id}/annulation`, { motif }), "Régularisation annulée.");
              setAnnuler(null);
              setMotif("");
            }}
          >
            Annuler la régularisation
          </Bouton>
        </div>
      </Modale>
    </div>
  );
}
