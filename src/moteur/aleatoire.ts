/**
 * Générateur pseudo-aléatoire déterministe.
 *
 * Tout le hasard du jeu passe par ici : même graine + mêmes décisions =
 * même résultat, à la virgule près. C'est ce qui rend une sauvegarde
 * rejouable et le harnais de test reproductible.
 */
export type Aleatoire = {
  /** Flottant dans [0, 1). */
  reel(): number;
  /** Entier dans [min, max], bornes comprises. */
  entier(min: number, max: number): number;
  /** Flottant dans [min, max). */
  entre(min: number, max: number): number;
  /** Vrai avec la probabilité p. */
  chance(p: number): boolean;
  /** Tirage gaussien (moyenne, écart-type), borné à ±3 écarts-types. */
  gaussien(moyenne: number, ecartType: number): number;
  /** Un élément au hasard. */
  choix<T>(liste: readonly T[]): T;
  /** Un élément tiré selon des poids positifs. */
  choixPondere<T>(liste: readonly T[], poids: readonly number[]): T;
};

/** mulberry32 : rapide, correct statistiquement, tient dans dix lignes. */
export function creerAleatoire(graine: number): Aleatoire {
  let a = graine | 0;
  const reel = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const alea: Aleatoire = {
    reel,
    entier: (min, max) => min + Math.floor(reel() * (max - min + 1)),
    entre: (min, max) => min + reel() * (max - min),
    chance: (p) => reel() < p,
    gaussien(moyenne, ecartType) {
      // Box-Muller, tronqué pour éviter les valeurs absurdes.
      const u = Math.max(reel(), 1e-9);
      const v = reel();
      const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
      return moyenne + Math.max(-3, Math.min(3, z)) * ecartType;
    },
    choix: (liste) => liste[Math.floor(reel() * liste.length)],
    choixPondere(liste, poids) {
      let total = 0;
      for (const p of poids) total += p > 0 ? p : 0;
      if (total <= 0) return liste[liste.length - 1];
      let r = reel() * total;
      for (let i = 0; i < liste.length; i++) {
        r -= poids[i] > 0 ? poids[i] : 0;
        if (r <= 0) return liste[i];
      }
      return liste[liste.length - 1];
    },
  };
  return alea;
}

/** Mélange une copie de la liste, sans toucher à l'originale. */
export function melanger<T>(liste: readonly T[], alea: Aleatoire): T[] {
  const copie = liste.slice();
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(alea.reel() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

/** Combine plusieurs entiers en une graine stable (hachage FNV-1a). */
export function grainePour(...parties: (string | number)[]): number {
  let h = 0x811c9dc5;
  for (const partie of parties) {
    const s = String(partie);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
  }
  return h >>> 0;
}

export function borner(valeur: number, min: number, max: number): number {
  return valeur < min ? min : valeur > max ? max : valeur;
}
