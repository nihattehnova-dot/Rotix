-- Demo kullanıcı (header auth / yerel test)
-- X-User-Id: 00000000-0000-0000-0000-000000000001

insert into public.users (
  id, full_name, phone, grade_level, role, tier,
  streak_count, total_points, locale,
  subscription_status, trial_started_at, trial_ends_at, exam_track
) values (
  '00000000-0000-0000-0000-000000000001',
  'Elif Demo',
  '+905551112233',
  5,
  'student',
  'basic',
  3,
  120,
  'tr-TR',
  'trialing',
  now(),
  now() + interval '7 days',
  'school'
)
on conflict (id) do nothing;

insert into public.users (
  id, full_name, phone, role, tier,
  subscription_status, trial_started_at, trial_ends_at
) values (
  '00000000-0000-0000-0000-000000000099',
  'Veli Demo',
  '+905559998877',
  'parent',
  'basic',
  'active',
  now(),
  now() + interval '365 days'
)
on conflict (id) do nothing;

update public.users
set parent_user_id = '00000000-0000-0000-0000-000000000099'
where id = '00000000-0000-0000-0000-000000000001'
  and parent_user_id is null;
