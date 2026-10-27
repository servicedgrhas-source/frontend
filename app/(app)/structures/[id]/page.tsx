"use client";

import { ArrowLeft, ChevronRight, Plus, School, UserRound } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "@/components/session";
import { Alerte, Badge, Bouton, Carte, Chargement, EnTete, Tableau, Vide, cx } from "@/components/ui";
import { useApi } from "@/lib/api";
import { accesDonne } from "@/lib/espaces";
import { peut } from "@/lib/libelles";
import { typeStructure } from "@/lib/structures";

interface Detail {
  structure: {
    id: number;
    nom: string;
    sigle: string;
    type: string;
    departementId: number | null;
    posteResponsable: string;
    responsable: { id: number; nomComplet: string } | null;
    responsableInterim: boolean;
  };
  chemin: { id: number; nom: string; sigle: string }[];
  dessous: { id: number; nom: string; sigle: string; type: string }[];
  /** `fonction` : la qualification (« Fonction / profession ») ; `fonctionStructure` : ce qu'il fait ici. */
  agents: { id: number; nomComplet: string; statut: string; fonction: string | null; fonctionStructure: string | null; enPoste: boolean; enseignant: boolean }[];
}

const STATUTS: Record<string, string> = { FONCTIONNAIRE: "Fonctionnaire", CONTRACTUEL: "Contractuel", VOLONTAIRE: "Volontaire", COMMUNAUTAIRE: "Communautaire" };

