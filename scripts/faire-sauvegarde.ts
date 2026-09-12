/** Fabrique une sauvegarde avec une saison déjà jouée, pour tester l'interface. */
import { writeFileSync } from "node:fs";

import { indexPartie, jouerJourneeSansMoi, nouvellePartie } from "../src/jeu/partie";

const partie = nouvellePartie(process.argv[3] ?? "d1-05", "Léopold", 4242);
while (!partie.saison.terminee) jouerJourneeSansMoi(partie, indexPartie(partie));
writeFileSync(process.argv[2], JSON.stringify(partie));
console.log(`saison jouée : ${partie.saison.journeeCourante} journées, terminée = ${partie.saison.terminee}`);
