"use client";

import { CheckCircle2, FileCheck2, Inbox, Plus, Search, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ImportRetourFP } from "@/components/import-retour-fp";
import { useSession } from "@/components/session";
import { Alerte, Annonce, Badge, Bouton, BoutonIcone, Carte, Champ, Chargement, EnTete, Liste, Modale, Pastille, Saisie, Segments, Tableau, Vide } from "@/components/ui";
import { api, qs, useApi } from "@/lib/api";
import { dateCourte, dateLongue, peut } from "@/lib/libelles";
import { libelleLot } from "@/lib/libelles";
import type { Agent } from "@/lib/types";

type Type = "ARRETE" | "DECRET";
const NOM: Record<Type, string> = { ARRETE: "Arrêté", DECRET: "Décret" };

/** Paquet reçu (date de réception) et ses lots (quota + type). */
interface Paquet {
  id: number;
  numero: number;
  dateReception: string | null;
  libelle: string;
  textes: number;
  lots: { id: number; numero: number; libelle: string; n: number }[];
}

interface TexteLot {
  typeTexte: Type | null;
  numeroTexte: string | null;
  /** Lot où le texte est rangé (« Arrêtés quota 2024 — lot 3 »). */
  lot: string;
  lotNumero: number;
  dateReception: string | null;
  n: number;
  dansLeSysteme: boolean;
  pointePar: string | null;
  personnes: { id: string; nomComplet: string; annulable: boolean }[];
}

const aujourdhui = () => new Date().toISOString().slice(0, 10);

