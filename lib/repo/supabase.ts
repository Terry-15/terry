import { clientServeur } from "@/lib/supabase/server";
import type {
  Analyse,
  AnalyseComplete,
  Erreur,
  EvenementJournal,
  FicheErreur,
  FiltresErreurs,
  IshikawaCause,
  Pourquoi,
  Referentiels,
  StatutErreur,
} from "@/lib/types";

import type {
  ActionAvecErreur,
  Depot,
  EntreeAction,
  EntreeAnalyse,
  EntreeErreur,
  FiltresActions,
  MajAction,
} from "./depot";
import type { ActionCapa } from "@/lib/types";

/** Dépôt Supabase (PostgREST). Les erreurs remontent telles quelles pour être affichées. */

function verifier<T>(donnees: T | null, erreur: { message: string } | null, contexte: string): T {
  if (erreur) throw new Error(`${contexte} : ${erreur.message}`);
  return donnees as T;
}

function dateLimite(periodeJours?: number): string | null {
  if (!periodeJours || periodeJours <= 0) return null;
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - periodeJours);
  return d.toISOString().slice(0, 10);
}

async function journaliser(
  erreurId: string,
  type: string,
  message: string,
  auteur: string,
): Promise<void> {
  const sb = await clientServeur();
  await sb.from("journal").insert({ erreur_id: erreurId, type, message, auteur });
}

