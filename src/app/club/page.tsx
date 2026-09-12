"use client";

import Link from "next/link";

import { EtiquetteForme } from "@/composants/affichage";
import { Ecusson } from "@/composants/ecusson";
import { InviteNouvellePartie } from "@/composants/invite";
import { usePartie } from "@/jeu/etat";
import { maLigne, monClassement, monClub, monProchainMatch } from "@/jeu/partie";
import { observer } from "@/jeu/observation";
import { noteJoueur } from "@/moteur/attributs";
import { forceClub } from "@/moteur/monde";
import { LIBELLES_POSTE } from "@/moteur/types";

export default function PageClub() {
  const { partie, idx, version } = usePartie();
  if (!partie || !idx) return <InviteNouvellePartie />;

  const club = monClub(partie, idx);
  const effectif = idx.effectifParClub.get(club.id) ?? [];
  const table = monClassement(partie, idx);
  const ligne = maLigne(partie, idx);
  const suivant = monProchainMatch(partie);
  const derniereJournee = partie.saison.journeeCourante - 1;
  const resultatsJournee = partie.saison.resultats.filter(
    (r) => r.journee === derniereJournee && r.divisionId === club.divisionId,
  );

  const blesses = effectif.filter((j) => j.blessureJours > 0);
  const fatigues = effectif.filter((j) => j.blessureJours <= 0 && j.condition < 60);
  const buteurs = effectif
    .map((j) => ({ j, buts: partie.saison.statsJoueurs[j.id]?.buts ?? 0 }))
    .filter((x) => x.buts > 0)
    .sort((a, b) => b.buts - a.buts)
    .slice(0, 5);

  const adversaireId = suivant
    ? suivant.rencontre.domicileId === club.id
      ? suivant.rencontre.exterieurId
      : suivant.rencontre.domicileId
    : null;
  const rapport = adversaireId ? observer(partie.monde, idx, adversaireId, partie.saison) : null;

  return (
    <div className="space-y-5" key={version}>
      <section className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="carte">
          <h2 className="titre-carte">{partie.saison.terminee ? "Saison terminée" : "Prochaine journée"}</h2>
          {suivant && rapport && adversaireId ? (
            <>
              <p className="sous-titre mb-4">
                Journée {suivant.journee + 1} ·{" "}
                {suivant.rencontre.domicileId === club.id ? "à domicile" : "à l'extérieur"}
              </p>
              <div className="flex items-center justify-center gap-6 py-2">
                <div className="text-center">
                  <Ecusson club={club} taille={52} />
                  <p className="mt-2 font-titre font-semibold">{club.abbr}</p>
                </div>
                <span className="font-titre text-doux">VS</span>
                <div className="text-center">
                  <Ecusson club={idx.clubParId.get(adversaireId)!} taille={52} />
                  <p className="mt-2 font-titre font-semibold">{idx.clubParId.get(adversaireId)!.abbr}</p>
                </div>
              </div>
              <dl className="mt-4 space-y-1 text-sm">
                <Ligne terme="Adversaire" valeur={rapport.nom} />
                <Ligne
                  terme="Force comparée"
                  valeur={`${forceClub(effectif).toFixed(0)} contre ${rapport.force.toFixed(0)}`}
                />
                <Ligne
                  terme="Profil offensif adverse"
                  valeur={`${rapport.profil} (${Math.round(rapport.partDistance * 100)} % de tirs à distance)`}
                />
                <Ligne terme="Système conseillé" valeur={rapport.systemeConseille} />
              </dl>
              <Link href="/match" className="bouton-principal mt-5 w-full">
                Préparer le match
              </Link>
            </>
          ) : (
            <p className="mt-2 text-doux">
              Les {partie.saison.calendrier.length} journées ont été jouées. {table[0].nom} est champion avec{" "}
              {table[0].points} points ; vous terminez {ligne.rang}
              <sup>e</sup> — le conseil vous attendait {partie.rangAttendu}
              <sup>e</sup>.
            </p>
          )}
          {partie.saison.terminee ? (
            <Link href="/saison" className="bouton-principal mt-5 w-full">
              Voir le bilan de la saison
            </Link>
          ) : null}
        </div>

        <div className="carte">
          <h2 className="titre-carte">Classement</h2>
          <p className="sous-titre mb-3">{idx.divisionParId.get(club.divisionId)?.nom}</p>
          <table className="tableau">
            <thead>
              <tr>
                <th></th>
                <th>Club</th>
                <th className="num">J</th>
                <th className="num">Pts</th>
                <th>Forme</th>
              </tr>
            </thead>
            <tbody>
              {table.slice(0, 6).map((l) => (
                <tr key={l.clubId} className={l.clubId === club.id ? "bg-accent-doux font-semibold" : ""}>
                  <td className="font-mono text-[11px] text-doux">{l.rang}</td>
                  <td className="truncate">{l.nom}</td>
                  <td className="num">{l.joues}</td>
                  <td className="num">{l.points}</td>
                  <td>
                    <EtiquetteForme forme={l.forme} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Link href="/classement" className="bouton mt-3 w-full">
            Classement complet
          </Link>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <div className="carte">
          <h2 className="titre-carte">Infirmerie</h2>
          <p className="sous-titre mb-3">Indisponibles et joueurs dans le rouge</p>
          {blesses.length === 0 && fatigues.length === 0 ? (
            <p className="text-sm text-doux">Tout le monde est disponible et frais.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {blesses.map((j) => (
                <li key={j.id} className="flex justify-between gap-2">
                  <span>
                    {j.prenom} {j.nom}
                  </span>
                  <span className="font-mono text-[11px] text-mauvais">blessé · {j.blessureJours} j</span>
                </li>
              ))}
              {fatigues.map((j) => (
                <li key={j.id} className="flex justify-between gap-2">
                  <span>
                    {j.prenom} {j.nom}
                  </span>
                  <span className="font-mono text-[11px] text-moyen">condition {Math.round(j.condition)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="carte">
          <h2 className="titre-carte">Buteurs du club</h2>
          <p className="sous-titre mb-3">Depuis le début de saison</p>
          {buteurs.length === 0 ? (
            <p className="text-sm text-doux">La saison n&apos;a pas encore commencé.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {buteurs.map(({ j, buts }) => (
                <li key={j.id} className="flex items-baseline justify-between gap-2">
                  <span className="truncate">
                    {j.prenom} {j.nom}{" "}
                    <span className="font-mono text-[10px] text-doux">{LIBELLES_POSTE[j.poste]}</span>
                  </span>
                  <span className="font-mono tabular-nums">{buts}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="carte">
          <h2 className="titre-carte">{resultatsJournee.length ? `Journée ${derniereJournee + 1}` : "Effectif"}</h2>
          <p className="sous-titre mb-3">
            {resultatsJournee.length ? "Résultats de la division" : "Vue d'ensemble"}
          </p>
          {resultatsJournee.length ? (
            <ul className="space-y-1 font-mono text-[12px]">
              {resultatsJournee.map((r, i) => {
                const mien = r.domicileId === club.id || r.exterieurId === club.id;
                return (
                  <li key={i} className={`flex justify-between gap-2 rounded px-2 py-1 ${mien ? "bg-accent-doux" : ""}`}>
                    <span>
                      {idx.clubParId.get(r.domicileId)!.abbr} — {idx.clubParId.get(r.exterieurId)!.abbr}
                    </span>
                    <span className="tabular-nums">
                      {r.scoreDomicile}:{r.scoreExterieur}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <dl className="space-y-1 text-sm">
              <Ligne terme="Effectif" valeur={`${effectif.length} joueurs`} />
              <Ligne terme="Âge moyen" valeur={(effectif.reduce((s, j) => s + j.age, 0) / effectif.length).toFixed(1)} />
              <Ligne
                terme="Note moyenne"
                valeur={(effectif.reduce((s, j) => s + noteJoueur(j), 0) / effectif.length).toFixed(1)}
              />
              <Ligne terme="Réputation" valeur={`${club.reputation}/100`} />
            </dl>
          )}
        </div>
      </section>
    </div>
  );
}

function Ligne({ terme, valeur }: { terme: string; valeur: string }) {
  return (
    <div className="flex justify-between gap-3 border-t border-bordure py-1.5 first:border-t-0">
      <dt className="sous-titre">{terme}</dt>
      <dd className="text-right">{valeur}</dd>
    </div>
  );
}
