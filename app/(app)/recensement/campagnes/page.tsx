"use client";

import { CalendarPlus, Lock, LockOpen, Pencil } from "lucide-react";
import { useState } from "react";
import { jourFr, type Campagne } from "@/components/recensement/recensement-ouvert";
import { useSession } from "@/components/session";
import { Alerte, Annonce, Badge, Bouton, Carte, Champ, Chargement, EnTete, Modale, Saisie, Vide, Zone, useConfirmation } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { accesDonne } from "@/lib/espaces";
import { peut } from "@/lib/libelles";

/*
 * Les recensements (DG, 22/11/2026) : « on ouvre un recensement, on donne son nom, l'année, l'année
 * scolaire, la date de début et de fin facultative ; ça permet de bien ranger et de savoir que les
 * données proviennent de tel recensement ». Un seul ouvert à la fois : tout ce que le recensement
 * produit pendant qu'il est ouvert (agents ajoutés, fiches modifiées, signalements, recenseurs)
 * porte son nom.
 */

const nf = new Intl.NumberFormat("fr-FR");

export default function PageCampagnes() {
  const { profil } = useSession();
  const r = useApi<{ lignes: Campagne[]; ouverte: { id: number; nom: string } | null }>("/recensement/campagnes");
  const [edition, setEdition] = useState<Campagne | "nouveau" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmation, demander] = useConfirmation();
  const decider = peut.controler(profil.role);

  if (!peut.traiter(profil.role) && profil.role !== "DDEPPSA" && !accesDonne(profil)) return <Alerte>Accès réservé à la DGRHAS.</Alerte>;

  const ouverte = r.donnees?.ouverte ?? null;

  const basculer = async (c: Campagne) => {
    setErreur(null);
    setMessage(null);
    try {
      if (!c.clotureLe) {
        if (!(await demander(`Clôturer « ${c.nom} » ? Plus rien ne sera rangé sous ce recensement (ce qui y est déjà reste). On peut le rouvrir.`, "Oui, clôturer"))) return;
        await api.post(`/recensement/campagnes/${c.id}/cloturer`, {});
        setMessage(`« ${c.nom} » est clôturé. Vous pouvez ouvrir le recensement suivant.`);
      } else {
        await api.post(`/recensement/campagnes/${c.id}/rouvrir`, {});
        setMessage(`« ${c.nom} » est rouvert : ce qui se fait au recensement est de nouveau rangé sous lui.`);
      }
      r.recharger();
    } catch (e) {
      setErreur((e as Error).message);
    }
  };

  return (
    <div className="space-y-5">
      <EnTete
        titre="Recensements"
        sousTitre="Chaque recensement a son nom, son année, son année scolaire et ses dates. Pendant qu’il est ouvert, tout ce que le recensement produit est rangé sous lui : agents ajoutés, fiches modifiées, constats du terrain (absent, parti, inconnu), recenseurs créés. Un seul recensement est ouvert à la fois."
        actions={
          decider && (
            <Bouton variante="principal" disabled={!!ouverte} title={ouverte ? `Clôturez d’abord « ${ouverte.nom} »` : undefined} onClick={() => setEdition("nouveau")}>
              <CalendarPlus /> Ouvrir un recensement
            </Bouton>
          )
        }
      />
      <Annonce fermer={() => setMessage(null)}>{message}</Annonce>
      {erreur && <Alerte>{erreur}</Alerte>}
      {decider && ouverte && <p className="text-[13px] text-zinc-500">Pour ouvrir un nouveau recensement, clôturez d’abord « {ouverte.nom} ».</p>}
      {r.erreur ? (
        <Alerte>{r.erreur}</Alerte>
      ) : !r.donnees ? (
        <Chargement />
      ) : !r.donnees.lignes.length ? (
        <Vide>Aucun recensement pour l’instant. {decider ? "« Ouvrir un recensement » : son nom, l’année, l’année scolaire, le début (la fin est facultative)." : ""}</Vide>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {r.donnees.lignes.map((c) => (
            <Carte
              key={c.id}
              titre={c.nom}
              actions={
                <div className="flex items-center gap-2">
                  {c.clotureLe ? <Badge ton="gris">Clôturé le {jourFr(c.clotureLe)}</Badge> : <Badge ton="vert">Ouvert</Badge>}
                </div>
              }
            >
              <div className="space-y-3 text-[13px]">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <dt className="text-zinc-500">Année</dt>
                  <dd className="font-medium">{c.annee}</dd>
                  <dt className="text-zinc-500">Année scolaire</dt>
                  <dd className="font-medium">{c.anneeScolaire ?? "—"}</dd>
                  <dt className="text-zinc-500">Dates</dt>
                  <dd className="font-medium">
                    du {jourFr(c.debut)}
                    {c.fin ? ` au ${jourFr(c.fin)}` : " (fin non fixée)"}
                  </dd>
                </dl>
                {c.observation && <p className="text-zinc-600">{c.observation}</p>}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    [c.ajoutes, "agent(s) ajouté(s)"],
                    [c.modifications, "fiche(s) modifiée(s)"],
                    [c.aControler, "modification(s) encore à contrôler"],
                    [c.signalements, "constat(s) du terrain"],
                    [c.recenseurs, "recenseur(s)"],
                  ].map(([n, t]) => (
                    <span key={t as string} className="rounded-full bg-zinc-100 px-2.5 py-1 text-[12px] text-zinc-700">
                      <strong className="tabular-nums">{nf.format(n as number)}</strong> {t}
                    </span>
                  ))}
                </div>
                {decider && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Bouton onClick={() => setEdition(c)}>
                      <Pencil /> Corriger
                    </Bouton>
                    <Bouton variante={c.clotureLe ? "secondaire" : "danger"} disabled={!!c.clotureLe && !!ouverte} title={c.clotureLe && ouverte ? `Clôturez d’abord « ${ouverte.nom} »` : undefined} onClick={() => void basculer(c)}>
                      {c.clotureLe ? (
                        <>
                          <LockOpen /> Rouvrir
                        </>
                      ) : (
                        <>
                          <Lock /> Clôturer
                        </>
                      )}
                    </Bouton>
                  </div>
                )}
              </div>
            </Carte>
          ))}
        </div>
      )}
      {edition && (
        <Edition
          campagne={edition === "nouveau" ? null : edition}
          fermer={() => setEdition(null)}
          apres={(t) => {
            setEdition(null);
            setMessage(t);
            r.recharger();
          }}
        />
      )}
      {confirmation}
    </div>
  );
}

