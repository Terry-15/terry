import { borner, creerAleatoire, grainePour, melanger } from "./aleatoire";
import { entrainerSemaine, focusAutomatique, type RapportEntrainement } from "./entrainement";
import { disponibles, meilleurSept, type IndexMonde } from "./monde";
import { simulerMatch, type EntreeEquipe, type OptionsMatch } from "./match/moteur";
import { noterFeuille } from "./notation";
import type { FeuilleMatch, Joueur, Monde, StatsJoueurMatch, Tactique } from "./types";

/* --------------------------------------------------------------- calendrier */

export type Rencontre = { divisionId: string; domicileId: string; exterieurId: string };

export type ResultatMatch = Rencontre & {
  journee: number;
  scoreDomicile: number;
  scoreExterieur: number;
};

export type StatsSaisonJoueur = {
  matchs: number;
  secondes: number;
  buts: number;
  tirs: number;
  septMetresMarques: number;
  septMetresTires: number;
  pertes: number;
  pertesProvoquees: number;
  contres: number;
  exclusions: number;
  arrets: number;
  tirsSubis: number;
  /** Somme des notes de match, pour en tirer une moyenne. */
  noteCumulee: number;
};

export type Saison = {
  annee: number;
  graine: number;
  /** calendrier[journée] = rencontres de toutes les divisions ce jour-là. */
  calendrier: Rencontre[][];
  journeeCourante: number;
  resultats: ResultatMatch[];
  terminee: boolean;
  statsJoueurs: Record<string, StatsSaisonJoueur>;
  /** Dernière journée dont la semaine d'entraînement a été jouée. */
  semaineEntrainee: number;
};

/** Ronde à l'italienne : n−1 journées aller, puis le retour, terrains inversés. */
export function creerCalendrier(clubIds: string[], divisionId: string, graine: number): Rencontre[][] {
  const equipes = melanger(clubIds, creerAleatoire(graine));
  const n = equipes.length;
  const fixe = equipes[0];
  let tournants = equipes.slice(1);
  const aller: Rencontre[][] = [];

  for (let tour = 0; tour < n - 1; tour++) {
    const journee: Rencontre[] = [];
    const adversaire = tournants[0];
    journee.push(
      tour % 2 === 0
        ? { divisionId, domicileId: fixe, exterieurId: adversaire }
        : { divisionId, domicileId: adversaire, exterieurId: fixe },
    );
    for (let i = 1; i < n / 2; i++) {
      journee.push({ divisionId, domicileId: tournants[i], exterieurId: tournants[tournants.length - i] });
    }
    aller.push(journee);
    tournants = [tournants[tournants.length - 1], ...tournants.slice(0, -1)];
  }

  const retour = aller.map((journee) =>
    journee.map((r) => ({ divisionId, domicileId: r.exterieurId, exterieurId: r.domicileId })),
  );
  return [...aller, ...retour];
}

export function creerSaison(monde: Monde, graine: number): Saison {
  const parDivision = monde.divisions.map((d) => creerCalendrier(d.clubIds, d.id, grainePour(graine, d.id)));
  const nbJournees = Math.max(...parDivision.map((c) => c.length));
  const calendrier: Rencontre[][] = [];
  for (let j = 0; j < nbJournees; j++) {
    calendrier.push(parDivision.flatMap((c) => c[j] ?? []));
  }
  return {
    annee: monde.saison,
    graine,
    calendrier,
    journeeCourante: 0,
    resultats: [],
    terminee: false,
    statsJoueurs: {},
    semaineEntrainee: -1,
  };
}

/* ------------------------------------------------------------- une journée */

export type OptionsJournee = {
  /** Le match de ce club est commenté minute par minute. */
  commentairePour?: string;
  /** Reçoit le rapport d'entraînement de la semaine, club par club. */
  rapportEntrainement?: (clubId: string, rapport: RapportEntrainement) => void;
  /** Clubs dont l'entraînement est décidé par l'appelant (le club dirigé). */
  entrainementDirige?: string;
  /** Feuille déjà jouée (match du joueur simulé à part, avec ses décisions). */
  feuilleFournie?: FeuilleMatch;
  /**
   * Simulateur de rechange, pour confier les bancs des clubs non contrôlés à
   * un adjoint. Par défaut, le moteur joue le match sans intervention.
   */
  simuler?: (domicile: EntreeEquipe, exterieur: EntreeEquipe, options: OptionsMatch) => FeuilleMatch;
};

