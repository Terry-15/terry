import { borner, creerAleatoire, grainePour, type Aleatoire } from "./aleatoire";
import { PONDERATIONS, bornerAttributs, malusMain, note } from "./attributs";
import { ENTRAINEMENT_PAR_DEFAUT } from "./entrainement";
import { DIVISIONS_MODELE, NOMS, PRENOMS, type ModeleClub, type StyleClub } from "./noms";
import {
  ATTRIBUTS,
  POSTES,
  POSTES_CHAMP,
  type Attributs,
  type CleAttribut,
  type Club,
  type Division,
  type EchangeSpecialiste,
  type Joueur,
  type Main,
  type Monde,
  type Poste,
  type Tactique,
} from "./types";

export const VERSION_MONDE = 1;

/**
 * Composition d'un effectif : 18 joueurs, trois gardiens, deux à trois
 * joueurs par poste de champ. L'ordre compte — le premier de chaque poste
 * est le titulaire attendu, et reçoit un bonus de niveau.
 */
const PLAN_EFFECTIF: Poste[] = [
  "GB", "GB", "GB",
  "ArG", "ArG", "ArG",
  "ArD", "ArD", "ArD",
  "AiG", "AiG",
  "AiD", "AiD",
  "DC", "DC", "DC",
  "PV", "PV",
];

/** Bonus de niveau selon le rang au poste : titulaire, doublure, troisième. */
const BONUS_RANG = [1.2, -0.2, -1.5];

/**
 * Le spécialiste défensif : un joueur qu'on recrute pour les six minutes de
 * défense et qu'on sort dès qu'on attaque. Sans ce profil dans les effectifs,
 * la rotation attaque / défense n'aurait personne à faire tourner.
 */
const PROFIL_DEFENSEUR: Partial<Record<CleAttribut, number>> = {
  defense: 3.4,
  blocage: 2.8,
  agressivite: 1.6,
  tir: -3.2,
  duel: -1.2,
  vitesse: -1,
};

/** Profil d'attributs dominants par poste, en points ajoutés à la base. */
const PROFILS: Record<Poste, Partial<Record<CleAttribut, number>>> = {
  GB: { arrets: 3.4, reflexes: 2.8, placement: 2.4, relance: 1.4, sangFroid: 1, vitesse: -3, tir: -4, puissance: -3, duel: -3, blocage: -3, detente: 0.5 },
  ArG: { tir: 2.4, puissance: 3, blocage: 1.6, defense: 1.2, detente: 1, vitesse: -0.6, arrets: -6, reflexes: -6, placement: -6, relance: -6 },
  ArD: { tir: 2.4, puissance: 3, blocage: 1.6, defense: 1.2, detente: 1, vitesse: -0.6, arrets: -6, reflexes: -6, placement: -6, relance: -6 },
  AiG: { vitesse: 3.6, detente: 3, tir: 1.2, duel: 0.8, puissance: -2, defense: -1.4, blocage: -2.5, arrets: -6, reflexes: -6, placement: -6, relance: -6 },
  AiD: { vitesse: 3.6, detente: 3, tir: 1.2, duel: 0.8, puissance: -2, defense: -1.4, blocage: -2.5, arrets: -6, reflexes: -6, placement: -6, relance: -6 },
  DC: { vision: 3.8, passe: 3.4, sangFroid: 1.8, puissance: -1.4, agressivite: -0.8, arrets: -6, reflexes: -6, placement: -6, relance: -6 },
  PV: { duel: 3, defense: 2.6, puissance: 2.6, agressivite: 1.8, vitesse: -1.6, vision: -1.2, blocage: 0.8, arrets: -6, reflexes: -6, placement: -6, relance: -6 },
};

/**
 * Le style du club déforme l'effectif : gros arrières d'un côté, jeu
 * intérieur de l'autre. Les bonus se compensent en force globale.
 */
