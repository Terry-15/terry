import {
  ATTRIBUTS,
  ATTRIBUTS_CHAMP,
  ATTRIBUTS_GARDIEN,
  type Attributs,
  type CleAttribut,
  type Joueur,
  type Main,
  type Poste,
} from "./types";
import { borner } from "./aleatoire";

/**
 * Pondérations de la note globale, poste par poste.
 *
 * La note n'est qu'un résumé pour l'interface : le moteur de match, lui,
 * lit toujours les attributs un par un. Deux joueurs notés 14 peuvent donc
 * produire des matchs très différents.
 */
export const PONDERATIONS: Record<Poste, Partial<Record<CleAttribut, number>>> = {
  GB: { arrets: 0.34, reflexes: 0.24, placement: 0.18, relance: 0.1, sangFroid: 0.09, resistance: 0.05 },
  ArG: { tir: 0.24, puissance: 0.18, duel: 0.12, defense: 0.13, blocage: 0.07, vision: 0.08, sangFroid: 0.08, vitesse: 0.05, detente: 0.05 },
  ArD: { tir: 0.24, puissance: 0.18, duel: 0.12, defense: 0.13, blocage: 0.07, vision: 0.08, sangFroid: 0.08, vitesse: 0.05, detente: 0.05 },
  AiG: { tir: 0.26, vitesse: 0.24, detente: 0.16, duel: 0.1, sangFroid: 0.1, defense: 0.08, passe: 0.06 },
  AiD: { tir: 0.26, vitesse: 0.24, detente: 0.16, duel: 0.1, sangFroid: 0.1, defense: 0.08, passe: 0.06 },
  DC: { vision: 0.26, passe: 0.22, sangFroid: 0.14, tir: 0.12, duel: 0.1, defense: 0.09, vitesse: 0.07 },
  PV: { duel: 0.2, defense: 0.2, tir: 0.16, puissance: 0.16, agressivite: 0.1, detente: 0.09, passe: 0.09 },
};

/** Les attributs affichés sur une fiche, dans l'ordre, selon le poste. */
export function clesUtiles(poste: Poste): readonly CleAttribut[] {
  return poste === "GB"
    ? ([...ATTRIBUTS_GARDIEN, "sangFroid", "resistance", "discipline"] as CleAttribut[])
    : ATTRIBUTS_CHAMP;
}

/** Note globale sur 20, arrondie au dixième. */
export function note(poste: Poste, attributs: Attributs): number {
  const poids = PONDERATIONS[poste];
  let somme = 0;
  let total = 0;
  for (const cle in poids) {
    const p = poids[cle as CleAttribut] as number;
    somme += attributs[cle as CleAttribut] * p;
    total += p;
  }
  return Math.round((somme / total) * 10) / 10;
}

export function noteJoueur(j: Joueur): number {
  return note(j.poste, j.attributs);
}

/**
 * Postes réservés aux gauchers. Un droitier peut y jouer, mais il tire
 * depuis un angle fermé : c'est la pénalité ci-dessous, et c'est ce qui rend
 * les gauchers rares et chers sur le marché.
 */
export const POSTES_GAUCHERS: Poste[] = ["ArD", "AiD"];
export const POSTES_DROITIERS: Poste[] = ["ArG", "AiG"];

/** Malus de tir, en points d'attribut, quand la main ne correspond pas au poste. */
export function malusMain(poste: Poste, main: Main): number {
  if (POSTES_GAUCHERS.includes(poste)) return main === "gaucher" ? 0 : -2.4;
  if (POSTES_DROITIERS.includes(poste)) return main === "droitier" ? 0 : -1.2;
  return 0;
}

/** Malus appliqué à un joueur aligné hors de son poste. */
export function malusPoste(j: Joueur, poste: Poste): number {
  if (j.poste === poste) return 0;
  if (j.posteSecondaire === poste) return -1;
  if ((j.poste === "GB") !== (poste === "GB")) return -6;
  return -2.5;
}

/**
 * Facteur multiplicatif appliqué à chaque attribut pendant un match.
 * Condition et forme sont les deux seuls leviers qui font varier un joueur
 * d'un match à l'autre — le reste, ce sont ses attributs.
 */
export function facteurEtat(condition: number, forme: number, moral: number): number {
  const fatigue = condition >= 65 ? 1 : 1 - ((65 - condition) / 65) * 0.26;
  const f = 1 + forme * 0.018;
  const m = 1 + (moral - 55) / 100 * 0.05;
  return borner(fatigue * f * m, 0.6, 1.18);
}

/** Attributs bornés dans [1, 20] — invariant vérifié par le harnais. */
export function bornerAttributs(a: Attributs): Attributs {
  for (const cle of ATTRIBUTS) a[cle] = borner(Math.round(a[cle]), 1, 20);
  return a;
}

export function nomComplet(j: Joueur): string {
  return `${j.prenom} ${j.nom}`;
}

export function nomCourt(j: Joueur): string {
  return `${j.prenom.charAt(0)}. ${j.nom}`;
}
