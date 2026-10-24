"use client";

import {
  CheckCircle2,
  ChevronRight,
  FileSpreadsheet,
  Info,
  Loader2,
  TriangleAlert,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { Ton } from "@/lib/libelles";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

const TONS: Record<Ton, string> = {
  gris: "bg-zinc-100 text-zinc-600",
  vert: "bg-marque-50 text-marque-700",
  jaune: "bg-or-100 text-or-700",
  rouge: "bg-rouge-100 text-rouge-600",
  bleu: "bg-sky-50 text-sky-700",
};

/** Couleur pleine des pastilles d'icônes, par ton. */
const PASTILLES: Record<Ton, string> = {
  gris: "bg-zinc-100 text-zinc-600",
  vert: "bg-marque-500 text-white",
  jaune: "bg-or-400 text-zinc-900",
  rouge: "bg-rouge-600 text-white",
  bleu: "bg-sky-500 text-white",
};

export function Badge({
  ton = "gris",
  children,
  titre,
}: {
  ton?: Ton;
  children: ReactNode;
  titre?: string;
}) {
  return (
    <span
      title={titre}
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap",
        TONS[ton],
      )}
    >
      {children}
    </span>
  );
}

/** Icône dans une pastille ronde colorée (style des listes). */
export function Pastille({
  ton = "vert",
  children,
  taille = "md",
}: {
  ton?: Ton;
  children: ReactNode;
  taille?: "sm" | "md" | "lg";
}) {
  const t = {
    sm: "size-7 [&_svg]:size-3.5",
    md: "size-9 [&_svg]:size-4",
    lg: "size-11 [&_svg]:size-5",
  }[taille];
  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-full",
        t,
        PASTILLES[ton],
      )}
    >
      {children}
    </span>
  );
}

type Variante = "principal" | "secondaire" | "danger" | "discret" | "sombre";

