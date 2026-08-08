"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { ajouterAction, type EtatFormulaire } from "@/lib/actions";
import {
  descriptionTypeAction,
  libellePhasePdca,
  libelleTypeAction,
  PHASES_PDCA,
  TYPES_ACTION,
} from "@/lib/labels";
import type { TypeAction } from "@/lib/types";

function BoutonAjout() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="bouton-primaire" disabled={pending}>
      {pending ? "Ajout…" : "Ajouter l'action"}
    </button>
  );
}

export function FormulaireAction({
  erreurId,
  causeRacine,
}: {
  erreurId: string;
  causeRacine: string | null;
}) {
  const formulaire = useRef<HTMLFormElement>(null);
  const [type, setType] = useState<TypeAction>("corrective");
  const [etat, action] = useActionState<EtatFormulaire, FormData>(async (precedent, donnees) => {
    const resultat = await ajouterAction(precedent, donnees);
    if (resultat.succes) {
      formulaire.current?.reset();
      setType("corrective");
    }
    return resultat;
  }, {});

  return (
    <form ref={formulaire} action={action} className="space-y-3">
      <input type="hidden" name="erreur_id" value={erreurId} />

      {etat.erreur ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-300"
        >
          {etat.erreur}
        </p>
      ) : null}

      {causeRacine ? (
        <p className="rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
          <span className="font-semibold">Cause racine à traiter :</span> {causeRacine}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="libelle-champ" htmlFor="action-titre">
            Action <span className="text-red-500">*</span>
          </label>
          <input
            id="action-titre"
            name="titre"
            required
            minLength={3}
            className="champ"
            placeholder="Ex. : ajouter le recalage du butoir au mode opératoire"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="libelle-champ" htmlFor="action-description">
            Détail
          </label>
          <textarea id="action-description" name="description" rows={2} className="champ resize-y" />
        </div>

        <div>
          <label className="libelle-champ" htmlFor="action-type">
            Type
          </label>
          <select
            id="action-type"
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as TypeAction)}
            className="champ"
          >
            {TYPES_ACTION.map((t) => (
              <option key={t} value={t}>
                {libelleTypeAction[t]}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {descriptionTypeAction[type]}
          </p>
        </div>

        <div>
          <label className="libelle-champ" htmlFor="action-phase">
            Phase PDCA
          </label>
          <select id="action-phase" name="phase_pdca" defaultValue="plan" className="champ">
            {PHASES_PDCA.map((p) => (
              <option key={p} value={p}>
                {libellePhasePdca[p]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="libelle-champ" htmlFor="action-pilote">
            Pilote <span className="text-red-500">*</span>
          </label>
          <input id="action-pilote" name="pilote" required className="champ" />
        </div>

        <div>
          <label className="libelle-champ" htmlFor="action-echeance">
            Échéance <span className="text-red-500">*</span>
          </label>
          <input id="action-echeance" name="echeance" type="date" required className="champ" />
        </div>
      </div>

      <div className="flex justify-end">
        <BoutonAjout />
      </div>
    </form>
  );
}
