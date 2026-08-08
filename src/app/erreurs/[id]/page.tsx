import Link from "next/link";
import { notFound } from "next/navigation";

import { CarteAction } from "@/components/carte-action";
import { DiagrammeIshikawa } from "@/components/charts/ishikawa";
import { EditeurAnalyse } from "@/components/editeur-analyse";
import { FormulaireAction } from "@/components/formulaire-action";
import { Carte, EtatVide, LigneDefinition } from "@/components/ui/divers";
import {
  EtiquetteGravite,
  EtiquetteStatut,
} from "@/components/ui/etiquettes";
import { ajouterCommentaire, changerStatutErreur, supprimerErreur } from "@/lib/actions";
import { formatDate, formatDateHeure, formatEuros } from "@/lib/format";
import {
  libelleCourtPdca,
  libelleStatutErreur,
  PHASES_PDCA,
  transitionsStatut,
} from "@/lib/labels";
import { depot } from "@/lib/repo";
import type { FicheErreur, PhasePdca } from "@/lib/types";

export const dynamic = "force-dynamic";

const ONGLETS = [
  { cle: "fiche", libelle: "Fiche" },
  { cle: "analyse", libelle: "Analyse des causes" },
  { cle: "actions", libelle: "Plan d'actions" },
  { cle: "journal", libelle: "Historique" },
] as const;

type CleOnglet = (typeof ONGLETS)[number]["cle"];

