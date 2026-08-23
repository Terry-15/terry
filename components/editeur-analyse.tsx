"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { enregistrerAnalyse, type EtatFormulaire } from "@/lib/actions";
import { couleurFamille, FAMILLES_5M, libelleFamille5M } from "@/lib/labels";
import type { AnalyseComplete, Famille5M } from "@/lib/types";

interface LignePourquoi {
  question: string;
  reponse: string;
}

interface LigneCause {
  famille: Famille5M;
  libelle: string;
  est_racine: boolean;
}

const QUESTIONS_TYPE = [
  "Pourquoi le problème est-il apparu ?",
  "Pourquoi cette cause s'est-elle produite ?",
  "Pourquoi n'a-t-elle pas été évitée ?",
  "Pourquoi le dispositif n'a-t-il pas fonctionné ?",
  "Pourquoi ce dispositif est-il absent ou inefficace ?",
  "Pourquoi ce niveau n'est-il pas couvert ?",
  "Pourquoi cela n'a-t-il jamais été traité ?",
];

function BoutonEnregistrer() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="bouton-primaire" disabled={pending}>
      {pending ? "Enregistrement…" : "Enregistrer l'analyse"}
    </button>
  );
}

export function EditeurAnalyse({
  erreurId,
  analyse,
  titreErreur,
}: {
  erreurId: string;
  analyse: AnalyseComplete | null;
  titreErreur: string;
}) {
  const [etat, action] = useActionState<EtatFormulaire, FormData>(enregistrerAnalyse, {});

  const [probleme, setProbleme] = useState(analyse?.probleme || titreErreur);
  const [causeRacine, setCauseRacine] = useState(analyse?.cause_racine ?? "");
  const [conclusion, setConclusion] = useState(analyse?.conclusion ?? "");
  const [valide, setValide] = useState(Boolean(analyse?.valide_le));

  const [pourquoi, setPourquoi] = useState<LignePourquoi[]>(() => {
    const existant = analyse?.pourquoi ?? [];
    if (existant.length) return existant.map((p) => ({ question: p.question, reponse: p.reponse }));
    return Array.from({ length: 5 }, (_, i) => ({ question: QUESTIONS_TYPE[i], reponse: "" }));
  });

  const [causes, setCauses] = useState<LigneCause[]>(
    () =>
      analyse?.causes.map((c) => ({
        famille: c.famille,
        libelle: c.libelle,
        est_racine: c.est_racine,
      })) ?? [],
  );

  const [saisies, setSaisies] = useState<Record<string, string>>({});

  const majPourquoi = (index: number, champ: keyof LignePourquoi, valeur: string) => {
    setPourquoi((liste) =>
      liste.map((l, i) => (i === index ? { ...l, [champ]: valeur } : l)),
    );
  };

  const ajouterCause = (famille: Famille5M) => {
    const libelle = (saisies[famille] ?? "").trim();
    if (!libelle) return;
    setCauses((liste) => [...liste, { famille, libelle, est_racine: false }]);
    setSaisies((s) => ({ ...s, [famille]: "" }));
  };

  const charge = JSON.stringify({
    probleme,
    cause_racine: causeRacine,
    conclusion,
    valide,
    pourquoi,
    causes,
  });

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="erreur_id" value={erreurId} />
      <input type="hidden" name="charge" value={charge} />

      {etat.erreur ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-300"
        >
          {etat.erreur}
        </p>
      ) : null}
      {etat.succes ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          {etat.succes}
        </p>
      ) : null}

      <section className="carte p-4">
        <h3 className="titre-section mb-1">Énoncé du problème</h3>
        <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
          Un fait mesurable : quoi, où, quand, combien.
        </p>
        <textarea
          rows={2}
          value={probleme}
          onChange={(e) => setProbleme(e.target.value)}
          className="champ resize-y"
        />
      </section>

      <section className="carte p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="titre-section">Les 5 Pourquoi</h3>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Remontez la chaîne causale jusqu&apos;à une cause sur laquelle vous pouvez agir.
            </p>
          </div>
          <div className="flex shrink-0 gap-1">
            {pourquoi.length < 7 ? (
              <button
                type="button"
                className="bouton-discret"
                onClick={() =>
                  setPourquoi((l) => [
                    ...l,
                    { question: QUESTIONS_TYPE[l.length] ?? "Pourquoi ?", reponse: "" },
                  ])
                }
              >
                + Niveau
              </button>
            ) : null}
            {pourquoi.length > 1 ? (
              <button
                type="button"
                className="bouton-discret"
                onClick={() => setPourquoi((l) => l.slice(0, -1))}
              >
                − Niveau
              </button>
            ) : null}
          </div>
        </div>

        <ol className="space-y-3">
          {pourquoi.map((ligne, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1 space-y-2">
                <input
                  value={ligne.question}
                  onChange={(e) => majPourquoi(i, "question", e.target.value)}
                  className="champ text-sm font-medium"
                  placeholder="Question"
                />
                <textarea
                  rows={2}
                  value={ligne.reponse}
                  onChange={(e) => majPourquoi(i, "reponse", e.target.value)}
                  className="champ resize-y text-sm"
                  placeholder="Parce que…"
                />
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="carte p-4">
        <h3 className="titre-section mb-1">Causes possibles — les 6M (Ishikawa)</h3>
        <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
          Listez les causes possibles par famille, puis cochez celles retenues comme causes racines.
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FAMILLES_5M.map((famille) => {
            const liste = causes
              .map((c, index) => ({ ...c, index }))
              .filter((c) => c.famille === famille);

            return (
              <div
                key={famille}
                className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
              >
                <p
                  className="mb-2 text-xs font-semibold"
                  style={{ color: couleurFamille[famille] }}
                >
                  {libelleFamille5M[famille]}
                </p>

                <ul className="mb-2 space-y-1.5">
                  {liste.map((c) => (
                    <li key={c.index} className="flex items-start gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={c.est_racine}
                        onChange={(e) =>
                          setCauses((l) =>
                            l.map((x, i) =>
                              i === c.index ? { ...x, est_racine: e.target.checked } : x,
                            ),
                          )
                        }
                        title="Marquer comme cause racine"
                        className="mt-0.5 accent-red-600"
                      />
                      <span
                        className={`min-w-0 flex-1 break-words ${
                          c.est_racine
                            ? "font-semibold text-red-600 dark:text-red-400"
                            : "text-zinc-700 dark:text-zinc-300"
                        }`}
                      >
                        {c.libelle}
                      </span>
                      <button
                        type="button"
                        aria-label="Supprimer la cause"
                        onClick={() => setCauses((l) => l.filter((_, i) => i !== c.index))}
                        className="shrink-0 text-zinc-400 hover:text-red-600"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                  {liste.length === 0 ? (
                    <li className="text-xs text-zinc-400">Aucune cause listée.</li>
                  ) : null}
                </ul>

                <div className="flex gap-1.5">
                  <input
                    value={saisies[famille] ?? ""}
                    onChange={(e) => setSaisies((s) => ({ ...s, [famille]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        ajouterCause(famille);
                      }
                    }}
                    placeholder="Ajouter une cause…"
                    className="champ px-2 py-1 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => ajouterCause(famille)}
                    className="bouton-secondaire px-2 py-1 text-xs"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="carte p-4">
        <h3 className="titre-section mb-3">Conclusion de l&apos;analyse</h3>

        <div className="space-y-3">
          <div>
            <label className="libelle-champ" htmlFor="cause_racine">
              Cause racine retenue
            </label>
            <textarea
              id="cause_racine"
              rows={2}
              value={causeRacine}
              onChange={(e) => setCauseRacine(e.target.value)}
              className="champ resize-y"
              placeholder="La cause sur laquelle porteront les actions correctives."
            />
          </div>

          <div>
            <label className="libelle-champ" htmlFor="conclusion">
              Commentaire
            </label>
            <textarea
              id="conclusion"
              rows={3}
              value={conclusion}
              onChange={(e) => setConclusion(e.target.value)}
              className="champ resize-y"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={valide}
              onChange={(e) => setValide(e.target.checked)}
              className="accent-indigo-600"
            />
            Analyse validée (cause racine confirmée)
          </label>
        </div>

        <div className="mt-4 flex justify-end">
          <BoutonEnregistrer />
        </div>
      </section>
    </form>
  );
}
