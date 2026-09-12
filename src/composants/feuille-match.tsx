import type { FeuilleMatch } from "@/moteur/types";

/** La feuille de match d'après rencontre : score, statistiques comparées, joueurs. */
export function FeuilleDeMatch({
  feuille,
  domicile,
  journee,
  nomDomicile,
  nomExterieur,
  autresResultats,
  nomJoueur,
  posteJoueur,
  onContinuer,
}: {
  feuille: FeuilleMatch;
  domicile: boolean;
  journee: number;
  nomDomicile: string;
  nomExterieur: string;
  autresResultats: { texte: string; score: string }[];
  nomJoueur: (id: string) => string;
  posteJoueur: (id: string) => string;
  onContinuer: () => void;
}) {
  const mesStats = domicile ? feuille.statsDomicile : feuille.statsExterieur;
  const leursStats = domicile ? feuille.statsExterieur : feuille.statsDomicile;
  const mesJoueurs = domicile ? feuille.joueursDomicile : feuille.joueursExterieur;
  const monScore = domicile ? feuille.scoreDomicile : feuille.scoreExterieur;
  const leurScore = domicile ? feuille.scoreExterieur : feuille.scoreDomicile;
  const verdict = monScore > leurScore ? "Victoire" : monScore < leurScore ? "Défaite" : "Match nul";
  const couleurVerdict = monScore > leurScore ? "text-bon" : monScore < leurScore ? "text-mauvais" : "text-doux";

  return (
    <div className="space-y-5">
      <section className="carte">
        <div className="flex items-baseline justify-between">
          <h1 className="titre-carte">Journée {journee + 1} — résultat</h1>
          <span className="sous-titre">
            mi-temps {feuille.miTempsDomicile} : {feuille.miTempsExterieur}
          </span>
        </div>

        <div className="my-5 flex items-center justify-center gap-6">
          <span className="w-36 text-right font-mono text-[12px] text-doux uppercase">{nomDomicile}</span>
          <span className="font-titre text-5xl font-bold tabular-nums">{feuille.scoreDomicile}</span>
          <span className="text-2xl text-doux">:</span>
          <span className="font-titre text-5xl font-bold tabular-nums">{feuille.scoreExterieur}</span>
          <span className="w-36 font-mono text-[12px] text-doux uppercase">{nomExterieur}</span>
        </div>
        <p className={`text-center font-titre text-lg font-bold uppercase ${couleurVerdict}`}>{verdict}</p>

        <div className="mt-5 max-h-[300px] overflow-y-auto rounded-lg border border-bordure">
          {feuille.evenements.map((e, i) => (
            <div key={i} className="flex gap-3 border-b border-bordure px-3 py-1.5 text-[13px] last:border-b-0">
              <span className="w-8 shrink-0 font-mono text-[11px] tabular-nums text-doux">
                {Math.floor(e.seconde / 60)}′
              </span>
              <span
                className={
                  e.type === "but"
                    ? (e.camp === "domicile") === domicile
                      ? "text-accent font-semibold"
                      : "text-accent-2 font-semibold"
                    : e.type === "exclusion"
                      ? "text-mauvais"
                      : e.type === "arret"
                        ? "text-bon"
                        : "text-doux"
                }
              >
                {e.texte}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="carte">
        <h2 className="titre-carte">Statistiques</h2>
        <p className="sous-titre mb-3">Vous contre l&apos;adversaire</p>
        <div className="space-y-1 text-sm">
          <Comparaison libelle="Tirs" a={mesStats.tirs} b={leursStats.tirs} />
          <Comparaison
            libelle="Réussite"
            a={Math.round((mesStats.buts / Math.max(1, mesStats.tirs)) * 100)}
            b={Math.round((leursStats.buts / Math.max(1, leursStats.tirs)) * 100)}
            suffixe=" %"
          />
          <Comparaison libelle="Arrêts du gardien" a={mesStats.arrets} b={leursStats.arrets} />
          <Comparaison libelle="Jets de 7 m marqués" a={mesStats.septMetresMarques} b={leursStats.septMetresMarques} />
          <Comparaison libelle="Pertes de balle" a={mesStats.pertes} b={leursStats.pertes} />
          <Comparaison libelle="Pertes provoquées" a={mesStats.pertesProvoquees} b={leursStats.pertesProvoquees} />
          <Comparaison libelle="Contres" a={mesStats.contres} b={leursStats.contres} />
          <Comparaison libelle="Contre-attaques" a={mesStats.contreAttaques} b={leursStats.contreAttaques} />
          <Comparaison libelle="Exclusions 2 min" a={mesStats.exclusions} b={leursStats.exclusions} />
          <Comparaison libelle="Possessions" a={mesStats.possessions} b={leursStats.possessions} />
        </div>
      </section>

      <section className="carte">
        <h2 className="titre-carte">Vos joueurs</h2>
        <p className="sous-titre mb-3">
          Temps de jeu, statistiques, et la note de match qui en découle — c&apos;est elle qui nourrira leur
          progression en fin de saison
        </p>
        <div className="overflow-x-auto">
          <table className="tableau min-w-[560px]">
            <thead>
              <tr>
                <th>Joueur</th>
                <th>Poste</th>
                <th className="num">Min</th>
                <th className="num">Buts</th>
                <th className="num">Tirs</th>
                <th className="num">Arrêts</th>
                <th className="num">Pertes</th>
                <th className="num">2 min</th>
                <th className="num">Note</th>
              </tr>
            </thead>
            <tbody>
              {[...mesJoueurs]
                .sort((a, b) => b.secondes - a.secondes)
                .map((l) => (
                  <tr key={l.joueurId}>
                    <td className="whitespace-nowrap">{nomJoueur(l.joueurId)}</td>
                    <td className="whitespace-nowrap text-doux">{posteJoueur(l.joueurId)}</td>
                    <td className="num">{Math.round(l.secondes / 60)}</td>
                    <td className="num font-semibold">{l.buts}</td>
                    <td className="num">{l.tirs}</td>
                    <td className="num">{l.arrets || ""}</td>
                    <td className="num">{l.pertes}</td>
                    <td className="num">{l.exclusions || ""}</td>
                    <td
                      className={`num font-semibold ${
                        l.note >= 7 ? "text-bon" : l.note > 0 && l.note < 5 ? "text-mauvais" : ""
                      }`}
                    >
                      {l.secondes > 0 ? l.note.toFixed(1) : "—"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      {autresResultats.length ? (
        <section className="carte">
          <h2 className="titre-carte">Autres résultats</h2>
          <p className="sous-titre mb-3">Même journée, même moteur</p>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {autresResultats.map((r, i) => (
              <li
                key={i}
                className="flex justify-between gap-2 rounded-lg border border-bordure bg-surface-2 px-3 py-2 font-mono text-[12px]"
              >
                <span>{r.texte}</span>
                <span className="tabular-nums">{r.score}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <button className="bouton-principal w-full" onClick={onContinuer}>
        Continuer
      </button>
    </div>
  );
}

function Comparaison({ libelle, a, b, suffixe = "" }: { libelle: string; a: number; b: number; suffixe?: string }) {
  const total = Math.max(1, a + b);
  return (
    <div className="flex items-center gap-3 border-t border-bordure py-1.5 first:border-t-0">
      <span className="w-12 text-right font-mono tabular-nums">
        {a}
        {suffixe}
      </span>
      <span className="flex h-1.5 flex-1 overflow-hidden rounded bg-surface-2">
        <span className="h-full" style={{ width: `${(a / total) * 100}%`, background: "var(--accent)" }} />
        <span className="h-full" style={{ width: `${(b / total) * 100}%`, background: "var(--accent-2)" }} />
      </span>
      <span className="w-12 font-mono tabular-nums">
        {b}
        {suffixe}
      </span>
      <span className="sous-titre w-40 text-right">{libelle}</span>
    </div>
  );
}
