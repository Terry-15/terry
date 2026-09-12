/**
 * Les trois nouveaux leviers de match doivent peser, sans qu'aucun ne domine :
 *   1. zone d'attaque × système défensif adverse ;
 *   2. engagement du bloc : ballons récupérés contre exclusions ;
 *   3. marquage individuel : rentable contre une attaque concentrée, coûteux
 *      contre une attaque répartie.
 *
 * Toutes les mesures sont appariées : même graine, même effectif, un seul
 * réglage change.
 */
import { observer } from "../src/jeu/observation";
import { simulerMatch, type EntreeEquipe } from "../src/moteur/match/moteur";
import { creerMonde, disponibles, indexer } from "../src/moteur/monde";
import type { AgressiviteDefensive, FocusOffensif, SystemeDefensif, Tactique } from "../src/moteur/types";

const N = Number(process.argv[2] ?? 800);
/** Section à mesurer : 1, 2, 3, ou rien pour les trois. */
const SECTION = process.argv[3] ? Number(process.argv[3]) : 0;
const faire = (n: number) => SECTION === 0 || SECTION === n;
const monde = creerMonde(20260911);
const idx = indexer(monde);
const d1 = monde.divisions[0].clubIds;

function entree(clubId: string, modif: Partial<Tactique> = {}): EntreeEquipe {
  const club = idx.clubParId.get(clubId)!;
  return {
    club,
    effectif: disponibles(idx.effectifParClub.get(clubId)!),
    tactique: { ...club.tactique, tempo: "equilibre", attaque: "equilibre", agressivite: "normale", marquage: null, ...modif },
  };
}

const ZONES: FocusOffensif[] = ["equilibre", "pivot", "distance", "ailes"];
const SYS: SystemeDefensif[] = ["6-0", "5-1", "3-2-1"];

/* ------------------------------------------- 1. zone d'attaque × défense */

if (faire(1)) {
console.log(`\n=== 1. buts marqués selon la zone d'attaque (${N} matchs par case) ===\n`);
// Trois profils d'attaque différents, pour vérifier que le bon choix dépend
// aussi de l'effectif et pas seulement du système d'en face.
const profils: [string, string][] = [
  ["gros arrières", d1.find((id) => idx.clubParId.get(id)!.style === "distance")!],
  ["jeu intérieur", d1.find((id) => idx.clubParId.get(id)!.style === "interieur")!],
  ["équilibré", d1.find((id) => idx.clubParId.get(id)!.style === "equilibre")!],
];
const adversaire = "d1-05";

let amplitudeTotale = 0;
const gagnantes = new Set<FocusOffensif>();
for (const [libelle, clubId] of profils) {
  console.log(`attaque : ${libelle} (${idx.clubParId.get(clubId)!.nom})`);
  console.log("  système adverse   " + ZONES.map((z) => z.padStart(11)).join(""));
  for (const systeme of SYS) {
    const buts = ZONES.map((zone) => {
      let total = 0;
      for (let i = 0; i < N; i++) {
        total += simulerMatch(entree(clubId, { attaque: zone }), entree(adversaire, { systeme }), {
          graine: 910000 + i,
          neutre: true,
        }).scoreDomicile;
      }
      return total / N;
    });
    const meilleure = ZONES[buts.indexOf(Math.max(...buts))];
    gagnantes.add(meilleure);
    amplitudeTotale += Math.max(...buts) - Math.min(...buts);
    console.log(
      `  ${systeme.padEnd(17)}` + buts.map((b) => b.toFixed(2).padStart(11)).join("") + `   → ${meilleure}`,
    );
  }
  console.log("");
}
console.log(`zones optimales rencontrées : ${[...gagnantes].join(", ")}`);
console.log(`amplitude cumulée : ${amplitudeTotale.toFixed(2)} but(s) sur 9 contextes`);

}

