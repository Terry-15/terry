import type { ConsigneRotation, PosteChamp, SystemeDefensif, Tempo, TypeTir } from "../types";

/**
 * Toutes les constantes calibrées du moteur, au même endroit.
 *
 * Elles ne se règlent pas à l'intuition : chaque modification se vérifie avec
 * `npm run harnais`, qui mesure 500 matchs et compare aux repères réels du
 * handball (26–32 buts, 55–62 % de réussite, 3–5 exclusions, 4–5 jets de 7 m).
 */

export const DUREE_MATCH = 3600; // secondes
export const DUREE_MI_TEMPS = 1800;

/* --------------------------------------------------------- systèmes défensifs */

export type ParamsSysteme = {
  libelle: string;
  description: string;
  /** Points de défense ajoutés face aux tirs proches (pivot, ailes). */
  defProche: number;
  /** Points de défense ajoutés face aux tirs à 9 m. */
  defLoin: number;
  /** Probabilité de base de provoquer une perte de balle, par possession. */
  interception: number;
  /** Multiplicateur des contacts irréguliers (jets de 7 m et exclusions). */
  faute: number;
  /** Usure physique induite. */
  usure: number;
};

export const SYSTEMES: Record<SystemeDefensif, ParamsSysteme> = {
  "6-0": {
    libelle: "6-0",
    description: "Bloc bas et compact. Verrouille le pivot et les ailes, mais laisse armer de loin.",
    defProche: 5.2,
    defLoin: -3.6,
    interception: 0.03,
    faute: 0.8,
    usure: 0.93,
  },
  "5-1": {
    libelle: "5-1",
    description: "Un avancé sur le demi-centre. Sans point faible marqué, sans point fort non plus.",
    defProche: -0.6,
    defLoin: -0.4,
    interception: 0.05,
    faute: 1.0,
    usure: 1.05,
  },
  "3-2-1": {
    libelle: "3-2-1",
    description: "Défense haute et agressive. Étouffe les tireurs à distance, mais le pivot vit seul.",
    defProche: -4.8,
    defLoin: 5.6,
    interception: 0.085,
    faute: 1.4,
    usure: 1.17,
  },
};

/* ------------------------------------------------------------------- tempos */

export type ParamsTempo = {
  libelle: string;
  description: string;
  /** Durée moyenne d'une possession, en secondes. */
  duree: number;
  /** Correction d'efficacité au tir. */
  efficacite: number;
  /** Probabilité de partir en contre-attaque après une récupération. */
  contre: number;
  /** Qualité du repli défensif : > 1 = on encaisse plus de contres. */
  repli: number;
  /** Exposition aux interceptions adverses. */
  exposition: number;
  usure: number;
};

export const TEMPOS: Record<Tempo, ParamsTempo> = {
  place: {
    libelle: "Jeu placé",
    description: "Attaques longues et sûres, effectif ménagé. Mais garder le ballon face à une défense agressive, c'est le perdre.",
    duree: 38,
    efficacite: 0.018,
    contre: 0.16,
    repli: 0.82,
    exposition: 1.5,
    usure: 0.86,
  },
  equilibre: {
    libelle: "Équilibré",
    description: "Le réglage neutre : un peu de transition, une usure normale.",
    duree: 32,
    efficacite: 0,
    contre: 0.34,
    repli: 1,
    exposition: 1,
    usure: 1,
  },
  rapide: {
    libelle: "Contre-attaque",
    description: "Des buts faciles en transition, mais on se replie mal et ça use l'effectif.",
    duree: 26.5,
    efficacite: -0.028,
    contre: 0.48,
    repli: 1.55,
    exposition: 0.72,
    usure: 1.22,
  },
};

/**
 * Interaction tempo × système défensif adverse : c'est ici que se joue
 * l'absence de stratégie dominante. Jouer placé contre un bloc bas, c'est
 * jouer son jeu ; contre une défense haute, c'est s'exposer aux interceptions.
 */
export const INTERACTION: Record<Tempo, Record<SystemeDefensif, { efficacite: number; perte: number }>> = {
  place: {
    "6-0": { efficacite: -0.028, perte: -0.01 },
    "5-1": { efficacite: -0.004, perte: 0.012 },
    "3-2-1": { efficacite: 0.022, perte: 0.055 },
  },
  equilibre: {
    "6-0": { efficacite: 0, perte: 0 },
    "5-1": { efficacite: 0, perte: 0 },
    "3-2-1": { efficacite: 0.004, perte: 0.012 },
  },
  rapide: {
    "6-0": { efficacite: 0.026, perte: 0.014 },
    "5-1": { efficacite: 0.004, perte: 0.006 },
    "3-2-1": { efficacite: -0.014, perte: -0.02 },
  },
};

