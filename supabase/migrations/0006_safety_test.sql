-- Engineering Portal: the Tool Safety Checkpoint, taken in the app
-- Run after 0005_notifications.sql.
--
-- Teachers and the developer write the test in the app's test editor. The
-- questions and answer key live only in the database, never in the repository
-- (the repository is public). Students see the questions but never the key:
-- the database grades each attempt.
--
--   choice   one correct option (true/false is a choice with two options)
--   written  graded by keyword groups: 1 point for each group that has at
--            least one of its keywords in the answer (case does not matter)
--
-- Passing is 100%. One attempt every 24 hours. After a pass the test is done.
-- Teachers and the developer can mark an attempt as passed after reading it.

create table public.test_sections (
  id uuid primary key default gen_random_uuid(),
  position int not null default 0,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  description text check (char_length(description) <= 1000)
);

create table public.test_questions (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.test_sections (id) on delete cascade,
  position int not null default 0,
  kind text not null check (kind in ('choice', 'written')),
  prompt text not null check (char_length(btrim(prompt)) between 1 and 1000),
  -- Path in the "post-images" bucket, compressed in the browser before upload.
  image_path text,
  -- The options a student picks from (choice questions only).
  options jsonb not null default '[]' check (jsonb_typeof(options) = 'array')
);
create index test_questions_section_idx on public.test_questions (section_id, position);

-- The answer key. Only teachers and the developer can read or change it.
create table public.test_keys (
  question_id uuid primary key references public.test_questions (id) on delete cascade,
  answer text,
  -- [{"label": "Primary use", "keywords": ["drill", "hole"]}, ...]
  keyword_groups jsonb not null default '[]' check (jsonb_typeof(keyword_groups) = 'array'),
  -- What a full answer covers, for the teacher reading attempts.
  rubric text check (char_length(rubric) <= 2000)
);

create table public.test_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  period text not null check (char_length(btrim(period)) between 1 and 20),
  submitted_at timestamptz not null default now(),
  -- {"<question id>": "<answer>"}
  responses jsonb not null,
  -- [{"question_id", "prompt", "kind", "earned", "possible"}], with the prompt
  -- copied so the log still reads right after the test is edited.
  results jsonb not null,
  score int not null,
  possible int not null,
  passed boolean not null,
  passed_by uuid references public.profiles (id) on delete set null,
  passed_by_teacher_at timestamptz
);
create index test_attempts_user_idx on public.test_attempts (user_id, submitted_at desc);

-- Set when a member passes. Everyone can see it (the roster shows a tag);
-- only the functions below write it.
alter table public.profiles add column safety_passed_at timestamptz;

alter table public.test_sections enable row level security;
alter table public.test_questions enable row level security;
alter table public.test_keys enable row level security;
alter table public.test_attempts enable row level security;

create policy "Members see the test sections" on public.test_sections
  for select to authenticated using ((select private.is_member()));
create policy "Teachers and the developer edit test sections" on public.test_sections
  for all to authenticated using ((select private.is_teacher_or_dev())) with check ((select private.is_teacher_or_dev()));

create policy "Members see the test questions" on public.test_questions
  for select to authenticated using ((select private.is_member()));
create policy "Teachers and the developer edit test questions" on public.test_questions
  for all to authenticated using ((select private.is_teacher_or_dev())) with check ((select private.is_teacher_or_dev()));

create policy "Teachers and the developer use the answer key" on public.test_keys
  for all to authenticated using ((select private.is_teacher_or_dev())) with check ((select private.is_teacher_or_dev()));

create policy "Members see their attempts; teachers and the developer see all" on public.test_attempts
  for select to authenticated using (user_id = (select auth.uid()) or (select private.is_teacher_or_dev()));

grant select, insert, update, delete on public.test_sections, public.test_questions, public.test_keys to authenticated;
grant select on public.test_attempts to authenticated;

-------------------------------------------------------------------------------
-- Taking the test
-------------------------------------------------------------------------------

