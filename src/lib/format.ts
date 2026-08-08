/** Helpers de formatage — locale fr-FR, fuseau neutre (dates stockées en AAAA-MM-JJ). */

const dateCourte = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

const dateLongue = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const dateHeure = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

const moisAn = new Intl.DateTimeFormat("fr-FR", {
  month: "short",
  year: "2-digit",
  timeZone: "UTC",
});

const euros = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

function versDate(valeur: string | Date | null | undefined): Date | null {
  if (!valeur) return null;
  const d = valeur instanceof Date ? valeur : new Date(valeur);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(valeur: string | Date | null | undefined): string {
  const d = versDate(valeur);
  return d ? dateCourte.format(d) : "—";
}

export function formatDateLongue(valeur: string | Date | null | undefined): string {
  const d = versDate(valeur);
  return d ? dateLongue.format(d) : "—";
}

export function formatDateHeure(valeur: string | Date | null | undefined): string {
  const d = versDate(valeur);
  return d ? dateHeure.format(d) : "—";
}

export function formatMois(valeur: string | Date): string {
  const d = versDate(valeur);
  return d ? moisAn.format(d) : "—";
}

export function formatEuros(valeur: number | null | undefined): string {
  if (valeur === null || valeur === undefined) return "—";
  return euros.format(valeur);
}

export function formatNombre(valeur: number, decimales = 0): string {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(valeur);
}

export function formatPourcent(valeur: number, decimales = 0): string {
  return `${formatNombre(valeur, decimales)} %`;
}

/** Nombre de jours entiers entre deux dates (b - a). */
export function ecartJours(a: string | Date, b: string | Date = new Date()): number {
  const da = versDate(a);
  const db = versDate(b);
  if (!da || !db) return 0;
  return Math.floor((db.getTime() - da.getTime()) / 86_400_000);
}

/** Date du jour au format AAAA-MM-JJ. */
export function aujourdhui(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Retard en jours d'une échéance (positif = en retard). */
export function joursDeRetard(echeance: string): number {
  return ecartJours(echeance, aujourdhui());
}
