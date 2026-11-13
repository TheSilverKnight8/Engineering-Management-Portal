-- Engineering Portal: safety test appeals and private notices
-- Run after 0010_chat_attachments.sql.
--
-- A student can appeal questions they missed on their latest attempt that did
-- not pass, until they take the test again: one appeal per attempt, with a
-- reason for each question. Teachers and the developer accept or deny each
-- question; accepting gives the question full points (the score and the pass
-- update as for any teacher change), and they can add a reply.
--
-- Private notices reach one person each (the alert bell counts them with
-- announcements): teachers and the developer get one for each new appeal, and
-- the student gets one when their appeal is decided.

-------------------------------------------------------------------------------
-- Private notices
-------------------------------------------------------------------------------

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('appeal_new', 'appeal_decided')),
  title text not null check (char_length(title) between 1 and 200),
  body text check (char_length(body) <= 2000),
  -- A path in the app, such as /learn/safety/log.
  link text check (link ~ '^/'),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "Members see their own notices" on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));

-- Notices are written only by the functions below.
grant select on public.notifications to authenticated;

alter publication supabase_realtime add table public.notifications;

create function public.mark_notifications_read() returns void
language sql security definer set search_path = '' as $$
  update public.notifications set read_at = now()
  where user_id = (select auth.uid()) and read_at is null;
$$;

-------------------------------------------------------------------------------
-- Appeals
-------------------------------------------------------------------------------

create table public.test_appeals (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null unique references public.test_attempts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- [{"question_id", "prompt", "reason", "decision": null | "accepted" | "denied"}]
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 100),
  status text not null default 'open' check (status in ('open', 'decided')),
  reply text check (char_length(reply) <= 2000),
  created_at timestamptz not null default now(),
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz
);
create index test_appeals_open_idx on public.test_appeals (created_at) where status = 'open';

alter table public.test_appeals enable row level security;

create policy "Students see their appeals; teachers and the developer see all" on public.test_appeals
  for select to authenticated using (user_id = (select auth.uid()) or (select private.is_teacher_or_dev()));

grant select on public.test_appeals to authenticated;

create function public.submit_test_appeal(attempt uuid, items jsonb) returns public.test_appeals
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  a public.test_attempts;
  item jsonb;
  missed jsonb;
  clean jsonb := '[]'::jsonb;
  reason text;
  result public.test_appeals;
begin
  if not private.is_member() then
    raise exception 'Join the class first.' using errcode = '42501';
  end if;
  select * into a from public.test_attempts where id = attempt;
  if a.id is null or a.user_id <> me then
    raise exception 'That attempt is not yours.' using errcode = 'P0002';
  end if;
  if a.passed then
    raise exception 'That attempt passed, so there is nothing to appeal.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.test_attempts t where t.user_id = me and t.submitted_at > a.submitted_at) then
    raise exception 'You can only appeal your latest attempt.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.test_appeals ap where ap.attempt_id = attempt) then
    raise exception 'You already appealed this attempt.' using errcode = 'P0001';
  end if;
  if jsonb_typeof(items) is distinct from 'array' or jsonb_array_length(items) = 0 then
    raise exception 'Choose at least one question to appeal.' using errcode = '22023';
  end if;

  for item in select value from jsonb_array_elements(items) loop
    select r into missed from jsonb_array_elements(a.results) r
      where r ->> 'question_id' = item ->> 'question_id' and (r ->> 'earned')::int < (r ->> 'possible')::int;
    if missed is null then
      raise exception 'You can only appeal questions you missed on that attempt.' using errcode = '22023';
    end if;
    if clean @> jsonb_build_array(jsonb_build_object('question_id', missed ->> 'question_id')) then
      raise exception 'A question is in the appeal twice.' using errcode = '22023';
    end if;
    reason := btrim(coalesce(item ->> 'reason', ''));
    if char_length(reason) not between 1 and 1000 then
      raise exception 'Give a reason for each question (up to 1000 characters).' using errcode = '22023';
    end if;
    clean := clean || jsonb_build_array(jsonb_build_object(
      'question_id', missed ->> 'question_id', 'prompt', missed ->> 'prompt', 'reason', reason, 'decision', null));
  end loop;

  insert into public.test_appeals (attempt_id, user_id, items) values (attempt, me, clean)
  returning * into result;

  insert into public.notifications (user_id, kind, title, body, link)
  select p.id, 'appeal_new',
         private.current_name() || ' appealed ' || jsonb_array_length(clean) ||
           case when jsonb_array_length(clean) = 1 then ' safety test question' else ' safety test questions' end,
         null, '/learn/safety/log'
  from public.profiles p
  where p.role = 'teacher' or p.is_dev;

  return result;
end;
$$;

-- decisions: {"<question id>": "accepted" | "denied"} for every question in the appeal.
create function public.decide_test_appeal(appeal uuid, decisions jsonb, reply text) returns public.test_appeals
language plpgsql security definer set search_path = '' as $$
declare
  ap public.test_appeals;
  a public.test_attempts;
  item jsonb;
  decision text;
  decided jsonb := '[]'::jsonb;
  accepted int := 0;
  full_points int;
begin
  if not private.is_teacher_or_dev() then
    raise exception 'Only teachers and the developer can do this.' using errcode = '42501';
  end if;
  select * into ap from public.test_appeals where id = appeal for update;
  if ap.id is null then
    raise exception 'That appeal does not exist.' using errcode = 'P0002';
  end if;
  if ap.status <> 'open' then
    raise exception 'That appeal was already decided.' using errcode = 'P0001';
  end if;
  select * into a from public.test_attempts where id = ap.attempt_id;

  for item in select value from jsonb_array_elements(ap.items) loop
    decision := decisions ->> (item ->> 'question_id');
    if decision is null or decision not in ('accepted', 'denied') then
      raise exception 'Accept or deny every question in the appeal.' using errcode = '22023';
    end if;
    if decision = 'accepted' then
      select (r ->> 'possible')::int into full_points from jsonb_array_elements(a.results) r
        where r ->> 'question_id' = item ->> 'question_id';
      perform public.set_attempt_points(ap.attempt_id, (item ->> 'question_id')::uuid, full_points);
      accepted := accepted + 1;
    end if;
    decided := decided || jsonb_build_array(item || jsonb_build_object('decision', decision));
  end loop;

  update public.test_appeals
    set items = decided, status = 'decided', reply = nullif(btrim(coalesce(decide_test_appeal.reply, '')), ''),
        decided_by = auth.uid(), decided_at = now()
    where id = appeal
    returning * into ap;

  insert into public.notifications (user_id, kind, title, body, link)
  values (ap.user_id, 'appeal_decided', 'Your safety test appeal was decided',
          accepted || ' of ' || jsonb_array_length(decided) ||
            case when jsonb_array_length(decided) = 1 then ' question' else ' questions' end || ' accepted.' ||
            coalesce(' ' || ap.reply, ''),
          '/learn/safety/test');

  return ap;
end;
$$;

revoke execute on function public.mark_notifications_read(), public.submit_test_appeal(uuid, jsonb), public.decide_test_appeal(uuid, jsonb, text) from public, anon;
grant execute on function public.mark_notifications_read(), public.submit_test_appeal(uuid, jsonb), public.decide_test_appeal(uuid, jsonb, text) to authenticated;
