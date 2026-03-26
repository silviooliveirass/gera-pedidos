create extension if not exists "pgcrypto";

create table if not exists public.distribution_centers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('manager', 'cd_user')),
  distribution_center_id uuid references public.distribution_centers (id),
  full_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_orders (
  id uuid primary key default gen_random_uuid(),
  distribution_center_id uuid not null references public.distribution_centers (id) on delete cascade,
  order_date date not null,
  quantity integer not null check (quantity >= 0),
  created_by uuid not null references auth.users (id),
  updated_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (distribution_center_id, order_date)
);

create index if not exists idx_daily_orders_date on public.daily_orders (order_date);
create index if not exists idx_daily_orders_center on public.daily_orders (distribution_center_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists trg_daily_orders_updated_at on public.daily_orders;
create trigger trg_daily_orders_updated_at
before update on public.daily_orders
for each row
execute function public.set_updated_at();

alter table public.distribution_centers enable row level security;
alter table public.profiles enable row level security;
alter table public.daily_orders enable row level security;

drop policy if exists "Authenticated users can view centers" on public.distribution_centers;
create policy "Authenticated users can view centers"
  on public.distribution_centers
  for select
  to authenticated
  using (true);

drop policy if exists "Managers can manage centers" on public.distribution_centers;
create policy "Managers can manage centers"
  on public.distribution_centers
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'manager'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'manager'
    )
  );

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "Managers can view all profiles" on public.profiles;
create policy "Managers can view all profiles"
  on public.profiles
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'manager'
    )
  );

drop policy if exists "Managers can manage profiles" on public.profiles;
create policy "Managers can manage profiles"
  on public.profiles
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'manager'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'manager'
    )
  );

drop policy if exists "Managers can view all daily orders" on public.daily_orders;
create policy "Managers can view all daily orders"
  on public.daily_orders
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'manager'
    )
  );

drop policy if exists "CD users can view their own daily orders" on public.daily_orders;
create policy "CD users can view their own daily orders"
  on public.daily_orders
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role = 'cd_user'
      and p.distribution_center_id = daily_orders.distribution_center_id
    )
  );

drop policy if exists "Managers can insert or update daily orders" on public.daily_orders;
create policy "Managers can insert or update daily orders"
  on public.daily_orders
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'manager'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'manager'
    )
  );

drop policy if exists "CD users can insert or update own daily orders" on public.daily_orders;
create policy "CD users can insert or update own daily orders"
  on public.daily_orders
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role = 'cd_user'
      and p.distribution_center_id = daily_orders.distribution_center_id
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role = 'cd_user'
      and p.distribution_center_id = daily_orders.distribution_center_id
    )
  );

insert into public.distribution_centers (code, name)
values
  ('CD01', 'Centro de Distribuicao 01'),
  ('CD02', 'Centro de Distribuicao 02'),
  ('CD03', 'Centro de Distribuicao 03'),
  ('CD04', 'Centro de Distribuicao 04'),
  ('CD05', 'Centro de Distribuicao 05'),
  ('CD06', 'Centro de Distribuicao 06'),
  ('CD07', 'Centro de Distribuicao 07'),
  ('CD08', 'Centro de Distribuicao 08'),
  ('CD09', 'Centro de Distribuicao 09'),
  ('CD10', 'Centro de Distribuicao 10'),
  ('CD11', 'Centro de Distribuicao 11'),
  ('CD12', 'Centro de Distribuicao 12'),
  ('CD13', 'Centro de Distribuicao 13'),
  ('CD14', 'Centro de Distribuicao 14'),
  ('CD15', 'Centro de Distribuicao 15'),
  ('CD16', 'Centro de Distribuicao 16'),
  ('CD17', 'Centro de Distribuicao 17'),
  ('CD18', 'Centro de Distribuicao 18'),
  ('CD19', 'Centro de Distribuicao 19'),
  ('CD20', 'Centro de Distribuicao 20'),
  ('CD21', 'Centro de Distribuicao 21'),
  ('CD22', 'Centro de Distribuicao 22')
on conflict (code) do nothing;