const BIAIS_STYLE: Record<StyleClub, Partial<Record<Poste, Partial<Record<CleAttribut, number>>>>> = {
  distance: {
    ArG: { tir: 2.4, puissance: 2 },
    ArD: { tir: 2.4, puissance: 2 },
    DC: { tir: 1.2 },
    AiG: { tir: -1.6, vitesse: -1.2 },
    AiD: { tir: -1.6, vitesse: -1.2 },
    PV: { tir: -1.4, duel: -1.4 },
  },
  interieur: {
    ArG: { tir: -2.2, puissance: -1.6 },
    ArD: { tir: -2.2, puissance: -1.6 },
    AiG: { tir: 1.8, vitesse: 1.6 },
    AiD: { tir: 1.8, vitesse: 1.6 },
    PV: { tir: 2.2, duel: 2.2 },
  },
  equilibre: {},
};

/** Courbe d'âge : où en est le joueur par rapport à son potentiel. */
export function partAccomplie(age: number): number {
  if (age <= 17) return 0.55;
  if (age >= 30) return borner(1 - (age - 30) * 0.035, 0.72, 1);
  return borner(0.55 + (age - 17) * 0.0346, 0.55, 1);
}

/** Déclin physique des vétérans, gain d'expérience des anciens. */
const DELTAS_AGE = (age: number): Partial<Record<CleAttribut, number>> => {
  if (age <= 21) return { sangFroid: -1.6, vision: -1, defense: -0.8, vitesse: 0.6 };
  if (age <= 25) return { sangFroid: -0.4, vision: -0.3 };
  if (age <= 29) return { sangFroid: 0.5 };
  if (age <= 32) return { sangFroid: 1.4, vision: 1, vitesse: -1.4, detente: -1.2, resistance: -0.8 };
  return { sangFroid: 2, vision: 1.4, vitesse: -3, detente: -2.6, resistance: -2, puissance: -1 };
};

function tirerAge(alea: Aleatoire, rang: number): number {
  // Les titulaires sont plus souvent dans la tranche 24-30, les troisièmes
  // couteaux sont soit très jeunes, soit en fin de carrière.
  const base = alea.gaussien(rang === 0 ? 27 : 25, rang === 2 ? 5.5 : 4);
  return borner(Math.round(base), 17, 37);
}

function tirerMain(alea: Aleatoire, poste: Poste, reputation: number): Main {
  // Les gauchers sont rares. Les clubs huppés s'offrent les vrais gauchers à
  // l'arrière droit et à l'aile droite ; les autres alignent un droitier,
  // qui tire depuis un angle fermé (voir malusMain).
  if (poste === "ArD" || poste === "AiD") {
    return alea.chance(0.15 + (reputation / 100) * 0.7) ? "gaucher" : "droitier";
  }
  return alea.chance(0.1) ? "gaucher" : "droitier";
}

function posteSecondaire(alea: Aleatoire, poste: Poste): Poste | null {
  if (poste === "GB") return null;
  if (!alea.chance(0.45)) return null;
  const voisins: Record<Exclude<Poste, "GB">, Poste[]> = {
    ArG: ["DC", "ArD"],
    ArD: ["DC", "ArG"],
    AiG: ["ArG", "AiD"],
    AiD: ["ArD", "AiG"],
    DC: ["ArG", "ArD"],
    PV: ["ArG", "ArD"],
  };
  return alea.choix(voisins[poste as Exclude<Poste, "GB">]);
}

/**
 * Niveau moyen d'attribut visé pour un club, dérivé de sa seule réputation.
 * Échelle continue : c'est ce qui évite le défaut « quatre paliers » relevé
 * par l'audit, où tous les gros clubs étaient exactement la même équipe.
 */
export function niveauCible(reputation: number): number {
  return 7.6 + (reputation / 100) * 8.4;
}

export type OptionsJoueur = {
  id: string;
  clubId: string | null;
  poste: Poste;
  /** Rang au poste : 0 titulaire, 1 doublure, 2 troisième. */
  rang: number;
  reputation: number;
  style: StyleClub;
  saison: number;
  nommer: () => [string, string];
  numero: number;
  /** Profil de spécialiste défensif. */
  defenseur?: boolean;
  /** Âge imposé, pour un joueur issu du centre de formation. */
  age?: number;
  /**
   * Note visée, sur 20. Utilisée quand on remplace un joueur précis : le
   * remplaçant arrive au niveau du partant, à un cheveu près. Sans cela, le
   * niveau du championnat dérivait d'un point en dix saisons.
   */
  noteVisee?: number;
};

