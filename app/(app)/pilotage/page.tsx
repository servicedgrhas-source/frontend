"use client";

import { AlertTriangle, CheckCircle2, Coins, Shuffle, Undo2, Users, Wallet } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { BilanRepartition } from "@/components/bilan-repartition";
import { PlanificationQuota } from "@/components/planification-quota";
import { useSession } from "@/components/session";
import { Alerte, Annonce, Badge, Bouton, Carte, Champ, Chargement, EnTete, Liste, Modale, Pastille, Progression, Saisie, Segments, Tableau, Vide } from "@/components/ui";
import { api, qs, useApi } from "@/lib/api";
import { accesDonne } from "@/lib/espaces";
import { peut } from "@/lib/libelles";

const nf = new Intl.NumberFormat("fr-FR");
const f = (n: number | null | undefined) => (n === null || n === undefined ? "—" : nf.format(Math.round(n)));
const ROMAINS = ["", "I", "II", "III", "IV", "V"];

interface AlerteP {
  niveau: "rouge" | "jaune";
  perimetre: string;
  texte: string;
}

interface Tableau {
  perimetre: string;
  libelle: string;
  pointIndiciaire: number;
  enveloppe: { montantAnnuel: number; placesCatI: number | null; placesCatII: number | null; placesCatIII: number | null; modifiePar: string | null } | null;
  total: { effectif: number; mensuel: number; annuel: number };
  reste: number | null;
  taux: number | null;
  etapes: { etape: string; libelle: string; effectif: number; annuel: number }[];
  categories: { categorie: string; effectif: number; places: number | null; mensuel: number; annuel: number }[];
  diplomes: { diplome: string; categorie: string | null; echelle: number | null; indice: number | null; effectif: number; contractuels: number; mensuel: number; annuel: number }[];
  sansIndice: number;
  contentieux: number;
  exclus: number;
  alertes: AlerteP[];
}

export default function Pilotage() {
  const { profil } = useSession();
  const [onglet, setOnglet] = useState<"incidences" | "beneficiaires" | "repartition">("incidences");
  if (!peut.parametrer(profil.role) && !accesDonne(profil)) return <Alerte>Module réservé au DGRHAS.</Alerte>;
  return (
    <div className="space-y-6">
      <EnTete
        titre="Pilotage"
        sousTitre="Vue réservée au DGRHAS : incidence financière des recrutements, enveloppe accordée par la Fonction Publique, alertes de dépassement, et répartition du quota « Autres » sans département."
      />
      <Segments
        valeur={onglet}
        changer={setOnglet}
        options={[
          { valeur: "incidences", libelle: "Incidences et enveloppe" },
          { valeur: "beneficiaires", libelle: "Bénéficiaires du quota" },
          { valeur: "repartition", libelle: "Répartition du quota « Autres »" },
        ]}
      />
      {onglet === "incidences" ? <Incidences /> : onglet === "beneficiaires" ? <PlanificationQuota /> : <Repartition />}
    </div>
  );
}

/* ============================ Incidences ============================ */

