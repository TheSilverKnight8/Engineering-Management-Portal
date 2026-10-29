-- Engineering Portal: teachers adjust the points on single test questions
-- Run after 0006_safety_test.sql.
--
-- Keyword scoring can miss a written answer that is right in other words (or
-- give points to one that is not). Teachers and the developer can set the
-- points for any question in an attempt. The attempt's score is recomputed:
-- at 100% it passes; below 100% it does not, unless a teacher marked the
-- whole attempt as passed. The automatic points are kept as auto_earned in
-- the attempt's results, and the attempt records who adjusted it last.

alter table public.test_attempts
  add column adjusted_by uuid references public.profiles (id) on delete set null,
  add column adjusted_at timestamptz;

create function public.set_attempt_points(attempt uuid, question uuid, points int) returns public.test_attempts
language plpgsql security definer set search_path = '' as $$
declare
  a public.test_attempts;
  in_range boolean;
  new_results jsonb;
  new_score int;
begin
  if not private.is_teacher_or_dev() then
    raise exception 'Only teachers and the developer can do this.' using errcode = '42501';
  end if;

  select * into a from public.test_attempts where id = attempt for update;
  if a.id is null then
    raise exception 'That attempt does not exist.' using errcode = 'P0002';
  end if;

  select exists (
    select 1 from jsonb_array_elements(a.results) r
    where r ->> 'question_id' = question::text and points between 0 and (r ->> 'possible')::int
  ) into in_range;
  if not in_range then
    raise exception 'Points must be between 0 and the most the question is worth.' using errcode = '22023';
  end if;

  select jsonb_agg(
           case when r ->> 'question_id' = question::text
             then r || jsonb_build_object('earned', points, 'auto_earned', coalesce(r -> 'auto_earned', r -> 'earned'))
             else r end
           order by ord)
    into new_results
    from jsonb_array_elements(a.results) with ordinality as t(r, ord);
  select sum((r ->> 'earned')::int) into new_score from jsonb_array_elements(new_results) r;

  update public.test_attempts
    set results = new_results,
        score = new_score,
        passed = (new_score = possible) or passed_by is not null,
        adjusted_by = auth.uid(),
        adjusted_at = now()
    where id = attempt
    returning * into a;

  -- Keep the roster's "Safety passed" in step with the member's attempts.
  if a.passed then
    update public.profiles set safety_passed_at = coalesce(safety_passed_at, now()) where id = a.user_id;
  elsif not exists (select 1 from public.test_attempts where user_id = a.user_id and passed) then
    update public.profiles set safety_passed_at = null where id = a.user_id;
  end if;

  return a;
end;
$$;

revoke execute on function public.set_attempt_points(uuid, uuid, int) from public, anon;
grant execute on function public.set_attempt_points(uuid, uuid, int) to authenticated;
