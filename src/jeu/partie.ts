import { creerMonde, indexer, type IndexMonde } from "../moteur/monde";
import { creerMatch, simulerMatch, type EtatMatch } from "../moteur/match/moteur";
import {
  classement,
  creerSaison,
  entreeEquipe,
  jouerJournee as jouerJourneeSaison,
  prochaineRencontre,
  type Rencontre,
  type Saison,
} from "../moteur/saison";
import { passerALaSaisonSuivante } from "../moteur/evolution";
import type { BilanSaison, Camp, FeuilleMatch, Monde } from "../moteur/types";
import { tactiqueIA } from "./ia";
import { simulerAvecAdjoints } from "./pilote";

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

/** Place que la réputation du club lui promet dans sa division. */
export function rangAttendu(monde: Monde, clubId: string): number {
  const club = monde.clubs.find((c) => c.id === clubId);
  if (!club) return 0;
  const division = monde.divisions.find((d) => d.id === club.divisionId);
  if (!division) return 0;
  return (
    division.clubIds
      .map((id) => monde.clubs.find((c) => c.id === id)!)
      .sort((a, b) => b.reputation - a.reputation)
      .findIndex((c) => c.id === clubId) + 1
  );
}

export function nouvellePartie(clubId: string, manager: string, graine = Date.now() % 100000): Partie {
  const monde = creerMonde(graine);
  const saison = creerSaison(monde, graine);

  return {
    version: VERSION_SAUVEGARDE,
    graine,
    manager: manager.trim() || "Nouveau manager",
    clubId,
    monde,
    saison,
    dernierMatch: null,
    dernierMatchVu: true,
    rangAttendu: rangAttendu(monde, clubId),
    creeeLe: new Date().toISOString(),
  };
}

/** Fixe la tactique des clubs non contrôlés pour la journée à venir. */
function preparerJournee(partie: Partie, idx: IndexMonde, numero: number) {
  for (const r of partie.saison.calendrier[numero] ?? []) {
    for (const [clubId, adversaireId] of [
      [r.domicileId, r.exterieurId],
      [r.exterieurId, r.domicileId],
    ]) {
      if (clubId === partie.clubId) continue;
      const club = idx.clubParId.get(clubId);
      if (club) club.tactique = tactiqueIA(partie.monde, idx, clubId, adversaireId, numero);
    }
  }
}

export type MatchEnCours = {
  etat: EtatMatch;
  journee: number;
  domicile: boolean;
  adversaireId: string;
  /** Le camp que le joueur dirige depuis son banc. */
  monCamp: Camp;
};

/**
 * Ouvre le match du club dirigé, sans le jouer : c'est l'appelant qui fait
 * avancer l'horloge, et qui peut l'arrêter pour changer un joueur ou poser un
 * temps mort.
 */
export function ouvrirMatch(partie: Partie, idx: IndexMonde): MatchEnCours | null {
  if (partie.saison.terminee) return null;
  const numero = partie.saison.journeeCourante;
  preparerJournee(partie, idx, numero);
  const mienne = (partie.saison.calendrier[numero] ?? []).find(
    (r) => r.domicileId === partie.clubId || r.exterieurId === partie.clubId,
  );
  if (!mienne) return null;
  const domicile = mienne.domicileId === partie.clubId;
  return {
    etat: creerMatch(
      entreeEquipe(partie.monde, idx, mienne.domicileId),
      entreeEquipe(partie.monde, idx, mienne.exterieurId),
      {
        graine: grainePourMatch(partie, numero, mienne),
        commentaire: true,
        pilote: domicile ? "domicile" : "exterieur",
      },
    ),
    journee: numero,
    domicile,
    adversaireId: domicile ? mienne.exterieurId : mienne.domicileId,
    monCamp: domicile ? "domicile" : "exterieur",
  };
}

/**
 * Clôt la journée une fois le match du joueur terminé : les autres rencontres
 * passent par le même moteur, sur les mêmes effectifs, bancs tenus par les
 * adjoints.
 */
export function cloturerJournee(partie: Partie, idx: IndexMonde, match: MatchEnCours, feuille: FeuilleMatch) {
  jouerJourneeSaison(partie.monde, partie.saison, idx, {
    commentairePour: partie.clubId,
    feuilleFournie: feuille,
    simuler: simulerAvecAdjoints,
  });
  partie.dernierMatchVu = false;
  partie.dernierMatch = {
    journee: match.journee,
    feuille,
    domicile: match.domicile,
    adversaireId: match.adversaireId,
  };
}

/** Journée jouée sans intervention : le banc est confié à l'adjoint. */
export function jouerJourneeSansMoi(partie: Partie, idx: IndexMonde): MatchJoue | null {
  if (partie.saison.terminee) return null;
  const numero = partie.saison.journeeCourante;
  preparerJournee(partie, idx, numero);
  const mienne = (partie.saison.calendrier[numero] ?? []).find(
    (r) => r.domicileId === partie.clubId || r.exterieurId === partie.clubId,
  );
  const feuilleJoueur = mienne
    ? simulerAvecAdjoints(
        entreeEquipe(partie.monde, idx, mienne.domicileId),
        entreeEquipe(partie.monde, idx, mienne.exterieurId),
        { graine: grainePourMatch(partie, numero, mienne), commentaire: true },
      )
    : undefined;

  jouerJourneeSaison(partie.monde, partie.saison, idx, {
    commentairePour: partie.clubId,
    feuilleFournie: feuilleJoueur,
    simuler: simulerAvecAdjoints,
  });

  partie.dernierMatchVu = false;
  partie.dernierMatch =
    mienne && feuilleJoueur
      ? {
          journee: numero,
          feuille: feuilleJoueur,
          domicile: mienne.domicileId === partie.clubId,
          adversaireId: mienne.domicileId === partie.clubId ? mienne.exterieurId : mienne.domicileId,
        }
      : null;
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

/**
 * Clôt la saison et ouvre la suivante : classements figés, montées et
 * descentes, vieillissement du monde entier, centre de formation. Renvoie le
 * bilan à afficher.
 */
export function terminerLaSaison(partie: Partie): BilanSaison {
  const bilan = passerALaSaisonSuivante(partie.monde, partie.saison, partie.graine + partie.monde.saison);
  partie.saison = creerSaison(partie.monde, partie.graine + partie.monde.saison);
  partie.dernierMatch = null;
  partie.dernierMatchVu = true;
  partie.rangAttendu = rangAttendu(partie.monde, partie.clubId);
  return bilan;
}

/** Le bilan de la dernière saison terminée, s'il y en a un. */
export function dernierBilan(partie: Partie): BilanSaison | null {
  return partie.monde.historique.length ? partie.monde.historique[partie.monde.historique.length - 1] : null;
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
