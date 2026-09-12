/**
 * Demi-Centre — vocabulaire du domaine.
 *
 * Tout le moteur est écrit ici en TypeScript pur : aucune dépendance à React,
 * à Next.js ou au navigateur. C'est ce qui permet de le faire tourner par
 * milliers de matchs dans le harnais de test (`npm run harnais`).
 */

/* ------------------------------------------------------------------ postes */

export const POSTES = ["GB", "ArG", "ArD", "AiG", "AiD", "DC", "PV"] as const;
export type Poste = (typeof POSTES)[number];

/** Les six joueurs de champ : tout le monde sauf le gardien. */
export const POSTES_CHAMP = ["ArG", "ArD", "AiG", "AiD", "DC", "PV"] as const;
export type PosteChamp = (typeof POSTES_CHAMP)[number];

export const LIBELLES_POSTE: Record<Poste, string> = {
  GB: "Gardien",
  ArG: "Arrière gauche",
  ArD: "Arrière droit",
  AiG: "Ailier gauche",
  AiD: "Ailier droit",
  DC: "Demi-centre",
  PV: "Pivot",
};

export type Main = "droitier" | "gaucher";

/* -------------------------------------------------------------- attributs */

/**
 * Attributs des joueurs de champ. Chacun est lu quelque part dans le moteur :
 * un attribut qui ne sert à rien est du bruit dans une fiche joueur.
 */
export const ATTRIBUTS_CHAMP = [
  "tir", // précision du tir
  "puissance", // vitesse de balle, décisive à 9 m
  "duel", // percussion en un contre un, provoque fautes et jets de 7 m
  "passe", // sûreté de la transmission
  "vision", // qualité des ballons donnés, crée de meilleurs tirs
  "defense", // duel défensif
  "interception", // vols de balle
  "blocage", // contres devant les tireurs à distance
  "vitesse", // contre-attaque et repli
  "detente", // tirs en suspension, angles fermés
  "resistance", // vitesse d'usure sur 60 minutes
  "sangFroid", // fins de match, jets de 7 m
  "discipline", // évite les exclusions
  "agressivite", // pèse en défense, mais coûte des exclusions
] as const;

/** Attributs spécifiques au gardien. */
export const ATTRIBUTS_GARDIEN = ["arrets", "reflexes", "placement", "relance"] as const;

export const ATTRIBUTS = [...ATTRIBUTS_CHAMP, ...ATTRIBUTS_GARDIEN] as const;
export type CleAttribut = (typeof ATTRIBUTS)[number];

export type Attributs = Record<CleAttribut, number>;

export const LIBELLES_ATTRIBUT: Record<CleAttribut, string> = {
  tir: "Tir",
  puissance: "Puissance",
  duel: "Un contre un",
  passe: "Passe",
  vision: "Vision de jeu",
  defense: "Défense",
  interception: "Interception",
  blocage: "Blocage",
  vitesse: "Vitesse",
  detente: "Détente",
  resistance: "Résistance",
  sangFroid: "Sang-froid",
  discipline: "Discipline",
  agressivite: "Agressivité",
  arrets: "Arrêts",
  reflexes: "Réflexes",
  placement: "Placement",
  relance: "Relance",
};

/* ----------------------------------------------------------------- joueur */

export type Joueur = {
  id: string;
  prenom: string;
  nom: string;
  /** Âge en début de saison. */
  age: number;
  poste: Poste;
  /** Poste de dépannage, joué avec une pénalité. */
  posteSecondaire: Poste | null;
  main: Main;
  attributs: Attributs;
  /** Note maximale atteignable en fin de carrière, sur 20. */
  potentiel: number;
  clubId: string | null;
  numero: number;
  salaire: number;
  saisonFinContrat: number;
  /** Fraîcheur physique, 0–100. 100 = totalement frais. */
  condition: number;
  /** Moral, 0–100. */
  moral: number;
  /** Forme du moment, −3 à +3. */
  forme: number;
  /** Journées d'indisponibilité restantes. */
  blessureJours: number;
};

/** Nom affichable, « P. Nom » pour les listes serrées. */
export type NomJoueur = { complet: string; court: string };

/* ------------------------------------------------------------------- club */

export type Club = {
  id: string;
  nom: string;
  abbr: string;
  ville: string;
  divisionId: string;
  /** Réputation 1–100 : pilote la génération de l'effectif et les finances. */
  reputation: number;
  /** Profil de jeu du club : gros arrières, jeu intérieur, ou équilibré. */
  style: StyleClub;
  budget: number;
  masseSalarialeMax: number;
  couleur: string;
  tactique: Tactique;
};

import type { StyleClub } from "./noms";
export type { StyleClub };

