"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { seDeconnecter } from "@/lib/actions";
import type { Utilisateur } from "@/lib/auth";

const LIENS = [
  { href: "/", libelle: "Tableau de bord", icone: "◧" },
  { href: "/erreurs", libelle: "Fiches d'erreur", icone: "▤" },
  { href: "/actions", libelle: "Plan d'actions", icone: "✓" },
  { href: "/indicateurs", libelle: "Indicateurs", icone: "◔" },
  { href: "/referentiels", libelle: "Référentiels", icone: "⚙" },
] as const;

function estActif(chemin: string, href: string): boolean {
  return href === "/" ? chemin === "/" : chemin.startsWith(href);
}

export function Navigation({ utilisateur }: { utilisateur: Utilisateur }) {
  const chemin = usePathname();
  const [ouvert, setOuvert] = useState(false);

  const liens = (
    <ul className="space-y-1">
      {LIENS.map((lien) => {
        const actif = estActif(chemin, lien.href);
        return (
          <li key={lien.href}>
            <Link
              href={lien.href}
              onClick={() => setOuvert(false)}
              aria-current={actif ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                actif
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              }`}
            >
              <span aria-hidden className="w-4 text-center text-base leading-none">
                {lien.icone}
              </span>
              {lien.libelle}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      {/* Barre mobile */}
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 lg:hidden dark:border-zinc-800 dark:bg-zinc-900">
        <Link href="/" className="flex items-center gap-2">
          <Logo />
        </Link>
        <button
          type="button"
          onClick={() => setOuvert((o) => !o)}
          aria-expanded={ouvert}
          aria-label="Ouvrir le menu"
          className="bouton-secondaire px-2.5 py-1.5"
        >
          {ouvert ? "✕" : "☰"}
        </button>
      </div>
      {ouvert ? (
        <nav className="border-b border-zinc-200 bg-white px-4 py-3 lg:hidden dark:border-zinc-800 dark:bg-zinc-900">
          {liens}
        </nav>
      ) : null}

      {/* Barre latérale bureau */}
      <nav className="hidden w-64 shrink-0 border-r border-zinc-200 bg-white px-4 py-6 lg:block dark:border-zinc-800 dark:bg-zinc-900">
        <Link href="/" className="mb-8 flex items-center gap-2 px-1">
          <Logo />
        </Link>
        {liens}

        {utilisateur.authentifie ? (
          <form action={seDeconnecter} className="mt-6 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <p className="px-1 text-xs text-zinc-500 dark:text-zinc-400">Connecté en tant que</p>
            <p className="mb-2 truncate px-1 text-sm font-medium text-zinc-800 dark:text-zinc-100">
              {utilisateur.nom}
            </p>
            <button type="submit" className="bouton-secondaire w-full py-1.5 text-xs">
              Se déconnecter
            </button>
          </form>
        ) : null}

        <div className="mt-8 rounded-lg bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-400">
          <p className="mb-1 font-semibold text-zinc-700 dark:text-zinc-300">Boucle PDCA</p>
          <p>
            Déclarer → analyser la cause racine → agir (CAPA) → vérifier l&apos;efficacité →
            standardiser.
          </p>
        </div>
      </nav>
    </>
  );
}

function Logo() {
  return (
    <span className="flex items-center gap-2">
      <span
        aria-hidden
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white"
      >
        AC
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Amélioration continue
        </span>
        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Gestion des erreurs</span>
      </span>
    </span>
  );
}
