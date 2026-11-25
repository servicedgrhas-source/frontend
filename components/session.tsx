"use client";

import { SaisieMotDePasse } from "./mot-de-passe";
import { SqueletteApplication } from "./squelette";
import { ArrowLeft, Bell, Inbox, KeyRound, LayoutDashboard, Lock, LogOut, Menu as IconeMenu, PanelLeftClose, PanelLeftOpen, UserRound, X, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { api, CLE_JETON, ErreurApi, fermerSession, lireSession, memoriserProfil, ouvrirSession, qs, SESSION_ROUVERTE, surSessionExpiree, TRAVAIL_MODIFIE, type Profil } from "@/lib/api";
import { appliquerMenu, cheminDe, ESPACES, espaceDe, lienEspace, MENU, MENU_MODIFIE, niveauPage, POLES, poleDe, rubriquesVisibles, travailEspace, type Compteurs, type ConfigMenu } from "@/lib/espaces";
import { ROLES } from "@/lib/libelles";
import type { Referentiels } from "@/lib/types";
import { ChargementFichiers } from "./chargement-fichiers";
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

/**
 * L'historique de l'onglet, tel que le navigateur le tient (25/11/2026 : une pile tenue à part se
 * trompait après une redirection, un rechargement ou un lien qui ramène en arrière). Chaque entrée
 * porte son numéro (dans `history.state`, qui survit au rechargement) ; les pages de l'application
 * sont notées par numéro pour l'onglet (sessionStorage). « Retour » recule d'une entrée seulement
 * si l'entrée d'avant est une page de l'application ; sinon il remonte d'un cran dans le chemin.
 */
const CLE_HISTOIRE = "dgrhas.histoire";
let indexCourant = 0;
function installerHistoire() {
  if (typeof window === "undefined") return;
  const w = window as Window & { __dgrhasHistoire?: boolean };
  if (w.__dgrhasHistoire) return;
  w.__dgrhasHistoire = true;
  const h = window.history;
  const numero = (st: unknown) => (st && typeof (st as { __dgrhasIdx?: unknown }).__dgrhasIdx === "number" ? (st as { __dgrhasIdx: number }).__dgrhasIdx : null);
  indexCourant = numero(h.state) ?? 0;
  const pousser = h.pushState.bind(h);
  const remplacer = h.replaceState.bind(h);
  const avec = (st: unknown, i: number) => ({ ...(st && typeof st === "object" ? st : {}), __dgrhasIdx: i });
  h.pushState = (st, inutile, url) => {
    indexCourant++;
    pousser(avec(st, indexCourant), inutile, url);
  };
  h.replaceState = (st, inutile, url) => remplacer(avec(st, indexCourant), inutile, url);
  window.addEventListener("popstate", (e) => {
    const i = numero(e.state);
    if (i !== null) indexCourant = i;
  });
  remplacer(avec(h.state, indexCourant), "");
}
installerHistoire();

function lireHistoire(): Record<string, string> {
  try {
    return JSON.parse(sessionStorage.getItem(CLE_HISTOIRE) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}
function noterPage(chemin: string) {
  try {
    const m = lireHistoire();
    m[String(indexCourant)] = chemin;
    sessionStorage.setItem(CLE_HISTOIRE, JSON.stringify(m));
  } catch {
    /* sans stockage : « Retour » remonte dans le chemin */
  }
}
/** La page de l'application juste avant dans l'historique de l'onglet (sinon rien). */
function pageAvant(chemin: string): string | null {
  const avant = lireHistoire()[String(indexCourant - 1)];
  return avant && avant !== chemin ? avant : null;
}

/*
 * Menu de gauche réduit aux icônes (25/11/2026), sur ordinateur seulement : retenu dans ce
 * navigateur. Le changement ne se calcule qu'en CSS (largeur et opacité) : pas de rendu en boucle.
 */
const CLE_MENU_REDUIT = "dgrhas.menuReduit";
const MENU_REDUIT_CHANGE = "dgrhas:menu-reduit";
function lireMenuReduit() {
  try {
    return localStorage.getItem(CLE_MENU_REDUIT) === "1";
  } catch {
    return false;
  }
}
function ecouterMenuReduit(f: () => void) {
  window.addEventListener(MENU_REDUIT_CHANGE, f);
  window.addEventListener("storage", f);
  return () => {
    window.removeEventListener(MENU_REDUIT_CHANGE, f);
    window.removeEventListener("storage", f);
  };
}
function changerMenuReduit(reduit: boolean) {
  try {
    localStorage.setItem(CLE_MENU_REDUIT, reduit ? "1" : "0");
  } catch {
    /* navigation privée : le choix vaut pour cette page seulement */
  }
  if (reduit) document.documentElement.dataset.menuReduit = "1";
  else delete document.documentElement.dataset.menuReduit;
  window.dispatchEvent(new Event(MENU_REDUIT_CHANGE));
}

export function Coquille({ children }: { children: ReactNode }) {
  const router = useRouter();
  const chemin = usePathname();
  useEffect(() => {
    noterPage(chemin);
  }, [chemin]);
  const [session, setSession] = useState<Session | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmerSortie, setConfirmerSortie] = useState(false);
  // Menu en accordéon : un seul domaine ouvert, celui de la page affichée par défaut
  const [compteurs, setCompteurs] = useState<Compteurs | null>(null);
  // Circuit des demandes : dossiers à traiter et alertes non lues
  const [circuit, setCircuit] = useState<{ aTraiter: number; alertes: number } | null>(null);
  const [alertesOuvertes, setAlertesOuvertes] = useState(false);
  // Téléphone et petite tablette (DG, 21/11/2026 : équipes de terrain) : le menu se replie
  const [menuMobile, setMenuMobile] = useState(false);
  const reduit = useSyncExternalStore(ecouterMenuReduit, lireMenuReduit, () => false);
  // Session expirée pendant le travail : message du serveur, reconnexion sur place
  const [expiree, setExpiree] = useState<string | null>(null);

  useEffect(() => {
    const { jeton, profil } = lireSession();
    if (!jeton || !profil) {
      router.replace("/connexion");
      return;
    }
    Promise.all([
      api.get<Profil>("/auth/moi"),
      api.get<Referentiels>("/referentiels"),
      // Noms et ordre du menu réglés par l'administrateur ou le DG (sinon le menu d'origine)
      api.get<ConfigMenu>("/menu/configuration").catch(() => null),
    ])
      .then(([p, refs, menu]) => {
        appliquerMenu(menu);
        memoriserProfil(p);
        try {
          localStorage.setItem("dgrhas.referentiels", JSON.stringify(refs));
        } catch {
          /* appareil plein : la copie hors ligne sera plus ancienne */
        }
        setSession({ profil: p, refs });
      })
      .catch((e: Error) => {
        // Sans réseau (mission de terrain, DG 21/11/2026) : on travaille avec ce qui est gardé sur l'appareil
        // De même pour un recenseur dont la mission vient d'être arrêtée (410) : l'écran du code
        // s'affiche, ce qui attend part, puis l'appareil s'efface
        if (e instanceof ErreurApi && (e.statut === 0 || (e.statut === 410 && profil.role === "RECENSEUR"))) {
          let refs = {} as Referentiels;
          try {
            refs = JSON.parse(localStorage.getItem("dgrhas.referentiels") ?? "{}") as Referentiels;
          } catch {
            /* rien de gardé */
          }
          setSession({ profil, refs });
          return;
        }
        setErreur(e.message);
      });
  }, [router]);

  const ouvertRefs = !!session;
  // Menu renommé dans Administration › Menu : tout l'écran prend les nouveaux noms
  useEffect(() => {
    const apres = () => setSession((s) => (s ? { ...s } : s));
    window.addEventListener(MENU_MODIFIE, apres);
    return () => window.removeEventListener(MENU_MODIFIE, apres);
  }, []);

  // Diplômes, grades, départements : relus après un changement dans « Règles des diplômes et
  // grades » et au retour sur l'onglet, sans recharger la page (DG, 31/10/2026 : un grade rattaché
  // au BEPC n'apparaissait pas sur la fiche avant un rechargement)
  useEffect(() => {
    if (!ouvertRefs) return;
    let derniere = Date.now();
    const relire = () => {
      derniere = Date.now();
      api
        .get<Referentiels>("/referentiels")
        .then((refs) => setSession((s) => (s ? { ...s, refs } : s)))
        .catch(() => undefined);
    };
    const apresEcriture = (e: Event) => {
      const chemin = (e as CustomEvent<string>).detail ?? "";
      if (/^\/(configuration|departements|referentiels)/.test(chemin)) relire();
    };
    const auRetour = () => {
      if (document.visibilityState === "visible" && Date.now() - derniere > 30_000) relire();
    };
    window.addEventListener(TRAVAIL_MODIFIE, apresEcriture);
    window.addEventListener("focus", auRetour);
    document.addEventListener("visibilitychange", auRetour);
    return () => {
      window.removeEventListener(TRAVAIL_MODIFIE, apresEcriture);
      window.removeEventListener("focus", auRetour);
      document.removeEventListener("visibilitychange", auRetour);
    };
  }, [ouvertRefs]);

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
    // Un recenseur n'a ni menu ni dossiers : rien à compter
    if (!role || role === "RECENSEUR") return;
    derniersCompteurs.current = Date.now();
    if (role !== "STRUCTURE")
      api
        .get<Compteurs>("/menu/compteurs")
        .then(setCompteurs)
        .catch(() => undefined);
    // Dossiers du circuit + notes à lire, à imprimer ou à clôturer (pas pour un visiteur)
    if (role === "VISITEUR" || session?.profil.compteVide) return;
    Promise.all([
      api.get<{ aTraiter: number; alertes: number }>("/circuit/compteur"),
      role === "STRUCTURE" ? Promise.resolve({ total: 0 }) : api.get<{ total: number }>("/notes/a-faire").catch(() => ({ total: 0 })),
    ])
      .then(([c, n]) => setCircuit({ ...c, aTraiter: c.aTraiter + n.total }))
      .catch(() => undefined);
  }, [role, session?.profil.compteVide]);
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

  // Les comptes des structures (écoles, inspections…) n'ont que leurs dossiers, leur personnel et leur école
  useEffect(() => {
    if (
      session?.profil.role === "STRUCTURE" &&
      !chemin.startsWith("/a-traiter") &&
      !chemin.startsWith("/mutation/") &&
      !chemin.startsWith("/prestations") &&
      !chemin.startsWith("/personnel") &&
      !chemin.startsWith("/recensement") &&
      !(chemin === "/ecoles" || /^\/ecoles\/\d+$/.test(chemin)) &&
      chemin !== "/demandes/nouvelle" &&
      !["/espace/personnel", "/espace/rh", "/espace/demandes", "/espace/structures"].includes(chemin) &&
      chemin !== "/compte"
    )
      router.replace("/a-traiter");
    // Un recenseur ne voit que le formulaire du terrain (DG, 22/11/2026)
    if (session?.profil.role === "RECENSEUR" && !chemin.startsWith("/recensement/terrain")) router.replace("/recensement/terrain");
  }, [session, chemin, router]);

  if (erreur) return <div className="p-8"><Alerte>{erreur}</Alerte></div>;
  if (!session) return <SqueletteApplication />;

  const deconnexion = () => {
    fermerSession();
    setConfirmerSortie(false);
    // Rechargement complet : Next garde les pages visitées en mémoire (fenêtre ouverte,
    // profil, données) ; rien de la session précédente ne doit rester pour le suivant.
    window.location.replace("/connexion");
  };
  const p = session.profil;
  const espaceCourant = espaceDe(chemin);

  // Recenseur de la mission (DG, 22/11/2026) : pas notre interface, seulement le formulaire du terrain
  if (p.role === "RECENSEUR")
    return (
      <Contexte.Provider value={session}>
        <div className="no-print sticky top-0 z-30 flex h-12 items-center gap-3 bg-nuit px-3 text-white sm:px-5">
          <Image src="/armoiries.png" alt="" width={28} height={28} className="size-7 rounded-md bg-white object-contain p-0.5" priority />
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-[13px] font-semibold">{p.nom}</div>
            <div className="truncate text-[11px] text-or-400">{p.email.toUpperCase()} · Recensement SIGRHAS-MEPPSA</div>
          </div>
          <button type="button" onClick={() => setConfirmerSortie(true)} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] text-white/70 hover:bg-white/10 hover:text-white">
            <LogOut className="size-4" /> Se déconnecter
          </button>
        </div>
        {/* (--barre-haut : les bandeaux qui restent en haut de la page se collent SOUS cette barre) */}
        <main className="min-w-0 px-3 py-4 sm:px-5 sm:py-6" style={{ "--barre-haut": "3rem" } as React.CSSProperties}>{chemin.startsWith("/recensement/terrain") ? children : <SqueletteApplication />}</main>
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
        <Modale titre="Se déconnecter ?" ouverte={confirmerSortie} fermer={() => setConfirmerSortie(false)}>
          <p className="text-[13px] leading-relaxed text-zinc-500">
            Les données gardées sur cet appareil restent chiffrées : à la prochaine connexion, votre code (ou votre doigt) les rouvre. Pensez à envoyer ce qui attend quand vous avez du réseau.
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

  return (
    <Contexte.Provider value={session}>
      {/* Envois et téléchargements de fichiers : fenêtre de chargement animée */}
      <ChargementFichiers />
      {/* Sur un téléphone : une barre avec le bouton « Menu » ; le menu s'ouvre par-dessus la page */}
      <div className="no-print sticky top-0 z-30 flex items-center gap-3 bg-nuit px-3 py-2 text-white md:hidden">
        <button type="button" onClick={() => setMenuMobile(true)} className="inline-flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[14px] font-semibold hover:bg-white/10" aria-label="Ouvrir le menu">
          <IconeMenu className="size-5" /> Menu
        </button>
        <span className="text-[12px] font-bold tracking-wide text-or-400">SIGRHAS-MEPPSA</span>
      </div>
      {menuMobile && <div className="no-print fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setMenuMobile(false)} aria-hidden />}
      <div className="flex min-h-screen gap-0 p-0 lg:p-3">
        <aside
          // Un lien choisi dans le menu le referme (téléphone)
          onClickCapture={(e) => (e.target as HTMLElement).closest("a") && setMenuMobile(false)}
          data-reduit={reduit ? "true" : undefined}
          className={cx(
            // Réduit : 66 px, juste la place d'une icône centrée (les icônes ne bougent pas pendant le repli)
            "group/menu no-print top-0 h-screen w-64 shrink-0 flex-col overflow-hidden bg-nuit text-white md:sticky md:flex md:transition-[width] md:duration-200 md:ease-out motion-reduce:transition-none md:data-[reduit=true]:w-[66px] lg:top-3 lg:h-[calc(100vh-1.5rem)] lg:rounded-[28px]",
            menuMobile ? "fixed left-0 z-50 flex shadow-2xl" : "hidden",
          )}
        >
          <button type="button" onClick={() => setMenuMobile(false)} className="absolute top-3 right-3 cursor-pointer rounded-lg p-1.5 text-white/60 hover:bg-white/10 md:hidden" aria-label="Fermer le menu">
            <X className="size-5" />
          </button>
          {/* Réduit : ni armoiries ni titre, seulement un peu d'air au-dessus des icônes */}
          <div className="hidden h-5 shrink-0 md:group-data-[reduit=true]/menu:block" aria-hidden />
          <div className="w-64 shrink-0 px-6 pt-7 pb-6 md:group-data-[reduit=true]/menu:hidden">
            <div className="flex items-center gap-3">
              <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-white p-1.5 shadow-lg shadow-black/20">
                <Image src="/armoiries.png" alt="Armoiries de la République du Congo" width={56} height={56} className="h-full w-full object-contain" priority />
              </div>
              {/* Même hauteur que les armoiries : le texte est centré dans les deux sens, à côté d'elles */}
              <div className="flex h-16 min-w-0 flex-1 flex-col items-center justify-center text-center leading-tight">
                <div className="text-[10.5px] font-semibold whitespace-nowrap uppercase text-white">République du Congo</div>
                <div className="mt-1 text-[10px] whitespace-nowrap text-white/45">Unité · Travail · Progrès</div>
                <div className="mt-1.5 text-[11px] font-bold tracking-wide whitespace-nowrap text-or-400">SIGRHAS-MEPPSA</div>
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-x-hidden overflow-y-auto px-3 pb-4 md:group-data-[reduit=true]/menu:[scrollbar-width:none]!">
            {p.role !== "STRUCTURE" && <LienMenu href="/" libelle={(p.role === "VISITEUR" || p.compteVide) && p.droits?.["/"] !== "LECTURE" && p.droits?.["/"] !== "MODIFICATION" ? "Accueil" : "Tableau de bord"} icone={LayoutDashboard} actif={chemin === "/"} principal reduit={reduit} />}
            {p.role !== "VISITEUR" && !p.compteVide && <LienMenu href="/a-traiter" libelle="Dossiers à traiter" icone={Inbox} actif={chemin === "/a-traiter"} principal reduit={reduit} nombre={circuit?.aTraiter} titre="Demandes qui attendent votre visa et votre avis" />}
            {p.role !== "VISITEUR" && !p.compteVide && <button
              type="button"
              onClick={() => setAlertesOuvertes(true)}
              title={reduit ? (circuit?.alertes ? `Alertes (${circuit.alertes})` : "Alertes") : undefined}
              className="group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold text-white/80 transition-colors hover:bg-white/[0.05] hover:text-white"
            >
              <Bell className="size-[18px] shrink-0 text-white/40 group-hover:text-white/70" />
              <span className="flex-1 text-left transition-opacity duration-150 md:group-data-[reduit=true]/menu:whitespace-nowrap md:group-data-[reduit=true]/menu:opacity-0">Alertes</span>
              {!!circuit?.alertes && <span className="rounded-full bg-or-400 px-1.5 py-px text-[10px] font-bold text-zinc-900 tabular-nums md:group-data-[reduit=true]/menu:absolute md:group-data-[reduit=true]/menu:top-1.5 md:group-data-[reduit=true]/menu:right-1.5 md:group-data-[reduit=true]/menu:size-2 md:group-data-[reduit=true]/menu:p-0 md:group-data-[reduit=true]/menu:text-[0px] md:group-data-[reduit=true]/menu:ring-2 md:group-data-[reduit=true]/menu:ring-nuit">{circuit.alertes > 99 ? "99+" : circuit.alertes}</span>}
            </button>}
            <div className="my-2" />
            {/* Le menu ne se déroule pas (DG, 25/10/2026) : chaque rubrique ouvre sa page d'accueil, ses cases
                mènent aux volets ; le chemin en haut de la page dit où l'on est */}
            {MENU.map((m) => {
              if (m.pole) {
                const pole = POLES.find((x) => x.cle === m.pole);
                if (!pole) return null;
                const espaces = pole.espaces
                  .map((c) => ESPACES.find((e) => e.cle === c))
                  .filter((e): e is NonNullable<typeof e> => !!e && rubriquesVisibles(e, p).length > 0);
                if (!espaces.length) return null;
                const travail = espaces.reduce((n, e) => n + travailEspace(e, p, compteurs), 0);
                return (
                  <LienMenu
                    key={pole.cle}
                    href={`/espace/${pole.cle}`}
                    libelle={pole.titre}
                    icone={pole.icone}
                    actif={chemin === `/espace/${pole.cle}` || poleDe(espaceCourant?.cle)?.cle === pole.cle}
                    principal
                    reduit={reduit}
                    nombre={travail}
                  />
                );
              }
              const e = ESPACES.find((x) => x.cle === m.espace);
              // Comptes des écoles, inspections… : seulement les rubriques de leur personnel et de leurs demandes
              if (!e || !rubriquesVisibles(e, p).length) return null;
              return <LienMenu key={e.cle} href={lienEspace(e, p)} libelle={e.titre} icone={e.icone} actif={espaceCourant?.cle === e.cle} principal reduit={reduit} nombre={travailEspace(e, p, compteurs)} />;
            })}
          </nav>

          {/* Réduit : les icônes seules (déplier, mon compte, se déconnecter) */}
          <div className="hidden flex-col items-center gap-1 border-t border-white/10 py-3 md:group-data-[reduit=true]/menu:flex">
            <button type="button" onClick={() => changerMenuReduit(false)} title="Déplier le menu" aria-label="Déplier le menu" className="cursor-pointer rounded-xl p-2.5 text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white">
              <PanelLeftOpen className="size-[18px]" />
            </button>
            <Link href="/compte" title="Mon compte" aria-label="Mon compte" className={cx("rounded-xl p-2.5 transition-colors hover:bg-white/[0.06] hover:text-white", chemin === "/compte" ? "text-white" : "text-white/55")}>
              <UserRound className="size-[18px]" />
            </Link>
            <button type="button" onClick={() => setConfirmerSortie(true)} title="Se déconnecter" aria-label="Se déconnecter" className="cursor-pointer rounded-xl p-2.5 text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white">
              <LogOut className="size-[18px]" />
            </button>
          </div>
          <div className="relative w-64 shrink-0 border-t border-white/10 px-6 pt-4 pb-5 md:group-data-[reduit=true]/menu:hidden">
            <button type="button" onClick={() => changerMenuReduit(true)} title="Réduire le menu (icônes seules)" aria-label="Réduire le menu" className="absolute top-3.5 right-4 hidden cursor-pointer rounded-lg p-1.5 text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white md:inline-flex">
              <PanelLeftClose className="size-4" />
            </button>
            <div className="truncate pr-8 text-[14px] font-semibold">{p.nom}</div>
            <div className="truncate pr-8 text-xs text-white/45">{p.rolePerso ?? ROLES[p.role]}</div>
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
        <main className="min-w-0 flex-1 px-3 py-4 sm:px-5 sm:py-6 lg:px-10 lg:py-8">
          {/* Chaque page apparaît en fondu léger lors de la navigation */}
          <div key={chemin} className="animate-apparition">
            <FilAriane chemin={chemin} profil={p} />
            {!p.aCode && ["ADMIN", "DG"].includes(p.role) && chemin !== "/administration" && (
              <div className="no-print mb-5">
                <Alerte ton="jaune">
                  Votre compte n’a pas encore de <strong>code personnel</strong> : il ne tient qu’à votre mot de passe.{" "}
                  <Link href="/administration" className="font-semibold underline">
                    Créez-le dans Administration › Utilisateurs
                  </Link>{" "}
                  (bouton « Créer le code » sur votre ligne), puis gardez-le en lieu sûr.
                </Alerte>
              </div>
            )}
            {/* Pas de bandeau pour un visiteur (DG, 04/11/2026) : la lecture seule s'applique sans le dire */}
            {p.role !== "VISITEUR" && niveauPage(chemin, p) === "LECTURE" && (
              <div className="no-print mb-5">
                <Alerte ton="bleu">
                  Cette rubrique vous est ouverte en <strong>lecture seule</strong> : vous pouvez la consulter, pas la modifier.
                </Alerte>
              </div>
            )}
            {niveauPage(chemin, p) === "MASQUE" ? (
              <Alerte ton="jaune">Cette rubrique ne vous est pas ouverte. Demandez au DG ou à l’administrateur si vous en avez besoin.</Alerte>
            ) : (
              children
            )}
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
  reduit,
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
  /** Menu réduit aux icônes : le nom de la rubrique passe en infobulle. */
  reduit?: boolean;
}) {
  return (
    <Link
      href={href}
      title={reduit ? (nombre ? `${libelle} (${nombre})` : libelle) : titre}
      aria-label={reduit ? libelle : undefined}
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
      <span className="flex-1 leading-snug transition-opacity duration-150 md:group-data-[reduit=true]/menu:whitespace-nowrap md:group-data-[reduit=true]/menu:opacity-0">{libelle}</span>
      {!!nombre && <span className="rounded-full bg-white/10 px-1.5 py-px text-[10px] font-semibold text-white/80 tabular-nums md:group-data-[reduit=true]/menu:bg-or-400 md:group-data-[reduit=true]/menu:absolute md:group-data-[reduit=true]/menu:top-1.5 md:group-data-[reduit=true]/menu:right-1.5 md:group-data-[reduit=true]/menu:size-2 md:group-data-[reduit=true]/menu:p-0 md:group-data-[reduit=true]/menu:text-[0px] md:group-data-[reduit=true]/menu:ring-2 md:group-data-[reduit=true]/menu:ring-nuit">{nombre > 999 ? "999+" : nombre}</span>}
    </Link>
  );
}

interface AlerteCircuit {
  id: number;
  demandeId: string;
  type: "NOUVELLE" | "A_TRAITER" | "INSTRUCTION" | "DECISION" | "CLOTURE";
  texte: string;
  creeLe: string;
  lue: boolean;
  /** Où en est la demande maintenant (l'alerte, elle, raconte le moment où elle a été créée). */
  aujourdhui: string | null;
  /** Page de la demande (mutation, ou demande de prestation). */
  lien?: string;
}

const TYPE_ALERTE: Record<AlerteCircuit["type"], string> = {
  NOUVELLE: "Nouvelle demande",
  A_TRAITER: "À traiter",
  INSTRUCTION: "Instruction",
  DECISION: "Décision",
  CLOTURE: "Dossier clos : réponse à remettre",
};

/** Alerte de présence (fin de semaine) : absent, peu d'heures, deux semaines d'affilée sans travailler. */
interface AlertePresence {
  agentId: number;
  nomComplet: string;
  structureId: number;
  structure: string;
  lundi: string;
  alertes: { code: "JOURS" | "HEURES" | "DEUX_SEMAINES"; texte: string }[];
}
const deuxSemaines = (a: AlertePresence) => a.alertes.some((x) => x.code === "DEUX_SEMAINES");

/** Fenêtre de temps des alertes (DG, 27/10/2026). « tout » : toutes les demandes, 4 semaines de présence. */
type ChoixPeriode = "semaine" | "deuxSemaines" | "mois" | "tout" | "dates";
const PERIODES: { k: ChoixPeriode; libelle: string }[] = [
  { k: "semaine", libelle: "Cette semaine" },
  { k: "deuxSemaines", libelle: "2 dernières semaines" },
  { k: "mois", libelle: "Ce mois" },
  { k: "tout", libelle: "Tout" },
  { k: "dates", libelle: "Choisir les dates" },
];
const isoLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
/** Du lundi de cette semaine (ou d'il y a une semaine, ou du 1er du mois) à aujourd'hui. */
function bornes(choix: ChoixPeriode, dates: { du: string; au: string }): { du?: string; au?: string } {
  const auj = new Date();
  const lundi = new Date(auj);
  lundi.setDate(auj.getDate() - ((auj.getDay() + 6) % 7));
  if (choix === "semaine") return { du: isoLocal(lundi), au: isoLocal(auj) };
  if (choix === "deuxSemaines") {
    lundi.setDate(lundi.getDate() - 7);
    return { du: isoLocal(lundi), au: isoLocal(auj) };
  }
  if (choix === "mois") return { du: isoLocal(new Date(auj.getFullYear(), auj.getMonth(), 1)), au: isoLocal(auj) };
  if (choix === "dates") return { du: dates.du || undefined, au: dates.au || undefined };
  return {};
}

/**
 * Les alertes, par onglets (DG, 26/10/2026) : tout, les demandes (nouvelle demande, dossier arrivé
 * chez soi, instruction, décision) et la présence (deux semaines sans venir en tête).
 */
function PanneauAlertes({ fermer, aller }: { fermer: () => void; aller: (href: string) => void }) {
  const [liste, setListe] = useState<AlerteCircuit[] | null>(null);
  const [presence, setPresence] = useState<AlertePresence[] | null>(null);
  const [onglet, setOnglet] = useState<"tout" | "demandes" | "presence">("tout");
  const [choix, setChoix] = useState<ChoixPeriode>("tout");
  const [dates, setDates] = useState({ du: "", au: isoLocal(new Date()) });
  const periode = bornes(choix, dates);
  const filtre = qs(periode);
  // Période dont les résultats sont affichés : tant qu'elle diffère, on montre le chargement
  const [chargeePour, setChargeePour] = useState<string | null>(null);
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
    void Promise.all([
      api.get<PageAlertes>(`/circuit/alertes${filtre}`).catch((e: Error) => {
        if (actif) setErreur(e.message);
        return { alertes: [], nonLues: 0, suite: false } as PageAlertes;
      }),
      // Présence : seulement les comptes qui suivent la présence (sinon, aucune)
      api.get<AlertePresence[]>(`/presence/alertes${filtre}`).catch(() => [] as AlertePresence[]),
    ]).then(([r, p]) => {
      if (!actif) return;
      recevoir(r, false);
      setPresence(p);
      setChargeePour(filtre);
    });
    return () => {
      actif = false;
    };
  }, [recevoir, filtre]);
  const plusAnciennes = async (avant: number) => {
    setChargement(true);
    try {
      recevoir(await api.get<PageAlertes>(`/circuit/alertes${qs({ ...periode, avant })}`), true);
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
  const urgentes = (presence ?? []).filter(deuxSemaines);
  const autresPresence = (presence ?? []).filter((a) => !deuxSemaines(a));
  const ligneDemande = (a: AlerteCircuit) => {
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
        {a.aujourdhui && <span className={cx("mt-0.5 block text-[12px] font-medium", introuvable ? "text-zinc-400" : "text-marque-700")}>Aujourd’hui : {a.aujourdhui}</span>}
      </>
    );
    return (
      <li key={`d${a.id}`}>
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
              aller(a.lien ?? `/mutation/${a.demandeId}`);
            }}
            className={cx("w-full rounded-2xl px-3 py-2 text-left text-[13px] transition hover:bg-zinc-50", !a.lue && "bg-or-100/50")}
          >
            {contenu}
          </button>
        )}
      </li>
    );
  };
  const lignePresence = (a: AlertePresence) => (
    <li key={`p${a.agentId}-${a.lundi}`}>
      <button
        type="button"
        onClick={() => {
          fermer();
          aller(`/personnel/presence?structure=${a.structureId}&date=${a.lundi}`);
        }}
        className={cx("w-full rounded-2xl px-3 py-2 text-left text-[13px] transition hover:bg-zinc-50", deuxSemaines(a) ? "bg-rouge-100/60" : "bg-or-100/40")}
      >
        <span className="flex items-center gap-2 text-[11px] text-zinc-500">
          <strong className={deuxSemaines(a) ? "text-rouge-600" : "text-zinc-700"}>{deuxSemaines(a) ? "Deux semaines sans venir" : "Présence"}</strong> · semaine du{" "}
          {a.lundi.split("-").reverse().join("/")}
        </span>
        <span className="block font-medium text-zinc-800">
          {a.nomComplet} <span className="font-normal text-zinc-500">· {a.structure}</span>
        </span>
        {a.alertes.map((x) => (
          <span key={x.code} className="block text-[12px] text-zinc-600">
            {x.texte}
          </span>
        ))}
        <span className="mt-0.5 block text-[12px] font-medium text-marque-700">Ouvrir le pointage de cette semaine →</span>
      </button>
    </li>
  );
  const nbDemandes = liste?.length ?? 0;
  const nbPresence = presence?.length ?? 0;
  const vide = (t: string) => <p className="py-2 text-[13px] text-zinc-500">{t}</p>;
  return (
    <Modale titre="Alertes" ouverte fermer={fermer}>
      {erreur && <Alerte>{erreur}</Alerte>}
      <div className="mb-3 space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {PERIODES.map((x) => (
            <button
              key={x.k}
              type="button"
              onClick={() => setChoix(x.k)}
              className={cx(
                "cursor-pointer rounded-lg border px-2.5 py-1 text-[12px]",
                choix === x.k ? "border-marque-600 bg-marque-50 font-semibold text-marque-700" : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400",
              )}
            >
              {x.libelle}
            </button>
          ))}
        </div>
        {choix === "dates" && (
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-zinc-600">
            Du
            <input type="date" aria-label="Du" value={dates.du} max={dates.au || undefined} onChange={(e) => setDates({ ...dates, du: e.target.value })} className="rounded-lg border border-zinc-200 px-2 py-1" />
            au
            <input type="date" aria-label="Au" value={dates.au} min={dates.du || undefined} onChange={(e) => setDates({ ...dates, au: e.target.value })} className="rounded-lg border border-zinc-200 px-2 py-1" />
          </div>
        )}
        <p className="text-[11px] text-zinc-500">
          {periode.du || periode.au
            ? `Du ${periode.du ? periode.du.split("-").reverse().join("/") : "début"} au ${periode.au ? periode.au.split("-").reverse().join("/") : "aujourd’hui"}.`
            : "Toutes les alertes de demandes ; présence : les 4 dernières semaines."}
          {" "}La présence compte les semaines validées par les chefs.
        </p>
      </div>
      {!liste || !presence || chargeePour !== filtre ? (
        <Chargement />
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ["tout", `Tout (${nbDemandes + nbPresence})`],
                ["demandes", `Demandes (${nbDemandes})`],
                ["presence", `Présence (${nbPresence})`],
              ] as const
            ).map(([k, t]) => (
              <button
                key={k}
                type="button"
                onClick={() => setOnglet(k)}
                className={cx(
                  "cursor-pointer rounded-full border px-3.5 py-1.5 text-[12px] font-medium",
                  onglet === k ? "border-encre bg-encre text-white" : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400",
                )}
              >
                {t}
                {k === "presence" && urgentes.length > 0 && <span className="ml-1.5 rounded-full bg-rouge-600 px-1.5 text-[10px] text-white">{urgentes.length}</span>}
              </button>
            ))}
          </div>
          {onglet !== "presence" && nonLues > 0 && (
            <button type="button" className="text-[12px] font-medium text-marque-700 hover:underline" onClick={toutLire}>
              Tout marquer comme lu ({nonLues})
            </button>
          )}
          <ul className="max-h-[60vh] space-y-1.5 overflow-y-auto">
            {onglet === "tout" && (
              <>
                {urgentes.map(lignePresence)}
                {liste.map(ligneDemande)}
                {autresPresence.map(lignePresence)}
                {!nbDemandes && !nbPresence && vide("Aucune alerte sur cette période.")}
              </>
            )}
            {onglet === "demandes" && (nbDemandes ? liste.map(ligneDemande) : vide("Aucune alerte sur les demandes pour cette période."))}
            {onglet === "presence" &&
              (nbPresence ? [...urgentes, ...autresPresence].map(lignePresence) : vide("Aucune alerte de présence sur cette période (semaines validées par les chefs)."))}
          </ul>
          {onglet !== "presence" && suite && (
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
            <Lock className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-zinc-400" />
            <SaisieMotDePasse autoComplete="current-password" required autoFocus value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} className="pl-9" />
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

/**
 * Où l'on est (DG, 25/10/2026) : le menu ne se déroule pas, le chemin en haut de la page le dit —
 * Personnel › Base du personnel › Présence ; chaque étape se clique pour remonter.
 */
function FilAriane({ chemin, profil }: { chemin: string; profil: Profil }) {
  const router = useRouter();
  const etapes = cheminDe(chemin, profil);
  if (chemin === "/") return null;
  // « Retour » (DG, 24/11/2026 : l'application installée n'a plus le bouton du navigateur) : la page
  // d'avant dans l'application, sinon l'étape au-dessus dans le chemin, sinon le tableau de bord
  const retour = () => {
    if (pageAvant(chemin)) return router.back();
    const parent = [...etapes].reverse().find((x) => x.href && x.href.split("?")[0] !== chemin)?.href;
    // Remonter remplace la page (sinon le « Retour » suivant ramènerait ici, en aller-retour)
    router.replace(parent ?? "/");
  };
  const boutonRetour = (
    <button
      type="button"
      onClick={retour}
      title="Revenir à la page précédente"
      className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-2xl bg-white px-3 py-2 text-[13px] font-medium text-marque-700 shadow-doux ring-1 ring-zinc-100 transition hover:bg-marque-50"
    >
      <ArrowLeft className="size-4" /> Retour
    </button>
  );
  if (!etapes.length)
    return (
      <nav aria-label="Où vous êtes" className="no-print mb-5">
        {boutonRetour}
      </nav>
    );
  // Une petite frise : l'accueil, puis chaque étape numérotée, reliées par un trait ; on est sur la dernière
  return (
    <nav aria-label="Où vous êtes" className="no-print mb-5 flex items-center gap-2 overflow-x-auto">
      {boutonRetour}
      <ol className="inline-flex min-w-max items-center rounded-2xl bg-white px-3 py-2 shadow-doux ring-1 ring-zinc-100">
        <li className="flex items-center">
          <Link href="/" title="Tableau de bord" className="flex size-7 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition hover:bg-marque-50 hover:text-marque-700">
            <LayoutDashboard className="size-3.5" />
          </Link>
        </li>
        {etapes.map((x, i) => {
          const derniere = i === etapes.length - 1;
          const contenu = (
            <>
              <span
                className={cx(
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums transition",
                  derniere ? "bg-marque-600 text-white shadow-sm shadow-marque-600/30" : "bg-marque-50 text-marque-700 ring-1 ring-marque-200 group-hover:bg-marque-100",
                )}
              >
                {i + 1}
              </span>
              <span className={cx("text-[13px] whitespace-nowrap", derniere ? "font-semibold text-encre" : "font-medium text-zinc-600 group-hover:text-marque-700")}>{x.libelle}</span>
            </>
          );
          return (
            <li key={`${x.libelle}-${i}`} className="flex items-center" aria-current={derniere ? "page" : undefined}>
              <span className={cx("mx-2 h-0.5 w-6 rounded-full", derniere ? "bg-marque-300" : "bg-zinc-200")} aria-hidden />
              {x.href && !derniere ? (
                <Link href={x.href} className="group flex items-center gap-2 rounded-full py-0.5 pr-2 pl-0.5 transition hover:bg-marque-50/60">
                  {contenu}
                </Link>
              ) : (
                <span className="flex items-center gap-2 rounded-full bg-marque-50/70 py-0.5 pr-3 pl-0.5">{contenu}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
