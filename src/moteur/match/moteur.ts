import { borner, creerAleatoire, type Aleatoire } from "../aleatoire";
import { facteurEtat, malusMain, malusPoste, nomCourt, note } from "../attributs";
import { meilleurSept } from "../monde";
import {
  POSTES,
  POSTES_CHAMP,
  type Camp,
  type Club,
  type CleAttribut,
  type EvenementMatch,
  type FeuilleMatch,
  type Joueur,
  type Poste,
  type PosteChamp,
  type SystemeDefensif,
  type StatsEquipeMatch,
  type StatsJoueurMatch,
  type Tactique,
  type TypeTir,
} from "../types";
import {
  AFFINITE_TEMPO,
  AVANTAGE_DOMICILE,
  ECART_JOUR_CHAMP,
  ECART_JOUR_GARDIEN,
  ELAN_MAX,
  ELAN_PAR_BUT,
  ELAN_SEUIL,
  EFFET_TEMPS_MORT,
  FENETRE_FIN_MATCH,
  POSSESSIONS_APRES_TEMPS_MORT,
  RECUPERATION_TEMPS_MORT,
  TEMPS_MORTS_PAR_MATCH,
  TEMPS_MORTS_PAR_MI_TEMPS,
  BASE_TIR,
  BUT_VIDE,
  DUREE_EXCLUSION,
  DUREE_MATCH,
  DUREE_MI_TEMPS,
  DUREE_MINIMALE_POSSESSION,
  EFFET_SUPERIORITE,
  EXCLUSIONS_AVANT_DISQUALIFICATION,
  FAUTE_BASE,
  FENETRE_GARDIEN_VOLANT,
  RETARD_GARDIEN_VOLANT,
  INTERACTION,
  PART_CONTRE,
  PART_MANQUE,
  PART_PROVOQUEE,
  PART_TIRS,
  PENETRATION,
  PENTE_QUALITE,
  PERTE_BASE,
  RECUPERATION_BANC_PAR_MINUTE,
  REBOND_OFFENSIF,
  RISQUE_CHANGEMENT_IRREGULIER,
  RELACHEMENT_MAX,
  RELACHEMENT_PAR_BUT,
  RELACHEMENT_SEUIL,
  REPARTITION_FAUTE,
  SEUILS_ROTATION,
  SYSTEMES,
  TEMPOS,
  USURE_PAR_MINUTE,
} from "./parametres";

export type EntreeEquipe = {
  club: Club;
  /** Joueurs convoqués — l'effectif disponible du club. */
  effectif: Joueur[];
  tactique: Tactique;
};

export type OptionsMatch = {
  graine: number;
  /** Génère le fil d'événements commenté. Coûteux : réservé aux matchs regardés. */
  commentaire?: boolean;
  /** Terrain neutre : pas d'avantage pour l'équipe « à domicile ». */
  neutre?: boolean;
  /**
   * Camp dont les temps morts et les changements sont laissés à l'appelant.
   * Sans ce réglage, les deux bancs sont tenus par le moteur.
   */
  pilote?: Camp;
};

/* ------------------------------------------------------------ état interne */

type EtatJoueur = {
  j: Joueur;
  secondes: number;
  condition: number;
  /** Réussite du jour, tirée au coup d'envoi et jamais affichée. */
  jour: number;
  stats: StatsJoueurMatch;
  exclusionsSubies: number;
  disqualifie: boolean;
  surTerrain: boolean;
};

type PlaceChamp = { id: string; poste: PosteChamp };

type Exclusion = { id: string; fin: number; poste: PosteChamp | "GB" };

type Cote = {
  camp: Camp;
  club: Club;
  tactique: Tactique;
  etats: Map<string, EtatJoueur>;
  gardien: string | null;
  champ: PlaceChamp[];
  banc: string[];
  exclusions: Exclusion[];
  stats: StatsEquipeMatch;
  gardienVolant: boolean;
  changements: number;
  score: number;
  miTemps: number;
  /** Temps morts pris : total, par mi-temps, et dans les cinq dernières minutes. */
  tempsMorts: { total: number; parMiTemps: [number, number]; fin: number };
  /** Possessions restantes sous l'effet du dernier temps mort. */
  bonusTempsMort: number;
  /** Buts encaissés d'affilée sans réponse — ce qui déclenche un temps mort. */
  serieAdverse: number;
  /** Buts marqués d'affilée sans en encaisser : l'élan du moment. */
  elan: number;
  /** Banc tenu par un humain : le moteur n'y touche pas tout seul. */
  pilote: boolean;
  /** Le sept contre six a déjà été annoncé dans le fil. */
  gardienVolantAnnonce: boolean;
  /** Nombre de rotations attaque / défense effectuées. */
  echangesPhase: number;
};

function statsEquipeVides(): StatsEquipeMatch {
  return {
    buts: 0,
    tirs: 0,
    pertes: 0,
    pertesProvoquees: 0,
    contres: 0,
    exclusions: 0,
    septMetresTires: 0,
    septMetresMarques: 0,
    arrets: 0,
    contreAttaques: 0,
    possessions: 0,
    secondesInferiorite: 0,
  };
}

function statsJoueurVides(joueurId: string): StatsJoueurMatch {
  return {
    joueurId,
    secondes: 0,
    buts: 0,
    tirs: 0,
    septMetresTires: 0,
    septMetresMarques: 0,
    pertes: 0,
    pertesProvoquees: 0,
    contres: 0,
    exclusions: 0,
    arrets: 0,
    tirsSubis: 0,
  };
}

function creerCote(entree: EntreeEquipe, camp: Camp, alea: Aleatoire): Cote {
  const etats = new Map<string, EtatJoueur>();
  for (const j of entree.effectif) {
    etats.set(j.id, {
      j,
      secondes: 0,
      jour: 1 + alea.gaussien(0, j.poste === "GB" ? ECART_JOUR_GARDIEN : ECART_JOUR_CHAMP),
      condition: j.blessureJours > 0 ? 0 : j.condition,
      stats: statsJoueurVides(j.id),
      exclusionsSubies: 0,
      disqualifie: j.blessureJours > 0,
      surTerrain: false,
    });
  }

  // Le sept demandé, corrigé s'il contient un blessé ou un joueur absent.
  const secours = meilleurSept(entree.effectif);
  const sept = {} as Record<Poste, string>;
  const pris = new Set<string>();
  for (const poste of POSTES) {
    const demande = entree.tactique.sept[poste];
    const etat = demande ? etats.get(demande) : undefined;
    const valide = etat && !etat.disqualifie && !pris.has(demande);
    const choisi = valide ? demande : secours[poste];
    if (choisi && !pris.has(choisi)) {
      sept[poste] = choisi;
      pris.add(choisi);
    }
  }

  const champ: PlaceChamp[] = [];
  for (const poste of POSTES_CHAMP) {
    const id = sept[poste];
    if (id) {
      champ.push({ id, poste });
      etats.get(id)!.surTerrain = true;
    }
  }
  const gardien = sept.GB ?? null;
  if (gardien) etats.get(gardien)!.surTerrain = true;

  return {
    camp,
    club: entree.club,
    tactique: entree.tactique,
    etats,
    gardien,
    champ,
    banc: entree.effectif.filter((j) => !pris.has(j.id) && !etats.get(j.id)!.disqualifie).map((j) => j.id),
    exclusions: [],
    stats: statsEquipeVides(),
    gardienVolant: false,
    changements: 0,
    score: 0,
    miTemps: 0,
    tempsMorts: { total: 0, parMiTemps: [0, 0], fin: 0 },
    bonusTempsMort: 0,
    serieAdverse: 0,
    elan: 0,
    gardienVolantAnnonce: false,
    echangesPhase: 0,
    pilote: false,
  };
}

