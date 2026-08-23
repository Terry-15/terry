import { construireJeuDemo, type JeuDemo } from "./demo-data";
import {
  appliquerFiltres,
  type ActionAvecErreur,
  type Depot,
  type EntreeAction,
  type EntreeAnalyse,
  type EntreeErreur,
  type FiltresActions,
  type MajAction,
} from "./depot";
import type {
  Analyse,
  AnalyseComplete,
  Erreur,
  FicheErreur,
  FiltresErreurs,
  Referentiels,
  StatutErreur,
} from "@/lib/types";

/**
 * Dépôt en mémoire utilisé sans Supabase (mode démo).
 * Le magasin est accroché à `globalThis` pour survivre au rechargement à chaud
 * du serveur de développement.
 */

const CLE = Symbol.for("amelioration-continue.magasin-demo");

type Global = typeof globalThis & { [CLE]?: JeuDemo };

function magasin(): JeuDemo {
  const g = globalThis as Global;
  if (!g[CLE]) g[CLE] = construireJeuDemo();
  return g[CLE];
}

let sequence = 0;
const identifiant = (prefixe: string) => `${prefixe}-${Date.now().toString(36)}-${sequence++}`;

function maintenant(): string {
  return new Date().toISOString();
}

function tracer(erreurId: string, type: string, message: string, auteur: string): void {
  magasin().journal.push({
    id: identifiant("jrn"),
    erreur_id: erreurId,
    type,
    message,
    auteur,
    cree_le: maintenant(),
  });
}

