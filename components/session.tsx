"use client";

import { Bell, ChevronDown, Gauge, Inbox, LayoutDashboard, LogOut, UserRound, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, fermerSession, lireSession, type Profil } from "@/lib/api";
import { ESPACES, espaceDe, rubriquesVisibles, travailEspace, type Compteurs } from "@/lib/espaces";
import { peut, ROLES } from "@/lib/libelles";
import type { Referentiels } from "@/lib/types";
import { Bouton, Chargement, cx, Modale } from "./ui";

interface Session {
  profil: Profil;
  refs: Referentiels;
}

const Contexte = createContext<Session | null>(null);

export function useSession() {
  const s = useContext(Contexte);
  if (!s) throw new Error("useSession hors de la session");
  return s;
}

export function Coquille({ children }: { children: ReactNode }) {
  const router = useRouter();
  const chemin = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmerSortie, setConfirmerSortie] = useState(false);
  // Menu en accordéon : un seul domaine ouvert, celui de la page affichée par défaut
  const [ouvertChoisi, setOuvert] = useState<{ cle: string | null; pour: string } | null>(null);
  const [compteurs, setCompteurs] = useState<Compteurs | null>(null);
  // Circuit des demandes : dossiers à traiter et alertes non lues
  const [circuit, setCircuit] = useState<{ aTraiter: number; alertes: number } | null>(null);
  const [alertesOuvertes, setAlertesOuvertes] = useState(false);

  useEffect(() => {
    const { jeton, profil } = lireSession();
    if (!jeton || !profil) {
      router.replace("/connexion");
      return;
    }
    Promise.all([api.get<Profil>("/auth/moi"), api.get<Referentiels>("/referentiels")])
      .then(([p, refs]) => setSession({ profil: p, refs }))
      .catch((e: Error) => setErreur(e.message));
  }, [router]);

  // Travail en attente, rafraîchi à chaque changement de page
  useEffect(() => {
    if (!session) return;
    if (session.profil.role !== "STRUCTURE")
      api
        .get<Compteurs>("/menu/compteurs")
        .then(setCompteurs)
        .catch(() => undefined);
    // Dossiers du circuit + notes à lire, à imprimer ou à clôturer
    Promise.all([
      api.get<{ aTraiter: number; alertes: number }>("/circuit/compteur"),
      session.profil.role === "STRUCTURE" ? Promise.resolve({ total: 0 }) : api.get<{ total: number }>("/notes/a-faire").catch(() => ({ total: 0 })),
    ])
      .then(([c, n]) => setCircuit({ ...c, aTraiter: c.aTraiter + n.total }))
      .catch(() => undefined);
  }, [session, chemin, alertesOuvertes]);

  // Les comptes des structures (écoles, inspections…) n'ont que leurs dossiers
  useEffect(() => {
    if (session?.profil.role === "STRUCTURE" && !chemin.startsWith("/a-traiter") && !chemin.startsWith("/mutation/") && chemin !== "/compte")
      router.replace("/a-traiter");
  }, [session, chemin, router]);

  if (erreur) return <div className="p-8 text-rouge-600">{erreur}</div>;
  if (!session) return <Chargement texte="Ouverture de la session…" />;

  const deconnexion = () => {
    fermerSession();
    setConfirmerSortie(false);
    // Rechargement complet : Next garde les pages visitées en mémoire (fenêtre ouverte,
    // profil, données) ; rien de la session précédente ne doit rester pour le suivant.
    window.location.replace("/connexion");
  };
  const p = session.profil;
  const espaceCourant = espaceDe(chemin);
  const cleOuverte = ouvertChoisi && ouvertChoisi.pour === chemin ? ouvertChoisi.cle : (espaceCourant?.cle ?? null);

  return (
    <Contexte.Provider value={session}>
      <div className="flex min-h-screen gap-0 p-0 lg:p-3">
        <aside className="no-print sticky top-0 flex h-screen w-64 shrink-0 flex-col overflow-hidden bg-nuit text-white lg:top-3 lg:h-[calc(100vh-1.5rem)] lg:rounded-[28px]">
          <div className="px-6 pt-7 pb-6">
            <div className="flex items-center gap-3">
              <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-white p-1.5 shadow-lg shadow-black/20">
                <Image src="/armoiries.png" alt="Armoiries de la République du Congo" width={56} height={56} className="h-full w-full object-contain" priority />
              </div>
              <div className="min-w-0 leading-tight">
                <div className="text-[10.5px] font-semibold whitespace-nowrap uppercase text-white">République du Congo</div>
                <div className="mt-1 text-[10px] whitespace-nowrap text-white/45">Unité · Travail · Progrès</div>
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 pb-4">
            {p.role !== "STRUCTURE" && <LienMenu href="/" libelle="Tableau de bord" icone={LayoutDashboard} actif={chemin === "/"} principal />}
            <LienMenu href="/a-traiter" libelle="Dossiers à traiter" icone={Inbox} actif={chemin === "/a-traiter"} principal nombre={circuit?.aTraiter} titre="Demandes qui attendent votre visa et votre avis" />
            <button
              type="button"
              onClick={() => setAlertesOuvertes(true)}
              className="group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold text-white/80 transition-colors hover:bg-white/[0.05] hover:text-white"
            >
              <Bell className="size-[18px] shrink-0 text-white/40 group-hover:text-white/70" />
              <span className="flex-1 text-left">Alertes</span>
              {!!circuit?.alertes && <span className="rounded-full bg-or-400 px-1.5 py-px text-[10px] font-bold text-zinc-900 tabular-nums">{circuit.alertes > 99 ? "99+" : circuit.alertes}</span>}
            </button>
            <div className="my-2" />
            {ESPACES.map((e) => {
              // Comptes des écoles, inspections… : seulement leurs dossiers
              if (p.role === "STRUCTURE") return null;
              const liens = rubriquesVisibles(e, p);
              if (!liens.length) return null;
              const ouvert = cleOuverte === e.cle;
              const travail = travailEspace(e, p, compteurs);
              const Icone = e.icone;
              const courant = espaceCourant?.cle === e.cle;
              return (
                <div key={e.cle} className="mb-1">
                  <Link
                    href={`/espace/${e.cle}`}
                    onClick={() => setOuvert({ cle: ouvert && chemin === `/espace/${e.cle}` ? null : e.cle, pour: chemin })}
                    aria-expanded={ouvert}
                    className={cx(
                      "group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[14px] font-semibold whitespace-nowrap transition-colors duration-200",
                      courant ? "bg-white/[0.09] text-white" : "text-white/80 hover:bg-white/[0.05] hover:text-white",
                    )}
                  >
                    <Icone className={cx("size-[18px] shrink-0", courant ? "text-or-400" : "text-white/50 group-hover:text-white/80")} />
                    <span className="flex-1">{e.titre}</span>
                    {travail > 0 && !ouvert && (
                      <span className="rounded-full bg-or-400 px-1.5 py-px text-[10px] font-bold text-zinc-900 tabular-nums">{travail > 999 ? "999+" : travail}</span>
                    )}
                    <ChevronDown className={cx("size-4 shrink-0 text-white/40 transition-transform duration-300", ouvert && "rotate-180")} />
                  </Link>
                  {/* Rubriques du domaine : s'ouvrent en douceur */}
                  <div className={cx("grid transition-all duration-300 ease-out", ouvert ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
                    <div className="overflow-hidden">
                      <div className="mt-0.5 mb-2 ml-[22px] border-l border-white/10 pl-2">
                        {liens.map((r) => {
                          const c = compteurs && r.compteur ? r.compteur(compteurs) : null;
                          return (
                            <LienMenu
                              key={r.href}
                              href={r.href}
                              libelle={r.libelle}
                              icone={r.icone}
                              actif={chemin === r.href || (chemin.startsWith(`${r.href}/`) && !liens.some((x) => x.href !== r.href && chemin.startsWith(x.href) && x.href.length > r.href.length))}
                              nombre={c?.n}
                              titre={c?.texte}
                              cache={!ouvert}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  {e.cle === "notes" && peut.parametrer(p.role) && (
                    <div className="mt-2">
                      <LienMenu href="/pilotage" libelle="Pilotage" icone={Gauge} actif={chemin === "/pilotage"} principal />
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="border-t border-white/10 px-6 pt-4 pb-5">
            <div className="truncate text-[14px] font-semibold">{p.nom}</div>
            <div className="truncate text-xs text-white/45">{ROLES[p.role]}</div>
            <div className="mt-3 flex items-center gap-3 text-xs whitespace-nowrap">
              <Link href="/compte" className={cx("inline-flex items-center gap-1.5 hover:text-white", chemin === "/compte" ? "text-white" : "text-white/55")}>
                <UserRound className="size-3.5" /> Mon compte
              </Link>
              <button onClick={() => setConfirmerSortie(true)} className="inline-flex cursor-pointer items-center gap-1.5 text-white/55 hover:text-white">
                <LogOut className="size-3.5" /> Se déconnecter
              </button>
            </div>
            <div className="bandeau-national mt-4 h-1 w-16 rounded-full" aria-hidden />
          </div>
        </aside>
        <main className="min-w-0 flex-1 px-5 py-6 lg:px-10 lg:py-8">
          {/* Chaque page apparaît en fondu léger lors de la navigation */}
          <div key={chemin} className="animate-apparition">
            {children}
          </div>
        </main>
      </div>
      {alertesOuvertes && <PanneauAlertes fermer={() => setAlertesOuvertes(false)} aller={(href) => router.push(href)} />}
      <Modale titre="Se déconnecter ?" ouverte={confirmerSortie} fermer={() => setConfirmerSortie(false)}>
        <p className="text-[13px] leading-relaxed text-zinc-500">
          Vous allez quitter votre session. Les modifications déjà enregistrées sont conservées ; une saisie en cours non enregistrée sera perdue.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Bouton onClick={() => setConfirmerSortie(false)}>Annuler</Bouton>
          <Bouton variante="sombre" onClick={deconnexion}>
            <LogOut /> Se déconnecter
          </Bouton>
        </div>
      </Modale>
    </Contexte.Provider>
  );
}

/** Une ligne du menu (rubrique, ou lien principal comme le tableau de bord). */
function LienMenu({
  href,
  libelle,
  icone: Icone,
  actif,
  principal,
  nombre,
  titre,
  cache,
}: {
  href: string;
  libelle: string;
  icone: LucideIcon;
  actif: boolean;
  principal?: boolean;
  nombre?: number;
  titre?: string;
  /** Rubrique d'un domaine fermé : hors de la navigation au clavier. */
  cache?: boolean;
}) {
  return (
    <Link
      href={href}
      title={titre}
      tabIndex={cache ? -1 : undefined}
      className={cx(
        "group relative flex items-center gap-3 rounded-xl px-3 transition-colors duration-200",
        principal ? "py-2.5 text-[14px] font-semibold" : "py-1.5 text-[13px]",
        actif ? "bg-white/[0.07] font-semibold text-white" : principal ? "text-white/80 hover:bg-white/[0.05] hover:text-white" : "text-white/55 hover:bg-white/[0.04] hover:text-white",
      )}
    >
      {actif && <span className="absolute top-1/2 left-0 h-5 w-1 -translate-y-1/2 rounded-full bg-or-400" aria-hidden />}
      <Icone
        className={cx(
          "shrink-0 transition-all duration-200 group-hover:translate-x-0.5",
          principal ? "size-[18px]" : "size-4",
          actif ? "text-marque-300" : "text-white/40 group-hover:text-white/70",
        )}
      />
      <span className="flex-1">{libelle}</span>
      {!!nombre && <span className="rounded-full bg-white/10 px-1.5 py-px text-[10px] font-semibold text-white/80 tabular-nums">{nombre > 999 ? "999+" : nombre}</span>}
    </Link>
  );
}

interface AlerteCircuit {
  id: number;
  demandeId: string;
  type: "NOUVELLE" | "A_TRAITER" | "INSTRUCTION" | "DECISION";
  texte: string;
  creeLe: string;
  lue: boolean;
  /** Où en est la demande maintenant (l'alerte, elle, raconte le moment où elle a été créée). */
  aujourdhui: string | null;
}

const TYPE_ALERTE: Record<AlerteCircuit["type"], string> = {
  NOUVELLE: "Nouvelle demande",
  A_TRAITER: "À traiter",
  INSTRUCTION: "Instruction",
  DECISION: "Décision",
};

/** Les alertes du circuit : nouvelle demande, dossier arrivé chez soi, instruction, décision. */
function PanneauAlertes({ fermer, aller }: { fermer: () => void; aller: (href: string) => void }) {
  const [liste, setListe] = useState<AlerteCircuit[] | null>(null);
  useEffect(() => {
    api
      .get<{ alertes: AlerteCircuit[] }>("/circuit/alertes")
      .then((r) => setListe(r.alertes))
      .catch(() => setListe([]));
  }, []);
  const lire = async (ids: number[]) => {
    if (!ids.length) return;
    await api.post("/circuit/alertes/lues", { ids }).catch(() => undefined);
    setListe((l) => l?.map((a) => (ids.includes(a.id) ? { ...a, lue: true } : a)) ?? null);
  };
  const nonLues = liste?.filter((a) => !a.lue) ?? [];
  return (
    <Modale titre="Alertes" ouverte fermer={fermer}>
      {!liste ? (
        <Chargement />
      ) : !liste.length ? (
        <p className="text-[13px] text-zinc-500">Aucune alerte pour l’instant.</p>
      ) : (
        <div className="space-y-3">
          {nonLues.length > 0 && (
            <button type="button" className="text-[12px] font-medium text-marque-700 hover:underline" onClick={() => lire(nonLues.map((a) => a.id))}>
              Tout marquer comme lu ({nonLues.length})
            </button>
          )}
          <ul className="max-h-[60vh] space-y-1.5 overflow-y-auto">
            {liste.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={async () => {
                    await lire([a.id]);
                    fermer();
                    aller(`/mutation/${a.demandeId}`);
                  }}
                  className={cx("w-full rounded-2xl px-3 py-2 text-left text-[13px] transition hover:bg-zinc-50", !a.lue && "bg-or-100/50")}
                >
                  <span className="flex items-center gap-2 text-[11px] text-zinc-500">
                    {!a.lue && <span className="size-2 rounded-full bg-or-400" />}
                    <strong className="text-zinc-700">{TYPE_ALERTE[a.type]}</strong> · {new Date(a.creeLe).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                  <span className="block text-zinc-800">{a.texte}</span>
                  {a.aujourdhui && <span className="mt-0.5 block text-[12px] font-medium text-marque-700">Aujourd’hui : {a.aujourdhui}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modale>
  );
}
