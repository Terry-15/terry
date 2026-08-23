import type { ReactNode } from "react";

type Ton = "neutre" | "positif" | "attention" | "critique";

const tons: Record<Ton, string> = {
  neutre: "text-zinc-900 dark:text-zinc-50",
  positif: "text-emerald-600 dark:text-emerald-400",
  attention: "text-amber-600 dark:text-amber-400",
  critique: "text-red-600 dark:text-red-400",
};

export function CarteKpi({
  libelle,
  valeur,
  unite,
  aide,
  ton = "neutre",
  evolution,
  /** true = une hausse est une mauvaise nouvelle (nb d'erreurs, retards…). */
  hausseDefavorable = true,
}: {
  libelle: string;
  valeur: ReactNode;
  unite?: string;
  aide?: string;
  ton?: Ton;
  evolution?: number;
  hausseDefavorable?: boolean;
}) {
  const evolutionAffichee =
    evolution !== undefined && Number.isFinite(evolution) && Math.abs(evolution) >= 0.5;
  const mauvaise = evolutionAffichee && evolution! > 0 === hausseDefavorable;

  return (
    <div className="carte p-4">
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{libelle}</p>
      <p className={`mt-1.5 flex items-baseline gap-1 text-2xl font-semibold ${tons[ton]}`}>
        {valeur}
        {unite ? (
          <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400">{unite}</span>
        ) : null}
      </p>
      <div className="mt-1 flex items-center gap-2">
        {evolutionAffichee ? (
          <span
            className={`text-xs font-medium ${
              mauvaise
                ? "text-red-600 dark:text-red-400"
                : "text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {evolution! > 0 ? "▲" : "▼"} {Math.abs(Math.round(evolution!))} %
          </span>
        ) : null}
        {aide ? <span className="text-xs text-zinc-500 dark:text-zinc-400">{aide}</span> : null}
      </div>
    </div>
  );
}
