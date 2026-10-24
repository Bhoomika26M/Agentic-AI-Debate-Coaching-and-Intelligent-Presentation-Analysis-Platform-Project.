alter table public.debate_turns
  add column kind text not null default 'standard'
    check (kind in ('standard', 'challenge')),
  add column challenge_depth smallint
    check (challenge_depth between 1 and 2),
  add column challenge_target text
    check (char_length(challenge_target) between 1 and 400);

-- A follow-up is only meaningful on an opponent turn with a depth and target.
alter table public.debate_turns
  add constraint debate_turns_challenge_shape
  check (
    (kind = 'standard' and challenge_depth is null and challenge_target is null)
    or (kind = 'challenge' and challenge_depth is not null)
  );