/* ------------------------------------------------------------- attributs */

/** Attribut d'un joueur, corrigé de son état du jour et du poste occupé. */
function attr(cote: Cote, id: string, cle: CleAttribut, posteJoue: Poste): number {
  const e = cote.etats.get(id);
  if (!e) return 8;
  let v = e.j.attributs[cle];
  if (cle === "tir") v += malusMain(posteJoue, e.j.main) - malusMain(e.j.poste, e.j.main);
  const facteurPoste = 1 + malusPoste(e.j, posteJoue) / 22;
  return v * facteurPoste * e.jour * facteurEtat(e.condition, e.j.forme, e.j.moral);
}

function moyenneChamp(cote: Cote, cle: CleAttribut): number {
  if (!cote.champ.length) return 6;
  let somme = 0;
  for (const place of cote.champ) somme += attr(cote, place.id, cle, place.poste);
  return somme / cote.champ.length;
}

function qualiteGardien(cote: Cote): number {
  if (!cote.gardien) return 0; // but vide
  return (
    attr(cote, cote.gardien, "arrets", "GB") * 0.46 +
    attr(cote, cote.gardien, "reflexes", "GB") * 0.28 +
    attr(cote, cote.gardien, "placement", "GB") * 0.18 +
    attr(cote, cote.gardien, "sangFroid", "GB") * 0.08
  );
}

/* ------------------------------------------------------------ temps & banc */

/**
 * Crédite le temps de jeu et l'usure. À appeler après avoir réglé les entrées
 * et les sorties : un joueur qui vient d'entrer doit être payé de la
 * possession qu'il va disputer, sinon il peut marquer sans figurer nulle part.
 */
function crediterTemps(cote: Cote, dt: number) {
  const minutes = dt / 60;
  // Le compte du temps de jeu : sept joueurs sur le terrain, moins les exclus.
  const surTerrain = cote.champ.length + (cote.gardien ? 1 : 0);
  cote.stats.secondesInferiorite += dt * (7 - surTerrain);
  const usure = USURE_PAR_MINUTE * TEMPOS[cote.tactique.tempo].usure * SYSTEMES[cote.tactique.systeme].usure;

  if (cote.gardien) {
    const g = cote.etats.get(cote.gardien)!;
    g.secondes += dt;
    g.condition = borner(g.condition - usure * minutes * 0.35, 0, 100);
  }
  for (const place of cote.champ) {
    const e = cote.etats.get(place.id)!;
    e.secondes += dt;
    const resistance = e.j.attributs.resistance;
    e.condition = borner(e.condition - usure * minutes * (1 + (13 - resistance) * 0.045), 0, 100);
  }
  for (const id of cote.banc) {
    const e = cote.etats.get(id)!;
    e.condition = borner(e.condition + RECUPERATION_BANC_PAR_MINUTE * minutes, 0, 100);
  }
}

/** Retour des exclus dont les deux minutes sont écoulées, à l'instant t. */
function finirExclusions(cote: Cote, t: number, journal: ((e: Partial<EvenementMatch>) => void) | null) {
  for (let i = cote.exclusions.length - 1; i >= 0; i--) {
    const ex = cote.exclusions[i];
    if (ex.fin > t) continue;
    cote.exclusions.splice(i, 1);
    const e = cote.etats.get(ex.id)!;
    if (e.disqualifie) {
      remplacerPoste(cote, ex.poste, t, journal);
      continue;
    }
    if (ex.poste === "GB") {
      if (!cote.gardien) {
        cote.gardien = ex.id;
        e.surTerrain = true;
      } else cote.banc.push(ex.id);
    } else if (cote.champ.length < 6 + (cote.gardienVolant ? 1 : 0)) {
      cote.champ.push({ id: ex.id, poste: ex.poste });
      e.surTerrain = true;
    } else {
      cote.banc.push(ex.id);
    }
  }
}

/** Fait entrer le meilleur remplaçant disponible à un poste laissé vide. */
function remplacerPoste(cote: Cote, poste: PosteChamp | "GB", t: number, journal: ((e: Partial<EvenementMatch>) => void) | null) {
  const candidat = meilleurRemplacant(cote, poste);
  if (!candidat) return;
  cote.banc.splice(cote.banc.indexOf(candidat), 1);
  const e = cote.etats.get(candidat)!;
  e.surTerrain = true;
  if (poste === "GB") cote.gardien = candidat;
  else cote.champ.push({ id: candidat, poste });
  if (journal) {
    journal({ seconde: t, type: "changement", camp: cote.camp, texte: `Entrée de ${nomCourt(e.j)} (${cote.club.abbr})` });
  }
}

function meilleurRemplacant(cote: Cote, poste: PosteChamp | "GB"): string | null {
  let meilleur: string | null = null;
  let meilleureValeur = -Infinity;
  for (const id of cote.banc) {
    const e = cote.etats.get(id)!;
    if (e.disqualifie) continue;
    if ((poste === "GB") !== (e.j.poste === "GB")) continue;
    const v = note(poste, e.j.attributs) + malusPoste(e.j, poste) + (e.condition - 70) * 0.02;
    if (v > meilleureValeur) {
      meilleureValeur = v;
      meilleur = id;
    }
  }
  return meilleur;
}

