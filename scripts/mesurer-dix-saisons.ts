/**
 * Critère de sortie de la phase 4 : dix saisons enchaînées sans dérive.
 *
 *   npx tsx scripts/mesurer-dix-saisons.ts [nombre de saisons]
 */
import { simulerAvecAdjoints } from "../src/jeu/pilote";
import { note } from "../src/moteur/attributs";
import { palmares, passerALaSaisonSuivante } from "../src/moteur/evolution";
import { creerMonde, indexer } from "../src/moteur/monde";
import { classement, creerSaison, jouerJournee } from "../src/moteur/saison";

const SAISONS = Number(process.argv[2] ?? 10);
const monde = creerMonde(20260911);
const debut = Date.now();

console.log("\nsaison  âge moyen  note moyenne  retraites  éclosions  champion élite            top buteur");
for (let s = 0; s < SAISONS; s++) {
  const idx = indexer(monde);
  const saison = creerSaison(monde, monde.graine + s);
  while (!saison.terminee) jouerJournee(monde, saison, idx, { simuler: simulerAvecAdjoints });
  const table = classement(monde, saison, "d1", idx);
  const bilan = passerALaSaisonSuivante(monde, saison, monde.graine + s);
  const ages = monde.joueurs.map((j) => j.age);
  const notes = monde.joueurs.map((j) => note(j.poste, j.attributs));
  const retraites = bilan.mouvements.reduce((n, m) => n + m.retraites.length, 0);
  const eclosions = bilan.mouvements.reduce((n, m) => n + m.eclosions.length, 0);
  const buteur = bilan.divisions[0].meilleurButeur;
  console.log(
    `${String(bilan.annee).padStart(6)}  ${(ages.reduce((a, b) => a + b, 0) / ages.length).toFixed(1).padStart(9)}  ` +
      `${(notes.reduce((a, b) => a + b, 0) / notes.length).toFixed(2).padStart(12)}  ${String(retraites).padStart(9)}  ` +
      `${String(eclosions).padStart(9)}  ${table[0].nom.padEnd(24)}  ${buteur ? `${buteur.nom} (${buteur.buts})` : "—"}`,
  );
}
const duree = (Date.now() - debut) / 1000;

console.log(`\n${SAISONS} saisons en ${duree.toFixed(1)} s`);
const ages = monde.joueurs.map((j) => j.age);
console.log(`effectifs : ${monde.joueurs.length} joueurs, ${monde.clubs.length} clubs`);
console.log(`âge : min ${Math.min(...ages)}, max ${Math.max(...ages)}`);
const tailles = monde.clubs.map((c) => monde.joueurs.filter((j) => j.clubId === c.id).length);
console.log(`taille des effectifs : de ${Math.min(...tailles)} à ${Math.max(...tailles)}`);
console.log("\npalmarès :");
for (const l of palmares(monde).slice(0, 6)) {
  console.log(`  ${l.nom.padEnd(24)} ${l.titres} titre(s)  ${l.montees} montée(s)  ${l.descentes} descente(s)`);
}
const meilleur = palmares(monde)[0];
console.log(`\nclub le plus titré : ${((meilleur.titres / SAISONS) * 100).toFixed(0)} % des titres (limite : 60 %)\n`);
