"use client";

import { InviteNouvellePartie } from "@/composants/invite";
import { usePartie } from "@/jeu/etat";
import { monClub } from "@/jeu/partie";

export default function PageCalendrier() {
  const { partie, idx, version } = usePartie();
  if (!partie || !idx) return <InviteNouvellePartie />;

  const club = monClub(partie, idx);
  const resultats = new Map(
    partie.saison.resultats.map((r) => [`${r.journee}|${r.domicileId}|${r.exterieurId}`, r]),
  );

  return (
    <div className="space-y-5" key={version}>
      <section className="carte">
        <h1 className="titre-carte">Calendrier</h1>
        <p className="sous-titre">
          {idx.divisionParId.get(club.divisionId)?.nom} · {partie.saison.calendrier.length} journées
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {partie.saison.calendrier.map((journee, numero) => {
          const rencontres = journee.filter((r) => r.divisionId === club.divisionId);
          const jouee = numero < partie.saison.journeeCourante;
          return (
            <section key={numero} className="carte">
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="titre-carte">Journée {numero + 1}</h2>
                <span className="sous-titre">{jouee ? "jouée" : numero === partie.saison.journeeCourante ? "à jouer" : "à venir"}</span>
              </div>
              <ul className="space-y-1">
                {rencontres.map((r, i) => {
                  const resultat = resultats.get(`${numero}|${r.domicileId}|${r.exterieurId}`);
                  const mien = r.domicileId === club.id || r.exterieurId === club.id;
                  const gagne =
                    resultat && mien
                      ? (r.domicileId === club.id && resultat.scoreDomicile > resultat.scoreExterieur) ||
                        (r.exterieurId === club.id && resultat.scoreExterieur > resultat.scoreDomicile)
                      : false;
                  const perdu =
                    resultat && mien
                      ? (r.domicileId === club.id && resultat.scoreDomicile < resultat.scoreExterieur) ||
                        (r.exterieurId === club.id && resultat.scoreExterieur < resultat.scoreDomicile)
                      : false;
                  return (
                    <li
                      key={i}
                      className={`flex items-center gap-2 rounded px-2 py-1 font-mono text-[12px] ${
                        mien ? "bg-accent-doux font-semibold" : ""
                      }`}
                    >
                      <span className="flex-1 truncate text-right">{idx.clubParId.get(r.domicileId)!.nom}</span>
                      <span
                        className={`w-14 text-center tabular-nums ${
                          gagne ? "text-bon" : perdu ? "text-mauvais" : ""
                        }`}
                      >
                        {resultat ? `${resultat.scoreDomicile}:${resultat.scoreExterieur}` : "—"}
                      </span>
                      <span className="flex-1 truncate">{idx.clubParId.get(r.exterieurId)!.nom}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
