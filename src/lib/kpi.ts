import { ecartJours } from "./format";
import type { ActionCapa, Erreur, Gravite, StatutErreur } from "./types";

/** Calculs d'indicateurs — purs, réalisés en mémoire sur les fiches chargées. */

export const STATUTS_OUVERTS: StatutErreur[] = [
  "declaree",
  "en_analyse",
  "plan_action",
  "en_verification",
];

export function estOuverte(e: Erreur): boolean {
  return STATUTS_OUVERTS.includes(e.statut);
}

export function estActionOuverte(a: ActionCapa): boolean {
  return a.statut === "a_faire" || a.statut === "en_cours";
}

export function estEnRetard(a: ActionCapa, reference = new Date().toISOString().slice(0, 10)): boolean {
  return estActionOuverte(a) && a.echeance < reference;
}

export interface Kpis {
  total: number;
  ouvertes: number;
  cloturees: number;
  rejetees: number;
  critiquesOuvertes: number;
  recurrentes: number;
  impactClient: number;
  coutTotal: number;
  /** Part de fiches clôturées parmi les fiches non rejetées (%). */
  tauxCloture: number;
  /** Délai moyen détection → clôture, en jours. */
  delaiMoyenCloture: number;
  actionsTotal: number;
  actionsOuvertes: number;
  actionsEnRetard: number;
  /** Part d'actions terminées dans les délais (%). */
  tauxRespectEcheance: number;
  /** Part d'actions contrôlées jugées efficaces (%). */
  tauxEfficacite: number;
  /** Nombre de fiches déclarées sur les 30 derniers jours. */
  declarees30j: number;
  /** Évolution vs les 30 jours précédents (%). */
  evolution30j: number;
}

export function calculerKpis(erreurs: Erreur[], actions: ActionCapa[]): Kpis {
  const total = erreurs.length;
  const rejetees = erreurs.filter((e) => e.statut === "rejetee").length;
  const cloturees = erreurs.filter((e) => e.statut === "cloturee").length;
  const ouvertes = erreurs.filter(estOuverte).length;
  const retenues = total - rejetees;

  const delais = erreurs
    .filter((e) => e.statut === "cloturee" && e.date_cloture)
    .map((e) => ecartJours(e.date_detection, e.date_cloture as string))
    .filter((j) => j >= 0);

  const actionsOuvertes = actions.filter(estActionOuverte).length;
  const actionsEnRetard = actions.filter((a) => estEnRetard(a)).length;

  const faites = actions.filter((a) => a.statut === "faite");
  const dansLesDelais = faites.filter(
    (a) => a.date_realisation !== null && a.date_realisation <= a.echeance,
  ).length;

  const controlees = actions.filter((a) => a.efficacite_ok !== null);
  const efficaces = controlees.filter((a) => a.efficacite_ok === true).length;

  const jour = (decalage: number) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - decalage);
    return d.toISOString().slice(0, 10);
  };
  const j30 = jour(30);
  const j60 = jour(60);

  const declarees30j = erreurs.filter((e) => e.date_detection >= j30).length;
  const declareesPrec = erreurs.filter(
    (e) => e.date_detection >= j60 && e.date_detection < j30,
  ).length;

  return {
    total,
    ouvertes,
    cloturees,
    rejetees,
    critiquesOuvertes: erreurs.filter((e) => e.gravite === "critique" && estOuverte(e)).length,
    recurrentes: erreurs.filter((e) => e.recurrente).length,
    impactClient: erreurs.filter((e) => e.impact_client).length,
    coutTotal: erreurs.reduce((s, e) => s + (e.cout_estime ?? 0), 0),
    tauxCloture: retenues ? (cloturees / retenues) * 100 : 0,
    delaiMoyenCloture: delais.length ? delais.reduce((s, j) => s + j, 0) / delais.length : 0,
    actionsTotal: actions.length,
    actionsOuvertes,
    actionsEnRetard,
    tauxRespectEcheance: faites.length ? (dansLesDelais / faites.length) * 100 : 0,
    tauxEfficacite: controlees.length ? (efficaces / controlees.length) * 100 : 0,
    declarees30j,
    evolution30j: declareesPrec ? ((declarees30j - declareesPrec) / declareesPrec) * 100 : 0,
  };
}

export interface LignePareto {
  libelle: string;
  valeur: number;
  part: number;
  cumul: number;
}

/** Pareto (80/20) sur une propriété textuelle des fiches. */
export function pareto(
  erreurs: Erreur[],
  cle: "categorie" | "service",
  maxLignes = 8,
): LignePareto[] {
  const compte = new Map<string, number>();
  for (const e of erreurs) {
    if (e.statut === "rejetee") continue;
    compte.set(e[cle], (compte.get(e[cle]) ?? 0) + 1);
  }

  const trie = [...compte.entries()].sort((a, b) => b[1] - a[1]);
  const total = trie.reduce((s, [, n]) => s + n, 0);

  const lignes: LignePareto[] = [];
  let cumul = 0;
  for (const [libelle, valeur] of trie.slice(0, maxLignes)) {
    cumul += valeur;
    lignes.push({
      libelle,
      valeur,
      part: total ? (valeur / total) * 100 : 0,
      cumul: total ? (cumul / total) * 100 : 0,
    });
  }
  return lignes;
}

export interface PointMois {
  mois: string;
  declarees: number;
  cloturees: number;
}

/** Série mensuelle déclarations / clôtures sur les `nbMois` derniers mois. */
export function parMois(erreurs: Erreur[], nbMois = 12): PointMois[] {
  const points: PointMois[] = [];
  const base = new Date();
  base.setUTCDate(1);
  base.setUTCHours(12, 0, 0, 0);

  for (let i = nbMois - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setUTCMonth(d.getUTCMonth() - i);
    const cle = d.toISOString().slice(0, 7);
    points.push({
      mois: `${cle}-01`,
      declarees: erreurs.filter((e) => e.date_detection.slice(0, 7) === cle).length,
      cloturees: erreurs.filter((e) => (e.date_cloture ?? "").slice(0, 7) === cle).length,
    });
  }
  return points;
}

export interface Part {
  libelle: string;
  valeur: number;
}

export function repartitionGravite(erreurs: Erreur[]): Array<Part & { cle: Gravite }> {
  const cles: Gravite[] = ["mineure", "majeure", "critique"];
  return cles.map((cle) => ({
    cle,
    libelle: cle,
    valeur: erreurs.filter((e) => e.gravite === cle).length,
  }));
}

export function repartitionStatut(erreurs: Erreur[]): Array<Part & { cle: StatutErreur }> {
  const cles: StatutErreur[] = [
    "declaree",
    "en_analyse",
    "plan_action",
    "en_verification",
    "cloturee",
    "rejetee",
  ];
  return cles.map((cle) => ({
    cle,
    libelle: cle,
    valeur: erreurs.filter((e) => e.statut === cle).length,
  }));
}

/** Coût cumulé par service, du plus coûteux au moins coûteux. */
export function coutParService(erreurs: Erreur[]): Part[] {
  const compte = new Map<string, number>();
  for (const e of erreurs) {
    if (e.statut === "rejetee") continue;
    compte.set(e.service, (compte.get(e.service) ?? 0) + (e.cout_estime ?? 0));
  }
  return [...compte.entries()]
    .map(([libelle, valeur]) => ({ libelle, valeur }))
    .sort((a, b) => b.valeur - a.valeur);
}