/** Rotation automatique : on sort les joueurs cuits si le banc peut tenir. */
function rotation(cote: Cote, t: number, journal: ((e: Partial<EvenementMatch>) => void) | null) {
  if (cote.changements >= 16) return;
  const seuil = SEUILS_ROTATION[cote.tactique.rotation];
  for (let i = 0; i < cote.champ.length; i++) {
    const place = cote.champ[i];
    const sortant = cote.etats.get(place.id)!;
    if (sortant.condition > seuil) continue;
    const entrantId = meilleurRemplacant(cote, place.poste);
    if (!entrantId) continue;
    const entrant = cote.etats.get(entrantId)!;
    if (entrant.condition < sortant.condition + 12) continue;
    cote.banc.splice(cote.banc.indexOf(entrantId), 1);
    cote.banc.push(place.id);
    sortant.surTerrain = false;
    entrant.surTerrain = true;
    cote.champ[i] = { id: entrantId, poste: place.poste };
    cote.changements++;
    if (journal) {
      journal({
        seconde: t,
        type: "changement",
        camp: cote.camp,
        texte: `${cote.club.abbr} — ${nomCourt(entrant.j)} remplace ${nomCourt(sortant.j)}`,
      });
    }
  }
}

/* ----------------------------------------------------------- gardien volant */

/**
 * Le sept contre six. Le gardien ne sort que pour la phase d'attaque et
 * revient dès qu'on défend : c'est ainsi qu'on le joue réellement. Le risque
 * n'est pas de défendre sans gardien pendant deux minutes, c'est de se faire
 * prendre la balle et de la voir finir dans un but vide.
 */
function reglerGardienVolant(
  cote: Cote,
  adverse: Cote,
  enAttaque: boolean,
  t: number,
  journal: ((e: Partial<EvenementMatch>) => void) | null,
) {
  const retard = adverse.score - cote.score;
  const fenetre = t >= DUREE_MATCH - FENETRE_GARDIEN_VOLANT;
  const voulu = cote.tactique.gardienVolant && fenetre && enAttaque && retard >= 1 && retard <= RETARD_GARDIEN_VOLANT;
  if (voulu === cote.gardienVolant) return;

  if (voulu && cote.gardien) {
    const gardien = cote.gardien;
    const septieme = meilleurRemplacantChamp(cote);
    if (!septieme) return;
    cote.etats.get(gardien)!.surTerrain = false;
    cote.banc.push(gardien);
    cote.gardien = null;
    cote.banc.splice(cote.banc.indexOf(septieme), 1);
    const e = cote.etats.get(septieme)!;
    e.surTerrain = true;
    cote.champ.push({ id: septieme, poste: e.j.poste === "GB" ? "PV" : (e.j.poste as PosteChamp) });
    cote.gardienVolant = true;
    if (journal && !cote.gardienVolantAnnonce) {
      cote.gardienVolantAnnonce = true;
      journal({ seconde: t, type: "gardienVolant", camp: cote.camp, texte: `${cote.club.abbr} sort son gardien : sept contre six en attaque` });
    }
  } else if (!voulu && cote.gardienVolant) {
    const septieme = cote.champ.pop();
    if (septieme) {
      cote.etats.get(septieme.id)!.surTerrain = false;
      cote.banc.push(septieme.id);
    }
    const gardien = meilleurRemplacant(cote, "GB");
    if (gardien) {
      cote.banc.splice(cote.banc.indexOf(gardien), 1);
      cote.gardien = gardien;
      cote.etats.get(gardien)!.surTerrain = true;
    }
    cote.gardienVolant = false;
  }
}

/**
 * Les spécialistes attaque / défense, qui tournent à chaque changement de
 * possession. C'est la mécanique la plus reconnaissable du handball moderne :
 * un pivot défenseur entre pour les six minutes de défense, un tireur entre
 * pour l'attaque. Le prix se paie sur les transitions rapides — s'ils partent
 * en contre, le changement n'a pas lieu et on défend avec ses attaquants — et
 * sur le changement irrégulier, deux minutes pour l'équipe.
 */
function reglerSpecialistes(
  cote: Cote,
  enAttaque: boolean,
  t: number,
  alea: Aleatoire,
  journal: ((e: Partial<EvenementMatch>) => void) | null,
) {
  const paires = cote.tactique.specialistes;
  if (!paires.length || cote.gardienVolant) return;

  for (const paire of paires) {
    const entrantId = enAttaque ? paire.attaquantId : paire.defenseurId;
    const sortantId = enAttaque ? paire.defenseurId : paire.attaquantId;
    const entrant = cote.etats.get(entrantId);
    const sortant = cote.etats.get(sortantId);
    if (!entrant || !sortant || entrant.disqualifie) continue;
    if (!cote.banc.includes(entrantId)) continue;
    const index = cote.champ.findIndex((place) => place.id === sortantId);
    if (index < 0) continue;

    const poste = cote.champ[index].poste;
    cote.banc.splice(cote.banc.indexOf(entrantId), 1);
    cote.banc.push(sortantId);
    sortant.surTerrain = false;
    entrant.surTerrain = true;
    cote.champ[index] = { id: entrantId, poste };
    cote.echangesPhase++;

    // Changement irrégulier : le sortant n'a pas franchi la ligne à temps.
    const rigueur = (entrant.j.attributs.discipline + sortant.j.attributs.discipline) / 2;
    if (alea.chance(Math.max(0.0008, RISQUE_CHANGEMENT_IRREGULIER * (1 + (13 - rigueur) * 0.08)))) {
      exclure(cote, t, alea, journal);
      if (journal) {
        journal({
          seconde: t,
          type: "exclusion",
          camp: cote.camp,
          texte: `${cote.club.abbr} — changement irrégulier, deux minutes`,
        });
      }
    }
  }
}

function meilleurRemplacantChamp(cote: Cote): string | null {
  let meilleur: string | null = null;
  let valeur = -Infinity;
  for (const id of cote.banc) {
    const e = cote.etats.get(id)!;
    if (e.disqualifie || e.j.poste === "GB") continue;
    const v = note(e.j.poste, e.j.attributs) + (e.condition - 70) * 0.02;
    if (v > valeur) {
      valeur = v;
      meilleur = id;
    }
  }
  return meilleur;
}

/* ------------------------------------------------------------- exclusions */

function exclure(cote: Cote, t: number, alea: Aleatoire, journal: ((e: Partial<EvenementMatch>) => void) | null) {
  if (!cote.champ.length) return;
  // Le défenseur sanctionné : plus il est agressif et peu discipliné, plus il
  // s'expose. C'est le coût caché d'un pivot qui « tient » sa défense.
  const poids = cote.champ.map((p) => {
    const e = cote.etats.get(p.id)!;
    return Math.max(0.4, e.j.attributs.agressivite * 0.8 + (20 - e.j.attributs.discipline) * 0.9);
  });
  const place = alea.choixPondere(cote.champ, poids);
  const index = cote.champ.indexOf(place);
  if (index >= 0) cote.champ.splice(index, 1);
  const e = cote.etats.get(place.id)!;
  e.surTerrain = false;
  e.exclusionsSubies++;
  e.stats.exclusions++;
  cote.stats.exclusions++;
  if (e.exclusionsSubies >= EXCLUSIONS_AVANT_DISQUALIFICATION) e.disqualifie = true;
  cote.exclusions.push({ id: place.id, fin: t + DUREE_EXCLUSION, poste: place.poste });
  if (journal) {
    journal({
      seconde: t,
      type: "exclusion",
      camp: cote.camp,
      texte: e.disqualifie
        ? `Disqualification — ${nomCourt(e.j)} (${cote.club.abbr}), troisième exclusion`
        : `Deux minutes pour ${nomCourt(e.j)} (${cote.club.abbr})`,
    });
  }
}

