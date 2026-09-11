/**
 * Banc d'essai du moteur — mesure, ne juge pas.
 *
 *   npx tsx scripts/mesurer.ts [nombre de matchs]
 *
 * Sert à calibrer : on change une constante dans match/parametres.ts, on
 * relance, on compare aux repères réels du handball.
 */
import { creerMonde, indexer, disponibles, forceClub } from "../src/moteur/monde";
import { simulerMatch } from "../src/moteur/match/moteur";
import { simulerAvecAdjoints } from "../src/jeu/pilote";
import { creerAleatoire } from "../src/moteur/aleatoire";
import type { SystemeDefensif, Tempo } from "../src/moteur/types";

const N = Number(process.argv[2] ?? 500);
const monde = creerMonde(20260911);
const idx = indexer(monde);
const d1 = monde.divisions[0].clubIds;

function entree(clubId: string, systeme?: SystemeDefensif, tempo?: Tempo) {
  const club = idx.clubParId.get(clubId)!;
  const effectif = disponibles(idx.effectifParClub.get(clubId)!);
  return {
    club,
    effectif,
    tactique: { ...club.tactique, systeme: systeme ?? club.tactique.systeme, tempo: tempo ?? club.tactique.tempo },
  };
}

function moyenne(xs: number[]) {
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}
function ecartType(xs: number[]) {
  const m = moyenne(xs);
  return Math.sqrt(moyenne(xs.map((x) => (x - m) ** 2)));
}
function f(x: number, d = 1) {
  return x.toFixed(d).padStart(6);
}

/* ---------------------------------------------------- distributions de base */

const alea = creerAleatoire(7);
const buts: number[] = [];
const tirs: number[] = [];
const reussite: number[] = [];
const excl: number[] = [];
const sept: number[] = [];
const pertes: number[] = [];
const provoquees: number[] = [];
const contres: number[] = [];
const possessions: number[] = [];
const arrets: number[] = [];
const diffs: number[] = [];
let nuls = 0;

console.log(`\n=== ${N} matchs de Ligue Élite, bancs tenus par les adjoints ===\n`);
const debut = Date.now();
for (let i = 0; i < N; i++) {
  const a = alea.entier(0, d1.length - 1);
  let b = alea.entier(0, d1.length - 1);
  if (b === a) b = (b + 1) % d1.length;
  const feuille = simulerAvecAdjoints(entree(d1[a]), entree(d1[b]), { graine: 1000 + i });
  for (const s of [feuille.statsDomicile, feuille.statsExterieur]) {
    buts.push(s.buts);
    tirs.push(s.tirs);
    reussite.push(s.buts / Math.max(1, s.tirs));
    excl.push(s.exclusions);
    sept.push(s.septMetresTires);
    pertes.push(s.pertes);
    provoquees.push(s.pertesProvoquees);
    contres.push(s.contres);
    possessions.push(s.possessions);
    arrets.push(s.arrets);
  }
  diffs.push(feuille.scoreDomicile - feuille.scoreExterieur);
  if (feuille.scoreDomicile === feuille.scoreExterieur) nuls++;
}
const ms = Date.now() - debut;

const lignes: [string, number, string][] = [
  ["Buts par équipe", moyenne(buts), "26–32"],
  ["Écart-type des buts", ecartType(buts), "3–5"],
  ["Tirs par équipe", moyenne(tirs), "~50"],
  ["Réussite au tir", moyenne(reussite) * 100, "55–62 %"],
  ["Arrêts du gardien", moyenne(arrets), "12–18"],
  ["Exclusions 2 min", moyenne(excl), "3–5"],
  ["Jets de 7 m", moyenne(sept), "4–5"],
  ["Pertes de balle", moyenne(pertes), "11–15"],
  ["Pertes provoquées", moyenne(provoquees), "> 0"],
  ["Contres", moyenne(contres), "2–5"],
  ["Possessions par équipe", moyenne(possessions), "52–60"],
  ["Avantage du terrain (buts)", moyenne(diffs), "1,5–2,5"],
  ["Matchs nuls (%)", (nuls / N) * 100, "8–10 %"],
];
for (const [nom, valeur, repere] of lignes) {
  console.log(`${nom.padEnd(28)} ${f(valeur)}   ${repere}`);
}
console.log(`\n${N} matchs simulés en ${ms} ms (${(ms / N).toFixed(2)} ms/match)\n`);

/* ------------------------------------------------------- matrice tactique */

const SYS: SystemeDefensif[] = ["6-0", "5-1", "3-2-1"];
const TMP: Tempo[] = ["place", "equilibre", "rapide"];
const NM = 400;

function matrice(adversaireId: string, titre: string) {
  console.log(`=== ${titre} (${NM} matchs par combinaison, % de victoires) ===`);
  console.log("            " + SYS.map((s) => s.padStart(9)).join(""));
  const resultats: { cle: string; diff: number; victoires: number }[] = [];
  for (const tempo of TMP) {
    const cellules: string[] = [];
    for (const systeme of SYS) {
      let diff = 0;
      let v = 0;
      for (let i = 0; i < NM; i++) {
        const feuille = simulerMatch(entree("d1-05", systeme, tempo), entree(adversaireId), {
          graine: 900000 + i,
          neutre: true,
        });
        diff += feuille.scoreDomicile - feuille.scoreExterieur;
        if (feuille.scoreDomicile > feuille.scoreExterieur) v++;
      }
      resultats.push({ cle: `${tempo}/${systeme}`, diff: diff / NM, victoires: (v / NM) * 100 });
      cellules.push(`${((v / NM) * 100).toFixed(1)}%`.padStart(9));
    }
    console.log(tempo.padEnd(12) + cellules.join(""));
  }
  const trie = resultats.slice().sort((a, b) => b.victoires - a.victoires);
  console.log(
    `meilleure : ${trie[0].cle} (${trie[0].victoires.toFixed(1)} %, diff ${trie[0].diff.toFixed(2)})   ` +
      `pire : ${trie[8].cle} (${trie[8].victoires.toFixed(1)} %)\n`,
  );
  return trie;
}

