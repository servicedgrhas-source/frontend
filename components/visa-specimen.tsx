/**
 * Spécimen de visa (paraphe) posé juste à droite d'une ligne de l'en-tête d'une note (DG, 30/10/2026) :
 * le service des recrutements, la direction des recrutements et du suivi des carrières, la direction
 * générale. Chacun a son tracé, pour qu'on les distingue d'un coup d'œil ; ce sont des spécimens
 * provisoires (réunion du 29/10/2026), remplaçables par les vrais visas.
 */

export type StyleVisa = "SERVICE" | "DIRECTION" | "DG";

/** « Jean Paul MOUKOKO » → « JPM » */
export const initialesVisa = (nom: string) =>
  nom
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((m) => m[0].toUpperCase())
    .join("")
    .slice(0, 3);

const ENCRE = "#1e3a8a";
const ECRITURE = "'Brush Script MT', 'Segoe Script', 'Lucida Handwriting', cursive";

export function SpecimenVisa({ style, nom, date, className }: { style: StyleVisa; nom: string; date?: string | null; className?: string }) {
  const ini = initialesVisa(nom);
  const titre = `Visa : ${nom}${date ? `, le ${new Date(date).toLocaleDateString("fr-FR")}` : ""}`;
  return (
    <svg viewBox="0 0 96 34" className={className} style={{ width: "24mm", height: "8.5mm" }} role="img" aria-label={titre}>
      <title>{titre}</title>
      {style === "SERVICE" && (
        // Une boucle qui monte, les initiales, un trait souligné qui repart
        <>
          <path d="M4 26 C 10 6, 22 6, 18 20 C 15 30, 8 22, 20 16" fill="none" stroke={ENCRE} strokeWidth="1.6" strokeLinecap="round" />
          <text x="24" y="22" fontFamily={ECRITURE} fontSize="17" fill={ENCRE}>
            {ini}
          </text>
          <path d="M22 27 Q 55 31, 90 22" fill="none" stroke={ENCRE} strokeWidth="1.4" strokeLinecap="round" />
        </>
      )}
      {style === "DIRECTION" && (
        // Les initiales barrées d'une flèche qui monte vers la droite
        <>
          <text x="6" y="24" fontFamily={ECRITURE} fontSize="19" fill={ENCRE} fontStyle="italic">
            {ini}
          </text>
          <path d="M4 30 L 82 8" fill="none" stroke={ENCRE} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M72 8 L 83 7.5 L 79 17" fill="none" stroke={ENCRE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {style === "DG" && (
        // Un trait en zigzag, les initiales, et un point rond à la fin
        <>
          <path d="M3 22 L 12 10 L 18 24 L 26 9" fill="none" stroke={ENCRE} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <text x="30" y="23" fontFamily={ECRITURE} fontSize="18" fill={ENCRE}>
            {ini}
          </text>
          <path d="M30 28 C 50 24, 70 30, 86 26" fill="none" stroke={ENCRE} strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="90" cy="25" r="2" fill={ENCRE} />
        </>
      )}
    </svg>
  );
}
