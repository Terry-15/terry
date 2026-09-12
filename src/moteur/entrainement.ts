import { borner, creerAleatoire, grainePour, type Aleatoire } from "./aleatoire";
import { note } from "./attributs";
import type { CleAttribut, Entrainement, FocusEntrainement, IntensiteEntrainement, Joueur, Poste } from "./types";

/**
 * L'entraînement de la semaine. Deux réglages seulement, mais qui portent :
 * ce qu'on travaille, et à quelle intensité. Le reste vient des joueurs —
 * leur implication n'est pas la même d'un homme à l'autre, et c'est elle qui
 * décide de qui progresse vraiment.
 */

export const FOCUS: Record<FocusEntrainement, { libelle: string; description: string; cles: CleAttribut[] }> = {
  physique: {
    libelle: "Préparation physique",
    description: "Vitesse, détente et résistance. Ce qui tient les soixante minutes et ce qui part le plus vite après trente ans.",
    cles: ["vitesse", "detente", "resistance", "puissance"],
  },
  tir: {
    libelle: "Travail du tir",
    description: "Précision, puissance de bras et sang-froid. La séance qui fait gagner des matchs serrés.",
    cles: ["tir", "puissance", "sangFroid"],
  },
  defense: {
    libelle: "Bloc défensif",
    description: "Duel, blocage, interception. Une équipe qui défend encaisse moins, et récupère plus de ballons.",
    cles: ["defense", "blocage", "interception", "agressivite"],
  },
  collectif: {
    libelle: "Jeu collectif",
    description: "Passe, vision, discipline. Moins de ballons perdus, de meilleurs tirs pour tout le monde.",
    cles: ["passe", "vision", "sangFroid", "discipline"],
  },
  gardiens: {
    libelle: "Séance gardiens",
    description: "Arrêts, réflexes, placement. Ne profite qu'aux gardiens, mais aucun poste ne pèse autant sur un match.",
    cles: ["arrets", "reflexes", "placement", "relance"],
  },
  recuperation: {
    libelle: "Récupération",
    description: "On ne travaille rien, on récupère. Personne ne progresse, mais l'effectif repart frais et se blesse moins.",
    cles: [],
  },
};

export const INTENSITES: Record<
  IntensiteEntrainement,
  { libelle: string; description: string; condition: number; risque: number; rendement: number }
> = {
  legere: {
    libelle: "Allégée",
    description: "On ménage les organismes. Peu de progrès, mais un effectif frais le jour du match.",
    condition: 6.5,
    risque: 0.4,
    rendement: 0.55,
  },
  normale: {
    libelle: "Normale",
    description: "Le rythme d'une semaine ordinaire entre deux matchs.",
    condition: 2.5,
    risque: 1,
    rendement: 1,
  },
  soutenue: {
    libelle: "Soutenue",
    description: "On pousse. Les progrès sont réels, la fatigue et les blessures aussi.",
    condition: -2.5,
    risque: 2.1,
    rendement: 1.5,
  },
};

export const ENTRAINEMENT_PAR_DEFAUT: Entrainement = { focus: "collectif", intensite: "normale" };

export type LigneEntrainement = {
  joueurId: string;
  nom: string;
  poste: Poste;
  /** Implication de la semaine, sur 10. */
  implication: number;
  /** Condition après la séance. */
  condition: number;
  blesse: boolean;
};

export type RapportEntrainement = {
  journee: number;
  focus: FocusEntrainement;
  intensite: IntensiteEntrainement;
  lignes: LigneEntrainement[];
};

/**
 * Implication d'un joueur à la séance, sur 10. Un professionnel discipliné
 * s'applique, un joueur au moral bas décroche, un jeune qui a tout à
 * apprendre s'accroche, et personne ne s'applique quand on le fait courir
 * alors qu'il est déjà cuit.
 */
