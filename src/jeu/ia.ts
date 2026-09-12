import { creerAleatoire, grainePour } from "../moteur/aleatoire";
import type { IndexMonde } from "../moteur/monde";
import { echangesProposes, meilleurSept } from "../moteur/monde";
import type { AgressiviteDefensive, FocusOffensif, Monde, SystemeDefensif, Tactique, Tempo } from "../moteur/types";
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

  // La zone d'attaque suit le système annoncé d'en face : on arme de loin
  // contre un bloc bas, on entre dedans contre une défense haute.
  const attaque: FocusOffensif = alea.chance(0.75)
    ? systemeAdverse === "6-0"
      ? "distance"
      : systemeAdverse === "3-2-1"
        ? "pivot"
        : "ailes"
    : "equilibre";

  // L'engagement défensif vient du tempérament de l'effectif : un bloc qui
  // intercepte monte, un bloc qui bloque reste en place.
  const champ = effectif.filter((j) => j.poste !== "GB");
  const moyenne = (cle: "agressivite" | "interception" | "blocage") =>
    champ.reduce((s, j) => s + j.attributs[cle], 0) / Math.max(1, champ.length);
  const gout = (moyenne("agressivite") + moyenne("interception")) / 2 - moyenne("blocage");
  const agressivite: AgressiviteDefensive = gout > 1 ? "engagee" : gout < -1 ? "prudente" : "normale";

  // L'individuelle ne se sort que contre un tireur vraiment prépondérant.
  const marquage = rapport.cibleMarquage && alea.chance(0.5) ? rapport.cibleMarquage.id : null;

  const sept = meilleurSept(effectif);
  return {
    ...club.tactique,
    systeme,
    tempo,
    attaque,
    agressivite,
    marquage,
    rotation: "equilibre",
    gardienVolant: club.reputation > 40,
    sept,
    specialistes: echangesProposes(effectif, sept),
  };
}