/* ---------------------------------------------------------------- le tir */

const CLES_TIR: Record<TypeTir, [CleAttribut, number][]> = {
  neuf: [["tir", 0.42], ["puissance", 0.34], ["sangFroid", 0.14], ["detente", 0.1]],
  aile: [["tir", 0.42], ["detente", 0.28], ["sangFroid", 0.16], ["vitesse", 0.14]],
  six: [["tir", 0.34], ["duel", 0.3], ["puissance", 0.2], ["sangFroid", 0.16]],
  contre: [["tir", 0.38], ["vitesse", 0.3], ["sangFroid", 0.2], ["detente", 0.12]],
  sept: [["tir", 0.44], ["sangFroid", 0.42], ["puissance", 0.14]],
};

function typeTirPour(poste: PosteChamp, systemeAdverse: SystemeDefensif, alea: Aleatoire): TypeTir {
  if (poste === "AiG" || poste === "AiD") return "aile";
  if (poste === "PV") return "six";
  // Un arrière ou un demi-centre peut aussi percuter et finir près du but —
  // d'autant plus souvent que la défense d'en face est haute.
  return alea.chance(PENETRATION[systemeAdverse]) ? "six" : "neuf";
}

function qualiteTir(cote: Cote, place: PlaceChamp, type: TypeTir): number {
  let q = 0;
  for (const [cle, poids] of CLES_TIR[type]) q += attr(cote, place.id, cle, place.poste) * poids;
  // Un bon meneur crée de meilleurs tirs pour tout le monde.
  const creation = (moyenneChamp(cote, "vision") + moyenneChamp(cote, "passe")) / 2;
  return q * 0.88 + creation * 0.12;
}

function qualiteDefense(def: Cote, type: TypeTir): number {
  const sys = SYSTEMES[def.tactique.systeme];
  const gk = qualiteGardien(def);
  const champ = moyenneChamp(def, "defense");
  const bloc = (moyenneChamp(def, "blocage") + moyenneChamp(def, "detente")) / 2;
  switch (type) {
    case "neuf":
      return champ * 0.3 + bloc * 0.26 + gk * 0.44 + sys.defLoin;
    case "aile":
      return champ * 0.16 + gk * 0.62 + bloc * 0.22 + sys.defProche * 0.5;
    case "six":
      return champ * 0.42 + gk * 0.44 + bloc * 0.14 + sys.defProche;
    case "contre":
      return gk * 0.82 + champ * 0.18;
    case "sept":
      return gk;
  }
}

/* ------------------------------------------------------------- simulation */

type Journal = (e: Partial<EvenementMatch>) => void;

/**
 * Un match en cours. Le moteur ne joue plus forcément soixante minutes d'un
 * bloc : on peut l'arrêter, intervenir, puis reprendre — c'est ce qui permet
 * de tenir un banc pendant la rencontre au lieu de la regarder défiler.
 */
export type EtatMatch = {
  D: Cote;
  E: Cote;
  /** Seconde de jeu écoulée. */
  t: number;
  alea: Aleatoire;
  evenements: EvenementMatch[];
  journal: Journal | null;
  neutre: boolean;
  attaque: Cote;
  contrePour: Cote | null;
  rebond: boolean;
  miTempsFaite: boolean;
  termine: boolean;
};

export function creerMatch(domicile: EntreeEquipe, exterieur: EntreeEquipe, options: OptionsMatch): EtatMatch {
  const alea = creerAleatoire(options.graine);
  const D = creerCote(domicile, "domicile", alea);
  const E = creerCote(exterieur, "exterieur", alea);
  if (options.pilote === "domicile") D.pilote = true;
  if (options.pilote === "exterieur") E.pilote = true;
  const evenements: EvenementMatch[] = [];

  const journal: Journal | null =
    options.commentaire === true
      ? (e: Partial<EvenementMatch>) =>
          evenements.push({
            seconde: e.seconde ?? 0,
            type: e.type ?? "changement",
            camp: e.camp ?? null,
            texte: e.texte ?? "",
            scoreDomicile: D.score,
            scoreExterieur: E.score,
          })
      : null;

  journal?.({ seconde: 0, type: "coupEnvoi", camp: null, texte: `Coup d'envoi — ${D.club.nom} reçoit ${E.club.nom}` });

  return {
    D,
    E,
    t: 0,
    alea,
    evenements,
    journal,
    neutre: options.neutre === true,
    attaque: alea.chance(0.5) ? D : E,
    contrePour: null,
    rebond: false,
    miTempsFaite: false,
    termine: false,
  };
}

/**
 * Avance jusqu'à la seconde visée. Les possessions sont toujours jouées
 * entières : on dépasse donc légèrement la cible, mais on ne coupe jamais une
 * attaque en deux. C'est ce qui garantit qu'un match joué en dix morceaux
 * donne exactement le même résultat que le même match joué d'un bloc.
 */
