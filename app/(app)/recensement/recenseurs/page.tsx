"use client";

import { Ban, KeyRound, LockOpen, MapPinned, Pencil, Phone, Printer, RotateCcw, Trash2, UserPlus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { BandeauRecensementOuvert } from "@/components/recensement/recensement-ouvert";
import { useSession } from "@/components/session";
import { Alerte, Annonce, Badge, Bouton, Carte, Champ, Chargement, EnTete, Modale, Saisie, Tableau, Vide, Zone, cx, useConfirmation } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { accesDonne } from "@/lib/espaces";
import { peut } from "@/lib/libelles";

/*
 * Recenseurs de la mission de terrain (DG, 22/11/2026). On les planifie à l'avance : un compte par
 * personne (identifiant RG-001-BZ, mot de passe simple), les départements où il est envoyé et les
 * dates. Il ne voit que le formulaire du terrain. Un recenseur mis dans plusieurs départements est
 * permis, mais signalé en rouge. Appareil perdu : « Bloquer » ; données à vider : « Effacer les données » (le compte continue).
 */

interface DepartementMission {
  id: number;
  nom: string;
  initiales: string;
}

interface Recenseur {
  id: string;
  code: string;
  nom: string;
  actif: boolean;
  departements: number[];
  departementsNoms: string[];
  plusieursDepartements: boolean;
  telephones: string[];
  debut: string | null;
  fin: string | null;
  effacerLe: string | null;
  effaceLe: string | null;
  bloqueLe: string | null;
  bloquePar: string | null;
  derniereConnexion: string | null;
  envois: number;
  lignesEnvoyees: number;
  /** Le recensement pour lequel il a été créé. */
  campagne: string | null;
}

interface Liste {
  departements: DepartementMission[];
  joursApresMission: number;
  recenseurs: Recenseur[];
}

interface Remis {
  code: string;
  nom: string;
  motDePasse: string;
}

const jour = (j: string | null) => (j ? j.split("-").reverse().join("/") : "—");
const quand = (d: string | null) => (d ? new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).replace(" ", " à ") : "jamais");

/** Effacement demandé et pas encore fait par l'appareil (un effacement accusé ne revient pas). */
const effacementEnAttente = (x: { effacerLe: string | null; effaceLe: string | null }) => !!x.effacerLe && (!x.effaceLe || x.effaceLe < x.effacerLe);

