"use client";

import { Download, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { nf, useConfigEnrolement } from "@/components/enrolement/volontaires";
import { useSession } from "@/components/session";
import { Alerte, Annonce, Badge, Bouton, BoutonIcone, Carte, Champ, Chargement, Chiffre, EnTete, Liste, Modale, Saisie, Tableau, Vide, useConfirmation } from "@/components/ui";
import { api, qs, useApi } from "@/lib/api";
import { accesDonne } from "@/lib/espaces";
import { peut } from "@/lib/libelles";
import { SaisieReferentiel } from "@/components/saisie-referentiel";

interface Besoin {
  id: number;
  departementId: number;
  etablissement: string;
  categorie: string;
  specialite: string | null;
  nombre: number;
  anneeScolaire: string | null;
  observation: string | null;
  enPoste: number;
  manque: number;
  surplus: number;
}

type Edition = { id: number | null; departementId: string; etablissement: string; categorie: string; specialite: string; nombre: string; anneeScolaire: string; observation: string };

/** Besoins en volontaires par établissement, comparés aux volontaires en poste. */
export default function Besoins() {
  const { profil, refs } = useSession();
  const config = useConfigEnrolement();
  const ddeppsa = profil.role === "DDEPPSA";
  const [departement, setDepartement] = useState("");
  const besoins = useApi<{ lignes: Besoin[]; total: { besoin: number; enPoste: number; manque: number } }>(`/enrolement/besoins${qs({ departement })}`);
  const [edition, setEdition] = useState<Edition | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmation, demander] = useConfirmation();
  if (!peut.traiter(profil.role) && !ddeppsa && !accesDonne(profil)) return <Alerte>Accès réservé aux agents de la DGRHAS et aux DDEPPSA.</Alerte>;
  const gerer = ddeppsa || ["ADMIN", "CHEF_SERVICE", "DIRECTEUR", "DG"].includes(profil.role);
  const cats = config.donnees?.configuration.categories ?? [];
  const nomCat = (k: string) => cats.find((x) => x.code === k)?.libelle ?? k;
  const nomDep = (d: number) => refs.departements.find((x) => x.id === d)?.nom ?? "—";
  const deps = ddeppsa ? refs.departements.filter((d) => d.id === profil.departementId) : refs.departements;

  async function enregistrer() {
    if (!edition) return;
    setErreur(null);
    try {
      const corps = { ...edition, departementId: Number(edition.departementId), nombre: Number(edition.nombre) };
      if (edition.id) await api.put(`/enrolement/besoins/${edition.id}`, corps);
      else await api.post("/enrolement/besoins", corps);
      setEdition(null);
      setMessage("Besoin enregistré.");
      besoins.recharger();
    } catch (x) {
      setErreur((x as Error).message);
    }
  }
  const t = besoins.donnees?.total;

  return (
    <div className="space-y-6">
      <EnTete
        titre="Besoins par établissement"
        sousTitre="Les besoins en enseignants volontaires exprimés par les DDEPPSA (établissement, catégorie, spécialité), comparés aux volontaires en poste dans le registre. Ils servent à placer les nouveaux volontaires là où ils manquent."
        actions={
          <>
            <Bouton onClick={() => api.telecharger("/enrolement/besoins/excel", "Besoins en volontaires.xlsx")}>
              <Download /> Excel
            </Bouton>
            {gerer && (
              <Bouton
                variante="principal"
                onClick={() => {
                  setErreur(null);
                  setEdition({ id: null, departementId: ddeppsa ? String(profil.departementId ?? "") : departement, etablissement: "", categorie: "", specialite: "", nombre: "1", anneeScolaire: "", observation: "" });
                }}
              >
                Ajouter un besoin
              </Bouton>
            )}
          </>
        }
      />
      <Annonce fermer={() => setMessage(null)}>{message}</Annonce>
      {t && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Chiffre ton="bleu" libelle="Besoins exprimés" valeur={nf.format(t.besoin)} detail="volontaires demandés" />
          <Chiffre ton="vert" libelle="Couverts" valeur={nf.format(t.enPoste)} detail="volontaires en poste qui y répondent" />
          <Chiffre ton={t.manque ? "rouge" : "gris"} libelle="Manquent" valeur={nf.format(t.manque)} detail="à pourvoir" />
        </div>
      )}
      <Carte>
        {!ddeppsa && (
          <div className="mb-4 max-w-sm">
            <Liste value={departement} onChange={(e) => setDepartement(e.target.value)} vide="Tous les départements" options={refs.departements.map((d) => ({ valeur: d.id, libelle: d.nom }))} />
          </div>
        )}
        {besoins.erreur && <Alerte>{besoins.erreur}</Alerte>}
        {!besoins.donnees ? (
          <Chargement />
        ) : !besoins.donnees.lignes.length ? (
          <Vide>Aucun besoin enregistré.</Vide>
        ) : (
          <Tableau>
            <thead>
              <tr>
                <th>Département</th>
                <th>Établissement</th>
                <th>Catégorie</th>
                <th>Spécialité</th>
                <th className="text-right">Besoin</th>
                <th className="text-right">En poste</th>
                <th>Situation</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {besoins.donnees.lignes.map((b) => (
                <tr key={b.id}>
                  <td>{nomDep(b.departementId)}</td>
                  <td>
                    {b.etablissement}
                    {b.observation && <div className="text-[11px] text-zinc-400">{b.observation}</div>}
                  </td>
                  <td>{nomCat(b.categorie)}</td>
                  <td className="text-[12px]">{b.specialite ?? "Toutes"}</td>
                  <td className="text-right tabular-nums">{nf.format(b.nombre)}</td>
                  <td className="text-right tabular-nums">{nf.format(b.enPoste)}</td>
                  <td>{b.manque ? <Badge ton="rouge">manque {nf.format(b.manque)}</Badge> : b.surplus ? <Badge ton="bleu">+{nf.format(b.surplus)}</Badge> : <Badge ton="vert">couvert</Badge>}</td>
                  <td className="text-right whitespace-nowrap">
                    {gerer && (
                      <>
                        <BoutonIcone
                          libelle="Modifier"
                          onClick={() => {
                            setErreur(null);
                            setEdition({ id: b.id, departementId: String(b.departementId), etablissement: b.etablissement, categorie: b.categorie, specialite: b.specialite ?? "", nombre: String(b.nombre), anneeScolaire: b.anneeScolaire ?? "", observation: b.observation ?? "" });
                          }}
                        >
                          <Pencil />
                        </BoutonIcone>
                        <BoutonIcone
                          libelle="Supprimer"
                          onClick={async () => {
                            if (!(await demander(`Supprimer le besoin de ${b.etablissement} (${nomCat(b.categorie)}) ?`, "Supprimer"))) return;
                            try {
                              await api.delete(`/enrolement/besoins/${b.id}`);
                              besoins.recharger();
                            } catch (x) {
                              setErreur((x as Error).message);
                            }
                          }}
                        >
                          <Trash2 />
                        </BoutonIcone>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Tableau>
        )}
        {erreur && !edition && (
          <div className="mt-4">
            <Alerte>{erreur}</Alerte>
          </div>
        )}
      </Carte>
      <Modale titre={edition?.id ? "Modifier le besoin" : "Ajouter un besoin"} ouverte={!!edition} fermer={() => setEdition(null)} large>
        {edition && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Champ libelle="Département">
              <Liste value={edition.departementId} disabled={ddeppsa} onChange={(e) => setEdition({ ...edition, departementId: e.target.value })} vide="— Choisir —" options={deps.map((d) => ({ valeur: d.id, libelle: d.nom }))} />
            </Champ>
            <Champ libelle="Établissement">
              <SaisieReferentiel liste="ETABLISSEMENT" valeur={edition.etablissement} changer={(v) => setEdition({ ...edition, etablissement: v })} departementId={edition.departementId} placeholder="Lycée de Dongou" />
            </Champ>
            <Champ libelle="Catégorie">
              <Liste value={edition.categorie} onChange={(e) => setEdition({ ...edition, categorie: e.target.value })} vide="— Choisir —" options={cats.filter((x) => x.actif).map((x) => ({ valeur: x.code, libelle: x.libelle }))} />
            </Champ>
            <Champ libelle="Spécialité" aide="Vide : toutes spécialités.">
              <SaisieReferentiel liste="MATIERE" valeur={edition.specialite} changer={(v) => setEdition({ ...edition, specialite: v })} placeholder="Mathématiques" />
            </Champ>
            <Champ libelle="Nombre de volontaires">
              <Saisie inputMode="numeric" value={edition.nombre} onChange={(e) => setEdition({ ...edition, nombre: e.target.value.replace(/\D/g, "") })} />
            </Champ>
            <Champ libelle="Année scolaire">
              <Saisie value={edition.anneeScolaire} onChange={(e) => setEdition({ ...edition, anneeScolaire: e.target.value })} placeholder="2026-2027" />
            </Champ>
            <Champ libelle="Observation" className="sm:col-span-2">
              <Saisie value={edition.observation} onChange={(e) => setEdition({ ...edition, observation: e.target.value })} />
            </Champ>
          </div>
        )}
        {erreur && edition && (
          <div className="mt-4">
            <Alerte>{erreur}</Alerte>
          </div>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Bouton onClick={() => setEdition(null)}>Annuler</Bouton>
          <Bouton variante="principal" onClick={enregistrer}>
            Enregistrer
          </Bouton>
        </div>
      </Modale>
      {confirmation}
    </div>
  );
}