export function entreeEquipe(monde: Monde, idx: IndexMonde, clubId: string, tactique?: Tactique): EntreeEquipe {
  const club = idx.clubParId.get(clubId)!;
  const effectif = disponibles(idx.effectifParClub.get(clubId) ?? []);
  const t = tactique ?? club.tactique;
  // Un sept invalide (blessé, transféré) est corrigé silencieusement.
  const sept = { ...meilleurSept(effectif), ...filtrerSept(t.sept, effectif) };
  return { club, effectif, tactique: { ...t, sept } };
}

function filtrerSept(sept: Tactique["sept"], effectif: Joueur[]): Partial<Tactique["sept"]> {
  const valides = new Set(effectif.map((j) => j.id));
  const sortie: Partial<Tactique["sept"]> = {};
  for (const [poste, id] of Object.entries(sept)) {
    if (id && valides.has(id)) sortie[poste as keyof Tactique["sept"]] = id;
  }
  return sortie;
}

/** Joue toutes les rencontres de la journée courante et avance le calendrier. */
/**
 * La semaine d'entraînement qui précède la journée : la fraîcheur du jour et
 * les blessures de la séance comptent pour la rencontre qui suit. Appelable
 * deux fois sans dommage — l'interface l'appelle avant d'ouvrir le match du
 * joueur, `jouerJournee` la rappelle pour les journées simulées d'un bloc.
 */
export function entrainerLaSemaine(monde: Monde, saison: Saison, idx: IndexMonde, options: OptionsJournee = {}): void {
  const numero = saison.journeeCourante;
  if (saison.terminee || saison.semaineEntrainee >= numero) return;
  saison.semaineEntrainee = numero;
  const alea = creerAleatoire(grainePour(saison.graine, "semaine", numero));
  for (const club of monde.clubs) {
    const effectif = idx.effectifParClub.get(club.id) ?? [];
    if (!effectif.length) continue;
    if (club.id !== options.entrainementDirige) {
      club.entrainement = focusAutomatique(effectif, alea);
    }
    const rapport = entrainerSemaine(effectif, club.entrainement, numero, saison.graine);
    options.rapportEntrainement?.(club.id, rapport);
  }
}

export function jouerJournee(monde: Monde, saison: Saison, idx: IndexMonde, options: OptionsJournee = {}): FeuilleMatch[] {
  if (saison.terminee) return [];
  const numero = saison.journeeCourante;
  const rencontres = saison.calendrier[numero] ?? [];
  const feuilles: FeuilleMatch[] = [];

  entrainerLaSemaine(monde, saison, idx, options);

  rencontres.forEach((r, i) => {
    const concerne = options.commentairePour === r.domicileId || options.commentairePour === r.exterieurId;
    const jouer = options.simuler ?? simulerMatch;
    const feuille =
      concerne && options.feuilleFournie
        ? options.feuilleFournie
        : jouer(entreeEquipe(monde, idx, r.domicileId), entreeEquipe(monde, idx, r.exterieurId), {
            graine: grainePour(saison.graine, numero, i, r.domicileId),
            commentaire: concerne,
          });
    // La feuille est notée avant d'être rangée : c'est cette note qui nourrit
    // la progression des joueurs à la fin de la saison.
    noterFeuille(feuille, (joueurId) => idx.joueurParId.get(joueurId)?.poste ?? "DC");
    feuilles.push(feuille);
    saison.resultats.push({
      ...r,
      journee: numero,
      scoreDomicile: feuille.scoreDomicile,
      scoreExterieur: feuille.scoreExterieur,
    });
    cumulerStats(saison, feuille);
    appliquerApresMatch(monde, idx, r.domicileId, feuille.joueursDomicile, numero, saison.graine);
    appliquerApresMatch(monde, idx, r.exterieurId, feuille.joueursExterieur, numero, saison.graine);
  });

  saison.journeeCourante++;
  if (saison.journeeCourante >= saison.calendrier.length) saison.terminee = true;
  return feuilles;
}

