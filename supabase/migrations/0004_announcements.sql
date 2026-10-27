-- Engineering Portal: announcements
-- Run after 0003_keepalive_where.sql.
--
-- Teachers and the developer post announcements (title, text, link, photos).
-- The database also posts one each time a person joins the class.
-- Moderators remove and restore announcements the same way as posts.
-- Photos go in the same "post-images" bucket as posts, compressed in the browser.

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles (id) on delete set null default auth.uid(),
  -- Set only on the automatic "joined" announcements. The app shows the
  -- member's current name, and the announcement goes away if the member is removed.
  joined_id uuid references public.profiles (id) on delete cascade,
  title text check (char_length(btrim(title)) between 1 and 140),
  body text check (char_length(body) <= 5000),
  link_url text check (link_url ~* '^https?://' and char_length(link_url) <= 1000),
  image_paths text[] not null default '{}' check (cardinality(image_paths) <= 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  removed_at timestamptz,
  removed_by uuid references public.profiles (id) on delete set null,
  constraint announcements_title_or_joined check (title is not null or joined_id is not null)
);
create index announcements_created_idx on public.announcements (created_at desc);

create trigger announcements_touch before update of title, body, link_url, image_paths on public.announcements
  for each row execute function private.touch_post();

alter table public.announcements enable row level security;

create policy "Members see announcements" on public.announcements
  for select to authenticated using (
    (select private.is_member())
    and (removed_at is null or author_id = (select auth.uid()) or (select private.is_moderator()))
  );
create policy "Teachers and the developer post announcements" on public.announcements
  for insert to authenticated with check ((select private.is_teacher_or_dev()) and author_id = (select auth.uid()));
create policy "Authors delete their announcements" on public.announcements
  for delete to authenticated using (author_id = (select auth.uid()));

-- joined_id is not in the insert grant, so only the trigger below can set it.
grant select, delete on public.announcements to authenticated;
grant insert (title, body, link_url, image_paths) on public.announcements to authenticated;

-- One announcement for each person who joins the class.
create function private.announce_join() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.announcements (author_id, joined_id) values (null, new.id);
  return new;
end;
$$;

create trigger profiles_announce_join after insert on public.profiles
  for each row execute function private.announce_join();

-------------------------------------------------------------------------------
-- Reports and moderation also cover announcements
-------------------------------------------------------------------------------

alter table public.reports drop constraint reports_target_type_check;
alter table public.reports add constraint reports_target_type_check
  check (target_type in ('post', 'message', 'announcement'));

create or replace function public.report_content(target_type text, target_id uuid, reason text) returns public.reports
language plpgsql security definer set search_path = '' as $$
declare
  snap jsonb;
  result public.reports;
begin
  if not private.is_member() then
    raise exception 'Join the class first.' using errcode = '42501';
  end if;

  if target_type = 'post' then
    select jsonb_build_object('title', p.title, 'body', p.body, 'link_url', p.link_url,
                              'author_id', p.author_id, 'author_name', pr.full_name)
      into snap
      from public.posts p left join public.profiles pr on pr.id = p.author_id
      where p.id = target_id and p.removed_at is null;
  elsif target_type = 'message' then
    -- People can only report messages in channels they can read.
    select jsonb_build_object('body', m.body, 'group_id', m.group_id, 'group_name', g.name,
                              'author_id', m.author_id, 'author_name', pr.full_name)
      into snap
      from public.messages m
      join public.groups g on g.id = m.group_id
      left join public.profiles pr on pr.id = m.author_id
      where m.id = target_id and m.removed_at is null
        and (private.is_group_member(m.group_id) or private.is_moderator());
  elsif target_type = 'announcement' then
    select jsonb_build_object('title', coalesce(a.title, j.full_name || ' joined the portal'), 'body', a.body,
                              'link_url', a.link_url, 'author_id', a.author_id,
                              'author_name', coalesce(pr.full_name, 'Automatic announcement'))
      into snap
      from public.announcements a
      left join public.profiles pr on pr.id = a.author_id
      left join public.profiles j on j.id = a.joined_id
      where a.id = target_id and a.removed_at is null;
  else
    raise exception 'Unknown report type.' using errcode = '22023';
  end if;

  if snap is null then
    raise exception 'That item does not exist.' using errcode = 'P0002';
  end if;

  insert into public.reports (target_type, target_id, reason, snapshot)
  values (target_type, target_id, nullif(btrim(reason), ''), snap)
  returning * into result;
  return result;
end;
$$;

create or replace function public.moderate_content(target_type text, target_id uuid, remove boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_moderator() then
    raise exception 'Only moderators can do this.' using errcode = '42501';
  end if;

  if target_type = 'post' then
    update public.posts
      set removed_at = case when remove then now() end,
          removed_by = case when remove then auth.uid() end
      where id = target_id;
  elsif target_type = 'message' then
    update public.messages
      set removed_at = case when remove then now() end,
          removed_by = case when remove then auth.uid() end
      where id = target_id;
  elsif target_type = 'announcement' then
    update public.announcements
      set removed_at = case when remove then now() end,
          removed_by = case when remove then auth.uid() end
      where id = target_id;
  else
    raise exception 'Unknown content type.' using errcode = '22023';
  end if;

  if remove then
    update public.reports
      set resolved_at = now(), resolved_by = auth.uid(), resolution = 'removed'
      where reports.target_type = moderate_content.target_type
        and reports.target_id = moderate_content.target_id
        and resolved_at is null;
  end if;
end;
$$;