export const depotSupabase: Depot = {
  mode: "supabase",

  async listerErreurs(filtres: FiltresErreurs = {}): Promise<Erreur[]> {
    const sb = await clientServeur();
    let requete = sb.from("erreurs").select("*").order("date_detection", { ascending: false });

    if (filtres.statut && filtres.statut !== "toutes") requete = requete.eq("statut", filtres.statut);
    if (filtres.gravite && filtres.gravite !== "toutes") requete = requete.eq("gravite", filtres.gravite);
    if (filtres.service && filtres.service !== "tous") requete = requete.eq("service", filtres.service);
    if (filtres.categorie && filtres.categorie !== "toutes")
      requete = requete.eq("categorie", filtres.categorie);

    const limite = dateLimite(filtres.periodeJours);
    if (limite) requete = requete.gte("date_detection", limite);

    const terme = filtres.recherche?.trim();
    if (terme) {
      const motif = `%${terme.replace(/[%,()]/g, " ")}%`;
      requete = requete.or(
        `reference.ilike.${motif},titre.ilike.${motif},description.ilike.${motif},declarant.ilike.${motif},pilote.ilike.${motif}`,
      );
    }

    const { data, error } = await requete;
    return verifier(data, error, "Chargement des fiches") as Erreur[];
  },

  async obtenirFiche(id: string): Promise<FicheErreur | null> {
    const sb = await clientServeur();

    const { data: erreur, error: errErreur } = await sb
      .from("erreurs")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (errErreur) throw new Error(`Chargement de la fiche : ${errErreur.message}`);
    if (!erreur) return null;

    const [analyseRes, actionsRes, journalRes] = await Promise.all([
      sb.from("analyses").select("*").eq("erreur_id", id).maybeSingle(),
      sb.from("actions_capa").select("*").eq("erreur_id", id).order("echeance"),
      sb.from("journal").select("*").eq("erreur_id", id).order("cree_le", { ascending: false }),
    ]);

    if (analyseRes.error) throw new Error(`Chargement de l'analyse : ${analyseRes.error.message}`);

    let analyse: AnalyseComplete | null = null;
    if (analyseRes.data) {
      const base = analyseRes.data as Analyse;
      const [pourquoiRes, causesRes] = await Promise.all([
        sb.from("cinq_pourquoi").select("*").eq("analyse_id", base.id).order("niveau"),
        sb.from("ishikawa_causes").select("*").eq("analyse_id", base.id).order("cree_le"),
      ]);
      analyse = {
        ...base,
        pourquoi: (verifier(pourquoiRes.data, pourquoiRes.error, "Chargement des 5 pourquoi") ??
          []) as Pourquoi[],
        causes: (verifier(causesRes.data, causesRes.error, "Chargement des causes Ishikawa") ??
          []) as IshikawaCause[],
      };
    }

    return {
      erreur: erreur as Erreur,
      analyse,
      actions: (verifier(actionsRes.data, actionsRes.error, "Chargement des actions") ??
        []) as ActionCapa[],
      journal: (verifier(journalRes.data, journalRes.error, "Chargement du journal") ??
        []) as EvenementJournal[],
    };
  },

  async creerErreur(entree: EntreeErreur, auteur: string): Promise<Erreur> {
    const sb = await clientServeur();
    const { data, error } = await sb.from("erreurs").insert(entree).select("*").single();
    const erreur = verifier(data, error, "Création de la fiche") as Erreur;
    await journaliser(erreur.id, "creation", `Fiche créée : ${erreur.titre}`, auteur);
    return erreur;
  },

  async majStatutErreur(id: string, statut: StatutErreur, auteur: string): Promise<void> {
    const sb = await clientServeur();
    const { error } = await sb
      .from("erreurs")
      .update({
        statut,
        date_cloture: statut === "cloturee" ? new Date().toISOString() : null,
      })
      .eq("id", id);
    if (error) throw new Error(`Changement de statut : ${error.message}`);
    await journaliser(id, "statut", `Nouveau statut : ${statut}`, auteur);
  },

  async majErreur(id: string, patch: Partial<EntreeErreur>, auteur: string): Promise<void> {
    const sb = await clientServeur();
    const { error } = await sb.from("erreurs").update(patch).eq("id", id);
    if (error) throw new Error(`Modification de la fiche : ${error.message}`);
    await journaliser(id, "modification", "Fiche modifiée.", auteur);
  },

  async supprimerErreur(id: string): Promise<void> {
    const sb = await clientServeur();
    const { error } = await sb.from("erreurs").delete().eq("id", id);
    if (error) throw new Error(`Suppression de la fiche : ${error.message}`);
  },

  async enregistrerAnalyse(
    erreurId: string,
    entree: EntreeAnalyse,
    auteur: string,
  ): Promise<void> {
    const sb = await clientServeur();

    const { data, error } = await sb
      .from("analyses")
      .upsert(
        {
          erreur_id: erreurId,
          probleme: entree.probleme,
          cause_racine: entree.cause_racine,
          conclusion: entree.conclusion,
          valide_par: entree.valide ? (entree.valide_par ?? auteur) : null,
          valide_le: entree.valide ? new Date().toISOString() : null,
        },
        { onConflict: "erreur_id" },
      )
      .select("id")
      .single();
    const analyse = verifier(data, error, "Enregistrement de l'analyse") as { id: string };

    await sb.from("cinq_pourquoi").delete().eq("analyse_id", analyse.id);
    if (entree.pourquoi.length) {
      const { error: errPq } = await sb
        .from("cinq_pourquoi")
        .insert(entree.pourquoi.map((p) => ({ ...p, analyse_id: analyse.id })));
      if (errPq) throw new Error(`Enregistrement des 5 pourquoi : ${errPq.message}`);
    }

    await sb.from("ishikawa_causes").delete().eq("analyse_id", analyse.id);
    if (entree.causes.length) {
      const { error: errCz } = await sb
        .from("ishikawa_causes")
        .insert(entree.causes.map((c) => ({ ...c, analyse_id: analyse.id })));
      if (errCz) throw new Error(`Enregistrement des causes : ${errCz.message}`);
    }

    await journaliser(erreurId, "analyse", "Analyse des causes enregistrée.", auteur);
  },

  async listerActions(filtres: FiltresActions = {}): Promise<ActionAvecErreur[]> {
    const sb = await clientServeur();
    let requete = sb
      .from("actions_capa")
      .select("*, erreurs!inner(reference, titre, service)")
      .order("echeance");

    if (filtres.statut && filtres.statut !== "toutes") requete = requete.eq("statut", filtres.statut);
    if (filtres.type && filtres.type !== "tous") requete = requete.eq("type", filtres.type);
    if (filtres.pilote && filtres.pilote !== "tous") requete = requete.eq("pilote", filtres.pilote);
    if (filtres.enRetard) {
      requete = requete
        .in("statut", ["a_faire", "en_cours"])
        .lt("echeance", new Date().toISOString().slice(0, 10));
    }

    const { data, error } = await requete;
    const lignes = verifier(data, error, "Chargement des actions") as Array<
      ActionCapa & { erreurs: { reference: string; titre: string; service: string } | null }
    >;

    return lignes.map(({ erreurs, ...action }) => ({
      ...action,
      erreur_reference: erreurs?.reference ?? "—",
      erreur_titre: erreurs?.titre ?? "—",
      service: erreurs?.service ?? "—",
    }));
  },

  async ajouterAction(erreurId: string, entree: EntreeAction, auteur: string): Promise<void> {
    const sb = await clientServeur();
    const { error } = await sb.from("actions_capa").insert({ ...entree, erreur_id: erreurId });
    if (error) throw new Error(`Ajout de l'action : ${error.message}`);
    await journaliser(erreurId, "action", `Action ajoutée : ${entree.titre}`, auteur);
  },

  async majAction(id: string, patch: MajAction, auteur: string): Promise<void> {
    const sb = await clientServeur();
    const { data, error } = await sb
      .from("actions_capa")
      .update(patch)
      .eq("id", id)
      .select("erreur_id, titre")
      .single();
    const action = verifier(data, error, "Mise à jour de l'action") as {
      erreur_id: string;
      titre: string;
    };
    await journaliser(action.erreur_id, "action", `Action mise à jour : ${action.titre}`, auteur);
  },

  async supprimerAction(id: string): Promise<void> {
    const sb = await clientServeur();
    const { error } = await sb.from("actions_capa").delete().eq("id", id);
    if (error) throw new Error(`Suppression de l'action : ${error.message}`);
  },

  async ajouterCommentaire(erreurId: string, message: string, auteur: string): Promise<void> {
    await journaliser(erreurId, "commentaire", message, auteur);
  },

  async referentiels(): Promise<Referentiels> {
    const sb = await clientServeur();
    const [servicesRes, categoriesRes] = await Promise.all([
      sb.from("services").select("nom").eq("actif", true).order("nom"),
      sb.from("categories").select("nom").eq("actif", true).order("nom"),
    ]);

    return {
      services: (verifier(servicesRes.data, servicesRes.error, "Chargement des services") ?? []).map(
        (s: { nom: string }) => s.nom,
      ),
      categories: (
        verifier(categoriesRes.data, categoriesRes.error, "Chargement des catégories") ?? []
      ).map((c: { nom: string }) => c.nom),
    };
  },

  async ajouterReferentiel(type: "service" | "categorie", nom: string): Promise<void> {
    const sb = await clientServeur();
    const table = type === "service" ? "services" : "categories";
    const { error } = await sb.from(table).upsert({ nom }, { onConflict: "nom" });
    if (error) throw new Error(`Ajout au référentiel : ${error.message}`);
  },

  async supprimerReferentiel(type: "service" | "categorie", nom: string): Promise<void> {
    const sb = await clientServeur();
    const table = type === "service" ? "services" : "categories";
    const { error } = await sb.from(table).update({ actif: false }).eq("nom", nom);
    if (error) throw new Error(`Retrait du référentiel : ${error.message}`);
  },
};
