import Link from "next/link";

import { CarteAction } from "@/components/carte-action";
import { CarteKpi } from "@/components/ui/carte-kpi";
import { Carte, EntetePage, EtatVide } from "@/components/ui/divers";
import { formatNombre } from "@/lib/format";
import { estEnRetard } from "@/lib/kpi";
import {
  libelleStatutAction,
  libelleTypeAction,
  STATUTS_ACTION,
  TYPES_ACTION,
} from "@/lib/labels";
import { depot, type FiltresActions } from "@/lib/repo";
import type { StatutAction, TypeAction } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = { title: "Plan d'actions" };

function premier(valeur: string | string[] | undefined): string | undefined {
  return Array.isArray(valeur) ? valeur[0] : valeur;
}

export default async function PageActions({ searchParams }: PageProps<"/actions">) {
  const params = await searchParams;

  const filtres: FiltresActions = {
    statut: (premier(params.statut) as StatutAction | "toutes") ?? "toutes",
    type: (premier(params.type) as TypeAction | "tous") ?? "tous",
    pilote: premier(params.pilote) ?? "tous",
    enRetard: premier(params.retard) === "1",
  };

  const d = depot();
  const [actions, toutes] = await Promise.all([d.listerActions(filtres), d.listerActions()]);

  const pilotes = [...new Set(toutes.map((a) => a.pilote))].sort();
  const ouvertes = toutes.filter((a) => a.statut === "a_faire" || a.statut === "en_cours");
  const enRetard = toutes.filter((a) => estEnRetard(a));
  const faites = toutes.filter((a) => a.statut === "faite");
  const aControler = faites.filter((a) => a.efficacite_ok === null);

  return (
    <>
      <EntetePage
        titre="Plan d'actions CAPA"
        sousTitre="Actions curatives, correctives et préventives, suivies selon la boucle PDCA."
      />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <CarteKpi libelle="Actions ouvertes" valeur={ouvertes.length} />
        <CarteKpi
          libelle="En retard"
          valeur={enRetard.length}
          ton={enRetard.length ? "critique" : "positif"}
        />
        <CarteKpi
          libelle="À contrôler"
          valeur={aControler.length}
          aide="réalisées, efficacité non vérifiée"
          ton={aControler.length ? "attention" : "positif"}
        />
        <CarteKpi
          libelle="Taux de réalisation"
          valeur={formatNombre(toutes.length ? (faites.length / toutes.length) * 100 : 0)}
          unite="%"
          hausseDefavorable={false}
        />
      </div>

      <form method="get" className="carte mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="libelle-champ" htmlFor="statut">
              Statut
            </label>
            <select id="statut" name="statut" defaultValue={filtres.statut} className="champ">
              <option value="toutes">Tous</option>
              {STATUTS_ACTION.map((s) => (
                <option key={s} value={s}>
                  {libelleStatutAction[s]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="libelle-champ" htmlFor="type">
              Type
            </label>
            <select id="type" name="type" defaultValue={filtres.type} className="champ">
              <option value="tous">Tous</option>
              {TYPES_ACTION.map((t) => (
                <option key={t} value={t}>
                  {libelleTypeAction[t]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="libelle-champ" htmlFor="pilote">
              Pilote
            </label>
            <select id="pilote" name="pilote" defaultValue={filtres.pilote} className="champ">
              <option value="tous">Tous</option>
              {pilotes.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-3">
            <label className="flex cursor-pointer items-center gap-2 pb-2 text-sm">
              <input
                type="checkbox"
                name="retard"
                value="1"
                defaultChecked={filtres.enRetard}
                className="accent-indigo-600"
              />
              En retard seulement
            </label>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {actions.length} action{actions.length > 1 ? "s" : ""}
          </p>
          <div className="flex gap-2">
            <Link href="/actions" className="bouton-secondaire">
              Réinitialiser
            </Link>
            <button type="submit" className="bouton-primaire">
              Filtrer
            </button>
          </div>
        </div>
      </form>

      <Carte>
        {actions.length ? (
          <ul className="space-y-3">
            {actions.map((a) => (
              <CarteAction
                key={a.id}
                action={a}
                contexte={
                  <>
                    <Link href={`/erreurs/${a.erreur_id}?onglet=actions`} className="lien font-mono">
                      {a.erreur_reference}
                    </Link>{" "}
                    · {a.erreur_titre} · {a.service}
                  </>
                }
              />
            ))}
          </ul>
        ) : (
          <EtatVide
            titre="Aucune action"
            message="Aucune action ne correspond aux filtres sélectionnés."
            lien={{ href: "/erreurs", libelle: "Voir les fiches d'erreur" }}
          />
        )}
      </Carte>
    </>
  );
}