function Incidences() {
  const perimetres = useApi<string[]>("/pilotage/perimetres");
  const [choix, setChoix] = useState<string | null>(null);
  const perimetre = choix ?? perimetres.donnees?.[0] ?? null;
  const t = useApi<Tableau>(perimetre ? `/pilotage/tableau/${perimetre}` : null);
  const d = t.donnees;

  return (
    <div className="space-y-5">
      {perimetres.donnees && (
        <Segments
          valeur={perimetre}
          changer={setChoix}
          options={perimetres.donnees.map((p) => ({ valeur: p, libelle: p === "AUTRES" ? "Quota « Autres »" : `Quota ${p}` }))}
        />
      )}
      {t.erreur && <Alerte>{t.erreur}</Alerte>}
      {!d ? (
        <Chargement />
      ) : (
        <>
          {d.alertes.map((a, i) => (
            <Alerte key={i} ton={a.niveau}>
              <strong>{a.niveau === "rouge" ? "Dépassement" : "Attention"} :</strong> {a.texte}
            </Alerte>
          ))}
          {!d.enveloppe && <Alerte ton="bleu">Renseignez l’enveloppe accordée par la Fonction Publique pour ce quota : le système pourra alors vous alerter en cas de dépassement.</Alerte>}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Indicateur icone={<Wallet />} titre="Enveloppe annuelle autorisée" valeur={d.enveloppe?.montantAnnuel ? `${f(d.enveloppe.montantAnnuel)} F` : "Non renseignée"} ton="gris" />
            <Indicateur
              icone={<Coins />}
              titre="Incidence annuelle"
              valeur={`${f(d.total.annuel)} F`}
              detail={`${f(d.total.mensuel)} F par mois · point indiciaire ${d.pointIndiciaire}`}
              ton={d.taux !== null && d.taux > 1 ? "rouge" : d.taux !== null && d.taux >= 0.9 ? "jaune" : "vert"}
            />
            <Indicateur
              icone={d.reste !== null && d.reste < 0 ? <AlertTriangle /> : <CheckCircle2 />}
              titre={d.reste !== null && d.reste < 0 ? "Dépassement" : "Reste disponible"}
              valeur={d.reste === null ? "—" : `${f(Math.abs(d.reste))} F`}
              ton={d.reste !== null && d.reste < 0 ? "rouge" : "vert"}
            />
            <Indicateur icone={<Users />} titre="Recrutés comptés" valeur={f(d.total.effectif)} detail={`${d.contentieux} en contentieux et ${d.exclus} retiré(s), non comptés`} ton="bleu" />
          </div>
          {d.taux !== null && (
            <div className="rounded-3xl bg-white p-5 shadow-doux">
              <div className="mb-2 flex justify-between text-[13px]">
                <span className="text-zinc-500">Consommation de l’enveloppe</span>
                <span className="font-semibold tabular-nums">{Math.round(d.taux * 100)} %</span>
              </div>
              <Progression valeur={Math.min(100, d.taux * 100)} ton={d.taux > 1 ? "rouge" : d.taux >= 0.9 ? "jaune" : "vert"} />
            </div>
          )}

          <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
            <Carte titre="Par catégorie : places autorisées et recrutés">
              <Tableau>
                <thead>
                  <tr>
                    <th>Catégorie</th>
                    <th className="text-right">Places autorisées</th>
                    <th className="text-right">Recrutés</th>
                    <th className="text-right">Écart</th>
                    <th className="text-right">Salaire brut / mois</th>
                    <th className="text-right">Incidence annuelle</th>
                  </tr>
                </thead>
                <tbody>
                  {d.categories.map((c) => {
                    const ecart = c.places === null ? null : c.places - c.effectif;
                    return (
                      <tr key={c.categorie}>
                        <td className="font-medium">Catégorie {c.categorie}</td>
                        <td className="text-right tabular-nums">{f(c.places)}</td>
                        <td className="text-right tabular-nums">{f(c.effectif)}</td>
                        <td className="text-right">{ecart === null ? "—" : <Badge ton={ecart < 0 ? "rouge" : "vert"}>{ecart < 0 ? `${-ecart} de trop` : `${ecart} libre(s)`}</Badge>}</td>
                        <td className="text-right tabular-nums">{f(c.mensuel)}</td>
                        <td className="text-right font-medium tabular-nums">{f(c.annuel)}</td>
                      </tr>
                    );
                  })}
                  <tr className="font-semibold">
                    <td>Total</td>
                    <td />
                    <td className="text-right tabular-nums">{f(d.total.effectif)}</td>
                    <td />
                    <td className="text-right tabular-nums">{f(d.total.mensuel)}</td>
                    <td className="text-right tabular-nums">{f(d.total.annuel)}</td>
                  </tr>
                </tbody>
              </Tableau>
            </Carte>
            <FormEnveloppe tableau={d} apres={t.recharger} />
          </div>

          <Carte titre="Incidences par diplôme">
            <Tableau>
              <thead>
                <tr>
                  <th>Diplôme</th>
                  <th>Classification</th>
                  <th className="text-right">Indice</th>
                  <th className="text-right">Salaire brut</th>
                  <th className="text-right">Effectif</th>
                  <th className="text-right">dont contractuels</th>
                  <th className="text-right">Incidence mensuelle</th>
                  <th className="text-right">Incidence annuelle</th>
                </tr>
              </thead>
              <tbody>
                {d.diplomes.map((x) => (
                  <tr key={x.diplome}>
                    <td className="font-medium">{x.diplome}</td>
                    <td className="text-zinc-500">{x.categorie ? `Cat. ${x.categorie}, échelle ${ROMAINS[x.echelle ?? 0] ?? x.echelle}` : "—"}</td>
                    <td className="text-right tabular-nums">{x.indice ?? <Badge ton="rouge">sans indice</Badge>}</td>
                    <td className="text-right tabular-nums">{x.indice ? f(x.indice * d.pointIndiciaire) : "—"}</td>
                    <td className="text-right tabular-nums">{f(x.effectif)}</td>
                    <td className="text-right tabular-nums text-zinc-500">{f(x.contractuels)}</td>
                    <td className="text-right tabular-nums">{f(x.mensuel)}</td>
                    <td className="text-right font-medium tabular-nums">{f(x.annuel)}</td>
                  </tr>
                ))}
              </tbody>
            </Tableau>
            {!d.diplomes.length && <Vide>Aucun recruté dans ce quota.</Vide>}
          </Carte>

          <Carte titre="Où en sont ces recrutés ?">
            <div className="grid gap-3 md:grid-cols-3">
              {d.etapes.map((e) => (
                <div key={e.etape} className="rounded-2xl bg-zinc-50 p-4">
                  <div className="text-[12px] text-zinc-500">{e.libelle}</div>
                  <div className="mt-1 text-xl font-semibold tabular-nums">{f(e.effectif)}</div>
                  <div className="text-[12px] text-zinc-500">{f(e.annuel)} F par an</div>
                </div>
              ))}
            </div>
          </Carte>
        </>
      )}
    </div>
  );
}

