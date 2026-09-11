import { creerAleatoire, grainePour } from "../moteur/aleatoire";
import type { IndexMonde } from "../moteur/monde";
import { echangesProposes, meilleurSept } from "../moteur/monde";
import type { Monde, SystemeDefensif, Tactique, Tempo } from "../moteur/types";
import { observer } from "./observation";

/**
 * Décisions des clubs non contrôlés : ils choisissent leur système défensif en
 * fonction du profil offensif d'en face, et leur tempo en fonction de leur
 * propre effectif. Des heuristiques simples, mais lisibles en jeu : l'adversaire
 * n'est plus un bloc tactique figé.
 */
export function tactiqueIA(
  monde: Monde,
  idx: IndexMonde,
  clubId: string,
  adversaireId: string,
  journee: number,
): Tactique {
  const club = idx.clubParId.get(clubId)!;
  const effectif = idx.effectifParClub.get(clubId) ?? [];
  const alea = creerAleatoire(grainePour(monde.graine, "ia", clubId, journee));
  const rapport = observer(monde, idx, adversaireId);

  // 70 % du temps, le système conseillé par l'observation ; sinon le 5-1.
  const systeme: SystemeDefensif = alea.chance(0.7) ? rapport.systemeConseille : "5-1";

  // Le rythme se choisit d'abord contre la défense annoncée d'en face : on
  // prend son temps devant un bloc bas, on attaque vite une défense haute.
  const systemeAdverse = idx.clubParId.get(adversaireId)?.tactique.systeme ?? "5-1";
  const tempo: Tempo =
    systemeAdverse === "6-0" ? "place" : systemeAdverse === "3-2-1" ? "rapide" : "equilibre";

  const sept = meilleurSept(effectif);
  return {
    ...club.tactique,
    systeme,
    tempo,
    rotation: "equilibre",
    gardienVolant: club.reputation > 40,
    sept,
    specialistes: echangesProposes(effectif, sept),
  };
}
