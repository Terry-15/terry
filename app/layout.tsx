import type { Metadata } from "next";

import { BandeauDemo } from "@/components/bandeau-demo";
import { Navigation } from "@/components/navigation";
import { utilisateurCourant } from "@/lib/auth";
import { modeDemo } from "@/lib/repo";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Amélioration continue — Gestion des erreurs",
    template: "%s · Amélioration continue",
  },
  description:
    "Déclaration et suivi des erreurs, analyse des causes racines (5 Pourquoi, Ishikawa), plan d'actions CAPA et indicateurs qualité.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const utilisateur = await utilisateurCourant();

  return (
    <html lang="fr" className="h-full antialiased">
      <body className="flex min-h-full flex-col font-sans">
        <div className="flex min-h-screen flex-col lg:flex-row">
          <Navigation utilisateur={utilisateur} />
          <main className="min-w-0 flex-1">
            {modeDemo() ? <BandeauDemo /> : null}
            <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
