import { LIBELLES_ATTRIBUT, type CleAttribut } from "@/moteur/types";

/** Couleur d'un attribut sur 20 : le regard doit trier sans lire les chiffres. */
export function couleurNote(valeur: number): string {
  if (valeur >= 16) return "var(--bon)";
  if (valeur >= 13) return "var(--accent)";
  if (valeur >= 10) return "var(--texte-doux)";
  return "var(--mauvais)";
}

export function BarreAttribut({ cle, valeur }: { cle: CleAttribut; valeur: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 font-mono text-[11px] text-doux">{LIBELLES_ATTRIBUT[cle]}</span>
      <span className="h-[7px] flex-1 overflow-hidden rounded border border-bordure bg-surface-2">
        <span
          className="block h-full rounded-l"
          style={{ width: `${(valeur / 20) * 100}%`, background: couleurNote(valeur) }}
        />
      </span>
      <span className="w-5 shrink-0 text-right font-mono text-xs tabular-nums" style={{ color: couleurNote(valeur) }}>
        {valeur}
      </span>
    </div>
  );
}

/** Jauge 0–100 : condition, moral. */
export function Jauge({ libelle, valeur, inverse = false }: { libelle: string; valeur: number; inverse?: boolean }) {
  const bon = inverse ? valeur < 35 : valeur > 70;
  const moyen = inverse ? valeur < 65 : valeur > 45;
  const couleur = bon ? "var(--bon)" : moyen ? "var(--moyen)" : "var(--mauvais)";
  return (
    <div className="min-w-24">
      <div className="sous-titre mb-1">{libelle}</div>
      <div className="h-1.5 overflow-hidden rounded border border-bordure bg-surface-2">
        <div className="h-full" style={{ width: `${Math.max(2, valeur)}%`, background: couleur }} />
      </div>
    </div>
  );
}

export function EtiquetteForme({ forme }: { forme: ("V" | "N" | "D")[] }) {
  if (!forme.length) return <span className="font-mono text-[11px] text-doux">—</span>;
  return (
    <span className="flex gap-1">
      {forme.map((r, i) => (
        <span
          key={i}
          title={r === "V" ? "Victoire" : r === "N" ? "Nul" : "Défaite"}
          className="inline-flex h-4 w-4 items-center justify-center rounded font-mono text-[9px] font-semibold text-fond"
          style={{ background: r === "V" ? "var(--bon)" : r === "N" ? "var(--texte-doux)" : "var(--mauvais)" }}
        >
          {r}
        </span>
      ))}
    </span>
  );
}

export function minutes(secondes: number): string {
  return `${Math.round(secondes / 60)}′`;
}

export function horloge(secondes: number): string {
  const m = Math.floor(secondes / 60);
  const s = Math.floor(secondes % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
