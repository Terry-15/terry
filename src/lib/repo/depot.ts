import type {
  ActionCapa,
  Erreur,
  Famille5M,
  FicheErreur,
  FiltresErreurs,
  PhasePdca,
  Referentiels,
  StatutAction,
  StatutErreur,
  TypeAction,
} from "@/lib/types";

/** Contrat d'accès aux données, implémenté par le dépôt Supabase et le dépôt de démonstration. */

export interface EntreeErreur {
  titre: string;
  description: string;
  service: string;
  categorie: string;
  gravite: Erreur["gravite"];
  date_detection: string;
  date_survenue: string | null;
  declarant: string;
  pilote: string | null;
  cout_estime: number | null;
  impact_client: boolean;
  recurrente: boolean;
}

export interface EntreeAction {
  titre: string;
  description: string | null;
  type: TypeAction;
  phase_pdca: PhasePdca;
  pilote: string;
  echeance: string;
}

export interface MajAction {
  statut?: StatutAction;
  phase_pdca?: PhasePdca;
  date_realisation?: string | null;
  efficacite_ok?: boolean | null;
  efficacite_commentaire?: string | null;
  efficacite_date?: string | null;
}

export interface EntreeAnalyse {
  probleme: string;
  cause_racine: string | null;
  conclusion: string | null;
  valide_par: string | null;
  valide: boolean;
  pourquoi: Array<{ niveau: number; question: string; reponse: string }>;
  causes: Array<{ famille: Famille5M; libelle: string; est_racine: boolean }>;
}

export interface ActionAvecErreur extends ActionCapa {
  erreur_reference: string;
  erreur_titre: string;
  service: string;
}

export interface FiltresActions {
  statut?: StatutAction | "toutes";
  type?: TypeAction | "tous";
  pilote?: string | "tous";
  /** N'afficher que les actions dont l'échéance est dépassée. */
  enRetard?: boolean;
}

export interface Depot {
  /** `supabase` si les variables d'environnement sont présentes, sinon `demo`. */
  readonly mode: "supabase" | "demo";

  listerErreurs(filtres?: FiltresErreurs): Promise<Erreur[]>;
  obtenirFiche(id: string): Promise<FicheErreur | null>;
  creerErreur(entree: EntreeErreur, auteur: string): Promise<Erreur>;
  majStatutErreur(id: string, statut: StatutErreur, auteur: string): Promise<void>;
  majErreur(id: string, patch: Partial<EntreeErreur>, auteur: string): Promise<void>;
  supprimerErreur(id: string): Promise<void>;

  enregistrerAnalyse(erreurId: string, entree: EntreeAnalyse, auteur: string): Promise<void>;

  listerActions(filtres?: FiltresActions): Promise<ActionAvecErreur[]>;
  ajouterAction(erreurId: string, entree: EntreeAction, auteur: string): Promise<void>;
  majAction(id: string, patch: MajAction, auteur: string): Promise<void>;
  supprimerAction(id: string): Promise<void>;

  ajouterCommentaire(erreurId: string, message: string, auteur: string): Promise<void>;

  referentiels(): Promise<Referentiels>;
  ajouterReferentiel(type: "service" | "categorie", nom: string): Promise<void>;
  supprimerReferentiel(type: "service" | "categorie", nom: string): Promise<void>;
}

/** Filtrage commun (appliqué en mémoire côté démo, et après requête côté Supabase). */
export function appliquerFiltres(erreurs: Erreur[], filtres: FiltresErreurs = {}): Erreur[] {
  const { recherche, statut, gravite, service, categorie, periodeJours } = filtres;
  const terme = recherche?.trim().toLowerCase();

  let limite: string | null = null;
  if (periodeJours && periodeJours > 0) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - periodeJours);
    limite = d.toISOString().slice(0, 10);
  }

  return erreurs.filter((e) => {
    if (statut && statut !== "toutes" && e.statut !== statut) return false;
    if (gravite && gravite !== "toutes" && e.gravite !== gravite) return false;
    if (service && service !== "tous" && e.service !== service) return false;
    if (categorie && categorie !== "toutes" && e.categorie !== categorie) return false;
    if (limite && e.date_detection < limite) return false;
    if (terme) {
      const foin = `${e.reference} ${e.titre} ${e.description} ${e.service} ${e.categorie} ${e.declarant} ${e.pilote ?? ""}`.toLowerCase();
      if (!foin.includes(terme)) return false;
    }
    return true;
  });
}
