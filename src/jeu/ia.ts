import { creerAleatoire, grainePour } from "../moteur/aleatoire";
import type { IndexMonde } from "../moteur/monde";
import { meilleurSept } from "../moteur/monde";
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

  // Le tempo suit l'effectif : des jambes jouent la transition, un collectif
  // technique joue placé.
  const titulaires = Object.entries(meilleurSept(effectif))
    .filter(([poste]) => poste !== "GB")
    .map(([, id]) => idx.joueurParId.get(id)!)
    .filter(Boolean);
  const moyenne = (cle: "vitesse" | "vision" | "passe") =>
    titulaires.reduce((s, j) => s + j.attributs[cle], 0) / Math.max(1, titulaires.length);
  const ecart = moyenne("vitesse") - (moyenne("vision") + moyenne("passe")) / 2;
  const tempo: Tempo = ecart > 0.8 ? "rapide" : ecart < -0.8 ? "place" : "equilibre";

  return {
    ...club.tactique,
    systeme,
    tempo,
    rotation: "equilibre",
    gardienVolant: club.reputation > 50,
    sept: meilleurSept(effectif),
  };
}