export function avancerMatch(etat: EtatMatch, cible: number): void {
  const { alea, journal } = etat;
  const fin = Math.min(cible, DUREE_MATCH);

  while (!etat.termine && etat.t < fin) {
    // Il ne reste pas de quoi monter une attaque : on laisse filer le temps
    // plutôt que de créditer une possession de trois secondes à un joueur qui
    // vient d'entrer. Le compte du temps de jeu, lui, doit rester exact.
    if (DUREE_MATCH - etat.t < DUREE_MINIMALE_POSSESSION) {
      const reste = DUREE_MATCH - etat.t;
      crediterTemps(etat.D, reste);
      crediterTemps(etat.E, reste);
      etat.t = DUREE_MATCH;
      break;
    }
    const attaque = etat.attaque;
    const defense = attaque === etat.D ? etat.E : etat.D;
    const contre = etat.contrePour === attaque;
    etat.contrePour = null;

    const tempo = TEMPOS[attaque.tactique.tempo];
    const duree = contre
      ? alea.entre(8, 15)
      : borner(alea.gaussien(tempo.duree, 7), 11, tempo.duree + 22);
    const dt = Math.min(duree, DUREE_MATCH - etat.t);
    const cible = etat.t + dt;

    finirExclusions(etat.D, cible, journal);
    finirExclusions(etat.E, cible, journal);
    // Les changements de phase : ils n'ont pas lieu si la transition est trop
    // rapide, ce qui est tout le risque d'une équipe qui fait tourner ses
    // spécialistes.
    reglerGardienVolant(attaque, defense, true, cible, journal);
    if (!contre) reglerGardienVolant(defense, attaque, false, cible, journal);
    reglerSpecialistes(attaque, true, cible, alea, journal);
    if (!contre) reglerSpecialistes(defense, false, cible, alea, journal);
    rotation(attaque, cible, journal);
    rotation(defense, cible, journal);
    if (!attaque.pilote) tempsMortAutomatique(etat, attaque);

    crediterTemps(etat.D, dt);
    crediterTemps(etat.E, dt);
    etat.t = cible;

    if (!etat.miTempsFaite && etat.t >= DUREE_MI_TEMPS) {
      etat.miTempsFaite = true;
      etat.D.miTemps = etat.D.score;
      etat.E.miTemps = etat.E.score;
      journal?.({
        seconde: DUREE_MI_TEMPS,
        type: "miTemps",
        camp: null,
        texte: `Mi-temps — ${etat.D.club.abbr} ${etat.D.score} : ${etat.E.score} ${etat.E.club.abbr}`,
      });
    }

    const suite = resoudrePossession(attaque, defense, etat.t, alea, journal, etat.neutre, contre, etat.rebond);
    if (suite.contrePour) etat.contrePour = suite.contrePour;
    etat.rebond = suite.rebond === true;
    etat.attaque = suite.prochaineAttaque;
  }

  if (etat.t >= DUREE_MATCH && !etat.termine) {
    etat.termine = true;
    journal?.({
      seconde: DUREE_MATCH,
      type: "fin",
      camp: null,
      texte: `Fin du match — ${etat.D.club.abbr} ${etat.D.score} : ${etat.E.score} ${etat.E.club.abbr}`,
    });
  }
}

export function terminerMatch(etat: EtatMatch): FeuilleMatch {
  avancerMatch(etat, DUREE_MATCH);
  return feuille(etat.D, etat.E, etat.evenements);
}

/** Le match d'un bloc, sans intervention : le cas des rencontres entre clubs IA. */
export function simulerMatch(domicile: EntreeEquipe, exterieur: EntreeEquipe, options: OptionsMatch): FeuilleMatch {
  return terminerMatch(creerMatch(domicile, exterieur, options));
}

/* --------------------------------------------------------- le banc, en direct */

export type ReponseBanc = { ok: boolean; raison?: string };

function cote(etat: EtatMatch, camp: Camp): Cote {
  return camp === "domicile" ? etat.D : etat.E;
}

/**
 * Temps mort d'équipe. Les règles réelles : trois par match, deux au maximum
 * par mi-temps, un seul dans les cinq dernières minutes, et seulement quand on
 * a le ballon. Ce dernier point fait toute la difficulté — on ne coupe pas
 * l'élan adverse quand on veut, mais quand on peut.
 */
export function demanderTempsMort(etat: EtatMatch, camp: Camp): ReponseBanc {
  const c = cote(etat, camp);
  if (etat.termine) return { ok: false, raison: "Le match est terminé." };
  if (etat.attaque !== c) return { ok: false, raison: "Il faut avoir le ballon pour demander un temps mort." };
  if (c.tempsMorts.total >= TEMPS_MORTS_PAR_MATCH) return { ok: false, raison: "Vos trois temps morts sont pris." };
  const moitie = etat.t < DUREE_MI_TEMPS ? 0 : 1;
  if (c.tempsMorts.parMiTemps[moitie] >= TEMPS_MORTS_PAR_MI_TEMPS) {
    return { ok: false, raison: "Deux temps morts au maximum par mi-temps." };
  }
  if (etat.t >= DUREE_MATCH - FENETRE_FIN_MATCH && c.tempsMorts.fin >= 1) {
    return { ok: false, raison: "Un seul temps mort dans les cinq dernières minutes." };
  }

  c.tempsMorts.total++;
  c.tempsMorts.parMiTemps[moitie]++;
  if (etat.t >= DUREE_MATCH - FENETRE_FIN_MATCH) c.tempsMorts.fin++;
  c.bonusTempsMort = POSSESSIONS_APRES_TEMPS_MORT;
  c.serieAdverse = 0;
  // Tout l'intérêt du temps mort : il casse la série d'en face.
  (c === etat.D ? etat.E : etat.D).elan = 0;
  for (const place of c.champ) {
    const e = c.etats.get(place.id)!;
    e.condition = borner(e.condition + RECUPERATION_TEMPS_MORT, 0, 100);
  }
  if (c.gardien) {
    const g = c.etats.get(c.gardien)!;
    g.condition = borner(g.condition + RECUPERATION_TEMPS_MORT, 0, 100);
  }
  etat.journal?.({
    seconde: etat.t,
    type: "tempsMort",
    camp,
    texte: `Temps mort demandé par ${c.club.nom} (${c.tempsMorts.total}/${TEMPS_MORTS_PAR_MATCH})`,
  });
  return { ok: true };
}

/**
 * Politique du banc quand personne ne le tient : le moteur ne garde que le
 * temps mort évident, celui de la dernière attaque d'un match serré. Tout le
 * reste — couper une série, poser une consigne, reposer des jambes — relève du
 * manager. Un moteur qui jouerait le match à sa place rendrait le banc décoratif.
 */
function tempsMortAutomatique(etat: EtatMatch, c: Cote) {
  const adverse = c === etat.D ? etat.E : etat.D;
  const retard = adverse.score - c.score;
  if (etat.t < DUREE_MATCH - 120 || retard < 0 || retard > 2) return;
  demanderTempsMort(etat, c.camp);
}

/** Changement en cours de match : un joueur du banc prend la place d'un joueur du terrain. */
export function effectuerChangement(etat: EtatMatch, camp: Camp, sortantId: string, entrantId: string): ReponseBanc {
  const c = cote(etat, camp);
  if (etat.termine) return { ok: false, raison: "Le match est terminé." };
  const entrant = c.etats.get(entrantId);
  const sortant = c.etats.get(sortantId);
  if (!entrant || !sortant) return { ok: false, raison: "Joueur inconnu." };
  if (entrant.disqualifie) return { ok: false, raison: "Ce joueur ne peut plus entrer." };
  if (!c.banc.includes(entrantId)) return { ok: false, raison: "Ce joueur n'est pas sur le banc." };

  if (c.gardien === sortantId) {
    if (entrant.j.poste !== "GB") return { ok: false, raison: "Seul un gardien remplace le gardien." };
    c.banc.splice(c.banc.indexOf(entrantId), 1);
    c.banc.push(sortantId);
    sortant.surTerrain = false;
    entrant.surTerrain = true;
    c.gardien = entrantId;
  } else {
    const index = c.champ.findIndex((p) => p.id === sortantId);
    if (index < 0) return { ok: false, raison: "Ce joueur n'est pas sur le terrain." };
    if (entrant.j.poste === "GB") return { ok: false, raison: "Un gardien ne joue pas sur le champ." };
    const poste = c.champ[index].poste;
    c.banc.splice(c.banc.indexOf(entrantId), 1);
    c.banc.push(sortantId);
    sortant.surTerrain = false;
    entrant.surTerrain = true;
    c.champ[index] = { id: entrantId, poste };
  }

  c.changements++;
  etat.journal?.({
    seconde: etat.t,
    type: "changement",
    camp,
    texte: `${c.club.abbr} — ${nomCourt(entrant.j)} remplace ${nomCourt(sortant.j)}`,
  });
  return { ok: true };
}