export function Bouton({
  variante = "secondaire",
  className,
  chargement,
  onClick,
  disabled,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante;
  /** Opération en cours : bouton grisé avec une roue qui tourne. */
  chargement?: boolean;
}) {
  // Une action longue (calcul, fichier Excel…) grise le bouton jusqu'à la fin :
  // on ne peut pas cliquer deux fois, et l'on voit que le système travaille.
  const [occupe, setOccupe] = useState(false);
  const enCours = chargement || occupe;
  const v: Record<Variante, string> = {
    principal:
      "bg-marque-500 text-white shadow-sm shadow-marque-500/20 hover:bg-marque-600 hover:shadow-md hover:shadow-marque-500/25 disabled:bg-marque-200 disabled:shadow-none",
    secondaire:
      "bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50 hover:ring-zinc-300 disabled:text-zinc-400",
    danger:
      "bg-rouge-100 text-rouge-600 hover:bg-rouge-600 hover:text-white disabled:opacity-50",
    discret: "px-2! text-marque-700 hover:bg-marque-50 disabled:text-zinc-400",
    sombre: "bg-nuit text-white hover:bg-black disabled:opacity-50",
  };
  return (
    <button
      {...props}
      disabled={disabled || enCours}
      aria-busy={enCours || undefined}
      onClick={(e) => {
        const r = onClick?.(e) as unknown;
        if (r && typeof (r as Promise<unknown>).then === "function") {
          setOccupe(true);
          (r as Promise<unknown>).finally(() => setOccupe(false)).catch(() => undefined);
        }
      }}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-[13px] font-medium transition-all duration-200 hover:-translate-y-px active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:hover:translate-y-0 [&_svg]:size-4 [&_svg]:transition-transform",
        enCours && "cursor-wait! [&>svg:not(.roue)]:hidden",
        v[variante],
        className,
      )}
    >
      {enCours && <Loader2 className="roue animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

const ANNONCE: Record<string, { titre: string; icone: typeof Info; couleur: string }> = {
  vert: { titre: "C’est fait", icone: CheckCircle2, couleur: "bg-marque-50 text-marque-600" },
  rouge: { titre: "L’opération n’a pas abouti", icone: XCircle, couleur: "bg-rouge-100 text-rouge-600" },
  jaune: { titre: "À noter", icone: TriangleAlert, couleur: "bg-or-100 text-or-700" },
  bleu: { titre: "Information", icone: Info, couleur: "bg-zinc-100 text-zinc-600" },
};

/**
 * Résultat d'une action (réussite ou échec), affiché dans une fenêtre au centre de
 * l'écran : on ne le rate pas. Rien n'est affiché tant qu'il n'y a pas de message.
 */
export function Annonce({ ton = "vert", fermer, children }: { ton?: Ton; fermer: () => void; children: ReactNode }) {
  const ouverte = children !== null && children !== undefined && children !== false && children !== "";
  useEffect(() => {
    if (!ouverte) return;
    const f = (e: KeyboardEvent) => (e.key === "Escape" || e.key === "Enter") && fermer();
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [ouverte, fermer]);
  if (!ouverte) return null;
  const a = ANNONCE[ton] ?? ANNONCE.bleu;
  const Icone = a.icone;
  return createPortal(
    <div className="fixed inset-0 z-[60] animate-voile overflow-y-auto bg-nuit/40 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md animate-fenetre rounded-3xl bg-white p-6 text-center shadow-2xl" role="alertdialog" aria-modal="true" aria-label={a.titre}>
          <div className={cx("mx-auto mb-4 flex size-12 items-center justify-center rounded-full", a.couleur)}>
            <Icone className="size-6" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-encre">{a.titre}</h3>
          <div className="text-[13px] leading-relaxed text-zinc-600">{children}</div>
          <div className="mt-6 flex justify-center">
            <Bouton variante={ton === "rouge" ? "sombre" : "principal"} autoFocus onClick={fermer} className="min-w-28">
              OK
            </Bouton>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Barre de remplissage : vert, puis jaune vers la fin, rouge quand c'est plein. */
export function Jauge({ valeur, max, className }: { valeur: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((valeur / max) * 100)) : valeur > 0 ? 100 : 0;
  const couleur = valeur >= max ? "bg-rouge-600" : pct >= 80 ? "bg-or-400" : "bg-marque-500";
  return (
    <div className={cx("h-2 overflow-hidden rounded-full bg-zinc-200", className)} role="progressbar" aria-valuenow={valeur} aria-valuemax={max}>
      <div className={cx("h-full rounded-full transition-all", couleur)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Champ({
  libelle,
  aide,
  bulle,
  erreur,
  children,
  className,
}: {
  libelle: string;
  aide?: string;
  /** Explication plus longue, dans un « ? » à côté du libellé. */
  bulle?: ReactNode;
  /** Champ à remplir ou mal rempli : cadre rouge et message sous le champ. */
  erreur?: string | null;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label
      className={cx(
        "flex flex-col gap-1.5 text-sm",
        erreur && "[&_input]:border-rouge-600 [&_input]:bg-rouge-100/50 [&_select]:border-rouge-600 [&_select]:bg-rouge-100/50",
        className,
      )}
    >
      <span className={cx("flex items-center gap-1.5 text-xs font-medium", erreur ? "text-rouge-600" : "text-zinc-500")}>
        {libelle}
        {bulle && <Aide>{bulle}</Aide>}
      </span>
      {children}
      {erreur ? <span className="text-[11px] font-medium text-rouge-600">{erreur}</span> : aide && <span className="text-[11px] text-zinc-400">{aide}</span>}
    </label>
  );
}

const NOMS_MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

/**
 * Choix d'un mois (valeur « AAAA-MM ») par deux listes : mois et année.
 * Remplace <input type="month">, qui s'affiche comme une simple case de texte dans certains navigateurs.
 */
export function ChoixMois({
  value,
  onChange,
  annees = 6,
  className,
}: {
  value: string;
  onChange: (mois: string) => void;
  /** Nombre d'années proposées avant l'année en cours (on propose aussi l'année suivante). */
  annees?: number;
  className?: string;
}) {
  // Choix incomplet (mois sans année, ou l'inverse) : gardé ici tant que la valeur est vide
  const [partiel, setPartiel] = useState({ a: "", m: "" });
  const a = value ? value.slice(0, 4) : partiel.a;
  const m = value ? value.slice(5, 7) : partiel.m;
  const actuelle = new Date().getFullYear();
  const liste = Array.from({ length: annees + 2 }, (_, i) => String(actuelle + 1 - i));
  if (a && !liste.includes(a)) liste.push(a);
  const changer = (na: string, nm: string) => {
    setPartiel({ a: na, m: nm });
    onChange(na && nm ? `${na}-${nm}` : "");
  };
  return (
    <div className={cx("flex gap-2", className)}>
      <select value={m} onChange={(e) => changer(a, e.target.value)} className={cx(styleSaisie, "min-w-0 flex-1 cursor-pointer pr-8")} aria-label="Mois">
        <option value="">— Mois —</option>
        {NOMS_MOIS.map((n, i) => (
          <option key={n} value={String(i + 1).padStart(2, "0")}>
            {n}
          </option>
        ))}
      </select>
      <select value={a} onChange={(e) => changer(e.target.value, m)} className={cx(styleSaisie, "w-36 shrink-0 cursor-pointer pr-8")} aria-label="Année">
        <option value="">— Année —</option>
        {liste.map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>
    </div>
  );
}

const styleSaisie =
  "rounded-xl border border-transparent bg-zinc-100/80 px-3 py-2 text-[13px] text-encre outline-none transition placeholder:text-zinc-400 hover:bg-zinc-100 focus:border-marque-300 focus:bg-white focus:ring-4 focus:ring-marque-100 disabled:opacity-60";

export function Saisie(props: React.ComponentProps<"input">) {
  return <input {...props} className={cx(styleSaisie, props.className)} />;
}

export function Zone(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cx(styleSaisie, "min-h-20", props.className)}
    />
  );
}

export function Liste({
  options,
  vide,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  options: { valeur: string | number; libelle: string }[];
  vide?: string;
}) {
  return (
    <select
      {...props}
      className={cx(styleSaisie, "cursor-pointer pr-8", props.className)}
    >
      {vide !== undefined && <option value="">{vide}</option>}
      {options.map((o) => (
        <option key={o.valeur} value={o.valeur}>
          {o.libelle}
        </option>
      ))}
    </select>
  );
}

export function Carte({
  titre,
  actions,
  children,
  className,
}: {
  titre?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("rounded-3xl bg-white p-5 shadow-doux", className)}>
      {(titre || actions) && (
        <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[15px] font-semibold text-encre">{titre}</h2>
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        </header>
      )}
      {children}
    </section>
  );
}

export function EnTete({
  titre,
  sousTitre,
  actions,
}: {
  titre: string;
  sousTitre?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-3xl">
        <h1 className="text-[26px] font-semibold tracking-tight text-encre">
          {titre}
        </h1>
        {sousTitre && (
          <p className="mt-1 text-[13px] leading-relaxed text-zinc-500">
            {sousTitre}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Alerte({
  ton = "rouge",
  children,
}: {
  ton?: Ton;
  children: ReactNode;
}) {
  return (
    <div
      className={cx(
        "flex items-start gap-2.5 rounded-2xl px-4 py-3 text-[13px] leading-relaxed",
        TONS[ton],
      )}
    >
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Chiffre({
  libelle,
  valeur,
  ton,
  detail,
  icone,
  href,
}: {
  libelle: string;
  valeur: ReactNode;
  ton?: Ton;
  detail?: ReactNode;
  icone?: ReactNode;
  /** Rend la carte cliquable vers la page des données correspondantes. */
  href?: string;
}) {
  const contenu = (
    <>
      {icone && (
        <Pastille ton={ton ?? "vert"} taille="lg">
          {icone}
        </Pastille>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-xs text-zinc-500">{libelle}</div>
        <div className="mt-0.5 text-2xl font-semibold tabular-nums text-encre">
          {valeur}
        </div>
        {detail && (
          <div className="mt-1 text-[11px] text-zinc-400">{detail}</div>
        )}
      </div>
      {href && (
        <ChevronRight
          className="mt-1 size-4 shrink-0 text-zinc-300 transition-colors group-hover:text-marque-600"
          aria-hidden
        />
      )}
    </>
  );
  const classe = "flex items-start gap-3 rounded-3xl bg-white p-5 shadow-doux";
  if (!href) return <div className={classe}>{contenu}</div>;
  return (
    <Link
      href={href}
      className={cx(
        classe,
        "group transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:ring-1 hover:ring-marque-200",
      )}
    >
      {contenu}
    </Link>
  );
}

/** Barre de progression fine (valeur entre 0 et 100). */
export function Progression({
  valeur,
  ton = "vert",
}: {
  valeur: number;
  ton?: Ton;
}) {
  const c = {
    vert: "bg-marque-500",
    jaune: "bg-or-400",
    rouge: "bg-rouge-600",
    bleu: "bg-sky-500",
    gris: "bg-zinc-400",
  }[ton];
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100"
      role="progressbar"
      aria-valuenow={Math.round(valeur)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cx("h-full rounded-full transition-all duration-700", c)}
        style={{ width: `${Math.min(100, Math.max(0, valeur))}%` }}
      />
    </div>
  );
}

export function Modale({
  titre,
  ouverte,
  fermer,
  children,
  large,
}: {
  titre: string;
  ouverte: boolean;
  fermer: () => void;
  children: ReactNode;
  large?: boolean;
}) {
  useEffect(() => {
    if (!ouverte) return;
    const f = (e: KeyboardEvent) => e.key === "Escape" && fermer();
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [ouverte, fermer]);
  if (!ouverte) return null;
  return (
    // Un clic à côté de la fenêtre ne la ferme pas (on ne perd pas une saisie par erreur) :
    // seuls la croix, un bouton « Annuler » ou la touche Échap la ferment.
    // Rendue directement dans <body> : centrée sur tout l'écran, voile flou sur toute la fenêtre,
    // quelle que soit la page qui l'ouvre (l'animation des pages ne la décale plus).
    createPortal(
      <div className="fixed inset-0 z-50 animate-voile overflow-y-auto bg-nuit/40 backdrop-blur-sm">
        <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
          <div
            className={cx(
              "w-full animate-fenetre rounded-3xl bg-white p-6 shadow-2xl",
              large ? "max-w-3xl" : "max-w-lg",
            )}
            role="dialog"
            aria-modal="true"
            aria-label={titre}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <h3 className="text-lg font-semibold text-encre">{titre}</h3>
              <button
                onClick={fermer}
                className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                aria-label="Fermer"
              >
                <X className="size-4" />
              </button>
            </div>
            {children}
          </div>
        </div>
      </div>,
      document.body,
    )
  );
}

export function Chargement({ texte = "Chargement…" }: { texte?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-zinc-400">
      <Loader2 className="size-4 animate-spin" aria-hidden /> {texte}
    </div>
  );
}

export function Vide({ children }: { children: ReactNode }) {
  return (
    <div className="py-12 text-center text-sm text-zinc-400">{children}</div>
  );
}

/** Tableau épuré : en-têtes discrets, lignes séparées par un filet léger. */
export function Tableau({
  children,
  className,
  fixe,
}: {
  children: ReactNode;
  className?: string;
  fixe?: boolean;
}) {
  return (
    <div className={cx("-mx-1 overflow-x-auto", className)}>
      <table
        className={cx(
          "w-full border-separate border-spacing-0 text-left text-[13px] [&_td]:border-b [&_td]:border-zinc-100 [&_td]:px-3 [&_td]:py-3 [&_th]:px-3 [&_th]:pb-3 [&_th]:text-[11px] [&_th]:font-medium [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-zinc-400 [&_tbody_tr]:transition-colors [&_tbody_tr]:duration-200 [&_tbody_tr:hover]:bg-zinc-50/80 [&_tbody_tr:last-child_td]:border-b-0",
          fixe && "table-fixed",
        )}
      >
        {children}
      </table>
    </div>
  );
}

/** Sélecteur en pastilles (ex. choix du lot). */
export function Segments<T extends string | number>({
  valeur,
  options,
  changer,
}: {
  valeur: T | null;
  options: { valeur: T; libelle: ReactNode }[];
  changer: (v: T) => void;
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-2xl bg-white p-1 shadow-doux">
      {options.map((o) => (
        <button
          key={String(o.valeur)}
          type="button"
          aria-pressed={o.valeur === valeur}
          onClick={() => changer(o.valeur)}
          className={cx(
            "rounded-xl px-3.5 py-1.5 text-[13px] font-medium transition-all duration-200",
            o.valeur === valeur
              ? "bg-nuit text-white"
              : "text-zinc-500 hover:bg-zinc-100 hover:text-encre",
          )}
        >
          {o.libelle}
        </button>
      ))}
    </div>
  );
}

/**
 * Petit « ? » qui explique un bouton ou un champ : l'info-bulle s'ouvre en douceur
 * au survol (ou au clavier), sans déclencher le bouton qui la contient.
 */
export function Aide({ children, cote = "bas" }: { children: ReactNode; cote?: "bas" | "haut" }) {
  // La bulle s'affiche au-dessus de toute la page (portail) : elle n'est ni coupée
  // par un tableau, ni cachée par les boutons voisins, et reste dans l'écran.
  const [pos, setPos] = useState<{ x: number; y: number; haut: boolean } | null>(null);
  const [visible, setVisible] = useState(false);
  const largeur = 288;

  function ouvrir(e: React.SyntheticEvent<HTMLSpanElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.min(Math.max(r.left + r.width / 2 - largeur / 2, 8), window.innerWidth - largeur - 8);
    const haut = cote === "haut" || r.bottom + 180 > window.innerHeight;
    setPos({ x, y: haut ? r.top - 8 : r.bottom + 8, haut });
    requestAnimationFrame(() => setVisible(true));
  }
  function fermer() {
    setVisible(false);
    setPos(null);
  }

  return (
    <span
      tabIndex={0}
      role="note"
      aria-label="Aide"
      onMouseEnter={ouvrir}
      onMouseLeave={fermer}
      onFocus={ouvrir}
      onBlur={fermer}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      className="relative inline-flex size-4 shrink-0 cursor-help items-center justify-center rounded-full bg-zinc-200 text-[10px] font-bold text-zinc-600 outline-none transition-colors hover:bg-marque-500 hover:text-white focus:bg-marque-500 focus:text-white"
    >
      ?
      {pos &&
        createPortal(
          <span
            role="tooltip"
            style={{ left: pos.x, top: pos.y, width: largeur }}
            className={cx(
              "pointer-events-none fixed z-[100] rounded-2xl bg-nuit px-4 py-3 text-left text-[12px] leading-relaxed font-normal whitespace-normal text-white shadow-xl transition-all duration-200 ease-out",
              pos.haut ? "-translate-y-full origin-bottom" : "origin-top",
              visible ? "scale-100 opacity-100" : "scale-95 opacity-0",
            )}
          >
            {children}
          </span>,
          document.body,
        )}
    </span>
  );
}

/** Bouton rond ne contenant qu'une icône (libellé en info-bulle et pour les lecteurs d'écran). */
export function BoutonIcone({
  libelle,
  ton = "gris",
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  libelle: string;
  ton?: "gris" | "rouge" | "vert";
}) {
  const c = {
    gris: "text-zinc-500 hover:bg-zinc-100 hover:text-encre",
    vert: "text-marque-600 hover:bg-marque-50",
    rouge: "text-zinc-400 hover:bg-rouge-100 hover:text-rouge-600",
  }[ton];
  return (
    <button
      {...props}
      title={libelle}
      aria-label={libelle}
      className={cx(
        "inline-flex size-8 items-center justify-center rounded-full transition-all duration-200 hover:scale-110 active:scale-95 disabled:pointer-events-none disabled:opacity-30 [&_svg]:size-4",
        c,
        props.className,
      )}
    >
      {children}
    </button>
  );
}

/** Zone de dépôt d'un fichier (glisser-déposer ou parcourir), puis envoi. */
export function ZoneFichier({
  accept,
  envoi,
  envoyer,
  libelleBouton = "Importer",
  aide,
}: {
  accept: string;
  envoi: boolean;
  envoyer: (f: File) => void;
  libelleBouton?: string;
  aide?: string;
}) {
  const [fichier, setFichier] = useState<File | null>(null);
  const [survol, setSurvol] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setSurvol(true);
        }}
        onDragLeave={() => setSurvol(false)}
        onDrop={(e) => {
          e.preventDefault();
          setSurvol(false);
          const f = e.dataTransfer.files?.[0];
          if (f) setFichier(f);
        }}
        className={cx(
          "flex min-w-72 flex-1 cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed px-4 py-3 transition-colors",
          survol
            ? "border-marque-500 bg-marque-50"
            : "border-zinc-200 hover:border-marque-300 hover:bg-zinc-50",
        )}
      >
        <Pastille ton={fichier ? "vert" : "gris"}>
          <FileSpreadsheet />
        </Pastille>
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-medium">
            {fichier
              ? fichier.name
              : "Déposez le fichier ici ou cliquez pour le choisir"}
          </span>
          <span className="block text-[11px] text-zinc-400">
            {fichier
              ? `${(fichier.size / 1024 / 1024).toFixed(1)} Mo`
              : (aide ?? "Fichier Excel (.xlsx)")}
          </span>
        </span>
        <input
          type="file"
          accept={accept}
          className="sr-only"
          onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
        />
      </label>
      <Bouton
        variante="principal"
        disabled={!fichier || envoi}
        onClick={() => fichier && envoyer(fichier)}
      >
        {envoi ? <Loader2 className="animate-spin" /> : <Upload />}
        {envoi ? "Import en cours…" : libelleBouton}
      </Bouton>
    </div>
  );
}

/**
 * Confirmation avant une action irréversible, dans la même fenêtre que le reste de
 * l'application (au lieu de la boîte grise du navigateur).
 * `const [confirmation, demander] = useConfirmation();` puis `if (!(await demander("…"))) return;`
 * et placer `{confirmation}` dans la page.
 */
export function useConfirmation(): [ReactNode, (question: string, libelle?: string) => Promise<boolean>] {
  const [q, setQ] = useState<{ question: string; libelle: string; repondre: (oui: boolean) => void } | null>(null);
  const demander = (question: string, libelle = "Oui, retirer") =>
    new Promise<boolean>((repondre) => setQ({ question, libelle, repondre }));
  const repondre = (oui: boolean) => {
    q?.repondre(oui);
    setQ(null);
  };
  const fenetre = (
    <Modale titre="Confirmer" ouverte={!!q} fermer={() => repondre(false)}>
      <p className="text-[13px] leading-relaxed text-zinc-600">{q?.question}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Bouton onClick={() => repondre(false)}>Annuler</Bouton>
        <Bouton variante="danger" onClick={() => repondre(true)}>
          {q?.libelle}
        </Bouton>
      </div>
    </Modale>
  );
  return [fenetre, demander];
}
