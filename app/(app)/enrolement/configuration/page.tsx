"use client";

import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { type ConfigEnrolement, fcfa, useConfigEnrolement } from "@/components/enrolement/volontaires";
import { useSession } from "@/components/session";
import { Alerte, Annonce, Bouton, BoutonIcone, Carte, Champ, Chargement, EnTete, Liste, Saisie, Tableau, useConfirmation } from "@/components/ui";
import { api } from "@/lib/api";
import { peut } from "@/lib/libelles";

const nombre = (s: string) => (s.trim() === "" ? null : Number(s.replace(/[\s.]/g, "")));

/** Configuration de l'enrôlement : barèmes, règles de la bourse, motifs de sortie, contrôles. Réglée par le DG. */
export default function ConfigurationEnrolement() {
  const { profil } = useSession();
  const rep = useConfigEnrolement();
  const [c, setC] = useState<ConfigEnrolement | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmation, demander] = useConfirmation();
  const modifiable = peut.parametrer(profil.role);

  // La copie de travail part de la configuration en vigueur (puis on la modifie librement)
  if (rep.donnees && !c) setC(structuredClone(rep.donnees.configuration));
  if (!peut.traiter(profil.role)) return <Alerte>Accès réservé aux agents de la DGRHAS.</Alerte>;
  if (rep.erreur) return <Alerte>{rep.erreur}</Alerte>;
  if (!rep.donnees || !c) return <Chargement />;
  const r = rep.donnees;
  const change = JSON.stringify(c) !== JSON.stringify(r.configuration);
  const maj = (p: Partial<ConfigEnrolement>) => setC({ ...c, ...p });

  async function enregistrer() {
    setErreur(null);
    try {
      const nouvelle = await api.put<ConfigEnrolement>("/enrolement/configuration", c);
      setC(structuredClone(nouvelle));
      rep.recharger();
      setMessage("Configuration enregistrée : elle s’applique aux prochains calculs de bourse et aux imports.");
    } catch (x) {
      setErreur((x as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <EnTete
        titre="Configuration de l’enrôlement"
        sousTitre="Barèmes de la bourse et de la mise en route, règles de début et de fin de bourse, motifs de sortie et contrôles. Le DG les règle ici : aucune de ces règles n’est figée dans le programme. Un changement s’applique aux prochains calculs ; les états déjà validés gardent leurs montants."
        actions={
          modifiable && (
            <>
              <Bouton
                onClick={async () => {
                  if (await demander("Remettre dans le formulaire les valeurs des documents signés de 2026 ? Rien n’est enregistré tant que vous ne cliquez pas sur « Enregistrer ».", "Reprendre les valeurs par défaut"))
                    setC(structuredClone(r.defaut));
                }}
              >
                <RotateCcw /> Valeurs par défaut
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

      <fieldset disabled={!modifiable} className="min-w-0 space-y-6">
        <Carte
          titre="Catégories de bourse"
          actions={
            <Bouton variante="discret" onClick={() => maj({ categories: [...c.categories, { code: "", libelle: "", bourse: 0, equipement: 0, motsCles: [], actif: true }] })}>
              <Plus /> Ajouter une catégorie
            </Bouton>
          }
        >
          <p className="-mt-2 mb-4 text-[12px] text-zinc-500">
            La bourse mensuelle dépend de la catégorie, pas seulement du cycle (Beaux-Arts/DEMA et administration scolaire sont à part). Les mots-clés servent à reconnaître la catégorie dans la colonne « Cycle » des fichiers (« 3-Beaux-Arts/DEMA » → Beaux-Arts). La mise d’équipement est versée une fois, à la mise en route.
          </p>
          <Tableau>
            <thead>
              <tr>
                <th>Catégorie</th>
                <th className="w-36">Bourse / mois</th>
                <th className="w-36">Mise d’équipement</th>
                <th>Mots-clés (séparés par des virgules)</th>
                <th className="w-20">Active</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {c.categories.map((x, i) => {
                const set = (p: Partial<typeof x>) => maj({ categories: c.categories.map((y, j) => (j === i ? { ...y, ...p } : y)) });
                return (
                  <tr key={i}>
                    <td>
                      <Saisie value={x.libelle} onChange={(e) => set({ libelle: e.target.value })} className="w-full" />
                      <div className="mt-1 text-[11px] text-zinc-400">{x.code || "code donné à l’enregistrement"}</div>
                    </td>
                    <td>
                      <Saisie inputMode="numeric" value={String(x.bourse)} onChange={(e) => set({ bourse: nombre(e.target.value) ?? 0 })} className="w-full text-right" />
                    </td>
                    <td>
                      <Saisie inputMode="numeric" value={String(x.equipement)} onChange={(e) => set({ equipement: nombre(e.target.value) ?? 0 })} className="w-full text-right" />
                    </td>
                    <td>
                      <Saisie value={x.motsCles.join(", ")} onChange={(e) => set({ motsCles: e.target.value.split(",").map((s) => s.trim().toUpperCase()) })} className="w-full" />
                    </td>
                    <td>
                      <input type="checkbox" className="size-4 accent-marque-600" checked={x.actif} onChange={(e) => set({ actif: e.target.checked })} />
                    </td>
                    <td className="text-right">
                      {!x.code && (
                        <BoutonIcone libelle="Retirer" onClick={() => maj({ categories: c.categories.filter((_, j) => j !== i) })}>
                          <Trash2 />
                        </BoutonIcone>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Tableau>
          <p className="mt-3 text-[11px] text-zinc-400">
            Une catégorie déjà utilisée ne se supprime pas : désactivez-la. Bourse appliquée aux cycles des campagnes : {Object.entries(r.boursesParCycle).map(([cy, b]) => `${cy} ${fcfa(b)}`).join(" · ")}.
          </p>
        </Carte>

        <Carte titre="Communautaires : montant mensuel par cycle">
          <p className="-mt-2 mb-4 text-[12px] text-zinc-500">
            Les communautaires ont leur propre liste de paiement chaque mois, par département et par cycle (pas de note de service, pas de vague, pas de mise en route). Un montant à 0 n’est pas encore fixé : la liste
            du mois reste bloquée tant qu’il ne l’est pas. Les mots-clés reconnaissent le cycle dans les fichiers.
          </p>
          <Tableau>
            <thead>
              <tr>
                <th>Cycle</th>
                <th className="w-40">Montant / mois</th>
                <th>Mots-clés (séparés par des virgules)</th>
                <th className="w-20">Actif</th>
              </tr>
            </thead>
            <tbody>
              {(c.categoriesCommunautaires ?? []).map((x, i) => {
                const set = (p: Partial<typeof x>) => maj({ categoriesCommunautaires: c.categoriesCommunautaires.map((y, j) => (j === i ? { ...y, ...p } : y)) });
                return (
                  <tr key={i}>
                    <td>
                      <Saisie value={x.libelle} onChange={(e) => set({ libelle: e.target.value })} className="w-full" />
                    </td>
                    <td>
                      <Saisie inputMode="numeric" value={String(x.bourse)} onChange={(e) => set({ bourse: nombre(e.target.value) ?? 0 })} className="w-full text-right" />
                      {!x.bourse && <div className="mt-1 text-[11px] text-or-700">À fixer</div>}
                    </td>
                    <td>
                      <Saisie value={x.motsCles.join(", ")} onChange={(e) => set({ motsCles: e.target.value.split(",").map((v) => v.trim().toUpperCase()) })} className="w-full" />
                    </td>
                    <td>
                      <input type="checkbox" className="size-4 accent-marque-600" checked={x.actif} onChange={(e) => set({ actif: e.target.checked })} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Tableau>
        </Carte>

        <Carte titre="Vagues de volontaires">
          <div className="max-w-md">
            <Champ libelle="Année d’enrôlement de la 1re vague" aide="2019 : la 1re vague est 2019-2020, la vague de 2026 est la 8e. Les anciennes vagues sont recrutées en premier à la Fonction Publique.">
              <Saisie inputMode="numeric" value={String(c.premiereVague ?? 2019)} onChange={(e) => maj({ premiereVague: nombre(e.target.value) ?? 2019 })} />
            </Champ>
          </div>
        </Carte>

        <div className="grid gap-6 xl:grid-cols-2">
          <Carte titre="Début et fin de la bourse">
            <div className="space-y-4">
              <Champ libelle="Premier mois payé d’un nouveau volontaire" aide="Quand la fiche indique un « premier mois payé », c’est lui qui compte (reprise des listes existantes).">
                <Liste value={c.debutBourse} onChange={(e) => maj({ debutBourse: e.target.value as ConfigEnrolement["debutBourse"] })} options={Object.entries(r.reglesDebut).map(([k, l]) => ({ valeur: k, libelle: l }))} />
              </Champ>
              <div className="grid gap-3 sm:grid-cols-2">
                <Champ libelle="Durée maximale du volontariat (mois)" aide="0 : sans limite.">
                  <Saisie inputMode="numeric" value={String(c.dureeMaxMois)} onChange={(e) => maj({ dureeMaxMois: nombre(e.target.value) ?? 0 })} />
                </Champ>
                <Champ libelle="Au-delà de cette durée">
                  <Liste
                    value={c.depassementDuree}
                    disabled={!c.dureeMaxMois}
                    onChange={(e) => maj({ depassementDuree: e.target.value as "SIGNALER" | "ARRETER" })}
                    options={[
                      { valeur: "SIGNALER", libelle: "Le signaler seulement (on continue de payer)" },
                      { valeur: "ARRETER", libelle: "Arrêter la bourse" },
                    ]}
                  />
                </Champ>
              </div>
              <p className="text-[12px] text-zinc-500">La bourse s’arrête aussi à la sortie du volontaire, selon le motif (tableau ci-dessous).</p>
            </div>
          </Carte>

          <Carte titre="Contrôles et signataire">
            <div className="grid gap-3 sm:grid-cols-3">
              <Champ libelle="Âge minimum">
                <Saisie inputMode="numeric" value={String(c.ageMinimum)} onChange={(e) => maj({ ageMinimum: nombre(e.target.value) ?? 0 })} />
              </Champ>
              <Champ libelle="Âge maximum">
                <Saisie inputMode="numeric" value={String(c.ageMaximum)} onChange={(e) => maj({ ageMaximum: nombre(e.target.value) ?? 0 })} />
              </Champ>
              <Champ libelle="Téléphone partagé à partir de" aide="volontaires payés">
                <Saisie inputMode="numeric" value={String(c.telephonePartage)} onChange={(e) => maj({ telephonePartage: nombre(e.target.value) ?? 0 })} />
              </Champ>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Champ libelle="Titre du signataire des états de paiement">
                <Saisie value={c.signatairePaiementTitre} onChange={(e) => maj({ signatairePaiementTitre: e.target.value })} />
              </Champ>
              <Champ libelle="Nom du signataire">
                <Saisie value={c.signatairePaiementNom} onChange={(e) => maj({ signatairePaiementNom: e.target.value })} />
              </Champ>
            </div>
          </Carte>
        </div>

        <Carte
          titre="Motifs de sortie"
          actions={
            <Bouton variante="discret" onClick={() => maj({ motifsSortie: [...c.motifsSortie, { code: "", libelle: "", arreteBourse: true, reintegrable: false, dernierMoisPaye: "MOIS_PRECEDENT", actif: true }] })}>
              <Plus /> Ajouter un motif
            </Bouton>
          }
        >
          <Tableau>
            <thead>
              <tr>
                <th>Motif</th>
                <th className="w-28">Arrête la bourse</th>
                <th className="w-64">Dernier mois payé</th>
                <th className="w-28">Réintégrable</th>
                <th className="w-20">Actif</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {c.motifsSortie.map((x, i) => {
                const set = (p: Partial<typeof x>) => maj({ motifsSortie: c.motifsSortie.map((y, j) => (j === i ? { ...y, ...p } : y)) });
                return (
                  <tr key={i}>
                    <td>
                      <Saisie value={x.libelle} onChange={(e) => set({ libelle: e.target.value })} className="w-full" />
                      <div className="mt-1 text-[11px] text-zinc-400">{x.code || "code donné à l’enregistrement"}</div>
                    </td>
                    <td>
                      <input type="checkbox" className="size-4 accent-marque-600" checked={x.arreteBourse} onChange={(e) => set({ arreteBourse: e.target.checked })} />
                    </td>
                    <td>
                      <Liste
                        value={x.dernierMoisPaye}
                        disabled={!x.arreteBourse}
                        onChange={(e) => set({ dernierMoisPaye: e.target.value as typeof x.dernierMoisPaye })}
                        options={[
                          { valeur: "MOIS_PRECEDENT", libelle: "Le mois avant la sortie" },
                          { valeur: "MOIS_DE_SORTIE", libelle: "Le mois de la sortie" },
                        ]}
                      />
                    </td>
                    <td>
                      <input type="checkbox" className="size-4 accent-marque-600" checked={x.reintegrable} onChange={(e) => set({ reintegrable: e.target.checked })} />
                    </td>
                    <td>
                      <input type="checkbox" className="size-4 accent-marque-600" checked={x.actif} onChange={(e) => set({ actif: e.target.checked })} />
                    </td>
                    <td className="text-right">
                      {!x.code && (
                        <BoutonIcone libelle="Retirer" onClick={() => maj({ motifsSortie: c.motifsSortie.filter((_, j) => j !== i) })}>
                          <Trash2 />
                        </BoutonIcone>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Tableau>
          <p className="mt-3 text-[11px] text-zinc-400">« Recruté à la Fonction Publique » sert au contrôle automatique des recrutés : il ne peut pas être supprimé.</p>
        </Carte>

        <Carte titre="Mise en route : transport par département">
          <p className="-mt-2 mb-4 text-[12px] text-zinc-500">Billet et bagages versés une fois, avec la mise d’équipement de la catégorie. Laissez vide un montant pas encore fixé (il sera signalé sur la fiche de mise en route).</p>
          <div className="grid gap-x-8 md:grid-cols-2">
            {r.departements.map((d) => {
              const t = c.transport[d.code] ?? { billet: null, bagages: null };
              const set = (p: Partial<typeof t>) => maj({ transport: { ...c.transport, [d.code]: { ...t, ...p } } });
              return (
                <div key={d.code} className="flex items-center gap-3 border-b border-zinc-100 py-2">
                  <span className="flex-1 text-[13px]">{d.nom}</span>
                  <Saisie aria-label={`Billet ${d.nom}`} placeholder="billet" inputMode="numeric" value={t.billet ?? ""} onChange={(e) => set({ billet: nombre(e.target.value) })} className="w-28 text-right" />
                  <Saisie aria-label={`Bagages ${d.nom}`} placeholder="bagages" inputMode="numeric" value={t.bagages ?? ""} onChange={(e) => set({ bagages: nombre(e.target.value) })} className="w-28 text-right" />
                </div>
              );
            })}
          </div>
        </Carte>
      </fieldset>
      {confirmation}
    </div>
  );
}
