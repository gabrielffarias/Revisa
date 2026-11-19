-- Revisa — schema do banco (Neon / Postgres)
-- Rode uma vez: npm run db:migrate  (ou cole no SQL Editor do Neon)

create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  nickname text,
  plate text,
  brand text not null,
  model text not null,
  version text,
  manufacture_year int,
  model_year int,
  fuel text,
  color text,
  fipe_code text,
  fipe_amount numeric(12, 2),
  plan_source text not null default 'padrao', -- padrao | ia | manual
  plan_summary text,
  created_at timestamptz not null default now()
);
create index if not exists vehicles_user_idx on vehicles(user_id);

-- leituras do odômetro (o lembrete semanal pede uma nova)
create table if not exists odometer_readings (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  km int not null check (km >= 0),
  read_at date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists readings_vehicle_idx on odometer_readings(vehicle_id, read_at desc);

-- itens do plano de manutenção (vencem por km, por tempo ou pelos dois — o que vier primeiro)
create table if not exists plan_items (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  name text not null,
  category text not null default 'outros',
  interval_km int check (interval_km is null or interval_km > 0),
  interval_months int check (interval_months is null or interval_months > 0),
  notes text,
  source text not null default 'padrao', -- padrao | ia | manual | usuario
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists plan_vehicle_idx on plan_items(vehicle_id, position);

-- serviços feitos (troca de óleo, pastilha, etc.)
create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  plan_item_id uuid references plan_items(id) on delete set null,
  title text not null,
  done_at date not null default current_date,
  km int check (km is null or km >= 0),
  cost numeric(12, 2),
  shop text,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists services_vehicle_idx on services(vehicle_id, done_at desc);

-- cache das consultas de placa (cada consulta paga só uma vez)
create table if not exists plate_lookups (
  plate text primary key,
  found boolean not null,
  data jsonb,
  created_at timestamptz not null default now()
);
