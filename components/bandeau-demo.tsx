export function BandeauDemo() {
  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-800 sm:px-6 lg:px-8 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
      <strong className="font-semibold">Mode démonstration</strong> — données fictives en mémoire,
      réinitialisées au redémarrage du serveur. Renseignez{" "}
      <code className="rounded bg-amber-100 px-1 py-0.5 font-mono dark:bg-amber-500/20">
        NEXT_PUBLIC_SUPABASE_URL
      </code>{" "}
      et{" "}
      <code className="rounded bg-amber-100 px-1 py-0.5 font-mono dark:bg-amber-500/20">
        NEXT_PUBLIC_SUPABASE_ANON_KEY
      </code>{" "}
      pour brancher Supabase.
    </div>
  );
}
