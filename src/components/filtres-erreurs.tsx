import Link from "next/link";

import {
  GRAVITES,
  libelleGravite,
  libelleStatutErreur,
  STATUTS_ERREUR,
} from "@/lib/labels";
import type { FiltresErreurs, Referentiels } from "@/lib/types";

const PERIODES = [
  { valeur: "0", libelle: "Depuis toujours" },
  { valeur: "30", libelle: "30 derniers jours" },
  { valeur: "90", libelle: "90 derniers jours" },
  { valeur: "180", libelle: "6 derniers mois" },
  { valeur: "365", libelle: "12 derniers mois" },
];

/** Barre de filtres — formulaire GET, l'état vit dans l'URL (partageable). */
export function FiltresErreursBarre({
  filtres,
  referentiels,
  nbResultats,
}: {
  filtres: FiltresErreurs;
  referentiels: Referentiels;
  nbResultats: number;
}) {
  return (
    <form method="get" className="carte mb-4 p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="lg:col-span-2">
          <label className="libelle-champ" htmlFor="recherche">
            Recherche
          </label>
          <input
            id="recherche"
            name="recherche"
            type="search"
            defaultValue={filtres.recherche ?? ""}
            placeholder="Référence, intitulé, déclarant…"
            className="champ"
          />
        </div>

        <div>
          <label className="libelle-champ" htmlFor="statut">
            Statut
          </label>
          <select id="statut" name="statut" defaultValue={filtres.statut ?? "toutes"} className="champ">
            <option value="toutes">Tous</option>
            {STATUTS_ERREUR.map((s) => (
              <option key={s} value={s}>
                {libelleStatutErreur[s]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="libelle-champ" htmlFor="gravite">
            Gravité
          </label>
          <select id="gravite" name="gravite" defaultValue={filtres.gravite ?? "toutes"} className="champ">
            <option value="toutes">Toutes</option>
            {GRAVITES.map((g) => (
              <option key={g} value={g}>
                {libelleGravite[g]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="libelle-champ" htmlFor="service">
            Service
          </label>
          <select id="service" name="service" defaultValue={filtres.service ?? "tous"} className="champ">
            <option value="tous">Tous</option>
            {referentiels.services.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="libelle-champ" htmlFor="periode">
            Période
          </label>
          <select
            id="periode"
            name="periode"
            defaultValue={String(filtres.periodeJours ?? 0)}
            className="champ"
          >
            {PERIODES.map((p) => (
              <option key={p.valeur} value={p.valeur}>
                {p.libelle}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {nbResultats} fiche{nbResultats > 1 ? "s" : ""} affichée{nbResultats > 1 ? "s" : ""}
        </p>
        <div className="flex gap-2">
          <Link href="/erreurs" className="bouton-secondaire">
            Réinitialiser
          </Link>
          <button type="submit" className="bouton-primaire">
            Filtrer
          </button>
        </div>
      </div>
    </form>
  );
}
