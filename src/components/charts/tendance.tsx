import { formatMois } from "@/lib/format";
import type { PointMois } from "@/lib/kpi";

/** Courbes mensuelles : fiches déclarées vs fiches clôturées. */
export function GraphiqueTendance({ points }: { points: PointMois[] }) {
  if (!points.length) {
    return <p className="py-8 text-center text-sm text-zinc-500">Aucune donnée.</p>;
  }

  const L = 720;
  const H = 260;
  const marge = { haut: 16, droite: 16, bas: 40, gauche: 34 };
  const largeurTrace = L - marge.gauche - marge.droite;
  const hauteurTrace = H - marge.haut - marge.bas;

  const max = Math.max(...points.flatMap((p) => [p.declarees, p.cloturees]), 1);
  const echelon = points.length > 1 ? largeurTrace / (points.length - 1) : 0;
  const x = (i: number) => marge.gauche + echelon * i;
  const y = (v: number) => marge.haut + hauteurTrace - (v / max) * hauteurTrace;

  const chemin = (cle: "declarees" | "cloturees") =>
    points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p[cle]).toFixed(1)}`).join(" ");

  const aire = `${chemin("declarees")} L ${x(points.length - 1).toFixed(1)} ${(
    marge.haut + hauteurTrace
  ).toFixed(1)} L ${x(0).toFixed(1)} ${(marge.haut + hauteurTrace).toFixed(1)} Z`;

  const graduations = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${L} ${H}`}
        className="h-auto w-full min-w-[560px]"
        role="img"
        aria-label="Évolution mensuelle des fiches déclarées et clôturées"
      >
        {graduations.map((g) => (
          <g key={g}>
            <line
              x1={marge.gauche}
              x2={L - marge.droite}
              y1={y(g)}
              y2={y(g)}
              className="stroke-zinc-200 dark:stroke-zinc-800"
            />
            <text x={4} y={y(g) + 4} className="fill-zinc-400 text-[10px]">
              {g}
            </text>
          </g>
        ))}

        <path d={aire} className="fill-indigo-500/10" />
        <path d={chemin("declarees")} fill="none" className="stroke-indigo-500" strokeWidth={2.5} />
        <path
          d={chemin("cloturees")}
          fill="none"
          className="stroke-emerald-500"
          strokeWidth={2.5}
          strokeDasharray="5 4"
        />

        {points.map((p, i) => (
          <g key={p.mois}>
            <circle cx={x(i)} cy={y(p.declarees)} r={3} className="fill-indigo-500">
              <title>
                {formatMois(p.mois)} — {p.declarees} déclarée(s)
              </title>
            </circle>
            <circle cx={x(i)} cy={y(p.cloturees)} r={3} className="fill-emerald-500">
              <title>
                {formatMois(p.mois)} — {p.cloturees} clôturée(s)
              </title>
            </circle>
            {i % Math.ceil(points.length / 8) === 0 || i === points.length - 1 ? (
              <text
                x={x(i)}
                y={H - marge.bas + 18}
                textAnchor="middle"
                className="fill-zinc-500 text-[10px] dark:fill-zinc-400"
              >
                {formatMois(p.mois)}
              </text>
            ) : null}
          </g>
        ))}
      </svg>

      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-0.5 w-5 rounded bg-indigo-500" /> Déclarées
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-0.5 w-5 rounded bg-emerald-500" /> Clôturées
        </span>
      </div>
    </div>
  );
}
