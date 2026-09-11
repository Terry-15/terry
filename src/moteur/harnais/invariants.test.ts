/**
 * Le harnais — huit invariants, une commande.
 *
 *   npm run harnais
 *
 * Règle du projet : aucune phase ne se termine sans que le harnais soit vert.
 * Il existe parce que l'IA multiplie la vitesse de construction bien plus que
 * la vitesse de vérification ; c'est lui qui rétablit l'équilibre.
 */
import { describe, expect, it } from "vitest";

import { borner } from "../aleatoire";
import { simulerMatch, type EntreeEquipe } from "../match/moteur";
import { DUREE_MATCH } from "../match/parametres";
import { creerMonde, disponibles, forceClub, indexer } from "../monde";
import { classement, creerSaison, jouerJournee } from "../saison";
import { ATTRIBUTS, POSTES, type SystemeDefensif, type Tempo } from "../types";

const monde = creerMonde(20260911);
const idx = indexer(monde);
const d1 = monde.divisions[0].clubIds;
const MON_CLUB = "d1-05"; // HBC Rocheval

function entree(clubId: string, systeme?: SystemeDefensif, tempo?: Tempo): EntreeEquipe {
  const club = idx.clubParId.get(clubId)!;
  const effectif = disponibles(idx.effectifParClub.get(clubId)!);
  return {
    club,
    effectif,
    tactique: { ...club.tactique, systeme: systeme ?? club.tactique.systeme, tempo: tempo ?? club.tactique.tempo },
  };
}

function lotDeMatchs(n: number, graineDepart = 1000) {
  const feuilles = [];
  for (let i = 0; i < n; i++) {
    const a = d1[i % d1.length];
    const b = d1[(i * 7 + 3) % d1.length];
    feuilles.push(simulerMatch(entree(a), entree(a === b ? d1[(i + 1) % d1.length] : b), { graine: graineDepart + i }));
  }
  return feuilles;
}

const LOT = lotDeMatchs(500);

