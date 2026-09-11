import { note } from "../moteur/attributs";
import type { IndexMonde } from "../moteur/monde";
import { forceClub } from "../moteur/monde";
import { PART_TIRS } from "../moteur/match/parametres";
import { meilleurSept } from "../moteur/monde";
import type { Joueur, Monde, SystemeDefensif } from "../moteur/types";
import { classement, type Saison } from "../moteur/saison";

export type RapportObservation = {
  clubId: string;
  nom: string;
  force: number;
  rang: number | null;
  /** Part des tirs pris à distance, 0–1. */
  partDistance: number;
  profil: "Tirs à distance" | "Jeu intérieur" | "Attaque équilibrée";
  conseil: string;
  systemeConseille: SystemeDefensif;
  dangereux: Joueur | null;
  gardien: Joueur | null;
  formeRecente: ("V" | "N" | "D")[];
};

/**
 * Le rapport d'observation : d'où l'adversaire tire, et donc quel système
 * défensif lui fait mal. C'est l'information qui rend le choix décidable —
 * sans elle, changer de défense est une superstition.
 */
export function observer(monde: Monde, idx: IndexMonde, clubId: string, saison?: Saison): RapportObservation {
  const club = idx.clubParId.get(clubId)!;
  const effectif = idx.effectifParClub.get(clubId) ?? [];
  const sept = meilleurSept(effectif);
  const titulaires = Object.entries(sept)
    .filter(([poste]) => poste !== "GB")
    .map(([poste, id]) => ({ poste, joueur: idx.joueurParId.get(id)! }))
    .filter((x) => x.joueur);

  // On pondère comme le moteur : part du poste × qualité de tir.
  const parts = PART_TIRS["5-1"];
  let loin = 0;
  let pres = 0;
  for (const { poste, joueur } of titulaires) {
    const poids = joueur.attributs.tir * (parts[poste as keyof typeof parts] ?? 1);
    if (poste === "ArG" || poste === "ArD" || poste === "DC") loin += poids;
    else pres += poids;
  }
  const partDistance = loin + pres > 0 ? loin / (loin + pres) : 0.5;

  const profil = partDistance >= 0.56 ? "Tirs à distance" : partDistance <= 0.46 ? "Jeu intérieur" : "Attaque équilibrée";
  const systemeConseille: SystemeDefensif = profil === "Tirs à distance" ? "3-2-1" : profil === "Jeu intérieur" ? "6-0" : "5-1";
  const conseil =
    profil === "Tirs à distance"
      ? "De gros arrières qui arment de loin. Une défense haute les gêne ; un bloc bas les laisse tirer."
      : profil === "Jeu intérieur"
        ? "Ils jouent le pivot et les ailes. Un bloc bas ferme l'intérieur ; une défense haute leur ouvre la porte."
        : "Aucun déséquilibre marqué à exploiter. Le 5-1 limite les dégâts partout.";

  const dangereux = titulaires.map((x) => x.joueur).sort((a, b) => note(b.poste, b.attributs) - note(a.poste, a.attributs))[0] ?? null;
  const gardien = idx.joueurParId.get(sept.GB) ?? null;

  let rang: number | null = null;
  let formeRecente: ("V" | "N" | "D")[] = [];
  if (saison && saison.resultats.length) {
    const ligne = classement(monde, saison, club.divisionId, idx).find((l) => l.clubId === clubId);
    if (ligne) {
      rang = ligne.rang;
      formeRecente = ligne.forme;
    }
  }

  return {
    clubId,
    nom: club.nom,
    force: forceClub(effectif),
    rang,
    partDistance,
    profil,
    conseil,
    systemeConseille,
    dangereux,
    gardien,
    formeRecente,
  };
}