export function implicationSeance(j: Joueur, intensite: IntensiteEntrainement, alea: Aleatoire): number {
  const marge = Math.max(0, j.potentiel - note(j.poste, j.attributs));
  let valeur = 5.4;
  valeur += (j.attributs.discipline - 12) * 0.4;
  valeur += ((j.moral - 60) / 100) * 1.8;
  valeur += j.age <= 22 ? 0.5 : j.age >= 33 ? -0.35 : 0;
  valeur += Math.min(1.2, marge * 0.14);
  if (intensite === "soutenue" && j.condition < 55) valeur -= 0.9;
  if (j.blessureJours > 0) return 0;
  valeur += alea.gaussien(0, 0.85);
  return Math.round(borner(valeur, 1, 10) * 10) / 10;
}

/**
 * Une semaine d'entraînement pour un club. On n'applique pas les progrès tout
 * de suite : ils se jouent à la bascule de saison, à partir de l'implication
 * moyenne. Ici on règle la fraîcheur, les blessures, et on note la séance.
 */
export function entrainerSemaine(
  effectif: Joueur[],
  entrainement: Entrainement,
  journee: number,
  graine: number,
): RapportEntrainement {
  const alea = creerAleatoire(grainePour(graine, "entrainement", journee, effectif[0]?.clubId ?? ""));
  const reglage = INTENSITES[entrainement.intensite];
  const lignes: LigneEntrainement[] = [];

  for (const j of effectif) {
    if (j.blessureJours > 0) {
      j.blessureJours -= 1;
      j.condition = borner(j.condition + 8, 0, 100);
      lignes.push({
        joueurId: j.id,
        nom: `${j.prenom} ${j.nom}`,
        poste: j.poste,
        implication: 0,
        condition: Math.round(j.condition),
        blesse: true,
      });
      continue;
    }

    const implication = implicationSeance(j, entrainement.intensite, alea);
    j.implication = (j.implication * j.semainesEntrainement + implication) / (j.semainesEntrainement + 1);
    j.semainesEntrainement += 1;

    const bonusRecuperation = entrainement.focus === "recuperation" ? 6 : 0;
    j.condition = borner(j.condition + reglage.condition + bonusRecuperation, 10, 100);

    // Une séance poussée sur un organisme entamé, c'est la blessure classique.
    const risque =
      0.004 * reglage.risque * (entrainement.focus === "recuperation" ? 0.4 : 1) * (1 + Math.max(0, 60 - j.condition) * 0.02);
    let blesse = false;
    if (alea.chance(risque)) {
      j.blessureJours = alea.entier(1, 5);
      j.moral = borner(j.moral - 6, 0, 100);
      blesse = true;
    }

    lignes.push({
      joueurId: j.id,
      nom: `${j.prenom} ${j.nom}`,
      poste: j.poste,
      implication,
      condition: Math.round(j.condition),
      blesse,
    });
  }

  lignes.sort((a, b) => b.implication - a.implication);
  return { journee, focus: entrainement.focus, intensite: entrainement.intensite, lignes };
}

/**
 * Le focus d'un club non dirigé : il travaille ce qui lui manque, et ménage
 * son effectif quand il est usé.
 */
export function focusAutomatique(effectif: Joueur[], alea: Aleatoire): Entrainement {
  const conditionMoyenne = effectif.reduce((s, j) => s + j.condition, 0) / Math.max(1, effectif.length);
  if (conditionMoyenne < 62) return { focus: "recuperation", intensite: "legere" };

  const champ = effectif.filter((j) => j.poste !== "GB");
  const moyenne = (cle: CleAttribut) => champ.reduce((s, j) => s + j.attributs[cle], 0) / Math.max(1, champ.length);
  const candidats: [FocusEntrainement, number][] = [
    ["tir", moyenne("tir")],
    ["defense", moyenne("defense")],
    ["collectif", (moyenne("passe") + moyenne("vision")) / 2],
    ["physique", (moyenne("vitesse") + moyenne("resistance")) / 2],
  ];
  candidats.sort((a, b) => a[1] - b[1]);
  const focus = alea.chance(0.75) ? candidats[0][0] : alea.choix(candidats).at(0) as FocusEntrainement;
  return { focus, intensite: conditionMoyenne > 82 ? "soutenue" : "normale" };
}
