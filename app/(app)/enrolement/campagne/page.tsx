"use client";

import { PencilLine, Plus, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { type Campagne, SelecteurCampagne, useCampagne } from "@/components/enrolement/commun";
import { useSession } from "@/components/session";
import { Aide, Alerte, Annonce, Badge, Bouton, BoutonIcone, Carte, Champ, Chargement, EnTete, Jauge, Modale, Saisie, Tableau, Vide } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { peut } from "@/lib/libelles";

interface Membre {
  id: string;
  nom: string;
  fonction: string | null;
  places: number;
  saisis: number;
  retenus: number;
  depasse: boolean;
}

const CYCLES = ["Préscolaire", "Primaire", "Collège", "Lycée", "Administration"] as const;
const fcfa = (n: number) => `${new Intl.NumberFormat("fr-FR").format(n).replace(/\s/g, " ")} FCFA`;

interface Budget {
  enveloppe: number;
  consomme: number;
  resteEnveloppe: number | null;
  cycles: { cycle: string; places: number; montant: number; retenus: number; reste: number | null; consomme: number; prevu?: number }[];
}

interface Edition {
  id: number | null;
  annee: string;
  anneeScolaire: string;
  quota: string;
  enveloppe: string;
  places: Record<string, string>;
  ouverte: boolean;
}

/** Paramètre de la bourse mensuelle de chaque cycle (Administration › Paramètres). */
const PARAM_BOURSE: Record<string, string> = {
  Préscolaire: "BOURSE_PRESCOLAIRE",
  Primaire: "BOURSE_PRIMAIRE",
  Collège: "BOURSE_COLLEGE",
  Lycée: "BOURSE_LYCEE",
  Administration: "BOURSE_ADMINISTRATION",
};

const nombre = (s: string | undefined) => Number((s ?? "").replace(/\D/g, "")) || 0;

function editionDe(c?: Campagne): Edition {
  return {
    id: c?.id ?? null,
    annee: c ? String(c.annee) : String(new Date().getFullYear()),
    anneeScolaire: c?.anneeScolaire ?? "",
    quota: c?.quota ? String(c.quota) : "",
    enveloppe: Number(c?.enveloppe) ? String(Number(c?.enveloppe)) : "",
    places: Object.fromEntries(CYCLES.map((x) => [x, c?.placesParCycle?.[x] ? String(c.placesParCycle[x]) : ""])),
    ouverte: c?.ouverte ?? true,
  };
}

/** Campagne d'enrôlement (année, budget par cycle fixé par la DGRHAS) et sa commission (membres et places). */
export default function CampagneEnrolement() {
  const { profil } = useSession();
  const dg = peut.valider(profil.role);
  const { campagnes, liste, campagne, choisir } = useCampagne();
  const membres = useApi<Membre[]>(campagne ? `/enrolement/membres?campagne=${campagne.id}` : null);
  const parametres = useApi<{ cle: string; valeur: string }[]>("/parametres");
  // Bourse mensuelle de chaque cycle, réglée dans les paramètres : le coût se calcule tout seul
  const bourse = (c: string) => Number(parametres.donnees?.find((x) => x.cle === PARAM_BOURSE[c])?.valeur ?? 0) || 0;
  const budget = useApi<Budget>(campagne ? `/enrolement/campagnes/${campagne.id}/compteurs` : null);
  const [edition, setEdition] = useState<Edition | null>(null);
  const [membre, setMembre] = useState<{ id: string | null; nom: string; fonction: string; places: string } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ton: "vert" | "rouge"; texte: string } | null>(null);
  if (!peut.traiter(profil.role)) return <Alerte>Accès réservé aux agents de la DGRHAS.</Alerte>;

  const placesDonnees = (membres.donnees ?? []).reduce((t, m) => t + m.places, 0);

  async function enregistrerCampagne() {
    if (!edition) return;
    setErreur(null);
    const corps = {
      annee: Number(edition.annee),
      anneeScolaire: edition.anneeScolaire,
      quota: Number(edition.quota || 0),
      enveloppe: nombre(edition.enveloppe),
      placesParCycle: Object.fromEntries(CYCLES.map((c) => [c, nombre(edition.places[c])])),
      ouverte: edition.ouverte,
    };
    try {
      const c = edition.id ? await api.put<Campagne>(`/enrolement/campagnes/${edition.id}`, corps) : await api.post<Campagne>("/enrolement/campagnes", corps);
      setEdition(null);
      setMessage({ ton: "vert", texte: `Campagne ${c.annee} enregistrée${c.quota ? ` : ${c.quota} volontaire(s) à retenir` : ""}.` });
      campagnes.recharger();
      budget.recharger();
      choisir(c.id);
    } catch (e) {
      setErreur((e as Error).message);
    }
  }

  async function enregistrerMembre() {
    if (!membre || !campagne) return;
    setErreur(null);
    const corps = { campagneId: campagne.id, nom: membre.nom, fonction: membre.fonction || null, places: Number(membre.places || 0) };
    try {
      if (membre.id) await api.put(`/enrolement/membres/${membre.id}`, corps);
      else await api.post("/enrolement/membres", corps);
      setMembre(null);
      setMessage({ ton: "vert", texte: `${corps.nom.trim()} : ${corps.places} place(s).` });
      membres.recharger();
    } catch (e) {
      setErreur((e as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <EnTete
        titre="Campagne, quota et commission"
        sousTitre="L’enrôlement fait des finalistes des écoles professionnelles des enseignants volontaires (bourse, contrat de 5 ans, priorité pour le recrutement par la Fonction Publique). Chaque année, la DGRHAS ouvre une campagne et fixe son quota ; la commission se partage les places."
        actions={
          dg && (
            <Bouton variante="principal" onClick={() => setEdition(editionDe())}>
              <Plus /> Ouvrir une campagne
            </Bouton>
          )
        }
      />
      <Annonce ton={message?.ton} fermer={() => setMessage(null)}>
        {message?.texte}
      </Annonce>

      <Carte titre="Le parcours d’un dossier">
        <ol className="grid gap-3 text-[13px] leading-relaxed text-zinc-600 md:grid-cols-5">
          {[
            ["1. Campagne et budget", "Le DG ouvre la campagne de l’année, fixe l’enveloppe de bourses et, pour chaque cycle, les places et la bourse."],
            ["2. Commission", "Les membres de la commission et leurs places (dans la limite du quota)."],
            ["3. Saisie", "Chaque dossier déposé est saisi (ou importé d’une liste Excel) : il est « à contrôler »."],
            ["4. Contrôle puis décision", "Le contrôleur vérifie le dossier ; la DGRHAS retient ou non, un par un ou tous ensemble."],
            ["5. Note de service", "Les retenus entrent dans la note de service des volontaires (« Préparer les notes », année au choix)."],
          ].map(([t, x]) => (
            <li key={t} className="rounded-2xl bg-zinc-50 px-3 py-2.5">
              <div className="font-semibold text-encre">{t}</div>
              {x}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-[12px] text-zinc-500">Rien ne part à la Fonction Publique : tout se décide ici, jusqu’à la note de service.</p>
      </Carte>

      {!campagnes.donnees ? <Chargement /> : <SelecteurCampagne liste={liste} campagne={campagne} choisir={choisir} />}

      {campagne && budget.donnees && (budget.donnees.enveloppe > 0 || budget.donnees.cycles.some((x) => x.places > 0 || x.retenus > 0)) && (
        <Carte titre={`Budget de la campagne ${campagne.annee}`}>
          <p className="mb-3 flex items-center gap-1.5 text-[13px] text-zinc-600">
            {budget.donnees.enveloppe > 0
              ? `Enveloppe : ${fcfa(budget.donnees.enveloppe)}. Engagé par les volontaires retenus : ${fcfa(budget.donnees.consomme)} par an. Reste : ${fcfa(Math.max(0, budget.donnees.enveloppe - budget.donnees.consomme))}.`
              : `Engagé par les volontaires retenus : ${fcfa(budget.donnees.consomme)}. (Enveloppe pas encore fixée.)`}
            <Aide>Comme au recrutement : chaque cycle a ses places et sa bourse. En retenant un volontaire, sa bourse est comptée ; le système refuse de dépasser les places d’un cycle ou l’enveloppe.</Aide>
          </p>
          <Tableau>
            <thead>
              <tr>
                <th>Cycle</th>
                <th className="w-56">Places retenues</th>
                <th className="text-right">Bourse / mois</th>
                <th className="text-right">Prévu par an</th>
                <th className="text-right">Engagé par an</th>
              </tr>
            </thead>
            <tbody>
              {budget.donnees.cycles
                .filter((x) => x.places > 0 || x.retenus > 0)
                .map((x) => (
                  <tr key={x.cycle}>
                    <td className="font-medium">{x.cycle}</td>
                    <td>
                      {x.places > 0 ? <Jauge valeur={x.retenus} max={x.places} /> : null}
                      <div className="mt-1 text-[11px] text-zinc-500">
                        {x.retenus} retenu(s){x.places > 0 ? ` / ${x.places}` : ""}
                      </div>
                    </td>
                    <td className="text-right tabular-nums">{x.montant ? fcfa(x.montant) : "—"}</td>
                    <td className="text-right tabular-nums">{fcfa(x.prevu ?? 0)}</td>
                    <td className="text-right tabular-nums">{fcfa(x.consomme)}</td>
                  </tr>
                ))}
            </tbody>
          </Tableau>
        </Carte>
      )}

      {liste.length > 0 && (
        <Carte titre="Campagnes">
          <Tableau>
            <thead>
              <tr>
                <th>Campagne</th>
                <th>Année scolaire des notes</th>
                <th className="w-56">Quota (volontaires à retenir)</th>
                <th className="text-right">Dossiers</th>
                <th>État</th>
                {dg && <th className="w-12" />}
              </tr>
            </thead>
            <tbody>
              {liste.map((c) => (
                <tr key={c.id} className={c.id === campagne?.id ? "bg-marque-50/50" : ""}>
                  <td className="font-medium">Enrôlement {c.annee}</td>
                  <td>{c.anneeScolaire}</td>
                  <td>
                    {c.quota ? (
                      <>
                        <Jauge valeur={c.retenus} max={c.quota} />
                        <div className="mt-1 text-[11px] text-zinc-500">
                          {c.retenus} retenu(s) / {c.quota}
                        </div>
                      </>
                    ) : (
                      <span className="text-[12px] text-or-700">pas encore fixé</span>
                    )}
                  </td>
                  <td className="text-right tabular-nums">{c.total}</td>
                  <td>{c.ouverte ? <Badge ton="vert">ouverte</Badge> : <Badge>fermée</Badge>}</td>
                  {dg && (
                    <td>
                      <BoutonIcone libelle="Modifier (année scolaire, budget par cycle, ouverture)" onClick={() => setEdition(editionDe(c))}>
                        <PencilLine />
                      </BoutonIcone>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </Tableau>
        </Carte>
      )}

      {campagne && (
        <Carte
          titre={`Commission de la campagne ${campagne.annee}`}
          actions={
            dg && (
              <Bouton onClick={() => setMembre({ id: null, nom: "", fonction: "", places: "" })}>
                <UserPlus /> Ajouter un membre
              </Bouton>
            )
          }
        >
          <p className="mb-3 flex items-center gap-1.5 text-[13px] text-zinc-600">
            {campagne.quota
              ? `Quota de la campagne : ${campagne.quota}. Places données aux membres : ${placesDonnees}. Reste à donner : ${Math.max(0, campagne.quota - placesDonnees)}.`
              : "Fixez d’abord le quota de la campagne : les places des membres en dépendent."}
            <Aide>
              À la saisie, l’agent indique si le dossier est apporté par un membre : sa place est comptée. Un membre qui dépasse ses places passe en rouge (la
              saisie n’est pas bloquée, le DG décide).
            </Aide>
          </p>
          {!membres.donnees ? (
            <Chargement />
          ) : !membres.donnees.length ? (
            <Vide>Aucun membre pour cette campagne.</Vide>
          ) : (
            <Tableau>
              <thead>
                <tr>
                  <th>Membre</th>
                  <th className="w-56">Places utilisées</th>
                  <th className="text-right">Places</th>
                  <th className="text-right">Saisis</th>
                  <th className="text-right">Retenus</th>
                  {dg && <th className="w-24" />}
                </tr>
              </thead>
              <tbody>
                {membres.donnees.map((m) => (
                  <tr key={m.id} className={m.depasse ? "bg-rouge-100/50" : ""}>
                    <td>
                      <div className="font-medium">{m.nom}</div>
                      {m.fonction && <div className="text-[11px] text-zinc-400">{m.fonction}</div>}
                    </td>
                    <td>
                      <Jauge valeur={m.saisis} max={m.places} />
                      <div className="mt-1 text-[11px] text-zinc-500">
                        {m.saisis} / {m.places}
                        {m.depasse ? ` · dépassé de ${m.saisis - m.places}` : ""}
                      </div>
                    </td>
                    <td className="text-right tabular-nums">{m.places}</td>
                    <td className="text-right tabular-nums">{m.saisis}</td>
                    <td className="text-right tabular-nums">{m.retenus}</td>
                    {dg && (
                      <td>
                        <div className="flex justify-end gap-1">
                          <BoutonIcone libelle="Modifier" onClick={() => setMembre({ id: m.id, nom: m.nom, fonction: m.fonction ?? "", places: String(m.places) })}>
                            <PencilLine />
                          </BoutonIcone>
                          <BoutonIcone
                            libelle="Retirer ce membre"
                            ton="rouge"
                            onClick={async () => {
                              try {
                                await api.delete(`/enrolement/membres/${m.id}`);
                                membres.recharger();
                              } catch (e) {
                                setMessage({ ton: "rouge", texte: (e as Error).message });
                              }
                            }}
                          >
                            <Trash2 />
                          </BoutonIcone>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </Tableau>
          )}
        </Carte>
      )}

      <Modale titre={edition?.id ? `Campagne ${edition.annee}` : "Ouvrir une campagne d’enrôlement"} ouverte={!!edition} fermer={() => setEdition(null)}>
        {edition && (
          <div className="grid gap-3 md:grid-cols-2">
            <Champ libelle="Année de la campagne *">
              <Saisie inputMode="numeric" value={edition.annee} onChange={(e) => setEdition({ ...edition, annee: e.target.value.replace(/\D/g, "").slice(0, 4) })} disabled={!!edition.id} />
            </Champ>
            <Champ libelle="Année scolaire des notes" aide={`Vide : ${edition.annee ? `${edition.annee}-${Number(edition.annee) + 1}` : "année suivante"}`}>
              <Saisie value={edition.anneeScolaire} onChange={(e) => setEdition({ ...edition, anneeScolaire: e.target.value })} placeholder="Ex. 2026-2027" />
            </Champ>
            <Champ
              libelle="Enveloppe de bourses de la campagne (FCFA)"
              aide="Le montant à ne pas dépasser, comme au recrutement (ex. 50 000 000). 0 : pas encore fixée."
              className="md:col-span-2"
            >
              <Saisie inputMode="numeric" value={edition.enveloppe} onChange={(e) => setEdition({ ...edition, enveloppe: e.target.value.replace(/\D/g, "") })} placeholder="Ex. 50000000" />
            </Champ>
            <div className="md:col-span-2">
              <div className="mb-1 text-[13px] font-medium">Places par cycle</div>
              <p className="mb-2 text-[12px] text-zinc-500">
                Tapez seulement le nombre de places : le coût se calcule tout seul avec la bourse mensuelle du cycle (réglée dans Administration › Paramètres), sur 12 mois.
              </p>
              <div className="overflow-x-auto">
                <Tableau>
                  <thead>
                    <tr>
                      <th>Cycle</th>
                      <th className="w-28">Places</th>
                      <th className="text-right">Bourse / mois</th>
                      <th className="text-right">Coût par an</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CYCLES.map((c) => (
                      <tr key={c}>
                        <td className="font-medium">{c}</td>
                        <td>
                          <Saisie inputMode="numeric" className="w-24" value={edition.places[c]} onChange={(e) => setEdition({ ...edition, places: { ...edition.places, [c]: e.target.value.replace(/\D/g, "") } })} placeholder="0" />
                        </td>
                        <td className="text-right whitespace-nowrap tabular-nums text-zinc-500">{fcfa(bourse(c))}</td>
                        <td className="text-right whitespace-nowrap tabular-nums font-medium">{fcfa(nombre(edition.places[c]) * bourse(c) * 12)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Tableau>
              </div>
              {(() => {
                const places = CYCLES.reduce((t, c) => t + nombre(edition.places[c]), 0);
                const cout = CYCLES.reduce((t, c) => t + nombre(edition.places[c]) * bourse(c) * 12, 0);
                const env = nombre(edition.enveloppe);
                return (
                  <p className={`mt-2 text-[12px] ${env > 0 && cout > env ? "font-semibold text-rouge-600" : "text-zinc-500"}`}>
                    Total : {places} volontaire(s), {fcfa(cout)} par an
                    {env > 0 ? (cout > env ? ` — dépasse l’enveloppe de ${fcfa(env)} !` : ` sur ${fcfa(env)} (reste ${fcfa(env - cout)})`) : ""}
                  </p>
                );
              })()}
            </div>
            <Champ libelle="Ou seulement le nombre total de volontaires" aide="Utilisé si vous ne donnez pas les places cycle par cycle. 0 : pas encore connu." className="md:col-span-2">
              <Saisie inputMode="numeric" value={edition.quota} onChange={(e) => setEdition({ ...edition, quota: e.target.value.replace(/\D/g, "") })} placeholder="Ex. 500" />
            </Champ>
            {edition.id && (
              <label className="flex items-center gap-2 text-[13px] md:col-span-2">
                <input type="checkbox" className="size-4 accent-marque-600" checked={edition.ouverte} onChange={(e) => setEdition({ ...edition, ouverte: e.target.checked })} />
                Campagne ouverte (on peut encore saisir de nouveaux dossiers)
              </label>
            )}
            {erreur && (
              <div className="md:col-span-2">
                <Alerte>{erreur}</Alerte>
              </div>
            )}
          </div>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Bouton onClick={() => setEdition(null)}>Annuler</Bouton>
          <Bouton variante="principal" disabled={!edition?.annee} onClick={enregistrerCampagne}>
            Enregistrer
          </Bouton>
        </div>
      </Modale>

      <Modale titre={membre?.id ? "Modifier le membre" : "Ajouter un membre de la commission"} ouverte={!!membre} fermer={() => setMembre(null)}>
        {membre && (
          <div className="space-y-3">
            <Champ libelle="Nom et prénoms *">
              <Saisie autoFocus value={membre.nom} onChange={(e) => setMembre({ ...membre, nom: e.target.value })} />
            </Champ>
            <Champ libelle="Fonction">
              <Saisie value={membre.fonction} onChange={(e) => setMembre({ ...membre, fonction: e.target.value })} />
            </Champ>
            <Champ libelle="Nombre de places *" aide={campagne?.quota ? `Il reste ${Math.max(0, campagne.quota - placesDonnees + (membres.donnees?.find((m) => m.id === membre.id)?.places ?? 0))} place(s) du quota à donner.` : undefined}>
              <Saisie inputMode="numeric" value={membre.places} onChange={(e) => setMembre({ ...membre, places: e.target.value.replace(/\D/g, "") })} />
            </Champ>
            {erreur && <Alerte>{erreur}</Alerte>}
          </div>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Bouton onClick={() => setMembre(null)}>Annuler</Bouton>
          <Bouton variante="principal" disabled={!membre?.nom.trim() || membre?.places === ""} onClick={enregistrerMembre}>
            Enregistrer
          </Bouton>
        </div>
      </Modale>
    </div>
  );
}
