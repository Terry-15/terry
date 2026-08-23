"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { creerErreur, type EtatFormulaire } from "@/lib/actions";
import { aujourdhui } from "@/lib/format";
import { GRAVITES, descriptionTypeAction, libelleGravite } from "@/lib/labels";
import type { Referentiels } from "@/lib/types";

function BoutonEnvoi() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="bouton-primaire" disabled={pending}>
      {pending ? "Enregistrement…" : "Créer la fiche"}
    </button>
  );
}

export function FormulaireErreur({
  referentiels,
  declarantParDefaut,
}: {
  referentiels: Referentiels;
  declarantParDefaut: string;
}) {
  const [etat, action] = useActionState<EtatFormulaire, FormData>(creerErreur, {});

  return (
    <form action={action} className="space-y-4">
      {etat.erreur ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-300"
        >
          {etat.erreur}
        </p>
      ) : null}

      <section className="carte p-4">
        <h2 className="titre-section mb-3">Description de l&apos;erreur</h2>

        <div className="space-y-3">
          <div>
            <label className="libelle-champ" htmlFor="titre">
              Intitulé <span className="text-red-500">*</span>
            </label>
            <input
              id="titre"
              name="titre"
              required
              minLength={5}
              maxLength={160}
              className="champ"
              placeholder="Ex. : colis expédié à la mauvaise adresse"
            />
          </div>

          <div>
            <label className="libelle-champ" htmlFor="description">
              Description factuelle
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              className="champ resize-y"
              placeholder="Qui, quoi, où, quand, combien ? Décrivez les faits observés, sans interprétation ni recherche de responsable."
            />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Restez factuel : l&apos;analyse des causes se fait dans un second temps.
            </p>
          </div>
        </div>
      </section>

      <section className="carte p-4">
        <h2 className="titre-section mb-3">Qualification</h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="libelle-champ" htmlFor="service">
              Service concerné <span className="text-red-500">*</span>
            </label>
            <select id="service" name="service" required className="champ" defaultValue="">
              <option value="" disabled>
                Sélectionner…
              </option>
              {referentiels.services.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="libelle-champ" htmlFor="categorie">
              Catégorie <span className="text-red-500">*</span>
            </label>
            <select id="categorie" name="categorie" required className="champ" defaultValue="">
              <option value="" disabled>
                Sélectionner…
              </option>
              {referentiels.categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <span className="libelle-champ">Gravité</span>
            <div className="flex flex-wrap gap-2">
              {GRAVITES.map((g, i) => (
                <label
                  key={g}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm has-checked:border-indigo-500 has-checked:bg-indigo-50 dark:border-zinc-700 dark:has-checked:bg-indigo-500/10"
                >
                  <input
                    type="radio"
                    name="gravite"
                    value={g}
                    defaultChecked={i === 0}
                    className="accent-indigo-600"
                  />
                  {libelleGravite[g]}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="libelle-champ" htmlFor="date_detection">
              Date de détection <span className="text-red-500">*</span>
            </label>
            <input
              id="date_detection"
              name="date_detection"
              type="date"
              required
              max={aujourdhui()}
              defaultValue={aujourdhui()}
              className="champ"
            />
          </div>

          <div>
            <label className="libelle-champ" htmlFor="date_survenue">
              Date de survenue
            </label>
            <input
              id="date_survenue"
              name="date_survenue"
              type="date"
              max={aujourdhui()}
              className="champ"
            />
          </div>

          <div>
            <label className="libelle-champ" htmlFor="declarant">
              Déclarant <span className="text-red-500">*</span>
            </label>
            <input
              id="declarant"
              name="declarant"
              required
              defaultValue={declarantParDefaut}
              className="champ"
            />
          </div>

          <div>
            <label className="libelle-champ" htmlFor="pilote">
              Pilote du traitement
            </label>
            <input
              id="pilote"
              name="pilote"
              className="champ"
              placeholder="À désigner plus tard si besoin"
            />
          </div>

          <div>
            <label className="libelle-champ" htmlFor="cout_estime">
              Coût estimé (€)
            </label>
            <input
              id="cout_estime"
              name="cout_estime"
              type="number"
              min={0}
              step="0.01"
              className="champ"
              placeholder="0"
            />
          </div>

          <div className="flex items-end gap-4 pb-1">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" name="impact_client" className="accent-indigo-600" />
              Impact client
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" name="recurrente" className="accent-indigo-600" />
              Déjà constatée
            </label>
          </div>
        </div>

        <p className="mt-4 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-400">
          Après création, la fiche passe en analyse : 5 Pourquoi et Ishikawa pour remonter à la
          cause racine, puis plan d&apos;actions CAPA.
          <br />
          <span className="text-zinc-400">Rappel — {descriptionTypeAction.corrective}</span>
        </p>
      </section>

      <div className="flex justify-end gap-2">
        <Link href="/erreurs" className="bouton-secondaire">
          Annuler
        </Link>
        <BoutonEnvoi />
      </div>
    </form>
  );
}
