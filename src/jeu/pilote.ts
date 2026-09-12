import {
  ajusterTactique,
  apercuMatch,
  avancerMatch,
  creerMatch,
  demanderTempsMort,
  effectuerChangement,
  terminerMatch,
  type ApercuCote,
  type ApercuJoueur,
  type ApercuMatch,
  type EntreeEquipe,
  type EtatMatch,
  type OptionsMatch,
} from "@/moteur/match/moteur";
import { DUREE_MATCH, DUREE_MI_TEMPS } from "@/moteur/match/parametres";
import type { Camp, FeuilleMatch, SystemeDefensif } from "@/moteur/types";

/**
 * L'adjoint : ce qu'un manager attentif fait de son banc pendant soixante
 * minutes. Il sert à deux choses — tenir le banc à la place du joueur quand
 * celui-ci ne veut pas s'en occuper, et servir de référence au harnais pour
 * mesurer ce que vaut réellement une rotation pilotée.
 */
export type ReglagesPilote = {
  /** Condition en dessous de laquelle on sort un joueur de champ. */
  seuilSortie: number;
  /** Fraîcheur minimale exigée du remplaçant. */
  seuilEntree: number;
  /** Sortir un joueur qui a déjà deux exclusions, pour ne pas le perdre. */
  protegerExclus: boolean;
  /** Prendre les temps morts. */
  tempsMorts: boolean;
  /** Relire le profil offensif adverse à la mi-temps et ajuster la défense. */
  ajusterDefense: boolean;
  /** Adapter son rythme au système défensif que l'adversaire montre sur le terrain. */
  ajusterRythme: boolean;
  /** Adapter la zone d'attaque au système défensif adverse. */
  ajusterZone: boolean;
  /** Changer de gardien si le sien passe à côté de son match. */
  changerGardien: boolean;
  /** Jouer la fin de match : gardien volant et rythme adapté au score. */
  finDeMatch: boolean;
  /**
   * Aligner ses meilleurs tireurs pendant les deux minutes de supériorité, et
   * ses meilleurs défenseurs quand c'est soi qui est en infériorité.
   */
  jouerLesExclusions: boolean;
};

/**
 * Les réglages retenus sont ceux que le harnais valide, pas ceux qui font
 * plaisir : l'ajustement défensif à la mi-temps, la protection des joueurs à
 * deux exclusions et le changement de gardien ont été mesurés perdants en
 * moyenne, et sont donc désactivés par défaut. Ils restent disponibles — un
 * humain lit le match mieux qu'une heuristique.
 */
export const PILOTE_ATTENTIF: ReglagesPilote = {
  seuilSortie: 84,
  seuilEntree: 68,
  protegerExclus: false,
  tempsMorts: true,
  ajusterDefense: false,
  ajusterRythme: true,
  // Laissée au manager : mesure faite, un adjoint qui aligne aussi la zone
  // d'attaque sur la défense d'en face fait monter la réussite du lot de
  // référence à 62,6 %, au-dessus de ce qu'on observe en handball. Lire la
  // défense adverse et réorienter l'attaque reste donc un gain du banc humain.
  ajusterZone: false,
  changerGardien: false,
  finDeMatch: false,
  jouerLesExclusions: true,
};

/** Intervalle entre deux décisions du banc, en secondes de jeu. */
export const PAS_PILOTAGE = 60;

/**
 * Match entre deux clubs non contrôlés : leurs bancs sont tenus par un adjoint,
 * comme le vôtre si vous lui confiez le match. Sans cela, le manager humain
 * serait le seul du championnat à changer ses joueurs.
 */
export function simulerAvecAdjoints(
  domicile: EntreeEquipe,
  exterieur: EntreeEquipe,
  options: OptionsMatch,
): FeuilleMatch {
  const etat = creerMatch(domicile, exterieur, { ...options, pilote: undefined });
  const memoires = { domicile: creerMemoirePilote(), exterieur: creerMemoirePilote() };
  for (let t = PAS_PILOTAGE; t <= DUREE_MATCH; t += PAS_PILOTAGE) {
    avancerMatch(etat, t);
    piloterBanc(etat, "domicile", PILOTE_ATTENTIF, memoires.domicile);
    piloterBanc(etat, "exterieur", PILOTE_ATTENTIF, memoires.exterieur);
  }
  return terminerMatch(etat);
}

type Memoire = {
  derniereMiTempsTraitee: boolean;
  gardienChange: boolean;
};

export function creerMemoirePilote(): Memoire {
  return { derniereMiTempsTraitee: false, gardienChange: false };
}

/**
 * À appeler régulièrement pendant le match — une fois par minute de jeu suffit.
 * Chaque décision est celle qu'un entraîneur prend depuis sa chaise, avec les
 * seules informations affichées sur la feuille de match.
 */
