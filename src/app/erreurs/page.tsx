import Link from "next/link";

import { FiltresErreursBarre } from "@/components/filtres-erreurs";
import { TableErreurs } from "@/components/table-erreurs";
import { Carte, EntetePage } from "@/components/ui/divers";
import { depot } from "@/lib/repo";
import type { FiltresErreurs, Gravite, StatutErreur } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = { title: "Fiches d'erreur" };

function premier(valeur: string | string[] | undefined): string | undefined {
  return Array.isArray(valeur) ? valeur[0] : valeur;
}

export default async function PageErreurs({ searchParams }: PageProps<"/erreurs">) {
  const params = await searchParams;

  const filtres: FiltresErreurs = {
    recherche: premier(params.recherche),
    statut: (premier(params.statut) as StatutErreur | "toutes") ?? "toutes",
    gravite: (premier(params.gravite) as Gravite | "toutes") ?? "toutes",
    service: premier(params.service) ?? "tous",
    periodeJours: Number(premier(params.periode) ?? 0) || 0,
  };

  const d = depot();
  const [erreurs, referentiels] = await Promise.all([d.listerErreurs(filtres), d.referentiels()]);

  return (
    <>
      <EntetePage
        titre="Fiches d'erreur"
        sousTitre="Déclarations de non-conformités, incidents et écarts de processus."
        actions={
          <Link href="/erreurs/nouvelle" className="bouton-primaire">
            + Déclarer une erreur
          </Link>
        }
      />

      <FiltresErreursBarre
        filtres={filtres}
        referentiels={referentiels}
        nbResultats={erreurs.length}
      />

      <Carte>
        <TableErreurs erreurs={erreurs} />
      </Carte>
    </>
  );
}
