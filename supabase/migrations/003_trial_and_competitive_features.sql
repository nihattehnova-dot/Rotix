-- =============================================================================
-- 003 — Trial, goals, study plans, topic mastery, check-ins, photo questions
-- Competitive parity (Kunduz / Khanmigo / Doping) at low cost
-- =============================================================================

do $$ begin
  create type subscription_status as enum (
    'trialing',
    'active',
    'expired',
    'cancelled',
    'past_due'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type exam_track as enum (
    'none',
    'school',
    'lgs',
    'tyt',
    'ayt',
    'yks'
  );
exception when duplicate_object then null; end $$;

-- Trial + access gate
alter table public.users
  add column if not exists subscription_status subscription_status
    not null default 'trialing';

alter table public.users
  add column if not exists trial_started_at timestamptz;

alter table public.users
  add column if not exists trial_ends_at timestamptz;

alter table public.users
  add column if not exists exam_track exam_track not null default 'school';

alter table public.users
  add column if not exists target_exam_date date;

-- Backfill: existing rows get 7-day trial from created_at if null
update public.users
set
  trial_started_at = coalesce(trial_started_at, created_at, now()),
  trial_ends_at = coalesce(
    trial_ends_at,
    coalesce(trial_started_at, created_at, now()) + interval '7 days'
  )
where trial_ends_at is null;

-- -----------------------------------------------------------------------------
-- learning_goals — hedef okul / net / sınav (motivasyon + plan girdisi)
-- -----------------------------------------------------------------------------
create table if not exists public.learning_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  exam_track exam_track not null default 'school',
  target_score numeric(6, 2),
  target_date date,
  notes text,
  is_primary boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_goals_user on public.learning_goals (user_id);

-- -----------------------------------------------------------------------------
-- study_plans — günlük / haftalık kişisel program (Doping/Kunduz koç denkliği)
-- -----------------------------------------------------------------------------
create table if not exists public.study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  plan_date date not null,
  items jsonb not null default '[]'::jsonb,
  -- items: [{ "subject", "topic", "minutes", "source": "mistake|curriculum|micro_test", "done": false }]
  generated_by text not null default 'rules'
    check (generated_by in ('rules', 'llm', 'manual')),
  completed_count integer not null default 0,
  total_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, plan_date)
);

create index if not exists idx_study_plans_user_date
  on public.study_plans (user_id, plan_date desc);

-- -----------------------------------------------------------------------------
-- topic_mastery — konu bazlı güç/zayıf haritası
-- -----------------------------------------------------------------------------
create table if not exists public.topic_mastery (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  subject text not null,
  topic text not null,
  mastery_score numeric(5, 2) not null default 0
    check (mastery_score between 0 and 100),
  attempts integer not null default 0,
  correct_count integer not null default 0,
  last_practiced_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, subject, topic)
);

create index if not exists idx_mastery_user_score
  on public.topic_mastery (user_id, mastery_score);

-- -----------------------------------------------------------------------------
-- daily_checkins — akşam yoklaması + motivasyon streak
-- -----------------------------------------------------------------------------
create table if not exists public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  checkin_date date not null default (timezone('utc', now())::date),
  had_new_school_topic boolean,
  mood smallint check (mood is null or mood between 1 and 5),
  energy smallint check (energy is null or energy between 1 and 5),
  note text,
  motivation_card text,
  created_at timestamptz not null default now(),
  unique (user_id, checkin_date)
);

-- -----------------------------------------------------------------------------
-- micro_quizzes — anlatım sonrası kısa test (Doping mikro test)
-- -----------------------------------------------------------------------------
create table if not exists public.micro_quizzes (
  id uuid primary key default gen_random_uuid(),
  curriculum_id uuid not null references public.curriculum (id) on delete cascade,
  questions jsonb not null default '[]'::jsonb,
  -- [{ "prompt", "choices": [], "correct_index", "hint_latex" }]
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.micro_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  quiz_id uuid not null references public.micro_quizzes (id) on delete cascade,
  session_id uuid references public.sessions (id) on delete set null,
  answers jsonb not null default '[]'::jsonb,
  score numeric(5, 2) not null default 0,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- photo_questions — Kunduz tarzı çek-gönder (AI Vision → Sokratik)
-- -----------------------------------------------------------------------------
create table if not exists public.photo_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  session_id uuid references public.sessions (id) on delete set null,
  image_url text,
  extracted_text text,
  subject text,
  socratic_payload jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'processed', 'failed')),
  created_at timestamptz not null default now()
);

create index if not exists idx_photo_q_user
  on public.photo_questions (user_id, created_at desc);

-- Triggers
drop trigger if exists trg_goals_updated_at on public.learning_goals;
create trigger trg_goals_updated_at
  before update on public.learning_goals
  for each row execute function public.set_updated_at();

drop trigger if exists trg_study_plans_updated_at on public.study_plans;
create trigger trg_study_plans_updated_at
  before update on public.study_plans
  for each row execute function public.set_updated_at();

drop trigger if exists trg_mastery_updated_at on public.topic_mastery;
create trigger trg_mastery_updated_at
  before update on public.topic_mastery
  for each row execute function public.set_updated_at();

-- RLS
alter table public.learning_goals enable row level security;
alter table public.study_plans enable row level security;
alter table public.topic_mastery enable row level security;
alter table public.daily_checkins enable row level security;
alter table public.micro_quizzes enable row level security;
alter table public.micro_quiz_attempts enable row level security;
alter table public.photo_questions enable row level security;

drop policy if exists goals_owner on public.learning_goals;
create policy goals_owner on public.learning_goals for all to authenticated
  using (user_id in (select id from public.users where auth_id = auth.uid()))
  with check (user_id in (select id from public.users where auth_id = auth.uid()));

drop policy if exists plans_owner on public.study_plans;
create policy plans_owner on public.study_plans for all to authenticated
  using (user_id in (select id from public.users where auth_id = auth.uid()))
  with check (user_id in (select id from public.users where auth_id = auth.uid()));

drop policy if exists mastery_owner on public.topic_mastery;
create policy mastery_owner on public.topic_mastery for all to authenticated
  using (user_id in (select id from public.users where auth_id = auth.uid()))
  with check (user_id in (select id from public.users where auth_id = auth.uid()));

drop policy if exists checkins_owner on public.daily_checkins;
create policy checkins_owner on public.daily_checkins for all to authenticated
  using (user_id in (select id from public.users where auth_id = auth.uid()))
  with check (user_id in (select id from public.users where auth_id = auth.uid()));

drop policy if exists micro_quiz_read on public.micro_quizzes;
create policy micro_quiz_read on public.micro_quizzes for select to authenticated
  using (is_active = true);

drop policy if exists micro_attempts_owner on public.micro_quiz_attempts;
create policy micro_attempts_owner on public.micro_quiz_attempts for all to authenticated
  using (user_id in (select id from public.users where auth_id = auth.uid()))
  with check (user_id in (select id from public.users where auth_id = auth.uid()));

drop policy if exists photo_q_owner on public.photo_questions;
create policy photo_q_owner on public.photo_questions for all to authenticated
  using (user_id in (select id from public.users where auth_id = auth.uid()))
  with check (user_id in (select id from public.users where auth_id = auth.uid()));