export function piloterBanc(etat: EtatMatch, camp: Camp, reglages: ReglagesPilote, memoire: Memoire): void {
  const vue = apercuMatch(etat);
  if (vue.termine) return;
  const moi = camp === "domicile" ? vue.domicile : vue.exterieur;
  const adverse = camp === "domicile" ? vue.exterieur : vue.domicile;
  const restant = DUREE_MATCH - vue.t;

  if (reglages.tempsMorts) gererTempsMort(etat, camp, moi, adverse, vue);
  if (reglages.ajusterRythme) ajusterRythmeAuSysteme(etat, camp, moi, adverse);
  if (reglages.ajusterZone) ajusterZoneAuSysteme(etat, camp, moi, adverse);
  if (reglages.ajusterDefense && vue.t >= DUREE_MI_TEMPS && !memoire.derniereMiTempsTraitee) {
    memoire.derniereMiTempsTraitee = true;
    ajusterTactique(etat, camp, { systeme: systemeContre(adverse) });
  }
  if (reglages.changerGardien && !memoire.gardienChange && vue.t > 600) {
    if (changerGardienSiNecessaire(etat, camp, moi)) memoire.gardienChange = true;
  }
  if (reglages.finDeMatch) gererFinDeMatch(etat, camp, moi, adverse, restant);
  if (reglages.jouerLesExclusions && gererSuperiorite(etat, camp, moi, adverse)) return;
  gererRotation(etat, camp, moi, restant, reglages);
}

/* ---------------------------------------------------------------- décisions */

/** Les dernières minutes : on court après le score, ou on protège une avance. */
function gererFinDeMatch(etat: EtatMatch, camp: Camp, moi: ApercuCote, adverse: ApercuCote, restant: number) {
  if (restant > 300) return;
  const ecart = moi.score - adverse.score;
  if (ecart < 0 && ecart >= -4) {
    ajusterTactique(etat, camp, { gardienVolant: true });
  } else if (ecart > 0 && ecart <= 3) {
    // On garde le ballon : chaque possession de plus est une chance de moins
    // pour l'adversaire de revenir.
    ajusterTactique(etat, camp, { gardienVolant: false, tempo: "place" });
  }
}

function gererTempsMort(etat: EtatMatch, camp: Camp, moi: ApercuCote, adverse: ApercuCote, vue: ApercuMatch) {
  if (vue.possession !== camp || moi.tempsMortsRestants <= 0) return;
  const retard = adverse.score - moi.score;
  const restant = DUREE_MATCH - vue.t;

  // Couper une série adverse, mais garder un temps mort pour la fin.
  if (moi.serieAdverse >= 3 && (moi.tempsMortsRestants > 1 || restant < 480)) {
    demanderTempsMort(etat, camp);
    return;
  }
  // Fin de match serrée : on pose la dernière attaque.
  if (restant <= 180 && Math.abs(retard) <= 2) {
    demanderTempsMort(etat, camp);
    return;
  }
  // Un temps mort non pris est un temps mort perdu : il n'y a pas de report.
  const tropEnRetard = restant < 600 && moi.tempsMortsRestants >= 2;
  if (tropEnRetard) demanderTempsMort(etat, camp);
}

/**
 * Le rythme se choisit contre la défense qu'on a en face, et elle se voit dès
 * les premières attaques : on ne se jette pas sur un bloc bas déjà installé, on
 * ne prend pas son temps devant une défense haute qui vient chercher le ballon.
 * C'est la décision de match la plus rentable, et elle est invisible d'avance.
 */
function ajusterRythmeAuSysteme(etat: EtatMatch, camp: Camp, moi: ApercuCote, adverse: ApercuCote) {
  const voulu = adverse.systeme === "6-0" ? "place" : adverse.systeme === "3-2-1" ? "rapide" : "equilibre";
  if (moi.tempo !== voulu) ajusterTactique(etat, camp, { tempo: voulu });
}

/**
 * Où chercher le tir, selon la défense d'en face : on arme de loin contre un
 * bloc bas, on entre dedans contre une défense haute, on écarte contre un 5-1.
 */
function ajusterZoneAuSysteme(etat: EtatMatch, camp: Camp, moi: ApercuCote, adverse: ApercuCote) {
  const voulu = adverse.systeme === "6-0" ? "distance" : adverse.systeme === "3-2-1" ? "pivot" : "ailes";
  if (moi.attaque !== voulu) ajusterTactique(etat, camp, { attaque: voulu });
}

/** Le système qui fait le plus mal au profil de tir réellement observé. */
function systemeContre(adverse: ApercuCote): SystemeDefensif {
  const tous = [...adverse.champ, ...adverse.banc];
  let loin = 0;
  let pres = 0;
  for (const j of tous) {
    if (j.posteNaturel === "ArG" || j.posteNaturel === "ArD" || j.posteNaturel === "DC") loin += j.tirs;
    else if (j.posteNaturel !== "GB") pres += j.tirs;
  }
  if (loin + pres < 8) return "5-1";
  const part = loin / (loin + pres);
  return part >= 0.56 ? "3-2-1" : part <= 0.46 ? "6-0" : "5-1";
}

