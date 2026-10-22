"use client";

import { Bell, ChevronDown, Gauge, Inbox, KeyRound, LayoutDashboard, Lock, LogOut, UserRound, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { api, CLE_JETON, fermerSession, lireSession, memoriserProfil, ouvrirSession, SESSION_ROUVERTE, surSessionExpiree, TRAVAIL_MODIFIE, type Profil } from "@/lib/api";
import { ESPACES, espaceDe, rubriquesVisibles, travailEspace, type Compteurs } from "@/lib/espaces";
import { peut, ROLES } from "@/lib/libelles";
import type { Referentiels } from "@/lib/types";
import { Alerte, Bouton, Champ, Chargement, cx, Modale, Saisie } from "./ui";

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
  // Session expirée pendant le travail : message du serveur, reconnexion sur place
  const [expiree, setExpiree] = useState<string | null>(null);

  useEffect(() => {
    const { jeton, profil } = lireSession();
    if (!jeton || !profil) {
      router.replace("/connexion");
      return;
    }
    Promise.all([api.get<Profil>("/auth/moi"), api.get<Referentiels>("/referentiels")])
      .then(([p, refs]) => {
        memoriserProfil(p);
        setSession({ profil: p, refs });
      })
      .catch((e: Error) => setErreur(e.message));
  }, [router]);

  // Une fois la session ouverte, une session expirée se rouvre dans une fenêtre (la page reste)
  useEffect(() => (session ? surSessionExpiree((m) => setExpiree(m)) : undefined), [session]);

  // Profil relu au retour sur l'onglet : un rôle ou un nom changé par l'administrateur s'applique
  const derniereLecture = useRef(0);
  const ouvert = !!session;
  useEffect(() => {
    if (!ouvert) return;
    const relire = () => {
      if (document.visibilityState !== "visible" || Date.now() - derniereLecture.current < 30_000) return;
      derniereLecture.current = Date.now();
      api
        .get<Profil>("/auth/moi")
        .then((p) => {
          memoriserProfil(p);
          setSession((s) => (s && JSON.stringify(s.profil) !== JSON.stringify(p) ? { ...s, profil: p } : s));
        })
        .catch(() => undefined);
    };
    derniereLecture.current = Date.now();
    window.addEventListener("focus", relire);
    document.addEventListener("visibilitychange", relire);
    return () => {
      window.removeEventListener("focus", relire);
      document.removeEventListener("visibilitychange", relire);
    };
  }, [ouvert]);

  // Autres onglets : déconnexion → tous les onglets ; autre compte connecté → rechargement ;
  // même compte reconnecté ailleurs → cet onglet reprend sans rien demander
  const idProfil = session?.profil.id;
  useEffect(() => {
    if (!idProfil) return;
    const f = (e: StorageEvent) => {
      if (e.key !== CLE_JETON && e.key !== null) return;
      const { jeton, profil } = lireSession();
      if (!jeton) return window.location.replace("/connexion");
      if (profil && profil.id !== idProfil) return window.location.replace("/");
      // Jeton renouvelé dans un autre onglet (reconnexion, code changé) : on reprend
      setExpiree(null);
      window.dispatchEvent(new Event(SESSION_ROUVERTE));
    };
    window.addEventListener("storage", f);
    return () => window.removeEventListener("storage", f);
  }, [idProfil]);

  // Travail en attente (compteurs du menu). Relu : après chaque enregistrement, au retour sur
  // l'onglet, chaque minute (nouvelles alertes), et en changeant de page s'il date de plus de
  // 15 s. Plus à chaque clic : en ligne, chaque lecture coûte un aller-retour au serveur.
  const role = session?.profil.role;
  const derniersCompteurs = useRef(0);
  const lireCompteurs = useCallback(() => {
    if (!role) return;
    derniersCompteurs.current = Date.now();
    if (role !== "STRUCTURE")
      api
        .get<Compteurs>("/menu/compteurs")
        .then(setCompteurs)
        .catch(() => undefined);
    // Dossiers du circuit + notes à lire, à imprimer ou à clôturer
    Promise.all([
      api.get<{ aTraiter: number; alertes: number }>("/circuit/compteur"),
      role === "STRUCTURE" ? Promise.resolve({ total: 0 }) : api.get<{ total: number }>("/notes/a-faire").catch(() => ({ total: 0 })),
    ])
      .then(([c, n]) => setCircuit({ ...c, aTraiter: c.aTraiter + n.total }))
      .catch(() => undefined);
  }, [role]);
  useEffect(() => {
    if (Date.now() - derniersCompteurs.current > 15_000) lireCompteurs();
  }, [chemin, lireCompteurs]);
  useEffect(() => {
    if (!role) return;
    let attente: ReturnType<typeof setTimeout> | undefined;
    const apresEcriture = () => {
      clearTimeout(attente);
      attente = setTimeout(lireCompteurs, 800);
    };
    const auRetour = () => {
      if (document.visibilityState === "visible" && Date.now() - derniersCompteurs.current > 15_000) lireCompteurs();
    };
    const minute = setInterval(() => document.visibilityState === "visible" && lireCompteurs(), 60_000);
    window.addEventListener(TRAVAIL_MODIFIE, apresEcriture);
    window.addEventListener("focus", auRetour);
    document.addEventListener("visibilitychange", auRetour);
    return () => {
      clearTimeout(attente);
      clearInterval(minute);
      window.removeEventListener(TRAVAIL_MODIFIE, apresEcriture);
      window.removeEventListener("focus", auRetour);
      document.removeEventListener("visibilitychange", auRetour);
    };
  }, [role, lireCompteurs]);

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
            {!p.aCode && (p.role === "ADMIN" || p.role === "DG") && chemin !== "/administration" && (
              <div className="no-print mb-5">
                <Alerte ton="jaune">
                  Votre compte n’a pas encore de <strong>code personnel</strong> : il ne tient qu’à votre mot de passe.{" "}
                  <Link href="/administration" className="font-semibold underline">
                    Créez-le dans Administration
                  </Link>{" "}
                  (bouton « Créer le code » sur votre ligne), puis gardez-le en lieu sûr.
                </Alerte>
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
      {expiree !== null && (
        <Reconnexion
          profil={p}
          message={expiree}
          fermer={() => setExpiree(null)}
          reussie={(nouveau) => {
            if (nouveau.id !== p.id) return window.location.replace("/");
            setSession((s) => (s ? { ...s, profil: nouveau } : s));
            setExpiree(null);
            window.dispatchEvent(new Event(SESSION_ROUVERTE));
          }}
          changerDeCompte={deconnexion}
        />
      )}
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
  const [nonLues, setNonLues] = useState(0);
  const [suite, setSuite] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  // Par pages de 50, de la plus récente à la plus ancienne
  type PageAlertes = { alertes: AlerteCircuit[]; nonLues: number; suite: boolean };
  const recevoir = useCallback((r: PageAlertes, ajouter: boolean) => {
    setListe((l) => (ajouter && l ? [...l, ...r.alertes] : r.alertes));
    setNonLues(r.nonLues);
    setSuite(r.suite);
    setErreur(null);
  }, []);
  useEffect(() => {
    let actif = true;
    api
      .get<PageAlertes>("/circuit/alertes")
      .then((r) => actif && recevoir(r, false))
      .catch((e: Error) => {
        if (!actif) return;
        setErreur(e.message);
        setListe([]);
      });
    return () => {
      actif = false;
    };
  }, [recevoir]);
  const plusAnciennes = async (avant: number) => {
    setChargement(true);
    try {
      recevoir(await api.get<PageAlertes>(`/circuit/alertes?avant=${avant}`), true);
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setChargement(false);
    }
  };

  const lire = async (ids: number[]) => {
    if (!ids.length) return;
    await api.post("/circuit/alertes/lues", { ids }).catch(() => undefined);
    setListe((l) => l?.map((a) => (ids.includes(a.id) ? { ...a, lue: true } : a)) ?? null);
    setNonLues((n) => Math.max(0, n - ids.length));
  };
  // Toutes, y compris celles des pages pas encore affichées
  const toutLire = async () => {
    await api.post("/circuit/alertes/lues", { tout: true }).catch(() => undefined);
    setListe((l) => l?.map((a) => ({ ...a, lue: true })) ?? null);
    setNonLues(0);
  };
  return (
    <Modale titre="Alertes" ouverte fermer={fermer}>
      {erreur && <Alerte>{erreur}</Alerte>}
      {!liste ? (
        <Chargement />
      ) : !liste.length ? (
        <p className="text-[13px] text-zinc-500">Aucune alerte pour l’instant.</p>
      ) : (
        <div className="space-y-3">
          {nonLues > 0 && (
            <button type="button" className="text-[12px] font-medium text-marque-700 hover:underline" onClick={toutLire}>
              Tout marquer comme lu ({nonLues})
            </button>
          )}
          <ul className="max-h-[60vh] space-y-1.5 overflow-y-auto">
            {liste.map((a) => {
              // Demande supprimée depuis : l'alerte reste lisible, mais ne mène plus nulle part
              const introuvable = a.aujourdhui === "Demande supprimée";
              const contenu = (
                <>
                  <span className="flex items-center gap-2 text-[11px] text-zinc-500">
                    {!a.lue && <span className="size-2 rounded-full bg-or-400" />}
                    <strong className="text-zinc-700">{TYPE_ALERTE[a.type] ?? a.type}</strong> ·{" "}
                    {new Date(a.creeLe).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                  <span className="block text-zinc-800">{a.texte}</span>
                  {a.aujourdhui && (
                    <span className={cx("mt-0.5 block text-[12px] font-medium", introuvable ? "text-zinc-400" : "text-marque-700")}>Aujourd’hui : {a.aujourdhui}</span>
                  )}
                </>
              );
              return (
                <li key={a.id}>
                  {introuvable ? (
                    <button
                      type="button"
                      onClick={() => lire([a.id])}
                      title="Cette demande n’existe plus"
                      className={cx("w-full cursor-default rounded-2xl px-3 py-2 text-left text-[13px] opacity-70", !a.lue && "bg-or-100/50")}
                    >
                      {contenu}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={async () => {
                        await lire([a.id]);
                        fermer();
                        aller(`/mutation/${a.demandeId}`);
                      }}
                      className={cx("w-full rounded-2xl px-3 py-2 text-left text-[13px] transition hover:bg-zinc-50", !a.lue && "bg-or-100/50")}
                    >
                      {contenu}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          {suite && (
            <div className="text-center">
              <Bouton chargement={chargement} disabled={chargement} onClick={() => plusAnciennes(liste[liste.length - 1].id)}>
                Alertes plus anciennes
              </Bouton>
            </div>
          )}
        </div>
      )}
    </Modale>
  );
}

/**
 * Session expirée ou fermée pendant le travail : on se reconnecte sans quitter la page,
 * la saisie en cours reste à l'écran ; il suffit ensuite de refaire la dernière action.
 */
function Reconnexion({
  profil,
  message,
  fermer,
  reussie,
  changerDeCompte,
}: {
  profil: Profil;
  message: string;
  fermer: () => void;
  reussie: (p: Profil) => void;
  changerDeCompte: () => void;
}) {
  const [motDePasse, setMotDePasse] = useState("");
  const [code, setCode] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const valider = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setEnvoi(true);
      setErreur(null);
      try {
        const r = await api.post<{ jeton: string; utilisateur: Profil }>("/auth/connexion", { email: profil.email, motDePasse, code });
        ouvrirSession(r.jeton, r.utilisateur);
        reussie(r.utilisateur);
      } catch (err) {
        setErreur((err as Error).message);
      } finally {
        setEnvoi(false);
      }
    },
    [profil.email, motDePasse, code, reussie],
  );
  return (
    <Modale titre="Reconnectez-vous pour continuer" ouverte fermer={fermer}>
      <form onSubmit={valider} className="space-y-4">
        <p className="text-[13px] leading-relaxed text-zinc-600">
          {message} Votre page reste ouverte : après la reconnexion, refaites simplement votre dernière action (par exemple « Enregistrer »).
        </p>
        {erreur && <Alerte>{erreur}</Alerte>}
        <div className="rounded-xl bg-zinc-50 px-3 py-2 text-[13px] text-zinc-600">
          {profil.nom} · <span className="text-zinc-500">{profil.email}</span>
        </div>
        <Champ libelle="Mot de passe">
          <div className="relative">
            <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
            <Saisie type="password" autoComplete="current-password" required autoFocus value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} className="w-full pl-9" />
          </div>
        </Champ>
        <Champ libelle="Code personnel" aide="Laissez vide si vous n’en avez pas reçu.">
          <div className="relative">
            <KeyRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
            <Saisie
              autoComplete="one-time-code"
              spellCheck={false}
              value={code}
              onChange={(e) => {
                const brut = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
                setCode(brut.match(/.{1,4}/g)?.join("-") ?? "");
              }}
              placeholder="XXXX-XXXX-XXXX"
              className="w-full pl-9 font-mono tracking-wider"
            />
          </div>
        </Champ>
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <button type="button" onClick={changerDeCompte} className="text-[12px] text-zinc-500 hover:text-encre hover:underline">
            Changer de compte
          </button>
          <div className="flex gap-2">
            <Bouton type="button" onClick={fermer}>
              Plus tard
            </Bouton>
            <Bouton variante="principal" type="submit" disabled={envoi}>
              {envoi ? "Connexion…" : "Se reconnecter"}
            </Bouton>
          </div>
        </div>
      </form>
    </Modale>
  );
}
