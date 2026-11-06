"use client";

import { ChevronRight, ShieldAlert, UserX, Users } from "lucide-react";
import { useState } from "react";
import { Explication, PaireDoublon, type FicheDoublon } from "../doublons";
import { useSession } from "../session";
import { Aide, Alerte, Badge, Bouton, Chargement, Saisie } from "../ui";
import { api, qs, useApi } from "@/lib/api";
import { peut } from "@/lib/libelles";

interface DejaConnu {
  id: string;
  nom: string;
  naissance: string | null;
  diplome: string;
  etat: string;
  trouves: { source: string; nom: string; naissance: string | null; detail: string }[];
}

const jour = (d: string | null) => (d ? d.split("-").reverse().join("/") : "date ?");

/**
 * Ce que le système ne peut pas trancher seul (06/11/2026) : les doublons probables entre dossiers,
 * et les dossiers qui ressemblent à un recruté, un volontaire déjà payé ou un enrôlé d'avant.
 */
export function ATrancher({ campagneId, apres }: { campagneId: number; apres: (texte: string, ton?: "vert" | "rouge") => void }) {
  const { profil } = useSession();
  const [ouvert, setOuvert] = useState<"doublons" | "connus" | null>(null);
  const [page, setPage] = useState(1);
  const doublons = useApi<{ total: number; taille: number; paires: { a: FicheDoublon; b: FicheDoublon }[] }>(`/doublons/ENROLES?page=${page}&campagne=${campagneId}`);
  const connus = useApi<DejaConnu[]>(`/enrolement/deja-connus${qs({ campagne: campagneId })}`);
  const [coches, setCoches] = useState<Set<string>>(new Set());
  const [motif, setMotif] = useState("");
  const controleur = peut.controler(profil.role);
  const nbDoublons = doublons.donnees?.total ?? 0;
  const liste = connus.donnees ?? [];

  async function trancher(ids: string[], decision: "ECARTER" | "DIFFERENT") {
    try {
      const r = await api.post<{ traites: number }>("/enrolement/deja-connus", { ids, decision, motif });
      apres(decision === "ECARTER" ? `${r.traites} dossier(s) écarté(s) : déjà connus.` : `${r.traites} dossier(s) gardé(s) : ce ne sont pas les mêmes personnes.`);
      setCoches(new Set());
      connus.recharger();
    } catch (e) {
      apres((e as Error).message, "rouge");
    }
  }

  const carte = (cle: "doublons" | "connus", Icone: typeof Users, titre: string, n: number | null, texte: string) => (
    <button
      type="button"
      onClick={() => setOuvert(ouvert === cle ? null : cle)}
      aria-expanded={ouvert === cle}
      className={`flex flex-1 items-start gap-3 rounded-2xl p-4 text-left ring-1 transition ${ouvert === cle ? "bg-or-100/60 ring-or-400/50" : "bg-white ring-zinc-200 hover:ring-zinc-300"}`}
    >
      <span className={`mt-0.5 rounded-xl p-2 ${n ? "bg-or-100 text-or-700" : "bg-zinc-100 text-zinc-400"}`}>
        <Icone className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-[14px] font-semibold text-encre">
          {titre}
          <Badge ton={n ? "jaune" : "gris"}>{n === null ? "…" : n}</Badge>
        </span>
        <span className="mt-0.5 block text-[12px] leading-snug text-zinc-500">{texte}</span>
      </span>
      <ChevronRight className={`mt-1 size-4 text-zinc-400 transition-transform ${ouvert === cle ? "rotate-90" : ""}`} aria-hidden />
    </button>
  );

  return (
    <div className="rounded-3xl bg-white p-5 shadow-doux">
      <div className="mb-3 flex items-center gap-2">
        <ShieldAlert className="size-5 text-or-700" aria-hidden />
        <h2 className="text-[15px] font-semibold">À trancher avant de retenir</h2>
        <Aide>Le système repère ces cas mais ne peut pas décider seul : c’est peut-être la même personne, ou pas. Tranchez ici.</Aide>
      </div>
      <div className="flex flex-col gap-3 md:flex-row">
        {carte("doublons", Users, "Doublons probables", doublons.donnees ? nbDoublons : null, "Deux dossiers qui sont peut-être la même personne : gardez-en un, supprimez l’autre, ou dites que ce sont deux personnes.")}
        {carte("connus", UserX, "Déjà recrutés ou déjà volontaires", connus.donnees ? liste.length : null, "Ressemble à un recruté de la Fonction publique, à un volontaire déjà payé ou à un enrôlé d’une autre année.")}
      </div>

      {ouvert === "doublons" && (
        <div className="mt-4 space-y-4 text-[13px]">
          <Explication />
          {doublons.erreur && <Alerte>{doublons.erreur}</Alerte>}
          {!doublons.donnees ? (
            <Chargement />
          ) : !doublons.donnees.paires.length ? (
            <p className="text-zinc-500">Aucun doublon probable entre les dossiers.</p>
          ) : (
            <>
              {doublons.donnees.paires.map((p) => (
                <PaireDoublon
                  key={`${p.a.id}|${p.b.id}`}
                  base="ENROLES"
                  a={p.a}
                  b={p.b}
                  titres={["Dossier A", "Dossier B"]}
                  apres={(texte, ton = "vert") => {
                    apres(texte, ton);
                    if (ton === "vert") doublons.recharger();
                  }}
                />
              ))}
              {nbDoublons > doublons.donnees.taille && (
                <div className="flex items-center justify-end gap-2">
                  <Bouton disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    Précédents
                  </Bouton>
                  <span className="text-zinc-500">
                    Page {page} sur {Math.ceil(nbDoublons / doublons.donnees.taille)}
                  </span>
                  <Bouton disabled={page * doublons.donnees.taille >= nbDoublons} onClick={() => setPage(page + 1)}>
                    Suivants
                  </Bouton>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {ouvert === "connus" && (
        <div className="mt-4 space-y-3 text-[13px]">
          {connus.erreur && <Alerte>{connus.erreur}</Alerte>}
          {!connus.donnees ? (
            <Chargement texte="Comparaison avec le recrutement, le registre des volontaires et les autres campagnes…" />
          ) : !liste.length ? (
            <p className="text-zinc-500">Aucun dossier ne ressemble à une personne déjà connue.</p>
          ) : (
            <>
              {controleur && (
                <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-zinc-50 px-3 py-2.5">
                  <label className="flex items-center gap-2 font-medium">
                    <input
                      type="checkbox"
                      className="size-4 accent-marque-600"
                      checked={liste.length > 0 && liste.every((d) => coches.has(d.id))}
                      onChange={(e) => setCoches(e.target.checked ? new Set(liste.map((d) => d.id)) : new Set())}
                    />
                    Tout cocher
                  </label>
                  <Saisie className="w-72" placeholder="Motif (facultatif) : déjà recruté en 2024…" value={motif} onChange={(e) => setMotif(e.target.value)} />
                  <Bouton variante="danger" disabled={!coches.size} onClick={() => trancher([...coches], "ECARTER")}>
                    Écarter ({coches.size})
                  </Bouton>
                  <Bouton disabled={!coches.size} onClick={() => trancher([...coches], "DIFFERENT")}>
                    Pas la même personne ({coches.size})
                  </Bouton>
                </div>
              )}
              <ul className="divide-y divide-zinc-100 rounded-2xl ring-1 ring-zinc-200">
                {liste.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-start gap-3 px-3 py-3">
                    {controleur && (
                      <input
                        type="checkbox"
                        className="mt-1 size-4 accent-marque-600"
                        checked={coches.has(d.id)}
                        onChange={() =>
                          setCoches((c) => {
                            const n = new Set(c);
                            if (n.has(d.id)) n.delete(d.id);
                            else n.add(d.id);
                            return n;
                          })
                        }
                        aria-label={`Cocher ${d.nom}`}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-encre">
                        {d.nom} <span className="font-normal text-zinc-500">· {jour(d.naissance)} · {d.diplome}</span>
                      </div>
                      <ul className="mt-1 space-y-0.5">
                        {d.trouves.map((t, i) => (
                          <li key={i} className="text-[12px] text-zinc-600">
                            <Badge ton="jaune">{t.source}</Badge> {t.nom} · {jour(t.naissance)}
                            {t.detail ? ` · ${t.detail}` : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {controleur && (
                      <span className="flex gap-1.5">
                        <Bouton variante="danger" className="px-3! py-1.5!" onClick={() => trancher([d.id], "ECARTER")}>
                          Écarter
                        </Bouton>
                        <Bouton className="px-3! py-1.5!" onClick={() => trancher([d.id], "DIFFERENT")}>
                          Pas la même personne
                        </Bouton>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
