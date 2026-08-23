import { couleurFamille, FAMILLES_5M, libelleFamille5M } from "@/lib/labels";
import type { Famille5M, IshikawaCause } from "@/lib/types";

/**
 * Diagramme d'Ishikawa (arêtes de poisson) sur les 6M.
 * Les causes marquées « racine » sont mises en évidence.
 */
export function DiagrammeIshikawa({
  causes,
  probleme,
}: {
  causes: IshikawaCause[];
  probleme: string;
}) {
  const L = 1080;
  const H = 480;
  const spineY = 240;
  const spineDebut = 30;
  const spineFin = 880;

  const basesHaut = [210, 460, 710];
  const basesBas = [210, 460, 710];
  const famillesHaut = FAMILLES_5M.slice(0, 3);
  const famillesBas = FAMILLES_5M.slice(3);

  const parFamille = (f: Famille5M) => causes.filter((c) => c.famille === f);
  const tronquer = (t: string, n = 34) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);

  const bone = (
    famille: Famille5M,
    base: number,
    versLeHaut: boolean,
    index: number,
  ) => {
    const tipX = base - 100;
    const tipY = versLeHaut ? 62 : H - 62;
    const liste = parFamille(famille);
    const visibles = liste.slice(0, 4);
    const couleur = couleurFamille[famille];

    return (
      <g key={`${famille}-${index}`}>
        <line
          x1={base}
          y1={spineY}
          x2={tipX}
          y2={tipY}
          stroke={couleur}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <rect
          x={tipX - 58}
          y={versLeHaut ? tipY - 30 : tipY + 6}
          width={124}
          height={24}
          rx={12}
          fill={couleur}
        />
        <text
          x={tipX + 4}
          y={versLeHaut ? tipY - 13 : tipY + 23}
          textAnchor="middle"
          className="fill-white text-[11px] font-semibold"
        >
          {libelleFamille5M[famille]}
        </text>

        {visibles.map((c, i) => {
          const t = 0.3 + i * 0.17;
          const px = base + (tipX - base) * t;
          const py = spineY + (tipY - spineY) * t;
          return (
            <g key={c.id}>
              <line
                x1={px}
                y1={py}
                x2={px + 18}
                y2={py}
                stroke={couleur}
                strokeWidth={1.5}
                opacity={0.7}
              />
              {c.est_racine ? (
                <circle cx={px + 22} cy={py} r={3.5} fill="#dc2626" />
              ) : null}
              <text
                x={px + (c.est_racine ? 30 : 24)}
                y={py + 3.5}
                className={
                  c.est_racine
                    ? "fill-red-600 text-[10px] font-semibold dark:fill-red-400"
                    : "fill-zinc-600 text-[10px] dark:fill-zinc-300"
                }
              >
                {tronquer(c.libelle)}
              </text>
            </g>
          );
        })}

        {liste.length > visibles.length ? (
          <text
            x={base - 40}
            y={versLeHaut ? spineY - 14 : spineY + 20}
            className="fill-zinc-400 text-[10px] italic"
          >
            +{liste.length - visibles.length} autre(s)
          </text>
        ) : null}
      </g>
    );
  };

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${L} ${H}`}
        className="h-auto w-full min-w-[900px]"
        role="img"
        aria-label={`Diagramme d'Ishikawa : ${probleme}`}
      >
        {/* Arête centrale */}
        <line
          x1={spineDebut}
          y1={spineY}
          x2={spineFin}
          y2={spineY}
          className="stroke-zinc-400 dark:stroke-zinc-500"
          strokeWidth={3}
        />
        <polygon
          points={`${spineFin},${spineY - 8} ${spineFin + 16},${spineY} ${spineFin},${spineY + 8}`}
          className="fill-zinc-400 dark:fill-zinc-500"
        />

        {/* Tête : énoncé du problème */}
        <rect
          x={spineFin + 20}
          y={spineY - 46}
          width={150}
          height={92}
          rx={10}
          className="fill-red-50 stroke-red-300 dark:fill-red-500/10 dark:stroke-red-400/40"
          strokeWidth={1.5}
        />
        <text
          x={spineFin + 95}
          y={spineY - 26}
          textAnchor="middle"
          className="fill-red-700 text-[11px] font-semibold dark:fill-red-300"
        >
          Problème
        </text>
        {decouper(probleme, 22, 4).map((ligne, i) => (
          <text
            key={i}
            x={spineFin + 95}
            y={spineY - 8 + i * 14}
            textAnchor="middle"
            className="fill-red-700 text-[10px] dark:fill-red-300"
          >
            {ligne}
          </text>
        ))}

        {famillesHaut.map((f, i) => bone(f, basesHaut[i], true, i))}
        {famillesBas.map((f, i) => bone(f, basesBas[i], false, i))}
      </svg>

      <p className="mt-2 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full bg-red-600" />
        Cause identifiée comme racine
      </p>
    </div>
  );
}

/** Découpe un texte en lignes de `largeur` caractères maximum. */
function decouper(texte: string, largeur: number, maxLignes: number): string[] {
  const mots = texte.split(/\s+/);
  const lignes: string[] = [];
  let courante = "";

  for (const mot of mots) {
    if ((courante + " " + mot).trim().length > largeur) {
      if (courante) lignes.push(courante.trim());
      courante = mot;
      if (lignes.length === maxLignes) break;
    } else {
      courante = `${courante} ${mot}`.trim();
    }
  }
  if (courante && lignes.length < maxLignes) lignes.push(courante.trim());

  if (lignes.length === maxLignes && texte.length > lignes.join(" ").length) {
    lignes[maxLignes - 1] = `${lignes[maxLignes - 1].slice(0, largeur - 1)}…`;
  }
  return lignes;
}
