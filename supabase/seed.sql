-- =============================================================================
-- Jeu de données de démonstration
-- Exécuter après la migration initiale :  supabase db reset  (ou psql -f)
-- =============================================================================

insert into services (nom, code) values
  ('Production',   'PROD'),
  ('Logistique',   'LOG'),
  ('Qualité',      'QUA'),
  ('Achats',       'ACH'),
  ('Service client', 'SC'),
  ('Maintenance',  'MNT')
on conflict (nom) do nothing;

insert into categories (nom, code) values
  ('Erreur de saisie',        'SAI'),
  ('Défaut produit',          'PRD'),
  ('Retard de livraison',     'RET'),
  ('Non-respect de procédure','PRC'),
  ('Erreur de facturation',   'FAC'),
  ('Panne équipement',        'PAN'),
  ('Réclamation client',      'RCL')
on conflict (nom) do nothing;

-- --- Fiches d'erreur ---------------------------------------------------------
with nouvelles as (
  insert into erreurs (
    titre, description, service, categorie, gravite, statut,
    date_detection, date_survenue, declarant, pilote,
    cout_estime, impact_client, recurrente, date_cloture
  )
  values
    ('Colis expédié à la mauvaise adresse',
     'Le bon de préparation a été rattaché à la commande précédente lors du picking.',
     'Logistique', 'Erreur de saisie', 'majeure', 'plan_action',
     current_date - 12, current_date - 13, 'A. Bernard', 'M. Diallo',
     420.00, true, true, null),

    ('Lot 4412 non conforme — tolérance dimensionnelle',
     'Contrôle final : 18 pièces sur 200 hors tolérance (+0,4 mm).',
     'Production', 'Défaut produit', 'critique', 'en_analyse',
     current_date - 6, current_date - 7, 'S. Meunier', 'L. Petit',
     3150.00, true, false, null),

    ('Facture 2026-0871 émise au mauvais taux de TVA',
     'Taux 20 % appliqué au lieu de 5,5 % sur une commande de produits alimentaires.',
     'Achats', 'Erreur de facturation', 'mineure', 'cloturee',
     current_date - 40, current_date - 42, 'C. Rossi', 'C. Rossi',
     180.00, false, false, now() - interval '9 days'),

    ('Retard de 3 jours sur la commande CMD-7781',
     'Rupture de composant non anticipée par le réapprovisionnement.',
     'Logistique', 'Retard de livraison', 'majeure', 'en_verification',
     current_date - 25, current_date - 28, 'A. Bernard', 'M. Diallo',
     900.00, true, true, null),

    ('Procédure de contrôle réception non appliquée',
     'Deux réceptions validées sans contrôle documentaire sur la semaine 24.',
     'Qualité', 'Non-respect de procédure', 'majeure', 'plan_action',
     current_date - 18, current_date - 20, 'L. Petit', 'S. Meunier',
     0.00, false, false, null),

    ('Arrêt presse n°3 — capteur de position HS',
     'Panne du capteur entraînant 4 h d''arrêt de ligne.',
     'Maintenance', 'Panne équipement', 'critique', 'cloturee',
     current_date - 55, current_date - 55, 'K. Nguyen', 'K. Nguyen',
     5600.00, false, true, now() - interval '30 days'),

    ('Réclamation client — emballage endommagé',
     'Trois clients signalent des cartons écrasés sur la même tournée.',
     'Service client', 'Réclamation client', 'mineure', 'declaree',
     current_date - 3, current_date - 4, 'F. Leroy', null,
     250.00, true, false, null),

    ('Double saisie de commande dans l''ERP',
     'La commande CMD-7802 a été enregistrée deux fois, générant un double envoi.',
     'Service client', 'Erreur de saisie', 'mineure', 'cloturee',
     current_date - 70, current_date - 70, 'F. Leroy', 'A. Bernard',
     310.00, true, true, now() - interval '48 days'),

    ('Étiquetage produit non conforme au cahier des charges',
     'Mention d''allergène manquante sur 1 200 étiquettes imprimées.',
     'Production', 'Défaut produit', 'critique', 'plan_action',
     current_date - 9, current_date - 10, 'S. Meunier', 'L. Petit',
     2400.00, true, false, null),

    ('Écart d''inventaire sur la référence REF-3391',
     'Écart de 46 unités entre stock physique et stock théorique.',
     'Logistique', 'Non-respect de procédure', 'mineure', 'rejetee',
     current_date - 33, current_date - 35, 'M. Diallo', null,
     null, false, false, null)
  returning id, reference, titre, statut
)
select count(*) as fiches_creees from nouvelles;