/**
 * Ajuste les attributs jusqu'à ce que la note du joueur atteigne la cible.
 * On passe par les attributs qui comptent au poste, donc le joueur reste
 * cohérent : on ne fabrique pas un ailier à 18 de puissance.
 */
function ajusterVersNote(poste: Poste, attributs: Attributs, cible: number, alea: Aleatoire) {
  const poids = PONDERATIONS[poste];
  const cles = Object.keys(poids) as CleAttribut[];
  const valeurs = cles.map((c) => poids[c] ?? 0);
  for (let i = 0; i < 60; i++) {
    const ecart = cible - note(poste, attributs);
    if (Math.abs(ecart) < 0.15) break;
    const cle = alea.choixPondere(cles, valeurs);
    attributs[cle] = borner(attributs[cle] + (ecart > 0 ? 1 : -1), 1, 20);
  }
}

/**
 * La seule fabrique de joueurs du jeu. Le centre de formation et le
 * recrutement passent par elle : c'est ce qui garantit qu'un joueur créé à la
 * dixième saison est au même barème qu'un joueur de la première, et donc que
 * le niveau du championnat ne dérive pas.
 */
export function creerJoueur(alea: Aleatoire, o: OptionsJoueur): Joueur {
  const { id, clubId, poste, rang, reputation, style, saison, nommer, numero } = o;
  const defenseur = o.defenseur === true;
  const age = o.age ?? tirerAge(alea, rang);
  const main = tirerMain(alea, poste, reputation);
  const profil = PROFILS[poste];
  const biaisStyle = BIAIS_STYLE[style][poste] ?? {};
  const deltas = DELTAS_AGE(age);
  const cible = niveauCible(reputation) + (BONUS_RANG[rang] ?? -2.2);
  const accompli = partAccomplie(age);

  const attributs = {} as Attributs;
  for (const cle of ATTRIBUTS) {
    const brut =
      cible * accompli +
      (profil[cle] ?? 0) +
      (biaisStyle[cle] ?? 0) +
      (defenseur ? (PROFIL_DEFENSEUR[cle] ?? 0) : 0) +
      (deltas[cle] ?? 0) +
      alea.gaussien(0, 1.35);
    attributs[cle] = brut;
  }
  // Le malus de main joue sur le tir, pas sur le reste.
  attributs.tir += malusMain(poste, main);
  bornerAttributs(attributs);

  // Avant toute autre chose : si on remplace un partant, on recale les
  // attributs sur sa note. L'ordre des tirages qui suivent ne doit pas
  // changer, sinon tout le monde généré change avec lui.
  if (o.noteVisee !== undefined) ajusterVersNote(poste, attributs, o.noteVisee, alea);
  const noteActuelle = note(poste, attributs);
  const margeProgression = age <= 20 ? alea.entre(1.5, 4.5) : age <= 24 ? alea.entre(0.6, 2.8) : age <= 28 ? alea.entre(0, 1.2) : 0;
  const [prenom, nom] = nommer();

  return {
    id,
    prenom,
    nom,
    age,
    poste,
    posteSecondaire: posteSecondaire(alea, poste),
    main,
    attributs,
    potentiel: Math.round(borner(noteActuelle + margeProgression, 1, 20) * 10) / 10,
    clubId,
    numero,
    salaire: salaireAttendu(noteActuelle, age, reputation),
    saisonFinContrat: saison + alea.entier(1, 4),
    condition: alea.entier(88, 100),
    moral: alea.entier(55, 80),
    forme: 0,
    blessureJours: 0,
    implication: 0,
    semainesEntrainement: 0,
  };
}

/** Salaire mensuel en euros, grossièrement calé sur le handball européen. */
export function salaireAttendu(noteJoueur: number, age: number, reputation: number): number {
  const base = Math.pow(Math.max(1, noteJoueur - 5), 2.35) * 24;
  const facteurAge = age < 21 ? 0.55 : age > 33 ? 0.7 : 1;
  const facteurClub = 0.55 + reputation / 100;
  return Math.round((base * facteurAge * facteurClub) / 50) * 50;
}