/** Fiche d'une structure administrative : où elle se trouve, son responsable, ce qui en dépend, son personnel. */
export default function FicheStructure() {
  const { profil } = useSession();
  const { id } = useParams<{ id: string }>();
  const detail = useApi<Detail>(`/structures/${id}/personnel`);

  if (!peut.traiter(profil.role) && profil.role !== "DDEPPSA" && !accesDonne(profil)) return <Alerte>Accès réservé à la DGRHAS et aux DDEPPSA.</Alerte>;
  if (detail.erreur) return <Alerte>{detail.erreur}</Alerte>;
  const d = detail.donnees;
  if (!d) return <Chargement />;

  const t = typeStructure(d.structure.type);
  const Icone = t.icone;
  const sousStructures = d.dessous.filter((x) => x.type !== "ETABLISSEMENT");
  const ecoles = d.dessous.filter((x) => x.type === "ETABLISSEMENT").length;
  const enPoste = d.agents.filter((a) => a.enPoste).length;

  return (
    <div className="space-y-5">
      <Link href="/structures" className="inline-flex items-center gap-1 text-xs font-medium text-marque-700 hover:underline">
        <ArrowLeft className="size-3.5" /> Organisation du ministère
      </Link>

      {/* Où se trouve la structure : de la plus haute à elle */}
      {!!d.chemin.length && (
        <nav aria-label="Structures au-dessus" className="flex flex-wrap items-center gap-1.5 text-[13px]">
          {d.chemin.map((c) => (
            <span key={c.id} className="inline-flex items-center gap-1.5">
              <Link href={`/structures/${c.id}`} title={c.nom} className="rounded-full bg-white px-3 py-1 font-medium text-zinc-600 ring-1 ring-zinc-200 hover:text-marque-700 hover:ring-marque-300">
                {c.sigle || c.nom}
              </Link>
              <ChevronRight className="size-3.5 text-zinc-400" />
            </span>
          ))}
          <span className="rounded-full bg-marque-700 px-3 py-1 font-semibold text-white">{d.structure.sigle || d.structure.nom}</span>
        </nav>
      )}

      <div className="flex flex-wrap items-start gap-4">
        <span className={cx("flex size-14 shrink-0 items-center justify-center rounded-2xl", t.pastille)}>
          <Icone className="size-7" />
        </span>
        <div className="min-w-0 flex-1">
          <EnTete
            titre={d.structure.nom}
            sousTitre={`${t.libelle}${d.structure.sigle && d.structure.sigle !== d.structure.nom ? ` · ${d.structure.sigle}` : ""}`}
            actions={
              <Link href={`/personnel/agents/nouveau?structure=${d.structure.id}`}>
                <Bouton variante="principal">
                  <Plus /> Enregistrer un agent ici
                </Bouton>
              </Link>
            }
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Carte>
          <div className="text-[12px] font-medium text-zinc-500">{d.structure.posteResponsable}</div>
          <div className="mt-1 text-[15px]">
            {d.structure.responsable ? (
              <Link href={`/personnel/agents/${d.structure.responsable.id}`} className="font-semibold text-marque-700 hover:underline">
                {d.structure.responsable.nomComplet}
              </Link>
            ) : (
              <span className="font-semibold text-or-700">Poste vacant</span>
            )}
            {d.structure.responsableInterim && <span className="text-zinc-500"> (intérim)</span>}
          </div>
        </Carte>
        <Carte>
          <div className="text-[12px] font-medium text-zinc-500">Personnel rattaché</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-encre tabular-nums">{d.agents.length.toLocaleString("fr-FR")}</span>
            <span className="text-[12px] text-zinc-500">dont {enPoste.toLocaleString("fr-FR")} à leur poste</span>
          </div>
        </Carte>
        <Carte>
          <div className="text-[12px] font-medium text-zinc-500">En dessous</div>
          <div className="mt-1 flex items-baseline gap-3 text-[13px] text-zinc-600">
            <span>
              <strong className="text-2xl font-semibold text-encre tabular-nums">{sousStructures.length}</strong> structure(s)
            </span>
            {!!ecoles && (
              <Link href="/ecoles" className="inline-flex items-center gap-1 font-medium text-marque-700 hover:underline">
                <School className="size-4" /> {ecoles.toLocaleString("fr-FR")} école(s)
              </Link>
            )}
          </div>
        </Carte>
      </div>

      {!!sousStructures.length && (
        <Carte titre={`Structures en dessous (${sousStructures.length})`}>
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {sousStructures.map((x) => {
              const tx = typeStructure(x.type);
              const I = tx.icone;
              return (
                <li key={x.id}>
                  <Link href={`/structures/${x.id}`} className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 hover:border-marque-300 hover:bg-marque-50/40">
                    <span className={cx("flex size-9 shrink-0 items-center justify-center rounded-xl", tx.pastille)}>
                      <I className="size-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold text-encre">{x.sigle || x.nom}</span>
                      <span className="block truncate text-[12px] text-zinc-500">{x.sigle && x.sigle !== x.nom ? x.nom : tx.libelle}</span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-zinc-400" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Carte>
      )}

      <Carte titre={`Personnel de la structure (${d.agents.length})`}>
        {!d.agents.length ? (
          <Vide>Aucun agent rattaché à cette structure. Rattachez-les dans leur fiche (« Établissement ou structure de rattachement »), ou enregistrez-en un ici.</Vide>
        ) : (
          <Tableau>
            <thead>
              <tr>
                <th>Agent</th>
                <th>Type</th>
                <th>Qualification</th>
                <th>Fonction dans la structure</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {d.agents.map((a) => (
                <tr key={a.id} className={a.enPoste ? "" : "text-zinc-400"}>
                  <td>
                    <Link href={`/personnel/agents/${a.id}`} className="inline-flex items-center gap-1.5 font-medium text-marque-700 hover:underline">
                      <UserRound className="size-3.5 text-zinc-400" />
                      {a.nomComplet}
                    </Link>
                  </td>
                  <td className="text-[12px]">{STATUTS[a.statut] ?? a.statut}</td>
                  <td className="text-[12px]">{a.fonction ?? "—"}</td>
                  <td className="text-[12px]">{a.fonctionStructure ? <strong className="font-semibold text-encre">{a.fonctionStructure}</strong> : <span className="text-zinc-400">à renseigner dans sa fiche</span>}</td>
                  <td className="text-right">{!a.enPoste && <Badge ton="gris">pas à son poste</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </Tableau>
        )}
      </Carte>
    </div>
  );
}
