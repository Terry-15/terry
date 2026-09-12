import { note } from "../moteur/attributs";
import type { IndexMonde } from "../moteur/monde";
import { forceClub } from "../moteur/monde";
import { PART_TIRS } from "../moteur/match/parametres";
import { meilleurSept } from "../moteur/monde";
import type { FocusOffensif, Joueur, Monde, SystemeDefensif } from "../moteur/types";
import { classement, type Saison } from "../moteur/saison";

/** En dessous de ce gain attendu, l'individuelle n'est pas rentable. */
export const SEUIL_MARQUAGE = 1;

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
  /** Système que ce club défend d'habitude. */
  systemeAdverse: SystemeDefensif;
  /** Zone à chercher en attaque contre ce système. */
  zoneConseillee: FocusOffensif;
  conseilAttaque: string;
  dangereux: Joueur | null;
  /** Celui que l'individuelle ferait le plus mal, s'il y en a un. */
  cibleMarquage: Joueur | null;
  /** Part des tirs de l'équipe que cette cible prend à elle seule, 0–1. */
  partCible: number;
  /**
   * Ce que le marquage devrait rapporter : la part des ballons de la cible
   * multipliée par son avance au tir sur ses coéquipiers. En dessous de
   * SEUIL_MARQUAGE, sortir un défenseur du bloc coûte plus que ça ne rapporte.
   */
  gainMarquage: number;
  conseilMarquage: string;
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

  const systemeAdverse = club.tactique.systeme;
  const zoneConseillee: FocusOffensif =
    systemeAdverse === "6-0" ? "distance" : systemeAdverse === "3-2-1" ? "pivot" : "ailes";
  const conseilAttaque =
    systemeAdverse === "6-0"
      ? "Ils défendent bas : l'intérieur est fermé, mais on peut armer de neuf mètres."
      : systemeAdverse === "3-2-1"
        ? "Ils défendent haut : les arrières vont souffrir, le pivot va vivre."
        : "Un 5-1 sans point faible marqué. Les ailes restent le côté le moins couvert.";

  // Qui mettre en individuelle. Ce n'est pas celui qui tire le plus : c'est
  // celui dont les ballons, s'ils partent ailleurs, partiront vers de moins
  // bons tireurs. Un gros volume de tirs médiocres, on le laisse tirer.
  const poidsTir = titulaires.map(({ poste, joueur }) => ({
    joueur,
    poids: (24 + joueur.attributs.tir) * (parts[poste as keyof typeof parts] ?? 1),
  }));
  const total = poidsTir.reduce((s, x) => s + x.poids, 0);
  const candidats = poidsTir.map((x) => {
    const autres = poidsTir.filter((y) => y !== x);
    const poidsAutres = autres.reduce((s, y) => s + y.poids, 0);
    const tirAutres = poidsAutres > 0 ? autres.reduce((s, y) => s + y.poids * y.joueur.attributs.tir, 0) / poidsAutres : 0;
    const part = total > 0 ? x.poids / total : 0;
    return { joueur: x.joueur, part, gain: part * (x.joueur.attributs.tir - tirAutres) };
  });
  candidats.sort((a, b) => b.gain - a.gain);
  const meilleure = candidats[0] ?? null;
  const cibleMarquage = meilleure && meilleure.gain >= SEUIL_MARQUAGE ? meilleure.joueur : null;
  const partCible = meilleure?.part ?? 0;
  const gainMarquage = meilleure?.gain ?? 0;
  const conseilMarquage = cibleMarquage
    ? `${cibleMarquage.prenom} ${cibleMarquage.nom} prend ${Math.round(partCible * 100)} % des tirs et tire mieux que ses coéquipiers : une individuelle sur lui se rentabilise.`
    : "Leurs tirs sont répartis entre des joueurs de valeur comparable : sortir un défenseur du bloc coûterait plus que ça ne rapporterait.";

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
    systemeAdverse,
    zoneConseillee,
    conseilAttaque,
    dangereux,
    cibleMarquage,
    partCible,
    gainMarquage,
    conseilMarquage,
    gardien,
    formeRecente,
  };
}
