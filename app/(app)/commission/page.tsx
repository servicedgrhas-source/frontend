"use client";

import { PencilLine, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { useSession } from "@/components/session";
import { Aide, Alerte, Annonce, Badge, Bouton, BoutonIcone, Carte, Champ, Chargement, EnTete, Jauge, Liste, Modale, Saisie, Tableau, Vide } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { accesDonne } from "@/lib/espaces";
import { peut } from "@/lib/libelles";

interface Membre {
  id: string;
  quota: number;
  nom: string;
  fonction: string | null;
  places: number;
  modifiePar: string | null;
  saisis: number;
  valides: number;
  envoyes: number;
  restantes: number;
  depasse: boolean;
}

const anneeCourante = new Date().getFullYear();
// De l'année après la prochaine (dossiers mis à part pour le quota suivant) jusqu'à 2015
const QUOTAS = Array.from({ length: anneeCourante + 3 - 2015 }, (_, i) => anneeCourante + 2 - i);

export default function MembresCommission() {
  const { profil } = useSession();
  const dg = peut.valider(profil.role);
  const [quota, setQuota] = useState(anneeCourante);
  const membres = useApi<Membre[]>(`/commission/membres?quota=${quota}`);
  // Places de la commission dans le quota réajusté (Pilotage › Bénéficiaires du quota)
  const conso = useApi<{ beneficiaires: { commission: boolean; prevues: number; utilisees: number }[] }>(`/candidats/quota-beneficiaires?quota=${quota}`);
  const placesCommission = conso.donnees?.beneficiaires.find((b) => b.commission)?.prevues ?? null;
  const [edition, setEdition] = useState<{ id: string | null; nom: string; fonction: string; places: string } | null>(null);
  const [suppression, setSuppression] = useState<Membre | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ton: "vert" | "rouge"; texte: string } | null>(null);

  if (!peut.traiter(profil.role) && !accesDonne(profil)) return <Alerte>Accès réservé aux agents de la DGRHAS.</Alerte>;

  const liste = membres.donnees ?? [];
  const total = liste.reduce(
    (t, m) => ({ places: t.places + m.places, saisis: t.saisis + m.saisis, valides: t.valides + m.valides, envoyes: t.envoyes + m.envoyes }),
    { places: 0, saisis: 0, valides: 0, envoyes: 0 },
  );

  async function enregistrer() {
    if (!edition) return;
    setErreur(null);
    const corps = { quota, nom: edition.nom, fonction: edition.fonction || null, places: Number(edition.places) };
    try {
      if (edition.id) await api.put(`/commission/membres/${edition.id}`, corps);
      else await api.post("/commission/membres", corps);
      setMessage({ ton: "vert", texte: `${edition.nom.trim()} : ${corps.places} place(s) pour le quota ${quota}.` });
      setEdition(null);
      membres.recharger();
      conso.recharger();
    } catch (e) {
      setErreur((e as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <EnTete
        titre="Membres de la commission"
        sousTitre="Chaque membre de la commission de recrutement a un nombre de places par quota. On voit ici combien de dossiers chacun a apportés, combien sont validés et combien sont partis à la Fonction Publique."
      />

      <Annonce ton={message?.ton} fermer={() => setMessage(null)}>
        {message?.texte}
      </Annonce>

      <Carte
        titre={`Quota ${quota}`}
        actions={
          <div className="flex items-center gap-2">
            <Liste value={String(quota)} onChange={(e) => setQuota(Number(e.target.value))} options={QUOTAS.map((q) => ({ valeur: q, libelle: `Quota ${q}` }))} />
            {dg && (
              <Bouton variante="principal" onClick={() => setEdition({ id: null, nom: "", fonction: "", places: "" })}>
                <UserPlus /> Ajouter un membre
              </Bouton>
            )}
          </div>
        }
      >
        <p className="mb-4 flex items-center gap-1.5 text-[13px] text-zinc-600">
          {dg
            ? "Ajoutez les membres de la commission et leurs places. À la saisie d’un candidat, l’agent choisit le membre qui a apporté le dossier."
            : "Liste tenue par le DG. À la saisie d’un candidat, choisissez le membre qui a apporté le dossier (champ « Apporté par un membre de la commission ? »)."}
          <Aide>
            <strong>Places</strong> : nombre de dossiers que le membre peut apporter pour ce quota. <strong>Saisis</strong> : dossiers enregistrés à son nom (toutes
            étapes). <strong>Validés</strong> : validés par le DG. <strong>Envoyés</strong> : partis à la FP. Si un membre dépasse ses places, la saisie n’est pas
            bloquée : la ligne passe en rouge pour que le DG décide.
          </Aide>
        </p>
        {placesCommission !== null &&
          (placesCommission > 0 ? (
            <div className="mb-4 grid gap-2 text-center sm:grid-cols-3">
              {[
                ["Places de la commission (quota réajusté)", placesCommission, "text-encre"],
                ["Données aux membres", total.places, total.places > placesCommission ? "text-rouge-600" : "text-encre"],
                ["Reste à donner", Math.max(0, placesCommission - total.places), "text-marque-700"],
              ].map(([l, v, c]) => (
                <div key={l as string} className="rounded-2xl bg-zinc-50 py-2.5">
                  <div className={`text-lg font-semibold tabular-nums ${c}`}>{v as number}</div>
                  <div className="text-[11px] text-zinc-500">{l as string}</div>
                </div>
              ))}
            </div>
          ) : (
            <Alerte ton="jaune">
              Le DG n’a pas encore donné de places à la commission pour le quota {quota} (Pilotage › Bénéficiaires du quota). Les places des membres ne sont donc pas
              encore limitées.
            </Alerte>
          ))}
        {membres.erreur && <Alerte>{membres.erreur}</Alerte>}
        {!membres.donnees ? (
          <Chargement />
        ) : !liste.length ? (
          <Vide>Aucun membre enregistré pour le quota {quota}.{dg ? " Cliquez sur « Ajouter un membre »." : ""}</Vide>
        ) : (
          <Tableau>
            <thead>
              <tr>
                <th>Membre</th>
                <th className="w-56">Places utilisées</th>
                <th className="text-right">Places</th>
                <th className="text-right">Saisis</th>
                <th className="text-right">Validés</th>
                <th className="text-right">Envoyés à la FP</th>
                <th className="text-right">Restantes</th>
                {dg && <th className="w-24" />}
              </tr>
            </thead>
            <tbody>
              {liste.map((m) => (
                <tr key={m.id} className={m.depasse ? "bg-rouge-100/50" : ""}>
                  <td>
                    <div className="font-medium">{m.nom}</div>
                    {m.fonction && <div className="text-[11px] text-zinc-400">{m.fonction}</div>}
                  </td>
                  <td>
                    <Jauge valeur={m.saisis} max={m.places} />
                    <div className="mt-1 text-[11px] text-zinc-500">
                      {m.saisis} / {m.places}
                    </div>
                  </td>
                  <td className="text-right tabular-nums">{m.places}</td>
                  <td className="text-right tabular-nums">{m.saisis}</td>
                  <td className="text-right tabular-nums">{m.valides}</td>
                  <td className="text-right tabular-nums">{m.envoyes}</td>
                  <td className="text-right">
                    {m.depasse ? <Badge ton="rouge">dépassé de {m.saisis - m.places}</Badge> : m.restantes === 0 ? <Badge ton="jaune">complet</Badge> : <span className="tabular-nums">{m.restantes}</span>}
                  </td>
                  {dg && (
                    <td>
                      <div className="flex justify-end gap-1">
                        <BoutonIcone libelle="Modifier (nom, fonction, places)" onClick={() => setEdition({ id: m.id, nom: m.nom, fonction: m.fonction ?? "", places: String(m.places) })}>
                          <PencilLine />
                        </BoutonIcone>
                        <BoutonIcone libelle="Retirer ce membre" ton="rouge" onClick={() => setSuppression(m)}>
                          <Trash2 />
                        </BoutonIcone>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              <tr className="font-semibold">
                <td>Total ({liste.length} membre(s))</td>
                <td />
                <td className="text-right tabular-nums">{total.places}</td>
                <td className="text-right tabular-nums">{total.saisis}</td>
                <td className="text-right tabular-nums">{total.valides}</td>
                <td className="text-right tabular-nums">{total.envoyes}</td>
                <td className="text-right tabular-nums">{Math.max(0, total.places - total.saisis)}</td>
                {dg && <td />}
              </tr>
            </tbody>
          </Tableau>
        )}
      </Carte>

      <Modale titre={edition?.id ? "Modifier le membre" : `Ajouter un membre (quota ${quota})`} ouverte={!!edition} fermer={() => setEdition(null)}>
        {edition && (
          <div className="space-y-4">
            <Champ libelle="Nom et prénoms *">
              <Saisie autoFocus value={edition.nom} onChange={(e) => setEdition({ ...edition, nom: e.target.value })} placeholder="Ex. M. NGOMA Pierre" />
            </Champ>
            <Champ libelle="Fonction" aide="Facultatif : son poste ou sa structure">
              <Saisie value={edition.fonction} onChange={(e) => setEdition({ ...edition, fonction: e.target.value })} placeholder="Ex. Conseiller du Ministre" />
            </Champ>
            <Champ
              libelle="Nombre de places pour le quota *"
              aide={
                placesCommission
                  ? `Combien de dossiers ce membre peut apporter. Il reste ${Math.max(0, placesCommission - total.places + (liste.find((m) => m.id === edition.id)?.places ?? 0))} place(s) de la commission à donner.`
                  : "Combien de dossiers ce membre peut apporter"
              }
            >
              <Saisie inputMode="numeric" value={edition.places} onChange={(e) => setEdition({ ...edition, places: e.target.value.replace(/\D/g, "") })} placeholder="Ex. 20" />
            </Champ>
            {erreur && <Alerte>{erreur}</Alerte>}
          </div>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Bouton onClick={() => setEdition(null)}>Annuler</Bouton>
          <Bouton variante="principal" disabled={!edition?.nom.trim() || edition?.places === ""} onClick={enregistrer}>
            Enregistrer
          </Bouton>
        </div>
      </Modale>

      <Modale titre="Retirer ce membre ?" ouverte={!!suppression} fermer={() => setSuppression(null)}>
        <p className="text-[13px] leading-relaxed text-zinc-600">
          <strong>{suppression?.nom}</strong> sera retiré de la commission du quota {quota}. Ce n’est possible que s’il n’a encore apporté aucun dossier ; sinon,
          mettez plutôt ses places à 0.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Bouton onClick={() => setSuppression(null)}>Annuler</Bouton>
          <Bouton
            variante="danger"
            onClick={async () => {
              const m = suppression!;
              setSuppression(null);
              try {
                await api.delete(`/commission/membres/${m.id}`);
                setMessage({ ton: "vert", texte: `${m.nom} a été retiré de la commission du quota ${quota}.` });
                membres.recharger();
              } catch (e) {
                setMessage({ ton: "rouge", texte: (e as Error).message });
              }
            }}
          >
            Retirer
          </Bouton>
        </div>
      </Modale>
    </div>
  );
}
