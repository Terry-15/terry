import {
  classeGravite,
  classeStatutAction,
  classeStatutErreur,
  libelleCourtPdca,
  libelleGravite,
  libelleStatutAction,
  libelleStatutErreur,
  libelleTypeAction,
} from "@/lib/labels";
import type { Gravite, PhasePdca, StatutAction, StatutErreur, TypeAction } from "@/lib/types";

export function EtiquetteGravite({ valeur }: { valeur: Gravite }) {
  return <span className={`etiquette ${classeGravite[valeur]}`}>{libelleGravite[valeur]}</span>;
}

export function EtiquetteStatut({ valeur }: { valeur: StatutErreur }) {
  return (
    <span className={`etiquette ${classeStatutErreur[valeur]}`}>{libelleStatutErreur[valeur]}</span>
  );
}

export function EtiquetteStatutAction({ valeur }: { valeur: StatutAction }) {
  return (
    <span className={`etiquette ${classeStatutAction[valeur]}`}>{libelleStatutAction[valeur]}</span>
  );
}

const classeTypeAction: Record<TypeAction, string> = {
  curative:
    "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-400/30",
  corrective:
    "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-400/30",
  preventive:
    "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-300 dark:border-teal-400/30",
};

export function EtiquetteTypeAction({ valeur }: { valeur: TypeAction }) {
  return (
    <span className={`etiquette ${classeTypeAction[valeur]}`}>{libelleTypeAction[valeur]}</span>
  );
}

export function EtiquettePdca({ valeur }: { valeur: PhasePdca }) {
  return (
    <span className="etiquette border-zinc-200 bg-zinc-100 font-mono text-zinc-600 uppercase dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
      {libelleCourtPdca[valeur]}
    </span>
  );
}

export function EtiquetteRetard({ jours }: { jours: number }) {
  if (jours <= 0) return null;
  return (
    <span className="etiquette border-red-200 bg-red-50 text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-300">
      {jours} j de retard
    </span>
  );
}
