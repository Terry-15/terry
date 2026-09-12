import { borner } from "./aleatoire";
import type { FeuilleMatch, Poste, StatsJoueurMatch } from "./types";

/**
 * La note de match, sur 10. Elle traduit une feuille de statistiques en
 * jugement : ce qu'on attend d'un joueur à son poste, et ce qu'il a fait.
 *
 * Deux règles de lecture :
 *  — un joueur qui n'a joué que cinq minutes reste près de la moyenne, faute
 *    d'avoir eu le temps de bien ou de mal faire ;
 *  — on juge sur le rendement, pas sur le volume : marquer huit buts en vingt
 *    tirs ne vaut pas marquer huit buts en dix.
 */
export const NOTE_MOYENNE = 6;

/** Réussite au tir attendue par poste, d'après le moteur lui-même. */
const REUSSITE_ATTENDUE: Record<Poste, number> = {
  GB: 0,
  ArG: 0.52,
  ArD: 0.52,
  AiG: 0.58,
  AiD: 0.58,
  DC: 0.55,
  PV: 0.62,
};

/** Part d'arrêts attendue d'un gardien. */
const ARRETS_ATTENDUS = 0.3;

export function noterJoueur(ligne: StatsJoueurMatch, poste: Poste, butsEquipe: number, resultat: -1 | 0 | 1): number {
  const minutes = ligne.secondes / 60;
  if (minutes < 1) return NOTE_MOYENNE;

  let note = NOTE_MOYENNE;

  if (poste === "GB") {
    if (ligne.tirsSubis >= 5) {
      const part = ligne.arrets / ligne.tirsSubis;
      note += (part - ARRETS_ATTENDUS) * 11;
    }
  } else {
    // Le rendement offensif : des buts, mais pas à n'importe quel prix.
    if (ligne.tirs >= 2) {
      const reussite = ligne.buts / ligne.tirs;
      note += (reussite - REUSSITE_ATTENDUE[poste]) * 4.2;
    }
    // Le volume compte aussi : porter l'attaque se voit.
    const partDesButs = butsEquipe > 0 ? ligne.buts / butsEquipe : 0;
    note += borner((partDesButs - 0.14) * 6, -0.9, 1.8);
    // Le travail de l'ombre.
    note += ligne.pertesProvoquees * 0.16 + ligne.contres * 0.14;
    note -= ligne.pertes * 0.17 + ligne.exclusions * 0.22;
  }

  // Un joueur peu utilisé n'a pas eu le temps de faire la différence.
  const poidsTemps = borner(minutes / 35, 0.25, 1);
  note = NOTE_MOYENNE + (note - NOTE_MOYENNE) * poidsTemps;

  // Le collectif rejaillit sur l'individu, un peu.
  note += resultat * 0.25;
  return Math.round(borner(note, 3, 10) * 10) / 10;
}

/** Note tous les joueurs d'une feuille de match, des deux côtés. */
export function noterFeuille(feuille: FeuilleMatch, posteDe: (joueurId: string) => Poste): void {
  const resultatDomicile: -1 | 0 | 1 =
    feuille.scoreDomicile > feuille.scoreExterieur ? 1 : feuille.scoreDomicile === feuille.scoreExterieur ? 0 : -1;
  const resultatExterieur: -1 | 0 | 1 = resultatDomicile === 0 ? 0 : resultatDomicile === 1 ? -1 : 1;

  for (const ligne of feuille.joueursDomicile) {
    ligne.note = noterJoueur(ligne, posteDe(ligne.joueurId), feuille.scoreDomicile, resultatDomicile);
  }
  for (const ligne of feuille.joueursExterieur) {
    ligne.note = noterJoueur(ligne, posteDe(ligne.joueurId), feuille.scoreExterieur, resultatExterieur);
  }
}
