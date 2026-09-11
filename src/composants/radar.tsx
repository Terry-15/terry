import { LIBELLES_ATTRIBUT, type CleAttribut } from "@/moteur/types";

/** Radar des attributs : six à huit axes, lisible d'un coup d'œil. */
export function Radar({ cles, valeurs, couleur = "var(--accent)" }: { cles: readonly CleAttribut[]; valeurs: number[]; couleur?: string }) {
  const cx = 130;
  const cy = 118;
  const r = 76;
  const n = valeurs.length;
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const point = (i: number, v: number): [number, number] => [
    cx + (v / 20) * r * Math.cos(angle(i)),
    cy + (v / 20) * r * Math.sin(angle(i)),
  ];
  const enChaine = (vs: number[]) => vs.map((v, i) => point(i, v).map((x) => x.toFixed(1)).join(",")).join(" ");

  return (
    <svg viewBox="0 0 260 236" className="w-full max-w-[260px]" role="img" aria-label="Radar des attributs">
      {[0.33, 0.66, 1].map((part) => (
        <polygon
          key={part}
          points={enChaine(valeurs.map(() => 20 * part))}
          fill="none"
          stroke="var(--bordure)"
          strokeWidth="1"
        />
      ))}
      {valeurs.map((_, i) => {
        const [x, y] = point(i, 20);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--bordure)" strokeWidth="1" />;
      })}
      <polygon points={enChaine(valeurs)} fill={couleur} fillOpacity="0.26" stroke={couleur} strokeWidth="2" />
      {cles.map((cle, i) => {
        const [x, y] = point(i, 24.5);
        const ancre = Math.abs(x - cx) < 6 ? "middle" : x > cx ? "start" : "end";
        return (
          <text
            key={cle}
            x={x}
            y={y}
            textAnchor={ancre}
            fontFamily="var(--font-mono)"
            fontSize="10"
            fill="var(--texte-doux)"
          >
            {LIBELLES_ATTRIBUT[cle]}
          </text>
        );
      })}
    </svg>
  );
}