function statsVides(): StatsSaisonJoueur {
  return {
    matchs: 0,
    secondes: 0,
    buts: 0,
    tirs: 0,
    septMetresMarques: 0,
    septMetresTires: 0,
    pertes: 0,
    pertesProvoquees: 0,
    contres: 0,
    exclusions: 0,
    arrets: 0,
    tirsSubis: 0,
    noteCumulee: 0,
  };
}

function cumulerStats(saison: Saison, feuille: FeuilleMatch) {
  for (const ligne of [...feuille.joueursDomicile, ...feuille.joueursExterieur]) {
    const s = (saison.statsJoueurs[ligne.joueurId] ??= statsVides());
    s.matchs++;
    s.secondes += ligne.secondes;
    s.buts += ligne.buts;
    s.tirs += ligne.tirs;
    s.septMetresMarques += ligne.septMetresMarques;
    s.septMetresTires += ligne.septMetresTires;
    s.pertes += ligne.pertes;
    s.pertesProvoquees += ligne.pertesProvoquees;
    s.contres += ligne.contres;
    s.exclusions += ligne.exclusions;
    s.arrets += ligne.arrets;
    s.tirsSubis += ligne.tirsSubis;
    s.noteCumulee += ligne.note;
  }
}

/**
 * Suites du match : usure, récupération, forme et blessures.
 * Un joueur qui n'a pas joué récupère ; un joueur cuit se blesse plus souvent.
 */
function appliquerApresMatch(
  monde: Monde,
  idx: IndexMonde,
  clubId: string,
  lignes: StatsJoueurMatch[],
  journee: number,
  graine: number,
) {
  const alea = creerAleatoire(grainePour(graine, "apres", journee, clubId));
  const parJoueur = new Map(lignes.map((l) => [l.joueurId, l]));
  for (const j of idx.effectifParClub.get(clubId) ?? []) {
    // Les blessures se décomptent à l'entraînement, une fois par semaine.
    if (j.blessureJours > 0) {
      j.condition = borner(j.condition + 10, 0, 100);
      continue;
    }
    const ligne = parJoueur.get(j.id);
    const minutes = (ligne?.secondes ?? 0) / 60;
    if (minutes > 0) {
      j.condition = borner(j.condition - minutes * 0.5 + 26, 25, 100);
      const risque = 0.006 + Math.max(0, 60 - j.condition) * 0.0006;
      if (alea.chance(risque)) {
        j.blessureJours = alea.entier(1, 6);
        j.forme = 0;
        j.moral = borner(j.moral - 8, 0, 100);
      }
      const buts = ligne?.buts ?? 0;
      if (buts >= 6) j.forme = borner(j.forme + 1, -3, 3);
      else if (buts === 0 && minutes > 25) j.forme = borner(j.forme - 1, -3, 3);
    } else {
      j.condition = borner(j.condition + 16, 0, 100);
      j.moral = borner(j.moral - 0.6, 0, 100);
      if (j.forme > 0) j.forme = borner(j.forme - (alea.chance(0.3) ? 1 : 0), -3, 3);
    }
    // La forme régresse vers zéro : une mauvaise série n'enferme personne.
    if (alea.chance(0.25)) j.forme = j.forme > 0 ? j.forme - 1 : j.forme < 0 ? j.forme + 1 : 0;
  }
}

/* ------------------------------------------------------------- classement */

export type LigneClassement = {
  clubId: string;
  nom: string;
  abbr: string;
  rang: number;
  joues: number;
  victoires: number;
  nuls: number;
  defaites: number;
  butsPour: number;
  butsContre: number;
  difference: number;
  points: number;
  /** Cinq derniers résultats, du plus ancien au plus récent. */
  forme: ("V" | "N" | "D")[];
};