export type Division = {
  id: string;
  nom: string;
  /** 1 = élite, 3 = troisième échelon. */
  niveau: number;
  clubIds: string[];
};

/* --------------------------------------------------------------- tactique */

export type SystemeDefensif = "6-0" | "5-1" | "3-2-1";
export type Tempo = "place" | "equilibre" | "rapide";
/** Jusqu'où on fait tourner l'effectif pendant le match. */
export type ConsigneRotation = "titulaires" | "equilibre" | "large";

/**
 * Un échange attaque / défense : le premier joue les phases offensives, le
 * second les phases défensives, et ils se croisent à chaque changement de
 * possession.
 */
export type EchangeSpecialiste = { attaquantId: string; defenseurId: string };

export type Tactique = {
  systeme: SystemeDefensif;
  tempo: Tempo;
  rotation: ConsigneRotation;
  /** Sortir le gardien en attaque quand on est mené dans les deux dernières minutes. */
  gardienVolant: boolean;
  /** Titulaire retenu pour chacun des sept postes. */
  sept: Record<Poste, string>;
  /** Spécialistes qui tournent à chaque changement de possession. */
  specialistes: EchangeSpecialiste[];
};

/* ------------------------------------------------------------------ monde */

export type Monde = {
  version: number;
  graine: number;
  /** Année civile de début de la saison en cours. */
  saison: number;
  divisions: Division[];
  clubs: Club[];
  joueurs: Joueur[];
  /** Saisons terminées, de la plus ancienne à la plus récente. */
  historique: BilanSaison[];
};

/* -------------------------------------------------------------- historique */

export type LigneBilan = {
  clubId: string;
  nom: string;
  rang: number;
  points: number;
  difference: number;
};

export type BilanDivision = {
  divisionId: string;
  nom: string;
  classement: LigneBilan[];
  /** Clubs montés depuis cette division, et descendus dans la suivante. */
  promus: string[];
  relegues: string[];
  meilleurButeur: { nom: string; clubAbbr: string; buts: number } | null;
};

export type MouvementEffectif = {
  clubId: string;
  /** Joueurs partis à la retraite, avec leur âge. */
  retraites: { nom: string; age: number; poste: Poste }[];
  /** Jeunes issus du centre de formation. */
  eclosions: { nom: string; age: number; poste: Poste; potentiel: number }[];
  /** Joueurs recrutés pour combler l'effectif. */
  arrivees: { nom: string; age: number; poste: Poste }[];
  /** Les plus fortes progressions et les plus nettes baisses de la saison. */
  progressions: { nom: string; poste: Poste; avant: number; apres: number }[];
};

export type BilanSaison = {
  annee: number;
  divisions: BilanDivision[];
  mouvements: MouvementEffectif[];
};

/* ------------------------------------------------------------------ match */

export type Camp = "domicile" | "exterieur";

export type TypeTir = "aile" | "neuf" | "six" | "contre" | "sept";

export type TypeEvenement =
  | "coupEnvoi"
  | "but"
  | "arret"
  | "manque"
  | "contre"
  | "perte"
  | "exclusion"
  | "septMetres"
  | "tempsMort"
  | "changement"
  | "gardienVolant"
  | "miTemps"
  | "fin";

export type EvenementMatch = {
  /** Seconde de jeu, 0 à 3600. */
  seconde: number;
  type: TypeEvenement;
  camp: Camp | null;
  texte: string;
  scoreDomicile: number;
  scoreExterieur: number;
};

export type StatsJoueurMatch = {
  joueurId: string;
  /** Temps passé sur le terrain, en secondes. */
  secondes: number;
  buts: number;
  tirs: number;
  septMetresTires: number;
  septMetresMarques: number;
  pertes: number;
  pertesProvoquees: number;
  contres: number;
  exclusions: number;
  /** Gardien : arrêts et tirs subis. */
  arrets: number;
  tirsSubis: number;
};

export type StatsEquipeMatch = {
  buts: number;
  tirs: number;
  pertes: number;
  pertesProvoquees: number;
  contres: number;
  exclusions: number;
  septMetresTires: number;
  septMetresMarques: number;
  arrets: number;
  contreAttaques: number;
  possessions: number;
  /** Temps joué en infériorité numérique, en secondes (exclusions purgées). */
  secondesInferiorite: number;
};

export type FeuilleMatch = {
  clubDomicileId: string;
  clubExterieurId: string;
  scoreDomicile: number;
  scoreExterieur: number;
  miTempsDomicile: number;
  miTempsExterieur: number;
  statsDomicile: StatsEquipeMatch;
  statsExterieur: StatsEquipeMatch;
  joueursDomicile: StatsJoueurMatch[];
  joueursExterieur: StatsJoueurMatch[];
  evenements: EvenementMatch[];
};
