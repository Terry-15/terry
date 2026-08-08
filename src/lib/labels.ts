import type {
  Famille5M,
  Gravite,
  PhasePdca,
  StatutAction,
  StatutErreur,
  TypeAction,
} from "./types";

/** Libellés francophones + classes Tailwind associées à chaque valeur d'énum. */

export const GRAVITES: Gravite[] = ["mineure", "majeure", "critique"];

export const STATUTS_ERREUR: StatutErreur[] = [
  "declaree",
  "en_analyse",
  "plan_action",
  "en_verification",
  "cloturee",
  "rejetee",
];

export const TYPES_ACTION: TypeAction[] = ["curative", "corrective", "preventive"];

export const STATUTS_ACTION: StatutAction[] = ["a_faire", "en_cours", "faite", "annulee"];

export const PHASES_PDCA: PhasePdca[] = ["plan", "do", "check", "act"];

export const FAMILLES_5M: Famille5M[] = [
  "main_doeuvre",
  "matiere",
  "materiel",
  "methode",
  "milieu",
  "mesure",
];

export const libelleGravite: Record<Gravite, string> = {
  mineure: "Mineure",
  majeure: "Majeure",
  critique: "Critique",
};

export const libelleStatutErreur: Record<StatutErreur, string> = {
  declaree: "Déclarée",
  en_analyse: "En analyse",
  plan_action: "Plan d'actions",
  en_verification: "En vérification",
  cloturee: "Clôturée",
  rejetee: "Rejetée",
};

export const libelleTypeAction: Record<TypeAction, string> = {
  curative: "Curative",
  corrective: "Corrective",
  preventive: "Préventive",
};

export const descriptionTypeAction: Record<TypeAction, string> = {
  curative: "Traite l'effet immédiat (dépannage, tri, remise en conformité).",
  corrective: "Supprime la cause racine pour que le problème ne revienne pas.",
  preventive: "Évite l'apparition du problème ailleurs ou plus tard.",
};

export const libelleStatutAction: Record<StatutAction, string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  faite: "Faite",
  annulee: "Annulée",
};

export const libellePhasePdca: Record<PhasePdca, string> = {
  plan: "Plan — planifier",
  do: "Do — réaliser",
  check: "Check — vérifier",
  act: "Act — standardiser",
};

export const libelleCourtPdca: Record<PhasePdca, string> = {
  plan: "Plan",
  do: "Do",
  check: "Check",
  act: "Act",
};

export const libelleFamille5M: Record<Famille5M, string> = {
  main_doeuvre: "Main-d'œuvre",
  matiere: "Matière",
  materiel: "Matériel",
  methode: "Méthode",
  milieu: "Milieu",
  mesure: "Mesure",
};

/** Couleur (teinte hexadécimale) par famille pour le diagramme d'Ishikawa. */
export const couleurFamille: Record<Famille5M, string> = {
  main_doeuvre: "#6366f1",
  matiere: "#0891b2",
  materiel: "#7c3aed",
  methode: "#db2777",
  milieu: "#059669",
  mesure: "#d97706",
};

export const classeGravite: Record<Gravite, string> = {
  mineure:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-400/30",
  majeure:
    "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-400/30",
  critique:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-400/30",
};

export const classeStatutErreur: Record<StatutErreur, string> = {
  declaree:
    "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-400/10 dark:text-slate-300 dark:border-slate-400/30",
  en_analyse:
    "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-400/30",
  plan_action:
    "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-400/30",
  en_verification:
    "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-400/30",
  cloturee:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-400/30",
  rejetee:
    "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-400/10 dark:text-zinc-400 dark:border-zinc-400/30",
};

export const classeStatutAction: Record<StatutAction, string> = {
  a_faire:
    "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-400/10 dark:text-slate-300 dark:border-slate-400/30",
  en_cours:
    "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-400/30",
  faite:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-400/30",
  annulee:
    "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-400/10 dark:text-zinc-400 dark:border-zinc-400/30",
};

/** Enchaînement de statuts proposé dans le sélecteur de la fiche. */
export const transitionsStatut: Record<StatutErreur, StatutErreur[]> = {
  declaree: ["en_analyse", "rejetee"],
  en_analyse: ["plan_action", "rejetee"],
  plan_action: ["en_verification", "en_analyse"],
  en_verification: ["cloturee", "plan_action"],
  cloturee: ["en_verification"],
  rejetee: ["declaree"],
};
