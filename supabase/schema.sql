-- ==============================================================================
-- COLLECTO: Production Schema for Hierarchical Collection Management
-- Run this in Supabase SQL Editor
-- ==============================================================================

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
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. SHOP MAPPINGS (Pairs Shop Name -> Executive Name)
create table if not exists public.shop_mappings (
    id uuid primary key default gen_random_uuid(),
    shop_id uuid references public.shops(id) on delete cascade unique not null,
    executive_id uuid references public.executives(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. UPLOAD BATCHES (Log of uploaded Excel files)
create table if not exists public.upload_batches (
    id uuid primary key default gen_random_uuid(),
    file_name text not null,
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
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.executives enable row level security;
alter table public.shops enable row level security;
alter table public.shop_mappings enable row level security;
alter table public.upload_batches enable row level security;
alter table public.shop_collections enable row level security;
alter table public.collection_items enable row level security;

-- Public read/write policies (Drop if exists, then recreate)
drop policy if exists "Public executives access" on public.executives;
drop policy if exists "Public shops access" on public.shops;
drop policy if exists "Public shop_mappings access" on public.shop_mappings;
drop policy if exists "Public upload_batches access" on public.upload_batches;
drop policy if exists "Public shop_collections access" on public.shop_collections;
drop policy if exists "Public collection_items access" on public.collection_items;

create policy "Public executives access" on public.executives for all using (true) with check (true);
create policy "Public shops access" on public.shops for all using (true) with check (true);
create policy "Public shop_mappings access" on public.shop_mappings for all using (true) with check (true);
create policy "Public upload_batches access" on public.upload_batches for all using (true) with check (true);
create policy "Public shop_collections access" on public.shop_collections for all using (true) with check (true);
create policy "Public collection_items access" on public.collection_items for all using (true) with check (true);

-- ==============================================================================
-- CLEAN SEED DATA: Only Executive Team Members
-- No dummy shops or dummy collections! Add your shops through Admin -> Shops.
-- ==============================================================================
insert into public.executives (name) values
    ('Rajesh Kumar'),
    ('Faisal Khan'),
    ('Naveen Reddy'),
    ('Priya Sharma')
on conflict (name) do nothing;
