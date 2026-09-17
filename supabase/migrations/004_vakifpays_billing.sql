-- =============================================================================
-- 004 — VakıfPayS web POS, subscriptions, e-arşiv fatura
-- Trial = 7 days (update backfill for new defaults)
-- =============================================================================

-- Ensure new users conceptually get 7-day trial (app sets via trialService)
comment on column public.users.trial_ends_at is
  'Trial ends at; default window is 7 days from trial_started_at. On expiry access locks.';

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  tier subscription_tier not null,
  period text not null check (period in ('monthly', 'annual')),
  sku text not null,
  status subscription_status not null default 'active',
  price_try numeric(12, 2) not null,
  currency text not null default 'TRY',
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  auto_renew boolean not null default false,
  provider text not null default 'vakifpays',
  channel text not null default 'web_pos',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_subscriptions_user
  on public.subscriptions (user_id, ends_at desc);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  sku text not null,
  amount_try numeric(12, 2) not null,
  currency text not null default 'TRY',
  status text not null default 'pending'
    check (status in (
      'pending', 'redirected', 'paid', 'failed', 'cancelled', 'refunded'
    )),
  provider text not null default 'vakifpays',
  channel text not null default 'web_pos',
  merchant_order_id text not null unique,
  session_token text,
  payment_page_url text,
  provider_response jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payments_user on public.payments (user_id, created_at desc);
create index if not exists idx_payments_order on public.payments (merchant_order_id);

-- E-arşiv / e-fatura kuyruğu (zorunlu)
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'issued', 'failed', 'cancelled')),
  invoice_type text not null default 'earsiv'
    check (invoice_type in ('earsiv', 'efatura')),
  buyer_name text,
  buyer_tax_id text,
  buyer_email text,
  amount_try numeric(12, 2) not null,
  vat_rate numeric(5, 2) not null default 20,
  uuid_ettn text,
  pdf_url text,
  provider_ref text,
  error_message text,
  issued_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_invoices_payment on public.invoices (payment_id);
create index if not exists idx_invoices_status on public.invoices (status)
  where status = 'pending';

drop trigger if exists trg_subscriptions_updated_at on public.subscriptions;
create trigger trg_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

drop trigger if exists trg_payments_updated_at on public.payments;
create trigger trg_payments_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

drop trigger if exists trg_invoices_updated_at on public.invoices;
create trigger trg_invoices_updated_at
  before update on public.invoices
  for each row execute function public.set_updated_at();

alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.invoices enable row level security;

drop policy if exists subs_owner_select on public.subscriptions;
create policy subs_owner_select on public.subscriptions for select to authenticated
  using (user_id in (select id from public.users where auth_id = auth.uid()));

drop policy if exists payments_owner_select on public.payments;
create policy payments_owner_select on public.payments for select to authenticated
  using (user_id in (select id from public.users where auth_id = auth.uid()));

drop policy if exists invoices_owner_select on public.invoices;
create policy invoices_owner_select on public.invoices for select to authenticated
  using (user_id in (select id from public.users where auth_id = auth.uid()));
