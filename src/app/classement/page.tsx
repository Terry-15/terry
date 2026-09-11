"use client";

import { useState } from "react";

import { EtiquetteForme } from "@/composants/affichage";
import { InviteNouvellePartie } from "@/composants/invite";
import { usePartie } from "@/jeu/etat";
import { monClub } from "@/jeu/partie";
import { classement, meilleursButeurs } from "@/moteur/saison";
import { LIBELLES_POSTE } from "@/moteur/types";

export default function PageClassement() {
  const { partie, idx, version } = usePartie();
  const [divisionActive, setDivisionActive] = useState<string | null>(null);

  if (!partie || !idx) return <InviteNouvellePartie />;

  const club = monClub(partie, idx);
  const divisionId = divisionActive ?? club.divisionId;
  const table = classement(partie.monde, partie.saison, divisionId, idx);
  const buteurs = meilleursButeurs(partie.monde, partie.saison, idx, divisionId, 10);
  const gardiens = Object.entries(partie.saison.statsJoueurs)
    .map(([id, s]) => ({ joueur: idx.joueurParId.get(id)!, s }))
    .filter((x) => x.joueur?.poste === "GB" && x.s.tirsSubis > 80)
    .filter((x) => idx.divisionParId.get(divisionId)!.clubIds.includes(x.joueur.clubId ?? ""))
    .map((x) => ({ ...x, part: x.s.arrets / x.s.tirsSubis }))
    .sort((a, b) => b.part - a.part)
    .slice(0, 5);

  return (
    <div className="space-y-5" key={version}>
      <section className="carte">
        <h1 className="titre-carte">Classement</h1>
        <p className="sous-titre mb-4">Victoire 2 points, nul 1 point</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {partie.monde.divisions.map((d) => (
            <button
              key={d.id}
              onClick={() => setDivisionActive(d.id)}
              className={`rounded-full border px-4 py-1.5 font-titre text-[13px] font-semibold transition-colors ${
                d.id === divisionId
                  ? "border-accent bg-accent text-fond"
                  : "border-bordure bg-surface text-doux hover:border-accent"
              }`}
            >
              {d.nom}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="tableau min-w-[620px]">
            <thead>
              <tr>
                <th></th>
                <th>Club</th>
                <th className="num">J</th>
                <th className="num">G</th>
                <th className="num">N</th>
                <th className="num">P</th>
                <th className="num">BP</th>
                <th className="num">BC</th>
                <th className="num">Diff</th>
                <th className="num">Pts</th>
                <th>Forme</th>
              </tr>
            </thead>
            <tbody>
              {table.map((l) => (
                <tr key={l.clubId} className={l.clubId === club.id ? "bg-accent-doux font-semibold" : ""}>
                  <td className="font-mono text-[11px] text-doux">{l.rang}</td>
                  <td className="whitespace-nowrap">{l.nom}</td>
                  <td className="num">{l.joues}</td>
                  <td className="num">{l.victoires}</td>
                  <td className="num">{l.nuls}</td>
                  <td className="num">{l.defaites}</td>
                  <td className="num">{l.butsPour}</td>
                  <td className="num">{l.butsContre}</td>
                  <td className="num">{l.difference > 0 ? `+${l.difference}` : l.difference}</td>
                  <td className="num font-semibold">{l.points}</td>
                  <td>
                    <EtiquetteForme forme={l.forme} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="carte">
          <h2 className="titre-carte">Meilleurs buteurs</h2>
          <p className="sous-titre mb-3">{idx.divisionParId.get(divisionId)?.nom}</p>
          {buteurs.length === 0 ? (
            <p className="text-sm text-doux">Aucun match joué pour l&apos;instant.</p>
          ) : (
            <table className="tableau">
              <thead>
                <tr>
                  <th></th>
                  <th>Joueur</th>
                  <th>Club</th>
                  <th className="num">M</th>
                  <th className="num">Buts</th>
                  <th className="num">/match</th>
                </tr>
              </thead>
              <tbody>
                {buteurs.map((b, i) => (
                  <tr key={b.joueur.id} className={b.joueur.clubId === club.id ? "bg-accent-doux" : ""}>
                    <td className="font-mono text-[11px] text-doux">{i + 1}</td>
                    <td className="whitespace-nowrap">
                      {b.joueur.prenom} {b.joueur.nom}{" "}
                      <span className="font-mono text-[10px] text-doux">{LIBELLES_POSTE[b.joueur.poste]}</span>
                    </td>
                    <td className="font-mono text-[11px]">{b.clubAbbr}</td>
                    <td className="num">{b.matchs}</td>
                    <td className="num font-semibold">{b.buts}</td>
                    <td className="num text-doux">{b.parMatch.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="carte">
          <h2 className="titre-carte">Gardiens</h2>
          <p className="sous-titre mb-3">Pourcentage d&apos;arrêts, à partir de 80 tirs subis</p>
          {gardiens.length === 0 ? (
            <p className="text-sm text-doux">Pas encore assez de matchs joués.</p>
          ) : (
            <table className="tableau">
              <thead>
                <tr>
                  <th>Gardien</th>
                  <th>Club</th>
                  <th className="num">Arrêts</th>
                  <th className="num">%</th>
                </tr>
              </thead>
              <tbody>
                {gardiens.map((g) => (
                  <tr key={g.joueur.id} className={g.joueur.clubId === club.id ? "bg-accent-doux" : ""}>
                    <td className="whitespace-nowrap">
                      {g.joueur.prenom} {g.joueur.nom}
                    </td>
                    <td className="font-mono text-[11px]">{idx.clubParId.get(g.joueur.clubId!)?.abbr}</td>
                    <td className="num">{g.s.arrets}</td>
                    <td className="num font-semibold">{Math.round(g.part * 100)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
