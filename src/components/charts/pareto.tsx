import { formatNombre } from "@/lib/format";
import type { LignePareto } from "@/lib/kpi";

/**
 * Diagramme de Pareto : barres décroissantes + courbe des pourcentages cumulés,
 * avec repère à 80 % pour identifier les causes prioritaires.
 */
export function GraphiquePareto({ lignes }: { lignes: LignePareto[] }) {
  if (!lignes.length) {
    return <p className="py-8 text-center text-sm text-zinc-500">Aucune donnée sur la période.</p>;
  }

  const L = 720;
  const H = 280;
  const marge = { haut: 16, droite: 44, bas: 74, gauche: 56 };
  const largeurTrace = L - marge.gauche - marge.droite;
  const hauteurTrace = H - marge.haut - marge.bas;

  const max = Math.max(...lignes.map((l) => l.valeur), 1);
  const pas = largeurTrace / lignes.length;
  const largeurBarre = Math.min(pas * 0.62, 56);

  const y = (valeur: number) => marge.haut + hauteurTrace - (valeur / max) * hauteurTrace;
  const yPourcent = (p: number) => marge.haut + hauteurTrace - (p / 100) * hauteurTrace;
  const xCentre = (i: number) => marge.gauche + pas * i + pas / 2;

  const courbe = lignes
    .map((l, i) => `${i === 0 ? "M" : "L"} ${xCentre(i).toFixed(1)} ${yPourcent(l.cumul).toFixed(1)}`)
    .join(" ");

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${L} ${H}`}
        className="h-auto w-full min-w-[560px]"
        role="img"
        aria-label="Diagramme de Pareto des catégories d'erreurs"
      >
        {/* Grille horizontale */}
        {[0, 25, 50, 75, 100].map((p) => (
          <g key={p}>
            <line
              x1={marge.gauche}
              x2={L - marge.droite}
              y1={yPourcent(p)}
              y2={yPourcent(p)}
              className="stroke-zinc-200 dark:stroke-zinc-800"
              strokeWidth={1}
            />
            <text
              x={L - marge.droite + 6}
              y={yPourcent(p) + 4}
              className="fill-zinc-400 text-[10px]"
            >
              {p} %
            </text>
          </g>
        ))}

        {/* Repère 80 % */}
        <line
          x1={marge.gauche}
          x2={L - marge.droite}
          y1={yPourcent(80)}
          y2={yPourcent(80)}
          className="stroke-amber-500"
          strokeWidth={1.5}
          strokeDasharray="6 4"
        />

        {/* Barres */}
        {lignes.map((l, i) => (
          <g key={l.libelle}>
            <rect
              x={xCentre(i) - largeurBarre / 2}
              y={y(l.valeur)}
              width={largeurBarre}
              height={Math.max(marge.haut + hauteurTrace - y(l.valeur), 2)}
              rx={4}
              className="fill-indigo-500/80"
            >
              <title>
                {l.libelle} : {l.valeur} fiche(s), {formatNombre(l.part, 1)} % du total
              </title>
            </rect>
            <text
              x={xCentre(i)}
              y={y(l.valeur) - 6}
              textAnchor="middle"
              className="fill-zinc-500 text-[10px] font-medium dark:fill-zinc-400"
            >
              {l.valeur}
            </text>
            <text
              x={xCentre(i)}
              y={H - marge.bas + 16}
              textAnchor="end"
              transform={`rotate(-32 ${xCentre(i)} ${H - marge.bas + 16})`}
              className="fill-zinc-500 text-[10px] dark:fill-zinc-400"
            >
              {l.libelle.length > 20 ? `${l.libelle.slice(0, 19)}…` : l.libelle}
            </text>
          </g>
        ))}

        {/* Courbe des cumuls */}
        <path d={courbe} fill="none" className="stroke-rose-500" strokeWidth={2} />
        {lignes.map((l, i) => (
          <circle
            key={`pt-${l.libelle}`}
            cx={xCentre(i)}
            cy={yPourcent(l.cumul)}
            r={3.5}
            className="fill-rose-500"
          >
            <title>Cumul : {formatNombre(l.cumul, 1)} %</title>
          </circle>
        ))}

        {/* Axes */}
        <line
          x1={marge.gauche}
          x2={marge.gauche}
          y1={marge.haut}
          y2={marge.haut + hauteurTrace}
          className="stroke-zinc-300 dark:stroke-zinc-700"
        />
        <line
          x1={marge.gauche}
          x2={L - marge.droite}
          y1={marge.haut + hauteurTrace}
          y2={marge.haut + hauteurTrace}
          className="stroke-zinc-300 dark:stroke-zinc-700"
        />
      </svg>
    </div>
  );
}
