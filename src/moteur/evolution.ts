import { borner, creerAleatoire, grainePour, type Aleatoire } from "./aleatoire";
import { bornerAttributs, note, PONDERATIONS } from "./attributs";
import {
  creerJoueur,
  creerNommeur,
  echangesProposes,
  indexer,
  meilleurSept,
  salaireAttendu,
  type IndexMonde,
} from "./monde";
import { classement, meilleursButeurs, type Saison } from "./saison";
import {
  ATTRIBUTS,
  POSTES,
  type BilanDivision,
  type BilanSaison,
  type CleAttribut,
  type Joueur,
  type Monde,
  type MouvementEffectif,
  type Poste,
} from "./types";

/* --------------------------------------------------------------- réglages */

/** Nombre de clubs qui montent et descendent entre deux divisions voisines. */
export const MONTEES = 2;
/** Effectif visé pour chaque club. */
export const TAILLE_EFFECTIF = 18;
/** Âge à partir duquel un joueur peut raccrocher. */
export const AGE_RETRAITE = 32;
/** Âge auquel il raccroche de toute façon. */
export const AGE_LIMITE = 39;

/* ------------------------------------------------------- progression d'un joueur */

/**
 * Gain exprimé en points de note, pas en points d'attribut. La note est une
 * moyenne pondérée : un point ajouté à un attribut ne la fait monter que de
 * son poids, environ 0,15. Sans cette conversion, un jeune à fort potentiel
 * progressait de 0,4 note par saison et n'aurait jamais éclos.
 */
function appliquerGain(j: Joueur, gainEnNotes: number, alea: Aleatoire) {
  const poids = PONDERATIONS[j.poste];
  const cles = Object.keys(poids) as CleAttribut[];
  const valeurs = cles.map((c) => poids[c] ?? 0);
  const total = valeurs.reduce((a, b) => a + b, 0);
  // Espérance de hausse de la note par point d'attribut ajouté.
  const esperance = valeurs.reduce((a, b) => a + b * b, 0) / (total * total);
  const points = Math.round(Math.abs(gainEnNotes) / Math.max(0.05, esperance));
  const pas = gainEnNotes >= 0 ? 1 : -1;
  for (let i = 0; i < points; i++) {
    const cle = alea.choixPondere(cles, valeurs);
    j.attributs[cle] = borner(j.attributs[cle] + pas, 1, 20);
  }
}

/** Déclin physique : ce qui s'en va d'abord, et ce qui reste. */
function appliquerDeclin(j: Joueur, force: number, alea: Aleatoire) {
  const physiques: CleAttribut[] = ["vitesse", "detente", "resistance", "puissance"];
  for (const cle of physiques) {
    if (alea.chance(force)) j.attributs[cle] = borner(j.attributs[cle] - 1, 1, 20);
  }
  // L'expérience compense un peu, jamais assez.
  if (alea.chance(0.45)) {
    const mental: CleAttribut = alea.choix(["sangFroid", "vision", "placement"]);
    j.attributs[mental] = borner(j.attributs[mental] + 1, 1, 20);
  }
}

/**
 * Une saison de plus. Les jeunes progressent d'autant plus qu'ils ont joué —
 * les minutes ne sont donc pas seulement une ressource à ménager, c'est aussi
 * ce qui fait éclore un joueur. Les trentenaires perdent leurs jambes.
 */
export function faireProgresser(j: Joueur, minutes: number, alea: Aleatoire): { avant: number; apres: number } {
  const avant = note(j.poste, j.attributs);
  const marge = j.potentiel - avant;
  // Une saison pleine, c'est environ 1 000 minutes pour un titulaire.
  const partJeu = borner(minutes / 900, 0, 1.2);

  if (j.age <= 23) {
    // Un titulaire comble environ un tiers de sa marge par saison, un joueur
    // qui ne joue pas trois fois moins : le temps de jeu est ce qui fait
    // éclore un joueur, pas seulement une ressource à ménager.
    const gain = Math.max(0, marge) * (0.14 + 0.34 * partJeu) * alea.entre(0.5, 1.5);
    appliquerGain(j, gain, alea);
  } else if (j.age <= 28) {
    const gain = Math.max(0, marge) * (0.06 + 0.16 * partJeu) * alea.entre(0.3, 1.3);
    appliquerGain(j, gain, alea);
  } else if (j.age <= 31) {
    appliquerDeclin(j, 0.5, alea);
  } else {
    appliquerDeclin(j, 0.8 + (j.age - 32) * 0.08, alea);
    // Le bras finit par lâcher avant les jambes chez un arrière.
    if (alea.chance(0.5)) j.attributs.tir = borner(j.attributs.tir - 1, 1, 20);
  }

  bornerAttributs(j.attributs);
  const apres = note(j.poste, j.attributs);
  // Le potentiel ne redescend pas sous le niveau atteint.
  j.potentiel = Math.max(j.potentiel, apres);
  return { avant, apres };
}

