import Link from "next/link";
import type { ReactNode } from "react";

export function EntetePage({
  titre,
  sousTitre,
  actions,
}: {
  titre: string;
  sousTitre?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {titre}
        </h1>
        {sousTitre ? (
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{sousTitre}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function Carte({
  titre,
  aide,
  actions,
  children,
  className = "",
}: {
  titre?: string;
  aide?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`carte ${className}`}>
      {titre ? (
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <div>
            <h2 className="titre-section">{titre}</h2>
            {aide ? (
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{aide}</p>
            ) : null}
          </div>
          {actions}
        </div>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function EtatVide({
  titre,
  message,
  lien,
}: {
  titre: string;
  message: string;
  lien?: { href: string; libelle: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-zinc-700">
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{titre}</p>
      <p className="mt-1 max-w-md text-sm text-zinc-500 dark:text-zinc-400">{message}</p>
      {lien ? (
        <Link href={lien.href} className="bouton-primaire mt-4">
          {lien.libelle}
        </Link>
      ) : null}
    </div>
  );
}

export function LigneDefinition({ terme, children }: { terme: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-4">
      <dt className="w-48 shrink-0 text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {terme}
      </dt>
      <dd className="min-w-0 text-sm text-zinc-800 dark:text-zinc-200">{children}</dd>
    </div>
  );
}
