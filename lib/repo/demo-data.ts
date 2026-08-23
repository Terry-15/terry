import type {
  ActionCapa,
  Analyse,
  Erreur,
  EvenementJournal,
  Famille5M,
  Gravite,
  IshikawaCause,
  Pourquoi,
  StatutErreur,
} from "@/lib/types";

/**
 * Jeu de démonstration utilisé quand aucune instance Supabase n'est configurée.
 * Généré de façon déterministe (PRNG à graine fixe) pour que les indicateurs
 * restent stables d'un rendu à l'autre.
 */

export const SERVICES_DEMO = [
  "Production",
  "Logistique",
  "Qualité",
  "Achats",
  "Service client",
  "Maintenance",
];

export const CATEGORIES_DEMO = [
  "Erreur de saisie",
  "Défaut produit",
  "Retard de livraison",
  "Non-respect de procédure",
  "Erreur de facturation",
  "Panne équipement",
  "Réclamation client",
];

const PERSONNES = [
  "A. Bernard",
  "S. Meunier",
  "L. Petit",
  "M. Diallo",
  "C. Rossi",
  "K. Nguyen",
  "F. Leroy",
];

/** PRNG mulberry32 — déterministe. */
function prng(graine: number): () => number {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function jourISO(decalageJours: number): string {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + decalageJours);
  return d.toISOString().slice(0, 10);
}

function horodatage(decalageJours: number): string {
  const d = new Date();
  d.setUTCHours(9, 30, 0, 0);
  d.setUTCDate(d.getUTCDate() + decalageJours);
  return d.toISOString();
}

function piocher<T>(r: () => number, liste: readonly T[]): T {
  return liste[Math.floor(r() * liste.length)];
}

interface Graine {
  titre: string;
  description: string;
  service: string;
  categorie: string;
  gravite: Gravite;
  statut: StatutErreur;
  jours: number;
  cout: number | null;
  impact_client: boolean;
  recurrente: boolean;
}

/** Fiches « scénarisées » : celles qui portent une analyse et un plan d'actions. */
const FICHES_DETAILLEES: Graine[] = [
  {
    titre: "Lot 4412 non conforme — tolérance dimensionnelle",
    description:
      "Contrôle final : 18 pièces sur 200 hors tolérance (+0,4 mm). Lot bloqué en zone de quarantaine.",
    service: "Production",
    categorie: "Défaut produit",
    gravite: "critique",
    statut: "plan_action",
    jours: -6,
    cout: 3150,
    impact_client: true,
    recurrente: false,
  },
  {
    titre: "Colis expédié à la mauvaise adresse",
    description:
      "Le bon de préparation a été rattaché à la commande précédente lors du picking.",
    service: "Logistique",
    categorie: "Erreur de saisie",
    gravite: "majeure",
    statut: "plan_action",
    jours: -12,
    cout: 420,
    impact_client: true,
    recurrente: true,
  },
  {
    titre: "Étiquetage produit non conforme au cahier des charges",
    description: "Mention d'allergène manquante sur 1 200 étiquettes imprimées.",
    service: "Production",
    categorie: "Défaut produit",
    gravite: "critique",
    statut: "en_analyse",
    jours: -9,
    cout: 2400,
    impact_client: true,
    recurrente: false,
  },
  {
    titre: "Retard de 3 jours sur la commande CMD-7781",
    description: "Rupture de composant non anticipée par le réapprovisionnement.",
    service: "Logistique",
    categorie: "Retard de livraison",
    gravite: "majeure",
    statut: "en_verification",
    jours: -25,
    cout: 900,
    impact_client: true,
    recurrente: true,
  },
  {
    titre: "Procédure de contrôle réception non appliquée",
    description: "Deux réceptions validées sans contrôle documentaire sur la semaine 24.",
    service: "Qualité",
    categorie: "Non-respect de procédure",
    gravite: "majeure",
    statut: "plan_action",
    jours: -18,
    cout: 0,
    impact_client: false,
    recurrente: false,
  },
  {
    titre: "Arrêt presse n°3 — capteur de position HS",
    description: "Panne du capteur entraînant 4 h d'arrêt de ligne.",
    service: "Maintenance",
    categorie: "Panne équipement",
    gravite: "critique",
    statut: "cloturee",
    jours: -55,
    cout: 5600,
    impact_client: false,
    recurrente: true,
  },
  {
    titre: "Réclamation client — emballage endommagé",
    description: "Trois clients signalent des cartons écrasés sur la même tournée.",
    service: "Service client",
    categorie: "Réclamation client",
    gravite: "mineure",
    statut: "declaree",
    jours: -3,
    cout: 250,
    impact_client: true,
    recurrente: false,
  },
  {
    titre: "Facture 2026-0871 émise au mauvais taux de TVA",
    description: "Taux 20 % appliqué au lieu de 5,5 % sur une commande de produits alimentaires.",
    service: "Achats",
    categorie: "Erreur de facturation",
    gravite: "mineure",
    statut: "cloturee",
    jours: -40,
    cout: 180,
    impact_client: false,
    recurrente: false,
  },
];

