# Demi-Centre

Jeu de gestion de handball, dans l'esprit de Football Manager : un monde fictif de trois
divisions, un moteur de match qui simule possession par possession, et des décisions
tactiques qui pèsent réellement sur le résultat.

Stack : **Next.js 16** (App Router) · **React 19** · **TypeScript** · **Tailwind CSS 4** ·
**Vitest**. Aucune base de données : le monde est généré à partir d'une graine et la partie
est sauvegardée dans le navigateur.

---

## Démarrer

```bash
npm install
npm run dev          # http://localhost:3000
```

Choisissez un club parmi les 42, jouez la saison journée après journée.

```bash
npm run harnais      # les invariants du moteur (≈ 20 s)
npm run mesurer      # banc d'essai : 500 matchs, matrice tactique, saison complète
```

## Ce que fait le moteur

Le moteur est du TypeScript pur, dans `src/moteur/`, sans la moindre dépendance à React :
c'est ce qui permet de le lancer par milliers de matchs pour l'équilibrer.

**Le monde** — 3 divisions, 42 clubs, 756 joueurs générés une fois à partir d'une graine puis
conservés. Chaque joueur a 18 attributs, tous lus par le moteur, un potentiel, un âge, une
main dominante, un contrat, une condition, un moral et une forme. La force d'un club est
dérivée de son effectif, en continu — il n'y a pas de curseur de difficulté.

**Le match** — une boucle de possessions horodatées sur 60 minutes :

| Mécanique | Ce qu'elle change |
| --- | --- |
| Pertes de balle | Créditées au porteur, et au défenseur quand elles sont provoquées |
| Contacts irréguliers | Jets de 7 m et exclusions de 2 minutes, selon l'agressivité du système |
| Supériorité numérique | Une exclusion coûte deux minutes à six joueurs de champ |
| Contre-attaques | Déclenchées par le repli adverse et la vitesse des récupérateurs |
| Fatigue | Soixante minutes pleines coûtent près de soixante points de condition |
| Temps morts | Trois par match, deux par mi-temps, balle en main — et l'élan adverse remis à zéro |
| Élan | Une équipe qui enchaîne les buts joue plus haut, jusqu'à ce qu'on la coupe |
| Rotation attaque / défense | Les spécialistes se croisent à chaque changement de possession |
| Gardien volant | Sept contre six pour la phase d'attaque, but vide sur chaque ballon intercepté |
| Réussite du jour | Tirée au coup d'envoi, jamais affichée : un gardien est dedans ou à côté |
| Gauchers | Un droitier à l'arrière droit tire depuis un angle fermé |

**Le banc, pendant le match** — le moteur est interruptible : on arrête le jeu, on change un
joueur cuit, on pose un temps mort pour couper une série, on passe en 3-2-1 parce qu'ils
arment de loin, on sort le gardien à deux minutes de la fin. Ou on confie tout à l'adjoint.
Mesuré au harnais : tenir son banc rapporte **1,5 but par match** et fait passer le taux de
victoire de 41 % à 55 %.

**Les décisions tactiques** — trois systèmes défensifs, trois rythmes de jeu, une consigne de
rotation, les échanges attaque / défense. Le système adverse déforme la répartition de vos tirs : un bloc bas (6-0) vous laisse
armer de loin mais ferme le pivot, une défense haute (3-2-1) étouffe les neuf mètres et renvoie
le jeu à l'intérieur. Une équipe de gros arrières et une équipe de jeu intérieur n'ont donc pas
le même adversaire idéal — et le rapport d'observation d'avant-match vous dit lequel vous avez
en face.

## Le harnais

`npm run harnais` vérifie huit familles d'invariants sur des milliers de matchs. Aucune
modification du moteur n'est considérée comme finie tant qu'il n'est pas vert.

| Invariant | Assertion |
| --- | --- |
| Comptabilité des buts | Somme des buts du tableau = score, sur 500 matchs ; aucun tireur absent de la feuille |
| Temps de jeu | Total = 420 min moins le temps en infériorité ; aucun joueur hors [0, 60] |
| Bornes | Attributs dans [1, 20] ; condition et moral dans [0, 100] sur une saison entière |
| Pas de stratégie dominante | Aucune des 9 combinaisons dans le trio de tête des 6 contextes testés |
| Difficulté monotone | 8 adversaires de force croissante → 8 différences de buts décroissantes |
| Réalisme statistique | Buts 26–32, réussite 55–62 %, exclusions 3–5, jets de 7 m 4–5 |
| L'identité handball | Le sept contre six renverse des fins de match, la rotation attaque / défense rapporte |
| Le banc pèse | Une rotation pilotée rapporte plus d'un but par match, règles des temps morts respectées |
| Stabilité longue | *à écrire avec la bascule de saison (phase 4)* |
| Reproductibilité | Même graine + même tactique → match identique au caractère près |