export default async function PageFiche({ params, searchParams }: PageProps<"/erreurs/[id]">) {
  const { id } = await params;
  const requete = await searchParams;
  const brut = Array.isArray(requete.onglet) ? requete.onglet[0] : requete.onglet;
  const onglet: CleOnglet = ONGLETS.some((o) => o.cle === brut) ? (brut as CleOnglet) : "fiche";

  const fiche = await depot().obtenirFiche(id);
  if (!fiche) notFound();

  const { erreur, actions, journal } = fiche;

  return (
    <>
      <div className="mb-4 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <Link href="/erreurs" className="lien">
          Fiches d&apos;erreur
        </Link>
        <span aria-hidden>/</span>
        <span className="font-mono">{erreur.reference}</span>
      </div>

      <header className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {erreur.titre}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <EtiquetteStatut valeur={erreur.statut} />
            <EtiquetteGravite valeur={erreur.gravite} />
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {erreur.service} · {erreur.categorie} · détectée le {formatDate(erreur.date_detection)}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-end gap-2">
          <form action={changerStatutErreur} className="flex items-end gap-2">
            <input type="hidden" name="erreur_id" value={erreur.id} />
            <div>
              <label className="libelle-champ" htmlFor="statut-fiche">
                Faire évoluer le statut
              </label>
              <select
                id="statut-fiche"
                name="statut"
                defaultValue={transitionsStatut[erreur.statut][0]}
                className="champ py-1.5 text-sm"
              >
                {transitionsStatut[erreur.statut].map((s) => (
                  <option key={s} value={s}>
                    {libelleStatutErreur[s]}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="bouton-primaire py-1.5">
              Appliquer
            </button>
          </form>
        </div>
      </header>

      <FrisePdca statut={erreur.statut} actions={actions} />

      <nav className="mb-4 flex gap-1 overflow-x-auto border-b border-zinc-200 dark:border-zinc-800">
        {ONGLETS.map((o) => {
          const actif = o.cle === onglet;
          const compteur =
            o.cle === "actions" ? actions.length : o.cle === "journal" ? journal.length : null;
          return (
            <Link
              key={o.cle}
              href={`/erreurs/${erreur.id}?onglet=${o.cle}`}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                actif
                  ? "border-indigo-600 text-indigo-700 dark:border-indigo-400 dark:text-indigo-300"
                  : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              {o.libelle}
              {compteur !== null ? (
                <span className="ml-1.5 text-xs text-zinc-400">{compteur}</span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {onglet === "fiche" ? <OngletFiche fiche={fiche} /> : null}
      {onglet === "analyse" ? <OngletAnalyse fiche={fiche} /> : null}
      {onglet === "actions" ? <OngletActions fiche={fiche} /> : null}
      {onglet === "journal" ? <OngletJournal fiche={fiche} /> : null}
    </>
  );
}

/** Frise d'avancement PDCA déduite du statut de la fiche et de l'état des actions. */
function FrisePdca({
  statut,
  actions,
}: {
  statut: FicheErreur["erreur"]["statut"];
  actions: FicheErreur["actions"];
}) {
  const atteinte: Record<PhasePdca, boolean> = {
    plan: statut !== "declaree",
    do: actions.some((a) => a.statut !== "a_faire"),
    check: actions.some((a) => a.efficacite_ok !== null) || statut === "en_verification",
    act: statut === "cloturee",
  };

  const description: Record<PhasePdca, string> = {
    plan: "Analyser et planifier",
    do: "Mettre en œuvre",
    check: "Vérifier l'efficacité",
    act: "Standardiser / clôturer",
  };

  return (
    <ol className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {PHASES_PDCA.map((p) => (
        <li
          key={p}
          className={`rounded-lg border px-3 py-2 ${
            atteinte[p]
              ? "border-indigo-200 bg-indigo-50 dark:border-indigo-400/30 dark:bg-indigo-500/10"
              : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
          }`}
        >
          <p
            className={`text-xs font-semibold ${
              atteinte[p]
                ? "text-indigo-700 dark:text-indigo-300"
                : "text-zinc-400 dark:text-zinc-500"
            }`}
          >
            {libelleCourtPdca[p]}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{description[p]}</p>
        </li>
      ))}
    </ol>
  );
}

function OngletFiche({ fiche }: { fiche: FicheErreur }) {
  const { erreur } = fiche;
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Carte titre="Description factuelle" className="lg:col-span-2">
        <p className="text-sm whitespace-pre-line text-zinc-700 dark:text-zinc-200">
          {erreur.description || "Aucune description saisie."}
        </p>

        <dl className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
          <LigneDefinition terme="Référence">
            <span className="font-mono">{erreur.reference}</span>
          </LigneDefinition>
          <LigneDefinition terme="Service concerné">{erreur.service}</LigneDefinition>
          <LigneDefinition terme="Catégorie">{erreur.categorie}</LigneDefinition>
          <LigneDefinition terme="Date de survenue">
            {formatDate(erreur.date_survenue)}
          </LigneDefinition>
          <LigneDefinition terme="Date de détection">
            {formatDate(erreur.date_detection)}
          </LigneDefinition>
          <LigneDefinition terme="Déclarant">{erreur.declarant}</LigneDefinition>
          <LigneDefinition terme="Pilote">{erreur.pilote ?? "Non désigné"}</LigneDefinition>
          <LigneDefinition terme="Coût estimé">{formatEuros(erreur.cout_estime)}</LigneDefinition>
          <LigneDefinition terme="Impact client">
            {erreur.impact_client ? "Oui" : "Non"}
          </LigneDefinition>
          <LigneDefinition terme="Déjà constatée">
            {erreur.recurrente ? "Oui — récurrence" : "Non"}
          </LigneDefinition>
          <LigneDefinition terme="Clôturée le">
            {formatDateHeure(erreur.date_cloture)}
          </LigneDefinition>
        </dl>
      </Carte>

      <div className="space-y-4">
        <Carte titre="Synthèse">
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between gap-3">
              <span className="text-zinc-500 dark:text-zinc-400">Analyse</span>
              <span className="text-zinc-800 dark:text-zinc-100">
                {fiche.analyse
                  ? fiche.analyse.valide_le
                    ? "Validée"
                    : "En cours"
                  : "Non démarrée"}
              </span>
            </li>
            <li className="flex justify-between gap-3">
              <span className="text-zinc-500 dark:text-zinc-400">Actions</span>
              <span className="text-zinc-800 dark:text-zinc-100">
                {fiche.actions.filter((a) => a.statut === "faite").length}/{fiche.actions.length}{" "}
                réalisées
              </span>
            </li>
            <li className="flex justify-between gap-3">
              <span className="text-zinc-500 dark:text-zinc-400">Cause racine</span>
              <span className="text-right text-zinc-800 dark:text-zinc-100">
                {fiche.analyse?.cause_racine ? "Identifiée" : "À déterminer"}
              </span>
            </li>
          </ul>
        </Carte>

        <Carte titre="Zone de danger" aide="La suppression est définitive.">
          <form action={supprimerErreur}>
            <input type="hidden" name="erreur_id" value={erreur.id} />
            <button
              type="submit"
              className="w-full rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-400/40 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              Supprimer la fiche
            </button>
          </form>
        </Carte>
      </div>
    </div>
  );
}

function OngletAnalyse({ fiche }: { fiche: FicheErreur }) {
  const { erreur, analyse } = fiche;

  return (
    <div className="space-y-4">
      {analyse && analyse.causes.length ? (
        <Carte titre="Diagramme d'Ishikawa" aide="Vue de synthèse des causes par famille (6M)">
          <DiagrammeIshikawa causes={analyse.causes} probleme={analyse.probleme || erreur.titre} />
        </Carte>
      ) : null}

      {analyse?.valide_le ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          Analyse validée par {analyse.valide_par ?? "—"} le {formatDateHeure(analyse.valide_le)}.
        </p>
      ) : null}

      <EditeurAnalyse erreurId={erreur.id} analyse={analyse} titreErreur={erreur.titre} />
    </div>
  );
}

function OngletActions({ fiche }: { fiche: FicheErreur }) {
  const { erreur, actions, analyse } = fiche;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        {PHASES_PDCA.map((phase) => {
          const liste = actions.filter((a) => a.phase_pdca === phase);
          if (!liste.length) return null;
          return (
            <Carte key={phase} titre={`Phase ${libelleCourtPdca[phase]}`}>
              <ul className="space-y-3">
                {liste.map((a) => (
                  <CarteAction key={a.id} action={a} />
                ))}
              </ul>
            </Carte>
          );
        })}

        {actions.length === 0 ? (
          <EtatVide
            titre="Aucune action planifiée"
            message="Définissez au moins une action corrective portant sur la cause racine, puis une action préventive pour éviter la récidive."
          />
        ) : null}
      </div>

      <Carte titre="Ajouter une action" aide="CAPA — curative, corrective ou préventive">
        <FormulaireAction erreurId={erreur.id} causeRacine={analyse?.cause_racine ?? null} />
      </Carte>
    </div>
  );
}

function OngletJournal({ fiche }: { fiche: FicheErreur }) {
  const { erreur, journal } = fiche;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Carte titre="Historique de la fiche" className="lg:col-span-2">
        {journal.length ? (
          <ol className="relative space-y-4 border-l border-zinc-200 pl-5 dark:border-zinc-800">
            {journal.map((e) => (
              <li key={e.id} className="relative">
                <span
                  aria-hidden
                  className="absolute top-1.5 -left-[23px] h-2.5 w-2.5 rounded-full bg-indigo-500"
                />
                <p className="text-sm text-zinc-800 dark:text-zinc-100">{e.message}</p>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {e.auteur} · {formatDateHeure(e.cree_le)} · {e.type}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="py-6 text-center text-sm text-zinc-500">Aucun évènement.</p>
        )}
      </Carte>

      <Carte titre="Ajouter un commentaire">
        <form action={ajouterCommentaire} className="space-y-3">
          <input type="hidden" name="erreur_id" value={erreur.id} />
          <textarea
            name="message"
            rows={4}
            required
            className="champ resize-y"
            placeholder="Point d'avancement, décision, information utile…"
          />
          <div className="flex justify-end">
            <button type="submit" className="bouton-primaire">
              Publier
            </button>
          </div>
        </form>
      </Carte>
    </div>
  );
}