/** Tactique par défaut d'un club, avant que son effectif soit connu. */
export function tactiqueParDefaut(): Tactique {
  return {
    systeme: "5-1",
    tempo: "equilibre",
    rotation: "equilibre",
    attaque: "equilibre",
    agressivite: "normale",
    marquage: null,
    gardienVolant: false,
    sept: { GB: "", ArG: "", ArD: "", AiG: "", AiD: "", DC: "", PV: "" },
    specialistes: [],
  };
}

/**
 * Le système maison d'un club, déduit de son effectif : des gabarits qui
 * bloquent défendent bas, des joueurs agressifs qui interceptent défendent
 * haut. Sans cela, les 42 clubs défendraient tous pareil et la moitié des
 * décisions tactiques du joueur n'auraient aucun sens.
 */
export function penchantDefensif(effectif: Joueur[]): number {
  const champ = effectif.filter((j) => j.poste !== "GB");
  if (!champ.length) return 0;
  const moyenne = (cle: CleAttribut) => champ.reduce((s, j) => s + j.attributs[cle], 0) / champ.length;
  const bas = moyenne("defense") * 0.5 + moyenne("blocage") * 0.5;
  const haut = moyenne("interception") * 0.5 + moyenne("agressivite") * 0.5;
  return haut - bas;
}

export function creerNommeur(alea: Aleatoire) {
  const utilises = new Set<string>();
  return (): [string, string] => {
    for (let essai = 0; essai < 400; essai++) {
      const prenom = alea.choix(PRENOMS);
      const nom = alea.choix(NOMS);
      const cle = `${prenom} ${nom}`;
      if (!utilises.has(cle)) {
        utilises.add(cle);
        return [prenom, nom];
      }
    }
    return [alea.choix(PRENOMS), `${alea.choix(NOMS)}-${alea.choix(NOMS)}`];
  };
}

/**
 * Génère le monde une fois pour toutes : trois divisions, 42 clubs,
 * 756 joueurs nommés et persistants. Aucun adversaire n'est fabriqué au coup
 * d'envoi — tout le monde existe avant le premier match.
 */
export function creerMonde(graine: number, saison = 2026): Monde {
  const alea = creerAleatoire(grainePour("monde", graine));
  const nommer = creerNommeur(alea);
  const divisions: Division[] = [];
  const clubs: Club[] = [];
  const joueurs: Joueur[] = [];

  for (const modele of DIVISIONS_MODELE) {
    const clubIds: string[] = [];
    modele.clubs.forEach((mc: ModeleClub, i: number) => {
      const clubId = `${modele.id}-${String(i + 1).padStart(2, "0")}`;
      clubIds.push(clubId);
      const compteurs: Partial<Record<Poste, number>> = {};
      const numerosPris = new Set<number>();

      PLAN_EFFECTIF.forEach((poste, index) => {
        const rang = compteurs[poste] ?? 0;
        compteurs[poste] = rang + 1;
        // Les doublures de l'axe central sont souvent des défenseurs de métier.
        const defenseur =
          rang >= 1 && (poste === "PV" || poste === "ArG" || poste === "ArD") && alea.chance(0.55);
        let numero = poste === "GB" ? [1, 12, 16][rang] ?? 30 : alea.entier(2, 45);
        while (numerosPris.has(numero)) numero = alea.entier(2, 99);
        numerosPris.add(numero);
        joueurs.push(
          creerJoueur(alea, {
            id: `${clubId}-j${index}`,
            clubId,
            poste,
            rang,
            reputation: mc.reputation,
            style: mc.style,
            saison,
            nommer,
            numero,
            defenseur,
          }),
        );
      });

      clubs.push({
        id: clubId,
        nom: mc.nom,
        abbr: mc.abbr,
        ville: mc.ville,
        divisionId: modele.id,
        reputation: mc.reputation,
        style: mc.style,
        budget: Math.round(mc.reputation * mc.reputation * 42),
        masseSalarialeMax: Math.round(mc.reputation * mc.reputation * 26),
        couleur: mc.couleur,
        tactique: tactiqueParDefaut(),
        entrainement: { ...ENTRAINEMENT_PAR_DEFAUT },
      });
    });

    divisions.push({ id: modele.id, nom: modele.nom, niveau: modele.niveau, clubIds });
  }

  const monde: Monde = { version: VERSION_MONDE, graine, saison, divisions, clubs, joueurs, historique: [] };
  // Le système maison se décide par comparaison : le tiers le plus agressif
  // défend haut, le tiers le plus massif défend bas. Un championnat où tout le
  // monde défend pareil viderait de son sens la moitié des choix du joueur.
  const penchants = monde.clubs
    .map((club) => ({ club, ecart: penchantDefensif(monde.joueurs.filter((j) => j.clubId === club.id)) }))
    .sort((a, b) => b.ecart - a.ecart);
  penchants.forEach(({ club }, rang) => {
    const part = rang / penchants.length;
    club.tactique.systeme = part < 0.3 ? "3-2-1" : part < 0.7 ? "5-1" : "6-0";
    const effectif = monde.joueurs.filter((j) => j.clubId === club.id);
    club.tactique.sept = meilleurSept(effectif);
    club.tactique.specialistes = echangesProposes(effectif, club.tactique.sept);
  });
  return monde;
}

