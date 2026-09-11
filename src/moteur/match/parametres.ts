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
/** En dessous, il ne reste plus le temps de construire une attaque. */
export const DUREE_MINIMALE_POSSESSION = 7;

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
    defProche: 4.0,
    defLoin: -3.0,
    interception: 0.03,
    faute: 0.8,
    usure: 0.96,
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
    defProche: -2.8,
    defLoin: 3.6,
    interception: 0.085,
    faute: 1.25,
    usure: 1.1,
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
    duree: 37,
    efficacite: 0.018,
    contre: 0.16,
    repli: 0.82,
    exposition: 1.5,
    usure: 0.93,
  },
  equilibre: {
    libelle: "Équilibré",
    description: "Le réglage neutre : un peu de transition, une usure normale.",
    duree: 33,
    efficacite: 0,
    contre: 0.34,
    repli: 1,
    exposition: 1,
    usure: 1,
  },
  rapide: {
    libelle: "Contre-attaque",
    description: "Des buts faciles en transition, mais on se replie mal et ça use l'effectif.",
    duree: 30,
    efficacite: -0.028,
    contre: 0.52,
    repli: 1.38,
    exposition: 0.72,
    usure: 1.1,
  },
};

/**
 * Interaction tempo × système défensif adverse : c'est ici que se joue
 * l'absence de stratégie dominante. Jouer placé contre un bloc bas, c'est
 * jouer son jeu ; contre une défense haute, c'est s'exposer aux interceptions.
 */
export const INTERACTION: Record<Tempo, Record<SystemeDefensif, { efficacite: number; perte: number }>> = {
  place: {
    // Contre un bloc installé, la patience paie : on fait circuler jusqu'à la faille.
    "6-0": { efficacite: 0.015, perte: -0.01 },
    "5-1": { efficacite: 0, perte: 0.01 },
    // Contre une défense haute, garder le ballon, c'est le perdre.
    "3-2-1": { efficacite: -0.01, perte: 0.036 },
  },
  equilibre: {
    "6-0": { efficacite: 0, perte: 0 },
    "5-1": { efficacite: 0, perte: 0 },
    "3-2-1": { efficacite: 0.004, perte: 0.012 },
  },
  rapide: {
    // Se jeter sur un bloc bas déjà en place, c'est tirer dans le mur.
    "6-0": { efficacite: -0.018, perte: 0.01 },
    "5-1": { efficacite: 0.004, perte: 0.004 },
    // Contre une défense haute, il faut attaquer avant qu'elle soit replacée.
    "3-2-1": { efficacite: 0.021, perte: -0.016 },
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
  aile: 0.528,
  neuf: 0.458,
  six: 0.588,
  contre: 0.73,
  sept: 0.735,
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
  "6-0": { ArG: 1.8, ArD: 1.8, AiG: 1, AiD: 1, DC: 0.6, PV: 0.5 },
  "5-1": { ArG: 1.2, ArD: 1.2, AiG: 1.1, AiD: 1.1, DC: 0.5, PV: 1.05 },
  "3-2-1": { ArG: 0.6, ArD: 0.6, AiG: 1.25, AiD: 1.25, DC: 0.4, PV: 1.6 },
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
export const FAUTE_BASE = 0.15;
/** Répartition des sanctions : jet de 7 m seul, exclusion seule, les deux. */
export const REPARTITION_FAUTE = { septSeul: 0.46, exclusionSeule: 0.3, lesDeux: 0.24 };

/**
 * La réussite du jour. Un gardien peut être dedans ou à côté, et ça décide des
 * matchs de handball plus que dans aucun autre sport collectif. La valeur est
 * tirée au coup d'envoi et jamais affichée : seul le pourcentage d'arrêts
 * observé permet de la deviner, et c'est ce qui rend la décision de changer de
 * gardien intéressante.
 */
export const ECART_JOUR_GARDIEN = 0.1;
export const ECART_JOUR_CHAMP = 0.055;

/* ------------------------------------------------------------- temps morts */

/** Règles réelles : trois par match, deux par mi-temps, un dans les cinq dernières minutes. */
export const TEMPS_MORTS_PAR_MATCH = 3;
export const TEMPS_MORTS_PAR_MI_TEMPS = 2;
export const FENETRE_FIN_MATCH = 300;
/** Une minute d'arrêt rend un peu de jambes. */
export const RECUPERATION_TEMPS_MORT = 8;
/** Durée de l'effet, en possessions de l'équipe qui a demandé le temps mort. */
export const POSSESSIONS_APRES_TEMPS_MORT = 3;
/** Ce que vaut un temps mort bien placé : une consigne claire et des jambes fraîches. */
export const EFFET_TEMPS_MORT = { efficacite: 0.075, perte: 0.66 };

/**
 * L'élan. Une équipe qui enchaîne les buts joue plus haut, et le handball se
 * joue par séries de trois ou quatre. C'est la raison d'être du temps mort :
 * il remet l'élan adverse à zéro. Sans lui, demander un temps mort ne serait
 * qu'un petit bonus d'efficacité sans enjeu.
 */
export const ELAN_SEUIL = 2;
export const ELAN_PAR_BUT = 0.022;
export const ELAN_MAX = 0.075;

/* ------------------------------------------------------------ divers réglages */

export const AVANTAGE_DOMICILE = 0.048;
/**
 * Effet d'un joueur de plus (ou de moins) sur la réussite au tir. Deux minutes
 * d'exclusion coûtent ainsi environ un demi-but, ce qui correspond à ce qu'on
 * observe, et rendent le sept contre six réellement jouable.
 */
export const EFFET_SUPERIORITE = 0.075;

/** Probabilité qu'une rotation de spécialistes tourne au changement irrégulier. */
export const RISQUE_CHANGEMENT_IRREGULIER = 0.004;
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
/**
 * Usure : points de condition perdus par minute sur le terrain.
 * Soixante minutes pleines coûtent près de soixante points à un joueur de
 * résistance moyenne — c'est ce qui fait du banc une ressource et non un décor.
 */
export const USURE_PAR_MINUTE = 1.2;
export const RECUPERATION_BANC_PAR_MINUTE = 1.3;
/**
 * Fenêtre de fin de match où le gardien volant devient envisageable, et retard
 * maximal qui le justifie. Sorti trop tôt, il expose sans raison ; sorti dans
 * les trois dernières minutes avec un ou trois buts de retard, il transforme
 * des défaites en matchs nuls.
 */
export const FENETRE_GARDIEN_VOLANT = 120;
export const RETARD_GARDIEN_VOLANT = 3;
/**
 * But vide : part des pertes provoquées qui finissent dans le but vide quand
 * le gardien est sorti. Toutes n'y finissent pas — il faut une interception
 * propre, puis une balle mise depuis sa propre moitié de terrain. Punir chaque
 * ballon perdu rendait le sept contre six suicidaire, ce qu'il n'est pas.
 */
export const BUT_VIDE = 0.38;