-- --- Analyses des causes -----------------------------------------------------
insert into analyses (erreur_id, probleme, cause_racine, conclusion, valide_par, valide_le)
select e.id,
       'Lot 4412 : 9 % des pièces hors tolérance dimensionnelle en contrôle final.',
       'Le plan de maintenance préventive de la presse n''intègre pas le recalage du butoir après changement d''outil.',
       'Cause racine organisationnelle confirmée : le mode opératoire de changement de série omet l''étape de recalage.',
       'L. Petit', now() - interval '2 days'
  from erreurs e
 where e.titre = 'Lot 4412 non conforme — tolérance dimensionnelle'
on conflict (erreur_id) do nothing;

insert into cinq_pourquoi (analyse_id, niveau, question, reponse)
select a.id, v.niveau, v.question, v.reponse
  from analyses a
  join erreurs e on e.id = a.erreur_id
  cross join (values
    (1, 'Pourquoi les pièces sont-elles hors tolérance ?',
        'Le butoir de la presse s''est décalé de 0,4 mm en cours de série.'),
    (2, 'Pourquoi le butoir s''est-il décalé ?',
        'La vis de blocage n''était pas serrée au couple prescrit.'),
    (3, 'Pourquoi la vis n''était-elle pas serrée au couple ?',
        'L''opérateur a effectué le changement d''outil sans clé dynamométrique.'),
    (4, 'Pourquoi la clé dynamométrique n''a-t-elle pas été utilisée ?',
        'Elle était en cours d''étalonnage et aucune clé de remplacement n''était disponible.'),
    (5, 'Pourquoi aucun remplacement n''était-il disponible ?',
        'Le plan de maintenance ne prévoit pas d''outillage de secours pendant les étalonnages.')
  ) as v(niveau, question, reponse)
 where e.titre = 'Lot 4412 non conforme — tolérance dimensionnelle'
on conflict (analyse_id, niveau) do nothing;

insert into ishikawa_causes (analyse_id, famille, libelle, est_racine)
select a.id, v.famille::famille_5m, v.libelle, v.est_racine
  from analyses a
  join erreurs e on e.id = a.erreur_id
  cross join (values
    ('main_doeuvre', 'Opérateur non formé au changement de série rapide', false),
    ('main_doeuvre', 'Changement d''équipe pendant la série',             false),
    ('materiel',     'Clé dynamométrique indisponible (étalonnage)',      true),
    ('materiel',     'Butoir de presse sans détrompeur',                  false),
    ('methode',      'Mode opératoire sans étape de recalage',            true),
    ('methode',      'Pas de contrôle première pièce après changement',   false),
    ('mesure',       'Contrôle dimensionnel uniquement en fin de lot',    false),
    ('matiere',      'Lot matière en limite haute d''épaisseur',          false),
    ('milieu',       'Température atelier élevée (32 °C)',                false)
  ) as v(famille, libelle, est_racine)
 where e.titre = 'Lot 4412 non conforme — tolérance dimensionnelle';