if (faire(2)) {
/* ------------------------------------------------- 2. engagement du bloc */

console.log(`\n=== 2. engagement du bloc (${N} matchs par case) ===\n`);
const ENG: AgressiviteDefensive[] = ["prudente", "normale", "engagee"];
// Le réglage doit dépendre de l'adversaire : on classe les clubs par maîtrise
// du ballon (passe et vision), et on joue contre les deux extrêmes.
const maitrise = (clubId: string) => {
  const champ = (idx.effectifParClub.get(clubId) ?? []).filter((j) => j.poste !== "GB");
  return champ.reduce((s, j) => s + (j.attributs.passe + j.attributs.vision) / 2, 0) / Math.max(1, champ.length);
};
const parMaitrise = d1.filter((id) => id !== "d1-05").sort((a, b) => maitrise(a) - maitrise(b));
const advEng: [string, string][] = [
  ["ballon fragile", parMaitrise[0]],
  ["collectif propre", parMaitrise[parMaitrise.length - 1]],
];

for (const [libelle, clubId] of advEng) {
  console.log(`adversaire : ${libelle} (${idx.clubParId.get(clubId)!.nom}, maîtrise ${maitrise(clubId).toFixed(1)})`);
  console.log("  réglage      écart de buts  encaissés  récupérés  exclusions  7 m concédés");
  for (const agressivite of ENG) {
    let ecart = 0;
    let encaisses = 0;
    let recuperes = 0;
    let exclusions = 0;
    let sept = 0;
    for (let i = 0; i < N; i++) {
      const f = simulerMatch(entree("d1-05", { agressivite }), entree(clubId), { graine: 920000 + i, neutre: true });
      ecart += f.scoreDomicile - f.scoreExterieur;
      encaisses += f.scoreExterieur;
      recuperes += f.statsDomicile.pertesProvoquees;
      exclusions += f.statsDomicile.exclusions;
      sept += f.statsExterieur.septMetresTires;
    }
    console.log(
      `  ${agressivite.padEnd(12)}` +
        [ecart / N, encaisses / N, recuperes / N, exclusions / N, sept / N]
          .map((x, k) => x.toFixed(2).padStart([14, 11, 11, 12, 14][k]))
          .join(""),
    );
  }
  console.log("");
}

}

if (faire(3)) {
/* ----------------------------------------------- 3. marquage individuel */

console.log(`\n=== 3. marquage individuel (${N} matchs par cas) ===\n`);
// Le choix n'est pas « marquer ou non » : c'est « marquer qui ». Coller un
// défenseur au bon homme doit rapporter, se tromper d'homme doit coûter.
const cibles = d1
  .filter((id) => id !== "d1-05")
  .map((id) => ({ id, rapport: observer(monde, idx, id) }))
  .sort((a, b) => b.rapport.gainMarquage - a.rapport.gainMarquage);
const advMarquage = [cibles[0], cibles[Math.floor(cibles.length / 2)], cibles[cibles.length - 1]];

console.log("adversaire              gain attendu   part   aucun marquage   sur la cible   sur un comparse");
for (const { id, rapport } of advMarquage) {
  const sept = idx.clubParId.get(id)!.tactique.sept;
  const champ = Object.entries(sept)
    .filter(([poste]) => poste !== "GB")
    .map(([, jid]) => idx.joueurParId.get(jid)!)
    .filter(Boolean);
  // Faute de cible recommandée, on marque quand même le plus gros volume,
  // pour mesurer ce que coûte une individuelle mal choisie.
  const star = rapport.cibleMarquage ?? champ.slice().sort((a, b) => b.attributs.tir - a.attributs.tir)[0];
  const comparse = champ.filter((j) => j.id !== star.id).sort((a, b) => a.attributs.tir - b.attributs.tir)[0];

  const mesure = (marquage: string | null) => {
    let encaisses = 0;
    for (let i = 0; i < N; i++) {
      encaisses += simulerMatch(entree(id), entree("d1-05", { marquage }), { graine: 930000 + i, neutre: true }).scoreDomicile;
    }
    return encaisses / N;
  };
  console.log(
    `${idx.clubParId.get(id)!.nom.padEnd(22)}${rapport.gainMarquage.toFixed(2).padStart(13)}` +
      `${(rapport.partCible * 100).toFixed(0).padStart(6)} %` +
      [mesure(null), mesure(star.id), mesure(comparse.id)].map((x) => x.toFixed(2).padStart(16)).join("") +
      (rapport.cibleMarquage ? "" : "   (aucune cible conseillée)"),
  );
}
console.log("");
}