export function classement(monde: Monde, saison: Saison, divisionId: string, idx: IndexMonde): LigneClassement[] {
  const division = idx.divisionParId.get(divisionId)!;
  const lignes = new Map<string, LigneClassement>();
  for (const clubId of division.clubIds) {
    const club = idx.clubParId.get(clubId)!;
    lignes.set(clubId, {
      clubId,
      nom: club.nom,
      abbr: club.abbr,
      rang: 0,
      joues: 0,
      victoires: 0,
      nuls: 0,
      defaites: 0,
      butsPour: 0,
      butsContre: 0,
      difference: 0,
      points: 0,
      forme: [],
    });
  }

  for (const r of saison.resultats) {
    if (r.divisionId !== divisionId) continue;
    const dom = lignes.get(r.domicileId);
    const ext = lignes.get(r.exterieurId);
    if (!dom || !ext) continue;
    dom.joues++;
    ext.joues++;
    dom.butsPour += r.scoreDomicile;
    dom.butsContre += r.scoreExterieur;
    ext.butsPour += r.scoreExterieur;
    ext.butsContre += r.scoreDomicile;
    if (r.scoreDomicile > r.scoreExterieur) {
      dom.victoires++;
      ext.defaites++;
      dom.points += 2;
      dom.forme.push("V");
      ext.forme.push("D");
    } else if (r.scoreDomicile < r.scoreExterieur) {
      ext.victoires++;
      dom.defaites++;
      ext.points += 2;
      ext.forme.push("V");
      dom.forme.push("D");
    } else {
      dom.nuls++;
      ext.nuls++;
      dom.points++;
      ext.points++;
      dom.forme.push("N");
      ext.forme.push("N");
    }
  }

  const table = [...lignes.values()];
  for (const l of table) {
    l.difference = l.butsPour - l.butsContre;
    l.forme = l.forme.slice(-5);
  }
  table.sort(
    (a, b) =>
      b.points - a.points ||
      b.difference - a.difference ||
      b.butsPour - a.butsPour ||
      a.nom.localeCompare(b.nom),
  );
  table.forEach((l, i) => (l.rang = i + 1));
  return table;
}

/* ------------------------------------------------------------- statistiques */

export type LigneButeur = { joueur: Joueur; clubAbbr: string; buts: number; matchs: number; parMatch: number };

export function meilleursButeurs(monde: Monde, saison: Saison, idx: IndexMonde, divisionId?: string, limite = 10): LigneButeur[] {
  const clubsRetenus = divisionId ? new Set(idx.divisionParId.get(divisionId)!.clubIds) : null;
  const lignes: LigneButeur[] = [];
  for (const [joueurId, stats] of Object.entries(saison.statsJoueurs)) {
    const joueur = idx.joueurParId.get(joueurId);
    if (!joueur || !joueur.clubId) continue;
    if (clubsRetenus && !clubsRetenus.has(joueur.clubId)) continue;
    if (stats.buts === 0) continue;
    lignes.push({
      joueur,
      clubAbbr: idx.clubParId.get(joueur.clubId)?.abbr ?? "",
      buts: stats.buts,
      matchs: stats.matchs,
      parMatch: Math.round((stats.buts / Math.max(1, stats.matchs)) * 10) / 10,
    });
  }
  lignes.sort((a, b) => b.buts - a.buts || b.parMatch - a.parMatch);
  return lignes.slice(0, limite);
}

/** Prochaine rencontre d'un club, ou null si la saison est finie. */
export function prochaineRencontre(saison: Saison, clubId: string): { journee: number; rencontre: Rencontre } | null {
  for (let j = saison.journeeCourante; j < saison.calendrier.length; j++) {
    const r = saison.calendrier[j].find((x) => x.domicileId === clubId || x.exterieurId === clubId);
    if (r) return { journee: j, rencontre: r };
  }
  return null;
}

export function resultatsDuClub(saison: Saison, clubId: string): ResultatMatch[] {
  return saison.resultats.filter((r) => r.domicileId === clubId || r.exterieurId === clubId);
}
