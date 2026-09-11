"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { horloge } from "@/composants/affichage";
import { Ecusson } from "@/composants/ecusson";
import { InviteNouvellePartie } from "@/composants/invite";
import { FeuilleDeMatch } from "@/composants/feuille-match";
import { usePartie } from "@/jeu/etat";
import { observer } from "@/jeu/observation";
import { cloturerJournee, monClub, monProchainMatch, ouvrirMatch, type MatchEnCours } from "@/jeu/partie";
import { creerMemoirePilote, PAS_PILOTAGE, PILOTE_ATTENTIF, piloterBanc } from "@/jeu/pilote";
import {
  ajusterTactique,
  apercuMatch,
  avancerMatch,
  demanderTempsMort,
  effectuerChangement,
  terminerMatch,
  type ApercuJoueur,
  type ApercuMatch,
} from "@/moteur/match/moteur";
import { SYSTEMES, TEMPOS } from "@/moteur/match/parametres";
import { forceClub } from "@/moteur/monde";
import { LIBELLES_POSTE, POSTES, type SystemeDefensif, type Tempo } from "@/moteur/types";

/** Secondes de jeu écoulées par seconde réelle. */
const VITESSES = [
  { libelle: "Minute par minute", facteur: 30 },
  { libelle: "Rapide", facteur: 120 },
  { libelle: "Très rapide", facteur: 400 },
];
const PAS_MS = 120;

