"use client";

import { useMemo, useState } from "react";

import { BarreAttribut, Jauge, minutes } from "@/composants/affichage";
import { InviteNouvellePartie } from "@/composants/invite";
import { Radar } from "@/composants/radar";
import { usePartie } from "@/jeu/etat";
import { monClub } from "@/jeu/partie";
import { clesUtiles, noteJoueur } from "@/moteur/attributs";
import { LIBELLES_POSTE, POSTES, type Joueur, type Poste } from "@/moteur/types";

type Tri = "poste" | "note" | "age" | "buts" | "condition";

export default function PageEffectif() {
  const { partie, idx, version } = usePartie();
  const [filtre, setFiltre] = useState<Poste | "tous">("tous");
  const [tri, setTri] = useState<Tri>("poste");
  const [ouvert, setOuvert] = useState<string | null>(null);

  const effectif = useMemo(() => {
    if (!partie || !idx) return [];
    return [...(idx.effectifParClub.get(partie.clubId) ?? [])];
  }, [partie, idx, version]);

  if (!partie || !idx) return <InviteNouvellePartie />;

  const club = monClub(partie, idx);
  const stats = partie.saison.statsJoueurs;
  const liste = effectif
    .filter((j) => filtre === "tous" || j.poste === filtre)
    .sort((a, b) => {
      switch (tri) {
        case "note":
          return noteJoueur(b) - noteJoueur(a);
        case "age":
          return a.age - b.age;
        case "buts":
          return (stats[b.id]?.buts ?? 0) - (stats[a.id]?.buts ?? 0);
        case "condition":
          return a.condition - b.condition;
        default:
          return POSTES.indexOf(a.poste) - POSTES.indexOf(b.poste) || noteJoueur(b) - noteJoueur(a);
      }
    });

  const joueurOuvert = effectif.find((j) => j.id === ouvert) ?? null;
  const sept = new Set(Object.values(club.tactique.sept));

  return (
    <div className="space-y-5" key={version}>
      <section className="carte">
        <h1 className="titre-carte">Effectif</h1>
        <p className="sous-titre mb-4">
          {effectif.length} joueurs · cliquez une ligne pour la fiche complète
        </p>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          {(["tous", ...POSTES] as const).map((p) => (
            <button
              key={p}
              onClick={() => setFiltre(p)}
              className={`rounded-full border px-3 py-1 font-mono text-[11px] transition-colors ${
                filtre === p ? "border-accent bg-accent text-fond" : "border-bordure bg-surface text-doux hover:border-accent"
              }`}
            >
              {p === "tous" ? "Tous" : p}
            </button>
          ))}
          <span className="ml-auto flex items-center gap-2">
            <label className="sous-titre" htmlFor="tri">
              Trier par
            </label>
            <select id="tri" className="champ w-auto py-1 text-xs" value={tri} onChange={(e) => setTri(e.target.value as Tri)}>
              <option value="poste">Poste</option>
              <option value="note">Note</option>
              <option value="age">Âge</option>
              <option value="buts">Buts</option>
              <option value="condition">Condition</option>
            </select>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="tableau min-w-[720px]">
            <thead>
              <tr>
                <th>#</th>
                <th>Joueur</th>
                <th>Poste</th>
                <th className="num">Âge</th>
                <th className="num">Note</th>
                <th className="num">Pot.</th>
                <th>Condition</th>
                <th className="num">M</th>
                <th className="num">Buts</th>
                <th className="num">Min</th>
              </tr>
            </thead>
            <tbody>
              {liste.map((j) => {
                const s = stats[j.id];
                const indisponible = j.blessureJours > 0;
                return (
                  <tr
                    key={j.id}
                    onClick={() => setOuvert(j.id === ouvert ? null : j.id)}
                    className={`cursor-pointer transition-colors hover:bg-surface-2 ${
                      j.id === ouvert ? "bg-surface-2" : ""
                    } ${indisponible ? "opacity-55" : ""}`}
                  >
                    <td className="font-mono text-[11px] text-doux">{j.numero}</td>
                    <td className="font-medium whitespace-nowrap">
                      {j.prenom} {j.nom}
                      {sept.has(j.id) ? <span className="puce ml-2">Titulaire</span> : null}
                      {indisponible ? <span className="puce ml-2 text-mauvais">{j.blessureJours} j</span> : null}
                      {j.main === "gaucher" ? <span className="puce ml-2">Gaucher</span> : null}
                    </td>
                    <td className="whitespace-nowrap">{LIBELLES_POSTE[j.poste]}</td>
                    <td className="num">{j.age}</td>
                    <td className="num font-semibold">{noteJoueur(j).toFixed(1)}</td>
                    <td className="num text-doux">{j.potentiel.toFixed(1)}</td>
                    <td className="w-28">
                      <Jauge libelle="" valeur={j.condition} />
                    </td>
                    <td className="num">{s?.matchs ?? 0}</td>
                    <td className="num">{s?.buts ?? 0}</td>
                    <td className="num text-doux">{s ? minutes(s.secondes) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {joueurOuvert ? <FicheJoueur joueur={joueurOuvert} stats={stats[joueurOuvert.id]} /> : null}
    </div>
  );
}

function FicheJoueur({
  joueur,
  stats,
}: {
  joueur: Joueur;
  stats?: { matchs: number; buts: number; tirs: number; secondes: number; arrets: number; tirsSubis: number; exclusions: number; pertes: number };
}) {
  const cles = clesUtiles(joueur.poste);
  const valeurs = cles.map((c) => joueur.attributs[c]);
  const reussite = stats && stats.tirs > 0 ? Math.round((stats.buts / stats.tirs) * 100) : null;
  const arrets = stats && stats.tirsSubis > 0 ? Math.round((stats.arrets / stats.tirsSubis) * 100) : null;

  return (
    <section className="carte">
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 className="font-titre text-xl font-bold">
          {joueur.prenom} {joueur.nom}
        </h2>
        <span className="puce">{LIBELLES_POSTE[joueur.poste]}</span>
        {joueur.posteSecondaire ? <span className="puce">dépanne {joueur.posteSecondaire}</span> : null}
        <span className="puce">{joueur.main}</span>
        <span className="text-doux">{joueur.age} ans</span>
        <span className="ml-auto text-right">
          <span className="block font-titre text-2xl font-bold">{noteJoueur(joueur).toFixed(1)}</span>
          <span className="sous-titre">Note sur 20</span>
        </span>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[260px_1fr_220px]">
        <Radar cles={cles} valeurs={valeurs} />
        <div className="space-y-2">
          {cles.map((c) => (
            <BarreAttribut key={c} cle={c} valeur={joueur.attributs[c]} />
          ))}
        </div>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Jauge libelle="Condition" valeur={joueur.condition} />
            <Jauge libelle="Moral" valeur={joueur.moral} />
          </div>
          <dl className="space-y-1 text-sm">
            <Detail terme="Potentiel" valeur={`${joueur.potentiel.toFixed(1)} / 20`} />
            <Detail terme="Forme" valeur={["très mauvaise", "mauvaise", "moyenne", "correcte", "bonne", "très bonne", "en feu"][joueur.forme + 3]} />
            <Detail terme="Salaire" valeur={`${joueur.salaire.toLocaleString("fr-FR")} € / mois`} />
            <Detail terme="Contrat" valeur={`jusqu'en ${joueur.saisonFinContrat}`} />
            {stats ? (
              <>
                <Detail terme="Matchs joués" valeur={`${stats.matchs} · ${minutes(stats.secondes)}`} />
                {joueur.poste === "GB" ? (
                  <Detail terme="Arrêts" valeur={`${stats.arrets}${arrets !== null ? ` · ${arrets} %` : ""}`} />
                ) : (
                  <Detail terme="Buts" valeur={`${stats.buts} / ${stats.tirs} tirs${reussite !== null ? ` · ${reussite} %` : ""}`} />
                )}
                <Detail terme="Pertes de balle" valeur={String(stats.pertes)} />
                <Detail terme="Exclusions" valeur={String(stats.exclusions)} />
              </>
            ) : null}
          </dl>
        </div>
      </div>
    </section>
  );
}

function Detail({ terme, valeur }: { terme: string; valeur: string }) {
  return (
    <div className="flex justify-between gap-3 border-t border-bordure py-1.5 first:border-t-0">
      <dt className="sous-titre">{terme}</dt>
      <dd className="text-right">{valeur}</dd>
    </div>
  );
}
