"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { nomAuteur } from "./auth";
import { supabaseConfigure } from "./supabase/config";
import { clientServeur } from "./supabase/server";
import { aujourdhui } from "./format";
import { FAMILLES_5M, PHASES_PDCA, STATUTS_ACTION, STATUTS_ERREUR, TYPES_ACTION } from "./labels";
import { depot } from "./repo";
import type { EntreeAnalyse } from "./repo";
import type {
  Famille5M,
  Gravite,
  PhasePdca,
  StatutAction,
  StatutErreur,
  TypeAction,
} from "./types";

/** Server Actions — toutes les écritures de l'application passent par ici. */

export interface EtatFormulaire {
  erreur?: string;
  succes?: string;
}

const texte = (f: FormData, cle: string): string => String(f.get(cle) ?? "").trim();
const booleen = (f: FormData, cle: string): boolean => f.get(cle) === "on" || f.get(cle) === "true";

function nombreOuNull(f: FormData, cle: string): number | null {
  const brut = texte(f, cle).replace(",", ".");
  if (!brut) return null;
  const n = Number(brut);
  return Number.isFinite(n) ? n : null;
}

function dansListe<T extends string>(valeur: string, liste: readonly T[], defaut: T): T {
  return (liste as readonly string[]).includes(valeur) ? (valeur as T) : defaut;
}

function rafraichir(erreurId?: string): void {
  revalidatePath("/");
  revalidatePath("/erreurs");
  revalidatePath("/actions");
  revalidatePath("/indicateurs");
  if (erreurId) revalidatePath(`/erreurs/${erreurId}`);
}

// -----------------------------------------------------------------------------
// Fiches d'erreur
// -----------------------------------------------------------------------------

export async function creerErreur(
  _etat: EtatFormulaire,
  donnees: FormData,
): Promise<EtatFormulaire> {
  const titre = texte(donnees, "titre");
  const service = texte(donnees, "service");
  const categorie = texte(donnees, "categorie");
  const declarant = texte(donnees, "declarant");
  const dateDetection = texte(donnees, "date_detection") || aujourdhui();
  const dateSurvenue = texte(donnees, "date_survenue") || null;

  if (titre.length < 5) return { erreur: "Le titre doit contenir au moins 5 caractères." };
  if (!service) return { erreur: "Le service concerné est obligatoire." };
  if (!categorie) return { erreur: "La catégorie est obligatoire." };
  if (!declarant) return { erreur: "Le nom du déclarant est obligatoire." };
  if (dateDetection > aujourdhui())
    return { erreur: "La date de détection ne peut pas être dans le futur." };
  if (dateSurvenue && dateSurvenue > dateDetection)
    return { erreur: "La date de survenue doit précéder la date de détection." };

  const fiche = await depot().creerErreur(
    {
      titre,
      description: texte(donnees, "description"),
      service,
      categorie,
      gravite: dansListe<Gravite>(texte(donnees, "gravite"), ["mineure", "majeure", "critique"], "mineure"),
      date_detection: dateDetection,
      date_survenue: dateSurvenue,
      declarant,
      pilote: texte(donnees, "pilote") || null,
      cout_estime: nombreOuNull(donnees, "cout_estime"),
      impact_client: booleen(donnees, "impact_client"),
      recurrente: booleen(donnees, "recurrente"),
    },
    await nomAuteur(),
  );

  rafraichir(fiche.id);
  redirect(`/erreurs/${fiche.id}`);
}

export async function changerStatutErreur(donnees: FormData): Promise<void> {
  const id = texte(donnees, "erreur_id");
  const statut = dansListe<StatutErreur>(texte(donnees, "statut"), STATUTS_ERREUR, "declaree");
  if (!id) return;

  await depot().majStatutErreur(id, statut, await nomAuteur());
  rafraichir(id);
}

export async function supprimerErreur(donnees: FormData): Promise<void> {
  const id = texte(donnees, "erreur_id");
  if (!id) return;
  await depot().supprimerErreur(id);
  rafraichir(id);
  redirect("/erreurs");
}

export async function ajouterCommentaire(donnees: FormData): Promise<void> {
  const id = texte(donnees, "erreur_id");
  const message = texte(donnees, "message");
  if (!id || !message) return;
  await depot().ajouterCommentaire(id, message, await nomAuteur());
  rafraichir(id);
}

// -----------------------------------------------------------------------------
// Analyse des causes racines
// -----------------------------------------------------------------------------

interface AnalyseSerialisee {
  probleme?: string;
  cause_racine?: string;
  conclusion?: string;
  valide?: boolean;
  pourquoi?: Array<{ question?: string; reponse?: string }>;
  causes?: Array<{ famille?: string; libelle?: string; est_racine?: boolean }>;
}

