"use client";

import Link from "next/link";

import { InviteNouvellePartie } from "@/composants/invite";
import { usePartie } from "@/jeu/etat";
import { monClub, monProchainMatch } from "@/jeu/partie";
import { observer } from "@/jeu/observation";
import { noteJoueur } from "@/moteur/attributs";
import { valeurPour as valeurPoste } from "@/moteur/monde";
import { SYSTEMES, TEMPOS } from "@/moteur/match/parametres";
import {
  LIBELLES_POSTE,
  POSTES,
  type ConsigneRotation,
  type Poste,
  type SystemeDefensif,
  type Tempo,
} from "@/moteur/types";

const ROTATIONS: Record<ConsigneRotation, { libelle: string; description: string }> = {
  titulaires: {
    libelle: "Titulaires au maximum",
    description: "On ne change qu'au bout du rouleau. Le meilleur sept reste sur le terrain, et le paie en fin de match.",
  },
  equilibre: {
    libelle: "Rotation normale",
    description: "On sort les joueurs entamés. Le compromis raisonnable sur une saison de 26 journées.",
  },
  large: {
    libelle: "Faire tourner large",
    description: "Le banc joue beaucoup. Moins fort sur un match, mais l'effectif reste frais et se blesse moins.",
  },
};

export default function PageTactique() {
  const { partie, idx, version, agir } = usePartie();
  if (!partie || !idx) return <InviteNouvellePartie />;

  const club = monClub(partie, idx);
  const effectif = idx.effectifParClub.get(club.id) ?? [];
  const tactique = club.tactique;
  const suivant = monProchainMatch(partie);
  const adversaireId = suivant
    ? suivant.rencontre.domicileId === club.id
      ? suivant.rencontre.exterieurId
      : suivant.rencontre.domicileId
    : null;
  const rapport = adversaireId ? observer(partie.monde, idx, adversaireId, partie.saison) : null;

  const changer = (modif: Partial<typeof tactique>) =>
    agir((p, index) => {
      const c = index.clubParId.get(p.clubId)!;
      c.tactique = { ...c.tactique, ...modif };
    });

  const choisirPoste = (poste: Poste, joueurId: string) =>
    agir((p, index) => {
      const c = index.clubParId.get(p.clubId)!;
      const sept = { ...c.tactique.sept };
      // Si le joueur occupait déjà un autre poste, on échange les deux.
      const posteActuel = (Object.keys(sept) as Poste[]).find((x) => sept[x] === joueurId);
      if (posteActuel) sept[posteActuel] = sept[poste];
      sept[poste] = joueurId;
      c.tactique = { ...c.tactique, sept };
    });

  const noteSept =
    POSTES.reduce((s, poste) => {
      const j = idx.joueurParId.get(tactique.sept[poste]);
      return s + (j ? valeurPoste(j, poste) : 0);
    }, 0) / POSTES.length;

  return (
    <div className="space-y-5" key={version}>
      <section className="carte">
        <h1 className="titre-carte">Système défensif</h1>
        <p className="sous-titre mb-4">
          {rapport
            ? `Contre ${rapport.nom} — ${rapport.profil.toLowerCase()}. ${rapport.conseil}`
            : "Aucun match à préparer"}
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {(Object.keys(SYSTEMES) as SystemeDefensif[]).map((cle) => (
            <Option
              key={cle}
              actif={tactique.systeme === cle}
              recommande={rapport?.systemeConseille === cle}
              titre={SYSTEMES[cle].libelle}
              texte={SYSTEMES[cle].description}
              onClick={() => changer({ systeme: cle })}
            />
          ))}
        </div>
      </section>

      <section className="carte">
        <h2 className="titre-carte">Rythme de jeu</h2>
        <p className="sous-titre mb-4">Le tempo qui convient à vos joueurs, pas le « meilleur » tempo</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {(Object.keys(TEMPOS) as Tempo[]).map((cle) => (
            <Option
              key={cle}
              actif={tactique.tempo === cle}
              titre={TEMPOS[cle].libelle}
              texte={TEMPOS[cle].description}
              onClick={() => changer({ tempo: cle })}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[2fr_1fr]">
        <div className="carte">
          <h2 className="titre-carte">Gestion du banc</h2>
          <p className="sous-titre mb-4">Les minutes sont une ressource : elles usent et elles font progresser</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {(Object.keys(ROTATIONS) as ConsigneRotation[]).map((cle) => (
              <Option
                key={cle}
                actif={tactique.rotation === cle}
                titre={ROTATIONS[cle].libelle}
                texte={ROTATIONS[cle].description}
                onClick={() => changer({ rotation: cle })}
              />
            ))}
          </div>
        </div>
        <div className="carte">
          <h2 className="titre-carte">Gardien volant</h2>
          <p className="sous-titre mb-3">Sept contre six dans les cinq dernières minutes</p>
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-[var(--accent)]"
              checked={tactique.gardienVolant}
              onChange={(e) => changer({ gardienVolant: e.target.checked })}
            />
            <span>
              Sortir le gardien quand on est mené en fin de match. Un joueur de plus en attaque — et un but
              vide à chaque ballon perdu.
            </span>
          </label>
        </div>
      </section>

      <section className="carte">
        <h2 className="titre-carte">Composition</h2>
        <p className="sous-titre mb-4">
          Note moyenne du sept aligné : {noteSept.toFixed(1)} / 20
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {POSTES.map((poste) => {
            const candidats = effectif
              .filter((j) => j.blessureJours <= 0 || j.id === tactique.sept[poste])
              .sort((a, b) => valeurPoste(b, poste) - valeurPoste(a, poste));
            const choisi = idx.joueurParId.get(tactique.sept[poste]);
            return (
              <div key={poste} className="rounded-lg border border-bordure bg-surface-2 p-3">
                <div className="sous-titre mb-2">{LIBELLES_POSTE[poste]}</div>
                <select
                  className="champ text-[13px]"
                  value={tactique.sept[poste] ?? ""}
                  onChange={(e) => choisirPoste(poste, e.target.value)}
                >
                  {candidats.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.prenom.charAt(0)}. {j.nom} — {noteJoueur(j).toFixed(1)}
                      {j.poste !== poste ? ` (${j.poste})` : ""}
                      {j.blessureJours > 0 ? " ⚠ blessé" : ""}
                    </option>
                  ))}
                </select>
                {choisi ? (
                  <p className="mt-2 font-mono text-[10.5px] text-doux">
                    condition {Math.round(choisi.condition)} · forme {choisi.forme > 0 ? `+${choisi.forme}` : choisi.forme}
                    {choisi.poste !== poste ? " · hors de son poste" : ""}
                    {(poste === "ArD" || poste === "AiD") && choisi.main === "droitier"
                      ? " · droitier à droite"
                      : ""}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
        <Link href="/match" className="bouton-principal mt-5">
          Aller au match
        </Link>
      </section>
    </div>
  );
}

function Option({
  actif,
  recommande,
  titre,
  texte,
  onClick,
}: {
  actif: boolean;
  recommande?: boolean;
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
      <span className="flex items-center gap-2">
        <b className="font-titre text-[15px]">{titre}</b>
        {recommande ? <span className="puce text-accent">conseillé</span> : null}
      </span>
      <span className="mt-1 block text-[13px] text-doux">{texte}</span>
    </button>
  );
}
