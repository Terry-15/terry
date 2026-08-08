import { depot } from "@/lib/repo";

export const dynamic = "force-dynamic";

const COLONNES = [
  "reference",
  "titre",
  "service",
  "categorie",
  "gravite",
  "statut",
  "date_detection",
  "date_survenue",
  "declarant",
  "pilote",
  "cout_estime",
  "impact_client",
  "recurrente",
  "date_cloture",
] as const;

function echapper(valeur: unknown): string {
  if (valeur === null || valeur === undefined) return "";
  const texte = String(valeur);
  return /[";\n]/.test(texte) ? `"${texte.replace(/"/g, '""')}"` : texte;
}

/** Export CSV des fiches (séparateur `;` pour une ouverture directe dans Excel FR). */
export async function GET(requete: Request) {
  const url = new URL(requete.url);
  const periodeJours = Number(url.searchParams.get("periode") ?? 0) || 0;

  const erreurs = await depot().listerErreurs({ periodeJours });

  const lignes = [
    COLONNES.join(";"),
    ...erreurs.map((e) => COLONNES.map((c) => echapper(e[c])).join(";")),
  ];

  const horodatage = new Date().toISOString().slice(0, 10);

  return new Response(`﻿${lignes.join("\r\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="erreurs-${horodatage}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