/** Consignes modifiables en cours de match, comme on les crierait depuis le banc. */
export function ajusterTactique(
  etat: EtatMatch,
  camp: Camp,
  modif: Partial<Pick<Tactique, "systeme" | "tempo" | "rotation" | "gardienVolant">>,
): ReponseBanc {
  const c = cote(etat, camp);
  if (etat.termine) return { ok: false, raison: "Le match est terminé." };
  const avant = { systeme: c.tactique.systeme, tempo: c.tactique.tempo };
  c.tactique = { ...c.tactique, ...modif };
  if (modif.systeme && modif.systeme !== avant.systeme) {
    etat.journal?.({ seconde: etat.t, type: "changement", camp, texte: `${c.club.abbr} passe en ${modif.systeme}` });
  }
  if (modif.tempo && modif.tempo !== avant.tempo) {
    etat.journal?.({ seconde: etat.t, type: "changement", camp, texte: `${c.club.abbr} change de rythme` });
  }
  return { ok: true };
}

/* ------------------------------------------------------- vue pour l'interface */

export type ApercuJoueur = {
  id: string;
  nom: string;
  /** Note du joueur à son poste naturel, sur 20. */
  note: number;
  /** Valeur défensive brute, pour composer un bloc en infériorité. */
  defense: number;
  /** Valeur offensive brute, pour composer une attaque en supériorité. */
  attaque: number;
  posteNaturel: Poste;
  posteJoue: Poste | null;
  condition: number;
  secondes: number;
  buts: number;
  tirs: number;
  arrets: number;
  tirsSubis: number;
  pertes: number;
  exclusionsSubies: number;
  disqualifie: boolean;
  exclusJusqua: number | null;
};

export type ApercuCote = {
  camp: Camp;
  clubId: string;
  nom: string;
  abbr: string;
  score: number;
  systeme: Tactique["systeme"];
  tempo: Tactique["tempo"];
  gardienVolant: boolean;
  tempsMortsRestants: number;
  serieAdverse: number;
  gardien: ApercuJoueur | null;
  champ: ApercuJoueur[];
  banc: ApercuJoueur[];
  stats: StatsEquipeMatch;
};

export type ApercuMatch = {
  t: number;
  termine: boolean;
  possession: Camp;
  domicile: ApercuCote;
  exterieur: ApercuCote;
  evenements: EvenementMatch[];
};

function apercuJoueur(c: Cote, id: string, posteJoue: Poste | null): ApercuJoueur {
  const e = c.etats.get(id)!;
  const exclusion = c.exclusions.find((x) => x.id === id);
  return {
    id,
    nom: nomCourt(e.j),
    note: note(e.j.poste, e.j.attributs),
    defense: e.j.attributs.defense * 0.7 + e.j.attributs.blocage * 0.3,
    attaque: e.j.attributs.tir * 0.6 + e.j.attributs.duel * 0.2 + e.j.attributs.puissance * 0.2,
    posteNaturel: e.j.poste,
    posteJoue,
    condition: Math.round(e.condition),
    secondes: Math.round(e.secondes),
    buts: e.stats.buts,
    tirs: e.stats.tirs,
    arrets: e.stats.arrets,
    tirsSubis: e.stats.tirsSubis,
    pertes: e.stats.pertes,
    exclusionsSubies: e.exclusionsSubies,
    disqualifie: e.disqualifie,
    exclusJusqua: exclusion ? Math.round(exclusion.fin) : null,
  };
}

function apercuCote(c: Cote): ApercuCote {
  return {
    camp: c.camp,
    clubId: c.club.id,
    nom: c.club.nom,
    abbr: c.club.abbr,
    score: c.score,
    systeme: c.tactique.systeme,
    tempo: c.tactique.tempo,
    gardienVolant: c.gardienVolant,
    tempsMortsRestants: TEMPS_MORTS_PAR_MATCH - c.tempsMorts.total,
    serieAdverse: c.serieAdverse,
    gardien: c.gardien ? apercuJoueur(c, c.gardien, "GB") : null,
    champ: c.champ.map((p) => apercuJoueur(c, p.id, p.poste)),
    banc: [...c.banc, ...c.exclusions.map((x) => x.id)]
      .filter((id, i, liste) => liste.indexOf(id) === i)
      .map((id) => apercuJoueur(c, id, null)),
    stats: c.stats,
  };
}

/** Photographie du match à cet instant, sans exposer l'état interne du moteur. */
export function apercuMatch(etat: EtatMatch): ApercuMatch {
  return {
    t: Math.round(etat.t),
    termine: etat.termine,
    possession: etat.attaque.camp,
    domicile: apercuCote(etat.D),
    exterieur: apercuCote(etat.E),
    evenements: etat.evenements,
  };
}

type SuitePossession = { prochaineAttaque: Cote; contrePour: Cote | null; rebond?: boolean };

