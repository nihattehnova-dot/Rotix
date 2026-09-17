-- =============================================================================
-- Sanal Öğretmen — Initial Supabase / PostgreSQL schema (MVP Phase 1)
-- Apply in Supabase SQL Editor or via supabase db push
-- =============================================================================

-- Extensions
create extension if not exists "pgcrypto";

-- Enums
do $$ begin
  create type user_role as enum ('student', 'parent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_tier as enum ('basic', 'pro', 'limitless');
exception when duplicate_object then null; end $$;

do $$ begin
  create type session_mode as enum (
    'evening_review',
    'socratic',
    'spaced_repetition',
    'gap_fill'
  );
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- users
-- grade_level 1–12; role student/parent; tier drives quota middleware
-- -----------------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid unique references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  grade_level smallint check (grade_level is null or (grade_level between 1 and 12)),
  role user_role not null default 'student',
  tier subscription_tier not null default 'basic',
  streak_count integer not null default 0 check (streak_count >= 0),
  total_points integer not null default 0 check (total_points >= 0),
  parent_user_id uuid references public.users (id) on delete set null,
  locale text not null default 'tr-TR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint students_require_grade check (
    role <> 'student' or grade_level is not null
  )
);

create index if not exists idx_users_role on public.users (role);
create index if not exists idx_users_tier on public.users (tier);
create index if not exists idx_users_parent on public.users (parent_user_id);

-- -----------------------------------------------------------------------------
-- curriculum
-- Static lecture cache: pre-recorded TTS + Canvas draw commands (JSON)
-- -----------------------------------------------------------------------------
create table if not exists public.curriculum (
  id uuid primary key default gen_random_uuid(),
  grade smallint not null check (grade between 1 and 12),
  subject text not null,
  topic text not null,
  description text,
  cached_audio_url text,
  cached_canvas_json jsonb not null default '[]'::jsonb,
  estimated_minutes integer not null default 10 check (estimated_minutes > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (grade, subject, topic)
);

create index if not exists idx_curriculum_grade_subject
  on public.curriculum (grade, subject);

-- -----------------------------------------------------------------------------
-- sessions
-- Evening review / Socratic / spaced-repetition sessions
-- -----------------------------------------------------------------------------
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  mode session_mode not null default 'evening_review',
  start_time timestamptz not null default now(),
  end_time timestamptz,
  topics_covered text[] not null default '{}',
  tokens_used integer not null default 0 check (tokens_used >= 0),
  duration_seconds integer generated always as (
    case
      when end_time is null then null
      else greatest(0, extract(epoch from (end_time - start_time))::integer)
    end
  ) stored,
  had_new_school_topic boolean,
  success_rate numeric(5, 2),
  points_earned integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_sessions_user_start
  on public.sessions (user_id, start_time desc);

-- -----------------------------------------------------------------------------
-- user_mistakes  (CRITICAL — spaced repetition / hata defteri)
-- Ebbinghaus stages drive next_review_date via backend service
-- -----------------------------------------------------------------------------
create table if not exists public.user_mistakes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  session_id uuid references public.sessions (id) on delete set null,
  curriculum_id uuid references public.curriculum (id) on delete set null,
  subject text,
  topic text,
  question_data jsonb not null,
  -- Expected shape example:
  -- {
  --   "prompt": "...",
  --   "student_answer": "...",
  --   "correct_answer_latex": "...",
  --   "difficulty": "medium",
  --   "source": "evening_review"
  -- }
  next_review_date timestamptz not null default (now() + interval '1 day'),
  repetition_stage smallint not null default 0 check (repetition_stage between 0 and 10),
  resolved boolean not null default false,
  struggle_score smallint not null default 1 check (struggle_score between 1 and 5),
  times_reviewed integer not null default 0 check (times_reviewed >= 0),
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_mistakes_due
  on public.user_mistakes (user_id, next_review_date)
  where resolved = false;

create index if not exists idx_mistakes_user_resolved
  on public.user_mistakes (user_id, resolved);

-- -----------------------------------------------------------------------------
-- usage_quotas  (supports tier rate-limiting)
-- -----------------------------------------------------------------------------
create table if not exists public.usage_quotas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  period_year integer not null,
  period_month integer not null check (period_month between 1 and 12),
  questions_used integer not null default 0 check (questions_used >= 0),
  minutes_used numeric(8, 2) not null default 0 check (minutes_used >= 0),
  daily_date date not null default (timezone('utc', now())::date),
  daily_minutes_used numeric(8, 2) not null default 0 check (daily_minutes_used >= 0),
  daily_questions_used integer not null default 0 check (daily_questions_used >= 0),
  unique (user_id, period_year, period_month)
);

-- -----------------------------------------------------------------------------
-- parent_report_logs
-- -----------------------------------------------------------------------------
create table if not exists public.parent_report_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users (id) on delete cascade,
  parent_id uuid references public.users (id) on delete set null,
  channel text not null check (channel in ('whatsapp', 'sms')),
  payload jsonb not null,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed')),
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- updated_at trigger
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

drop trigger if exists trg_curriculum_updated_at on public.curriculum;
create trigger trg_curriculum_updated_at
  before update on public.curriculum
  for each row execute function public.set_updated_at();

drop trigger if exists trg_mistakes_updated_at on public.user_mistakes;
create trigger trg_mistakes_updated_at
  before update on public.user_mistakes
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Helper view: due mistakes for spaced repetition pull
-- -----------------------------------------------------------------------------
create or replace view public.v_due_mistakes as
select
  m.*,
  u.grade_level,
  u.tier
from public.user_mistakes m
join public.users u on u.id = m.user_id
where m.resolved = false
  and m.next_review_date <= now();

-- -----------------------------------------------------------------------------
-- Row Level Security (basic policies — refine with auth later)
-- -----------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.curriculum enable row level security;
alter table public.sessions enable row level security;
alter table public.user_mistakes enable row level security;
alter table public.usage_quotas enable row level security;
alter table public.parent_report_logs enable row level security;

-- Curriculum: readable by authenticated users
drop policy if exists curriculum_read_authenticated on public.curriculum;
create policy curriculum_read_authenticated
  on public.curriculum for select
  to authenticated
  using (is_active = true);

-- Users: own profile
drop policy if exists users_select_own on public.users;
create policy users_select_own
  on public.users for select
  to authenticated
  using (auth_id = auth.uid());

drop policy if exists users_update_own on public.users;
create policy users_update_own
  on public.users for update
  to authenticated
  using (auth_id = auth.uid());

-- Sessions / mistakes: owner only (via users.auth_id)
drop policy if exists sessions_owner_all on public.sessions;
create policy sessions_owner_all
  on public.sessions for all
  to authenticated
  using (
    user_id in (select id from public.users where auth_id = auth.uid())
  )
  with check (
    user_id in (select id from public.users where auth_id = auth.uid())
  );

drop policy if exists mistakes_owner_all on public.user_mistakes;
create policy mistakes_owner_all
  on public.user_mistakes for all
  to authenticated
  using (
    user_id in (select id from public.users where auth_id = auth.uid())
  )
  with check (
    user_id in (select id from public.users where auth_id = auth.uid())
  );

drop policy if exists quotas_owner_select on public.usage_quotas;
create policy quotas_owner_select
  on public.usage_quotas for select
  to authenticated
  using (
    user_id in (select id from public.users where auth_id = auth.uid())
  );

-- Service role bypasses RLS for cron / parent reports / AI workers.