export default function PageRecenseurs() {
  const { profil } = useSession();
  const r = useApi<Liste>("/recensement/recenseurs");
  const [creation, setCreation] = useState(false);
  const [edition, setEdition] = useState<Recenseur | null>(null);
  const [remis, setRemis] = useState<{ titre: string; lignes: Remis[] } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<number | "TOUS">("TOUS");
  const [confirmation, demander] = useConfirmation();
  const decider = peut.controler(profil.role);

  const liste = useMemo(() => (r.donnees?.recenseurs ?? []).filter((x) => filtre === "TOUS" || x.departements.includes(filtre)), [r.donnees, filtre]);
  const plusieurs = (r.donnees?.recenseurs ?? []).filter((x) => x.plusieursDepartements);

  if (!peut.traiter(profil.role) && !accesDonne(profil)) return <Alerte>Accès réservé à la DGRHAS.</Alerte>;

  const agir = async (id: string, f: () => Promise<void>) => {
    setErreur(null);
    setMessage(null);
    setEnCours(id);
    try {
      await f();
      r.recharger();
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnCours(null);
    }
  };

  const nouveauMotDePasse = (x: Recenseur) =>
    agir(x.id, async () => {
      if (!(await demander(`Donner un nouveau mot de passe à ${x.code} (${x.nom}) ? L’ancien ne marchera plus et sa session ouverte se fermera.`, "Oui, nouveau mot de passe"))) return;
      const m = await api.post<{ code: string; motDePasse: string }>(`/recensement/recenseurs/${x.id}/mot-de-passe`, {});
      setRemis({ titre: "Nouveau mot de passe", lignes: [{ code: m.code, nom: x.nom, motDePasse: m.motDePasse }] });
    });

  const effacer = (x: Recenseur) =>
    agir(x.id, async () => {
      if (
        !(await demander(
          x.bloqueLe
            ? `Effacer les données de l’appareil de ${x.code} (${x.nom}) ? Il est bloqué : à sa prochaine connexion, son appareil efface tout ce qu’il garde, sans pouvoir envoyer ce qui attend. Il reste bloqué.`
            : `Effacer les données de l’appareil de ${x.code} (${x.nom}) ? À sa prochaine connexion, l’appareil envoie d’abord ce qui attend (s’il le peut), efface toutes ses données, puis retélécharge la base de sa mission. Son compte continue. Appareil perdu ou volé : bloquez-le aussi.`,
          "Oui, effacer les données",
        ))
      )
        return;
      await api.post(`/recensement/recenseurs/${x.id}/effacer`, {});
      setMessage(`${x.code} : effacement demandé. Il se fera à la prochaine connexion de son appareil, une seule fois.`);
    });

  const bloquer = (x: Recenseur) =>
    agir(x.id, async () => {
      if (!(await demander(`Bloquer ${x.code} (${x.nom}) ? Il ne peut plus se connecter ni envoyer ; les données de sa tablette restent gardées. « Débloquer » le rouvre.`, "Oui, bloquer"))) return;
      await api.post(`/recensement/recenseurs/${x.id}/bloquer`, {});
      setMessage(`${x.code} : bloqué. Ses données restent sur sa tablette.`);
    });

  const debloquer = (x: Recenseur) =>
    agir(x.id, async () => {
      await api.post(`/recensement/recenseurs/${x.id}/debloquer`, {});
      setMessage(`${x.code} : débloqué, il peut se reconnecter avec son mot de passe.${effacementEnAttente(x) ? " L’effacement demandé se fera à sa prochaine connexion." : ""}`);
    });

  const reprendre = (x: Recenseur) =>
    agir(x.id, async () => {
      await api.post(`/recensement/recenseurs/${x.id}/reprendre`, {});
      setMessage(`${x.code} : mission reprise, le compte est rouvert.`);
    });

  return (
    <div className="space-y-5">
      <EnTete
        titre="Agents recenseurs"
        sousTitre="Chaque recenseur a un compte à lui : un identifiant (RG-001-BZ : un numéro et les initiales du département) et un mot de passe à lui remettre. Il ne voit que le formulaire du recensement, pour les départements de sa mission. Les données qu’il garde sur sa tablette sont chiffrées et s’effacent d’elles-mêmes deux jours après la fin de la mission."
        actions={
          <>
            {(profil.role === "DG" || profil.role === "ADMIN") && (
              <Link href="/recensement/recenseurs/suivi">
                <Bouton>
                  <MapPinned /> Suivi sur la carte
                </Bouton>
              </Link>
            )}
            {decider && (
              <Bouton variante="principal" onClick={() => setCreation(true)}>
                <UserPlus /> Créer des recenseurs
              </Bouton>
            )}
          </>
        }
      />
      <BandeauRecensementOuvert action="Les recenseurs se créent pour un recensement : ouvrez-le d’abord." />
      <Annonce fermer={() => setMessage(null)}>{message}</Annonce>
      {erreur && <Alerte>{erreur}</Alerte>}
      {plusieurs.length > 0 && (
        <Alerte>
          <strong>{plusieurs.length} recenseur(s) dans plusieurs départements</strong> : {plusieurs.map((x) => `${x.code} (${x.departementsNoms.join(", ")})`).join(" ; ")}. C’est permis, mais vérifiez que c’est voulu.
        </Alerte>
      )}
      <Carte
        titre={`Recenseurs${r.donnees ? ` (${liste.length})` : ""}`}
        actions={
          r.donnees && (
            <select className="rounded-xl bg-zinc-50 px-3 py-1.5 text-[13px] ring-1 ring-zinc-200" value={filtre} onChange={(e) => setFiltre(e.target.value === "TOUS" ? "TOUS" : Number(e.target.value))} aria-label="Département">
              <option value="TOUS">Tous les départements</option>
              {r.donnees.departements.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nom}
                </option>
              ))}
            </select>
          )
        }
      >
        {r.erreur ? (
          <Alerte>{r.erreur}</Alerte>
        ) : !r.donnees ? (
          <Chargement />
        ) : !liste.length ? (
          <Vide>Aucun recenseur{filtre !== "TOUS" ? " pour ce département" : ""}. {decider ? "« Créer des recenseurs » : un nom par ligne, puis leurs départements et leurs dates." : ""}</Vide>
        ) : (
          <Tableau>
            <thead>
              <tr>
                <th>Identifiant</th>
                <th>Nom</th>
                <th>Départements</th>
                <th>Mission</th>
                <th>Dernière connexion</th>
                <th>Envois</th>
                <th>État</th>
                {decider && <th />}
              </tr>
            </thead>
            <tbody>
              {liste.map((x) => (
                <tr key={x.id} className={cx(enCours === x.id && "opacity-50")}>
                  <td className="font-mono font-semibold whitespace-nowrap">{x.code}</td>
                  <td>
                    {x.nom}
                    {x.telephones.map((t) => (
                      <a key={t} href={`tel:${t.replace(/\s/g, "")}`} className="mr-2 inline-flex items-center gap-1 text-[11px] text-marque-700 hover:underline" title="Appeler">
                        <Phone className="size-3" /> {t}
                      </a>
                    ))}
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {x.departementsNoms.map((n) => (
                        <Badge key={n} ton={x.plusieursDepartements ? "rouge" : "gris"} titre={x.plusieursDepartements ? "Ce recenseur est dans plusieurs départements" : undefined}>
                          {n}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="whitespace-nowrap">
                    {jour(x.debut)} → {jour(x.fin)}
                    {x.campagne && <div className="max-w-56 truncate text-[11px] text-zinc-500" title={x.campagne}>{x.campagne}</div>}
                  </td>
                  <td className="whitespace-nowrap">{quand(x.derniereConnexion)}</td>
                  <td className="whitespace-nowrap tabular-nums">{x.envois ? `${x.envois} envoi(s), ${x.lignesEnvoyees} ligne(s)` : "—"}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {x.bloqueLe ? (
                        <Badge ton="rouge" titre={`Bloqué par ${x.bloquePar ?? "?"}`}>Bloqué le {quand(x.bloqueLe)}</Badge>
                      ) : !x.actif ? (
                        <Badge ton="gris">Compte fermé</Badge>
                      ) : x.fin && new Date().toISOString().slice(0, 10) > x.fin ? (
                        <Badge ton="jaune">Mission terminée</Badge>
                      ) : (
                        <Badge ton="vert">En mission</Badge>
                      )}
                      {effacementEnAttente(x) ? (
                        <Badge ton="rouge" titre="L’appareil s’effacera à sa prochaine connexion">Effacement en attente</Badge>
                      ) : x.effaceLe ? (
                        <Badge ton="gris">Appareil effacé le {quand(x.effaceLe)}</Badge>
                      ) : null}
                    </div>
                  </td>
                  {decider && (
                    <td>
                      <div className="flex flex-wrap justify-end gap-1">
                        <Bouton variante="discret" disabled={!!enCours} onClick={() => setEdition(x)} title="Nom, départements, dates, téléphone">
                          <Pencil />
                        </Bouton>
                        <Bouton variante="discret" disabled={!!enCours} onClick={() => void nouveauMotDePasse(x)} title="Nouveau mot de passe (oublié, ou remis à quelqu’un d’autre)">
                          <KeyRound />
                        </Bouton>
                        {x.bloqueLe ? (
                          <Bouton variante="discret" disabled={!!enCours} onClick={() => void debloquer(x)} title="Le compte se rouvre : il se reconnecte avec son mot de passe">
                            <LockOpen /> Débloquer
                          </Bouton>
                        ) : !x.actif ? (
                          <Bouton variante="discret" disabled={!!enCours} onClick={() => void reprendre(x)} title="Reprendre la mission (compte rouvert)">
                            <RotateCcw /> Reprendre
                          </Bouton>
                        ) : (
                          <Bouton variante="discret" disabled={!!enCours} onClick={() => void bloquer(x)} title="Suspendre le compte tout de suite (les données restent sur sa tablette)">
                            <Ban /> Bloquer
                          </Bouton>
                        )}
                        {!effacementEnAttente(x) && (
                          <Bouton variante="danger" disabled={!!enCours} onClick={() => void effacer(x)} title="Vider les données gardées sur son appareil (une seule fois, à sa prochaine connexion) ; la base se retélécharge">
                            <Trash2 /> Effacer les données
                          </Bouton>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </Tableau>
        )}
      </Carte>
      {creation && r.donnees && (
        <Creation
          departements={r.donnees.departements}
          joursApres={r.donnees.joursApresMission}
          fermer={() => setCreation(false)}
          apres={(lignes) => {
            setCreation(false);
            setRemis({ titre: `${lignes.length} recenseur(s) créé(s)`, lignes });
            r.recharger();
          }}
        />
      )}
      {edition && r.donnees && (
        <Edition
          x={edition}
          departements={r.donnees.departements}
          fermer={() => setEdition(null)}
          apres={() => {
            setEdition(null);
            setMessage(`${edition.code} : modifié.`);
            r.recharger();
          }}
        />
      )}
      {remis && <MotsDePasse titre={remis.titre} lignes={remis.lignes} fermer={() => setRemis(null)} />}
      {confirmation}
    </div>
  );
}

/** Choisir un ou plusieurs départements (plusieurs : permis, mais en rouge). */
function ChoixDepartements({ departements, choisis, changer }: { departements: DepartementMission[]; choisis: number[]; changer: (ids: number[]) => void }) {
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {departements.map((d) => {
          const oui = choisis.includes(d.id);
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => changer(oui ? choisis.filter((x) => x !== d.id) : [...choisis, d.id])}
              className={cx(
                "cursor-pointer rounded-full px-3 py-1 text-[12px] ring-1 transition-colors",
                oui ? (choisis.length > 1 ? "bg-rouge-100 font-semibold text-rouge-700 ring-rouge-300" : "bg-marque-50 font-semibold text-marque-700 ring-marque-300") : "bg-white text-zinc-600 ring-zinc-200 hover:bg-zinc-50",
              )}
            >
              {d.nom} <span className="text-zinc-400">({d.initiales})</span>
            </button>
          );
        })}
      </div>
      {choisis.length > 1 && <p className="mt-1.5 text-[12px] font-medium text-rouge-700">Plusieurs départements : c’est permis, mais le recenseur sera signalé en rouge dans la liste.</p>}
    </div>
  );
}

function Creation({ departements, joursApres, fermer, apres }: { departements: DepartementMission[]; joursApres: number; fermer: () => void; apres: (l: Remis[]) => void }) {
  const [noms, setNoms] = useState("");
  const [deps, setDeps] = useState<number[]>([]);
  const [debut, setDebut] = useState("");
  const [fin, setFin] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const lignes = noms
    .split(/\r?\n/)
    .map((n) => n.trim())
    .filter((n) => n.length >= 2);
  const premier = departements.find((d) => d.id === deps[0]);

  const creer = async () => {
    setErreur(null);
    setEnvoi(true);
    try {
      const x = await api.post<{ crees: Remis[] }>("/recensement/recenseurs", { noms: lignes, departements: deps, debut: debut || null, fin: fin || null });
      apres(x.crees);
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Modale titre="Créer des recenseurs" ouverte fermer={fermer} large>
      <div className="space-y-4">
        {erreur && <Alerte>{erreur}</Alerte>}
        <Champ libelle="Noms des recenseurs *" aide="Un nom par ligne. Chacun aura son identifiant et son mot de passe.">
          <Zone rows={6} value={noms} onChange={(e) => setNoms(e.target.value)} placeholder={"MBEMBA Jean\nNGOMA Alice"} />
        </Champ>
        <Champ libelle="Départements de la mission *" aide="Les initiales du premier département choisi terminent l’identifiant.">
          <ChoixDepartements departements={departements} choisis={deps} changer={setDeps} />
        </Champ>
        <div className="grid gap-3 sm:grid-cols-2">
          <Champ libelle="Début de la mission">
            <Saisie type="date" value={debut} onChange={(e) => setDebut(e.target.value)} />
          </Champ>
          <Champ libelle="Fin de la mission" aide={`Le compte se ferme et la tablette efface ses données ${joursApres} jours après.`}>
            <Saisie type="date" value={fin} onChange={(e) => setFin(e.target.value)} />
          </Champ>
        </div>
        {lignes.length > 0 && premier && (
          <p className="text-[13px] text-zinc-600">
            {lignes.length} compte(s) seront créés, avec des identifiants de la forme <strong className="font-mono">RG-0xx-{premier.initiales}</strong> (les numéros suivent ceux déjà donnés).
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Bouton onClick={fermer}>Annuler</Bouton>
          <Bouton variante="principal" chargement={envoi} disabled={envoi || !lignes.length || !deps.length} onClick={() => void creer()}>
            <UserPlus /> Créer {lignes.length || ""} recenseur(s)
          </Bouton>
        </div>
      </div>
    </Modale>
  );
}

function Edition({ x, departements, fermer, apres }: { x: Recenseur; departements: DepartementMission[]; fermer: () => void; apres: () => void }) {
  const [f, setF] = useState({ nom: x.nom, code: x.code, departements: x.departements, debut: x.debut ?? "", fin: x.fin ?? "", telephones: x.telephones.join("\n") });
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const enregistrer = async () => {
    setErreur(null);
    setEnvoi(true);
    try {
      await api.put(`/recensement/recenseurs/${x.id}`, { ...f, debut: f.debut || null, fin: f.fin || null, telephones: f.telephones.split(/[\n,;]+/).map((t) => t.trim()).filter(Boolean) });
      apres();
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  };
  return (
    <Modale titre={`Modifier ${x.code}`} ouverte fermer={fermer} large>
      <div className="space-y-4">
        {erreur && <Alerte>{erreur}</Alerte>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Champ libelle="Nom">
            <Saisie value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} />
          </Champ>
          <Champ libelle="Identifiant" aide="RG, un numéro, les initiales du département.">
            <Saisie value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} className="font-mono" />
          </Champ>
        </div>
        <Champ libelle="Départements de la mission">
          <ChoixDepartements departements={departements} choisis={f.departements} changer={(d) => setF({ ...f, departements: d })} />
        </Champ>
        <div className="grid gap-3 sm:grid-cols-2">
          <Champ libelle="Début">
            <Saisie type="date" value={f.debut} onChange={(e) => setF({ ...f, debut: e.target.value })} />
          </Champ>
          <Champ libelle="Fin">
            <Saisie type="date" value={f.fin} onChange={(e) => setF({ ...f, fin: e.target.value })} />
          </Champ>
        </div>
        <Champ libelle="Téléphones" aide="Un numéro par ligne (5 au plus), pour le joindre pendant la mission.">
          <Zone rows={3} value={f.telephones} onChange={(e) => setF({ ...f, telephones: e.target.value })} placeholder={"06 123 45 67\n05 765 43 21"} />
        </Champ>
        <div className="flex justify-end gap-2">
          <Bouton onClick={fermer}>Annuler</Bouton>
          <Bouton variante="principal" chargement={envoi} disabled={envoi || !f.departements.length} onClick={() => void enregistrer()}>
            Enregistrer
          </Bouton>
        </div>
      </div>
    </Modale>
  );
}

/** Les mots de passe ne se voient qu'ici : à imprimer ou à noter, puis à remettre à chacun. */
function MotsDePasse({ titre, lignes, fermer }: { titre: string; lignes: Remis[]; fermer: () => void }) {
  const imprimer = () => {
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) return;
    const corps = lignes
      .map((l) => `<tr><td style="font-family:monospace;font-weight:bold">${l.code}</td><td>${l.nom.replace(/</g, "&lt;")}</td><td style="font-family:monospace;font-size:16px">${l.motDePasse}</td></tr>`)
      .join("");
    w.document.write(
      `<!doctype html><meta charset="utf-8"><title>Recenseurs</title><style>body{font-family:sans-serif;padding:24px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:8px;text-align:left}</style><h2>Comptes des recenseurs — SIGRHAS-MEPPSA</h2><p>À remettre à chacun. Connexion : identifiant + mot de passe, sur l’adresse du système.</p><table><tr><th>Identifiant</th><th>Nom</th><th>Mot de passe</th></tr>${corps}</table><p style="margin-top:16px;font-size:12px">Édité le ${new Date().toLocaleString("fr-FR")}</p>`,
    );
    w.document.close();
    w.focus();
    w.print();
  };
  return (
    <Modale titre={titre} ouverte fermer={fermer} large>
      <div className="space-y-4">
        <Alerte ton="jaune">Ces mots de passe ne s’affichent qu’une fois. Imprimez-les ou notez-les maintenant, puis remettez à chacun le sien. Un mot de passe perdu se refait (bouton clé).</Alerte>
        <Tableau>
          <thead>
            <tr>
              <th>Identifiant</th>
              <th>Nom</th>
              <th>Mot de passe</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((l) => (
              <tr key={l.code}>
                <td className="font-mono font-semibold">{l.code}</td>
                <td>{l.nom}</td>
                <td className="font-mono text-[15px]">{l.motDePasse}</td>
              </tr>
            ))}
          </tbody>
        </Tableau>
        <div className="flex justify-end gap-2">
          <Bouton onClick={imprimer}>
            <Printer /> Imprimer
          </Bouton>
          <Bouton variante="principal" onClick={fermer}>
            C’est noté
          </Bouton>
        </div>
      </div>
    </Modale>
  );
}
