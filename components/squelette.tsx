/*
 * Squelettes de chargement (DG, 17/11/2026) : des blocs à la forme du contenu qui arrive, traversés
 * d'un reflet (classe « os » de globals.css), au lieu d'un simple « Chargement… ».
 */

/** Un bloc du squelette ; « sombre » sur un fond foncé. */
export function Os({ className = "", sombre, style }: { className?: string; sombre?: boolean; style?: React.CSSProperties }) {
  return <div className={`os ${sombre ? "os-sombre" : ""} ${className}`} style={style} aria-hidden />;
}

/** Le centre de contrôle des effectifs, pendant son calcul. */
export function SqueletteCentreControle() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Chargement du centre de contrôle">
      <div className="space-y-4 rounded-3xl bg-nuit p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <Os sombre className="h-3 w-44" />
            <Os sombre className="h-10 w-40" />
          </div>
          <div className="flex gap-3">
            <Os sombre className="h-16 w-28 rounded-2xl" />
            <Os sombre className="h-16 w-28 rounded-2xl" />
          </div>
        </div>
        <Os sombre className="h-3 w-full rounded-full" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="space-y-2">
              <Os sombre className="h-3 w-24" />
              <Os sombre className="h-6 w-20" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {Array.from({ length: 2 }, (_, g) => (
          <div key={g} className="space-y-3 rounded-3xl border border-zinc-200 p-4">
            <div className="flex justify-between">
              <Os className="h-5 w-56" />
              <Os className="h-7 w-20" />
            </div>
            <Os className="h-2 w-full rounded-full" />
            {Array.from({ length: g ? 6 : 3 }, (_, i) => (
              <div key={i} className="flex items-center gap-4 rounded-2xl bg-zinc-50 p-3">
                <div className="flex-1 space-y-2">
                  <Os className="h-4 w-3/4" />
                  <Os className="h-3 w-1/2" />
                </div>
                <Os className="h-7 w-16" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Tout le tableau de bord du personnel : les quatre cartes, puis le centre de contrôle. */
export function SqueletteTableauPersonnel() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Chargement du tableau de bord du personnel">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex items-start gap-3 rounded-3xl bg-white p-5 shadow-doux">
            <Os className="size-12 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2.5">
              <Os className="h-3 w-28" />
              <Os className="h-8 w-32" />
              <Os className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-4 rounded-3xl bg-white p-5 shadow-doux">
        <div className="flex justify-between">
          <Os className="h-5 w-64" />
          <Os className="h-4 w-80" />
        </div>
        <SqueletteCentreControle />
      </div>
    </div>
  );
}

/**
 * La page d'accueil pendant son calcul (18/11/2026) : les six chiffres, les lots, et la colonne
 * « Bases à fiabiliser », à leur place.
 */
export function SqueletteAccueil() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Chargement du tableau de bord">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex gap-4 rounded-3xl bg-white p-6 shadow-doux">
            <Os className="size-14 shrink-0 rounded-full" />
            <div className="flex-1 space-y-3">
              <Os className="h-4 w-3/4" />
              <Os className="h-8 w-28" />
              <Os className="h-3 w-full" />
              <Os className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
      {Array.from({ length: 2 }, (_, c) => (
        <div key={c} className="space-y-4 rounded-3xl bg-white p-6 shadow-doux">
          <div className="flex justify-between">
            <Os className="h-5 w-56" />
            <Os className="h-4 w-28" />
          </div>
          {c === 0 ? (
            <div className="flex h-40 items-end gap-2">
              {[40, 70, 55, 90, 30, 65, 80, 45, 60, 75].map((h, i) => (
                <Os key={i} className="flex-1 rounded-t-lg" style={{ height: `${h}%` }} />
              ))}
            </div>
          ) : (
            Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Os className="size-10 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <Os className="h-4 w-1/2" />
                  <Os className="h-2 w-full rounded-full" />
                </div>
              </div>
            ))
          )}
        </div>
      ))}
    </div>
  );
}

/** La colonne « Bases à fiabiliser » pendant le calcul. */
export function SqueletteFiabiliser() {
  return (
    <div className="space-y-5 rounded-3xl bg-white p-6 shadow-doux" aria-hidden>
      <Os className="h-5 w-48" />
      <Os className="h-3 w-full" />
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex gap-3">
          <Os className="h-6 w-12" />
          <div className="flex-1 space-y-2">
            <Os className="h-3 w-full" />
            <Os className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * L'application pendant l'ouverture de la session (18/11/2026) : le menu à gauche et la page, en
 * squelette, au lieu d'un « Ouverture de la session… » sur fond vide.
 */
export function SqueletteApplication() {
  return (
    <div className="flex min-h-screen gap-6 p-4" aria-busy="true" aria-label="Ouverture de la session">
      <div className="hidden w-[300px] shrink-0 space-y-6 rounded-3xl bg-nuit p-6 lg:block">
        <div className="flex items-center gap-3">
          <Os sombre className="size-16 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Os sombre className="h-3 w-full" />
            <Os sombre className="h-3 w-2/3" />
          </div>
        </div>
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Os sombre className="size-6 rounded-lg" />
            <Os sombre className="h-4 flex-1" />
          </div>
        ))}
      </div>
      <div className="min-w-0 flex-1 space-y-6 py-2">
        <Os className="h-20 w-full rounded-3xl" />
        <div className="space-y-2">
          <Os className="h-8 w-64" />
          <Os className="h-4 w-48" />
        </div>
        <SqueletteAccueil />
      </div>
    </div>
  );
}

/** Une personne du rapprochement (rapport à gauche, nos bases à droite), pendant le chargement. */
export function SqueletteCartesRapprochement({ n = 3 }: { n?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Chargement des personnes">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="space-y-4 rounded-3xl bg-white p-4 shadow-doux">
          <div className="flex items-center gap-3">
            <Os className="size-4 rounded" />
            <Os className="h-4 w-16" />
            <Os className="h-4 w-48" />
            <Os className="h-6 w-28 rounded-full" />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {[0, 1].map((c) => (
              <div key={c} className="space-y-2 rounded-2xl bg-zinc-50 p-3">
                <Os className="h-3 w-32" />
                <Os className="h-5 w-56" />
                {Array.from({ length: 5 }, (_, k) => (
                  <div key={k} className="flex gap-3">
                    <Os className="h-3 w-24" />
                    <Os className="h-3 w-40" />
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Os className="h-10 w-52 rounded-xl" />
            <Os className="h-10 w-36 rounded-xl" />
            <Os className="h-10 w-44 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}
