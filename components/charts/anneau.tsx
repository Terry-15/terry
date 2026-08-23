import { formatNombre } from "@/lib/format";

export interface PartAnneau {
  libelle: string;
  valeur: number;
  couleur: string;
}

/** Anneau de répartition (gravité, statuts…). */
export function GraphiqueAnneau({
  parts,
  titreCentre,
  valeurCentre,
}: {
  parts: PartAnneau[];
  titreCentre?: string;
  valeurCentre?: string;
}) {
  const total = parts.reduce((s, p) => s + p.valeur, 0);

  if (!total) {
    return <p className="py-6 text-center text-sm text-zinc-500">Aucune donnée.</p>;
  }

  const rayon = 60;
  const epaisseur = 18;
  const circonference = 2 * Math.PI * rayon;

  // Position de départ de chaque arc = somme des arcs précédents.
  const arcs = parts.reduce<Array<PartAnneau & { longueur: number; depart: number }>>(
    (acc, p) => {
      const longueur = (p.valeur / total) * circonference;
      const depart = acc.length ? acc[acc.length - 1].depart + acc[acc.length - 1].longueur : 0;
      acc.push({ ...p, longueur, depart });
      return acc;
    },
    [],
  );

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center">
      <svg viewBox="0 0 160 160" className="h-40 w-40 shrink-0 -rotate-90" role="img"
        aria-label="Répartition en anneau">
        <circle
          cx={80}
          cy={80}
          r={rayon}
          fill="none"
          strokeWidth={epaisseur}
          className="stroke-zinc-100 dark:stroke-zinc-800"
        />
        {arcs.map((p) => (
          <circle
            key={p.libelle}
            cx={80}
            cy={80}
            r={rayon}
            fill="none"
            stroke={p.couleur}
            strokeWidth={epaisseur}
            strokeDasharray={`${p.longueur} ${circonference - p.longueur}`}
            strokeDashoffset={-p.depart}
          >
            <title>
              {p.libelle} : {p.valeur} ({formatNombre((p.valeur / total) * 100, 1)} %)
            </title>
          </circle>
        ))}
        {valeurCentre ? (
          <text
            x={80}
            y={80}
            textAnchor="middle"
            dominantBaseline="central"
            transform="rotate(90 80 80)"
            className="fill-zinc-900 text-xl font-semibold dark:fill-zinc-100"
          >
            {valeurCentre}
          </text>
        ) : null}
      </svg>

      <ul className="w-full max-w-56 space-y-2 text-sm">
        {parts.map((p) => (
          <li key={p.libelle} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: p.couleur }}
              />
              <span className="truncate text-zinc-600 dark:text-zinc-300">{p.libelle}</span>
            </span>
            <span className="shrink-0 tabular-nums text-zinc-900 dark:text-zinc-100">
              {p.valeur}
            </span>
          </li>
        ))}
      </ul>
      {titreCentre ? <span className="sr-only">{titreCentre}</span> : null}
    </div>
  );
}
