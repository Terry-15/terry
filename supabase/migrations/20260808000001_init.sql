-- =============================================================================
-- Amélioration continue — Gestion des erreurs / non-conformités
-- Migration initiale : types, tables, index, déclencheurs et RLS
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Types énumérés
-- -----------------------------------------------------------------------------
do $$ begin
  create type gravite as enum ('mineure', 'majeure', 'critique');
exception when duplicate_object then null; end $$;

do $$ begin
  create type statut_erreur as enum (
    'declaree',        -- déclarée, en attente de qualification
    'en_analyse',      -- analyse des causes en cours
    'plan_action',     -- plan d'actions en cours d'exécution
    'en_verification', -- actions faites, contrôle d'efficacité en cours
    'cloturee',        -- efficacité confirmée
    'rejetee'          -- non retenue (doublon, hors périmètre)
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type type_action as enum ('curative', 'corrective', 'preventive');
exception when duplicate_object then null; end $$;

do $$ begin
  create type statut_action as enum ('a_faire', 'en_cours', 'faite', 'annulee');
exception when duplicate_object then null; end $$;

do $$ begin
  create type phase_pdca as enum ('plan', 'do', 'check', 'act');
exception when duplicate_object then null; end $$;

do $$ begin
  -- Les 6M de l'arête d'Ishikawa
  create type famille_5m as enum (
    'main_doeuvre', 'matiere', 'materiel', 'methode', 'milieu', 'mesure'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type role_utilisateur as enum ('declarant', 'pilote', 'qualite', 'admin');
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- Référentiels
-- -----------------------------------------------------------------------------
create table if not exists services (
  id     uuid primary key default gen_random_uuid(),
  nom    text not null unique,
  code   text,
  actif  boolean not null default true,
  cree_le timestamptz not null default now()
);

create table if not exists categories (
  id     uuid primary key default gen_random_uuid(),
  nom    text not null unique,
  code   text,
  actif  boolean not null default true,
  cree_le timestamptz not null default now()
);

-- Profils applicatifs adossés à auth.users
create table if not exists profils (
  id         uuid primary key references auth.users(id) on delete cascade,
  nom_complet text not null,
  email      text,
  role       role_utilisateur not null default 'declarant',
  service    text,
  cree_le    timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Fiches d'erreur (non-conformités)
-- -----------------------------------------------------------------------------
create table if not exists erreurs (
  id             uuid primary key default gen_random_uuid(),
  reference      text not null unique,
  titre          text not null,
  description    text not null default '',
  service        text not null,
  categorie      text not null,
  gravite        gravite not null default 'mineure',
  statut         statut_erreur not null default 'declaree',
  date_detection date not null default current_date,
  date_survenue  date,
  declarant      text not null,
  pilote         text,
  cout_estime    numeric(12, 2),
  impact_client  boolean not null default false,
  recurrente     boolean not null default false,
  date_cloture   timestamptz,
  cree_par       uuid references auth.users(id) on delete set null,
  cree_le        timestamptz not null default now(),
  maj_le         timestamptz not null default now(),

  constraint erreurs_dates_coherentes
    check (date_survenue is null or date_survenue <= date_detection)
);

create index if not exists erreurs_statut_idx        on erreurs (statut);
create index if not exists erreurs_gravite_idx       on erreurs (gravite);
create index if not exists erreurs_service_idx       on erreurs (service);
create index if not exists erreurs_categorie_idx     on erreurs (categorie);
create index if not exists erreurs_date_detection_idx on erreurs (date_detection desc);

-- -----------------------------------------------------------------------------
-- Analyse des causes racines (une par fiche : 5 Pourquoi + Ishikawa)
-- -----------------------------------------------------------------------------
create table if not exists analyses (
  id          uuid primary key default gen_random_uuid(),
  erreur_id   uuid not null unique references erreurs(id) on delete cascade,
  probleme    text not null default '',
  cause_racine text,
  conclusion  text,
  valide_par  text,
  valide_le   timestamptz,
  cree_le     timestamptz not null default now(),
  maj_le      timestamptz not null default now()
);

create table if not exists cinq_pourquoi (
  id          uuid primary key default gen_random_uuid(),
  analyse_id  uuid not null references analyses(id) on delete cascade,
  niveau      smallint not null check (niveau between 1 and 7),
  question    text not null default '',
  reponse     text not null default '',
  unique (analyse_id, niveau)
);

create table if not exists ishikawa_causes (
  id          uuid primary key default gen_random_uuid(),
  analyse_id  uuid not null references analyses(id) on delete cascade,
  famille     famille_5m not null,
  libelle     text not null,
  est_racine  boolean not null default false,
  cree_le     timestamptz not null default now()
);

create index if not exists ishikawa_causes_analyse_idx on ishikawa_causes (analyse_id);

-- -----------------------------------------------------------------------------
-- Plan d'actions CAPA (rythmé par le PDCA)
-- -----------------------------------------------------------------------------
create table if not exists actions_capa (
  id                    uuid primary key default gen_random_uuid(),
  erreur_id             uuid not null references erreurs(id) on delete cascade,
  titre                 text not null,
  description           text,
  type                  type_action not null default 'corrective',
  phase_pdca            phase_pdca not null default 'plan',
  pilote                text not null,
  echeance              date not null,
  statut                statut_action not null default 'a_faire',
  date_realisation      date,
  efficacite_ok         boolean,
  efficacite_commentaire text,
  efficacite_date       date,
  cree_le               timestamptz not null default now(),
  maj_le                timestamptz not null default now()
);

create index if not exists actions_capa_erreur_idx   on actions_capa (erreur_id);
create index if not exists actions_capa_statut_idx   on actions_capa (statut);
create index if not exists actions_capa_echeance_idx on actions_capa (echeance);

-- -----------------------------------------------------------------------------
-- Journal d'événements (traçabilité de la fiche)
-- -----------------------------------------------------------------------------
create table if not exists journal (
  id        uuid primary key default gen_random_uuid(),
  erreur_id uuid not null references erreurs(id) on delete cascade,
  type      text not null default 'commentaire',
  message   text not null,
  auteur    text not null default 'Système',
  cree_le   timestamptz not null default now()
);

create index if not exists journal_erreur_idx on journal (erreur_id, cree_le desc);

-- -----------------------------------------------------------------------------
-- Référence automatique : NC-AAAA-0001
-- -----------------------------------------------------------------------------
create or replace function attribuer_reference_erreur()
returns trigger
language plpgsql
as $$
declare
  annee text := to_char(coalesce(new.date_detection, current_date), 'YYYY');
  suivant int;
begin
  if new.reference is not null and new.reference <> '' then
    return new;
  end if;

  select coalesce(max(substring(reference from 9)::int), 0) + 1
    into suivant
    from erreurs
   where reference like 'NC-' || annee || '-%';

  new.reference := 'NC-' || annee || '-' || lpad(suivant::text, 4, '0');
  return new;
end;
$$;

drop trigger if exists erreurs_reference on erreurs;
create trigger erreurs_reference
  before insert on erreurs
  for each row execute function attribuer_reference_erreur();

-- Horodatage de mise à jour
create or replace function toucher_maj_le()
returns trigger
language plpgsql
as $$
begin
  new.maj_le := now();
  return new;
end;
$$;

drop trigger if exists erreurs_maj_le on erreurs;
create trigger erreurs_maj_le before update on erreurs
  for each row execute function toucher_maj_le();

drop trigger if exists analyses_maj_le on analyses;
create trigger analyses_maj_le before update on analyses
  for each row execute function toucher_maj_le();

drop trigger if exists actions_capa_maj_le on actions_capa;
create trigger actions_capa_maj_le before update on actions_capa
  for each row execute function toucher_maj_le();

-- Création automatique du profil à l'inscription
create or replace function gerer_nouvel_utilisateur()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into profils (id, nom_complet, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nom_complet', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function gerer_nouvel_utilisateur();

-- -----------------------------------------------------------------------------
-- Vues d'indicateurs
-- -----------------------------------------------------------------------------
create or replace view v_actions_en_retard as
select a.*, e.reference, e.titre as erreur_titre, e.service
  from actions_capa a
  join erreurs e on e.id = a.erreur_id
 where a.statut in ('a_faire', 'en_cours')
   and a.echeance < current_date;

create or replace view v_pareto_categories as
select categorie,
       count(*)                            as nb_erreurs,
       coalesce(sum(cout_estime), 0)       as cout_total
  from erreurs
 where statut <> 'rejetee'
 group by categorie
 order by nb_erreurs desc;

create or replace view v_erreurs_par_mois as
select date_trunc('month', date_detection)::date as mois,
       count(*)                                   as nb_declarees,
       count(*) filter (where statut = 'cloturee') as nb_cloturees
  from erreurs
 group by 1
 order by 1;

-- -----------------------------------------------------------------------------
-- RLS — lecture pour tout utilisateur authentifié, écriture idem (V1)
-- -----------------------------------------------------------------------------
alter table services        enable row level security;
alter table categories      enable row level security;
alter table profils         enable row level security;
alter table erreurs         enable row level security;
alter table analyses        enable row level security;
alter table cinq_pourquoi   enable row level security;
alter table ishikawa_causes enable row level security;
alter table actions_capa    enable row level security;
alter table journal         enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'services', 'categories', 'erreurs', 'analyses',
    'cinq_pourquoi', 'ishikawa_causes', 'actions_capa', 'journal'
  ] loop
    execute format('drop policy if exists %I on %I', t || '_lecture', t);
    execute format(
      'create policy %I on %I for select to authenticated using (true)',
      t || '_lecture', t
    );

    execute format('drop policy if exists %I on %I', t || '_ecriture', t);
    execute format(
      'create policy %I on %I for all to authenticated using (true) with check (true)',
      t || '_ecriture', t
    );
  end loop;
end $$;

-- Un utilisateur lit tous les profils mais ne modifie que le sien
drop policy if exists profils_lecture on profils;
create policy profils_lecture on profils
  for select to authenticated using (true);

drop policy if exists profils_maj_perso on profils;
create policy profils_maj_perso on profils
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
