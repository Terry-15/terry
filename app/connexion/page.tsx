import { FormulaireConnexion } from "@/components/formulaire-connexion";
import { supabaseConfigure } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export const metadata = { title: "Connexion" };

export default function PageConnexion() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center">
      <div className="mb-6 text-center">
        <span
          aria-hidden
          className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white"
        >
          AC
        </span>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Amélioration continue
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Connectez-vous pour accéder aux fiches d&apos;erreur.
        </p>
      </div>

      {supabaseConfigure() ? (
        <FormulaireConnexion />
      ) : (
        <p className="carte p-4 text-sm text-zinc-600 dark:text-zinc-300">
          L&apos;authentification nécessite une instance Supabase. En mode démonstration,
          l&apos;application est accessible sans compte.
        </p>
      )}
    </div>
  );
}
