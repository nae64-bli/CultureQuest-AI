-- Esquema SQL para Supabase (PostgreSQL) — CultureQuest AI
-- Ejecutá este script en el SQL Editor de tu proyecto en Supabase.

create extension if not exists "pgcrypto";

create table if not exists public.museums (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text not null,
  direccion text not null,
  contacto text not null default '',
  horarios text not null,
  precio_entrada integer not null default 0 check (precio_entrada >= 0),
  categoria text not null check (categoria in ('Museo', 'Galería', 'Sitio Histórico', 'Centro Cultural')),
  latitud double precision not null check (latitud between -90 and 90),
  longitud double precision not null check (longitud between -180 and 180),
  wikipedia_titulo text not null default '',
  imagen_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tabla para almacenar el hash de administrador reclamado (cuando ADMIN_PASSCODE no está en env)
create table if not exists public.admin_config (
  id text primary key,
  passcode_hash text not null,
  updated_at timestamptz not null default now()
);

-- Índices útiles para búsqueda y filtros
create index if not exists idx_museums_categoria on public.museums (categoria);
create index if not exists idx_museums_precio on public.museums (precio_entrada);

-- Seguridad RLS: lectura pública del catálogo; escrituras restringidas al rol de servicio del servidor
alter table public.museums enable row level security;
alter table public.admin_config enable row level security;

drop policy if exists "Lectura pública de museos" on public.museums;
create policy "Lectura pública de museos"
  on public.museums
  for select
  using (true);

-- Nota: Las operaciones INSERT/UPDATE/DELETE se ejecutan únicamente desde el servidor Express
-- utilizando SUPABASE_SERVICE_ROLE_KEY tras verificar la sesión de administrador.