/** Gabarits utilisés pour donner du volume à l'historique (courbes de tendance). */
const GABARITS: Array<Pick<Graine, "titre" | "categorie" | "service">> = [
  { titre: "Écart d'inventaire sur une référence", categorie: "Non-respect de procédure", service: "Logistique" },
  { titre: "Erreur de saisie de quantité dans l'ERP", categorie: "Erreur de saisie", service: "Service client" },
  { titre: "Livraison partielle non signalée au client", categorie: "Retard de livraison", service: "Logistique" },
  { titre: "Rayure sur carter constatée en contrôle final", categorie: "Défaut produit", service: "Production" },
  { titre: "Avoir client émis hors délai", categorie: "Erreur de facturation", service: "Achats" },
  { titre: "Convoyeur bloqué — capteur encrassé", categorie: "Panne équipement", service: "Maintenance" },
  { titre: "Réclamation sur la conformité de la notice", categorie: "Réclamation client", service: "Service client" },
  { titre: "Fiche de contrôle non renseignée", categorie: "Non-respect de procédure", service: "Qualité" },
  { titre: "Mauvais code article sur bon de préparation", categorie: "Erreur de saisie", service: "Logistique" },
  { titre: "Défaut d'aspect sur série courte", categorie: "Défaut produit", service: "Production" },
];

function construireErreurs(): Erreur[] {
  const r = prng(20260808);
  const erreurs: Erreur[] = [];
  let compteur = 0;

  const nouvelleReference = (dateDetection: string) => {
    compteur += 1;
    return `NC-${dateDetection.slice(0, 4)}-${String(compteur).padStart(4, "0")}`;
  };

  // Volume historique : ~3 à 6 fiches par mois sur 11 mois.
  const historique: Graine[] = [];
  for (let mois = 11; mois >= 0; mois--) {
    const parMois = 3 + Math.floor(r() * 4);
    for (let i = 0; i < parMois; i++) {
      const gabarit = piocher(r, GABARITS);
      const jours = -(mois * 30 + Math.floor(r() * 28));
      const age = -jours;
      const tirage = r();
      const gravite: Gravite = tirage > 0.86 ? "critique" : tirage > 0.5 ? "majeure" : "mineure";
      // Plus la fiche est ancienne, plus elle a de chances d'être clôturée.
      const avancement = r() + Math.min(age / 200, 0.6);
      const statut: StatutErreur =
        avancement > 1.05
          ? "cloturee"
          : avancement > 0.85
            ? "en_verification"
            : avancement > 0.55
              ? "plan_action"
              : avancement > 0.3
                ? "en_analyse"
                : r() > 0.94
                  ? "rejetee"
                  : "declaree";

      historique.push({
        ...gabarit,
        description: "Fiche issue de l'historique de démonstration.",
        gravite,
        statut,
        jours,
        cout: Math.round((50 + r() * 2500) / 10) * 10,
        impact_client: r() > 0.6,
        recurrente: r() > 0.75,
      });
    }
  }

  const toutes = [...historique, ...FICHES_DETAILLEES].sort((a, b) => a.jours - b.jours);

  for (const g of toutes) {
    const dateDetection = jourISO(g.jours);
    const dureeTraitement = 5 + Math.floor(r() * 45);
    erreurs.push({
      id: `err-${erreurs.length + 1}`,
      reference: nouvelleReference(dateDetection),
      titre: g.titre,
      description: g.description,
      service: g.service,
      categorie: g.categorie,
      gravite: g.gravite,
      statut: g.statut,
      date_detection: dateDetection,
      date_survenue: jourISO(g.jours - (1 + Math.floor(r() * 3))),
      declarant: piocher(r, PERSONNES),
      pilote: g.statut === "declaree" ? null : piocher(r, PERSONNES),
      cout_estime: g.cout,
      impact_client: g.impact_client,
      recurrente: g.recurrente,
      date_cloture: g.statut === "cloturee" ? horodatage(g.jours + dureeTraitement) : null,
      cree_le: horodatage(g.jours),
      maj_le: horodatage(g.jours + 1),
    });
  }

  return erreurs;
}

