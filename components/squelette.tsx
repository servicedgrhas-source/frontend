/*
 * Squelettes de chargement (DG, 17/11/2026) : des blocs à la forme du contenu qui arrive, traversés
 * d'un reflet (classe « os » de globals.css), au lieu d'un simple « Chargement… ».
 */

/** Un bloc du squelette ; « sombre » sur un fond foncé. */
export function Os({ className = "", sombre }: { className?: string; sombre?: boolean }) {
  return <div className={`os ${sombre ? "os-sombre" : ""} ${className}`} aria-hidden />;
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
