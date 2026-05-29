-- Family Budget schema, security, calculations, and seed data.
-- Run in the Supabase SQL editor or via `supabase db push`.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Allowlist helper: only these two emails may ever touch data.
-- ---------------------------------------------------------------------------
create or replace function public.is_allowed_user()
returns boolean
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) in (
    'blakereagan@gmail.com',
    'amandareagan302@gmail.com'
  );
$$;

-- ---------------------------------------------------------------------------
-- Profiles (1 row per allowed auth user)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Categories: self-referencing tree, max depth 3, type inherited from parent
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id) on delete cascade,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  depth int not null default 1 check (depth between 1 and 3),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists categories_parent_idx on public.categories(parent_id);

create or replace function public.categories_set_depth()
returns trigger
language plpgsql
as $$
declare
  parent record;
begin
  if new.parent_id is null then
    new.depth := 1;
  else
    select depth, type into parent from public.categories where id = new.parent_id;
    if parent is null then
      raise exception 'Parent category not found';
    end if;
    if parent.depth >= 3 then
      raise exception 'Maximum category depth is 3';
    end if;
    new.depth := parent.depth + 1;
    new.type := parent.type; -- children inherit their parent's type
  end if;
  return new;
end;
$$;

drop trigger if exists trg_categories_depth on public.categories;
create trigger trg_categories_depth
  before insert or update on public.categories
  for each row execute function public.categories_set_depth();

-- ---------------------------------------------------------------------------
-- Budgets: one manually entered amount per (category, month)
-- ---------------------------------------------------------------------------
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  month date not null,
  amount numeric(14, 2) not null default 0,
  created_at timestamptz not null default now(),
  unique (category_id, month)
);
create index if not exists budgets_month_idx on public.budgets(month);

-- ---------------------------------------------------------------------------
-- Transactions: actuals, tagged to a ledger and a category
-- ---------------------------------------------------------------------------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  ledger text not null check (ledger in ('blake', 'amanda')),
  category_id uuid references public.categories(id) on delete set null,
  txn_date date not null,
  amount numeric(14, 2) not null check (amount >= 0),
  type text not null check (type in ('income', 'expense')),
  payee text,
  memo text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists transactions_date_idx on public.transactions(txn_date);
create index if not exists transactions_category_idx on public.transactions(category_id);
create index if not exists transactions_ledger_idx on public.transactions(ledger);

-- ---------------------------------------------------------------------------
-- Debts
-- ---------------------------------------------------------------------------
create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  balance numeric(14, 2) not null default 0,
  apr numeric(6, 3) not null default 0,
  min_payment numeric(14, 2) not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Create + restrict auth users to the allowlist; auto-provision a profile.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(new.email) not in (
    'blakereagan@gmail.com',
    'amandareagan302@gmail.com'
  ) then
    raise exception 'Email % is not permitted to register', new.email;
  end if;

  insert into public.profiles (id, email, display_name)
  values (new.id, lower(new.email), initcap(split_part(new.email, '@', 1)))
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Budget-to-actuals: per-category budget and rolled-up actual for a month.
-- ---------------------------------------------------------------------------
create or replace function public.monthly_budget_actuals(p_month date)
returns table (
  category_id uuid,
  name text,
  parent_id uuid,
  depth int,
  type text,
  budget numeric,
  actual numeric
)
language sql
stable
as $$
  with mo as (select date_trunc('month', p_month)::date as m)
  select
    c.id as category_id,
    c.name,
    c.parent_id,
    c.depth,
    c.type,
    coalesce(b.amount, 0) as budget,
    coalesce((
      with recursive sub as (
        select c.id as id
        union all
        select ch.id from public.categories ch join sub on ch.parent_id = sub.id
      )
      select sum(t.amount)
      from public.transactions t
      where t.category_id in (select id from sub)
        and date_trunc('month', t.txn_date)::date = (select m from mo)
    ), 0) as actual
  from public.categories c
  left join public.budgets b
    on b.category_id = c.id and b.month = (select m from mo)
  order by c.type desc, c.depth, c.sort_order, c.name;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security: allowed users get full access; everyone else nothing.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.budgets enable row level security;
alter table public.transactions enable row level security;
alter table public.debts enable row level security;

do $$
declare t text;
begin
  foreach t in array array['profiles','categories','budgets','transactions','debts']
  loop
    execute format('drop policy if exists allowed_all on public.%I;', t);
    execute format(
      'create policy allowed_all on public.%I for all to authenticated using (public.is_allowed_user()) with check (public.is_allowed_user());',
      t
    );
  end loop;
end;
$$;

grant execute on function public.monthly_budget_actuals(date) to authenticated;
grant execute on function public.is_allowed_user() to authenticated;
