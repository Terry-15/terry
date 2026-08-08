import {
  EtiquettePdca,
  EtiquetteRetard,
  EtiquetteStatutAction,
  EtiquetteTypeAction,
} from "@/components/ui/etiquettes";
import { changerStatutAction, controlerEfficacite, supprimerAction } from "@/lib/actions";
import { formatDate, joursDeRetard } from "@/lib/format";
import { libelleStatutAction, STATUTS_ACTION } from "@/lib/labels";
import type { ReactNode } from "react";

import type { ActionCapa } from "@/lib/types";

/** Carte d'une action CAPA avec ses contrôles (statut, efficacité, suppression). */
export function CarteAction({
  action,
  avecSuppression = true,
  contexte,
}: {
  action: ActionCapa;
  avecSuppression?: boolean;
  /** Rappel de la fiche d'origine, affiché en tête (vue transverse). */
  contexte?: ReactNode;
}) {
  const retard = joursDeRetard(action.echeance);
  const ouverte = action.statut === "a_faire" || action.statut === "en_cours";
  const aControler = action.statut === "faite" && action.efficacite_ok === null;

  return (
    <li className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      {contexte ? <div className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">{contexte}</div> : null}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{action.titre}</p>
          {action.description ? (
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{action.description}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-1.5">
          <EtiquetteTypeAction valeur={action.type} />
          <EtiquettePdca valeur={action.phase_pdca} />
          <EtiquetteStatutAction valeur={action.statut} />
          {ouverte ? <EtiquetteRetard jours={retard} /> : null}
        </div>
      </div>

      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        Pilote : <span className="text-zinc-700 dark:text-zinc-200">{action.pilote}</span> · Échéance :{" "}
        <span className="text-zinc-700 tabular-nums dark:text-zinc-200">
          {formatDate(action.echeance)}
        </span>
        {action.date_realisation ? (
          <>
            {" "}
            · Réalisée le{" "}
            <span className="text-zinc-700 tabular-nums dark:text-zinc-200">
              {formatDate(action.date_realisation)}
            </span>
          </>
        ) : null}
      </p>

      {action.efficacite_ok !== null ? (
        <p
          className={`mt-2 rounded-md px-2.5 py-1.5 text-xs ${
            action.efficacite_ok
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
              : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
          }`}
        >
          <strong>
            Efficacité {action.efficacite_ok ? "confirmée" : "non atteinte"}
            {action.efficacite_date ? ` le ${formatDate(action.efficacite_date)}` : ""}
          </strong>
          {action.efficacite_commentaire ? ` — ${action.efficacite_commentaire}` : ""}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
        <form action={changerStatutAction} className="flex items-end gap-2">
          <input type="hidden" name="action_id" value={action.id} />
          <input type="hidden" name="erreur_id" value={action.erreur_id} />
          <div>
            <label className="libelle-champ" htmlFor={`statut-${action.id}`}>
              Statut
            </label>
            <select
              id={`statut-${action.id}`}
              name="statut"
              defaultValue={action.statut}
              className="champ py-1 text-xs"
            >
              {STATUTS_ACTION.map((s) => (
                <option key={s} value={s}>
                  {libelleStatutAction[s]}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="bouton-secondaire px-2.5 py-1.5 text-xs">
            Appliquer
          </button>
        </form>

        {avecSuppression ? (
          <form action={supprimerAction} className="ml-auto">
            <input type="hidden" name="action_id" value={action.id} />
            <input type="hidden" name="erreur_id" value={action.erreur_id} />
            <button
              type="submit"
              className="bouton-discret text-xs text-zinc-400 hover:text-red-600"
            >
              Supprimer
            </button>
          </form>
        ) : null}
      </div>

      {aControler ? (
        <form
          action={controlerEfficacite}
          className="mt-3 rounded-lg bg-violet-50 p-3 dark:bg-violet-500/10"
        >
          <input type="hidden" name="action_id" value={action.id} />
          <input type="hidden" name="erreur_id" value={action.erreur_id} />
          <p className="mb-2 text-xs font-semibold text-violet-800 dark:text-violet-300">
            Contrôle d&apos;efficacité (phase « Check »)
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="libelle-champ" htmlFor={`eff-${action.id}`}>
                L&apos;action a-t-elle supprimé la cause ?
              </label>
              <select
                id={`eff-${action.id}`}
                name="efficacite_ok"
                defaultValue="oui"
                className="champ py-1 text-xs"
              >
                <option value="oui">Oui — efficace</option>
                <option value="non">Non — à revoir</option>
              </select>
            </div>
            <div className="min-w-48 flex-1">
              <label className="libelle-champ" htmlFor={`effc-${action.id}`}>
                Preuve / commentaire
              </label>
              <input
                id={`effc-${action.id}`}
                name="efficacite_commentaire"
                className="champ py-1 text-xs"
                placeholder="Ex. : aucune récidive sur 3 mois"
              />
            </div>
            <button type="submit" className="bouton-primaire px-2.5 py-1.5 text-xs">
              Enregistrer
            </button>
          </div>
        </form>
      ) : null}
    </li>
  );
}
