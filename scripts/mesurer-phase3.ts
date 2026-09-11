/**
 * Les deux critères de sortie de la phase 3 :
 *   1. les trois systèmes défensifs se séparent de plus d'un but selon le contexte ;
 *   2. le sept contre six renverse mesurablement des fins de match serrées.
 */
import { simulerAvecAdjoints } from "../src/jeu/pilote";
import { simulerMatch, type EntreeEquipe } from "../src/moteur/match/moteur";
import { creerMonde, disponibles, indexer } from "../src/moteur/monde";
import type { SystemeDefensif } from "../src/moteur/types";

const N = Number(process.argv[2] ?? 1000);
const monde = creerMonde(20260911);
const idx = indexer(monde);
const d1 = monde.divisions[0].clubIds;

function entree(
  clubId: string,
  systeme?: SystemeDefensif,
  gardienVolant?: boolean,
  specialistes?: boolean,
): EntreeEquipe {
  const club = idx.clubParId.get(clubId)!;
  return {
    club,
    effectif: disponibles(idx.effectifParClub.get(clubId)!),
    tactique: {
      ...club.tactique,
      systeme: systeme ?? club.tactique.systeme,
      tempo: "equilibre",
      gardienVolant: gardienVolant ?? false,
      specialistes: specialistes === false ? [] : club.tactique.specialistes,
    },
  };
}

/* ---------------------------------- 1. écart entre les systèmes défensifs */

const gros = d1.filter((id) => idx.clubParId.get(id)!.style === "distance").slice(0, 3);
const dedans = d1.filter((id) => idx.clubParId.get(id)!.style === "interieur").slice(0, 3);
const mesurer = (adversaires: string[], systeme: SystemeDefensif) => {
  let encaisses = 0;
  let n = 0;
  for (const adversaire of adversaires) {
    for (let i = 0; i < N; i++) {
      encaisses += simulerMatch(entree("d1-05", systeme), entree(adversaire), { graine: 660000 + i, neutre: true }).scoreExterieur;
      n++;
    }
  }
  return encaisses / n;
};

console.log(`\n=== 1. écart entre systèmes (${N} matchs par club, 3 clubs par profil) ===\n`);
const SYS: SystemeDefensif[] = ["6-0", "5-1", "3-2-1"];
const contreGros = SYS.map((s) => mesurer(gros, s));
const contreDedans = SYS.map((s) => mesurer(dedans, s));
console.log("profil adverse     " + SYS.map((s) => s.padStart(8)).join(""));
console.log("gros arrières      " + contreGros.map((x) => x.toFixed(2).padStart(8)).join(""));
console.log("jeu intérieur      " + contreDedans.map((x) => x.toFixed(2).padStart(8)).join(""));
const amplitude = Math.max(...contreGros) - Math.min(...contreGros) + (Math.max(...contreDedans) - Math.min(...contreDedans));
console.log(`\nmeilleur contre les gros arrières : ${SYS[contreGros.indexOf(Math.min(...contreGros))]}`);
console.log(`meilleur contre le jeu intérieur  : ${SYS[contreDedans.indexOf(Math.min(...contreDedans))]}`);
console.log(`amplitude cumulée : ${amplitude.toFixed(2)} but ${amplitude > 1 ? "(critère atteint)" : "(critère non atteint)"}`);

/* ------------------------------------------- 2. le sept contre six en fin de match */

console.log(`\n=== 2. gardien volant : seulement les matchs où il est sorti ===\n`);
function finDeMatch() {
  let paires = 0;
  let pointsSans = 0;
  let pointsAvec = 0;
  let diffSans = 0;
  let diffAvec = 0;
  let sauves = 0;
  let perdus = 0;
  for (let i = 0; i < N * 6; i++) {
    const adversaire = d1[(i * 3 + 1) % d1.length];
    if (adversaire === "d1-05") continue;
    const graine = 480000 + i;
    // Même graine : les cinquante-cinq premières minutes sont identiques, seule
    // la fin diffère. C'est la seule façon de mesurer un levier de fin de match.
    const avec = simulerAvecAdjoints(entree("d1-05", undefined, true), entree(adversaire), { graine, neutre: true, commentaire: true });
    if (!avec.evenements.some((e) => e.type === "gardienVolant")) continue;
    const sans = simulerAvecAdjoints(entree("d1-05", undefined, false), entree(adversaire), { graine, neutre: true, commentaire: true });
    paires++;
    const pts = (f: typeof avec) => (f.scoreDomicile > f.scoreExterieur ? 2 : f.scoreDomicile === f.scoreExterieur ? 1 : 0);
    pointsAvec += pts(avec);
    pointsSans += pts(sans);
    diffAvec += avec.scoreDomicile - avec.scoreExterieur;
    diffSans += sans.scoreDomicile - sans.scoreExterieur;
    if (pts(avec) > pts(sans)) sauves++;
    if (pts(avec) < pts(sans)) perdus++;
  }
  return { paires, pointsAvec: pointsAvec / paires, pointsSans: pointsSans / paires, diffAvec: diffAvec / paires, diffSans: diffSans / paires, sauves, perdus };
}
const fin7 = finDeMatch();
console.log(`matchs où le gardien est sorti : ${fin7.paires}`);
console.log(`sans : ${fin7.pointsSans.toFixed(3)} pt/match   diff ${fin7.diffSans.toFixed(2)}`);
console.log(`avec : ${fin7.pointsAvec.toFixed(3)} pt/match   diff ${fin7.diffAvec.toFixed(2)}`);
console.log(`fins renversées en votre faveur : ${fin7.sauves} · contre vous : ${fin7.perdus}`);
console.log(`apport : ${(fin7.pointsAvec - fin7.pointsSans).toFixed(3)} point par match concerné\n`);

/* --------------------------------- 3. les spécialistes attaque / défense */

console.log(`=== 3. rotation attaque / défense (${N * 2} matchs) ===\n`);
const avecPaires = d1.filter((id) => idx.clubParId.get(id)!.tactique.specialistes.length > 0);
function mesurerSpecialistes(actifs: boolean, tempoAdverse: "equilibre" | "rapide") {
  let diff = 0;
  let victoires = 0;
  let n = 0;
  for (let i = 0; i < N * 2; i++) {
    const moi = avecPaires[i % avecPaires.length];
    const adv = d1[(i * 5 + 3) % d1.length];
    if (adv === moi) continue;
    const adversaire = entree(adv);
    adversaire.tactique = { ...adversaire.tactique, tempo: tempoAdverse };
    const f = simulerAvecAdjoints(entree(moi, undefined, false, actifs), adversaire, {
      graine: 520000 + i,
      neutre: true,
    });
    diff += f.scoreDomicile - f.scoreExterieur;
    if (f.scoreDomicile > f.scoreExterieur) victoires++;
    n++;
  }
  return { diff: diff / n, victoires: (victoires / n) * 100 };
}
for (const tempo of ["equilibre", "rapide"] as const) {
  const sans = mesurerSpecialistes(false, tempo);
  const avec = mesurerSpecialistes(true, tempo);
  console.log(
    `adversaire en ${tempo.padEnd(10)} sans rotation ${sans.diff.toFixed(2).padStart(6)} but (${sans.victoires.toFixed(1)} %)   ` +
      `avec ${avec.diff.toFixed(2).padStart(6)} but (${avec.victoires.toFixed(1)} %)   apport ${(avec.diff - sans.diff >= 0 ? "+" : "") + (avec.diff - sans.diff).toFixed(2)}`,
  );
}
console.log();
