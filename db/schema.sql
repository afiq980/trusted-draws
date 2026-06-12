-- trusted-draws MVP database schema
-- Core tables for draws, entries, and results.

create extension if not exists pgcrypto;

create table draws (
  id uuid primary key default gen_random_uuid(),
  public_id varchar(32) not null unique,
  admin_token varchar(64) not null unique,
  title text not null,
  description text,
  organizer_name text,
  organizer_email text,
  entry_format text not null check (entry_format in ('username', 'email', 'phone', 'custom', 'free-text')),
  uniqueness_rule text not null check (uniqueness_rule in ('unique', 'duplicates_allowed')),
  num_winners integer not null default 1 check (num_winners > 0),
  allow_weighted boolean not null default false,
  settings jsonb not null default '{}'::jsonb,
  verification_key varchar(128) not null,
  status text not null default 'draft' check (status in ('draft', 'open', 'closed', 'drawn', 'published', 'archived')),
  entry_start_at timestamptz,
  entry_end_at timestamptz,
  draw_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index draws_public_id_index on draws (public_id);
create index draws_admin_token_index on draws (admin_token);

create table entries (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid not null references draws(id) on delete cascade,
  entry_text text not null,
  entry_hash varchar(128) not null,
  weight integer not null default 1 check (weight > 0),
  email text,
  ip_address inet,
  created_at timestamptz not null default now()
);

create unique index entries_draw_hash_unique on entries (draw_id, entry_hash);
create index entries_draw_id_index on entries (draw_id);

create table draw_results (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid not null references draws(id) on delete cascade,
  entry_id uuid not null references entries(id) on delete restrict,
  position integer not null,
  winner_hash varchar(128) not null,
  selected_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index draw_results_draw_position_unique on draw_results (draw_id, position);
create unique index draw_results_draw_entry_unique on draw_results (draw_id, entry_id);