function Indicateur({ icone, titre, valeur, detail, ton }: { icone: React.ReactNode; titre: string; valeur: string; detail?: string; ton: "vert" | "jaune" | "rouge" | "bleu" | "gris" }) {
  return (
    <div className="flex items-start gap-3 rounded-3xl bg-white p-5 shadow-doux">
      <Pastille ton={ton}>{icone}</Pastille>
      <div className="min-w-0">
        <div className="text-[12px] text-zinc-500">{titre}</div>
        <div className="truncate text-xl font-semibold tabular-nums">{valeur}</div>
        {detail && <div className="text-[11px] text-zinc-400">{detail}</div>}
      </div>
    </div>
  );
}

function FormEnveloppe({ tableau, apres }: { tableau: Tableau; apres: () => void }) {
  const e = tableau.enveloppe;
  const [v, setV] = useState({
    montant: e?.montantAnnuel ? String(e.montantAnnuel) : "",
    i: e?.placesCatI?.toString() ?? "",
    ii: e?.placesCatII?.toString() ?? "",
    iii: e?.placesCatIII?.toString() ?? "",
  });
  const [msg, setMsg] = useState<{ ton: "vert" | "rouge"; texte: string } | null>(null);
  const chiffres = (s: string) => s.replace(/\D/g, "");
  const n = (s: string) => (s ? Number(s) : null);
  return (
    <Carte titre={`Enveloppe accordée — ${tableau.libelle}`}>
      <div className="space-y-3">
        <Champ libelle="Incidence annuelle autorisée (FCFA)" aide={v.montant ? `${f(Number(v.montant))} FCFA` : "Masse salariale annuelle accordée par la FP"}>
          <Saisie inputMode="numeric" value={v.montant} onChange={(x) => setV({ ...v, montant: chiffres(x.target.value) })} placeholder="Ex. 2000000000" />
        </Champ>
        <div className="grid grid-cols-3 gap-2">
          {(["i", "ii", "iii"] as const).map((k) => (
            <Champ key={k} libelle={`Places cat. ${k.toUpperCase()}`}>
              <Saisie inputMode="numeric" value={v[k]} onChange={(x) => setV({ ...v, [k]: chiffres(x.target.value) })} />
            </Champ>
          ))}
        </div>
        {msg && <Alerte ton={msg.ton}>{msg.texte}</Alerte>}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-zinc-400">{e?.modifiePar ? `Modifiée par ${e.modifiePar}` : ""}</span>
          <Bouton
            variante="principal"
            onClick={async () => {
              try {
                await api.put(`/pilotage/enveloppe/${tableau.perimetre}`, { montantAnnuel: Number(v.montant || 0), placesCatI: n(v.i), placesCatII: n(v.ii), placesCatIII: n(v.iii) });
                setMsg({ ton: "vert", texte: "Enveloppe enregistrée." });
                apres();
              } catch (err) {
                setMsg({ ton: "rouge", texte: (err as Error).message });
              }
            }}
          >
            Enregistrer
          </Bouton>
        </div>
      </div>
    </Carte>
  );
}

