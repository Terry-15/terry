import { creerMonde, disponibles, indexer } from "../src/moteur/monde";
import { simulerMatch } from "../src/moteur/match/moteur";
import type { SystemeDefensif } from "../src/moteur/types";

const monde = creerMonde(20260911);
const idx = indexer(monde);
const entree = (id: string, systeme: SystemeDefensif) => {
  const club = idx.clubParId.get(id)!;
  return { club, effectif: disponibles(idx.effectifParClub.get(id)!), tactique: { ...club.tactique, systeme } };
};

for (const systeme of ["6-0", "5-1", "3-2-1"] as SystemeDefensif[]) {
  const valeurs: number[] = [];
  let max = 0;
  for (let i = 0; i < 600; i++) {
    const f = simulerMatch(entree("d1-05", systeme), entree("d1-07", "5-1"), { graine: 900 + i });
    valeurs.push(f.statsDomicile.exclusions);
    max = Math.max(max, f.statsDomicile.exclusions);
  }
  const moy = valeurs.reduce((s, x) => s + x, 0) / valeurs.length;
  const p90 = valeurs.sort((a, b) => a - b)[Math.floor(valeurs.length * 0.9)];
  console.log(`${systeme.padEnd(6)} moyenne ${moy.toFixed(2)}   9e décile ${p90}   max ${max}`);
}