/**
 * Le gardien passe à côté de son match : on tente l'autre. Aucun sport
 * d'équipe ne bascule autant sur un homme en réussite.
 */
function changerGardienSiNecessaire(etat: EtatMatch, camp: Camp, moi: ApercuCote): boolean {
  const gardien = moi.gardien;
  // Quinze tirs subis : en dessous, un mauvais pourcentage n'est que du hasard.
  // Au-dessus, un gardien à moins de 20 % d'arrêts est probablement à côté de
  // son match — et c'est la seule façon de le savoir, la réussite du jour ne
  // s'affiche nulle part.
  if (!gardien || gardien.tirsSubis < 15) return false;
  if (gardien.arrets / gardien.tirsSubis >= 0.2) return false;
  const remplacant = moi.banc
    .filter((j) => j.posteNaturel === "GB" && !j.disqualifie && j.exclusJusqua === null)
    .sort((a, b) => b.note - a.note)[0];
  // On ne sacrifie pas une trop grosse différence de niveau pour un pressentiment.
  if (!remplacant || remplacant.note < gardien.note - 1.5) return false;
  return effectuerChangement(etat, camp, gardien.id, remplacant.id).ok;
}

function gererRotation(etat: EtatMatch, camp: Camp, moi: ApercuCote, restant: number, reglages: ReglagesPilote) {
  for (const joueur of moi.champ) {
    // Deux exclusions : la troisième le sort du match pour de bon.
    const menace = reglages.protegerExclus && joueur.exclusionsSubies >= 2 && restant > 420;
    const cuit = joueur.condition < reglages.seuilSortie;
    if (!menace && !cuit) continue;

    const remplacant = meilleurEntrant(moi, joueur, reglages.seuilEntree);
    if (!remplacant) continue;
    // On n'affaiblit pas trop l'équipe pour économiser des jambes.
    const perte = joueur.note - remplacant.note;
    if (!menace && perte > 2.2) continue;
    effectuerChangement(etat, camp, joueur.id, remplacant.id);
  }

  // Dernier quart d'heure : on ramène les titulaires qui ont récupéré.
  if (restant > 900) return;
  for (const joueur of moi.champ) {
    const retour = moi.banc
      .filter(
        (j) =>
          !j.disqualifie &&
          j.exclusJusqua === null &&
          j.posteNaturel === joueur.posteJoue &&
          j.condition > joueur.condition + 8 &&
          j.note > joueur.note + 0.4 &&
          (j.exclusionsSubies < 2 || restant < 420),
      )
      .sort((a, b) => b.note - a.note)[0];
    if (retour) effectuerChangement(etat, camp, joueur.id, retour.id);
  }
}

/**
 * Les deux minutes qui décident souvent d'un match : en supériorité on met ses
 * tireurs, en infériorité ses défenseurs. La fraîcheur attendra — une
 * possession de supériorité vaut plus qu'une minute de repos.
 */
function gererSuperiorite(etat: EtatMatch, camp: Camp, moi: ApercuCote, adverse: ApercuCote): boolean {
  const exclusAdverses = adverse.banc.filter((j) => j.exclusJusqua !== null).length;
  const mesExclus = moi.banc.filter((j) => j.exclusJusqua !== null).length;
  if (exclusAdverses === mesExclus) return false;
  const enSuperiorite = exclusAdverses > mesExclus;
  const critere = (j: ApercuJoueur) => (enSuperiorite ? j.attaque : j.defense);

  let bouge = false;
  for (const joueur of moi.champ) {
    const meilleur = moi.banc
      .filter(
        (j) =>
          !j.disqualifie &&
          j.exclusJusqua === null &&
          j.posteNaturel === joueur.posteJoue &&
          j.condition > 45 &&
          critere(j) > critere(joueur) + 1.2,
      )
      .sort((a, b) => critere(b) - critere(a))[0];
    if (meilleur && effectuerChangement(etat, camp, joueur.id, meilleur.id).ok) bouge = true;
  }
  return bouge;
}

function meilleurEntrant(moi: ApercuCote, sortant: ApercuJoueur, seuilEntree: number): ApercuJoueur | null {
  return (
    moi.banc
      .filter(
        (j) =>
          !j.disqualifie &&
          j.exclusJusqua === null &&
          j.posteNaturel !== "GB" &&
          j.posteNaturel === sortant.posteJoue &&
          j.condition >= seuilEntree,
      )
      .sort((a, b) => b.note - a.note)[0] ?? null
  );
}