export default function Reception() {
  const { profil } = useSession();
  const paquets = useApi<Paquet[]>("/reception/paquets");
  const [dateReception, setDateReception] = useState(aujourdhui);
  const [type, setType] = useState<Type>("ARRETE");
  const [numero, setNumero] = useState("");
  const [signatureSaisie, setSignature] = useState<string | null>(null);
  const [selection, setSelection] = useState<Agent[]>([]);
  const [recherche, setRecherche] = useState("");
  const [resultats, setResultats] = useState<Agent[] | null>(null);
  const [existant, setExistant] = useState<{ id: string; nomComplet: string; lot: string | null }[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [annulation, setAnnulation] = useState<{ id: string; nomComplet: string; texte: string } | null>(null);
  const [statutTexte, setStatutTexte] = useState<"AGE" | "FONCTIONNAIRE" | "CONTRACTUEL">("AGE");
  const [ajoutAutres, setAjoutAutres] = useState(false);
  const champNumero = useRef<HTMLInputElement>(null);
  const champRecherche = useRef<HTMLInputElement>(null);

  // Le paquet = la date de réception : déjà commencé, ou nouveau
  const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(dateReception);
  const paquet = paquets.donnees?.find((p) => p.dateReception === dateReception);
  const textes = useApi<TexteLot[]>(dateOk ? `/reception/paquet?date=${dateReception}` : null);
  const signature = signatureSaisie ?? "";

  // Recherche des personnes (au moins 3 lettres)
  useEffect(() => {
    if (recherche.trim().length < 3) return;
    const t = setTimeout(() => {
      api
        .get<{ items: Agent[] }>(`/agents${qs({ recherche: recherche.trim(), taille: 8 })}`)
        .then((r) => setResultats(r.items))
        .catch(() => setResultats([]));
    }, 300);
    return () => clearTimeout(t);
  }, [recherche]);

  // Ce n° de texte est-il déjà enregistré ?
  useEffect(() => {
    const t = setTimeout(() => {
      if (!numero.trim()) return setExistant([]);
      api
        .get<typeof existant>(`/reception/texte${qs({ type, numero: numero.trim() })}`)
        .then(setExistant)
        .catch(() => setExistant([]));
    }, 350);
    return () => clearTimeout(t);
  }, [numero, type]);

  if (!peut.traiter(profil.role)) return <Alerte>Accès réservé aux agents de la DGRHAS.</Alerte>;

  const liste = recherche.trim().length >= 3 ? resultats : null;
  const disponible = (a: Agent) => !a.lotPublication && !(a.origineFiche === "SAISIE" && a.feuille === "MEPPSA" && !a.transmissionNumero);

  function ajouter(a: Agent) {
    if (!disponible(a) || selection.some((s) => s.id === a.id)) return;
    setSelection((s) => [...s, a]);
    setRecherche("");
    setResultats(null);
    champRecherche.current?.focus();
  }

  async function enregistrer() {
    setErreur(null);
    setSucces(null);
    setEnvoi(true);
    try {
      const r = await api.post<{ paquet: string | null; lots: { libelle: string; n: number }[]; personnes: number }>("/reception", {
        dateReception,
        typeTexte: type,
        numeroTexte: numero,
        dateSignature: signature || null,
        statutTexte,
        agentIds: selection.map((a) => a.id),
      });
      setSucces(
        `${NOM[type]} n° ${numero.trim()} enregistré : ${r.personnes} personne(s) pointée(s), prête(s) pour l’affectation. Rangé dans : ${r.lots
          .map((l) => `${l.libelle}${r.lots.length > 1 ? ` (${l.n})` : ""}`)
          .join(", ")}.`,
      );
      setNumero("");
      setSelection([]);
      setStatutTexte("AGE");
      setSignature(signature || null);
      paquets.recharger();
      textes.recharger();
      champNumero.current?.focus();
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  }

  async function annuler(id: string) {
    try {
      await api.post(`/reception/annuler/${id}`);
      setAnnulation(null);
      setSucces("La personne a été retirée du texte : elle est de nouveau « en attente du texte ».");
      textes.recharger();
      paquets.recharger();
    } catch (e) {
      setAnnulation(null);
      setErreur((e as Error).message);
    }
  }

  const pret = dateOk && !!numero.trim() && selection.length > 0;

  return (
    <div className="space-y-6">
      <EnTete
        titre="Réception des textes de la FP"
        sousTitre="Quand un paquet d’arrêtés ou de décrets arrive de la Fonction Publique, enregistrez chaque texte ici. Le système pointe les personnes, les range dans le bon lot et les prépare pour l’affectation."
      />

      {/* ------------------------- 1. Le paquet ------------------------- */}
      <Carte titre={<Titre numero={1} texte="Le paquet reçu" />}>
        <div className="grid gap-5 md:grid-cols-[minmax(0,260px)_1fr]">
          <Champ
            libelle="Date de réception du paquet *"
            aide="Le jour où le paquet est arrivé à la DGRHAS"
            bulle={
              <>
                Un <strong>paquet</strong> = un envoi de la FP. Il peut contenir 45, 57 ou 104 textes, de plusieurs quotas (2024, 2025…) et de plusieurs types.
                Vous n’avez <strong>rien d’autre à choisir</strong> : le système range chaque personne dans le lot de <strong>son quota</strong> et de{" "}
                <strong>son type de texte</strong> (Arrêtés, Décrets PM pour une licence, Décrets PR pour un master), et crée le lot s’il n’existe pas encore.
              </>
            }
          >
            <Saisie
              type="date"
              value={dateReception}
              onChange={(e) => {
                setDateReception(e.target.value);
                setSucces(null);
                setErreur(null);
              }}
            />
          </Champ>
          <div className="rounded-2xl bg-zinc-50 px-4 py-3 text-[13px] text-zinc-600">
            {!dateOk ? (
              "Indiquez la date de réception."
            ) : paquet ? (
              <>
                <div className="font-semibold text-encre">
                  {paquet.libelle} : déjà {paquet.textes} texte(s) enregistré(s). Les nouveaux textes s’y ajoutent.
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {paquet.lots.map((l) => (
                    <Badge key={l.id}>
                      {l.libelle} · {l.n}
                    </Badge>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="font-semibold text-encre">Nouveau paquet du {dateCourte(dateReception)}</div>
                <div className="mt-0.5 text-[12px]">Il sera créé au premier texte enregistré, avec ses lots.</div>
              </>
            )}
            {!!paquets.donnees?.length && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[12px] text-zinc-500">
                Reprendre un paquet :
                {paquets.donnees.slice(0, 5).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => p.dateReception && setDateReception(p.dateReception)}
                    className={`rounded-full px-2.5 py-0.5 ring-1 transition ${p.dateReception === dateReception ? "bg-nuit text-white ring-nuit" : "ring-zinc-200 hover:bg-white"}`}
                  >
                    {dateCourte(p.dateReception)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </Carte>

      <ImportRetourFP
        actif={dateOk}
        dateReception={dateReception}
        apres={() => {
          paquets.recharger();
          textes.recharger();
        }}
      />

      {/* ------------------------- 2. Un texte -------------------------- */}
      <Carte titre={<Titre numero={2} texte="Un texte du paquet" />} className={dateOk ? "" : "pointer-events-none opacity-50"}>
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-[auto_1fr_1fr] md:items-end">
            <Champ libelle="Type de texte">
              <Segments
                valeur={type}
                changer={(t) => {
                  setType(t);
                  setSignature(null);
                }}
                options={[
                  { valeur: "ARRETE", libelle: "Arrêté" },
                  { valeur: "DECRET", libelle: "Décret" },
                ]}
              />
            </Champ>
            <Champ libelle="N° du texte *" aide={type === "DECRET" ? "Ex. 2025-2472" : "Ex. 6758"}>
              <Saisie ref={champNumero} className="text-[15px]! font-semibold" value={numero} onChange={(e) => setNumero(e.target.value)} placeholder={type === "DECRET" ? "2025-…" : "N°"} />
            </Champ>
            <Champ
              libelle="Date de signature (écrite sur le texte)"
              bulle={
                <>
                  Elle n’est <strong>pas obligatoire pour enregistrer</strong> le texte. Mais sans elle, la personne <strong>ne peut pas entrer dans une note</strong>{" "}
                  d’affectation, car la note cite « n° … du (date) ». La première date saisie vaut pour tout le lot ; laissée vide, c’est celle du lot qui
                  compte. Vous pouvez la compléter plus tard dans « Lots de textes ».
                </>
              }
              aide={signature ? `La note citera : « ${numero.trim() || "N°"} du ${dateLongue(signature)} »` : "Elle sera imprimée dans la note de service"}
            >
              <Saisie type="date" value={signature} onChange={(e) => setSignature(e.target.value)} />
            </Champ>
          </div>
          <Champ
            libelle="Statut écrit sur le texte"
            aide="Si le texte dit « contractuel » ou « fonctionnaire », il fait foi ; sinon le système le déduit de l’âge et de la catégorie"
            bulle={
              <>
                Calcul automatique : l’âge est compté en <strong>années révolues</strong> (anniversaire passé), de la <strong>date de naissance</strong> à la{" "}
                <strong>date de signature du texte</strong>. C’est pourquoi il faut saisir la date de signature. La personne est <strong>contractuelle</strong> si elle a plus de <strong>30 ans</strong> pour la catégorie II ou III, ou plus de{" "}
                <strong>35 ans</strong> pour la catégorie I (la catégorie vient du diplôme). Sinon, elle est fonctionnaire. Sans date de naissance, le statut reste à
                préciser.
              </>
            }
            className="max-w-md"
          >
            <Liste
              value={statutTexte}
              onChange={(e) => setStatutTexte(e.target.value as typeof statutTexte)}
              options={[
                { valeur: "AGE", libelle: "Non précisé : selon l’âge (automatique)" },
                { valeur: "FONCTIONNAIRE", libelle: "Fonctionnaire" },
                { valeur: "CONTRACTUEL", libelle: "Contractuel" },
              ]}
            />
          </Champ>

          {existant.length > 0 && (
            <Alerte ton="jaune">
              Ce {NOM[type].toLowerCase()} est déjà enregistré pour {existant.length} personne(s)
              {existant[0].lot ? ` (${existant[0].lot})` : ""} : {existant.map((x) => x.nomComplet).join(", ")}. Les personnes ajoutées ici seront rattachées au même
              texte.
            </Alerte>
          )}

          <div>
            <div className="mb-1.5 text-xs font-medium text-zinc-500">Personnes concernées par ce texte *</div>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
              <Saisie
                ref={champRecherche}
                className="w-full pl-9!"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const premier = liste?.find((a) => disponible(a) && !selection.some((s) => s.id === a.id));
                    if (premier) ajouter(premier);
                  }
                }}
                placeholder="Tapez le nom de la personne écrit sur le texte (au moins 3 lettres)"
              />
            </div>
            {liste && (
              <div className="mt-2 overflow-hidden rounded-2xl ring-1 ring-zinc-100">
                {!liste.length && <div className="px-4 py-3 text-[13px] text-zinc-400">Aucune personne trouvée avec ce nom. Vérifiez l’orthographe, ou cherchez avec le prénom seulement. Si elle n’est vraiment pas dans la base, elle relève du quota « Autres » : ajoutez-la ci-dessous.</div>}
                {liste.map((a) => {
                  const choisi = selection.some((s) => s.id === a.id);
                  const libre = disponible(a);
                  return (
                    <div key={a.id} className="flex items-center gap-3 border-b border-zinc-50 px-4 py-2.5 last:border-0 hover:bg-zinc-50">
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium">{a.nomComplet}</div>
                        <div className="text-[11px] text-zinc-400">
                          Né(e) le {dateCourte(a.dateNaissance)} · {a.diplomeBrut ?? "—"} · {a.departement?.nom ?? "département ?"}
                        </div>
                      </div>
                      {a.lotPublication ? (
                        <Badge ton="vert">
                          Déjà reçu : {NOM[a.typeTexte ?? "ARRETE"].toLowerCase()} {a.numeroTexte} · {libelleLot(a.lotPublication)}
                        </Badge>
                      ) : !libre ? (
                        <Badge ton="jaune">Pas encore envoyé à la FP</Badge>
                      ) : choisi ? (
                        <Badge ton="vert">
                          <CheckCircle2 className="size-3" /> Ajoutée
                        </Badge>
                      ) : (
                        <Bouton variante="principal" className="px-3! py-1.5!" onClick={() => ajouter(a)}>
                          <Plus /> Ajouter
                        </Bouton>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              onClick={() => setAjoutAutres(true)}
              className="mt-2 inline-flex items-center gap-1.5 rounded-xl px-2 py-1 text-[12px] font-medium text-marque-700 transition hover:bg-marque-50"
            >
              <UserPlus className="size-3.5" /> La personne du texte n’est pas dans la base ? L’ajouter (quota « Autres »)
            </button>

            {selection.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {selection.map((a, i) => (
                  <li key={a.id} className="flex items-center gap-3 rounded-2xl bg-marque-50 px-4 py-2">
                    <span className="w-5 text-[12px] font-semibold text-marque-700">{i + 1}.</span>
                    <div className="min-w-0 flex-1">
                      <span className="text-[13px] font-medium">{a.nomComplet}</span>
                      <span className="ml-2 text-[11px] text-zinc-500">
                        {dateCourte(a.dateNaissance)} · {a.diplomeBrut ?? "—"}
                      </span>
                    </div>
                    <BoutonIcone libelle="Retirer de ce texte" ton="rouge" onClick={() => setSelection((s) => s.filter((x) => x.id !== a.id))}>
                      <X />
                    </BoutonIcone>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Annonce ton="rouge" fermer={() => setErreur(null)}>
            {erreur}
          </Annonce>
          <Annonce fermer={() => setSucces(null)}>{succes}</Annonce>

          <div className="flex flex-wrap items-center justify-end gap-3">
            {!pret && (
              <span className="text-[12px] text-zinc-400">
                {!numero.trim() ? "Écrivez le n° du texte" : !selection.length ? "Ajoutez la ou les personnes du texte" : ""}
              </span>
            )}
            <Bouton variante="principal" disabled={!pret || envoi} onClick={enregistrer}>
              <FileCheck2 />
              {envoi ? "Enregistrement…" : `Enregistrer ce ${NOM[type].toLowerCase()}${selection.length ? ` (${selection.length} personne${selection.length > 1 ? "s" : ""})` : ""}`}
            </Bouton>
          </div>
        </div>
      </Carte>

      {/* --------------------- Textes déjà enregistrés ------------------ */}
      {dateOk && paquet && (
        <Carte
          titre={`Textes enregistrés dans le ${paquet.libelle.toLowerCase()}`}
          actions={
            <Link href="/lots">
              <Bouton variante="sombre">Voir les lots</Bouton>
            </Link>
          }
        >
          {!textes.donnees ? (
            <Chargement />
          ) : !textes.donnees.length ? (
            <Vide>Aucun texte dans ce paquet pour l’instant.</Vide>
          ) : (
            <Tableau>
              <thead>
                <tr>
                  <th>Texte</th>
                  <th>Rangé dans le lot</th>
                  <th>Personnes</th>
                  <th>Enregistré</th>
                </tr>
              </thead>
              <tbody>
                {textes.donnees.map((t) => (
                  <tr key={`${t.typeTexte}|${t.numeroTexte}|${t.lotNumero}`}>
                    <td className="whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <Pastille ton={t.dansLeSysteme ? "vert" : "gris"} taille="sm">
                          <Inbox />
                        </Pastille>
                        <span className="font-medium">
                          {t.typeTexte ? NOM[t.typeTexte] : "Texte"} n° {t.numeroTexte ?? "?"}
                        </span>
                      </div>
                    </td>
                    <td className="text-[12px]">
                      <Link href={`/affectations?lot=${t.lotNumero}`} className="text-marque-700 hover:underline">
                        {t.lot}
                      </Link>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1.5">
                        {t.personnes.map((p) => (
                          <span key={p.id} className="inline-flex items-center gap-1 rounded-full bg-zinc-100 py-0.5 pr-1 pl-2.5 text-[12px]">
                            {p.nomComplet}
                            {p.annulable ? (
                              <button
                                type="button"
                                title="Retirer cette personne du texte (erreur de saisie)"
                                className="rounded-full p-0.5 text-zinc-400 transition hover:bg-rouge-100 hover:text-rouge-600"
                                onClick={() => setAnnulation({ id: p.id, nomComplet: p.nomComplet, texte: `${t.typeTexte ? NOM[t.typeTexte] : "Texte"} n° ${t.numeroTexte}` })}
                              >
                                <X className="size-3" />
                              </button>
                            ) : (
                              <span className="w-1" />
                            )}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="text-[12px] whitespace-nowrap text-zinc-500">{t.dansLeSysteme ? `Ici, par ${t.pointePar}` : "Fichier Excel"}</td>
                  </tr>
                ))}
              </tbody>
            </Tableau>
          )}
        </Carte>
      )}

      {ajoutAutres && (
        <AjoutQuotaAutres
          nomDepart={recherche}
          fermer={() => setAjoutAutres(false)}
          apres={(a) => {
            setAjoutAutres(false);
            setSelection((s) => [...s, a]);
            setRecherche("");
            setResultats(null);
            setSucces(`${a.nomComplet} a été ajouté(e) à la base (quota « Autres ») et rattaché(e) à ce texte. Enregistrez le texte pour terminer.`);
          }}
        />
      )}

      <Modale titre="Retirer cette personne du texte ?" ouverte={!!annulation} fermer={() => setAnnulation(null)}>
        <p className="text-[13px] leading-relaxed text-zinc-600">
          <strong>{annulation?.nomComplet}</strong> sera retiré(e) du {annulation?.texte.toLowerCase()} et redeviendra « en attente du texte ». À faire seulement en cas
          d’erreur de saisie.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Bouton onClick={() => setAnnulation(null)}>Ne rien faire</Bouton>
          <Bouton variante="danger" onClick={() => annulation && annuler(annulation.id)}>
            Retirer
          </Bouton>
        </div>
      </Modale>
    </div>
  );
}

function Titre({ numero, texte }: { numero: number; texte: string }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="inline-flex size-6 items-center justify-center rounded-full bg-nuit text-[12px] font-semibold text-white">{numero}</span>
      {texte}
    </span>
  );
}

/** Personne citée par un texte de la FP mais absente de la base : quota « Autres ». */
function AjoutQuotaAutres({ nomDepart, fermer, apres }: { nomDepart: string; fermer: () => void; apres: (a: Agent) => void }) {
  const { refs } = useSession();
  const [f, setF] = useState({
    nomComplet: nomDepart,
    dateNaissance: "",
    lieuNaissance: "",
    diplomeCode: "",
    departementId: "",
    lieuServiceBrut: "",
    quota: "",
    origineBrute: "",
    observation: "",
  });
  const [erreur, setErreur] = useState<string | null>(null);
  const diplomes = [...refs.regles].sort((a, b) => a.libelle.localeCompare(b.libelle, "fr"));

  async function ajouter() {
    try {
      const a = await api.post<Agent>("/reception/quota-autres", {
        ...f,
        dateNaissance: f.dateNaissance || null,
        departementId: f.departementId ? Number(f.departementId) : null,
        quota: f.quota ? Number(f.quota) : null,
      });
      apres(a);
    } catch (e) {
      setErreur((e as Error).message);
    }
  }

  return (
    <Modale titre="Ajouter une personne du quota « Autres »" ouverte fermer={fermer}>
      <p className="mb-4 text-[13px] leading-relaxed text-zinc-500">
        Recopiez les informations écrites sur le texte. La personne est ajoutée à la base (liste « Quota Autres ») et rattachée au texte en cours.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {erreur && (
          <div className="col-span-2">
            <Alerte>{erreur}</Alerte>
          </div>
        )}
        <Champ libelle="Nom et prénoms *" className="col-span-2">
          <Saisie autoFocus value={f.nomComplet} onChange={(e) => setF({ ...f, nomComplet: e.target.value })} />
        </Champ>
        <Champ libelle="Date de naissance">
          <Saisie type="date" value={f.dateNaissance} onChange={(e) => setF({ ...f, dateNaissance: e.target.value })} />
        </Champ>
        <Champ libelle="Lieu de naissance">
          <Saisie value={f.lieuNaissance} onChange={(e) => setF({ ...f, lieuNaissance: e.target.value })} />
        </Champ>
        <Champ libelle="Diplôme *">
          <Liste value={f.diplomeCode} onChange={(e) => setF({ ...f, diplomeCode: e.target.value })} vide="— Choisir —" options={diplomes.map((r) => ({ valeur: r.code, libelle: r.libelle }))} />
        </Champ>
        <Champ libelle="Département (si connu)">
          <Liste value={f.departementId} onChange={(e) => setF({ ...f, departementId: e.target.value })} vide="—" options={refs.departements.map((d) => ({ valeur: d.id, libelle: d.nom }))} />
        </Champ>
        <Champ libelle="Lieu de service (si connu)">
          <Saisie value={f.lieuServiceBrut} onChange={(e) => setF({ ...f, lieuServiceBrut: e.target.value })} />
        </Champ>
        <Champ libelle="Quota (année de recrutement, si connue)">
          <Saisie type="number" min={2000} max={2100} placeholder="Ex. 2026" value={f.quota} onChange={(e) => setF({ ...f, quota: e.target.value })} />
        </Champ>
        <Champ libelle="Origine du dossier (si connue)" aide="Information interne, non imprimée">
          <Saisie placeholder="Ex. Cabinet du Ministre" value={f.origineBrute} onChange={(e) => setF({ ...f, origineBrute: e.target.value })} />
        </Champ>
        <Champ libelle="Observation" className="col-span-2">
          <Saisie value={f.observation} onChange={(e) => setF({ ...f, observation: e.target.value })} />
        </Champ>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Bouton onClick={fermer}>Annuler</Bouton>
        <Bouton variante="principal" disabled={!f.nomComplet.trim() || !f.diplomeCode} onClick={ajouter}>
          <UserPlus /> Ajouter et rattacher au texte
        </Bouton>
      </div>
    </Modale>
  );
}