/** Un joueur raccroche-t-il ? Le niveau compte autant que l'âge. */
export function prendSaRetraite(j: Joueur, alea: Aleatoire): boolean {
  if (j.age >= AGE_LIMITE) return true;
  if (j.age < AGE_RETRAITE) return false;
  const niveau = note(j.poste, j.attributs);
  const risque = (j.age - AGE_RETRAITE + 1) * 0.14 + (niveau < 11 ? 0.25 : niveau < 13 ? 0.1 : 0);
  return alea.chance(risque);
}

/* ------------------------------------------------------- recrutement et formation */

/* ---------------------------------------------------------- bascule de saison */

/**
 * Réputation visée : celle de sa division, corrigée du classement de la saison.
 * Sans le rappel vers la division, les clubs dériveraient indéfiniment ; sans
 * la correction par le résultat, un champion ne renforcerait jamais son
 * effectif et aucune hiérarchie ne se formerait.
 */
function reputationCible(niveau: number, rang: number, taille: number): number {
  const base = niveau === 1 ? 77 : niveau === 2 ? 52 : 30;
  const milieu = (taille + 1) / 2;
  return base + (milieu - rang) * 0.8;
}

/**
 * Clôt la saison et prépare la suivante : classements figés, montées et
 * descentes, vieillissement, progressions, retraites, centre de formation,
 * réputations et budgets. Le monde entier vieillit, pas seulement le club du
 * joueur.
 */
export function passerALaSaisonSuivante(monde: Monde, saison: Saison, graine: number): BilanSaison {
  const idx = indexer(monde);
  const alea = creerAleatoire(grainePour(graine, "bascule", monde.saison));

  const bilanDivisions = figerClassements(monde, saison, idx);
  appliquerMonteesEtDescentes(monde, bilanDivisions, idx);
  const mouvements = vieillirLeMonde(monde, saison, alea, bilanDivisions);

  const bilan: BilanSaison = { annee: monde.saison, divisions: bilanDivisions, mouvements };
  monde.historique.push(bilan);
  monde.saison += 1;
  return bilan;
}

function figerClassements(monde: Monde, saison: Saison, idx: IndexMonde): BilanDivision[] {
  return monde.divisions.map((division) => {
    const table = classement(monde, saison, division.id, idx);
    const buteur = meilleursButeurs(monde, saison, idx, division.id, 1)[0];
    return {
      divisionId: division.id,
      nom: division.nom,
      classement: table.map((l) => ({
        clubId: l.clubId,
        nom: l.nom,
        rang: l.rang,
        points: l.points,
        difference: l.difference,
      })),
      promus: [],
      relegues: [],
      meilleurButeur: buteur
        ? { nom: `${buteur.joueur.prenom} ${buteur.joueur.nom}`, clubAbbr: buteur.clubAbbr, buts: buteur.buts }
        : null,
    };
  });
}

function appliquerMonteesEtDescentes(monde: Monde, bilans: BilanDivision[], idx: IndexMonde) {
  const parNiveau = [...monde.divisions].sort((a, b) => a.niveau - b.niveau);

  for (let i = 0; i < parNiveau.length - 1; i++) {
    const haute = parNiveau[i];
    const basse = parNiveau[i + 1];
    const bilanHaute = bilans.find((b) => b.divisionId === haute.id)!;
    const bilanBasse = bilans.find((b) => b.divisionId === basse.id)!;
    if (!bilanHaute.classement.length || !bilanBasse.classement.length) continue;

    const relegues = bilanHaute.classement.slice(-MONTEES).map((l) => l.clubId);
    const promus = bilanBasse.classement.slice(0, MONTEES).map((l) => l.clubId);
    bilanHaute.relegues = relegues;
    bilanBasse.promus = promus;

    for (const clubId of relegues) {
      const club = idx.clubParId.get(clubId)!;
      club.divisionId = basse.id;
      haute.clubIds = haute.clubIds.filter((id) => id !== clubId);
      basse.clubIds.push(clubId);
    }
    for (const clubId of promus) {
      const club = idx.clubParId.get(clubId)!;
      club.divisionId = haute.id;
      basse.clubIds = basse.clubIds.filter((id) => id !== clubId);
      haute.clubIds.push(clubId);
    }
  }
}