-- --- Plan d'actions CAPA -----------------------------------------------------
insert into actions_capa (
  erreur_id, titre, description, type, phase_pdca, pilote, echeance,
  statut, date_realisation, efficacite_ok, efficacite_commentaire, efficacite_date
)
select e.id, v.titre, v.description, v.type::type_action, v.phase::phase_pdca,
       v.pilote, current_date + v.jours, v.statut::statut_action,
       v.realisation, v.eff_ok, v.eff_com, v.eff_date
  from erreurs e
  join (values
    ('Lot 4412 non conforme — tolérance dimensionnelle',
     'Trier et rebuter les 18 pièces non conformes', 'Isolement du lot et tri à 100 %.',
     'curative', 'do', 'S. Meunier', -4, 'faite', current_date - 4, null, null, null),
    ('Lot 4412 non conforme — tolérance dimensionnelle',
     'Ajouter le recalage du butoir au mode opératoire', 'Révision du MO-PROD-014 et validation qualité.',
     'corrective', 'do', 'L. Petit', 6, 'en_cours', null, null, null, null),
    ('Lot 4412 non conforme — tolérance dimensionnelle',
     'Doter chaque presse d''une clé dynamométrique dédiée', 'Achat de 3 clés + plan d''étalonnage tournant.',
     'preventive', 'plan', 'K. Nguyen', 21, 'a_faire', null, null, null, null),
    ('Colis expédié à la mauvaise adresse',
     'Scanner obligatoire du bon de préparation', 'Blocage de la validation sans scan du code-barres.',
     'corrective', 'do', 'M. Diallo', -2, 'en_cours', null, null, null, null),
    ('Colis expédié à la mauvaise adresse',
     'Renvoyer le colis au client et récupérer l''erroné', 'Prise en charge des frais de retour.',
     'curative', 'do', 'A. Bernard', -8, 'faite', current_date - 9, null, null, null),
    ('Retard de 3 jours sur la commande CMD-7781',
     'Mettre en place un seuil d''alerte de réapprovisionnement', 'Seuil dynamique sur les 20 références critiques.',
     'preventive', 'check', 'M. Diallo', -1, 'faite', current_date - 3, null, null, null),
    ('Procédure de contrôle réception non appliquée',
     'Rappel de la procédure en réunion d''équipe', 'Émargement de la sensibilisation.',
     'corrective', 'do', 'S. Meunier', 3, 'a_faire', null, null, null, null),
    ('Procédure de contrôle réception non appliquée',
     'Audit interne de suivi à 1 mois', 'Vérifier 10 réceptions par sondage.',
     'preventive', 'check', 'L. Petit', 25, 'a_faire', null, null, null, null),
    ('Étiquetage produit non conforme au cahier des charges',
     'Détruire les étiquettes non conformes', 'Destruction tracée des 1 200 étiquettes.',
     'curative', 'do', 'S. Meunier', -1, 'faite', current_date - 2, null, null, null),
    ('Étiquetage produit non conforme au cahier des charges',
     'Double validation du BAT avant impression', 'Ajout d''un contrôle croisé qualité + marketing.',
     'corrective', 'plan', 'L. Petit', 14, 'a_faire', null, null, null, null),
    ('Facture 2026-0871 émise au mauvais taux de TVA',
     'Émettre un avoir et refacturer', 'Régularisation comptable.',
     'curative', 'act', 'C. Rossi', -30, 'faite', current_date - 31, true,
     'Aucune récidive sur les 3 cycles de facturation suivants.', current_date - 10),
    ('Arrêt presse n°3 — capteur de position HS',
     'Remplacer le capteur et ajouter un capteur de secours en stock', 'Stock de sécurité de 2 capteurs.',
     'preventive', 'act', 'K. Nguyen', -35, 'faite', current_date - 40, true,
     'Aucun arrêt sur ce composant depuis 30 jours.', current_date - 25),
    ('Double saisie de commande dans l''ERP',
     'Contrôle d''unicité sur la référence commande dans l''ERP', 'Règle bloquante côté ERP.',
     'corrective', 'act', 'A. Bernard', -55, 'faite', current_date - 58, true,
     'Plus aucun doublon détecté depuis la mise en production.', current_date - 45)
  ) as v(erreur_titre, titre, description, type, phase, pilote, jours, statut, realisation, eff_ok, eff_com, eff_date)
    on e.titre = v.erreur_titre;

-- --- Journal -----------------------------------------------------------------
insert into journal (erreur_id, type, message, auteur, cree_le)
select e.id, 'creation', 'Fiche créée : ' || e.titre, e.declarant, e.cree_le
  from erreurs e;

insert into journal (erreur_id, type, message, auteur, cree_le)
select e.id, 'cloture', 'Fiche clôturée après contrôle d''efficacité.', coalesce(e.pilote, 'Qualité'), e.date_cloture
  from erreurs e
 where e.date_cloture is not null;
