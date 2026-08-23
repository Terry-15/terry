import Link from "next/link";

export default function Introuvable() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Erreur 404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Page introuvable
      </h1>
      <p className="mt-1 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
        La fiche ou la page demandée n&apos;existe pas, ou a été supprimée.
      </p>
      <Link href="/" className="bouton-primaire mt-5">
        Retour au tableau de bord
      </Link>
    </div>
  );
}