export const depotDemo: Depot = {
  mode: "demo",

  async listerErreurs(filtres: FiltresErreurs = {}): Promise<Erreur[]> {
    return appliquerFiltres(magasin().erreurs, filtres).sort((a, b) =>
      b.date_detection.localeCompare(a.date_detection),
    );
  },

  async obtenirFiche(id: string): Promise<FicheErreur | null> {
    const m = magasin();
    const erreur = m.erreurs.find((e) => e.id === id);
    if (!erreur) return null;

    const base = m.analyses.find((a) => a.erreur_id === id) ?? null;
    const analyse: AnalyseComplete | null = base
      ? {
          ...base,
          pourquoi: m.pourquoi
            .filter((p) => p.analyse_id === base.id)
            .sort((a, b) => a.niveau - b.niveau),
          causes: m.causes.filter((c) => c.analyse_id === base.id),
        }
      : null;

    return {
      erreur,
      analyse,
      actions: m.actions
        .filter((a) => a.erreur_id === id)
        .sort((a, b) => a.echeance.localeCompare(b.echeance)),
      journal: m.journal
        .filter((j) => j.erreur_id === id)
        .sort((a, b) => b.cree_le.localeCompare(a.cree_le)),
    };
  },

  async creerErreur(entree: EntreeErreur, auteur: string): Promise<Erreur> {
    const m = magasin();
    const annee = entree.date_detection.slice(0, 4);
    const derniere = m.erreurs
      .filter((e) => e.reference.startsWith(`NC-${annee}-`))
      .reduce((max, e) => Math.max(max, Number(e.reference.slice(8)) || 0), 0);

    const erreur: Erreur = {
      id: identifiant("err"),
      reference: `NC-${annee}-${String(derniere + 1).padStart(4, "0")}`,
      statut: "declaree",
      date_cloture: null,
      cree_le: maintenant(),
      maj_le: maintenant(),
      ...entree,
    };
    m.erreurs.push(erreur);
    tracer(erreur.id, "creation", `Fiche créée : ${erreur.titre}`, auteur);
    return erreur;
  },

  async majStatutErreur(id: string, statut: StatutErreur, auteur: string): Promise<void> {
    const erreur = magasin().erreurs.find((e) => e.id === id);
    if (!erreur) return;
    const ancien = erreur.statut;
    erreur.statut = statut;
    erreur.maj_le = maintenant();
    erreur.date_cloture = statut === "cloturee" ? maintenant() : null;
    tracer(id, "statut", `Statut : ${ancien} → ${statut}`, auteur);
  },

  async majErreur(id: string, patch: Partial<EntreeErreur>, auteur: string): Promise<void> {
    const erreur = magasin().erreurs.find((e) => e.id === id);
    if (!erreur) return;
    Object.assign(erreur, patch, { maj_le: maintenant() });
    tracer(id, "modification", "Fiche modifiée.", auteur);
  },

  async supprimerErreur(id: string): Promise<void> {
    const m = magasin();
    const analyse = m.analyses.find((a) => a.erreur_id === id);
    if (analyse) {
      m.pourquoi = m.pourquoi.filter((p) => p.analyse_id !== analyse.id);
      m.causes = m.causes.filter((c) => c.analyse_id !== analyse.id);
      m.analyses = m.analyses.filter((a) => a.id !== analyse.id);
    }
    m.actions = m.actions.filter((a) => a.erreur_id !== id);
    m.journal = m.journal.filter((j) => j.erreur_id !== id);
    m.erreurs = m.erreurs.filter((e) => e.id !== id);
  },

  async enregistrerAnalyse(
    erreurId: string,
    entree: EntreeAnalyse,
    auteur: string,
  ): Promise<void> {
    const m = magasin();
    const existante = m.analyses.find((a) => a.erreur_id === erreurId);
    const analyse: Analyse = existante ?? {
      id: identifiant("ana"),
      erreur_id: erreurId,
      probleme: "",
      cause_racine: null,
      conclusion: null,
      valide_par: null,
      valide_le: null,
    };
    if (!existante) m.analyses.push(analyse);

    analyse.probleme = entree.probleme;
    analyse.cause_racine = entree.cause_racine;
    analyse.conclusion = entree.conclusion;
    analyse.valide_par = entree.valide ? (entree.valide_par ?? auteur) : null;
    analyse.valide_le = entree.valide ? maintenant() : null;

    m.pourquoi = m.pourquoi.filter((p) => p.analyse_id !== analyse.id);
    entree.pourquoi.forEach((p) => {
      m.pourquoi.push({ id: identifiant("pq"), analyse_id: analyse.id, ...p });
    });

    m.causes = m.causes.filter((c) => c.analyse_id !== analyse.id);
    entree.causes.forEach((c) => {
      m.causes.push({ id: identifiant("cz"), analyse_id: analyse.id, ...c });
    });

    tracer(erreurId, "analyse", "Analyse des causes enregistrée.", auteur);
  },

  async listerActions(filtres: FiltresActions = {}): Promise<ActionAvecErreur[]> {
    const m = magasin();
    const aujourdhui = new Date().toISOString().slice(0, 10);

    return m.actions
      .map((a) => {
        const e = m.erreurs.find((x) => x.id === a.erreur_id);
        return {
          ...a,
          erreur_reference: e?.reference ?? "—",
          erreur_titre: e?.titre ?? "—",
          service: e?.service ?? "—",
        };
      })
      .filter((a) => {
        if (filtres.statut && filtres.statut !== "toutes" && a.statut !== filtres.statut) return false;
        if (filtres.type && filtres.type !== "tous" && a.type !== filtres.type) return false;
        if (filtres.pilote && filtres.pilote !== "tous" && a.pilote !== filtres.pilote) return false;
        if (filtres.enRetard) {
          const ouverte = a.statut === "a_faire" || a.statut === "en_cours";
          if (!ouverte || a.echeance >= aujourdhui) return false;
        }
        return true;
      })
      .sort((a, b) => a.echeance.localeCompare(b.echeance));
  },

  async ajouterAction(erreurId: string, entree: EntreeAction, auteur: string): Promise<void> {
    magasin().actions.push({
      id: identifiant("act"),
      erreur_id: erreurId,
      statut: "a_faire",
      date_realisation: null,
      efficacite_ok: null,
      efficacite_commentaire: null,
      efficacite_date: null,
      ...entree,
    });
    tracer(erreurId, "action", `Action ajoutée : ${entree.titre}`, auteur);
  },

  async majAction(id: string, patch: MajAction, auteur: string): Promise<void> {
    const action = magasin().actions.find((a) => a.id === id);
    if (!action) return;
    Object.assign(action, patch);
    tracer(action.erreur_id, "action", `Action mise à jour : ${action.titre}`, auteur);
  },

  async supprimerAction(id: string): Promise<void> {
    const m = magasin();
    m.actions = m.actions.filter((a) => a.id !== id);
  },

  async ajouterCommentaire(erreurId: string, message: string, auteur: string): Promise<void> {
    tracer(erreurId, "commentaire", message, auteur);
  },

  async referentiels(): Promise<Referentiels> {
    const m = magasin();
    return { services: [...m.services], categories: [...m.categories] };
  },

  async ajouterReferentiel(type: "service" | "categorie", nom: string): Promise<void> {
    const m = magasin();
    const liste = type === "service" ? m.services : m.categories;
    if (!liste.includes(nom)) liste.push(nom);
  },

  async supprimerReferentiel(type: "service" | "categorie", nom: string): Promise<void> {
    const m = magasin();
    if (type === "service") m.services = m.services.filter((s) => s !== nom);
    else m.categories = m.categories.filter((c) => c !== nom);
  },
};
