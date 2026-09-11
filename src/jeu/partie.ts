import { creerMonde, indexer, type IndexMonde } from "../moteur/monde";
import { simulerMatch } from "../moteur/match/moteur";
import {
  classement,
  creerSaison,
  entreeEquipe,
  jouerJournee as jouerJourneeSaison,
  prochaineRencontre,
  type Rencontre,
  type Saison,
} from "../moteur/saison";
import type { FeuilleMatch, Monde } from "../moteur/types";
import { tactiqueIA } from "./ia";

export const VERSION_SAUVEGARDE = 1;

export type MatchJoue = {
  journee: number;
  feuille: FeuilleMatch;
  /** Le club du joueur recevait-il ? */
  domicile: boolean;
  adversaireId: string;
};

export type Partie = {
  version: number;
  graine: number;
  manager: string;
  clubId: string;
  monde: Monde;
  saison: Saison;
  dernierMatch: MatchJoue | null;
  /** Le joueur a-t-il refermé la feuille du dernier match ? */
  dernierMatchVu: boolean;
  /** Rang attendu par le conseil en début de saison, d'après la réputation. */
  rangAttendu: number;
  creeeLe: string;
};

export function nouvellePartie(clubId: string, manager: string, graine = Date.now() % 100000): Partie {
  const monde = creerMonde(graine);
  const saison = creerSaison(monde, graine);
  const club = monde.clubs.find((c) => c.id === clubId)!;
  const division = monde.divisions.find((d) => d.id === club.divisionId)!;
  const rangAttendu =
    division.clubIds
      .map((id) => monde.clubs.find((c) => c.id === id)!)
      .sort((a, b) => b.reputation - a.reputation)
      .findIndex((c) => c.id === clubId) + 1;

  return {
    version: VERSION_SAUVEGARDE,
    graine,
    manager: manager.trim() || "Nouveau manager",
    clubId,
    monde,
    saison,
    dernierMatch: null,
    dernierMatchVu: true,
    rangAttendu,
    creeeLe: new Date().toISOString(),
  };
}

/**
 * Joue la journée en cours : le match du club du joueur est commenté minute
 * par minute, les autres passent par le même moteur sur les mêmes effectifs —
 * aucun score inventé.
 */
export function jouerProchaineJournee(partie: Partie, idx: IndexMonde): MatchJoue | null {
  if (partie.saison.terminee) return null;
  const numero = partie.saison.journeeCourante;
  const rencontres = partie.saison.calendrier[numero] ?? [];

  // Les clubs IA choisissent leur tactique en fonction de l'adversaire du jour.
  for (const r of rencontres) {
    for (const [clubId, adversaireId] of [
      [r.domicileId, r.exterieurId],
      [r.exterieurId, r.domicileId],
    ]) {
      if (clubId === partie.clubId) continue;
      const club = idx.clubParId.get(clubId);
      if (club) club.tactique = tactiqueIA(partie.monde, idx, clubId, adversaireId, numero);
    }
  }

  const mienne = rencontres.find((r) => r.domicileId === partie.clubId || r.exterieurId === partie.clubId);
  let feuilleJoueur: FeuilleMatch | undefined;
  if (mienne) {
    feuilleJoueur = simulerMatch(
      entreeEquipe(partie.monde, idx, mienne.domicileId),
      entreeEquipe(partie.monde, idx, mienne.exterieurId),
      { graine: grainePourMatch(partie, numero, mienne), commentaire: true },
    );
  }

  jouerJourneeSaison(partie.monde, partie.saison, idx, {
    commentairePour: partie.clubId,
    feuilleFournie: feuilleJoueur,
  });

  partie.dernierMatchVu = false;
  if (mienne && feuilleJoueur) {
    const domicile = mienne.domicileId === partie.clubId;
    partie.dernierMatch = {
      journee: numero,
      feuille: feuilleJoueur,
      domicile,
      adversaireId: domicile ? mienne.exterieurId : mienne.domicileId,
    };
  } else {
    partie.dernierMatch = null;
  }
  return partie.dernierMatch;
}

function grainePourMatch(partie: Partie, journee: number, rencontre: Rencontre): number {
  // La même que celle du calendrier : rejouer la journée donne le même match.
  let h = 0x811c9dc5;
  for (const p of [partie.saison.graine, journee, indexRencontre(partie, journee, rencontre), rencontre.domicileId]) {
    const s = String(p);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
  }
  return h >>> 0;
}

function indexRencontre(partie: Partie, journee: number, rencontre: Rencontre): number {
  return (partie.saison.calendrier[journee] ?? []).findIndex(
    (r) => r.domicileId === rencontre.domicileId && r.exterieurId === rencontre.exterieurId,
  );
}

/* ------------------------------------------------------------------- vues */

export function indexPartie(partie: Partie): IndexMonde {
  return indexer(partie.monde);
}

export function monClub(partie: Partie, idx: IndexMonde) {
  return idx.clubParId.get(partie.clubId)!;
}

export function monClassement(partie: Partie, idx: IndexMonde) {
  const club = monClub(partie, idx);
  return classement(partie.monde, partie.saison, club.divisionId, idx);
}

export function maLigne(partie: Partie, idx: IndexMonde) {
  return monClassement(partie, idx).find((l) => l.clubId === partie.clubId)!;
}

export function monProchainMatch(partie: Partie) {
  return prochaineRencontre(partie.saison, partie.clubId);
}

/* -------------------------------------------------------------- sauvegarde */

const CLE = "demi-centre-sauvegarde-v1";

export function sauvegarder(partie: Partie): boolean {
  try {
    localStorage.setItem(CLE, JSON.stringify(partie));
    return true;
  } catch {
    return false;
  }
}

export function charger(): Partie | null {
  try {
    const brut = localStorage.getItem(CLE);
    if (!brut) return null;
    const partie = JSON.parse(brut) as Partie;
    if (partie.version !== VERSION_SAUVEGARDE) return null;
    return partie;
  } catch {
    return null;
  }
}

export function effacerSauvegarde() {
  try {
    localStorage.removeItem(CLE);
  } catch {
    // Un navigateur sans stockage local : la partie reste en mémoire.
  }
}

export function existeSauvegarde(): boolean {
  try {
    return localStorage.getItem(CLE) !== null;
  } catch {
    return false;
  }
}
