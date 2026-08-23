import { formatNombre } from "@/lib/format";

export interface BarreHorizontale {
  libelle: string;
  valeur: number;
  /** Classe Tailwind de remplissage (ex. `bg-indigo-500`). */
  couleur?: string;
  /** Valeur affichée à droite si différente de `valeur`. */
  affichage?: string;
}

/** Barres horizontales — répartitions (services, statuts, coûts…). */
export function GraphiqueBarres({
  barres,
  vide = "Aucune donnée.",
}: {
  barres: BarreHorizontale[];
  vide?: string;
}) {
  const total = barres.reduce((s, b) => s + b.valeur, 0);
  if (!barres.length || total === 0) {
    return <p className="py-6 text-center text-sm text-zinc-500">{vide}</p>;
  }

  const max = Math.max(...barres.map((b) => b.valeur), 1);

  return (
    <ul className="space-y-3">
      {barres.map((b) => (
        <li key={b.libelle}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
            <span className="truncate text-zinc-600 dark:text-zinc-300">{b.libelle}</span>
            <span className="shrink-0 font-medium text-zinc-900 tabular-nums dark:text-zinc-100">
              {b.affichage ?? formatNombre(b.valeur)}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className={`h-full rounded-full ${b.couleur ?? "bg-indigo-500"}`}
              style={{ width: `${Math.max((b.valeur / max) * 100, 2)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
