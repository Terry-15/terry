/** Modèle de données de l'application « Amélioration continue — erreurs ». */

export type Gravite = "mineure" | "majeure" | "critique";

export type StatutErreur =
  | "declaree"
  | "en_analyse"
  | "plan_action"
  | "en_verification"
  | "cloturee"
  | "rejetee";

export type TypeAction = "curative" | "corrective" | "preventive";

export type StatutAction = "a_faire" | "en_cours" | "faite" | "annulee";

export type PhasePdca = "plan" | "do" | "check" | "act";

export type Famille5M =
  | "main_doeuvre"
  | "matiere"
  | "materiel"
  | "methode"
  | "milieu"
  | "mesure";

export interface Erreur {
  id: string;
  reference: string;
  titre: string;
  description: string;
  service: string;
  categorie: string;
  gravite: Gravite;
  statut: StatutErreur;
  /** Date ISO (AAAA-MM-JJ) de détection. */
  date_detection: string;
  /** Date ISO (AAAA-MM-JJ) de survenue, si connue. */
  date_survenue: string | null;
  declarant: string;
  pilote: string | null;
  cout_estime: number | null;
  impact_client: boolean;
  recurrente: boolean;
  date_cloture: string | null;
  cree_le: string;
  maj_le: string;
}

export interface Pourquoi {
  id: string;
  analyse_id: string;
  niveau: number;
  question: string;
  reponse: string;
}

export interface IshikawaCause {
  id: string;
  analyse_id: string;
  famille: Famille5M;
  libelle: string;
  est_racine: boolean;
}

export interface Analyse {
  id: string;
  erreur_id: string;
  probleme: string;
  cause_racine: string | null;
  conclusion: string | null;
  valide_par: string | null;
  valide_le: string | null;
}

export interface AnalyseComplete extends Analyse {
  pourquoi: Pourquoi[];
  causes: IshikawaCause[];
}

export interface ActionCapa {
  id: string;
  erreur_id: string;
  titre: string;
  description: string | null;
  type: TypeAction;
  phase_pdca: PhasePdca;
  pilote: string;
  echeance: string;
  statut: StatutAction;
  date_realisation: string | null;
  efficacite_ok: boolean | null;
  efficacite_commentaire: string | null;
  efficacite_date: string | null;
}

export interface EvenementJournal {
  id: string;
  erreur_id: string;
  type: string;
  message: string;
  auteur: string;
  cree_le: string;
}

/** Fiche complète : erreur + analyse + plan d'actions + journal. */
export interface FicheErreur {
  erreur: Erreur;
  analyse: AnalyseComplete | null;
  actions: ActionCapa[];
  journal: EvenementJournal[];
}

export interface Referentiels {
  services: string[];
  categories: string[];
}

export interface FiltresErreurs {
  recherche?: string;
  statut?: StatutErreur | "toutes";
  gravite?: Gravite | "toutes";
  service?: string | "tous";
  categorie?: string | "toutes";
  /** Fenêtre glissante en jours ; 0 = pas de limite. */
  periodeJours?: number;
}