export default function PageMatch() {
  const { partie, idx, version, agir } = usePartie();
  const matchRef = useRef<MatchEnCours | null>(null);
  const memoireRef = useRef(creerMemoirePilote());
  const dernierPilotageRef = useRef(0);
  /**
   * Horloge de l'affichage, distincte de celle du moteur : le moteur avance
   * par possessions entières, donc au moins une trentaine de secondes à la
   * fois. Sans cet accumulateur, chaque battement du minuteur jouerait une
   * possession et le match défilerait dix fois trop vite.
   */
  const cibleRef = useRef(0);
  const [vue, setVue] = useState<ApercuMatch | null>(null);
  const [enPause, setEnPause] = useState(false);
  const [vitesse, setVitesse] = useState(0);
  const [adjoint, setAdjoint] = useState(false);
  const [selection, setSelection] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const rafraichir = useCallback(() => {
    if (matchRef.current) setVue(apercuMatch(matchRef.current.etat));
  }, []);

  // L'horloge du match : le moteur avance par tranches, on peut l'arrêter.
  useEffect(() => {
    if (!vue || vue.termine || enPause || !matchRef.current) return;
    const minuteur = setInterval(() => {
      const match = matchRef.current;
      if (!match) return;
      cibleRef.current += (VITESSES[vitesse].facteur * PAS_MS) / 1000;
      avancerMatch(match.etat, cibleRef.current);
      if (adjoint && match.etat.t - dernierPilotageRef.current >= PAS_PILOTAGE) {
        dernierPilotageRef.current = match.etat.t;
        piloterBanc(match.etat, match.monCamp, PILOTE_ATTENTIF, memoireRef.current);
      }
      setVue(apercuMatch(match.etat));
    }, PAS_MS);
    return () => clearInterval(minuteur);
  }, [vue, enPause, vitesse, adjoint]);

  // Fin du match : on clôt la journée et on enregistre.
  useEffect(() => {
    if (!vue?.termine || !matchRef.current) return;
    const match = matchRef.current;
    matchRef.current = null;
    const feuille = terminerMatch(match.etat);
    agir((p, index) => cloturerJournee(p, index, match, feuille));
  }, [vue?.termine, agir]);

  if (!partie || !idx) return <InviteNouvellePartie />;

  const club = monClub(partie, idx);

  /* ----------------------------------------------------------- après match */

  if (!partie.dernierMatchVu && partie.dernierMatch) {
    const dernier = partie.dernierMatch;
    return (
      <FeuilleDeMatch
        feuille={dernier.feuille}
        domicile={dernier.domicile}
        journee={dernier.journee}
        nomDomicile={idx.clubParId.get(dernier.feuille.clubDomicileId)!.nom}
        nomExterieur={idx.clubParId.get(dernier.feuille.clubExterieurId)!.nom}
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
        onContinuer={() => {
          setVue(null);
          agir((p) => {
            p.dernierMatchVu = true;
          });
        }}
      />
    );
  }

  /* --------------------------------------------------------- match en cours */

  if (vue && matchRef.current) {
    const match = matchRef.current;
    const moi = match.monCamp === "domicile" ? vue.domicile : vue.exterieur;
    const adverse = match.monCamp === "domicile" ? vue.exterieur : vue.domicile;
    const aLeBallon = vue.possession === match.monCamp;

    const agirBanc = (action: () => { ok: boolean; raison?: string }) => {
      const r = action();
      setMessage(r.ok ? null : (r.raison ?? "Impossible"));
      rafraichir();
    };

    const cliquerJoueur = (joueur: ApercuJoueur, surTerrain: boolean) => {
      if (surTerrain) {
        setSelection(selection === joueur.id ? null : joueur.id);
        setMessage(null);
        return;
      }
      if (!selection) {
        setMessage("Choisissez d'abord le joueur à sortir.");
        return;
      }
      agirBanc(() => effectuerChangement(match.etat, match.monCamp, selection, joueur.id));
      setSelection(null);
    };

    return (
      <div className="space-y-4">
        <section className="carte">
          <div className="flex items-baseline justify-between">
            <h1 className="titre-carte">Journée {match.journee + 1}</h1>
            <span className="font-mono text-sm tabular-nums text-doux">
              {horloge(vue.t)} {vue.t >= 1800 ? "· 2e période" : "· 1re période"}
            </span>
          </div>

          <div className="my-4 flex items-center justify-center gap-5">
            <span
              className={`w-36 text-right font-mono text-[12px] uppercase ${
                match.monCamp === "domicile" ? "font-semibold text-accent" : "text-doux"
              }`}
            >
              {vue.domicile.nom}
              {vue.possession === "domicile" ? " ●" : ""}
            </span>
            <span className="font-titre text-5xl font-bold tabular-nums">{vue.domicile.score}</span>
            <span className="text-2xl text-doux">:</span>
            <span className="font-titre text-5xl font-bold tabular-nums">{vue.exterieur.score}</span>
            <span
              className={`w-36 font-mono text-[12px] uppercase ${
                match.monCamp === "exterieur" ? "font-semibold text-accent" : "text-doux"
              }`}
            >
              {vue.possession === "exterieur" ? "● " : ""}
              {vue.exterieur.nom}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <button className="bouton-principal" onClick={() => setEnPause(!enPause)}>
              {enPause ? "Reprendre" : "Arrêter le jeu"}
            </button>
            {VITESSES.map((v, i) => (
              <button
                key={v.libelle}
                onClick={() => setVitesse(i)}
                className={`rounded-full border px-3 py-1 font-mono text-[11px] transition-colors ${
                  vitesse === i ? "border-accent bg-accent text-fond" : "border-bordure text-doux hover:border-accent"
                }`}
              >
                {v.libelle}
              </button>
            ))}
            <label className="ml-2 flex cursor-pointer items-center gap-2 font-mono text-[11px] text-doux">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--accent)]"
                checked={adjoint}
                onChange={(e) => setAdjoint(e.target.checked)}
              />
              Confier le banc à l&apos;adjoint
            </label>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
          <section className="carte">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="titre-carte">Votre banc</h2>
              <span className="sous-titre">
                {aLeBallon ? "vous avez le ballon" : "ballon adverse"} · {moi.tempsMortsRestants} temps mort(s)
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="bouton"
                disabled={moi.tempsMortsRestants <= 0 || !aLeBallon}
                title={aLeBallon ? "Trois par match, deux par mi-temps" : "Il faut avoir le ballon"}
                onClick={() => agirBanc(() => demanderTempsMort(match.etat, match.monCamp))}
              >
                Temps mort ({moi.tempsMortsRestants})
              </button>
              {(Object.keys(SYSTEMES) as SystemeDefensif[]).map((s) => (
                <button
                  key={s}
                  onClick={() => agirBanc(() => ajusterTactique(match.etat, match.monCamp, { systeme: s }))}
                  className={`rounded-lg border px-3 py-2 font-mono text-[11px] transition-colors ${
                    moi.systeme === s ? "border-accent bg-accent-doux text-accent" : "border-bordure text-doux hover:border-accent"
                  }`}
                >
                  {s}
                </button>
              ))}
              {(Object.keys(TEMPOS) as Tempo[]).map((t) => (
                <button
                  key={t}
                  onClick={() => agirBanc(() => ajusterTactique(match.etat, match.monCamp, { tempo: t }))}
                  className={`rounded-lg border px-3 py-2 font-mono text-[11px] transition-colors ${
                    moi.tempo === t ? "border-accent bg-accent-doux text-accent" : "border-bordure text-doux hover:border-accent"
                  }`}
                >
                  {TEMPOS[t].libelle}
                </button>
              ))}
              <button
                onClick={() =>
                  agirBanc(() => ajusterTactique(match.etat, match.monCamp, { gardienVolant: !moi.gardienVolant }))
                }
                className={`rounded-lg border px-3 py-2 font-mono text-[11px] transition-colors ${
                  moi.gardienVolant ? "border-accent bg-accent-doux text-accent" : "border-bordure text-doux hover:border-accent"
                }`}
              >
                Gardien volant
              </button>
            </div>

            {message ? <p className="mt-2 text-[13px] text-mauvais">{message}</p> : null}
            <p className="sous-titre mt-4 mb-2">
              Sur le terrain — cliquez un joueur, puis son remplaçant
            </p>
            <ul className="space-y-1">
              {[...(moi.gardien ? [moi.gardien] : []), ...moi.champ].map((j) => (
                <LigneJoueur
                  key={j.id}
                  joueur={j}
                  surTerrain
                  selectionne={selection === j.id}
                  onClick={() => cliquerJoueur(j, true)}
                />
              ))}
            </ul>
            <p className="sous-titre mt-4 mb-2">Sur le banc</p>
            <ul className="space-y-1">
              {moi.banc.map((j) => (
                <LigneJoueur
                  key={j.id}
                  joueur={j}
                  surTerrain={false}
                  selectionne={false}
                  onClick={() => cliquerJoueur(j, false)}
                />
              ))}
            </ul>
          </section>

          <div className="space-y-4">
            <section className="carte">
              <h2 className="titre-carte">En face — {adverse.nom}</h2>
              <p className="sous-titre mb-3">Ce qu&apos;ils montrent sur le terrain</p>
              <dl className="space-y-1 text-sm">
                <LigneInfo terme="Défense" valeur={SYSTEMES[adverse.systeme].libelle} />
                <LigneInfo terme="Rythme" valeur={TEMPOS[adverse.tempo].libelle} />
                <LigneInfo
                  terme="Exclusions en cours"
                  valeur={String(adverse.banc.filter((j) => j.exclusJusqua !== null).length)}
                />
                <LigneInfo
                  terme="Leur gardien"
                  valeur={
                    adverse.gardien && adverse.gardien.tirsSubis > 0
                      ? `${adverse.gardien.nom} — ${Math.round((adverse.gardien.arrets / adverse.gardien.tirsSubis) * 100)} % d'arrêts`
                      : "—"
                  }
                />
                <LigneInfo
                  terme="Votre gardien"
                  valeur={
                    moi.gardien && moi.gardien.tirsSubis > 0
                      ? `${moi.gardien.nom} — ${Math.round((moi.gardien.arrets / moi.gardien.tirsSubis) * 100)} % d'arrêts`
                      : "—"
                  }
                />
              </dl>
              <p className="mt-3 rounded-lg border border-bordure bg-surface-2 p-3 text-[13px] text-doux">
                {conseilContre(adverse.systeme)}
              </p>
            </section>

            <section className="carte">
              <h2 className="titre-carte">Le fil</h2>
              <p className="sous-titre mb-2">{vue.evenements.length} événements</p>
              <div className="max-h-[360px] overflow-y-auto rounded-lg border border-bordure">
                {[...vue.evenements]
                  .slice(-40)
                  .reverse()
                  .map((e, i) => (
                    <div key={i} className="flex gap-3 border-b border-bordure px-3 py-1.5 text-[13px] last:border-b-0">
                      <span className="w-8 shrink-0 font-mono text-[11px] tabular-nums text-doux">
                        {Math.floor(e.seconde / 60)}′
                      </span>
                      <span className={couleurEvenement(e.type, e.camp === match.monCamp)}>{e.texte}</span>
                    </div>
                  ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------ avant match */

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

  const lancer = () => {
    const match = ouvrirMatch(partie, idx);
    if (!match) return;
    matchRef.current = match;
    memoireRef.current = creerMemoirePilote();
    dernierPilotageRef.current = 0;
    cibleRef.current = 0;
    setSelection(null);
    setMessage(null);
    setEnPause(false);
    setVue(apercuMatch(match.etat));
  };

  return (
    <div className="space-y-5" key={version}>
      <section className="carte">
        <h1 className="titre-carte">Journée {suivant.journee + 1}</h1>
        <p className="sous-titre mb-4">{chezMoi ? "À domicile" : "À l'extérieur"}</p>

        <div className="flex flex-wrap items-center justify-center gap-8 py-3">
          <div className="text-center">
            <Ecusson club={chezMoi ? club : adversaire} taille={64} />
            <p className="mt-2 font-titre text-lg font-bold">{(chezMoi ? club : adversaire).nom}</p>
            <p className="sous-titre">
              force {forceClub(idx.effectifParClub.get(chezMoi ? club.id : adversaire.id)!).toFixed(0)}
            </p>
          </div>
          <span className="font-titre text-doux">VS</span>
          <div className="text-center">
            <Ecusson club={chezMoi ? adversaire : club} taille={64} />
            <p className="mt-2 font-titre text-lg font-bold">{(chezMoi ? adversaire : club).nom}</p>
            <p className="sous-titre">
              force {forceClub(idx.effectifParClub.get(chezMoi ? adversaire.id : club.id)!).toFixed(0)}
            </p>
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
          <button className="bouton-principal flex-1" onClick={lancer}>
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
            <LigneInfo terme="Défense habituelle" valeur={SYSTEMES[adversaire.tactique.systeme].libelle} />
            <LigneInfo
              terme="Joueur à surveiller"
              valeur={rapport.dangereux ? `${rapport.dangereux.prenom} ${rapport.dangereux.nom} (${rapport.dangereux.poste})` : "—"}
            />
            <LigneInfo terme="Classement" valeur={rapport.rang ? `${rapport.rang}e` : "—"} />
          </dl>
          <p className="mt-3 rounded-lg border border-accent bg-accent-doux p-3 text-sm">{rapport.conseil}</p>
        </div>

        <div className="carte">
          <h2 className="titre-carte">Votre plan</h2>
          <p className="sous-titre mb-3">Modifiable jusqu&apos;au coup d&apos;envoi, et pendant le match</p>
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

/* ------------------------------------------------------------- composants */

function LigneJoueur({
  joueur,
  surTerrain,
  selectionne,
  onClick,
}: {
  joueur: ApercuJoueur;
  surTerrain: boolean;
  selectionne: boolean;
  onClick: () => void;
}) {
  const exclu = joueur.exclusJusqua !== null;
  const couleur = joueur.condition > 70 ? "var(--bon)" : joueur.condition > 45 ? "var(--moyen)" : "var(--mauvais)";
  return (
    <li>
      <button
        onClick={onClick}
        disabled={exclu || joueur.disqualifie}
        className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
          selectionne ? "border-accent bg-accent-doux" : "border-bordure bg-surface hover:border-accent"
        } ${exclu || joueur.disqualifie ? "opacity-50" : ""}`}
      >
        <span className="w-10 shrink-0 font-mono text-[10px] text-doux">
          {joueur.posteJoue ?? joueur.posteNaturel}
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{joueur.nom}</span>
        {joueur.exclusionsSubies > 0 ? (
          <span className="puce text-mauvais">{joueur.exclusionsSubies} × 2′</span>
        ) : null}
        {surTerrain && joueur.buts > 0 ? <span className="puce">{joueur.buts} buts</span> : null}
        {joueur.disqualifie ? <span className="puce text-mauvais">sorti</span> : null}
        {exclu ? <span className="puce text-mauvais">exclu</span> : null}
        <span className="w-16 shrink-0">
          <span className="block h-1.5 overflow-hidden rounded border border-bordure bg-surface-2">
            <span className="block h-full" style={{ width: `${joueur.condition}%`, background: couleur }} />
          </span>
        </span>
        <span className="w-7 shrink-0 text-right font-mono text-[11px] tabular-nums text-doux">
          {Math.round(joueur.secondes / 60)}′
        </span>
      </button>
    </li>
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

function conseilContre(systeme: SystemeDefensif): string {
  if (systeme === "6-0") return "Bloc bas : prenez votre temps, faites circuler. Se jeter dessus, c'est tirer dans le mur.";
  if (systeme === "3-2-1") return "Défense haute : attaquez vite, avant qu'elle soit replacée. Garder le ballon, c'est le perdre.";
  return "Défense intermédiaire : aucun réglage n'est puni, aucun n'est récompensé.";
}

function couleurEvenement(type: string, estMoi: boolean): string {
  if (type === "but") return estMoi ? "text-accent font-semibold" : "text-accent-2 font-semibold";
  if (type === "exclusion") return "text-mauvais";
  if (type === "arret") return "text-bon";
  if (type === "tempsMort" || type === "gardienVolant") return "text-moyen";
  if (type === "coupEnvoi" || type === "miTemps" || type === "fin") return "text-doux italic";
  return "text-doux";
}