/* ------------------------------------------------------------- index & vues */

export type IndexMonde = {
  joueurParId: Map<string, Joueur>;
  clubParId: Map<string, Club>;
  divisionParId: Map<string, Division>;
  effectifParClub: Map<string, Joueur[]>;
};

export function indexer(monde: Monde): IndexMonde {
  const joueurParId = new Map<string, Joueur>();
  const effectifParClub = new Map<string, Joueur[]>();
  for (const j of monde.joueurs) {
    joueurParId.set(j.id, j);
    if (!j.clubId) continue;
    const liste = effectifParClub.get(j.clubId);
    if (liste) liste.push(j);
    else effectifParClub.set(j.clubId, [j]);
  }
  return {
    joueurParId,
    clubParId: new Map(monde.clubs.map((c) => [c.id, c])),
    divisionParId: new Map(monde.divisions.map((d) => [d.id, d])),
    effectifParClub,
  };
}

/** Joueurs disponibles : ni blessés, ni prêtés ailleurs. */
export function disponibles(effectif: Joueur[]): Joueur[] {
  return effectif.filter((j) => j.blessureJours <= 0);
}

/**
 * Meilleur sept possible, poste par poste, en tenant compte de l'état du
 * joueur et de la pénalité s'il dépanne hors de son poste.
 */
export function meilleurSept(effectif: Joueur[]): Record<Poste, string> {
  const libres = disponibles(effectif);
  const pris = new Set<string>();
  const sept = {} as Record<Poste, string>;

  for (const poste of POSTES) {
    const candidats = libres
      .filter((j) => !pris.has(j.id) && j.poste === poste)
      .sort((a, b) => valeurPour(b, poste) - valeurPour(a, poste));
    if (candidats.length) {
      sept[poste] = candidats[0].id;
      pris.add(candidats[0].id);
    }
  }
  // Postes encore vides : on dépanne, gardien avec gardien si possible.
  for (const poste of POSTES) {
    if (sept[poste]) continue;
    const secours =
      libres
        .filter((j) => !pris.has(j.id) && (poste === "GB" ? j.poste === "GB" : j.poste !== "GB"))
        .sort((a, b) => valeurPour(b, poste) - valeurPour(a, poste))[0] ??
      effectif.filter((j) => !pris.has(j.id)).sort((a, b) => valeurPour(b, poste) - valeurPour(a, poste))[0];
    if (secours) {
      sept[poste] = secours.id;
      pris.add(secours.id);
    }
  }
  return sept;
}

export function septAutomatique(monde: Monde, clubId: string): Record<Poste, string> {
  return meilleurSept(monde.joueurs.filter((j) => j.clubId === clubId));
}

