"use client";

import { Minus, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

/*
 * Petite carte OpenStreetMap sans bibliothèque (suivi des recenseurs, DG 22/11/2026) : les tuiles
 * sont assemblées à la main (projection de Mercator), la carte se cadre sur les points, se déplace
 * au doigt ou à la souris, se zoome avec + et −. Points de couleur et trajet du jour.
 */

export interface PointCarte {
  id: string;
  lat: number;
  lng: number;
  couleur: string;
  libelle: string;
  /** Le point choisi : plus gros, au-dessus des autres. */
  choisi?: boolean;
}

const TUILE = 256;
/** Le Congo, quand il n'y a encore aucun point. */
const CONGO = { nord: 3.8, sud: -5.1, ouest: 11.1, est: 18.7 };

const versX = (lng: number, z: number) => ((lng + 180) / 360) * TUILE * 2 ** z;
const versY = (lat: number, z: number) => {
  const r = (Math.max(-85, Math.min(85, lat)) * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * TUILE * 2 ** z;
};

export function CarteOsm({ points, trajet = [], hauteur = 520, choisir }: { points: PointCarte[]; trajet?: [number, number][]; hauteur?: number; choisir?: (id: string) => void }) {
  const boite = useRef<HTMLDivElement>(null);
  const [largeur, setLargeur] = useState(800);
  useEffect(() => {
    const el = boite.current;
    if (!el) return;
    const o = new ResizeObserver(() => setLargeur(el.clientWidth));
    o.observe(el);
    setLargeur(el.clientWidth);
    return () => o.disconnect();
  }, []);

  // Cadrage : tous les points (et le trajet), sinon le Congo
  const cadre = useMemo(() => {
    const tous: [number, number][] = [...points.map((p) => [p.lat, p.lng] as [number, number]), ...trajet];
    const b = tous.length
      ? { nord: Math.max(...tous.map((x) => x[0])), sud: Math.min(...tous.map((x) => x[0])), ouest: Math.min(...tous.map((x) => x[1])), est: Math.max(...tous.map((x) => x[1])) }
      : CONGO;
    let z = 16;
    // (une marge pour que les points du bord ne passent pas sous les boutons de zoom)
    while (z > 3 && (versX(b.est, z) - versX(b.ouest, z) > largeur - 160 || versY(b.sud, z) - versY(b.nord, z) > hauteur - 120)) z--;
    return { z, lat: (b.nord + b.sud) / 2, lng: (b.ouest + b.est) / 2 };
  }, [points, trajet, largeur, hauteur]);
  const [vue, setVue] = useState<{ z: number; cx: number; cy: number } | null>(null);
  const cleCadre = `${cadre.z}|${cadre.lat}|${cadre.lng}`;
  const [cadreVu, setCadreVu] = useState(cleCadre);
  // Nouveaux points (autre jour, autre recenseur choisi) : la carte se recadre
  if (cadreVu !== cleCadre) {
    setCadreVu(cleCadre);
    setVue(null);
  }
  const z = vue?.z ?? cadre.z;
  const cx = vue?.cx ?? versX(cadre.lng, z);
  const cy = vue?.cy ?? versY(cadre.lat, z);
  const x0 = cx - largeur / 2;
  const y0 = cy - hauteur / 2;

  const tuiles: { x: number; y: number; cle: string }[] = [];
  const n = 2 ** z;
  for (let tx = Math.floor(x0 / TUILE); tx <= Math.floor((x0 + largeur) / TUILE); tx++)
    for (let ty = Math.floor(y0 / TUILE); ty <= Math.floor((y0 + hauteur) / TUILE); ty++)
      if (ty >= 0 && ty < n) tuiles.push({ x: tx, y: ty, cle: `${z}/${tx}/${ty}` });

  const zoomer = (d: number) => {
    const nz = Math.max(3, Math.min(18, z + d));
    const k = 2 ** (nz - z);
    setVue({ z: nz, cx: cx * k, cy: cy * k });
  };

  // Déplacer la carte au doigt ou à la souris
  const glisse = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);
  const appui = (e: React.PointerEvent) => {
    glisse.current = { x: e.clientX, y: e.clientY, cx, cy };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const bouge = (e: React.PointerEvent) => {
    const g = glisse.current;
    if (g) setVue({ z, cx: g.cx - (e.clientX - g.x), cy: g.cy - (e.clientY - g.y) });
  };
  const lache = () => (glisse.current = null);

  const px = (lat: number, lng: number) => ({ x: versX(lng, z) - x0, y: versY(lat, z) - y0 });
  const chemin = trajet.map(([la, lo]) => px(la, lo));

  return (
    <div ref={boite} className="relative w-full touch-none overflow-hidden rounded-2xl bg-zinc-100 select-none" style={{ height: hauteur }} onPointerDown={appui} onPointerMove={bouge} onPointerUp={lache} onPointerLeave={lache}>
      {tuiles.map((t) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={t.cle}
          src={`https://tile.openstreetmap.org/${z}/${((t.x % n) + n) % n}/${t.y}.png`}
          alt=""
          draggable={false}
          className="pointer-events-none absolute"
          style={{ left: t.x * TUILE - x0, top: t.y * TUILE - y0, width: TUILE, height: TUILE }}
        />
      ))}
      {chemin.length > 1 && (
        <svg className="pointer-events-none absolute inset-0" width={largeur} height={hauteur}>
          <polyline points={chemin.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke="#0b6b3a" strokeWidth={3} strokeOpacity={0.75} strokeLinejoin="round" />
          {chemin.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={2.5} fill="#0b6b3a" />
          ))}
        </svg>
      )}
      {[...points]
        .sort((a, b) => Number(!!a.choisi) - Number(!!b.choisi))
        .map((p) => {
          const { x, y } = px(p.lat, p.lng);
          return (
            <button
              key={p.id}
              type="button"
              title={p.libelle}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => choisir?.(p.id)}
              className="group absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer"
              style={{ left: x, top: y }}
            >
              <span className={`block rounded-full border-2 border-white shadow-md ${p.choisi ? "size-5" : "size-3.5"}`} style={{ background: p.couleur }} />
              <span className={`absolute top-full left-1/2 mt-1 -translate-x-1/2 rounded bg-white/90 px-1 text-[10px] font-semibold whitespace-nowrap text-zinc-800 shadow ${p.choisi ? "" : "hidden group-hover:block"}`}>{p.libelle}</span>
            </button>
          );
        })}
      <div className="absolute top-2 right-2 flex flex-col gap-1">
        <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => zoomer(1)} className="cursor-pointer rounded-lg bg-white p-1.5 shadow hover:bg-zinc-50" aria-label="Zoomer">
          <Plus className="size-4" />
        </button>
        <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => zoomer(-1)} className="cursor-pointer rounded-lg bg-white p-1.5 shadow hover:bg-zinc-50" aria-label="Dézoomer">
          <Minus className="size-4" />
        </button>
      </div>
      <div className="absolute right-1 bottom-1 rounded bg-white/80 px-1 text-[10px] text-zinc-600">© OpenStreetMap</div>
    </div>
  );
}