function resoudrePossession(
  att: Cote,
  def: Cote,
  t: number,
  alea: Aleatoire,
  journal: ((e: Partial<EvenementMatch>) => void) | null,
  neutre: boolean,
  estContre: boolean,
  rebond = false,
): SuitePossession {
  // Un rebond offensif prolonge la possession en cours, il n'en ouvre pas une
  // nouvelle : sinon le compteur de possessions gonfle de plus de 10 %.
  if (!rebond) att.stats.possessions++;
  const tempoAtt = TEMPOS[att.tactique.tempo];
  const sysDef = SYSTEMES[def.tactique.systeme];
  const inter = INTERACTION[att.tactique.tempo][def.tactique.systeme];
  const avantage = att.champ.length - def.champ.length;
  // Le temps mort agit sur les deux possessions suivantes : consigne claire,
  // jambes reposées, et un ballon qu'on perd moins bêtement.
  const apresTempsMort = att.bonusTempsMort > 0;
  if (apresTempsMort && !rebond) att.bonusTempsMort--;

  if (estContre) {
    att.stats.contreAttaques++;
    return tirer(att, def, t, alea, journal, neutre, "contre", avantage, undefined, apresTempsMort);
  }

  /* 1. Perte de balle. */
  const maitrise = (moyenneChamp(att, "passe") + moyenneChamp(att, "vision")) / 2;
  const pression = (moyenneChamp(def, "interception") * 0.6 + moyenneChamp(def, "agressivite") * 0.4);
  const pPerte = borner(
    (PERTE_BASE +
      (sysDef.interception * tempoAtt.exposition + inter.perte) +
      (pression - maitrise) * 0.012 -
      avantage * 0.022) *
      (apresTempsMort ? EFFET_TEMPS_MORT.perte : 1),
    0.03,
    0.45,
  );

  if (alea.chance(pPerte)) {
    const porteur = alea.choixPondere(att.champ, att.champ.map((p) => (p.poste === "DC" ? 2.2 : 1)));
    const eAtt = att.etats.get(porteur.id)!;
    eAtt.stats.pertes++;
    att.stats.pertes++;
    const provoquee = alea.chance(PART_PROVOQUEE);
    if (provoquee && def.champ.length) {
      // Toute perte provoquée est créditée au défenseur — des deux côtés.
      const voleur = alea.choixPondere(def.champ, def.champ.map((p) => Math.max(0.5, def.etats.get(p.id)!.j.attributs.interception)));
      def.etats.get(voleur.id)!.stats.pertesProvoquees++;
      def.stats.pertesProvoquees++;
    }
    if (journal) {
      journal({
        seconde: t,
        type: "perte",
        camp: att.camp,
        texte: provoquee
          ? `Ballon intercepté par ${def.club.abbr} — ${nomCourt(eAtt.j)} dépossédé`
          : `Perte de balle de ${nomCourt(eAtt.j)} (${att.club.abbr})`,
      });
    }
    // But vide : seule une balle interceptée part de l'autre côté du terrain.
    if (att.gardienVolant && provoquee && alea.chance(BUT_VIDE)) {
      const marqueur = alea.choix(def.champ);
      marquer(def, att, marqueur, t, journal, "contre", `But ${def.club.abbr} — ${nomCourt(def.etats.get(marqueur.id)!.j)} dans le but vide`);
      return { prochaineAttaque: att, contrePour: null };
    }
    const vitesseDef = moyenneChamp(def, "vitesse");
    const pContre = borner(TEMPOS[def.tactique.tempo].contre * tempoAtt.repli * (0.7 + (vitesseDef - 11) * 0.03), 0, 0.85);
    return { prochaineAttaque: def, contrePour: alea.chance(pContre) ? def : null };
  }

  /* 2. Contact irrégulier : jet de 7 m, exclusion, ou les deux. */
  const percussion = (moyenneChamp(att, "duel") * 0.6 + moyenneChamp(att, "vitesse") * 0.4);
  const pFaute = borner(
    FAUTE_BASE * sysDef.faute * (1 + (percussion - moyenneChamp(def, "defense")) * 0.022),
    0.02,
    0.4,
  );
  if (alea.chance(pFaute)) {
    const r = alea.reel();
    const septMetres = r < REPARTITION_FAUTE.septSeul + REPARTITION_FAUTE.lesDeux;
    const exclusion = r >= REPARTITION_FAUTE.septSeul;
    if (exclusion) exclure(def, t, alea, journal);
    if (septMetres) return tirerSeptMetres(att, def, t, alea, journal);
    // Faute sans jet de 7 m : l'attaque se poursuit.
  }

  /* 3. Le tir. */
  const place = choisirTireur(att, def, alea);
  const type = typeTirPour(place.poste, def.tactique.systeme, alea);
  return tirer(att, def, t, alea, journal, neutre, type, avantage, place, apresTempsMort);
}

/** Bonus (ou malus) d'efficacité selon l'adéquation entre le tempo et l'effectif aligné. */
function affiniteTempo(cote: Cote): number {
  const { cles, pente } = AFFINITE_TEMPO[cote.tactique.tempo];
  let somme = 0;
  for (const cle of cles) somme += moyenneChamp(cote, cle);
  return (somme / cles.length - 12) * pente;
}

function choisirTireur(att: Cote, def: Cote, alea: Aleatoire): PlaceChamp {
  const parts = PART_TIRS[def.tactique.systeme];
  // Le poste décide de la part des ballons bien plus que le talent : un
  // arrière tire parce qu'il est arrière. Sans ce socle, le meilleur tireur
  // accaparait un tiers des ballons et finissait la saison à dix buts par
  // match, deux fois le record réel d'un championnat.
  const poids = att.champ.map((p) => {
    const e = att.etats.get(p.id)!;
    return Math.max(0.6, (24 + e.j.attributs.tir) * (parts[p.poste] ?? 1) * facteurEtat(e.condition, e.j.forme, e.j.moral));
  });
  return alea.choixPondere(att.champ, poids);
}

function tirer(
  att: Cote,
  def: Cote,
  t: number,
  alea: Aleatoire,
  journal: ((e: Partial<EvenementMatch>) => void) | null,
  neutre: boolean,
  type: TypeTir,
  avantage: number,
  placeForcee?: PlaceChamp,
  apresTempsMort = false,
): SuitePossession {
  if (!att.champ.length) return { prochaineAttaque: def, contrePour: null };
  const place = placeForcee ?? choisirTireur(att, def, alea);
  const e = att.etats.get(place.id)!;
  const inter = INTERACTION[att.tactique.tempo][def.tactique.systeme];

  const ecart = att.score - def.score;
  const relachement =
    -Math.sign(ecart) * borner(Math.abs(ecart) - RELACHEMENT_SEUIL, 0, RELACHEMENT_MAX) * RELACHEMENT_PAR_BUT;

  const p = borner(
    BASE_TIR[type] +
      (qualiteTir(att, place, type) - qualiteDefense(def, type)) * PENTE_QUALITE +
      TEMPOS[att.tactique.tempo].efficacite +
      affiniteTempo(att) +
      inter.efficacite +
      avantage * EFFET_SUPERIORITE +
      relachement +
      (apresTempsMort ? EFFET_TEMPS_MORT.efficacite : 0) +
      borner((att.elan - ELAN_SEUIL) * ELAN_PAR_BUT, 0, ELAN_MAX) +
      (att.camp === "domicile" && !neutre ? AVANTAGE_DOMICILE : 0),
    0.08,
    0.96,
  );

  att.stats.tirs++;
  e.stats.tirs++;
  if (def.gardien) def.etats.get(def.gardien)!.stats.tirsSubis++;

  if (alea.chance(p)) {
    marquer(att, def, place, t, journal, type);
    return { prochaineAttaque: def, contrePour: null };
  }

  // Tir non converti : contré, arrêté ou manqué.
  const r = alea.reel();
  if (r < PART_CONTRE && def.champ.length) {
    const bloqueur = alea.choixPondere(def.champ, def.champ.map((x) => Math.max(0.5, def.etats.get(x.id)!.j.attributs.blocage)));
    def.etats.get(bloqueur.id)!.stats.contres++;
    def.stats.contres++;
    if (journal) {
      journal({ seconde: t, type: "contre", camp: def.camp, texte: `Tir de ${nomCourt(e.j)} contré par ${nomCourt(def.etats.get(bloqueur.id)!.j)}` });
    }
  } else if (r < PART_CONTRE + PART_MANQUE || !def.gardien) {
    if (journal) {
      journal({ seconde: t, type: "manque", camp: att.camp, texte: `${nomCourt(e.j)} trouve le poteau` });
    }
  } else {
    const g = def.etats.get(def.gardien)!;
    g.stats.arrets++;
    def.stats.arrets++;
    if (journal) {
      journal({ seconde: t, type: "arret", camp: def.camp, texte: `Arrêt de ${nomCourt(g.j)} devant ${nomCourt(e.j)}` });
    }
  }

  // Rebond offensif : l'attaque récupère et repart.
  if (alea.chance(REBOND_OFFENSIF)) return { prochaineAttaque: att, contrePour: null, rebond: true };
  const vitesseDef = moyenneChamp(def, "vitesse");
  const pContre = borner(
    TEMPOS[def.tactique.tempo].contre * TEMPOS[att.tactique.tempo].repli * (0.55 + (vitesseDef - 11) * 0.03),
    0,
    0.8,
  );
  return { prochaineAttaque: def, contrePour: alea.chance(pContre) ? def : null };
}

