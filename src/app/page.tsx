"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Ecusson } from "@/composants/ecusson";
import { usePartie } from "@/jeu/etat";
import { monClub } from "@/jeu/partie";
import { creerMonde, forceClub, indexer } from "@/moteur/monde";
import type { StyleClub } from "@/moteur/types";

const LIBELLE_STYLE: Record<StyleClub, string> = {
  distance: "Gros arrières",
  interieur: "Jeu intérieur",
  equilibre: "Équilibré",
};

export default function Accueil() {
  const { partie, idx, chargement, demarrer, abandonner } = usePartie();
  const [manager, setManager] = useState("");
  const [graine] = useState(() => Math.floor(Math.random() * 100000));
  const [divisionActive, setDivisionActive] = useState("d1");

  // Le monde de prévisualisation est celui qui sera joué : même graine.
  const apercu = useMemo(() => {
    const monde = creerMonde(graine);
    const index = indexer(monde);
    return { monde, index };
  }, [graine]);

  if (chargement) {
    return <p className="text-doux">Chargement de la sauvegarde…</p>;
  }

  if (partie && idx) {
    const club = monClub(partie, idx);
    const journees = partie.saison.calendrier.length;
    return (
      <div className="space-y-5">
        <section className="carte flex flex-wrap items-center gap-5">
          <Ecusson club={club} taille={64} />
          <div className="flex-1">
            <h1 className="font-titre text-2xl font-bold">{club.nom}</h1>
            <p className="text-doux">
              {partie.manager} · {idx.divisionParId.get(club.divisionId)?.nom} · journée{" "}
              {Math.min(partie.saison.journeeCourante + 1, journees)} sur {journees}
            </p>
          </div>
          <Link href="/club" className="bouton-principal">
            Reprendre la partie
          </Link>
        </section>
        <section className="carte">
          <h2 className="titre-carte">Recommencer</h2>
          <p className="sous-titre mb-3">La sauvegarde actuelle sera définitivement perdue</p>
          <button
            className="bouton"
            onClick={() => {
              if (confirm("Abandonner la partie en cours ? La sauvegarde sera effacée.")) abandonner();
            }}
          >
            Abandonner et choisir un autre club
          </button>
        </section>
      </div>
    );
  }

  const division = apercu.monde.divisions.find((d) => d.id === divisionActive)!;

  return (
    <div className="space-y-6">
      <section className="carte">
        <p className="sous-titre">Prototype jouable</p>
        <h1 className="mt-1 font-titre text-3xl font-bold">Demi-Centre</h1>
        <p className="mt-2 max-w-2xl text-doux">
          Trois divisions, 42 clubs, 756 joueurs : un monde fictif généré une fois et conservé. Chaque
          match — le vôtre comme ceux des autres clubs — passe par le même moteur, possession par
          possession.
        </p>
      </section>

      <section className="carte">
        <h2 className="titre-carte">Votre nom</h2>
        <p className="sous-titre mb-3">Il apparaîtra sur la fiche du club</p>
        <input
          className="champ max-w-sm"
          placeholder="Nom du manager"
          value={manager}
          onChange={(e) => setManager(e.target.value)}
          maxLength={40}
        />
      </section>

      <section className="carte">
        <h2 className="titre-carte">Choisissez un club</h2>
        <p className="sous-titre mb-4">
          La force est calculée sur l&apos;effectif réellement généré — pas un curseur de difficulté
        </p>

        <div className="mb-4 flex flex-wrap gap-2">
          {apercu.monde.divisions.map((d) => (
            <button
              key={d.id}
              onClick={() => setDivisionActive(d.id)}
              className={`rounded-full border px-4 py-1.5 font-titre text-[13px] font-semibold transition-colors ${
                d.id === divisionActive
                  ? "border-accent bg-accent text-fond"
                  : "border-bordure bg-surface text-doux hover:border-accent hover:text-accent"
              }`}
            >
              {d.nom}
            </button>
          ))}
        </div>

        <ul className="grid gap-2 sm:grid-cols-2">
          {division.clubIds.map((clubId) => {
            const club = apercu.index.clubParId.get(clubId)!;
            const force = forceClub(apercu.index.effectifParClub.get(clubId)!);
            return (
              <li key={clubId}>
                <button
                  onClick={() => demarrer(clubId, manager, graine)}
                  className="flex w-full items-center gap-3 rounded-lg border border-bordure bg-surface p-3 text-left transition-colors hover:border-accent"
                >
                  <Ecusson club={club} taille={38} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{club.nom}</span>
                    <span className="sous-titre block">
                      {club.ville} · {LIBELLE_STYLE[club.style]}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block font-titre text-lg font-bold tabular-nums">{force.toFixed(0)}</span>
                    <span className="sous-titre block">Force</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