Le lot de référence est joué comme le jeu le joue vraiment : bancs tenus par les adjoints, y
compris pour les clubs non contrôlés. Calibrer sur des matchs que personne ne jouera n'aurait
pas de sens.

Mesures actuelles sur 500 matchs : **29,8 buts**, **60,5 % de réussite**, 48 tirs,
3,4 exclusions, 4,5 jets de 7 m, 11,5 pertes de balle dont 6,3 provoquées, 57 possessions,
avantage du terrain ≈ 1,7 but. Une saison complète des trois divisions (546 matchs) se simule
en **2 secondes**.

Les deux critères de sortie de la phase 3, mesurés :

- L'écart entre le bon et le mauvais système défensif atteint **1,01 but** cumulé sur les deux
  profils d'adversaire. L'effet est net face au jeu intérieur (1,05 but pour le bloc bas) et
  encore faible face aux gros arrières — c'est ce qu'il reste à creuser.
- Le gardien volant, sorti dans les deux dernières minutes avec un à trois buts de retard, fait
  passer la récolte de **0,26 à 0,33 point** sur les fins de match concernées : une fin sur
  vingt change de camp.
- La rotation attaque / défense rapporte **0,45 but** aux clubs qui ont les profils pour.

Un écart connu et assumé : **5 à 7 % de matchs nuls** contre 8–10 % dans un championnat réel.

## Organisation du code

```
src/
├── moteur/              TypeScript pur — aucune dépendance à React
│   ├── types.ts         Vocabulaire du domaine
│   ├── aleatoire.ts     Générateur déterministe (mulberry32)
│   ├── attributs.ts     Pondérations par poste, note, état du jour
│   ├── noms.ts          Univers fictif : 42 clubs, prénoms et noms
│   ├── monde.ts         Génération du monde persistant, force d'un club
│   ├── saison.ts        Calendrier, journées, classement, statistiques
│   ├── match/
│   │   ├── parametres.ts  Toutes les constantes calibrées
│   │   └── moteur.ts      La boucle de possession
│   └── harnais/         Les invariants (Vitest)
├── jeu/                 Couche de jeu : état, sauvegarde, IA des clubs, observation, adjoint
├── composants/          Écusson, radar, barres d'attributs
└── app/                 Écrans (App Router, composants client)
scripts/mesurer.ts           Banc d'essai statistique
scripts/mesurer-pilotage.ts  Ce que vaut le banc, levier par levier
scripts/mesurer-phase3.ts    Les critères de sortie de la phase 3
```

## Où en est le projet

Le plan suivi est la roadmap révisée du 10 septembre 2026 (« viser la profondeur de FM avec un
seul développeur »).

- **Phase 0 — réparer et se donner un filet.** Fait. Les trois défauts relevés par l'audit sur
  8 100 matchs ne peuvent plus se reproduire : les tirs ne sont pris que par des joueurs
  présents sur le terrain, les pertes provoquées sont alimentées des deux côtés, et la force
  adverse est une échelle continue. Le harnais est écrit et versionné.
- **Phase 1 — le monde persistant.** Fait. Trois divisions, 756 joueurs nommés et conservés,
  tous les matchs entre clubs IA passent par le vrai moteur sur les vrais effectifs.
- **Phase 2 — la décision de match.** Fait. Composition du sept, système, rythme et consigne
  de rotation avant le match ; temps morts, changements et consignes en direct pendant. Critère
  de sortie mesuré au harnais : le pilotage du banc rapporte 1,5 but par match, très au-dessus
  du but exigé.
- **Phase 3 — l'identité handball.** Fait pour l'essentiel. Exclusions au bon niveau,
  supériorité numérique jouée, sept contre six qui renverse des fins de match, spécialistes
  attaque / défense qui tournent à chaque changement de possession, rareté des gauchers,
  réussite du jour des gardiens. Reste à creuser : l'écart entre systèmes face à une équipe de
  gros arrières.
- **Phases 4 à 6 — temps long, marché, enjeux.** Pas commencées. Pas de bascule de saison, pas
  de transferts, pas de conseil d'administration : l'objectif affiché n'aurait aucune
  conséquence, il n'est donc pas affiché.

Le monde, les clubs et les joueurs sont **100 % fictifs**. C'est un choix assumé : aucune
licence, aucun risque juridique, et un monde dont on maîtrise entièrement l'équilibre.
