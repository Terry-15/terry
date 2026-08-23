import { Carte, EntetePage } from "@/components/ui/divers";
import { ajouterReferentiel, retirerReferentiel } from "@/lib/actions";
import { depot, modeDemo } from "@/lib/repo";

export const dynamic = "force-dynamic";

export const metadata = { title: "Référentiels" };

export default async function PageReferentiels() {
  const referentiels = await depot().referentiels();

  return (
    <>
      <EntetePage
        titre="Référentiels"
        sousTitre="Listes de valeurs proposées à la déclaration d'une erreur."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ListeReferentiel
          type="service"
          titre="Services"
          aide="Entité où l'erreur a été détectée."
          valeurs={referentiels.services}
        />
        <ListeReferentiel
          type="categorie"
          titre="Catégories d'erreur"
          aide="Typologie utilisée pour le Pareto."
          valeurs={referentiels.categories}
        />
      </div>

      <Carte titre="Configuration" className="mt-4">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-zinc-500 dark:text-zinc-400">Source de données</dt>
            <dd className="font-medium text-zinc-800 dark:text-zinc-100">
              {modeDemo() ? "Jeu de démonstration (mémoire)" : "Supabase (PostgreSQL)"}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-zinc-500 dark:text-zinc-400">Export</dt>
            <dd>
              <a href="/api/export" className="lien font-medium">
                Télécharger les fiches (CSV)
              </a>
            </dd>
          </div>
        </dl>
        {modeDemo() ? (
          <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
            Les modifications faites en mode démonstration ne sont pas persistées : renseignez les
            variables Supabase dans <code className="font-mono">.env.local</code>, puis appliquez la
            migration <code className="font-mono">supabase/migrations</code>.
          </p>
        ) : null}
      </Carte>
    </>
  );
}

function ListeReferentiel({
  type,
  titre,
  aide,
  valeurs,
}: {
  type: "service" | "categorie";
  titre: string;
  aide: string;
  valeurs: string[];
}) {
  return (
    <Carte titre={titre} aide={aide}>
      <form action={ajouterReferentiel} className="mb-4 flex gap-2">
        <input type="hidden" name="type" value={type} />
        <input name="nom" required className="champ" placeholder={`Ajouter — ${titre.toLowerCase()}`} />
        <button type="submit" className="bouton-primaire shrink-0">
          Ajouter
        </button>
      </form>

      {valeurs.length ? (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {valeurs.map((v) => (
            <li key={v} className="flex items-center justify-between gap-3 py-2">
              <span className="text-sm text-zinc-700 dark:text-zinc-200">{v}</span>
              <form action={retirerReferentiel}>
                <input type="hidden" name="type" value={type} />
                <input type="hidden" name="nom" value={v} />
                <button
                  type="submit"
                  className="text-xs text-zinc-400 transition-colors hover:text-red-600"
                >
                  Retirer
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-4 text-center text-sm text-zinc-500">Aucune valeur.</p>
      )}
    </Carte>
  );
}
