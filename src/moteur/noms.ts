/**
 * Univers 100 % fictif : aucun club, joueur ou ville réels.
 * C'est un choix assumé de la roadmap — zéro risque juridique, et un monde
 * dont on maîtrise entièrement l'équilibre.
 */

export const PRENOMS = [
  "Yanis", "Mathis", "Noa", "Enzo", "Lucas", "Adam", "Théo", "Bastien", "Rayan", "Hugo",
  "Nathan", "Malo", "Kylian", "Ilyes", "Owen", "Timéo", "Maël", "Axel", "Nolan", "Samir",
  "Loïc", "Maxence", "Grégoire", "Baptiste", "Corentin", "Tristan", "Aurélien", "Damien",
  "Florent", "Joris", "Léandre", "Marius", "Clément", "Antonin", "Erwan", "Gaspard",
  "Sacha", "Émilien", "Romain", "Victor", "Aymeric", "Célestin", "Éliott", "Fabien",
  "Gauthier", "Hadrien", "Ismaël", "Jonas", "Killian", "Lubin", "Martin", "Nils",
  "Octave", "Pierrick", "Quentin", "Raphaël", "Soren", "Thibaut", "Ulysse", "Valentin",
  "Wandrille", "Xavier", "Yohan", "Zacharie", "Amaury", "Brieuc", "Côme", "Diego",
];

export const NOMS = [
  "Delcourt", "Beauregard", "Perrache", "Vasseur", "Montaigu", "Ferrant", "Lachance",
  "Corvisier", "Dessaux", "Vernant", "Plessix", "Tercier", "Norrant", "Charvet",
  "Faucheux", "Grandel", "Ronsard", "Quenneville", "Berthier", "Dutreil", "Prunier",
  "Duverger", "Lannoy", "Vaubertin", "Malzieu", "Rouvray", "Lesparre", "Bonnefoy",
  "Chauvigny", "Guibert", "Tavernier", "Peyrolles", "Vaugirard", "Marsanne", "Combelles",
  "Rochas", "Vialard", "Fontenaille", "Bricourt", "Jaubert", "Sénéchal", "Vallauris",
  "Orsanne", "Thouvenin", "Lemercier", "Crozat", "Belloy", "Nivelle", "Aubriot",
  "Bazenville", "Cheyrac", "Darmezin", "Esclavelle", "Fombonne", "Gastinel", "Hauteclair",
  "Isambert", "Jouvenel", "Kermarrec", "Lavaissière", "Mirambeau", "Noailhac", "Ollivry",
  "Pontcharra", "Quintrand", "Rieuvernet", "Salvagnac", "Tourvieille", "Urbanel",
  "Vaucresson", "Wattrelot", "Yvernaux", "Ziegler", "Amblard", "Boissieu", "Cazenave",
  "Delahaye", "Estivals", "Fortoul", "Grébert", "Hourdequin", "Imbault", "Jonquières",
  "Kervella", "Lartigue", "Monteillet", "Neyrinck", "Ozanne", "Puyravaud", "Quiévreux",
  "Rambourg", "Ségalen", "Tréhorel", "Uzureau", "Villandry", "Wargnier", "Xambeu",
  "Yssartier", "Zurcher", "Bellenger", "Coulanges", "Dorlhac", "Ferrasse", "Gouvion",
];

/**
 * Style de jeu du club : un profil, pas un niveau. Les bonus se compensent —
 * un club « distance » a de gros arrières et des ailiers moyens, un club
 * « intérieur » l'inverse. C'est ce qui rend le choix du système défensif
 * adverse réellement décidable, et le rapport d'observation utile.
 */
export type StyleClub = "distance" | "interieur" | "equilibre";

export type ModeleClub = {
  nom: string;
  abbr: string;
  ville: string;
  /** Réputation de départ, 1–100. Décide du niveau de l'effectif généré. */
  reputation: number;
  style: StyleClub;
  couleur: string;
};

/**
 * 42 clubs répartis sur trois divisions. La réputation décroît avec le niveau,
 * avec un recouvrement volontaire entre le bas d'une division et le haut de
 * la suivante : un promu peut être plus fort qu'un relégable.
 */
export const CLUBS_D1: ModeleClub[] = [
  { nom: "Vallonne HB", abbr: "VAL", ville: "Vallonne", style: "distance", reputation: 92, couleur: "#3b6fe0" },
  { nom: "AS Kerdel", abbr: "KER", ville: "Kerdel", style: "interieur", reputation: 89, couleur: "#c2410c" },
  { nom: "US Montcivray", abbr: "MON", ville: "Montcivray", style: "distance", reputation: 86, couleur: "#7c3aed" },
  { nom: "Étoile de Vaubry", abbr: "VAU", ville: "Vaubry", style: "interieur", reputation: 83, couleur: "#0f766e" },
  { nom: "HBC Rocheval", abbr: "ROC", ville: "Rocheval", style: "equilibre", reputation: 80, couleur: "#0e8fa3" },
  { nom: "Handball Clairval", abbr: "CLA", ville: "Clairval", style: "distance", reputation: 77, couleur: "#b45309" },
  { nom: "HBC Sarment", abbr: "SAR", ville: "Sarment", style: "interieur", reputation: 75, couleur: "#16a34a" },
  { nom: "CO Prasles", abbr: "PRA", ville: "Prasles", style: "interieur", reputation: 73, couleur: "#be123c" },
  { nom: "AC Denneville", abbr: "DEN", ville: "Denneville", style: "distance", reputation: 71, couleur: "#475569" },
  { nom: "Ferrière HB", abbr: "FER", ville: "Ferrière", style: "distance", reputation: 70, couleur: "#1d4ed8" },
  { nom: "SC Aubemont", abbr: "AUB", ville: "Aubemont", style: "interieur", reputation: 69, couleur: "#9333ea" },
  { nom: "Hauteroche HB", abbr: "HAU", ville: "Hauteroche", style: "equilibre", reputation: 68, couleur: "#ca8a04" },
  { nom: "US Trévannes", abbr: "TRE", ville: "Trévannes", style: "distance", reputation: 67, couleur: "#0891b2" },
  { nom: "Bellac HBC", abbr: "BEL", ville: "Bellac", style: "interieur", reputation: 66, couleur: "#dc2626" },
];

