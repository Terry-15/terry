# Amélioration continue — Gestion des erreurs

Application de pilotage de la boucle d'amélioration continue : déclaration et suivi des
erreurs (non-conformités), analyse des causes racines (**5 Pourquoi** et **Ishikawa 6M**),
plan d'actions **CAPA** rythmé par le **PDCA**, et tableau de bord d'indicateurs qualité.

Stack : **Next.js 16** (App Router, Server Actions) · **React 19** · **TypeScript** ·
**Tailwind CSS 4** · **Supabase** (PostgreSQL + Auth + RLS).

---

## Démarrage rapide

```bash
npm install
npm run dev
```

L'application démarre sur <http://localhost:3000>.

Sans configuration Supabase, elle tourne en **mode démonstration** : un jeu de ~55 fiches
fictives réparties sur 12 mois est généré en mémoire (déterministe), avec une analyse
complète et un plan d'actions sur la fiche « Lot 4412 ». Les écritures fonctionnent mais ne
sont pas persistées au-delà du redémarrage du serveur.

## Brancher Supabase

1. Créer un projet sur [supabase.com](https://supabase.com).
2. Copier les variables :

   ```bash
   cp .env.example .env.local
   ```

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```

3. Appliquer le schéma — via la CLI Supabase :

   ```bash
   supabase link --project-ref <ref>
   supabase db push          # applique supabase/migrations/
   psql "$DATABASE_URL" -f supabase/seed.sql   # optionnel : données d'exemple
   ```

   …ou en collant le contenu de `supabase/migrations/20260808000001_init.sql` puis de
   `supabase/seed.sql` dans le **SQL Editor** du tableau de bord Supabase.

4. Redémarrer `npm run dev`. Le bandeau « mode démonstration » disparaît, l'authentification
   (`/connexion`) et la protection des routes s'activent automatiquement.

## Modèle de données

| Table             | Rôle                                                                 |
| ----------------- | -------------------------------------------------------------------- |
| `erreurs`         | Fiche de non-conformité : référence auto `NC-AAAA-0001`, gravité, statut, coût, impact client |
| `analyses`        | Une analyse de causes par fiche : énoncé du problème, cause racine, validation |
| `cinq_pourquoi`   | Chaîne causale niveau 1 → 7 rattachée à l'analyse                      |
| `ishikawa_causes` | Causes classées par famille 6M, drapeau « cause racine »               |
| `actions_capa`    | Actions curatives / correctives / préventives, phase PDCA, échéance, contrôle d'efficacité |
| `journal`         | Traçabilité : création, changements de statut, commentaires            |
| `services`, `categories` | Référentiels alimentant les listes déroulantes                  |
| `profils`         | Profil applicatif adossé à `auth.users` (créé par déclencheur)         |

Le cycle de vie d'une fiche : `declaree` → `en_analyse` → `plan_action` → `en_verification`
→ `cloturee` (ou `rejetee`). Les transitions autorisées sont définies dans
`src/lib/labels.ts` (`transitionsStatut`).

Trois vues SQL prêtes à l'emploi : `v_actions_en_retard`, `v_pareto_categories`,
`v_erreurs_par_mois`.

**RLS** : activée sur toutes les tables. En V1, tout utilisateur authentifié lit et écrit ;
chaque utilisateur ne modifie que son propre profil. Resserrer les politiques par rôle
(`declarant`, `pilote`, `qualite`, `admin`) est le premier durcissement à prévoir.

## Fonctionnalités

**Déclaration et suivi** — formulaire factuel (qui, quoi, où, quand, combien), qualification
gravité / service / catégorie, coût estimé, impact client, récurrence. Liste filtrable
(recherche plein texte, statut, gravité, service, période) avec état conservé dans l'URL.

**Analyse des causes** — éditeur combinant les 5 Pourquoi (jusqu'à 7 niveaux) et le
diagramme d'Ishikawa sur les 6M (Main-d'œuvre, Matière, Matériel, Méthode, Milieu, Mesure).
Les causes retenues comme racines sont mises en évidence dans le diagramme rendu en SVG.
L'analyse peut être validée (cause racine confirmée, horodatée).

**Plan d'actions CAPA / PDCA** — actions curatives, correctives et préventives, regroupées
par phase PDCA, avec pilote, échéance, statut et **contrôle d'efficacité** (phase *Check*) :
une action déclarée faite doit être vérifiée avant que la fiche puisse être clôturée. Vue
transverse `/actions` filtrable par statut, type, pilote et retard.

**Indicateurs** — fiches ouvertes, déclarations sur 30 jours et évolution, taux de clôture,
délai moyen détection → clôture, respect des échéances, taux d'efficacité confirmée, coût de
non-qualité. Graphiques : Pareto (barres + cumul, repère 80 %) par catégorie et par service,
courbes mensuelles déclarations / clôtures, anneau de gravité, coûts par service, charge par
pilote. Export CSV via `/api/export` (séparateur `;`, BOM UTF-8 pour Excel FR).

Tous les graphiques sont du SVG écrit à la main : aucune dépendance de charting, rendu côté
serveur, lisible en thème clair comme sombre.

## Organisation du code

```
src/
├── app/                    Routes App Router (tout en composants serveur)
│   ├── page.tsx            Tableau de bord
│   ├── erreurs/            Liste, déclaration, fiche détaillée (onglets par query string)
│   ├── actions/            Vue transverse du plan d'actions
│   ├── indicateurs/        Indicateurs détaillés + sélecteur de période
│   ├── referentiels/       Services et catégories
│   └── api/export/         Export CSV
├── components/             Composants d'interface (charts/ = SVG, ui/ = atomes)
├── lib/
│   ├── actions.ts          Server Actions — toutes les écritures
│   ├── repo/               Couche d'accès aux données
│   │   ├── depot.ts        Interface `Depot` + filtrage commun
│   │   ├── supabase.ts     Implémentation PostgREST
│   │   ├── demo.ts         Implémentation en mémoire
│   │   └── demo-data.ts    Générateur du jeu de démonstration
│   ├── kpi.ts              Calculs d'indicateurs (purs)
│   ├── labels.ts           Libellés FR + classes de couleur
│   └── supabase/           Clients serveur / navigateur
└── proxy.ts                Rafraîchissement de session et protection des routes
```

Le basculement Supabase ↔ démonstration tient dans `src/lib/repo/index.ts` : les deux
implémentations respectent la même interface `Depot`, les pages n'en savent rien.

## Scripts

```bash
npm run dev     # serveur de développement
npm run build   # build de production
npm run start   # serveur de production
npm run lint    # ESLint
```

## Pistes d'évolution

- Politiques RLS par rôle et attribution des rôles depuis l'interface.
- Pièces jointes (photos du défaut) via Supabase Storage.
- Notifications d'échéance (relance des pilotes) par e-mail ou tâche planifiée.
- Rattachement d'une fiche à un processus / poste de travail et audits de suivi.
- Export PDF de la fiche 8D complète.
