import Link from "next/link";

import { EtiquetteGravite, EtiquetteStatut } from "@/components/ui/etiquettes";
import { formatDate, formatEuros } from "@/lib/format";
import type { Erreur } from "@/lib/types";

export function TableErreurs({
  erreurs,
  compact = false,
}: {
  erreurs: Erreur[];
  compact?: boolean;
}) {
  if (!erreurs.length) {
    return (
      <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Aucune fiche ne correspond aux critères.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <th className="py-2 pr-3 font-medium">Référence</th>
            <th className="py-2 pr-3 font-medium">Intitulé</th>
            <th className="py-2 pr-3 font-medium">Service</th>
            {compact ? null : <th className="py-2 pr-3 font-medium">Catégorie</th>}
            <th className="py-2 pr-3 font-medium">Gravité</th>
            <th className="py-2 pr-3 font-medium">Statut</th>
            <th className="py-2 pr-3 font-medium">Détectée le</th>
            {compact ? null : <th className="py-2 pr-3 text-right font-medium">Coût</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {erreurs.map((e) => (
            <tr
              key={e.id}
              className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            >
              <td className="py-2.5 pr-3 font-mono text-xs whitespace-nowrap text-zinc-500 dark:text-zinc-400">
                {e.reference}
              </td>
              <td className="max-w-xs py-2.5 pr-3">
                <Link href={`/erreurs/${e.id}`} className="lien font-medium">
                  {e.titre}
                </Link>
                <div className="mt-0.5 flex flex-wrap gap-1.5">
                  {e.impact_client ? (
                    <span className="text-[11px] text-amber-600 dark:text-amber-400">
                      Impact client
                    </span>
                  ) : null}
                  {e.recurrente ? (
                    <span className="text-[11px] text-rose-600 dark:text-rose-400">Récurrente</span>
                  ) : null}
                </div>
              </td>
              <td className="py-2.5 pr-3 whitespace-nowrap text-zinc-600 dark:text-zinc-300">
                {e.service}
              </td>
              {compact ? null : (
                <td className="py-2.5 pr-3 whitespace-nowrap text-zinc-600 dark:text-zinc-300">
                  {e.categorie}
                </td>
              )}
              <td className="py-2.5 pr-3">
                <EtiquetteGravite valeur={e.gravite} />
              </td>
              <td className="py-2.5 pr-3">
                <EtiquetteStatut valeur={e.statut} />
              </td>
              <td className="py-2.5 pr-3 whitespace-nowrap text-zinc-600 tabular-nums dark:text-zinc-300">
                {formatDate(e.date_detection)}
              </td>
              {compact ? null : (
                <td className="py-2.5 pr-3 text-right whitespace-nowrap text-zinc-600 tabular-nums dark:text-zinc-300">
                  {formatEuros(e.cout_estime)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
