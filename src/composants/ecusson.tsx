import type { Club } from "@/moteur/types";

/** Écusson généré : deux cercles et les initiales du club. */
export function Ecusson({ club, taille = 40 }: { club: Club; taille?: number }) {
  const lettres = club.abbr.slice(0, 3);
  return (
    <svg width={taille} height={taille} viewBox="0 0 60 60" role="img" aria-label={`Écusson ${club.nom}`}>
      <circle cx="30" cy="30" r="27" fill="var(--surface)" stroke={club.couleur} strokeWidth="3" />
      <circle cx="30" cy="30" r="19" fill={club.couleur} opacity="0.16" />
      <text
        x="30"
        y="37"
        textAnchor="middle"
        fontFamily="var(--font-titre)"
        fontWeight="700"
        fontSize={lettres.length > 2 ? 15 : 18}
        fill={club.couleur}
      >
        {lettres}
      </text>
    </svg>
  );
}