export async function enregistrerAnalyse(
  _etat: EtatFormulaire,
  donnees: FormData,
): Promise<EtatFormulaire> {
  const erreurId = texte(donnees, "erreur_id");
  if (!erreurId) return { erreur: "Fiche introuvable." };

  let charge: AnalyseSerialisee;
  try {
    charge = JSON.parse(texte(donnees, "charge") || "{}") as AnalyseSerialisee;
  } catch {
    return { erreur: "Données d'analyse illisibles." };
  }

  const pourquoi = (charge.pourquoi ?? [])
    .map((p, i) => ({
      niveau: i + 1,
      question: (p.question ?? "").trim(),
      reponse: (p.reponse ?? "").trim(),
    }))
    .filter((p) => p.question || p.reponse);

  const causes = (charge.causes ?? [])
    .map((c) => ({
      famille: dansListe<Famille5M>(c.famille ?? "", FAMILLES_5M, "methode"),
      libelle: (c.libelle ?? "").trim(),
      est_racine: Boolean(c.est_racine),
    }))
    .filter((c) => c.libelle);

  const entree: EntreeAnalyse = {
    probleme: (charge.probleme ?? "").trim(),
    cause_racine: (charge.cause_racine ?? "").trim() || null,
    conclusion: (charge.conclusion ?? "").trim() || null,
    valide_par: null,
    valide: Boolean(charge.valide),
    pourquoi,
    causes,
  };

  if (!entree.probleme) return { erreur: "L'énoncé du problème est obligatoire." };
  if (entree.valide && !entree.cause_racine)
    return { erreur: "Renseignez la cause racine avant de valider l'analyse." };

  await depot().enregistrerAnalyse(erreurId, entree, await nomAuteur());
  rafraichir(erreurId);
  return { succes: "Analyse enregistrée." };
}

// -----------------------------------------------------------------------------
// Plan d'actions CAPA
// -----------------------------------------------------------------------------

export async function ajouterAction(
  _etat: EtatFormulaire,
  donnees: FormData,
): Promise<EtatFormulaire> {
  const erreurId = texte(donnees, "erreur_id");
  const titre = texte(donnees, "titre");
  const pilote = texte(donnees, "pilote");
  const echeance = texte(donnees, "echeance");

  if (!erreurId) return { erreur: "Fiche introuvable." };
  if (titre.length < 3) return { erreur: "Décrivez l'action en quelques mots." };
  if (!pilote) return { erreur: "Un pilote doit être désigné." };
  if (!echeance) return { erreur: "Une échéance est obligatoire." };

  await depot().ajouterAction(
    erreurId,
    {
      titre,
      description: texte(donnees, "description") || null,
      type: dansListe<TypeAction>(texte(donnees, "type"), TYPES_ACTION, "corrective"),
      phase_pdca: dansListe<PhasePdca>(texte(donnees, "phase_pdca"), PHASES_PDCA, "plan"),
      pilote,
      echeance,
    },
    await nomAuteur(),
  );

  rafraichir(erreurId);
  return { succes: "Action ajoutée au plan." };
}

export async function changerStatutAction(donnees: FormData): Promise<void> {
  const id = texte(donnees, "action_id");
  const erreurId = texte(donnees, "erreur_id");
  const statut = dansListe<StatutAction>(texte(donnees, "statut"), STATUTS_ACTION, "a_faire");
  if (!id) return;

  await depot().majAction(
    id,
    {
      statut,
      date_realisation: statut === "faite" ? aujourdhui() : null,
      phase_pdca: statut === "faite" ? "check" : undefined,
    },
    await nomAuteur(),
  );
  rafraichir(erreurId || undefined);
}

export async function controlerEfficacite(donnees: FormData): Promise<void> {
  const id = texte(donnees, "action_id");
  const erreurId = texte(donnees, "erreur_id");
  if (!id) return;

  const efficace = texte(donnees, "efficacite_ok") === "oui";
  await depot().majAction(
    id,
    {
      efficacite_ok: efficace,
      efficacite_commentaire: texte(donnees, "efficacite_commentaire") || null,
      efficacite_date: aujourdhui(),
      phase_pdca: efficace ? "act" : "plan",
    },
    await nomAuteur(),
  );
  rafraichir(erreurId || undefined);
}

export async function supprimerAction(donnees: FormData): Promise<void> {
  const id = texte(donnees, "action_id");
  const erreurId = texte(donnees, "erreur_id");
  if (!id) return;
  await depot().supprimerAction(id);
  rafraichir(erreurId || undefined);
}

// -----------------------------------------------------------------------------
// Session
// -----------------------------------------------------------------------------

export async function seDeconnecter(): Promise<void> {
  if (supabaseConfigure()) {
    const sb = await clientServeur();
    await sb.auth.signOut();
  }
  redirect("/connexion");
}

// -----------------------------------------------------------------------------
// Référentiels
// -----------------------------------------------------------------------------

export async function ajouterReferentiel(donnees: FormData): Promise<void> {
  const type = texte(donnees, "type") === "service" ? "service" : "categorie";
  const nom = texte(donnees, "nom");
  if (!nom) return;
  await depot().ajouterReferentiel(type, nom);
  revalidatePath("/referentiels");
  revalidatePath("/erreurs/nouvelle");
}

export async function retirerReferentiel(donnees: FormData): Promise<void> {
  const type = texte(donnees, "type") === "service" ? "service" : "categorie";
  const nom = texte(donnees, "nom");
  if (!nom) return;
  await depot().supprimerReferentiel(type, nom);
  revalidatePath("/referentiels");
  revalidatePath("/erreurs/nouvelle");
}
