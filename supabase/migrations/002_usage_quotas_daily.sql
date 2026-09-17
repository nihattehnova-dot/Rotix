-- =============================================================================
-- 002 — Daily + monthly quota tracking on usage_quotas
-- =============================================================================

alter table public.usage_quotas
  add column if not exists daily_date date not null default (timezone('utc', now())::date);

alter table public.usage_quotas
  add column if not exists daily_minutes_used numeric(8, 2) not null default 0
    check (daily_minutes_used >= 0);

alter table public.usage_quotas
  add column if not exists daily_questions_used integer not null default 0
    check (daily_questions_used >= 0);

comment on table public.usage_quotas is
  'Tracks monthly questions/minutes and rolling daily usage for tier rate-limits.';