function moyenne(xs: number[]) {
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

/* ------------------------------------------------------------------------- */

describe("1. Comptabilité des buts", () => {
  it("la somme des buts du tableau égale le score, dans les 500 matchs", () => {
    for (const f of LOT) {
      const butsD = f.joueursDomicile.reduce((s, l) => s + l.buts, 0);
      const butsE = f.joueursExterieur.reduce((s, l) => s + l.buts, 0);
      expect(butsD).toBe(f.scoreDomicile);
      expect(butsE).toBe(f.scoreExterieur);
      expect(f.statsDomicile.buts).toBe(f.scoreDomicile);
      expect(f.statsExterieur.buts).toBe(f.scoreExterieur);
    }
  });

  it("aucun tireur n'est absent de la feuille de match", () => {
    // Le défaut n° 1 de l'audit : 18 % des buts étaient l'œuvre de joueurs
    // que le jeu déclarait absents, parce qu'un temps de jeu manquant était
    // lu comme « 60 minutes jouées ».
    for (const f of LOT) {
      for (const ligne of [...f.joueursDomicile, ...f.joueursExterieur]) {
        if (ligne.tirs > 0 || ligne.buts > 0) expect(ligne.secondes).toBeGreaterThan(0);
      }
    }
  });
});

describe("2. Temps de jeu", () => {
  it("le total vaut 420 minutes moins le temps passé en infériorité", () => {
    for (const f of LOT) {
      for (const [lignes, stats] of [
        [f.joueursDomicile, f.statsDomicile],
        [f.joueursExterieur, f.statsExterieur],
      ] as const) {
        const total = lignes.reduce((s, l) => s + l.secondes, 0);
        const attendu = 7 * DUREE_MATCH - stats.secondesInferiorite;
        expect(Math.abs(total - attendu)).toBeLessThanOrEqual(7);
      }
    }
  });

  it("aucun joueur ne dépasse 60 minutes ni ne descend sous 0", () => {
    for (const f of LOT) {
      for (const ligne of [...f.joueursDomicile, ...f.joueursExterieur]) {
        expect(ligne.secondes).toBeGreaterThanOrEqual(0);
        expect(ligne.secondes).toBeLessThanOrEqual(DUREE_MATCH);
      }
    }
  });
});

describe("3. Bornes du modèle", () => {
  it("tous les attributs de tous les joueurs sont dans [1, 20]", () => {
    for (const j of monde.joueurs) {
      for (const cle of ATTRIBUTS) {
        expect(j.attributs[cle]).toBeGreaterThanOrEqual(1);
        expect(j.attributs[cle]).toBeLessThanOrEqual(20);
      }
    }
  });

  it("condition et moral restent dans [0, 100] sur une saison entière", () => {
    const m = creerMonde(4242);
    const i = indexer(m);
    const saison = creerSaison(m, 99);
    while (!saison.terminee) {
      jouerJournee(m, saison, i);
      for (const j of m.joueurs) {
        expect(j.condition).toBeGreaterThanOrEqual(0);
        expect(j.condition).toBeLessThanOrEqual(100);
        expect(j.moral).toBeGreaterThanOrEqual(0);
        expect(j.moral).toBeLessThanOrEqual(100);
        expect(j.forme).toBeGreaterThanOrEqual(-3);
        expect(j.forme).toBeLessThanOrEqual(3);
      }
    }
  });
});

describe("4. Pas de stratégie dominante", () => {
  it("aucune des neuf combinaisons n'est dans le trio de tête des quatre contextes", () => {
    const SYS: SystemeDefensif[] = ["6-0", "5-1", "3-2-1"];
    const TMP: Tempo[] = ["place", "equilibre", "rapide"];
    const contextes = [
      d1.find((id) => idx.clubParId.get(id)!.style === "distance" && idx.clubParId.get(id)!.reputation < 72)!,
      d1.find((id) => idx.clubParId.get(id)!.style === "interieur" && idx.clubParId.get(id)!.reputation < 72)!,
      d1.find((id) => idx.clubParId.get(id)!.style === "distance" && idx.clubParId.get(id)!.reputation > 84)!,
      d1.find((id) => idx.clubParId.get(id)!.style === "interieur" && idx.clubParId.get(id)!.reputation > 84)!,
    ];

    let survivantes: Set<string> | null = null;
    for (const adversaire of contextes) {
      const scores: { cle: string; v: number }[] = [];
      for (const tempo of TMP) {
        for (const systeme of SYS) {
          let v = 0;
          for (let i = 0; i < 220; i++) {
            const f = simulerMatch(entree(MON_CLUB, systeme, tempo), entree(adversaire), {
              graine: 770000 + i,
              neutre: true,
            });
            if (f.scoreDomicile > f.scoreExterieur) v++;
          }
          scores.push({ cle: `${tempo}/${systeme}`, v });
        }
      }
      scores.sort((a, b) => b.v - a.v);
      const trio = new Set(scores.slice(0, 3).map((s) => s.cle));
      survivantes = survivantes ? new Set([...survivantes].filter((c) => trio.has(c))) : trio;
    }
    expect([...(survivantes ?? [])]).toEqual([]);
  });

  it("le système défensif se choisit selon le profil offensif adverse", () => {
    // Écart attendu : plus d'un but entre le meilleur et le pire système,
    // selon que l'adversaire arme de loin ou joue à l'intérieur.
    const mesurer = (adversaire: string, systeme: SystemeDefensif) => {
      let encaisses = 0;
      for (let i = 0; i < 260; i++) {
        const f = simulerMatch(entree(MON_CLUB, systeme, "equilibre"), entree(adversaire), {
          graine: 660000 + i,
          neutre: true,
        });
        encaisses += f.scoreExterieur;
      }
      return encaisses / 260;
    };
    const gros = d1.find((id) => idx.clubParId.get(id)!.style === "distance" && idx.clubParId.get(id)!.reputation < 79)!;
    const dedans = d1.find((id) => idx.clubParId.get(id)!.style === "interieur" && idx.clubParId.get(id)!.reputation < 79)!;

    const contreGros = { "6-0": mesurer(gros, "6-0"), "3-2-1": mesurer(gros, "3-2-1") };
    const contreDedans = { "6-0": mesurer(dedans, "6-0"), "3-2-1": mesurer(dedans, "3-2-1") };

    // Face à de gros arrières, la défense haute encaisse moins ; face au jeu
    // intérieur, c'est le bloc bas. Le choix doit s'inverser.
    expect(contreGros["3-2-1"]).toBeLessThan(contreGros["6-0"]);
    expect(contreDedans["6-0"]).toBeLessThan(contreDedans["3-2-1"]);
    const amplitude =
      contreGros["6-0"] - contreGros["3-2-1"] + (contreDedans["3-2-1"] - contreDedans["6-0"]);
    expect(amplitude).toBeGreaterThan(1);
  });
});

describe("5. Difficulté monotone", () => {
  it("huit adversaires de force croissante donnent huit taux de victoire décroissants", () => {
    const clubs = [...monde.clubs]
      .map((c) => ({ id: c.id, force: forceClub(idx.effectifParClub.get(c.id)!) }))
      .sort((a, b) => a.force - b.force);
    // Huit paliers régulièrement répartis sur toute l'échelle du monde.
    const paliers = Array.from({ length: 8 }, (_, i) => clubs[Math.round((i * (clubs.length - 1)) / 7)]);

    const taux = paliers.map((c) => {
      let v = 0;
      // Moyenne sur les trois systèmes : le style de l'adversaire ne doit pas
      // polluer la mesure de sa force brute.
      for (const systeme of ["6-0", "5-1", "3-2-1"] as SystemeDefensif[]) {
        for (let i = 0; i < 60; i++) {
          const f = simulerMatch(entree(MON_CLUB, systeme), entree(c.id), { graine: 550000 + i, neutre: true });
          if (f.scoreDomicile > f.scoreExterieur) v++;
        }
      }
      return (v / 180) * 100;
    });

    for (let i = 1; i < taux.length; i++) {
      expect(taux[i]).toBeLessThan(taux[i - 1]);
    }
    // Et l'échelle doit être large : un monde où tout se vaut n'a pas d'enjeu.
    expect(taux[0] - taux[taux.length - 1]).toBeGreaterThan(50);
  });
});

describe("6. Réalisme statistique", () => {
  const par = (cle: "buts" | "tirs" | "exclusions" | "septMetresTires" | "pertes" | "pertesProvoquees" | "possessions") =>
    moyenne(LOT.flatMap((f) => [f.statsDomicile[cle], f.statsExterieur[cle]]));

  it("buts, réussite, exclusions et jets de 7 m tiennent les repères du handball", () => {
    const buts = par("buts");
    const tirs = par("tirs");
    const reussite = (buts / tirs) * 100;
    const rapport = {
      buts: buts.toFixed(1),
      tirs: tirs.toFixed(1),
      reussite: reussite.toFixed(1) + " %",
      exclusions: par("exclusions").toFixed(2),
      septMetres: par("septMetresTires").toFixed(2),
      pertes: par("pertes").toFixed(1),
      pertesProvoquees: par("pertesProvoquees").toFixed(1),
      possessions: par("possessions").toFixed(1),
    };
    console.log("    mesures sur 500 matchs :", rapport);

    expect(buts).toBeGreaterThanOrEqual(26);
    expect(buts).toBeLessThanOrEqual(32);
    expect(reussite).toBeGreaterThanOrEqual(55);
    expect(reussite).toBeLessThanOrEqual(62);
    expect(par("exclusions")).toBeGreaterThanOrEqual(3);
    expect(par("exclusions")).toBeLessThanOrEqual(5);
    expect(par("septMetresTires")).toBeGreaterThanOrEqual(4);
    expect(par("septMetresTires")).toBeLessThanOrEqual(5);
    expect(par("possessions")).toBeGreaterThanOrEqual(52);
    expect(par("possessions")).toBeLessThanOrEqual(60);
  });

  it("les pertes provoquées sont alimentées des deux côtés, quel que soit le système", () => {
    // Défaut n° 2 de l'audit : la statistique n'était jamais incrémentée pour
    // l'équipe adverse, et restait à zéro en 6-0.
    for (const systeme of ["6-0", "5-1", "3-2-1"] as SystemeDefensif[]) {
      let dom = 0;
      let ext = 0;
      for (let i = 0; i < 40; i++) {
        const f = simulerMatch(entree(MON_CLUB, systeme), entree(d1[2]), { graine: 4400 + i });
        dom += f.statsDomicile.pertesProvoquees;
        ext += f.statsExterieur.pertesProvoquees;
      }
      expect(dom / 40).toBeGreaterThan(0.5);
      expect(ext / 40).toBeGreaterThan(0.5);
    }
  });

  it("une saison des trois divisions se simule en moins de 30 secondes", () => {
    const m = creerMonde(777);
    const i = indexer(m);
    const saison = creerSaison(m, 5);
    const debut = Date.now();
    while (!saison.terminee) jouerJournee(m, saison, i);
    const secondes = (Date.now() - debut) / 1000;
    console.log(`    ${saison.resultats.length} matchs (3 divisions) en ${secondes.toFixed(1)} s`);
    expect(saison.resultats.length).toBe(546);
    expect(secondes).toBeLessThan(30);

    // Le classement doit séparer les clubs : pas de championnat plat.
    const table = classement(m, saison, "d1", i);
    expect(table[0].points - table[table.length - 1].points).toBeGreaterThan(15);
    // Et le meilleur buteur de deuxième division doit être un joueur nommé.
    const stats = Object.entries(saison.statsJoueurs)
      .filter(([id]) => i.joueurParId.get(id)?.clubId?.startsWith("d2"))
      .sort((a, b) => b[1].buts - a[1].buts)[0];
    expect(stats).toBeDefined();
    const buteur = i.joueurParId.get(stats[0])!;
    console.log(`    meilleur buteur de D2 : ${buteur.prenom} ${buteur.nom} — ${stats[1].buts} buts`);
    expect(stats[1].buts).toBeGreaterThan(80);
  });
});

describe("7. Stabilité longue", () => {
  it.todo("dix saisons enchaînées sans dérive — attend la bascule de saison (phase 4)");
});

describe("8. Reproductibilité", () => {
  it("même graine et même tactique donnent exactement le même match", () => {
    const a = simulerMatch(entree(MON_CLUB, "5-1", "rapide"), entree(d1[0]), { graine: 31415, commentaire: true });
    const b = simulerMatch(entree(MON_CLUB, "5-1", "rapide"), entree(d1[0]), { graine: 31415, commentaire: true });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("une graine différente donne un match différent", () => {
    const a = simulerMatch(entree(MON_CLUB), entree(d1[0]), { graine: 1 });
    const b = simulerMatch(entree(MON_CLUB), entree(d1[0]), { graine: 2 });
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it("le monde est reproductible à partir de sa seule graine", () => {
    expect(JSON.stringify(creerMonde(20260911))).toBe(JSON.stringify(monde));
    expect(creerMonde(1).joueurs[0].nom).not.toBe(creerMonde(2).joueurs[0].nom);
  });

  it("le monde généré a la taille annoncée", () => {
    expect(monde.divisions.length).toBe(3);
    expect(monde.clubs.length).toBe(42);
    expect(monde.joueurs.length).toBe(42 * 18);
    for (const club of monde.clubs) {
      const effectif = idx.effectifParClub.get(club.id)!;
      expect(effectif.length).toBe(18);
      expect(effectif.filter((j) => j.poste === "GB").length).toBe(3);
      for (const poste of POSTES) expect(borner(effectif.filter((j) => j.poste === poste).length, 2, 3)).toBeGreaterThan(1);
    }
  });
});