function tirerSeptMetres(
  att: Cote,
  def: Cote,
  t: number,
  alea: Aleatoire,
  journal: ((e: Partial<EvenementMatch>) => void) | null,
): SuitePossession {
  if (!att.champ.length) return { prochaineAttaque: def, contrePour: null };
  // Le tireur désigné : celui qui a les nerfs, pas forcément le meilleur
  // tireur. Un club a un tireur attitré et une doublure — sans elle, un seul
  // joueur prendrait les cent jets de 7 m de la saison.
  const v = (x: PlaceChamp) => att.etats.get(x.id)!.j.attributs.sangFroid * 0.6 + att.etats.get(x.id)!.j.attributs.tir * 0.4;
  const ordre = [...att.champ].sort((a, b) => v(b) - v(a));
  const place = ordre.length > 1 && alea.chance(0.3) ? ordre[1] : ordre[0];
  const e = att.etats.get(place.id)!;

  att.stats.septMetresTires++;
  att.stats.tirs++;
  e.stats.septMetresTires++;
  e.stats.tirs++;
  if (def.gardien) def.etats.get(def.gardien)!.stats.tirsSubis++;

  const p = borner(BASE_TIR.sept + (qualiteTir(att, place, "sept") - qualiteDefense(def, "sept")) * PENTE_QUALITE, 0.3, 0.96);
  if (alea.chance(p)) {
    att.stats.septMetresMarques++;
    e.stats.septMetresMarques++;
    marquer(att, def, place, t, journal, "sept");
  } else {
    if (def.gardien) {
      const g = def.etats.get(def.gardien)!;
      g.stats.arrets++;
      def.stats.arrets++;
    }
    if (journal) {
      journal({
        seconde: t,
        type: "septMetres",
        camp: def.camp,
        texte: def.gardien
          ? `Jet de 7 m arrêté par ${nomCourt(def.etats.get(def.gardien)!.j)} devant ${nomCourt(e.j)}`
          : `${nomCourt(e.j)} manque son jet de 7 m`,
      });
    }
  }
  return { prochaineAttaque: def, contrePour: null };
}

function marquer(
  att: Cote,
  def: Cote,
  place: PlaceChamp,
  t: number,
  journal: ((e: Partial<EvenementMatch>) => void) | null,
  type: TypeTir,
  texteForce?: string,
) {
  const e = att.etats.get(place.id)!;
  att.score++;
  att.stats.buts++;
  e.stats.buts++;
  att.serieAdverse = 0;
  att.elan++;
  def.serieAdverse++;
  def.elan = 0;
  if (journal) {
    journal({
      seconde: t,
      type: "but",
      camp: att.camp,
      texte: texteForce ?? texteBut(att, e.j, type, t),
    });
  }
}

const FORMULES: Record<TypeTir, string[]> = {
  neuf: ["arme à neuf mètres et transperce le mur", "décoche une flèche des neuf mètres", "prend ses responsabilités de loin"],
  aile: ["ferme l'angle et trompe le gardien", "s'élève à l'aile et croise sa frappe", "plante un but d'ailier, tout en détente"],
  six: ["conclut dans l'axe, au cœur de la défense", "se retourne sur le pivot et marque", "profite d'un ballon parfait à six mètres"],
  contre: ["file en contre-attaque et marque", "sanctionne le repli adverse", "conclut la transition en solitaire"],
  sept: ["transforme son jet de 7 m", "ne tremble pas sur penalty"],
};

/**
 * La formule est choisie sans tirage aléatoire : commenter un match ne doit pas
 * consommer de hasard, sinon le match qu'on regarde n'est plus celui que le
 * moteur aurait joué en silence — et deux mesures censées être comparables ne
 * le sont plus.
 */
function texteBut(att: Cote, j: Joueur, type: TypeTir, t: number): string {
  const formules = FORMULES[type];
  const index = (Math.round(t) + j.nom.charCodeAt(0) + j.numero) % formules.length;
  return `But ${att.club.abbr} — ${nomCourt(j)} ${formules[index]}`;
}

function feuille(D: Cote, E: Cote, evenements: EvenementMatch[]): FeuilleMatch {
  const stats = (c: Cote) =>
    [...c.etats.values()]
      .filter((e) => e.secondes > 0 || e.stats.tirs > 0)
      .map((e) => ({ ...e.stats, secondes: Math.round(e.secondes) }));

  return {
    clubDomicileId: D.club.id,
    clubExterieurId: E.club.id,
    scoreDomicile: D.score,
    scoreExterieur: E.score,
    miTempsDomicile: D.miTemps,
    miTempsExterieur: E.miTemps,
    statsDomicile: D.stats,
    statsExterieur: E.stats,
    joueursDomicile: stats(D),
    joueursExterieur: stats(E),
    evenements,
  };
}

/** Temps de jeu total réellement disputé, exclusions déduites — invariant du harnais. */
export function secondesAttendues(feuille: FeuilleMatch, camp: Camp): number {
  const stats = camp === "domicile" ? feuille.statsDomicile : feuille.statsExterieur;
  return 7 * DUREE_MATCH - stats.exclusions * DUREE_EXCLUSION;
}