create function public.submit_safety_test(period text, responses jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  last_at timestamptz;
  q record;
  given text;
  grp jsonb;
  earned int;
  q_possible int;
  total int := 0;
  total_possible int := 0;
  results jsonb := '[]'::jsonb;
  attempt public.test_attempts;
begin
  if not private.is_member() then
    raise exception 'Join the class first.' using errcode = '42501';
  end if;
  -- One submission at a time for each member, so the 24-hour rule holds.
  perform pg_advisory_xact_lock(hashtext('safety-test:' || me::text));

  if (select safety_passed_at from public.profiles where id = me) is not null then
    raise exception 'You already passed the test.' using errcode = 'P0001';
  end if;
  select max(submitted_at) into last_at from public.test_attempts where user_id = me;
  if last_at > now() - interval '24 hours' then
    raise exception 'You can take the test again 24 hours after your last attempt.' using errcode = 'P0001';
  end if;
  if char_length(btrim(coalesce(period, ''))) not between 1 and 20 then
    raise exception 'Enter your class period.' using errcode = '22023';
  end if;
  if jsonb_typeof(responses) is distinct from 'object' or octet_length(responses::text) > 200000 then
    raise exception 'Those answers could not be read.' using errcode = '22023';
  end if;

  for q in
    select tq.id, tq.kind, tq.prompt, tk.answer, coalesce(tk.keyword_groups, '[]'::jsonb) as keyword_groups
    from public.test_questions tq
    join public.test_sections ts on ts.id = tq.section_id
    left join public.test_keys tk on tk.question_id = tq.id
    order by ts.position, tq.position
  loop
    given := responses ->> q.id::text;
    if q.kind = 'choice' then
      q_possible := 1;
      earned := case when given is not null and given = q.answer then 1 else 0 end;
    else
      q_possible := jsonb_array_length(q.keyword_groups);
      earned := 0;
      for grp in select value from jsonb_array_elements(q.keyword_groups) loop
        if exists (
          select 1 from jsonb_array_elements_text(coalesce(grp -> 'keywords', '[]'::jsonb)) as k(word)
          where btrim(k.word) <> '' and strpos(lower(coalesce(given, '')), lower(btrim(k.word))) > 0
        ) then
          earned := earned + 1;
        end if;
      end loop;
    end if;
    total := total + earned;
    total_possible := total_possible + q_possible;
    results := results || jsonb_build_array(jsonb_build_object(
      'question_id', q.id, 'prompt', q.prompt, 'kind', q.kind, 'earned', earned, 'possible', q_possible));
  end loop;

  if total_possible = 0 then
    raise exception 'The test is not set up yet.' using errcode = 'P0001';
  end if;

  insert into public.test_attempts (user_id, period, responses, results, score, possible, passed)
  values (me, btrim(period), responses, results, total, total_possible, total = total_possible)
  returning * into attempt;

  if attempt.passed then
    update public.profiles set safety_passed_at = attempt.submitted_at where id = me;
  end if;

  return to_jsonb(attempt);
end;
$$;

-- A teacher or the developer marks an attempt as passed, for example when a
-- written answer was right but used different words than the keywords.
create function public.pass_safety_attempt(attempt uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  member uuid;
begin
  if not private.is_teacher_or_dev() then
    raise exception 'Only teachers and the developer can do this.' using errcode = '42501';
  end if;
  update public.test_attempts
    set passed = true, passed_by = auth.uid(), passed_by_teacher_at = now()
    where id = attempt and not passed
    returning user_id into member;
  if member is null then
    raise exception 'That attempt does not exist or already passed.' using errcode = 'P0002';
  end if;
  update public.profiles set safety_passed_at = coalesce(safety_passed_at, now()) where id = member;
end;
$$;

-------------------------------------------------------------------------------
-- Importing a whole test (the test editor's Import button)
-------------------------------------------------------------------------------

-- Replaces every section, question, and key in one step, so a failed import
-- leaves the old test as it was. Photos are uploaded by the app first; the
-- file passed here holds their storage paths. Past attempts are kept.
create function public.replace_safety_test(sections jsonb) returns int
language plpgsql security definer set search_path = '' as $$
declare
  s jsonb;
  q jsonb;
  section_pos int := 0;
  question_pos int;
  new_section uuid;
  new_question uuid;
  total int := 0;
begin
  if not private.is_teacher_or_dev() then
    raise exception 'Only teachers and the developer can do this.' using errcode = '42501';
  end if;
  if jsonb_typeof(sections) is distinct from 'array' then
    raise exception 'The test file could not be read.' using errcode = '22023';
  end if;

  delete from public.test_sections where id is not null;

  for s in select value from jsonb_array_elements(sections) loop
    insert into public.test_sections (position, title, description)
    values (section_pos, s ->> 'title', nullif(s ->> 'description', ''))
    returning id into new_section;
    section_pos := section_pos + 1;
    question_pos := 0;

    for q in select value from jsonb_array_elements(coalesce(s -> 'questions', '[]'::jsonb)) loop
      insert into public.test_questions (section_id, position, kind, prompt, image_path, options)
      values (new_section, question_pos, q ->> 'kind', q ->> 'prompt', nullif(q ->> 'image_path', ''),
              case when q ->> 'kind' = 'choice' then coalesce(q -> 'options', '[]'::jsonb) else '[]'::jsonb end)
      returning id into new_question;
      insert into public.test_keys (question_id, answer, keyword_groups, rubric)
      values (new_question,
              case when q ->> 'kind' = 'choice' then q ->> 'answer' end,
              case when q ->> 'kind' = 'written' then coalesce(q -> 'keyword_groups', '[]'::jsonb) else '[]'::jsonb end,
              nullif(q ->> 'rubric', ''));
      question_pos := question_pos + 1;
      total := total + 1;
    end loop;
  end loop;
  return total;
end;
$$;

revoke execute on function public.submit_safety_test(text, jsonb), public.pass_safety_attempt(uuid), public.replace_safety_test(jsonb) from public, anon;
grant execute on function public.submit_safety_test(text, jsonb), public.pass_safety_attempt(uuid), public.replace_safety_test(jsonb) to authenticated;