/** L'année scolaire qui commence l'année d'une date (rentrée en octobre : avant, l'année d'avant). */
function anneeScolaireDe(jour: string) {
  const [a, m] = jour.split("-").map(Number);
  const debut = m >= 9 ? a : a - 1;
  return `${debut}-${debut + 1}`;
}

function Edition({ campagne, fermer, apres }: { campagne: Campagne | null; fermer: () => void; apres: (message: string) => void }) {
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const [nom, setNom] = useState(campagne?.nom ?? "");
  const [annee, setAnnee] = useState(String(campagne?.annee ?? new Date().getFullYear()));
  const [anneeScolaire, setAnneeScolaire] = useState(campagne ? (campagne.anneeScolaire ?? "") : anneeScolaireDe(aujourdhui));
  const [debut, setDebut] = useState(campagne?.debut?.slice(0, 10) ?? aujourdhui);
  const [fin, setFin] = useState(campagne?.fin?.slice(0, 10) ?? "");
  const [observation, setObservation] = useState(campagne?.observation ?? "");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const enregistrer = async () => {
    setErreur(null);
    setEnvoi(true);
    const corps = { nom, annee: Number(annee), anneeScolaire: anneeScolaire || null, debut, fin: fin || null, observation: observation || null };
    try {
      if (campagne) {
        await api.put(`/recensement/campagnes/${campagne.id}`, corps);
        apres(`« ${nom.trim()} » corrigé.`);
      } else {
        await api.post("/recensement/campagnes", corps);
        apres(`Recensement « ${nom.trim()} » ouvert : ce qui se fait au recensement est maintenant rangé sous lui.`);
      }
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Modale titre={campagne ? `Corriger « ${campagne.nom} »` : "Ouvrir un recensement"} ouverte fermer={fermer} large>
      <div className="space-y-4">
        {erreur && <Alerte>{erreur}</Alerte>}
        <Champ libelle="Nom du recensement *" aide="Comme on le dira dans les rapports : « Recensement général du personnel 2026 », « Recensement des enseignants du Pool »…">
          <Saisie value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Recensement général du personnel 2026" />
        </Champ>
        <div className="grid gap-3 sm:grid-cols-2">
          <Champ libelle="Année *">
            <Saisie type="number" min={2000} max={2100} value={annee} onChange={(e) => setAnnee(e.target.value)} />
          </Champ>
          <Champ libelle="Année scolaire" aide="Sous la forme 2026-2027.">
            <Saisie value={anneeScolaire} onChange={(e) => setAnneeScolaire(e.target.value)} placeholder="2026-2027" />
          </Champ>
          <Champ libelle="Date de début *">
            <Saisie type="date" value={debut} onChange={(e) => setDebut(e.target.value)} />
          </Champ>
          <Champ libelle="Date de fin" aide="Facultative : on peut la fixer plus tard.">
            <Saisie type="date" value={fin} onChange={(e) => setFin(e.target.value)} />
          </Champ>
        </div>
        <Champ libelle="Observation" aide="Facultative : le but, les départements concernés, la note qui l’a lancé…">
          <Zone rows={3} value={observation} onChange={(e) => setObservation(e.target.value)} />
        </Champ>
        <div className="flex justify-end gap-2">
          <Bouton onClick={fermer}>Annuler</Bouton>
          <Bouton variante="principal" chargement={envoi} disabled={envoi || nom.trim().length < 3 || !debut || !annee} onClick={() => void enregistrer()}>
            {campagne ? "Enregistrer" : "Ouvrir ce recensement"}
          </Bouton>
        </div>
      </div>
    </Modale>
  );
}