/** Valeur d'un joueur à un poste donné, état et polyvalence compris. */
export function valeurPour(j: Joueur, poste: Poste): number {
  const malus = j.poste === poste ? 0 : j.posteSecondaire === poste ? 1 : (j.poste === "GB") !== (poste === "GB") ? 6 : 2.5;
  return note(poste, j.attributs) - malus + j.forme * 0.15 + (j.condition - 80) * 0.012;
}

/** Valeur offensive brute d'un joueur, sur 20. */
export function valeurAttaque(j: Joueur): number {
  return j.attributs.tir * 0.6 + j.attributs.duel * 0.2 + j.attributs.puissance * 0.2;
}

/** Valeur défensive brute d'un joueur, sur 20. */
export function valeurDefense(j: Joueur): number {
  return j.attributs.defense * 0.7 + j.attributs.blocage * 0.3;
}

/**
 * Propose les échanges attaque / défense que l'effectif permet vraiment : un
 * titulaire nettement meilleur en attaque, une doublure nettement meilleure en
 * défense au même poste. Sans profils complémentaires, la rotation ne vaut
 * rien et la fonction ne propose rien — c'est une propriété de l'effectif, pas
 * une case à cocher gratuite.
 */
export function echangesProposes(effectif: Joueur[], sept: Record<Poste, string>, maximum = 2): EchangeSpecialiste[] {
  const parId = new Map(effectif.map((j) => [j.id, j]));
  const titulaires = new Set(Object.values(sept));
  const candidats: (EchangeSpecialiste & { gain: number })[] = [];

  for (const poste of POSTES_CHAMP) {
    const titulaire = parId.get(sept[poste]);
    if (!titulaire) continue;
    for (const doublure of effectif) {
      if (doublure.poste !== poste || titulaires.has(doublure.id) || doublure.blessureJours > 0) continue;
      const gainDefense = valeurDefense(doublure) - valeurDefense(titulaire);
      const gainAttaque = valeurAttaque(titulaire) - valeurAttaque(doublure);
      if (gainDefense < 1.2 || gainAttaque < 0.8) continue;
      candidats.push({ attaquantId: titulaire.id, defenseurId: doublure.id, gain: gainDefense + gainAttaque });
    }
  }

  candidats.sort((a, b) => b.gain - a.gain);
  const retenus: EchangeSpecialiste[] = [];
  const pris = new Set<string>();
  for (const c of candidats) {
    if (retenus.length >= maximum) break;
    if (pris.has(c.attaquantId) || pris.has(c.defenseurId)) continue;
    pris.add(c.attaquantId);
    pris.add(c.defenseurId);
    retenus.push({ attaquantId: c.attaquantId, defenseurId: c.defenseurId });
  }
  return retenus;
}

/**
 * Force d'un club, sur 100, dérivée uniquement de son effectif : le sept
 * majeur pèse le plus, la profondeur compte un peu. Aucun paramètre réglé à
 * la main, aucun arrondi par paliers.
 */
export function forceClub(effectif: Joueur[]): number {
  if (!effectif.length) return 0;
  const sept = meilleurSept(effectif);
  // Le gardien compte pour un quart : c'est son poids réel dans le moteur,
  // où il intervient sur chacun des cinquante tirs adverses.
  let sommeChamp = 0;
  let comptes = 0;
  let noteGardien = 0;
  for (const poste of POSTES) {
    const j = effectif.find((x) => x.id === sept[poste]);
    if (!j) continue;
    if (poste === "GB") noteGardien = note(poste, j.attributs);
    else {
      sommeChamp += note(poste, j.attributs);
      comptes++;
    }
  }
  const moyenneSept = (comptes ? sommeChamp / comptes : 0) * 0.75 + noteGardien * 0.25;
  const reste = effectif
    .filter((j) => !Object.values(sept).includes(j.id))
    .map((j) => note(j.poste, j.attributs));
  const profondeur = reste.length ? reste.reduce((s, n) => s + n, 0) / reste.length : moyenneSept;
  return Math.round((moyenneSept * 0.82 + profondeur * 0.18) * 5 * 10) / 10;
}
