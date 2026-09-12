"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Ecusson } from "@/composants/ecusson";
import { usePartie } from "@/jeu/etat";
import { maLigne, monClub } from "@/jeu/partie";

const LIENS = [
  { href: "/club", libelle: "Club" },
  { href: "/effectif", libelle: "Effectif" },
  { href: "/tactique", libelle: "Tactique" },
  { href: "/entrainement", libelle: "Entraînement" },
  { href: "/match", libelle: "Match" },
  { href: "/calendrier", libelle: "Calendrier" },
  { href: "/classement", libelle: "Classement" },
  { href: "/saison", libelle: "Saison" },
];

export function BarreJeu() {
  const { partie, idx, version } = usePartie();
  const chemin = usePathname();

  if (!partie || !idx) {
    return (
      <header className="border-b border-bordure bg-surface">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-4 sm:px-6">
          <span className="font-titre text-xl font-bold tracking-tight">Demi-Centre</span>
          <span className="sous-titre">Manager de handball</span>
        </div>
      </header>
    );
  }

  const club = monClub(partie, idx);
  const ligne = maLigne(partie, idx);
  const journees = partie.saison.calendrier.length;
  const journee = Math.min(partie.saison.journeeCourante + 1, journees);

  return (
    <header className="border-b border-bordure bg-surface" key={version}>
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/club" className="flex min-w-0 flex-1 items-center gap-3">
          <Ecusson club={club} taille={40} />
          <span className="min-w-0">
            <span className="block truncate font-titre text-lg leading-tight font-bold">{club.nom}</span>
            <span className="sous-titre block truncate">
              {idx.divisionParId.get(club.divisionId)?.nom} · {partie.manager}
            </span>
          </span>
        </Link>
        <div className="flex gap-2">
          <div className="tuile">
            <b>
              {journee}/{journees}
            </b>
            <span>Journée</span>
          </div>
          <div className="tuile">
            <b>{partie.saison.resultats.length ? `${ligne.rang}e` : "—"}</b>
            <span>Rang</span>
          </div>
          <div className="tuile">
            <b>{ligne.points}</b>
            <span>Points</span>
          </div>
          <div className="tuile">
            <b>{ligne.difference > 0 ? `+${ligne.difference}` : ligne.difference}</b>
            <span>Diff.</span>
          </div>
        </div>
      </div>
      <nav className="mx-auto w-full max-w-6xl overflow-x-auto px-4 sm:px-6">
        <ul className="flex gap-1 pb-2">
          {LIENS.map((lien) => {
            const actif = chemin === lien.href;
            return (
              <li key={lien.href}>
                <Link
                  href={lien.href}
                  aria-current={actif ? "page" : undefined}
                  className={`block rounded-full border px-4 py-1.5 font-titre text-[13px] font-semibold transition-colors ${
                    actif
                      ? "border-accent bg-accent text-fond"
                      : "border-bordure bg-surface text-doux hover:border-accent hover:text-accent"
                  }`}
                >
                  {lien.libelle}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