/**
 * Le tempo n'est pas un réglage neutre : il colle ou non à l'effectif.
 * Un collectif qui voit le jeu et garde la balle rentabilise le jeu placé ;
 * des jambes rapides rentabilisent la contre-attaque. Choisir un tempo, c'est
 * donc choisir en fonction de ses joueurs, pas cocher la « meilleure » option.
 */
export const AFFINITE_TEMPO: Record<Tempo, { cles: ("vision" | "passe" | "vitesse" | "sangFroid" | "resistance")[]; pente: number }> = {
  place: { cles: ["vision", "passe", "sangFroid"], pente: 0.0075 },
  equilibre: { cles: ["vision", "vitesse"], pente: 0.002 },
  rapide: { cles: ["vitesse", "resistance"], pente: 0.0075 },
};

/* --------------------------------------------------------------- rotations */

export const SEUILS_ROTATION: Record<ConsigneRotation, number> = {
  titulaires: 42,
  equilibre: 58,
  large: 70,
};

/* ------------------------------------------------------------------- tirs */

/** Probabilité de base par type de tir, à qualités égales. */
export const BASE_TIR: Record<TypeTir, number> = {
  aile: 0.57,
  neuf: 0.5,
  six: 0.63,
  contre: 0.77,
  sept: 0.75,
};

/** Sensibilité de la réussite à l'écart de qualité, par point d'attribut. */
export const PENTE_QUALITE = 0.026;

/**
 * Part des tirs prise par chaque poste, selon le système défensif d'en face.
 *
 * C'est le cœur de la question tactique du handball : un bloc bas laisse
 * armer les arrières mais ferme l'intérieur ; une défense haute étouffe les
 * neuf mètres et laisse vivre le pivot et les ailiers. Une équipe de gros
 * arrières ne souffre donc pas du même système qu'une équipe de jeu intérieur.
 */
export const PART_TIRS: Record<SystemeDefensif, Record<PosteChamp, number>> = {
  "6-0": { ArG: 1.7, ArD: 1.7, AiG: 0.95, AiD: 0.95, DC: 0.72, PV: 0.72 },
  "5-1": { ArG: 1.4, ArD: 1.4, AiG: 1, AiD: 1, DC: 0.62, PV: 1 },
  "3-2-1": { ArG: 1.05, ArD: 1.05, AiG: 1.15, AiD: 1.15, DC: 0.5, PV: 1.5 },
};

/** Probabilité qu'un arrière ou un demi-centre pénètre et finisse à six mètres. */
export const PENETRATION: Record<SystemeDefensif, number> = {
  "6-0": 0.12,
  "5-1": 0.22,
  "3-2-1": 0.36,
};

/* ----------------------------------------------------------- pertes de balle */

/** Probabilité qu'une possession se termine sur une perte, hors pression adverse. */
export const PERTE_BASE = 0.19;
/** Part des pertes imputées à la pression adverse (« pertes provoquées »). */
export const PART_PROVOQUEE = 0.55;

/* -------------------------------------------------------- contacts irréguliers */

/** Probabilité de base d'un contact irrégulier sanctionné, par possession. */
export const FAUTE_BASE = 0.2;
/** Répartition des sanctions : jet de 7 m seul, exclusion seule, les deux. */
export const REPARTITION_FAUTE = { septSeul: 0.4, exclusionSeule: 0.34, lesDeux: 0.26 };

/* ------------------------------------------------------------ divers réglages */

export const AVANTAGE_DOMICILE = 0.032;
/** Effet d'un joueur de plus (ou de moins) sur la réussite au tir. */
export const EFFET_SUPERIORITE = 0.052;
/**
 * Relâchement : une équipe largement devant lève le pied et fait tourner,
 * celle qui court après prend des risques. Sans ce ressort, les écarts
 * s'emballent et les matchs nuls deviennent trois fois trop rares.
 */
export const RELACHEMENT_PAR_BUT = 0.015;
export const RELACHEMENT_SEUIL = 3;
export const RELACHEMENT_MAX = 7;

/** Probabilité de récupérer son propre tir manqué. */
export const REBOND_OFFENSIF = 0.12;
/** Part des tirs non marqués qui sont contrés plutôt qu'arrêtés ou manqués. */
export const PART_CONTRE = 0.16;
export const PART_MANQUE = 0.18;
/** Durée d'une exclusion, en secondes. */
export const DUREE_EXCLUSION = 120;
/** Trois exclusions et le joueur est disqualifié pour le reste du match. */
export const EXCLUSIONS_AVANT_DISQUALIFICATION = 3;
/** Usure : points de condition perdus par minute sur le terrain. */
export const USURE_PAR_MINUTE = 0.42;
export const RECUPERATION_BANC_PAR_MINUTE = 0.3;
/** Fenêtre de fin de match où le gardien volant devient envisageable. */
export const FENETRE_GARDIEN_VOLANT = 300;
/** Réussite adverse sur but vide quand le gardien volant se fait prendre. */
export const BUT_VIDE = 0.86;