export interface JeuDemo {
  erreurs: Erreur[];
  analyses: Analyse[];
  pourquoi: Pourquoi[];
  causes: IshikawaCause[];
  actions: ActionCapa[];
  journal: EvenementJournal[];
  services: string[];
  categories: string[];
}

export function construireJeuDemo(): JeuDemo {
  const erreurs = construireErreurs();
  const parTitre = (titre: string) => erreurs.find((e) => e.titre === titre);

  const analyses: Analyse[] = [];
  const pourquoi: Pourquoi[] = [];
  const causes: IshikawaCause[] = [];
  const actions: ActionCapa[] = [];
  const journal: EvenementJournal[] = [];

  const lot = parTitre("Lot 4412 non conforme — tolérance dimensionnelle");
  if (lot) {
    const analyse: Analyse = {
      id: "ana-1",
      erreur_id: lot.id,
      probleme: "Lot 4412 : 9 % des pièces hors tolérance dimensionnelle en contrôle final.",
      cause_racine:
        "Le mode opératoire de changement de série n'impose pas le recalage du butoir au couple prescrit.",
      conclusion:
        "Cause racine organisationnelle confirmée : l'étape de recalage est absente du MO-PROD-014 et aucun outillage de secours n'est prévu pendant les étalonnages.",
      valide_par: "L. Petit",
      valide_le: horodatage(-2),
    };
    analyses.push(analyse);

    const chaine: Array<[string, string]> = [
      [
        "Pourquoi les pièces sont-elles hors tolérance ?",
        "Le butoir de la presse s'est décalé de 0,4 mm en cours de série.",
      ],
      [
        "Pourquoi le butoir s'est-il décalé ?",
        "La vis de blocage n'était pas serrée au couple prescrit.",
      ],
      [
        "Pourquoi la vis n'était-elle pas serrée au couple ?",
        "L'opérateur a réalisé le changement d'outil sans clé dynamométrique.",
      ],
      [
        "Pourquoi la clé dynamométrique n'a-t-elle pas été utilisée ?",
        "Elle était en cours d'étalonnage et aucune clé de remplacement n'était disponible.",
      ],
      [
        "Pourquoi aucun remplacement n'était-il disponible ?",
        "Le plan de maintenance ne prévoit pas d'outillage de secours pendant les étalonnages.",
      ],
    ];
    chaine.forEach(([question, reponse], i) => {
      pourquoi.push({
        id: `pq-${i + 1}`,
        analyse_id: analyse.id,
        niveau: i + 1,
        question,
        reponse,
      });
    });

    const arbre: Array<[Famille5M, string, boolean]> = [
      ["main_doeuvre", "Opérateur non formé au changement de série rapide", false],
      ["main_doeuvre", "Changement d'équipe pendant la série", false],
      ["materiel", "Clé dynamométrique indisponible (étalonnage)", true],
      ["materiel", "Butoir de presse sans détrompeur", false],
      ["methode", "Mode opératoire sans étape de recalage", true],
      ["methode", "Pas de contrôle première pièce après changement", false],
      ["mesure", "Contrôle dimensionnel uniquement en fin de lot", false],
      ["matiere", "Lot matière en limite haute d'épaisseur", false],
      ["milieu", "Température atelier élevée (32 °C)", false],
    ];
    arbre.forEach(([famille, libelle, est_racine], i) => {
      causes.push({
        id: `cz-${i + 1}`,
        analyse_id: analyse.id,
        famille,
        libelle,
        est_racine,
      });
    });
  }

  const plans: Array<{
    titre: string;
    action: Omit<ActionCapa, "id" | "erreur_id">;
  }> = [
    {
      titre: "Lot 4412 non conforme — tolérance dimensionnelle",
      action: {
        titre: "Trier et rebuter les 18 pièces non conformes",
        description: "Isolement du lot et tri à 100 % avant libération.",
        type: "curative",
        phase_pdca: "do",
        pilote: "S. Meunier",
        echeance: jourISO(-4),
        statut: "faite",
        date_realisation: jourISO(-4),
        efficacite_ok: null,
        efficacite_commentaire: null,
        efficacite_date: null,
      },
    },
    {
      titre: "Lot 4412 non conforme — tolérance dimensionnelle",
      action: {
        titre: "Ajouter le recalage du butoir au mode opératoire",
        description: "Révision du MO-PROD-014 et validation qualité.",
        type: "corrective",
        phase_pdca: "do",
        pilote: "L. Petit",
        echeance: jourISO(6),
        statut: "en_cours",
        date_realisation: null,
        efficacite_ok: null,
        efficacite_commentaire: null,
        efficacite_date: null,
      },
    },
    {
      titre: "Lot 4412 non conforme — tolérance dimensionnelle",
      action: {
        titre: "Doter chaque presse d'une clé dynamométrique dédiée",
        description: "Achat de 3 clés + plan d'étalonnage tournant.",
        type: "preventive",
        phase_pdca: "plan",
        pilote: "K. Nguyen",
        echeance: jourISO(21),
        statut: "a_faire",
        date_realisation: null,
        efficacite_ok: null,
        efficacite_commentaire: null,
        efficacite_date: null,
      },
    },
    {
      titre: "Colis expédié à la mauvaise adresse",
      action: {
        titre: "Renvoyer le colis au client et récupérer l'erroné",
        description: "Prise en charge des frais de retour.",
        type: "curative",
        phase_pdca: "do",
        pilote: "A. Bernard",
        echeance: jourISO(-8),
        statut: "faite",
        date_realisation: jourISO(-9),
        efficacite_ok: null,
        efficacite_commentaire: null,
        efficacite_date: null,
      },
    },
    {
      titre: "Colis expédié à la mauvaise adresse",
      action: {
        titre: "Rendre obligatoire le scan du bon de préparation",
        description: "Blocage de la validation d'expédition sans scan du code-barres.",
        type: "corrective",
        phase_pdca: "do",
        pilote: "M. Diallo",
        echeance: jourISO(-2),
        statut: "en_cours",
        date_realisation: null,
        efficacite_ok: null,
        efficacite_commentaire: null,
        efficacite_date: null,
      },
    },
    {
      titre: "Retard de 3 jours sur la commande CMD-7781",
      action: {
        titre: "Mettre en place un seuil d'alerte de réapprovisionnement",
        description: "Seuil dynamique sur les 20 références critiques.",
        type: "preventive",
        phase_pdca: "check",
        pilote: "M. Diallo",
        echeance: jourISO(-1),
        statut: "faite",
        date_realisation: jourISO(-3),
        efficacite_ok: null,
        efficacite_commentaire: null,
        efficacite_date: null,
      },
    },
    {
      titre: "Procédure de contrôle réception non appliquée",
      action: {
        titre: "Rappel de la procédure en réunion d'équipe",
        description: "Émargement de la sensibilisation.",
        type: "corrective",
        phase_pdca: "do",
        pilote: "S. Meunier",
        echeance: jourISO(3),
        statut: "a_faire",
        date_realisation: null,
        efficacite_ok: null,
        efficacite_commentaire: null,
        efficacite_date: null,
      },
    },
    {
      titre: "Procédure de contrôle réception non appliquée",
      action: {
        titre: "Audit interne de suivi à 1 mois",
        description: "Vérifier 10 réceptions par sondage.",
        type: "preventive",
        phase_pdca: "check",
        pilote: "L. Petit",
        echeance: jourISO(25),
        statut: "a_faire",
        date_realisation: null,
        efficacite_ok: null,
        efficacite_commentaire: null,
        efficacite_date: null,
      },
    },
    {
      titre: "Étiquetage produit non conforme au cahier des charges",
      action: {
        titre: "Détruire les étiquettes non conformes",
        description: "Destruction tracée des 1 200 étiquettes.",
        type: "curative",
        phase_pdca: "do",
        pilote: "S. Meunier",
        echeance: jourISO(-1),
        statut: "faite",
        date_realisation: jourISO(-2),
        efficacite_ok: null,
        efficacite_commentaire: null,
        efficacite_date: null,
      },
    },
    {
      titre: "Étiquetage produit non conforme au cahier des charges",
      action: {
        titre: "Double validation du BAT avant impression",
        description: "Contrôle croisé qualité + marketing avant lancement.",
        type: "corrective",
        phase_pdca: "plan",
        pilote: "L. Petit",
        echeance: jourISO(14),
        statut: "a_faire",
        date_realisation: null,
        efficacite_ok: null,
        efficacite_commentaire: null,
        efficacite_date: null,
      },
    },
    {
      titre: "Facture 2026-0871 émise au mauvais taux de TVA",
      action: {
        titre: "Émettre un avoir et refacturer au bon taux",
        description: "Régularisation comptable.",
        type: "curative",
        phase_pdca: "act",
        pilote: "C. Rossi",
        echeance: jourISO(-30),
        statut: "faite",
        date_realisation: jourISO(-31),
        efficacite_ok: true,
        efficacite_commentaire: "Aucune récidive sur les 3 cycles de facturation suivants.",
        efficacite_date: jourISO(-10),
      },
    },
    {
      titre: "Arrêt presse n°3 — capteur de position HS",
      action: {
        titre: "Remplacer le capteur et constituer un stock de secours",
        description: "Stock de sécurité de 2 capteurs référencés.",
        type: "preventive",
        phase_pdca: "act",
        pilote: "K. Nguyen",
        echeance: jourISO(-35),
        statut: "faite",
        date_realisation: jourISO(-40),
        efficacite_ok: true,
        efficacite_commentaire: "Aucun arrêt sur ce composant depuis 30 jours.",
        efficacite_date: jourISO(-25),
      },
    },
  ];

  plans.forEach((p, i) => {
    const erreur = parTitre(p.titre);
    if (!erreur) return;
    actions.push({ id: `act-${i + 1}`, erreur_id: erreur.id, ...p.action });
  });

  erreurs.forEach((e, i) => {
    journal.push({
      id: `jrn-c-${i + 1}`,
      erreur_id: e.id,
      type: "creation",
      message: `Fiche créée : ${e.titre}`,
      auteur: e.declarant,
      cree_le: e.cree_le,
    });
    if (e.date_cloture) {
      journal.push({
        id: `jrn-x-${i + 1}`,
        erreur_id: e.id,
        type: "cloture",
        message: "Fiche clôturée après contrôle d'efficacité.",
        auteur: e.pilote ?? "Qualité",
        cree_le: e.date_cloture,
      });
    }
  });

  return {
    erreurs,
    analyses,
    pourquoi,
    causes,
    actions,
    journal,
    services: [...SERVICES_DEMO],
    categories: [...CATEGORIES_DEMO],
  };
}
