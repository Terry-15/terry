import type { Metadata } from "next";

import { BarreJeu } from "@/composants/barre-jeu";
import { FournisseurPartie } from "@/jeu/etat";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Demi-Centre — manager de handball",
    template: "%s · Demi-Centre",
  },
  description:
    "Jeu de gestion de handball : trois divisions fictives, un moteur de match possession par possession, et des décisions tactiques qui pèsent vraiment sur le résultat.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full font-sans">
        <FournisseurPartie>
          <BarreJeu />
          <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">{children}</main>
          <footer className="mx-auto w-full max-w-6xl px-4 pb-10 font-mono text-[11px] text-doux sm:px-6">
            Demi-Centre — monde, clubs et joueurs 100 % fictifs. Sauvegarde locale à ce navigateur.
          </footer>
        </FournisseurPartie>
      </body>
    </html>
  );
}