function vieillirLeMonde(
  monde: Monde,
  saison: Saison,
  alea: Aleatoire,
  bilans: BilanDivision[],
): MouvementEffectif[] {
  const nommer = creerNommeur(alea);
  const mouvements: MouvementEffectif[] = [];
  const restants: Joueur[] = [];
  const parClub = new Map<string, Joueur[]>();
  for (const j of monde.joueurs) {
    if (!j.clubId) continue;
    const liste = parClub.get(j.clubId);
    if (liste) liste.push(j);
    else parClub.set(j.clubId, [j]);
  }

  for (const club of monde.clubs) {
    const division = monde.divisions.find((d) => d.id === club.divisionId)!;
    const mouvement: MouvementEffectif = { clubId: club.id, retraites: [], eclosions: [], arrivees: [], progressions: [] };
    const effectif = parClub.get(club.id) ?? [];
    const gardes: Joueur[] = [];
    /**
     * Ce qui part détermine ce qui arrive : un titulaire qui raccroche est
     * remplacé au barème d'un titulaire, un troisième couteau par un jeune du
     * centre. Sans cette règle du remplacement à l'identique, le championnat
     * gagnait ou perdait un point de niveau par saison.
     */
    const aRemplacer: { poste: Poste; rang: number }[] = [];
    const rangDe = (j: Joueur) => {
      const memePoste = effectif
        .filter((x) => x.poste === j.poste)
        .sort((a, b) => note(b.poste, b.attributs) - note(a.poste, a.attributs));
      return Math.min(2, Math.max(0, memePoste.findIndex((x) => x.id === j.id)));
    };

    for (const j of effectif) {
      j.age += 1;
      const minutes = (saison.statsJoueurs[j.id]?.secondes ?? 0) / 60;
      const { avant, apres } = faireProgresser(j, minutes, alea);
      if (Math.abs(apres - avant) >= 0.4) {
        mouvement.progressions.push({ nom: `${j.prenom} ${j.nom}`, poste: j.poste, avant, apres });
      }
      if (prendSaRetraite(j, alea)) {
        mouvement.retraites.push({ nom: `${j.prenom} ${j.nom}`, age: j.age, poste: j.poste });
        aRemplacer.push({ poste: j.poste, rang: rangDe(j) });
        continue;
      }
      // Remise à zéro de l'état du jour et renouvellement des contrats échus.
      j.condition = alea.entier(88, 100);
      j.forme = 0;
      j.moral = borner(j.moral + alea.entier(-5, 10), 30, 90);
      j.blessureJours = 0;
      if (j.saisonFinContrat <= monde.saison) j.saisonFinContrat = monde.saison + 1 + alea.entier(1, 3);
      j.salaire = salaireAttendu(note(j.poste, j.attributs), j.age, club.reputation);
      gardes.push(j);
    }

    // La réputation glisse vers celle de sa division, corrigée du classement :
    // sans ce rappel, les clubs dériveraient saison après saison.
    // Le rang est celui de la saison qui vient de finir, dans la division où
    // le club évoluait alors.
    const bilan = bilans.find((b) => b.classement.some((l) => l.clubId === club.id));
    const ligne = bilan?.classement.find((l) => l.clubId === club.id);
    const niveauJoue = bilan ? (monde.divisions.find((d) => d.id === bilan.divisionId)?.niveau ?? division.niveau) : division.niveau;
    const cible = reputationCible(niveauJoue, ligne?.rang ?? 7, bilan?.classement.length ?? 14);
    club.reputation = Math.round(borner(club.reputation + (cible - club.reputation) * 0.3, 12, 96));
    club.budget = Math.round(club.reputation * club.reputation * 42);
    club.masseSalarialeMax = Math.round(club.reputation * club.reputation * 26);

    // Centre de formation et recrutement : on remplit l'effectif à 18.
    const numerosPris = new Set(gardes.map((j) => j.numero));
    let index = 0;
    while (gardes.length < TAILLE_EFFECTIF) {
      const place = aRemplacer.shift() ?? { poste: posteLeMoinsFourni(gardes), rang: 2 };
      // Le centre de formation alimente les fins de banc, pas le sept majeur.
      const jeune = place.rang >= 2 && alea.chance(0.6);
      let numero = alea.entier(2, 99);
      while (numerosPris.has(numero)) numero = alea.entier(2, 99);
      numerosPris.add(numero);
      const recrue = creerJoueur(alea, {
        id: `${club.id}-s${monde.saison + 1}-${index++}`,
        clubId: club.id,
        poste: place.poste,
        rang: place.rang,
        reputation: club.reputation,
        style: club.style,
        saison: monde.saison + 1,
        nommer,
        numero,
        defenseur: !jeune && (place.poste === "PV" || place.poste === "ArG" || place.poste === "ArD") && alea.chance(0.35),
        // Un club recrute dans la tranche où un joueur a encore à donner :
              // sans cela, la population du championnat vieillissait d'un an
              // toutes les trois saisons.
        age: jeune ? alea.entier(17, 19) : alea.entier(19, 24),
      });
      gardes.push(recrue);
      if (jeune) {
        mouvement.eclosions.push({
          nom: `${recrue.prenom} ${recrue.nom}`,
          age: recrue.age,
          poste: place.poste,
          potentiel: recrue.potentiel,
        });
      } else {
        mouvement.arrivees.push({ nom: `${recrue.prenom} ${recrue.nom}`, age: recrue.age, poste: place.poste });
      }
    }

    mouvement.progressions.sort((a, b) => b.apres - b.avant - (a.apres - a.avant));
    mouvement.progressions = mouvement.progressions.slice(0, 6);
    mouvements.push(mouvement);
    restants.push(...gardes);
  }

  monde.joueurs = restants;

  // Les tactiques repointent vers des joueurs qui existent encore.
  for (const club of monde.clubs) {
    const effectif = restants.filter((j) => j.clubId === club.id);
    club.tactique.sept = meilleurSept(effectif);
    club.tactique.specialistes = echangesProposes(effectif, club.tactique.sept);
  }
  return mouvements;
}

