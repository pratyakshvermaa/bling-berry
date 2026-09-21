-- ============================================================
-- Bling Berry — Supabase schema, RLS policies, storage bucket
-- Paste this entire file into the Supabase SQL Editor and run.
-- Safe to re-run.
-- ============================================================

-- 1. Profiles table (extends auth.users)
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text not null default '',
  date_of_birth date,
  email         text not null default '',
  auth_provider text not null default 'email',
  marketing_opt_in boolean not null default false,
  role          text not null default 'customer'
                check (role in ('customer', 'admin')),
  created_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Helper: check admin without RLS recursion
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile except role" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles"
  on public.profiles for select
  using (public.is_admin());

-- Block client-side role changes; SQL editor (no auth.uid) can still promote admins
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null then
    raise exception 'Cannot change role';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- 2. Products table
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  caption     text not null default '',
  description text not null default '',
  price       numeric(10,2) not null default 0,
  category    text not null default 'everyday'
              check (category in ('bangles', 'watches', 'everyday')),
  stock       integer not null default 0,
  image_url   text not null default '',
  slug        text unique,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.products
  add column if not exists instagram_url text not null default '';

alter table public.products enable row level security;

drop policy if exists "Anyone can read products" on public.products;
create policy "Anyone can read products"
  on public.products for select
  using (true);

drop policy if exists "Admins can insert products" on public.products;
create policy "Admins can insert products"
  on public.products for insert
  with check (public.is_admin());

drop policy if exists "Admins can update products" on public.products;
create policy "Admins can update products"
  on public.products for update
  using (public.is_admin());

drop policy if exists "Admins can delete products" on public.products;
create policy "Admins can delete products"
  on public.products for delete
  using (public.is_admin());

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_product_update on public.products;
create trigger on_product_update
  before update on public.products
  for each row execute function public.handle_updated_at();

-- 3. Storage bucket for product images
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "Public read product images" on storage.objects;
create policy "Public read product images"
  on storage.objects for select
  using (bucket_id = 'product-images');

drop policy if exists "Admins can upload product images" on storage.objects;
create policy "Admins can upload product images"
  on storage.objects for insert
  with check (
    bucket_id = 'product-images'
    and public.is_admin()
  );

drop policy if exists "Admins can update product images" on storage.objects;
create policy "Admins can update product images"
  on storage.objects for update
  using (
    bucket_id = 'product-images'
    and public.is_admin()
  );

drop policy if exists "Admins can delete product images" on storage.objects;
create policy "Admins can delete product images"
  on storage.objects for delete
  using (
    bucket_id = 'product-images'
    and public.is_admin()
  );

-- 4. Helper: auto-create profile on signup via trigger
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, auth_provider, date_of_birth, marketing_opt_in)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    case
      when new.raw_app_meta_data->>'provider' = 'google' then 'google'
      else 'email'
    end,
    case
      when new.raw_user_meta_data->>'date_of_birth' is not null
           and new.raw_user_meta_data->>'date_of_birth' <> ''
      then (new.raw_user_meta_data->>'date_of_birth')::date
      else null
    end,
    coalesce((new.raw_user_meta_data->>'marketing_opt_in')::boolean, false)
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- One profile per email (case-insensitive). Skip blank emails.
create unique index if not exists profiles_email_lower_unique
  on public.profiles (lower(email))
  where coalesce(email, '') <> '';
