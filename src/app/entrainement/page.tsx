"use client";

import { useState } from "react";

import { Jauge } from "@/composants/affichage";
import { InviteNouvellePartie } from "@/composants/invite";
import { usePartie } from "@/jeu/etat";
import { contexteProgression, monClub } from "@/jeu/partie";
import { noteJoueur } from "@/moteur/attributs";
import { FOCUS, INTENSITES } from "@/moteur/entrainement";
import { partsProgression, progressionAttendue } from "@/moteur/evolution";
import { LIBELLES_POSTE, type FocusEntrainement, type IntensiteEntrainement, type Joueur } from "@/moteur/types";

export default function PageEntrainement() {
  const { partie, idx, version, agir } = usePartie();
  const [ouvert, setOuvert] = useState<string | null>(null);
  if (!partie || !idx) return <InviteNouvellePartie />;

  const club = monClub(partie, idx);
  const effectif = [...(idx.effectifParClub.get(club.id) ?? [])];
  const seance = club.entrainement;
  const rapport = partie.entrainements[0] ?? null;
  const stats = partie.saison.statsJoueurs;

  const changer = (modif: Partial<typeof seance>) =>
    agir((p, index) => {
      const c = index.clubParId.get(p.clubId)!;
      c.entrainement = { ...c.entrainement, ...modif };
    });

  const lignes = effectif
    .map((j) => {
      const ctx = contexteProgression(partie, idx, j);
      const parts = partsProgression(ctx);
      return {
        j,
        ctx,
        parts,
        note: noteJoueur(j),
        marge: Math.max(0, j.potentiel - noteJoueur(j)),
        noteMatch: stats[j.id]?.matchs ? stats[j.id].noteCumulee / stats[j.id].matchs : null,
        attendu: progressionAttendue(j, ctx),
      };
    })
    .sort((a, b) => b.attendu - a.attendu);

  const joueurOuvert = lignes.find((l) => l.j.id === ouvert) ?? null;
  const entraines = effectif.filter((j) => j.semainesEntrainement > 0);
  const implicationMoyenne = entraines.length
    ? entraines.reduce((s, j) => s + j.implication, 0) / entraines.length
    : null;

  return (
    <div className="space-y-5" key={version}>
      <section className="carte">
        <h1 className="titre-carte">Ce qu&apos;on travaille</h1>
        <p className="sous-titre mb-4">
          Une séance par semaine, avant le match. Ce que vous travaillez est ce qui progresse : les
          attributs de l&apos;axe choisi montent près de trois fois plus vite que les autres.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(FOCUS) as FocusEntrainement[]).map((cle) => (
            <Option
              key={cle}
              actif={seance.focus === cle}
              titre={FOCUS[cle].libelle}
              texte={FOCUS[cle].description}
              onClick={() => changer({ focus: cle })}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[3fr_2fr]">
        <div className="carte">
          <h2 className="titre-carte">À quelle intensité</h2>
          <p className="sous-titre mb-4">La fraîcheur du jour de match se joue ici</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {(Object.keys(INTENSITES) as IntensiteEntrainement[]).map((cle) => (
              <Option
                key={cle}
                actif={seance.intensite === cle}
                titre={INTENSITES[cle].libelle}
                texte={INTENSITES[cle].description}
                onClick={() => changer({ intensite: cle })}
              />
            ))}
          </div>
          <p className="mt-3 font-mono text-[11px] text-doux">
            rendement × {INTENSITES[seance.intensite].rendement.toFixed(2)} · condition{" "}
            {INTENSITES[seance.intensite].condition > 0 ? "+" : ""}
            {INTENSITES[seance.intensite].condition} par semaine · risque de blessure ×{" "}
            {INTENSITES[seance.intensite].risque.toFixed(1)}
          </p>
        </div>
        <div className="carte">
          <h2 className="titre-carte">Implication de l&apos;effectif</h2>
          <p className="sous-titre mb-3">Moyenne du groupe depuis le début de la saison</p>
          <p className="font-titre text-4xl font-bold tabular-nums">
            {implicationMoyenne === null ? "—" : implicationMoyenne.toFixed(1)}
            <span className="ml-1 text-base font-normal text-doux">/ 10</span>
          </p>
          <p className="mt-3 text-[13px] text-doux">
            L&apos;implication n&apos;est pas un réglage : elle vient de la discipline du joueur, de son
            moral, de son âge et de ce qu&apos;il lui reste à prouver. Un groupe appliqué progresse, un
            groupe démobilisé stagne — et on ne s&apos;applique pas quand on court déjà sur les jambes.
          </p>
        </div>
      </section>

      {rapport ? (
        <section className="carte">
          <h2 className="titre-carte">Séance de la semaine {rapport.journee + 1}</h2>
          <p className="sous-titre mb-3">
            {FOCUS[rapport.focus].libelle} · intensité {INTENSITES[rapport.intensite].libelle.toLowerCase()} ·
            note d&apos;implication de chaque joueur à la séance
          </p>
          <div className="overflow-x-auto">
            <table className="tableau min-w-[520px]">
              <thead>
                <tr>
                  <th>Joueur</th>
                  <th>Poste</th>
                  <th className="num">Implication</th>
                  <th>Condition après séance</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rapport.lignes.map((l) => (
                  <tr key={l.joueurId}>
                    <td className="whitespace-nowrap font-medium">{l.nom}</td>
                    <td className="whitespace-nowrap text-doux">{LIBELLES_POSTE[l.poste]}</td>
                    <td className={`num font-semibold ${couleurNote(l.implication)}`}>
                      {l.implication > 0 ? l.implication.toFixed(1) : "—"}
                    </td>
                    <td className="w-32">
                      <Jauge libelle="" valeur={l.condition} />
                    </td>
                    <td className="text-[12px] text-mauvais">
                      {l.blesse ? (l.implication > 0 ? "sorti sur blessure" : "à l'infirmerie") : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="carte">
          <h2 className="titre-carte">Séance de la semaine</h2>
          <p className="text-sm text-doux">
            Aucune séance encore tenue cette saison. Elle se joue au moment où vous ouvrez le match de la
            journée.
          </p>
        </section>
      )}

      <section className="carte">
        <h2 className="titre-carte">Progression attendue</h2>
        <p className="sous-titre mb-4">
          Trois entrées, toutes visibles : ce qu&apos;il reste à combler avant le potentiel, l&apos;implication
          à l&apos;entraînement, et ce qui se passe en match — minutes et note. Cliquez une ligne pour le
          détail du calcul.
        </p>
        <div className="overflow-x-auto">
          <table className="tableau min-w-[760px]">
            <thead>
              <tr>
                <th>Joueur</th>
                <th className="num">Âge</th>
                <th className="num">Note</th>
                <th className="num">Pot.</th>
                <th className="num">Marge</th>
                <th className="num">Min</th>
                <th className="num">Note match</th>
                <th className="num">Implication</th>
                <th className="num">Saison</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((l) => (
                <tr
                  key={l.j.id}
                  onClick={() => setOuvert(l.j.id === ouvert ? null : l.j.id)}
                  className={`cursor-pointer transition-colors hover:bg-surface-2 ${
                    l.j.id === ouvert ? "bg-surface-2" : ""
                  }`}
                >
                  <td className="whitespace-nowrap font-medium">
                    {l.j.prenom} {l.j.nom}
                  </td>
                  <td className="num">{l.j.age}</td>
                  <td className="num font-semibold">{l.note.toFixed(1)}</td>
                  <td className="num text-doux">{l.j.potentiel.toFixed(1)}</td>
                  <td className="num">{l.marge > 0 ? `+${l.marge.toFixed(1)}` : "—"}</td>
                  <td className="num text-doux">{Math.round(l.ctx.minutes)}</td>
                  <td className={`num ${l.noteMatch === null ? "text-doux" : couleurNote(l.noteMatch)}`}>
                    {l.noteMatch === null ? "—" : l.noteMatch.toFixed(2)}
                  </td>
                  <td className={`num ${l.j.semainesEntrainement ? couleurNote(l.j.implication) : "text-doux"}`}>
                    {l.j.semainesEntrainement ? l.j.implication.toFixed(1) : "—"}
                  </td>
                  <td className={`num font-semibold ${l.attendu > 0.1 ? "text-bon" : l.attendu < -0.1 ? "text-mauvais" : "text-doux"}`}>
                    {l.attendu > 0 ? "+" : ""}
                    {l.attendu.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {joueurOuvert ? <DetailProgression ligne={joueurOuvert} /> : null}
      </section>
    </div>
  );
}

function DetailProgression({
  ligne,
}: {
  ligne: {
    j: Joueur;
    ctx: { minutes: number; noteMatch: number; implication: number };
    parts: { partJeu: number; partImplication: number; partNote: number; elan: number };
    marge: number;
    attendu: number;
  };
}) {
  const { j, parts, ctx } = ligne;
  return (
    <div className="mt-4 rounded-lg border border-bordure bg-surface-2 p-4">
      <p className="font-titre text-[15px] font-bold">
        {j.prenom} {j.nom} — {LIBELLES_POSTE[j.poste]}, {j.age} ans
      </p>
      <div className="mt-3 grid gap-4 sm:grid-cols-3">
        <Part
          titre="Temps de jeu"
          valeur={`${Math.round(ctx.minutes)} min`}
          part={parts.partJeu}
          texte="Une saison pleine de titulaire, c'est environ 900 minutes. Un joueur qui ne joue pas ne progresse presque pas, quel que soit son talent."
        />
        <Part
          titre="Implication"
          valeur={`${ctx.implication.toFixed(1)} / 10`}
          part={parts.partImplication}
          texte="Au-dessus de 5,5 elle accélère la progression, en dessous elle la freine. Elle se lit semaine après semaine sur le rapport de séance."
        />
        <Part
          titre="Note de match"
          valeur={`${ctx.noteMatch.toFixed(2)} / 10`}
          part={parts.partNote}
          texte="Calculée sur sa ligne de statistiques : efficacité au tir pour son poste, ballons gagnés et perdus, contres, exclusions. Son poids grandit avec le temps de jeu."
        />
      </div>
      <p className="mt-4 text-[13px] text-doux">
        Élan de progression : <b className="text-texte">{(parts.elan * 100).toFixed(0)} %</b> de la marge
        restante {j.age <= 23 ? "" : j.age <= 28 ? "(divisée par deux passé 24 ans)" : ""} ·{" "}
        {j.age >= 29
          ? "passé 29 ans, la marge ne se comble plus : le physique recule, et seule l'implication ralentit la chute."
          : `marge restante ${ligne.marge.toFixed(1)} point(s) de note, soit une saison à ${ligne.attendu > 0 ? "+" : ""}${ligne.attendu.toFixed(2)}.`}
      </p>
    </div>
  );
}

function Part({ titre, valeur, part, texte }: { titre: string; valeur: string; part: number; texte: string }) {
  const largeur = Math.min(100, Math.abs(part) * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="sous-titre">{titre}</span>
        <b className="font-mono text-[13px] tabular-nums">{valeur}</b>
      </div>
      <div className="mt-1 flex h-1.5 overflow-hidden rounded bg-surface">
        <span
          className="h-full"
          style={{ width: `${largeur}%`, background: part >= 0 ? "var(--bon)" : "var(--mauvais)" }}
        />
      </div>
      <p className="mt-2 text-[12px] text-doux">{texte}</p>
    </div>
  );
}

function couleurNote(note: number) {
  if (note >= 7) return "text-bon";
  if (note < 5) return "text-mauvais";
  return "";
}

function Option({
  actif,
  titre,
  texte,
  onClick,
}: {
  actif: boolean;
  titre: string;
  texte: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border p-4 text-left transition-colors ${
        actif ? "border-accent bg-accent-doux" : "border-bordure bg-surface hover:border-accent"
      }`}
    >
      <b className="font-titre text-[15px]">{titre}</b>
      <span className="mt-1 block text-[13px] text-doux">{texte}</span>
    </button>
  );
}