export const CLUBS_D2: ModeleClub[] = [
  { nom: "Mervelle HB", abbr: "MER", ville: "Mervelle", style: "distance", reputation: 64, couleur: "#2563eb" },
  { nom: "AS Pontrieu", abbr: "PON", ville: "Pontrieu", style: "interieur", reputation: 62, couleur: "#ea580c" },
  { nom: "CS Valmorey", abbr: "VLM", ville: "Valmorey", style: "equilibre", reputation: 60, couleur: "#7e22ce" },
  { nom: "Handball Esclanne", abbr: "ESC", ville: "Esclanne", style: "distance", reputation: 58, couleur: "#059669" },
  { nom: "US Charbonnay", abbr: "CHA", ville: "Charbonnay", style: "interieur", reputation: 56, couleur: "#0d9488" },
  { nom: "Olympique Nérac", abbr: "NER", ville: "Nérac", style: "distance", reputation: 55, couleur: "#b91c1c" },
  { nom: "HBC Lauzières", abbr: "LAU", ville: "Lauzières", style: "interieur", reputation: 53, couleur: "#4f46e5" },
  { nom: "Sablons HB", abbr: "SAB", ville: "Sablons", style: "equilibre", reputation: 51, couleur: "#a16207" },
  { nom: "AC Vermenton", abbr: "VER", ville: "Vermenton", style: "distance", reputation: 50, couleur: "#0369a1" },
  { nom: "Étoile Grandmesnil", abbr: "GRA", ville: "Grandmesnil", style: "interieur", reputation: 48, couleur: "#65a30d" },
  { nom: "US Ravières", abbr: "RAV", ville: "Ravières", style: "distance", reputation: 47, couleur: "#c026d3" },
  { nom: "CO Malétable", abbr: "MAL", ville: "Malétable", style: "interieur", reputation: 45, couleur: "#0284c7" },
  { nom: "Brénoux HBC", abbr: "BRE", ville: "Brénoux", style: "equilibre", reputation: 44, couleur: "#e11d48" },
  { nom: "AS Fontpierre", abbr: "FON", ville: "Fontpierre", style: "distance", reputation: 42, couleur: "#525252" },
];

export const CLUBS_D3: ModeleClub[] = [
  { nom: "HB Cressanges", abbr: "CRE", ville: "Cressanges", style: "interieur", reputation: 40, couleur: "#1e40af" },
  { nom: "US Lestrange", abbr: "LES", ville: "Lestrange", style: "distance", reputation: 38, couleur: "#c2410c" },
  { nom: "AC Bouvancourt", abbr: "BOU", ville: "Bouvancourt", style: "interieur", reputation: 37, couleur: "#6d28d9" },
  { nom: "Saint-Vindel HB", abbr: "SVI", ville: "Saint-Vindel", style: "equilibre", reputation: 35, couleur: "#047857" },
  { nom: "CS Maligny", abbr: "MLG", ville: "Maligny", style: "distance", reputation: 34, couleur: "#0e7490" },
  { nom: "Trézennes HBC", abbr: "TRZ", ville: "Trézennes", style: "interieur", reputation: 32, couleur: "#991b1b" },
  { nom: "US Chaumelle", abbr: "CHM", ville: "Chaumelle", style: "distance", reputation: 31, couleur: "#4338ca" },
  { nom: "AS Vaurenard", abbr: "VRD", ville: "Vaurenard", style: "interieur", reputation: 30, couleur: "#854d0e" },
  { nom: "Handball Pierrelou", abbr: "PIE", ville: "Pierrelou", style: "equilibre", reputation: 28, couleur: "#075985" },
  { nom: "CO Nanteuille", abbr: "NAN", ville: "Nanteuille", style: "distance", reputation: 27, couleur: "#4d7c0f" },
  { nom: "Gourvennec HB", abbr: "GOU", ville: "Gourvennec", style: "interieur", reputation: 26, couleur: "#a21caf" },
  { nom: "US Sallebrune", abbr: "SAL", ville: "Sallebrune", style: "distance", reputation: 24, couleur: "#0369a1" },
  { nom: "AC Rimondeix", abbr: "RIM", ville: "Rimondeix", style: "interieur", reputation: 23, couleur: "#be123c" },
  { nom: "Étoile de Vergnac", abbr: "VGN", ville: "Vergnac", style: "equilibre", reputation: 22, couleur: "#404040" },
];

export const DIVISIONS_MODELE = [
  { id: "d1", nom: "Ligue Élite", niveau: 1, clubs: CLUBS_D1 },
  { id: "d2", nom: "Division 2", niveau: 2, clubs: CLUBS_D2 },
  { id: "d3", nom: "Nationale 3", niveau: 3, clubs: CLUBS_D3 },
];