const contextes = [
  ["adversaire faible, gros arrières", d1.find((id) => idx.clubParId.get(id)!.style === "distance" && idx.clubParId.get(id)!.reputation < 72)!],
  ["adversaire faible, jeu intérieur", d1.find((id) => idx.clubParId.get(id)!.style === "interieur" && idx.clubParId.get(id)!.reputation < 72)!],
  ["adversaire fort, gros arrières", d1.find((id) => idx.clubParId.get(id)!.style === "distance" && idx.clubParId.get(id)!.reputation > 84)!],
  ["adversaire fort, jeu intérieur", d1.find((id) => idx.clubParId.get(id)!.style === "interieur" && idx.clubParId.get(id)!.reputation > 84)!],
] as const;
const gagnantes = new Set<string>();
let premier = true;
for (const [titre, advId] of contextes) {
  const trie = matrice(advId, `Rocheval contre ${idx.clubParId.get(advId)!.nom} — ${titre}`);
  if (premier) {
    trie.slice(0, 3).forEach((r) => gagnantes.add(r.cle));
    premier = false;
  } else {
    const top3 = new Set(trie.slice(0, 3).map((r) => r.cle));
    for (const cle of [...gagnantes]) if (!top3.has(cle)) gagnantes.delete(cle);
  }
}
console.log("Stratégie dominante ?");
console.log(
  gagnantes.size
    ? `  OUI — ${[...gagnantes].join(", ")} dans le trio de tête des quatre contextes`
    : "  non — aucune combinaison n'est dans le trio de tête des quatre contextes",
);
console.log();

/* --------------------------------- profils d'attaque opposés et système défensif */

console.log("=== Quel système contre quel profil d'attaque ? (300 matchs, terrain neutre) ===");
const gros = d1.find((id) => idx.clubParId.get(id)!.style === "distance" && idx.clubParId.get(id)!.reputation < 79)!;
const interieur = d1.find((id) => idx.clubParId.get(id)!.style === "interieur" && idx.clubParId.get(id)!.reputation < 79)!;
for (const [titre, advId] of [["adversaire à gros arrières", gros], ["adversaire de jeu intérieur", interieur]] as const) {
  const scores = SYS.map((systeme) => {
    let encaisses = 0;
    for (let i = 0; i < 300; i++) {
      const feuille = simulerMatch(entree("d1-05", systeme, "equilibre"), entree(advId), { graine: 300000 + i, neutre: true });
      encaisses += feuille.scoreExterieur;
    }
    return { systeme, encaisses: encaisses / 300 };
  });
  const trie = scores.slice().sort((a, b) => a.encaisses - b.encaisses);
  console.log(
    `${(idx.clubParId.get(advId)!.nom + ` (${titre})`).padEnd(46)} ` +
      scores.map((s) => `${s.systeme} ${s.encaisses.toFixed(1)}`).join("   ") +
      `   → meilleur : ${trie[0].systeme}`,
  );
}
console.log();

/* -------------------------------------------------- difficulté et hiérarchie */

console.log("=== Force des clubs et taux de victoire (120 matchs, terrain neutre) ===");
for (const clubId of ["d1-01", "d1-04", "d1-08", "d1-11", "d1-14", "d2-01", "d2-07", "d3-01"]) {
  let v = 0;
  let diff = 0;
  for (let i = 0; i < 120; i++) {
    const feuille = simulerMatch(entree("d1-05"), entree(clubId), { graine: 500000 + i, neutre: true });
    if (feuille.scoreDomicile > feuille.scoreExterieur) v++;
    diff += feuille.scoreDomicile - feuille.scoreExterieur;
  }
  const club = idx.clubParId.get(clubId)!;
  console.log(
    `${club.nom.padEnd(22)} force ${f(forceClub(idx.effectifParClub.get(clubId)!))}   ` +
      `Rocheval gagne ${f((v / 120) * 100)} %   diff ${f(diff / 120, 2)}`,
  );
}
console.log();

/* ------------------------------------------------- une saison complète, chronométrée */

import { classement, creerSaison, jouerJournee } from "../src/moteur/saison";

{
  const t0 = Date.now();
  const saison = creerSaison(monde, 42);
  while (!saison.terminee) jouerJournee(monde, saison, idx);
  const duree = Date.now() - t0;
  const matchs = saison.resultats.length;
  const nuls2 = saison.resultats.filter((r) => r.scoreDomicile === r.scoreExterieur).length;
  console.log(`=== Saison complète, trois divisions ===`);
  console.log(`${matchs} matchs simulés en ${(duree / 1000).toFixed(1)} s   (objectif : moins de 30 s)`);
  console.log(`matchs nuls : ${((nuls2 / matchs) * 100).toFixed(1)} %   (repère : 8–10 %)`);
  for (const division of monde.divisions) {
    const table = classement(monde, saison, division.id, idx);
    console.log(`\n${division.nom} — champion : ${table[0].nom} (${table[0].points} pts, ${table[0].butsPour}:${table[0].butsContre})`);
    console.log(
      table
        .slice(0, 4)
        .map((r, i) => `  ${i + 1}. ${r.nom.padEnd(22)} ${String(r.points).padStart(2)} pts   ${r.victoires}V ${r.nuls}N ${r.defaites}D`)
        .join("\n"),
    );
  }
  console.log();
}
