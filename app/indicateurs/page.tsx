import Link from "next/link";

import { GraphiqueAnneau } from "@/components/charts/anneau";
import { GraphiqueBarres } from "@/components/charts/barres";
import { GraphiquePareto } from "@/components/charts/pareto";
import { GraphiqueTendance } from "@/components/charts/tendance";
import { CarteKpi } from "@/components/ui/carte-kpi";
import { Carte, EntetePage } from "@/components/ui/divers";
import { formatEuros, formatMois, formatNombre } from "@/lib/format";
import {
  calculerKpis,
  coutParService,
  parMois,
  pareto,
  repartitionGravite,
} from "@/lib/kpi";
import { libelleGravite } from "@/lib/labels";
import { depot } from "@/lib/repo";

export const dynamic = "force-dynamic";

export const metadata = { title: "Indicateurs" };

const PERIODES = [
  { valeur: 0, libelle: "Depuis toujours" },
  { valeur: 90, libelle: "90 jours" },
  { valeur: 180, libelle: "6 mois" },
  { valeur: 365, libelle: "12 mois" },
];

const COULEURS_GRAVITE: Record<string, string> = {
  mineure: "#10b981",
  majeure: "#f59e0b",
  critique: "#ef4444",
};

export default async function PageIndicateurs({ searchParams }: PageProps<"/indicateurs">) {
  const params = await searchParams;
  const brut = Array.isArray(params.periode) ? params.periode[0] : params.periode;
  const periodeJours = Number(brut ?? 365) || 0;

  const d = depot();
  const [erreurs, actions] = await Promise.all([
    d.listerErreurs({ periodeJours }),
    d.listerActions(),
  ]);

  const kpis = calculerKpis(erreurs, actions);
  const mois = parMois(erreurs, periodeJours && periodeJours <= 180 ? 6 : 12);
  const couts = coutParService(erreurs);

  const parPilote = new Map<string, { total: number; faites: number; retard: number }>();
  const aujourdhui = new Date().toISOString().slice(0, 10);
  for (const a of actions) {
    const e = parPilote.get(a.pilote) ?? { total: 0, faites: 0, retard: 0 };
    e.total += 1;
    if (a.statut === "faite") e.faites += 1;
    if ((a.statut === "a_faire" || a.statut === "en_cours") && a.echeance < aujourdhui) e.retard += 1;
    parPilote.set(a.pilote, e);
  }
  const pilotes = [...parPilote.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 8);

  return (
    <>
      <EntetePage
        titre="Indicateurs qualité"
        sousTitre="Mesurer pour piloter : volumes, délais, coûts de non-qualité et efficacité des actions."
        actions={
          <Link href="/api/export" className="bouton-secondaire" prefetch={false}>
            Exporter en CSV
          </Link>
        }
      />

      <nav className="mb-4 flex flex-wrap gap-2">
        {PERIODES.map((p) => (
          <Link
            key={p.valeur}
            href={`/indicateurs?periode=${p.valeur}`}
            className={
              p.valeur === periodeJours
                ? "rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white"
                : "rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }
          >
            {p.libelle}
          </Link>
        ))}
      </nav>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <CarteKpi libelle="Fiches sur la période" valeur={kpis.total} />
        <CarteKpi
          libelle="Taux de clôture"
          valeur={formatNombre(kpis.tauxCloture)}
          unite="%"
          hausseDefavorable={false}
          ton={kpis.tauxCloture >= 70 ? "positif" : "attention"}
        />
        <CarteKpi
          libelle="Délai moyen de clôture"
          valeur={formatNombre(kpis.delaiMoyenCloture)}
          unite="j"
        />
        <CarteKpi libelle="Coût de non-qualité" valeur={formatEuros(kpis.coutTotal)} />
        <CarteKpi
          libelle="Respect des échéances"
          valeur={formatNombre(kpis.tauxRespectEcheance)}
          unite="%"
          hausseDefavorable={false}
          ton={kpis.tauxRespectEcheance >= 80 ? "positif" : "attention"}
          aide="actions terminées à temps"
        />
        <CarteKpi
          libelle="Efficacité confirmée"
          valeur={formatNombre(kpis.tauxEfficacite)}
          unite="%"
          hausseDefavorable={false}
        />
        <CarteKpi
          libelle="Fiches récurrentes"
          valeur={kpis.recurrentes}
          aide="problème déjà constaté"
          ton={kpis.recurrentes ? "attention" : "positif"}
        />
        <CarteKpi
          libelle="Avec impact client"
          valeur={kpis.impactClient}
          ton={kpis.impactClient ? "attention" : "positif"}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Carte titre="Évolution mensuelle" className="lg:col-span-2">
          <GraphiqueTendance points={mois} />
        </Carte>
        <Carte titre="Gravité">
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

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Carte titre="Pareto par catégorie" aide="Où se concentrent les non-conformités">
          <GraphiquePareto lignes={pareto(erreurs, "categorie")} />
        </Carte>
        <Carte titre="Pareto par service">
          <GraphiquePareto lignes={pareto(erreurs, "service")} />
        </Carte>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Carte titre="Coût de non-qualité par service">
          <GraphiqueBarres
            barres={couts.map((c) => ({
              libelle: c.libelle,
              valeur: c.valeur,
              affichage: formatEuros(c.valeur),
              couleur: "bg-rose-500",
            }))}
          />
        </Carte>

        <Carte titre="Charge par pilote d'action" aide="Actions portées, réalisées et en retard">
          {pilotes.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                    <th className="py-2 font-medium">Pilote</th>
                    <th className="py-2 text-right font-medium">Actions</th>
                    <th className="py-2 text-right font-medium">Réalisées</th>
                    <th className="py-2 text-right font-medium">En retard</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {pilotes.map(([nom, stats]) => (
                    <tr key={nom}>
                      <td className="py-2 text-zinc-700 dark:text-zinc-200">{nom}</td>
                      <td className="py-2 text-right tabular-nums">{stats.total}</td>
                      <td className="py-2 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                        {stats.faites}
                      </td>
                      <td
                        className={`py-2 text-right tabular-nums ${
                          stats.retard ? "text-red-600 dark:text-red-400" : "text-zinc-400"
                        }`}
                      >
                        {stats.retard}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-zinc-500">Aucune action enregistrée.</p>
          )}
        </Carte>
      </div>

      <Carte titre="Détail mensuel" className="mt-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <th className="py-2 font-medium">Mois</th>
                <th className="py-2 text-right font-medium">Déclarées</th>
                <th className="py-2 text-right font-medium">Clôturées</th>
                <th className="py-2 text-right font-medium">Solde</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {mois.map((m) => {
                const solde = m.declarees - m.cloturees;
                return (
                  <tr key={m.mois}>
                    <td className="py-2 text-zinc-700 dark:text-zinc-200">{formatMois(m.mois)}</td>
                    <td className="py-2 text-right tabular-nums">{m.declarees}</td>
                    <td className="py-2 text-right tabular-nums">{m.cloturees}</td>
                    <td
                      className={`py-2 text-right tabular-nums ${
                        solde > 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {solde > 0 ? `+${solde}` : solde}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Carte>
    </>
  );
}
