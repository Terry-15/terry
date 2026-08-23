import Link from "next/link";

import { GraphiqueAnneau } from "@/components/charts/anneau";
import { GraphiqueBarres } from "@/components/charts/barres";
import { GraphiquePareto } from "@/components/charts/pareto";
import { GraphiqueTendance } from "@/components/charts/tendance";
import { TableErreurs } from "@/components/table-erreurs";
import { CarteKpi } from "@/components/ui/carte-kpi";
import { Carte, EntetePage } from "@/components/ui/divers";
import { EtiquetteStatutAction, EtiquetteTypeAction } from "@/components/ui/etiquettes";
import { formatDate, formatEuros, formatNombre, joursDeRetard } from "@/lib/format";
import {
  calculerKpis,
  parMois,
  pareto,
  repartitionGravite,
  repartitionStatut,
} from "@/lib/kpi";
import { libelleGravite, libelleStatutErreur } from "@/lib/labels";
import { depot } from "@/lib/repo";

export const dynamic = "force-dynamic";

const COULEURS_GRAVITE: Record<string, string> = {
  mineure: "#10b981",
  majeure: "#f59e0b",
  critique: "#ef4444",
};

export default async function TableauDeBord() {
  const d = depot();
  const [erreurs, actions] = await Promise.all([d.listerErreurs(), d.listerActions()]);

  const kpis = calculerKpis(erreurs, actions);
  const enRetard = actions.filter((a) => joursDeRetard(a.echeance) > 0 && (a.statut === "a_faire" || a.statut === "en_cours"));
  const dernieres = erreurs.slice(0, 8);

  return (
    <>
      <EntetePage
        titre="Tableau de bord"
        sousTitre="Pilotage de la boucle d'amélioration continue : déclarer, analyser, agir, vérifier."
        actions={
          <Link href="/erreurs/nouvelle" className="bouton-primaire">
            + Déclarer une erreur
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <CarteKpi
          libelle="Fiches ouvertes"
          valeur={kpis.ouvertes}
          aide={`sur ${kpis.total} au total`}
        />
        <CarteKpi
          libelle="Déclarées sur 30 j"
          valeur={kpis.declarees30j}
          evolution={kpis.evolution30j}
          aide="vs 30 j précédents"
        />
        <CarteKpi
          libelle="Critiques ouvertes"
          valeur={kpis.critiquesOuvertes}
          ton={kpis.critiquesOuvertes > 0 ? "critique" : "positif"}
          aide="à traiter en priorité"
        />
        <CarteKpi
          libelle="Actions en retard"
          valeur={kpis.actionsEnRetard}
          ton={kpis.actionsEnRetard > 0 ? "attention" : "positif"}
          aide={`sur ${kpis.actionsOuvertes} ouvertes`}
        />
        <CarteKpi
          libelle="Taux de clôture"
          valeur={formatNombre(kpis.tauxCloture)}
          unite="%"
          ton={kpis.tauxCloture >= 70 ? "positif" : "attention"}
          aide="fiches retenues clôturées"
        />
        <CarteKpi
          libelle="Délai moyen de clôture"
          valeur={formatNombre(kpis.delaiMoyenCloture)}
          unite="j"
          aide="détection → clôture"
        />
        <CarteKpi
          libelle="Efficacité confirmée"
          valeur={formatNombre(kpis.tauxEfficacite)}
          unite="%"
          ton={kpis.tauxEfficacite >= 80 ? "positif" : "attention"}
          hausseDefavorable={false}
          aide="actions contrôlées"
        />
        <CarteKpi
          libelle="Coût cumulé"
          valeur={formatEuros(kpis.coutTotal)}
          aide="non-qualité estimée"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Carte
          titre="Évolution mensuelle"
          aide="Déclarations et clôtures sur 12 mois glissants"
          className="lg:col-span-2"
        >
          <GraphiqueTendance points={parMois(erreurs, 12)} />
        </Carte>

        <Carte titre="Répartition par gravité">
          <GraphiqueAnneau
            valeurCentre={String(erreurs.length)}
            parts={repartitionGravite(erreurs).map((p) => ({
              libelle: libelleGravite[p.cle],
              valeur: p.valeur,
              couleur: COULEURS_GRAVITE[p.cle],
            }))}
          />
        </Carte>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Carte
          titre="Pareto des catégories"
          aide="Les causes cumulant 80 % des fiches sont les priorités d'action"
          className="lg:col-span-2"
        >
          <GraphiquePareto lignes={pareto(erreurs, "categorie")} />
        </Carte>

        <Carte titre="Avancement du traitement">
          <GraphiqueBarres
            barres={repartitionStatut(erreurs).map((p) => ({
              libelle: libelleStatutErreur[p.cle],
              valeur: p.valeur,
              couleur:
                p.cle === "cloturee"
                  ? "bg-emerald-500"
                  : p.cle === "rejetee"
                    ? "bg-zinc-400"
                    : "bg-indigo-500",
            }))}
          />
        </Carte>
      </div>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
        <Carte
          titre="Actions en retard"
          aide="Échéance dépassée, action non terminée"
          actions={
            <Link href="/actions?retard=1" className="text-xs lien">
              Tout voir
            </Link>
          }
        >
          {enRetard.length ? (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {enRetard.slice(0, 6).map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <Link href={`/erreurs/${a.erreur_id}`} className="lien text-sm font-medium">
                      {a.titre}
                    </Link>
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      {a.erreur_reference} · {a.pilote} · échéance {formatDate(a.echeance)}
                    </p>
                  </div>
                  <span className="etiquette shrink-0 border-red-200 bg-red-50 text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-300">
                    +{joursDeRetard(a.echeance)} j
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-emerald-600 dark:text-emerald-400">
              Aucune action en retard. 👌
            </p>
          )}
        </Carte>

        <Carte
          titre="Prochaines échéances"
          aide="Actions ouvertes dont l'échéance approche"
        >
          {(() => {
            const prochaines = actions
              .filter((a) => (a.statut === "a_faire" || a.statut === "en_cours") && joursDeRetard(a.echeance) <= 0)
              .slice(0, 6);
            return prochaines.length ? (
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {prochaines.map((a) => (
                  <li key={a.id} className="flex items-start justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <Link href={`/erreurs/${a.erreur_id}`} className="lien text-sm font-medium">
                        {a.titre}
                      </Link>
                      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        {a.pilote} · pour le {formatDate(a.echeance)}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <EtiquetteTypeAction valeur={a.type} />
                      <EtiquetteStatutAction valeur={a.statut} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-zinc-500">Aucune action planifiée.</p>
            );
          })()}
        </Carte>
      </div>

      <Carte
        titre="Dernières fiches déclarées"
        className="mt-4"
        actions={
          <Link href="/erreurs" className="text-xs lien">
            Toutes les fiches
          </Link>
        }
      >
        <TableErreurs erreurs={dernieres} compact />
      </Carte>
    </>
  );
}
