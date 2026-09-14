-- ==============================================================================
-- COLLECTO: Production Schema with Universal Brand / Company Association
-- Run this in Supabase SQL Editor
-- ==============================================================================

-- 0. COMPANIES (Master list of brands / distributor companies: e.g. Haier, General, Godrej)
create table if not exists public.companies (
    id uuid primary key default gen_random_uuid(),
    name text unique not null,
    code text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 1. EXECUTIVES (Team members assigned to collections)
create table if not exists public.executives (
    id uuid primary key default gen_random_uuid(),
    name text unique not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. SHOPS (Master list of retail shops registered by Admin)
create table if not exists public.shops (
    id uuid primary key default gen_random_uuid(),
    name text unique not null,
    company_id uuid references public.companies(id) on delete set null,
    company_name text,
    brand_id uuid references public.companies(id) on delete set null,
    brand_name text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. SHOP MAPPINGS (Pairs Shop Name -> Executive Name)
create table if not exists public.shop_mappings (
    id uuid primary key default gen_random_uuid(),
    shop_id uuid references public.shops(id) on delete cascade unique not null,
    executive_id uuid references public.executives(id) on delete set null,
    company_id uuid references public.companies(id) on delete set null,
    company_name text,
    brand_id uuid references public.companies(id) on delete set null,
    brand_name text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. UPLOAD BATCHES (Log of uploaded Excel files)
create table if not exists public.upload_batches (
    id uuid primary key default gen_random_uuid(),
    file_name text not null,
    company_id uuid references public.companies(id) on delete set null,
    company_name text,
    brand_id uuid references public.companies(id) on delete set null,
    brand_name text,
    total_shops integer not null default 0,
    total_items integer not null default 0,
    uploaded_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. SHOP COLLECTIONS (Parent Records: 1 Shop = 1 Invoice)
create table if not exists public.shop_collections (
    id uuid primary key default gen_random_uuid(),
    shop_name text not null,
    invoice_no text not null,
    invoice_date text,
    gstin_uin text,
    total_amount numeric(14, 2) not null default 0,
    total_quantity text,
    executive_id uuid references public.executives(id) on delete set null,
    executive_name text,
    company_id uuid references public.companies(id) on delete set null,
    company_name text,
    brand_id uuid references public.companies(id) on delete set null,
    brand_name text,
    upload_batch_id uuid references public.upload_batches(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. COLLECTION ITEMS (Child Records: Product items belonging to parent shop)
create table if not exists public.collection_items (
    id uuid primary key default gen_random_uuid(),
    shop_collection_id uuid references public.shop_collections(id) on delete cascade not null,
    product_name text not null,
    quantity text,
    amount numeric(14, 2) not null default 0,
    company_id uuid references public.companies(id) on delete set null,
    company_name text,
    brand_id uuid references public.companies(id) on delete set null,
    brand_name text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==============================================================================
-- IDEMPOTENT MIGRATIONS FOR EXISTING DATABASES:
-- Safely add brand_id & company_id columns to all existing tables
-- ==============================================================================

alter table public.upload_batches
  add column if not exists company_id uuid references public.companies(id) on delete cascade,
  add column if not exists company_name text,
  add column if not exists brand_id uuid references public.companies(id) on delete cascade,
  add column if not exists brand_name text;

alter table public.shop_collections
  add column if not exists company_id uuid references public.companies(id) on delete cascade,
  add column if not exists company_name text,
  add column if not exists brand_id uuid references public.companies(id) on delete cascade,
  add column if not exists brand_name text,
  add column if not exists is_paid boolean default false;


alter table public.collection_items
  add column if not exists company_id uuid references public.companies(id) on delete cascade,
  add column if not exists company_name text,
  add column if not exists brand_id uuid references public.companies(id) on delete cascade,
  add column if not exists brand_name text;

alter table public.shops
  add column if not exists company_id uuid references public.companies(id) on delete set null,
  add column if not exists company_name text,
  add column if not exists brand_id uuid references public.companies(id) on delete set null,
  add column if not exists brand_name text;

alter table public.shop_mappings
  add column if not exists company_id uuid references public.companies(id) on delete set null,
  add column if not exists company_name text,
  add column if not exists brand_id uuid references public.companies(id) on delete set null,
  add column if not exists brand_name text;

-- Sync brand_id & company_id across existing records
update public.upload_batches set brand_id = company_id where brand_id is null and company_id is not null;
update public.shop_collections set brand_id = company_id where brand_id is null and company_id is not null;
update public.collection_items ci
  set brand_id = sc.brand_id, company_id = sc.company_id, company_name = sc.company_name
  from public.shop_collections sc
  where ci.shop_collection_id = sc.id and (ci.company_id is null or ci.brand_id is null);

-- Enable RLS
alter table public.companies enable row level security;
alter table public.executives enable row level security;
alter table public.shops enable row level security;
alter table public.shop_mappings enable row level security;
alter table public.upload_batches enable row level security;
alter table public.shop_collections enable row level security;
alter table public.collection_items enable row level security;

-- Public read/write policies (Drop if exists, then recreate)
drop policy if exists "Public companies access" on public.companies;
drop policy if exists "Public executives access" on public.executives;
drop policy if exists "Public shops access" on public.shops;
drop policy if exists "Public shop_mappings access" on public.shop_mappings;
drop policy if exists "Public upload_batches access" on public.upload_batches;
drop policy if exists "Public shop_collections access" on public.shop_collections;
drop policy if exists "Public collection_items access" on public.collection_items;

create policy "Public companies access" on public.companies for all using (true) with check (true);
create policy "Public executives access" on public.executives for all using (true) with check (true);
create policy "Public shops access" on public.shops for all using (true) with check (true);
create policy "Public shop_mappings access" on public.shop_mappings for all using (true) with check (true);
create policy "Public upload_batches access" on public.upload_batches for all using (true) with check (true);
create policy "Public shop_collections access" on public.shop_collections for all using (true) with check (true);
create policy "Public collection_items access" on public.collection_items for all using (true) with check (true);

-- Indexes for performance
create index if not exists idx_shop_collections_company_id on public.shop_collections(company_id);
create index if not exists idx_shop_collections_brand_id on public.shop_collections(brand_id);
create index if not exists idx_upload_batches_company_id on public.upload_batches(company_id);
create index if not exists idx_upload_batches_brand_id on public.upload_batches(brand_id);
create index if not exists idx_collection_items_company_id on public.collection_items(company_id);
create index if not exists idx_collection_items_brand_id on public.collection_items(brand_id);
create index if not exists idx_shops_brand_id on public.shops(brand_id);
create index if not exists idx_shop_mappings_brand_id on public.shop_mappings(brand_id);

-- ==============================================================================
-- MULTI-COMPANY SHOP MAPPING SUPPORT:
-- A shop name can exist across multiple companies/brands with independent mappings
-- ==============================================================================
alter table public.shops drop constraint if exists shops_name_key;
alter table public.shop_mappings drop constraint if exists shop_mappings_shop_id_key;
create index if not exists idx_shops_name_company on public.shops(name, company_id);
create index if not exists idx_shop_mappings_shop_company on public.shop_mappings(shop_id, company_id);

-- ==============================================================================
-- CLEAN SEED DATA: Default Companies and Executive Team Members
-- ==============================================================================
insert into public.companies (name, code) values
    ('Haier', 'HAIER'),
    ('General', 'GEN'),
    ('Global Agencies', 'GA')
on conflict (name) do nothing;

insert into public.executives (name) values
    ('Rajesh Kumar'),
    ('Faisal Khan'),
    ('Naveen Reddy'),
    ('Priya Sharma')
on conflict (name) do nothing;
