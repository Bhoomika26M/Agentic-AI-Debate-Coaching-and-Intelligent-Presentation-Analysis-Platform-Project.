alter table public.profiles
  add column app_settings jsonb not null default '{"adaptiveTactics":true,"usePracticeHistory":true,"replyLength":"standard"}'::jsonb
  check (jsonb_typeof(app_settings) = 'object');
