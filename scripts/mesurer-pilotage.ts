/**
 * Ce que vaut le banc — critère de sortie de la phase 2.
 *
 *   npx tsx scripts/mesurer-pilotage.ts [nombre de matchs]
 *
 * Trois mesures : l'apport global du pilotage, la contribution de chaque
 * levier pris isolément, et un balayage des seuils de rotation. Un levier
 * qui ne se voit pas dans ces chiffres est décoratif.
 */
import { creerMemoirePilote, PAS_PILOTAGE, PILOTE_ATTENTIF, piloterBanc, type ReglagesPilote } from "../src/jeu/pilote";
import { avancerMatch, creerMatch, simulerMatch, terminerMatch, type EntreeEquipe } from "../src/moteur/match/moteur";
import { DUREE_MATCH } from "../src/moteur/match/parametres";
import { creerMonde, disponibles, indexer } from "../src/moteur/monde";
import type { ConsigneRotation } from "../src/moteur/types";

const N = Number(process.argv[2] ?? 300);
const monde = creerMonde(20260911);
const idx = indexer(monde);

const PAIRES: [string, string][] = [
  ["d1-05", "d1-03"],
  ["d1-05", "d1-09"],
  ["d1-05", "d1-01"],
  ["d1-08", "d1-04"],
  ["d2-03", "d2-08"],
];

function entree(clubId: string, rotation: ConsigneRotation = "equilibre"): EntreeEquipe {
  const club = idx.clubParId.get(clubId)!;
  return { club, effectif: disponibles(idx.effectifParClub.get(clubId)!), tactique: { ...club.tactique, rotation } };
}

function mesurer(reglages: ReglagesPilote | null, rotation: ConsigneRotation = "equilibre") {
  let diff = 0;
  let victoires = 0;
  for (let i = 0; i < N; i++) {
    const [moi, adv] = PAIRES[i % PAIRES.length];
    const graine = 120000 + i;
    let feuille;
    if (!reglages) {
      feuille = simulerMatch(entree(moi, rotation), entree(adv), { graine, neutre: true });
    } else {
      const etat = creerMatch(entree(moi, rotation), entree(adv), { graine, neutre: true, pilote: "domicile" });
      const memoire = creerMemoirePilote();
      for (let t = PAS_PILOTAGE; t <= DUREE_MATCH; t += PAS_PILOTAGE) {
        avancerMatch(etat, t);
        piloterBanc(etat, "domicile", PILOTE_ATTENTIF === reglages ? PILOTE_ATTENTIF : reglages, memoire);
      }
      feuille = terminerMatch(etat);
    }
    diff += feuille.scoreDomicile - feuille.scoreExterieur;
    if (feuille.scoreDomicile > feuille.scoreExterieur) victoires++;
  }
  return { diff: diff / N, victoires: (victoires / N) * 100 };
}

const RIEN: ReglagesPilote = {
  seuilSortie: 0,
  seuilEntree: 101,
  protegerExclus: false,
  tempsMorts: false,
  ajusterDefense: false,
  ajusterRythme: false,
  changerGardien: false,
  finDeMatch: false,
  jouerLesExclusions: false,
};

const base = mesurer(null);
const titulaires = mesurer(null, "titulaires");
const pilote = mesurer(PILOTE_ATTENTIF);

console.log(`\n=== ${N} matchs par configuration, terrain neutre ===\n`);
const ligne = (nom: string, r: { diff: number; victoires: number }) =>
  console.log(`${nom.padEnd(32)} ${r.diff.toFixed(2).padStart(6)} but   ${r.victoires.toFixed(1).padStart(5)} % de victoires`);
ligne("banc laissé au moteur", base);
ligne("banc jamais touché (titulaires)", titulaires);
ligne("banc piloté par l'adjoint", pilote);
const apport = pilote.diff - base.diff;
console.log(`\napport du pilotage : ${apport.toFixed(2)} but par match`);
console.log(apport >= 1 ? "critère de la phase 2 atteint\n" : "critère de la phase 2 NON atteint\n");

console.log("=== contribution de chaque levier ===\n");
const leviers: [string, Partial<ReglagesPilote>][] = [
  ["rien (banc figé)", {}],
  ["temps morts", { tempsMorts: true }],
  ["rotation", { seuilSortie: 84, seuilEntree: 68 }],
  ["rythme contre le système adverse", { ajusterRythme: true }],
  ["supériorités et infériorités", { jouerLesExclusions: true }],
  ["défense revue à la mi-temps", { ajusterDefense: true }],
  ["changement de gardien", { changerGardien: true }],
  ["fin de match", { finDeMatch: true }],
];
for (const [nom, modif] of leviers) {
  const r = mesurer({ ...RIEN, ...modif });
  const ecart = r.diff - base.diff;
  console.log(
    `${nom.padEnd(34)} ${r.diff.toFixed(2).padStart(6)} but   ${(ecart >= 0 ? "+" : "") + ecart.toFixed(2)}`,
  );
}

console.log("\n=== seuils de rotation ===\n");
console.log("sortie  entrée     diff   apport");
for (const seuilSortie of [84, 90]) {
  for (const seuilEntree of [62, 74]) {
    const r = mesurer({ ...RIEN, tempsMorts: true, ajusterRythme: true, jouerLesExclusions: true, seuilSortie, seuilEntree });
    const ecart = r.diff - base.diff;
    console.log(
      `${String(seuilSortie).padStart(6)}${String(seuilEntree).padStart(8)}` +
        `${r.diff.toFixed(2).padStart(9)}   ${(ecart >= 0 ? "+" : "") + ecart.toFixed(2)}`,
    );
  }
}
console.log();
