import { FormulaireErreur } from "@/components/formulaire-erreur";
import { EntetePage } from "@/components/ui/divers";
import { utilisateurCourant } from "@/lib/auth";
import { depot } from "@/lib/repo";

export const dynamic = "force-dynamic";

export const metadata = { title: "Déclarer une erreur" };

export default async function PageNouvelleErreur() {
  const [referentiels, utilisateur] = await Promise.all([
    depot().referentiels(),
    utilisateurCourant(),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <EntetePage
        titre="Déclarer une erreur"
        sousTitre="Toute anomalie détectée mérite une fiche : c'est le point d'entrée de la boucle d'amélioration."
      />
      <FormulaireErreur
        referentiels={referentiels}
        declarantParDefaut={utilisateur.nom === "Utilisateur démo" ? "" : utilisateur.nom}
      />
    </div>
  );
}
