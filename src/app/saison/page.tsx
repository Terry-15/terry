"use client";

import Link from "next/link";
import { useState } from "react";

import { Ecusson } from "@/composants/ecusson";
import { InviteNouvellePartie } from "@/composants/invite";
import { usePartie } from "@/jeu/etat";
import { dernierBilan, maLigne, monClassement, monClub, terminerLaSaison } from "@/jeu/partie";
import { palmares } from "@/moteur/evolution";
import { LIBELLES_POSTE, type BilanDivision } from "@/moteur/types";

export default function PageSaison() {
  const { partie, idx, version, agir } = usePartie();
  const [basculee, setBasculee] = useState(false);
  if (!partie || !idx) return <InviteNouvellePartie />;

  const club = monClub(partie, idx);
  const bilan = dernierBilan(partie);

  /* ------------------------------------------- saison en cours, pas de bilan */

  if (!partie.saison.terminee && !bilan) {
    return (
      <div className="carte text-center">
        <h1 className="titre-carte">Saison en cours</h1>
        <p className="mt-2 text-doux">
          Le bilan s&apos;affichera ici à l&apos;issue des {partie.saison.calendrier.length} journées.
        </p>
        <Link href="/match" className="bouton-principal mt-4">
          Retour au match
        </Link>
      </div>
    );
  }

  /* --------------------------------------------- fin de saison à confirmer */

  if (partie.saison.terminee && !basculee) {
    const table = monClassement(partie, idx);
    const ligne = maLigne(partie, idx);
    const objectif = ligne.rang <= partie.rangAttendu;
    return (
      <div className="space-y-5" key={version}>
        <section className="carte">
          <p className="sous-titre">Saison {partie.monde.saison}</p>
          <h1 className="mt-1 font-titre text-2xl font-bold">
            {table[0].nom} champion de {idx.divisionParId.get(club.divisionId)?.nom}
          </h1>
          <p className="mt-2 text-doux">
            {club.nom} termine {ligne.rang}
            <sup>e</sup> avec {ligne.points} points ({ligne.victoires}V {ligne.nuls}N {ligne.defaites}D,
            différence {ligne.difference > 0 ? "+" : ""}
            {ligne.difference}). Le conseil vous attendait {partie.rangAttendu}
            <sup>e</sup> — {objectif ? "objectif tenu" : "objectif manqué"}.
          </p>
        </section>

        <section className="carte">
          <h2 className="titre-carte">Classement final</h2>
          <p className="sous-titre mb-3">
            Les deux derniers descendent, les deux premiers de la division inférieure montent
          </p>
          <table className="tableau">
            <thead>
              <tr>
                <th></th>
                <th>Club</th>
                <th className="num">Pts</th>
                <th className="num">Diff</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {table.map((l) => (
                <tr key={l.clubId} className={l.clubId === club.id ? "bg-accent-doux font-semibold" : ""}>
                  <td className="font-mono text-[11px] text-doux">{l.rang}</td>
                  <td>{l.nom}</td>
                  <td className="num">{l.points}</td>
                  <td className="num">
                    {l.difference > 0 ? "+" : ""}
                    {l.difference}
                  </td>
                  <td className="text-right">
                    {l.rang <= 2 && club.divisionId !== "d1" ? <span className="puce text-bon">montée</span> : null}
                    {l.rang > table.length - 2 && club.divisionId !== "d3" ? (
                      <span className="puce text-mauvais">descente</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <button
          className="bouton-principal w-full"
          onClick={() => {
            agir((p) => {
              terminerLaSaison(p);
            });
            setBasculee(true);
          }}
        >
          Passer à la saison {partie.monde.saison + 1}
        </button>
      </div>
    );
  }

  /* ------------------------------------------------ bilan de l'intersaison */

  if (!bilan) return <InviteNouvellePartie />;
  const mouvement = bilan.mouvements.find((m) => m.clubId === club.id);
  const maDivision = bilan.divisions.find((d) => d.classement.some((l) => l.clubId === club.id));

  return (
    <div className="space-y-5" key={version}>
      <section className="carte flex flex-wrap items-center gap-5">
        <Ecusson club={club} taille={56} />
        <div className="flex-1">
          <p className="sous-titre">Intersaison {bilan.annee} → {bilan.annee + 1}</p>
          <h1 className="font-titre text-2xl font-bold">{club.nom}</h1>
          <p className="text-doux">
            {idx.divisionParId.get(club.divisionId)?.nom}
            {maDivision && maDivision.promus.includes(club.id) ? " · vous montez" : ""}
            {maDivision && maDivision.relegues.includes(club.id) ? " · vous descendez" : ""}
          </p>
        </div>
        <Link href="/club" className="bouton-principal">
          Commencer la saison
        </Link>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <div className="carte">
          <h2 className="titre-carte">Départs</h2>
          <p className="sous-titre mb-3">Fins de carrière</p>
          {mouvement?.retraites.length ? (
            <ul className="space-y-1 text-sm">
              {mouvement.retraites.map((r, i) => (
                <li key={i} className="flex justify-between gap-2 border-t border-bordure py-1 first:border-t-0">
                  <span>{r.nom}</span>
                  <span className="font-mono text-[11px] text-doux">
                    {LIBELLES_POSTE[r.poste]} · {r.age} ans
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-doux">Personne ne raccroche cette année.</p>
          )}
        </div>

        <div className="carte">
          <h2 className="titre-carte">Centre de formation</h2>
          <p className="sous-titre mb-3">Les jeunes qui montent</p>
          {mouvement?.eclosions.length ? (
            <ul className="space-y-1 text-sm">
              {mouvement.eclosions.map((e, i) => (
                <li key={i} className="flex justify-between gap-2 border-t border-bordure py-1 first:border-t-0">
                  <span>{e.nom}</span>
                  <span className="font-mono text-[11px] text-doux">
                    {e.age} ans · potentiel {e.potentiel.toFixed(1)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-doux">Aucune éclosion cette saison.</p>
          )}
          {mouvement?.arrivees.length ? (
            <>
              <p className="sous-titre mt-4 mb-2">Recrues</p>
              <ul className="space-y-1 text-sm">
                {mouvement.arrivees.map((a, i) => (
                  <li key={i} className="flex justify-between gap-2 border-t border-bordure py-1 first:border-t-0">
                    <span>{a.nom}</span>
                    <span className="font-mono text-[11px] text-doux">
                      {LIBELLES_POSTE[a.poste]} · {a.age} ans
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>

        <div className="carte">
          <h2 className="titre-carte">Progressions</h2>
          <p className="sous-titre mb-3">Le temps de jeu paie</p>
          {mouvement?.progressions.length ? (
            <ul className="space-y-1 text-sm">
              {mouvement.progressions.map((p, i) => (
                <li key={i} className="flex justify-between gap-2 border-t border-bordure py-1 first:border-t-0">
                  <span>{p.nom}</span>
                  <span
                    className="font-mono text-[11px]"
                    style={{ color: p.apres > p.avant ? "var(--bon)" : "var(--mauvais)" }}
                  >
                    {p.avant.toFixed(1)} → {p.apres.toFixed(1)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-doux">Aucun mouvement notable.</p>
          )}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="carte">
          <h2 className="titre-carte">Mouvements entre divisions</h2>
          <p className="sous-titre mb-3">Saison {bilan.annee}</p>
          {bilan.divisions.map((d) => (
            <BlocDivision key={d.divisionId} division={d} clubs={idx.clubParId} />
          ))}
        </div>

        <div className="carte">
          <h2 className="titre-carte">Palmarès</h2>
          <p className="sous-titre mb-3">Depuis le début de la partie</p>
          <table className="tableau">
            <thead>
              <tr>
                <th>Club</th>
                <th className="num">Titres</th>
                <th className="num">Montées</th>
                <th className="num">Descentes</th>
              </tr>
            </thead>
            <tbody>
              {palmares(partie.monde)
                .filter((l) => l.titres || l.montees || l.descentes)
                .slice(0, 10)
                .map((l) => (
                  <tr key={l.clubId} className={l.clubId === club.id ? "bg-accent-doux font-semibold" : ""}>
                    <td>{l.nom}</td>
                    <td className="num">{l.titres}</td>
                    <td className="num">{l.montees}</td>
                    <td className="num">{l.descentes}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function BlocDivision({ division, clubs }: { division: BilanDivision; clubs: Map<string, { nom: string }> }) {
  const nom = (id: string) => clubs.get(id)?.nom ?? id;
  return (
    <div className="border-t border-bordure py-2 first:border-t-0">
      <div className="sous-titre">{division.nom}</div>
      <p className="text-sm">
        Champion : <b>{division.classement[0] ? nom(division.classement[0].clubId) : "—"}</b>
        {division.meilleurButeur ? (
          <>
            {" "}
            · meilleur buteur {division.meilleurButeur.nom} ({division.meilleurButeur.buts})
          </>
        ) : null}
      </p>
      {division.promus.length ? (
        <p className="text-[13px] text-bon">Montent : {division.promus.map(nom).join(", ")}</p>
      ) : null}
      {division.relegues.length ? (
        <p className="text-[13px] text-mauvais">Descendent : {division.relegues.map(nom).join(", ")}</p>
      ) : null}
    </div>
  );
}
