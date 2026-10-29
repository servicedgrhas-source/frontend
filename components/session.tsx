"use client";

import { Bell, Inbox, KeyRound, LayoutDashboard, Lock, LogOut, UserRound, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { api, CLE_JETON, fermerSession, lireSession, memoriserProfil, ouvrirSession, qs, SESSION_ROUVERTE, surSessionExpiree, TRAVAIL_MODIFIE, type Profil } from "@/lib/api";
import { appliquerMenu, cheminDe, ESPACES, espaceDe, lienEspace, MENU, MENU_MODIFIE, niveauPage, POLES, poleDe, rubriquesVisibles, travailEspace, type Compteurs, type ConfigMenu } from "@/lib/espaces";
import { ROLES } from "@/lib/libelles";
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
    Promise.all([
      api.get<Profil>("/auth/moi"),
      api.get<Referentiels>("/referentiels"),
      // Noms et ordre du menu réglés par l'administrateur ou le DG (sinon le menu d'origine)
      api.get<ConfigMenu>("/menu/configuration").catch(() => null),
    ])
      .then(([p, refs, menu]) => {
        appliquerMenu(menu);
        memoriserProfil(p);
        setSession({ profil: p, refs });
      })
      .catch((e: Error) => setErreur(e.message));
  }, [router]);

  // Menu renommé dans Administration › Menu : tout l'écran prend les nouveaux noms
  useEffect(() => {
    const apres = () => setSession((s) => (s ? { ...s } : s));
    window.addEventListener(MENU_MODIFIE, apres);
    return () => window.removeEventListener(MENU_MODIFIE, apres);
  }, []);

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

  // Les comptes des structures (écoles, inspections…) n'ont que leurs dossiers, leur personnel et leur école
  useEffect(() => {
    if (
      session?.profil.role === "STRUCTURE" &&
      !chemin.startsWith("/a-traiter") &&
      !chemin.startsWith("/mutation/") &&
      !chemin.startsWith("/personnel") &&
      !chemin.startsWith("/recensement") &&
      !(chemin === "/ecoles" || /^\/ecoles\/\d+$/.test(chemin)) &&
      chemin !== "/demandes/nouvelle" &&
      !["/espace/personnel", "/espace/rh", "/espace/demandes", "/espace/structures"].includes(chemin) &&
      chemin !== "/compte"
    )
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

  return (
    <Contexte.Provider value={session}>
      <div className="flex min-h-screen gap-0 p-0 lg:p-3">
        <aside className="no-print sticky top-0 flex h-screen w-64 shrink-0 flex-col overflow-hidden bg-nuit text-white lg:top-3 lg:h-[calc(100vh-1.5rem)] lg:rounded-[28px]">
          <div className="px-6 pt-7 pb-6">
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
                    nombre={travail}
                  />
                );
              }
              const e = ESPACES.find((x) => x.cle === m.espace);
              // Comptes des écoles, inspections… : seulement les rubriques de leur personnel et de leurs demandes
              if (!e || !rubriquesVisibles(e, p).length) return null;
              return <LienMenu key={e.cle} href={lienEspace(e, p)} libelle={e.titre} icone={e.icone} actif={espaceCourant?.cle === e.cle} principal nombre={travailEspace(e, p, compteurs)} />;
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
            <FilAriane chemin={chemin} profil={p} />
            {!p.aCode && (p.role === "ADMIN" || p.role === "DG") && chemin !== "/administration" && (
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
            {niveauPage(chemin, p) === "LECTURE" && (
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
  type: "NOUVELLE" | "A_TRAITER" | "INSTRUCTION" | "DECISION" | "CLOTURE";
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
              aller(`/mutation/${a.demandeId}`);
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

/**
 * Où l'on est (DG, 25/10/2026) : le menu ne se déroule pas, le chemin en haut de la page le dit —
 * Personnel › Base du personnel › Présence ; chaque étape se clique pour remonter.
 */
function FilAriane({ chemin, profil }: { chemin: string; profil: Profil }) {
  const etapes = cheminDe(chemin, profil);
  if (!etapes.length) return null;
  // Une petite frise : l'accueil, puis chaque étape numérotée, reliées par un trait ; on est sur la dernière
  return (
    <nav aria-label="Où vous êtes" className="no-print mb-5 overflow-x-auto">
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