/* ============================ Répartition ============================ */

interface EtatRep {
  eligibles: number;
  parType: { type: string; libelle: string; n: number }[];
  quotasPrecedents: Record<string, number> | null;
  historique: { id: string; personnes: number; validePar: string | null; annulee: boolean; creeLe: string }[];
}

interface Proposition {
  eligibles: number;
  places: number;
  restants: number;
  resume: { departementId: number; departement: string; demandes: number; parType: Record<string, number> }[];
  lignes: { agentId: string; nomComplet: string; diplome: string | null; lot: number | null; type: string; departementId: number; departement: string }[];
}

function Repartition() {
  const { refs } = useSession();
  const [texteRecu, setTexteRecu] = useState(true);
  const [lot, setLot] = useState("");
  const etat = useApi<EtatRep>(`/pilotage/repartition${qs({ texteRecu: texteRecu ? 1 : "0", lot })}`);
  const lots = useApi<{ numero: number; libelle?: string }[]>("/lots");
  const [quotas, setQuotas] = useState<Record<string, string>>({});
  const [proposition, setProposition] = useState<Proposition | null>(null);
  const [confirmer, setConfirmer] = useState(false);
  const [voirListe, setVoirListe] = useState(false);
  // Bilan affiché sous la répartition choisie
  const [bilan, setBilan] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ton: "vert" | "rouge"; texte: string } | null>(null);
  const libType = useMemo(() => Object.fromEntries(refs.typesNote.map((t) => [t.code, t.libelle])), [refs.typesNote]);

  const total = Object.values(quotas).reduce((s, v) => s + (Number(v) || 0), 0);
  const dispo = etat.donnees?.eligibles ?? 0;

  // Quotas de la dernière répartition proposés par défaut — seulement s'il reste des personnes à placer
  const precedents = etat.donnees?.quotasPrecedents;
  const [prerempli, setPrerempli] = useState(false);
  useEffect(() => {
    if (!precedents || !dispo) return;
    const t = setTimeout(
      () =>
        setQuotas((q) => {
          if (Object.keys(q).length) return q;
          setPrerempli(true);
          return Object.fromEntries(Object.entries(precedents).map(([k, v]) => [k, String(v)]));
        }),
      0,
    );
    return () => clearTimeout(t);
  }, [precedents, dispo]);

  function equitable() {
    const n = refs.departements.length;
    const base = Math.floor(dispo / n);
    let reste = dispo - base * n;
    setQuotas(Object.fromEntries(refs.departements.map((d) => [String(d.id), String(base + (reste-- > 0 ? 1 : 0))])));
    setProposition(null);
  }

  async function proposer() {
    setMessage(null);
    try {
      setProposition(
        await api.post<Proposition>("/pilotage/repartition/proposer", {
          quotas: Object.fromEntries(Object.entries(quotas).map(([k, v]) => [k, Number(v) || 0])),
          texteRecu,
          lot: lot ? Number(lot) : undefined,
        }),
      );
      setVoirListe(false);
    } catch (e) {
      setMessage({ ton: "rouge", texte: (e as Error).message });
    }
  }

  async function appliquer() {
    if (!proposition) return;
    try {
      const r = await api.post<{ id: string; personnes: number; ignorees: number }>("/pilotage/repartition/appliquer", {
        quotas: Object.fromEntries(Object.entries(quotas).map(([k, v]) => [k, Number(v) || 0])),
        lignes: proposition.lignes.map((l) => ({ agentId: l.agentId, departementId: l.departementId })),
      });
      setConfirmer(false);
      setProposition(null);
      // Les chiffres saisis ont servi : le formulaire repart à zéro
      setQuotas({});
      setPrerempli(false);
      setMessage({ ton: "vert", texte: `Répartition validée : ${r.personnes} personne(s) ont reçu un département. Voici le bilan : qui peut entrer dans une note, et ce qui bloque encore les autres.` });
      setBilan(r.id);
      etat.recharger();
    } catch (e) {
      setConfirmer(false);
      setMessage({ ton: "rouge", texte: (e as Error).message });
    }
  }

  async function annuler(id: string) {
    try {
      const r = await api.post<{ annules: number; gardes: number }>(`/pilotage/repartition/${id}/annuler`);
      setMessage({ ton: "vert", texte: `Répartition annulée : ${r.annules} personne(s) de nouveau sans département${r.gardes ? `, ${r.gardes} gardée(s) car déjà dans une note validée` : ""}.` });
      etat.recharger();
    } catch (e) {
      setMessage({ ton: "rouge", texte: (e as Error).message });
    }
  }

  return (
    <div className="space-y-5">
      <Alerte ton="bleu">
        Les personnes du quota « Autres » sans département n’entrent dans aucune note. Indiquez combien chaque département doit en recevoir : le système tire au sort les personnes et les répartit en mélangeant les cycles de façon équilibrée. Vous vérifiez la proposition, puis vous la validez.
      </Alerte>
      <Annonce ton={message?.ton} fermer={() => setMessage(null)}>{message?.texte}</Annonce>

      <Carte titre="Personnes à répartir">
        <div className="mb-4 flex flex-wrap items-end gap-4">
          <label className="flex items-center gap-2 pb-2 text-[13px]">
            <input type="checkbox" checked={texteRecu} onChange={(e) => { setTexteRecu(e.target.checked); setProposition(null); }} />
            Seulement celles dont le texte de la FP est reçu
          </label>
          <Champ libelle="Lot de réception" className="w-44">
            <Liste value={lot} onChange={(e) => { setLot(e.target.value); setProposition(null); }} vide="Tous les lots" options={(lots.donnees ?? []).map((l) => ({ valeur: l.numero, libelle: l.libelle ?? `Lot ${l.numero}` }))} />
          </Champ>
        </div>
        {!etat.donnees ? (
          <Chargement />
        ) : (
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <span className="text-2xl font-semibold tabular-nums">{dispo}</span>
            <span className="text-zinc-500">personne(s) sans département :</span>
            {etat.donnees.parType.map((t) => (
              <Badge key={t.type}>
                {t.libelle} : {t.n}
              </Badge>
            ))}
          </div>
        )}
      </Carte>

      {etat.donnees && !dispo ? (
        <Carte titre="Combien de personnes par département ?">
          <div className="rounded-2xl bg-marque-50 px-4 py-3 text-[13px] leading-relaxed text-marque-800">
            <strong>Il n’y a personne à répartir.</strong>{" "}
            {texteRecu || lot
              ? "Avec les choix ci-dessus (texte reçu, lot), toutes les personnes du quota « Autres » ont déjà un département. Décochez la case ou choisissez « Tous les lots » pour voir les autres."
              : "Toutes les personnes du quota « Autres » ont déjà reçu un département."}{" "}
            Vos répartitions sont dans « Répartitions déjà validées » ci-dessous : « Voir le bilan » montre qui peut entrer dans une note et ce qui bloque encore
            les autres. Quand de nouveaux textes du quota « Autres » arriveront, les personnes sans département apparaîtront ici.
          </div>
        </Carte>
      ) : (
      <Carte
        titre="Combien de personnes par département ?"
        actions={
          <>
            <Bouton onClick={equitable} disabled={!dispo}>
              Répartir à parts égales
            </Bouton>
            <Bouton onClick={() => { setQuotas({}); setPrerempli(false); setProposition(null); }}>Tout effacer</Bouton>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {refs.departements.map((d) => (
            <Champ key={d.id} libelle={d.nom}>
              <Saisie
                inputMode="numeric"
                value={quotas[String(d.id)] ?? ""}
                onChange={(e) => {
                  setQuotas({ ...quotas, [String(d.id)]: e.target.value.replace(/\D/g, "") });
                  setProposition(null);
                }}
                placeholder="0"
              />
            </Champ>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className={`text-[13px] ${total > dispo ? "text-rouge-600" : "text-zinc-500"}`}>
            {total > dispo
              ? `${total} place(s) demandée(s), mais seulement ${dispo} personne(s) sans département : diminuez les chiffres (ou « Répartir à parts égales »).`
              : `${total} place(s) demandée(s) sur ${dispo} personne(s) sans département${total < dispo && total > 0 ? ` · ${dispo - total} resteront sans département` : ""}`}
            {prerempli && total > 0 && <span className="block text-[12px] text-zinc-500">Chiffres repris de la dernière répartition : ajustez-les si besoin.</span>}
          </span>
          <Bouton variante="principal" disabled={!total || total > dispo} onClick={proposer}>
            <Shuffle /> {proposition ? "Refaire le tirage" : "Proposer une répartition"}
          </Bouton>
        </div>
      </Carte>
      )}

      {proposition && (
        <Carte
          titre={`Proposition : ${proposition.places} personne(s) placée(s)`}
          actions={
            <>
              <Bouton
                variante="discret"
                onClick={() => {
                  setVoirListe(!voirListe);
                  // La liste s'ouvre sous le tableau : on y descend directement
                  if (!voirListe) setTimeout(() => document.getElementById("liste-noms")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
                }}
              >
                {voirListe ? "Masquer les noms" : `Voir les noms (${proposition.lignes.length})`}
              </Bouton>
              <Bouton variante="principal" onClick={() => setConfirmer(true)}>
                <CheckCircle2 /> Valider la répartition
              </Bouton>
            </>
          }
        >
          <Tableau>
            <thead>
              <tr>
                <th>Département</th>
                <th className="text-right">Personnes</th>
                <th>Par note de service</th>
              </tr>
            </thead>
            <tbody>
              {proposition.resume.map((r) => (
                <tr key={r.departementId}>
                  <td className="font-medium">{r.departement}</td>
                  <td className="text-right tabular-nums">{r.demandes}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(r.parType).map(([t, n]) => (
                        <Badge key={t}>
                          {libType[t] ?? "À définir"} : {n}
                        </Badge>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Tableau>
          {voirListe && (
            <div id="liste-noms" className="mt-4 max-h-96 scroll-mt-6 overflow-y-auto">
              <Tableau>
                <thead>
                  <tr>
                    <th>Personne</th>
                    <th>Diplôme</th>
                    <th>Lot</th>
                    <th>Département proposé</th>
                  </tr>
                </thead>
                <tbody>
                  {proposition.lignes.map((l) => (
                    <tr key={l.agentId}>
                      <td>{l.nomComplet}</td>
                      <td>{l.diplome}</td>
                      <td>{l.lot ?? "—"}</td>
                      <td>{l.departement}</td>
                    </tr>
                  ))}
                </tbody>
              </Tableau>
            </div>
          )}
        </Carte>
      )}

      <Carte titre="Répartitions déjà validées">
        {!etat.donnees?.historique.length ? (
          <Vide>Aucune répartition.</Vide>
        ) : (
          <Tableau>
            <thead>
              <tr>
                <th>Date</th>
                <th className="text-right">Personnes</th>
                <th>Validée par</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {etat.donnees.historique.map((h) => (
                <Fragment key={h.id}>
                <tr>
                  <td>{new Date(h.creeLe).toLocaleString("fr-FR")}</td>
                  <td className="text-right tabular-nums">{h.personnes}</td>
                  <td>{h.validePar}</td>
                  <td className="text-right">
                    <span className="inline-flex gap-1">
                      {!h.annulee && (
                        <Bouton variante="discret" onClick={() => setBilan(bilan === h.id ? null : h.id)}>
                          {bilan === h.id ? "Masquer le bilan" : "Voir le bilan"}
                        </Bouton>
                      )}
                      {h.annulee ? (
                        <Badge>Annulée</Badge>
                      ) : (
                        <Bouton variante="discret" onClick={() => annuler(h.id)}>
                          <Undo2 /> Annuler
                        </Bouton>
                      )}
                    </span>
                  </td>
                </tr>
                {bilan === h.id && (
                  <tr>
                    <td colSpan={4} className="bg-white">
                      <BilanRepartition id={h.id} />
                    </td>
                  </tr>
                )}
                </Fragment>
              ))}
            </tbody>
          </Tableau>
        )}
      </Carte>

      <Modale titre="Valider cette répartition ?" ouverte={confirmer} fermer={() => setConfirmer(false)}>
        <p className="text-[13px] leading-relaxed text-zinc-600">
          <strong>{proposition?.places} personne(s)</strong> vont recevoir le département proposé. Elles entreront dans les notes de service de leur lot. La répartition pourra être annulée tant que les notes ne sont pas validées.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Bouton onClick={() => setConfirmer(false)}>Annuler</Bouton>
          <Bouton variante="principal" onClick={appliquer}>
            Valider
          </Bouton>
        </div>
      </Modale>
    </div>
  );
}