/** Le poste où l'effectif est le plus court. */
function posteLeMoinsFourni(effectif: Joueur[]): Poste {
  const cibles: Record<Poste, number> = { GB: 3, ArG: 3, ArD: 3, AiG: 2, AiD: 2, DC: 3, PV: 2 };
  let choisi: Poste = "ArG";
  let manqueMax = -Infinity;
  for (const poste of POSTES) {
    const manque = cibles[poste] - effectif.filter((j) => j.poste === poste).length;
    if (manque > manqueMax) {
      manqueMax = manque;
      choisi = poste;
    }
  }
  return choisi;
}

/* ---------------------------------------------------------------- palmarès */

export type LignePalmares = { clubId: string; nom: string; titres: number; montees: number; descentes: number };

/** Palmarès cumulé depuis le début de la partie. */
export function palmares(monde: Monde): LignePalmares[] {
  const lignes = new Map<string, LignePalmares>();
  for (const club of monde.clubs) {
    lignes.set(club.id, { clubId: club.id, nom: club.nom, titres: 0, montees: 0, descentes: 0 });
  }
  for (const bilan of monde.historique) {
    const elite = bilan.divisions.find((d) => d.divisionId === "d1");
    if (elite?.classement.length) {
      const champion = lignes.get(elite.classement[0].clubId);
      if (champion) champion.titres++;
    }
    for (const division of bilan.divisions) {
      for (const clubId of division.promus) {
        const l = lignes.get(clubId);
        if (l) l.montees++;
      }
      for (const clubId of division.relegues) {
        const l = lignes.get(clubId);
        if (l) l.descentes++;
      }
    }
  }
  return [...lignes.values()].sort((a, b) => b.titres - a.titres || b.montees - a.montees);
}
