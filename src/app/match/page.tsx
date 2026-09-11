"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { horloge } from "@/composants/affichage";
import { Ecusson } from "@/composants/ecusson";
import { InviteNouvellePartie } from "@/composants/invite";
import { usePartie } from "@/jeu/etat";
import { jouerProchaineJournee, monClub, monProchainMatch } from "@/jeu/partie";
import { observer } from "@/jeu/observation";
import { SYSTEMES, TEMPOS } from "@/moteur/match/parametres";
import { forceClub } from "@/moteur/monde";
import { LIBELLES_POSTE, POSTES, type EvenementMatch, type FeuilleMatch } from "@/moteur/types";

const VITESSES = [
  { libelle: "Posé", facteur: 40 },
  { libelle: "Rapide", facteur: 140 },
  { libelle: "Très rapide", facteur: 400 },
];

export default function PageMatch() {
  const { partie, idx, version, agir } = usePartie();
  const [enDirect, setEnDirect] = useState(false);
  const [temps, setTemps] = useState(0);
  const [vitesse, setVitesse] = useState(1);
  const horlogeRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enDirect) return;
    horlogeRef.current = setInterval(() => {
      setTemps((t) => {
        const suivant = t + (VITESSES[vitesse].facteur * 100) / 1000;
        if (suivant >= 3600) {
          setEnDirect(false);
          return 3600;
        }
        return suivant;
      });
    }, 100);
    return () => {
      if (horlogeRef.current) clearInterval(horlogeRef.current);
    };
  }, [enDirect, vitesse]);

  if (!partie || !idx) return <InviteNouvellePartie />;

  const club = monClub(partie, idx);
  const dernier = partie.dernierMatch;
  const enCours = !partie.dernierMatchVu && dernier;

  if (enCours) {
    return (
      <FeuilleDeMatch
        feuille={dernier.feuille}
        domicile={dernier.domicile}
        temps={temps}
        enDirect={enDirect}
        vitesse={vitesse}
        setVitesse={setVitesse}
        onPause={() => setEnDirect(!enDirect)}
        onFin={() => {
          setEnDirect(false);
          setTemps(3600);
        }}
        onContinuer={() => {
          agir((p) => {
            p.dernierMatchVu = true;
          });
          setTemps(0);
          setEnDirect(false);
        }}
        nomDomicile={idx.clubParId.get(dernier.feuille.clubDomicileId)!.nom}
        nomExterieur={idx.clubParId.get(dernier.feuille.clubExterieurId)!.nom}
        journee={dernier.journee}
        autresResultats={partie.saison.resultats
          .filter((r) => r.journee === dernier.journee && r.divisionId === club.divisionId)
          .filter((r) => r.domicileId !== club.id && r.exterieurId !== club.id)
          .map((r) => ({
            texte: `${idx.clubParId.get(r.domicileId)!.abbr} — ${idx.clubParId.get(r.exterieurId)!.abbr}`,
            score: `${r.scoreDomicile}:${r.scoreExterieur}`,
          }))}
        nomJoueur={(id) => {
          const j = idx.joueurParId.get(id);
          return j ? `${j.prenom.charAt(0)}. ${j.nom}` : "—";
        }}
        posteJoueur={(id) => {
          const j = idx.joueurParId.get(id);
          return j ? LIBELLES_POSTE[j.poste] : "";
        }}
      />
    );
  }

  const suivant = monProchainMatch(partie);
  if (!suivant) {
    return (
      <div className="carte text-center">
        <h1 className="titre-carte">Saison terminée</h1>
        <p className="mt-2 text-doux">Les {partie.saison.calendrier.length} journées ont été jouées.</p>
        <Link href="/classement" className="bouton-principal mt-4">
          Voir le classement final
        </Link>
      </div>
    );
  }

  const adversaireId =
    suivant.rencontre.domicileId === club.id ? suivant.rencontre.exterieurId : suivant.rencontre.domicileId;
  const adversaire = idx.clubParId.get(adversaireId)!;
  const rapport = observer(partie.monde, idx, adversaireId, partie.saison);
  const effectif = idx.effectifParClub.get(club.id) ?? [];
  const sept = POSTES.map((poste) => ({ poste, joueur: idx.joueurParId.get(club.tactique.sept[poste]) }));
  const alertes = sept.filter((x) => x.joueur && (x.joueur.blessureJours > 0 || x.joueur.condition < 55));
  const chezMoi = suivant.rencontre.domicileId === club.id;

  return (
    <div className="space-y-5" key={version}>
      <section className="carte">
        <h1 className="titre-carte">Journée {suivant.journee + 1}</h1>
        <p className="sous-titre mb-4">{chezMoi ? "À domicile" : "À l'extérieur"}</p>

        <div className="flex flex-wrap items-center justify-center gap-8 py-3">
          <div className="text-center">
            <Ecusson club={chezMoi ? club : adversaire} taille={64} />
            <p className="mt-2 font-titre text-lg font-bold">{(chezMoi ? club : adversaire).nom}</p>
            <p className="sous-titre">force {forceClub(idx.effectifParClub.get(chezMoi ? club.id : adversaire.id)!).toFixed(0)}</p>
          </div>
          <span className="font-titre text-doux">VS</span>
          <div className="text-center">
            <Ecusson club={chezMoi ? adversaire : club} taille={64} />
            <p className="mt-2 font-titre text-lg font-bold">{(chezMoi ? adversaire : club).nom}</p>
            <p className="sous-titre">force {forceClub(idx.effectifParClub.get(chezMoi ? adversaire.id : club.id)!).toFixed(0)}</p>
          </div>
        </div>

        {alertes.length ? (
          <p className="mt-3 rounded-lg border border-bordure bg-surface-2 p-3 text-sm text-mauvais">
            Attention au sept aligné :{" "}
            {alertes
              .map((x) =>
                x.joueur!.blessureJours > 0
                  ? `${x.joueur!.nom} est blessé (${x.joueur!.blessureJours} j)`
                  : `${x.joueur!.nom} est à ${Math.round(x.joueur!.condition)} de condition`,
              )
              .join(", ")}
            .{" "}
            <Link href="/tactique" className="underline">
              Modifier la composition
            </Link>
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            className="bouton-principal flex-1"
            onClick={() => {
              agir((p, index) => {
                jouerProchaineJournee(p, index);
              });
              setTemps(0);
              setEnDirect(true);
            }}
          >
            Coup d&apos;envoi
          </button>
          <Link href="/tactique" className="bouton">
            Revoir la tactique
          </Link>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="carte">
          <h2 className="titre-carte">Rapport d&apos;observation — {adversaire.nom}</h2>
          <p className="sous-titre mb-3">C&apos;est ce profil qui décide quel système défensif fait mal</p>
          <div className="mb-3 flex items-center gap-3 font-mono text-[10px] text-doux uppercase">
            <span>Intérieur</span>
            <span className="h-2 flex-1 overflow-hidden rounded border border-bordure bg-surface-2">
              <span
                className="block h-full"
                style={{ width: `${Math.round(rapport.partDistance * 100)}%`, background: "var(--accent-2)" }}
              />
            </span>
            <span>Distance</span>
          </div>
          <dl className="space-y-1 text-sm">
            <LigneInfo terme="Profil" valeur={`${rapport.profil} · ${Math.round(rapport.partDistance * 100)} % à distance`} />
            <LigneInfo
              terme="Joueur à surveiller"
              valeur={rapport.dangereux ? `${rapport.dangereux.prenom} ${rapport.dangereux.nom} (${rapport.dangereux.poste})` : "—"}
            />
            <LigneInfo
              terme="Gardien adverse"
              valeur={rapport.gardien ? `${rapport.gardien.prenom} ${rapport.gardien.nom}` : "—"}
            />
            <LigneInfo terme="Classement" valeur={rapport.rang ? `${rapport.rang}e` : "—"} />
          </dl>
          <p className="mt-3 rounded-lg border border-accent bg-accent-doux p-3 text-sm">{rapport.conseil}</p>
        </div>

        <div className="carte">
          <h2 className="titre-carte">Votre plan</h2>
          <p className="sous-titre mb-3">Modifiable jusqu&apos;au coup d&apos;envoi</p>
          <dl className="space-y-1 text-sm">
            <LigneInfo terme="Défense" valeur={SYSTEMES[club.tactique.systeme].libelle} />
            <LigneInfo terme="Rythme" valeur={TEMPOS[club.tactique.tempo].libelle} />
            <LigneInfo terme="Gardien volant" valeur={club.tactique.gardienVolant ? "oui" : "non"} />
          </dl>
          <ul className="mt-3 space-y-1 font-mono text-[12px]">
            {sept.map(({ poste, joueur }) => (
              <li key={poste} className="flex justify-between gap-2 border-t border-bordure py-1">
                <span className="text-doux">{poste}</span>
                <span>
                  {joueur ? `${joueur.prenom.charAt(0)}. ${joueur.nom}` : "—"}
                  {joueur && joueur.condition < 55 ? " ⚠" : ""}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[13px] text-doux">
            Effectif disponible : {effectif.filter((j) => j.blessureJours <= 0).length} joueurs.
          </p>
        </div>
      </section>
    </div>
  );
}

function LigneInfo({ terme, valeur }: { terme: string; valeur: string }) {
  return (
    <div className="flex justify-between gap-3 border-t border-bordure py-1.5 first:border-t-0">
      <dt className="sous-titre">{terme}</dt>
      <dd className="text-right">{valeur}</dd>
    </div>
  );
}

/* ------------------------------------------------------------ feuille de match */

function FeuilleDeMatch(props: {
  feuille: FeuilleMatch;
  domicile: boolean;
  temps: number;
  enDirect: boolean;
  vitesse: number;
  setVitesse: (v: number) => void;
  onPause: () => void;
  onFin: () => void;
  onContinuer: () => void;
  nomDomicile: string;
  nomExterieur: string;
  journee: number;
  autresResultats: { texte: string; score: string }[];
  nomJoueur: (id: string) => string;
  posteJoueur: (id: string) => string;
}) {
  const { feuille, temps } = props;
  const termine = temps >= 3600;
  const visibles = useMemo(
    () => feuille.evenements.filter((e) => e.seconde <= temps || termine),
    [feuille.evenements, temps, termine],
  );
  const dernierVisible = visibles[visibles.length - 1];
  const scoreD = termine ? feuille.scoreDomicile : (dernierVisible?.scoreDomicile ?? 0);
  const scoreE = termine ? feuille.scoreExterieur : (dernierVisible?.scoreExterieur ?? 0);

  const mienD = props.domicile;
  const mesStats = mienD ? feuille.statsDomicile : feuille.statsExterieur;
  const leursStats = mienD ? feuille.statsExterieur : feuille.statsDomicile;
  const mesJoueurs = mienD ? feuille.joueursDomicile : feuille.joueursExterieur;
  const monScore = mienD ? feuille.scoreDomicile : feuille.scoreExterieur;
  const leurScore = mienD ? feuille.scoreExterieur : feuille.scoreDomicile;
  const verdict = monScore > leurScore ? "Victoire" : monScore < leurScore ? "Défaite" : "Match nul";
  const couleurVerdict = monScore > leurScore ? "text-bon" : monScore < leurScore ? "text-mauvais" : "text-doux";

  return (
    <div className="space-y-5">
      <section className="carte">
        <div className="flex items-baseline justify-between">
          <h1 className="titre-carte">Journée {props.journee + 1}</h1>
          <span className="font-mono text-sm tabular-nums text-doux">
            {termine ? "60:00" : horloge(temps)}
          </span>
        </div>

        <div className="my-5 flex items-center justify-center gap-6">
          <span className="w-36 text-right font-mono text-[12px] text-doux uppercase">{props.nomDomicile}</span>
          <span className="font-titre text-5xl font-bold tabular-nums">{scoreD}</span>
          <span className="text-2xl text-doux">:</span>
          <span className="font-titre text-5xl font-bold tabular-nums">{scoreE}</span>
          <span className="w-36 font-mono text-[12px] text-doux uppercase">{props.nomExterieur}</span>
        </div>

        {termine ? (
          <p className={`text-center font-titre text-lg font-bold uppercase ${couleurVerdict}`}>{verdict}</p>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button className="bouton" onClick={props.onPause}>
              {props.enDirect ? "Pause" : "Reprendre"}
            </button>
            {VITESSES.map((v, i) => (
              <button
                key={v.libelle}
                onClick={() => props.setVitesse(i)}
                className={`rounded-full border px-3 py-1 font-mono text-[11px] transition-colors ${
                  props.vitesse === i ? "border-accent bg-accent text-fond" : "border-bordure text-doux hover:border-accent"
                }`}
              >
                {v.libelle}
              </button>
            ))}
            <button className="bouton" onClick={props.onFin}>
              Aller à la fin
            </button>
          </div>
        )}

        <div className="mt-5 max-h-[340px] overflow-y-auto rounded-lg border border-bordure">
          {[...visibles].reverse().map((e, i) => (
            <LigneEvenement key={visibles.length - i} evenement={e} monCamp={mienD ? "domicile" : "exterieur"} />
          ))}
        </div>
      </section>

      {termine ? (
        <>
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
              <Comparaison libelle="Jets de 7 m" a={mesStats.septMetresMarques} b={leursStats.septMetresMarques} suffixe={`/${mesStats.septMetresTires}`} />
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
            <p className="sous-titre mb-3">Temps de jeu et rendement</p>
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
                  </tr>
                </thead>
                <tbody>
                  {[...mesJoueurs]
                    .sort((a, b) => b.secondes - a.secondes)
                    .map((l) => (
                      <tr key={l.joueurId}>
                        <td className="whitespace-nowrap">{props.nomJoueur(l.joueurId)}</td>
                        <td className="whitespace-nowrap text-doux">{props.posteJoueur(l.joueurId)}</td>
                        <td className="num">{Math.round(l.secondes / 60)}</td>
                        <td className="num font-semibold">{l.buts}</td>
                        <td className="num">{l.tirs}</td>
                        <td className="num">{l.arrets || ""}</td>
                        <td className="num">{l.pertes}</td>
                        <td className="num">{l.exclusions || ""}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>

          {props.autresResultats.length ? (
            <section className="carte">
              <h2 className="titre-carte">Autres résultats</h2>
              <p className="sous-titre mb-3">Même journée, même moteur</p>
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {props.autresResultats.map((r, i) => (
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

          <button className="bouton-principal w-full" onClick={props.onContinuer}>
            Continuer
          </button>
        </>
      ) : null}
    </div>
  );
}

function LigneEvenement({ evenement, monCamp }: { evenement: EvenementMatch; monCamp: "domicile" | "exterieur" }) {
  const couleur =
    evenement.type === "but"
      ? evenement.camp === monCamp
        ? "text-accent font-semibold"
        : "text-accent-2 font-semibold"
      : evenement.type === "exclusion"
        ? "text-mauvais"
        : evenement.type === "arret"
          ? "text-bon"
          : evenement.type === "coupEnvoi" || evenement.type === "miTemps" || evenement.type === "fin"
            ? "text-doux italic"
            : "text-doux";
  return (
    <div className="flex gap-3 border-b border-bordure px-3 py-1.5 text-[13px] last:border-b-0">
      <span className="w-8 shrink-0 font-mono text-[11px] tabular-nums text-doux">
        {Math.floor(evenement.seconde / 60)}′
      </span>
      <span className={couleur}>{evenement.texte}</span>
    </div>
  );
}

function Comparaison({ libelle, a, b, suffixe = "" }: { libelle: string; a: number; b: number; suffixe?: string }) {
  const total = Math.max(1, a + b);
  return (
    <div className="flex items-center gap-3 border-t border-bordure py-1.5 first:border-t-0">
      <span className="w-10 text-right font-mono tabular-nums">
        {a}
        {suffixe}
      </span>
      <span className="flex h-1.5 flex-1 overflow-hidden rounded bg-surface-2">
        <span className="h-full" style={{ width: `${(a / total) * 100}%`, background: "var(--accent)" }} />
        <span className="h-full" style={{ width: `${(b / total) * 100}%`, background: "var(--accent-2)" }} />
      </span>
      <span className="w-10 font-mono tabular-nums">
        {b}
        {suffixe}
      </span>
      <span className="sous-titre w-40 text-right">{libelle}</span>
    </div>
  );
}
