-- Engineering Portal: core schema
-- Run once in the Supabase SQL editor (or with `supabase db push`).
-- Everything here fits inside the Supabase Free plan.

create extension if not exists btree_gist with schema extensions;

-- Functions that the app does not call directly live in a schema that the
-- Data API does not expose.
create schema if not exists private;

-------------------------------------------------------------------------------
-- Class membership
-------------------------------------------------------------------------------

create type public.member_role as enum ('student', 'teacher');

-- A profile exists only after a person enters the class join code.
-- Having a profile is what "being in the class" means everywhere below.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(btrim(full_name)) between 2 and 80),
  role public.member_role not null default 'student',
  is_mod boolean not null default false,
  is_dev boolean not null default false,
  created_at timestamptz not null default now()
);

-- One row. The join code is generated here so it never sits in the repo.
create table public.class_settings (
  id boolean primary key default true check (id),
  join_code text not null check (join_code ~ '^[A-Z0-9]{4,12}$'),
  updated_at timestamptz not null default now()
);
insert into public.class_settings (join_code)
values (upper(substr(md5(gen_random_uuid()::text), 1, 6)));

create function private.is_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()));
$$;

-- Teachers, mod students, and the developer.
create function private.is_moderator() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and (role = 'teacher' or is_mod or is_dev)
  );
$$;

create function private.is_dev() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and is_dev);
$$;

create function private.is_teacher_or_dev() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and (role = 'teacher' or is_dev)
  );
$$;

create function private.current_name() returns text
language sql stable security definer set search_path = '' as $$
  select full_name from public.profiles where id = (select auth.uid());
$$;

grant usage on schema private to authenticated;
grant execute on all functions in schema private to authenticated;

alter table public.profiles enable row level security;
alter table public.class_settings enable row level security;

create policy "Members see the class roster" on public.profiles
  for select to authenticated using ((select private.is_member()));
create policy "People update their own name" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "Teachers and the developer see the join code" on public.class_settings
  for select to authenticated using ((select private.is_teacher_or_dev()));
create policy "Teachers and the developer change the join code" on public.class_settings
  for update to authenticated using ((select private.is_teacher_or_dev()));

grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;
grant select on public.class_settings to authenticated;
grant update (join_code, updated_at) on public.class_settings to authenticated;

-- Enter the class with the join code. Safe to call again: it returns the
-- existing profile if the person already joined.
create function public.join_class(code text, name text) returns public.profiles
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  result public.profiles;
begin
  if me is null then
    raise exception 'Sign in first.' using errcode = '28000';
  end if;

  select * into result from public.profiles where id = me;
  if found then
    return result;
  end if;

  if upper(btrim(code)) is distinct from (select join_code from public.class_settings) then
    raise exception 'That join code is not correct.' using errcode = 'P0001';
  end if;

  insert into public.profiles (id, full_name) values (me, btrim(name)) returning * into result;
  return result;
end;
$$;

-- Developer only: change someone's role and mod status.
create function public.set_member_access(target uuid, new_role public.member_role, new_is_mod boolean)
returns public.profiles
language plpgsql security definer set search_path = '' as $$
declare
  result public.profiles;
begin
  if not private.is_dev() then
    raise exception 'Only the developer can change roles.' using errcode = '42501';
  end if;
  update public.profiles set role = new_role, is_mod = new_is_mod where id = target returning * into result;
  return result;
end;
$$;

-- Developer only: take someone out of the class. Their sign-in still exists,
-- but they must enter the join code again to get back in.
create function public.remove_member(target uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_dev() then
    raise exception 'Only the developer can remove members.' using errcode = '42501';
  end if;
  if target = auth.uid() then
    raise exception 'You cannot remove yourself.' using errcode = 'P0001';
  end if;
  delete from public.profiles where id = target;
end;
$$;

-------------------------------------------------------------------------------
-- Shop inventory, checkouts, and changelog
-------------------------------------------------------------------------------

create type public.tool_status as enum ('operational', 'needs_maintenance');

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  -- Links a physical tool to its entry in the app's tool library (src/content/tools.ts).
  tool_slug text,
  location text check (char_length(location) <= 80),
  status public.tool_status not null default 'operational',
  status_note text check (char_length(status_note) <= 500),
  notes text check (char_length(notes) <= 1000),
  archived_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);
create index inventory_items_tool_slug_idx on public.inventory_items (tool_slug);

create table public.checkouts (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.inventory_items (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  -- Who or what has the tool: a person, a class period, a team. Free text on purpose.
  borrower text not null check (char_length(btrim(borrower)) between 1 and 80),
  note text check (char_length(note) <= 500),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  returned_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  constraint checkouts_window_valid check (ends_at > starts_at),
  -- The database itself refuses a second checkout of the same tool in an
  -- overlapping window. '[)' means one window can start the moment another ends.
  constraint checkouts_no_overlap exclude using gist (
    item_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (canceled_at is null)
);
create index checkouts_item_window_idx on public.checkouts (item_id, ends_at);
create index checkouts_user_idx on public.checkouts (user_id, ends_at);

create table public.inventory_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor_id uuid references public.profiles (id) on delete set null,
  actor_name text,
  item_id uuid references public.inventory_items (id) on delete set null,
  item_name text,
  checkout_id uuid,
  action text not null,
  changes jsonb
);
create index inventory_log_at_idx on public.inventory_log (at desc);
create index inventory_log_item_idx on public.inventory_log (item_id, at desc);

create function private.touch_inventory_item() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

create trigger inventory_items_touch before update on public.inventory_items
  for each row execute function private.touch_inventory_item();

-- Returns {"field": {"from": old, "to": new}} for each listed field that changed.
create function private.diff_fields(old_row jsonb, new_row jsonb, fields text[]) returns jsonb
language sql immutable set search_path = '' as $$
  select coalesce(
    jsonb_object_agg(f, jsonb_build_object('from', old_row -> f, 'to', new_row -> f)),
    '{}'::jsonb
  )
  from unnest(fields) as f
  where (old_row -> f) is distinct from (new_row -> f);
$$;

create function private.log_inventory_item() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  fields text[] := array['name', 'tool_slug', 'location', 'status', 'status_note', 'notes'];
  act text;
  diff jsonb;
begin
  if tg_op = 'INSERT' then
    act := 'item.created';
    diff := private.diff_fields('{}'::jsonb, jsonb_strip_nulls(to_jsonb(new)), fields);
  else
    diff := private.diff_fields(to_jsonb(old), to_jsonb(new), fields);
    if old.archived_at is null and new.archived_at is not null then
      act := 'item.archived';
    elsif old.archived_at is not null and new.archived_at is null then
      act := 'item.restored';
    elsif diff = '{}'::jsonb then
      return new;
    else
      act := 'item.updated';
    end if;
  end if;

  insert into public.inventory_log (actor_id, actor_name, item_id, item_name, action, changes)
  values (auth.uid(), private.current_name(), new.id, new.name, act, nullif(diff, '{}'::jsonb));
  return new;
end;
$$;

create trigger inventory_items_log after insert or update on public.inventory_items
  for each row execute function private.log_inventory_item();

create function private.log_checkout() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  fields text[] := array['borrower', 'note', 'starts_at', 'ends_at'];
  act text;
  diff jsonb;
begin
  if tg_op = 'INSERT' then
    act := 'checkout.created';
    diff := private.diff_fields('{}'::jsonb, jsonb_strip_nulls(to_jsonb(new)), fields);
  else
    diff := private.diff_fields(to_jsonb(old), to_jsonb(new), fields);
    if old.canceled_at is null and new.canceled_at is not null then
      act := 'checkout.canceled';
    elsif old.returned_at is null and new.returned_at is not null then
      act := 'checkout.returned';
    elsif diff = '{}'::jsonb then
      return new;
    else
      act := 'checkout.updated';
    end if;
  end if;

  insert into public.inventory_log (actor_id, actor_name, item_id, item_name, checkout_id, action, changes)
  values (
    auth.uid(), private.current_name(), new.item_id,
    (select name from public.inventory_items where id = new.item_id),
    new.id, act, nullif(diff, '{}'::jsonb)
  );
  return new;
end;
$$;

create trigger checkouts_log after insert or update on public.checkouts
  for each row execute function private.log_checkout();

create function private.refuse_archived_checkout() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.inventory_items where id = new.item_id and archived_at is not null) then
    raise exception 'This tool is archived. Restore it before you check it out.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger checkouts_refuse_archived before insert on public.checkouts
  for each row execute function private.refuse_archived_checkout();

-- End a checkout now. Before it starts, this cancels it; after it starts,
-- this marks it returned and frees the rest of the window.
create function public.end_checkout(checkout uuid) returns public.checkouts
language plpgsql security definer set search_path = '' as $$
declare
  c public.checkouts;
begin
  if not private.is_member() then
    raise exception 'Join the class first.' using errcode = '42501';
  end if;

  select * into c from public.checkouts where id = checkout for update;
  if not found then
    raise exception 'That checkout does not exist.' using errcode = 'P0002';
  end if;
  if c.canceled_at is not null or c.returned_at is not null then
    return c;
  end if;

  if now() <= c.starts_at then
    update public.checkouts set canceled_at = now() where id = checkout returning * into c;
  else
    update public.checkouts
      set returned_at = now(), ends_at = least(ends_at, now())
      where id = checkout returning * into c;
  end if;
  return c;
end;
$$;

alter table public.inventory_items enable row level security;
alter table public.checkouts enable row level security;
alter table public.inventory_log enable row level security;

-- The inventory is open for every class member to edit.
create policy "Members see the inventory" on public.inventory_items
  for select to authenticated using ((select private.is_member()));
create policy "Members add tools" on public.inventory_items
  for insert to authenticated with check ((select private.is_member()));
create policy "Members edit tools" on public.inventory_items
  for update to authenticated using ((select private.is_member()));

create policy "Members see checkouts" on public.checkouts
  for select to authenticated using ((select private.is_member()));
create policy "Members check out tools in their own name" on public.checkouts
  for insert to authenticated with check ((select private.is_member()) and user_id = (select auth.uid()));
create policy "Members adjust checkouts" on public.checkouts
  for update to authenticated using ((select private.is_member()));

create policy "Members read the changelog" on public.inventory_log
  for select to authenticated using ((select private.is_member()));

grant select on public.inventory_items to authenticated;
grant insert (name, tool_slug, location, status, status_note, notes) on public.inventory_items to authenticated;
grant update (name, tool_slug, location, status, status_note, notes, archived_at) on public.inventory_items to authenticated;

grant select on public.checkouts to authenticated;
grant insert (item_id, borrower, note, starts_at, ends_at) on public.checkouts to authenticated;
grant update (borrower, note, starts_at, ends_at) on public.checkouts to authenticated;

grant select on public.inventory_log to authenticated;

-------------------------------------------------------------------------------
-- Project groups and their text channels
-------------------------------------------------------------------------------

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  description text check (char_length(description) <= 500),
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  added_by uuid references public.profiles (id) on delete set null default auth.uid(),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index group_members_user_idx on public.group_members (user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null default auth.uid(),
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  removed_at timestamptz,
  removed_by uuid references public.profiles (id) on delete set null
);
create index messages_group_created_idx on public.messages (group_id, created_at desc);

create function private.is_group_member(g uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.group_members where group_id = g and user_id = (select auth.uid()));
$$;
grant execute on function private.is_group_member(uuid) to authenticated;

-- The person who makes a group is its first member.
create function private.add_group_creator() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.group_members (group_id, user_id, added_by) values (new.id, new.created_by, new.created_by)
  on conflict do nothing;
  return new;
end;
$$;

create trigger groups_add_creator after insert on public.groups
  for each row execute function private.add_group_creator();

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.messages enable row level security;

create policy "Members see groups" on public.groups
  for select to authenticated using ((select private.is_member()));
create policy "Members make groups" on public.groups
  for insert to authenticated with check ((select private.is_member()) and created_by = (select auth.uid()));
create policy "Group members and moderators edit groups" on public.groups
  for update to authenticated using ((select private.is_group_member(id)) or (select private.is_moderator()));

create policy "Members see who is in each group" on public.group_members
  for select to authenticated using ((select private.is_member()));
-- Anyone in the class can join a group; group members can add classmates.
create policy "Join a group or add a classmate" on public.group_members
  for insert to authenticated with check (
    (select private.is_member())
    and added_by = (select auth.uid())
    and (user_id = (select auth.uid()) or (select private.is_group_member(group_id)) or (select private.is_moderator()))
  );
create policy "Leave a group, or remove someone from your group" on public.group_members
  for delete to authenticated using (
    user_id = (select auth.uid()) or (select private.is_group_member(group_id)) or (select private.is_moderator())
  );

create policy "Group members and moderators read the channel" on public.messages
  for select to authenticated using (
    ((select private.is_group_member(group_id)) and removed_at is null) or (select private.is_moderator())
  );
create policy "Group members post in the channel" on public.messages
  for insert to authenticated with check (
    (select private.is_group_member(group_id)) and author_id = (select auth.uid())
  );
create policy "Authors delete their own messages" on public.messages
  for delete to authenticated using (author_id = (select auth.uid()));

grant select on public.groups to authenticated;
grant insert (name, description) on public.groups to authenticated;
grant update (name, description, archived_at) on public.groups to authenticated;
grant select, delete on public.group_members to authenticated;
grant insert (group_id, user_id) on public.group_members to authenticated;
grant select, delete on public.messages to authenticated;
grant insert (group_id, body) on public.messages to authenticated;

-------------------------------------------------------------------------------
-- Posts: papers, competition opportunities, and builds
-------------------------------------------------------------------------------

create type public.post_kind as enum ('paper', 'competition', 'build');

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles (id) on delete set null default auth.uid(),
  kind public.post_kind not null,
  title text not null check (char_length(btrim(title)) between 1 and 140),
  body text check (char_length(body) <= 5000),
  link_url text check (link_url ~* '^https?://' and char_length(link_url) <= 1000),
  deadline date,
  -- Paths inside the "post-images" storage bucket. Images are compressed in the
  -- browser before upload to stay inside the Free plan's storage and egress.
  image_paths text[] not null default '{}' check (cardinality(image_paths) <= 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  removed_at timestamptz,
  removed_by uuid references public.profiles (id) on delete set null
);
create index posts_created_idx on public.posts (created_at desc);

create function private.touch_post() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger posts_touch before update of title, body, link_url, deadline, image_paths on public.posts
  for each row execute function private.touch_post();

alter table public.posts enable row level security;

create policy "Members see posts" on public.posts
  for select to authenticated using (
    (select private.is_member())
    and (removed_at is null or author_id = (select auth.uid()) or (select private.is_moderator()))
  );
create policy "Members post as themselves" on public.posts
  for insert to authenticated with check ((select private.is_member()) and author_id = (select auth.uid()));
create policy "Authors edit their posts" on public.posts
  for update to authenticated using (author_id = (select auth.uid()));
create policy "Authors delete their posts" on public.posts
  for delete to authenticated using (author_id = (select auth.uid()));

grant select, delete on public.posts to authenticated;
grant insert (kind, title, body, link_url, deadline, image_paths) on public.posts to authenticated;
grant update (kind, title, body, link_url, deadline, image_paths) on public.posts to authenticated;

-------------------------------------------------------------------------------
-- Moderation: reports, removal, restore
-------------------------------------------------------------------------------

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles (id) on delete set null default auth.uid(),
  target_type text not null check (target_type in ('post', 'message')),
  target_id uuid not null,
  reason text check (char_length(reason) <= 500),
  -- A copy of what was reported, so moderators see it even if it changes.
  snapshot jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id) on delete set null,
  resolution text check (resolution in ('removed', 'dismissed'))
);
create index reports_open_idx on public.reports (created_at desc) where resolved_at is null;

alter table public.reports enable row level security;

create policy "Moderators see reports; reporters see their own" on public.reports
  for select to authenticated using (reporter_id = (select auth.uid()) or (select private.is_moderator()));

grant select on public.reports to authenticated;

create function public.report_content(target_type text, target_id uuid, reason text) returns public.reports
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

-- Moderators remove or restore a post or message. Removing also closes any
-- open reports about it.
create function public.moderate_content(target_type text, target_id uuid, remove boolean) returns void
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

create function public.dismiss_report(report uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_moderator() then
    raise exception 'Only moderators can do this.' using errcode = '42501';
  end if;
  update public.reports
    set resolved_at = now(), resolved_by = auth.uid(), resolution = 'dismissed'
    where id = report and resolved_at is null;
end;
$$;

-------------------------------------------------------------------------------
-- Keep-alive for the Free plan's 7-day inactivity pause
-------------------------------------------------------------------------------

create table private.heartbeat (
  id boolean primary key default true check (id),
  at timestamptz not null default now()
);
insert into private.heartbeat default values;

-- Called once a day by .github/workflows/keepalive.yml. It writes one row, so
-- the project shows database activity even over school breaks.
create function public.keepalive() returns timestamptz
language sql volatile security definer set search_path = '' as $$
  update private.heartbeat set at = now() returning at;
$$;

-------------------------------------------------------------------------------
-- Function permissions
-------------------------------------------------------------------------------

revoke execute on function
  public.join_class(text, text),
  public.set_member_access(uuid, public.member_role, boolean),
  public.remove_member(uuid),
  public.end_checkout(uuid),
  public.report_content(text, uuid, text),
  public.moderate_content(text, uuid, boolean),
  public.dismiss_report(uuid),
  public.keepalive()
from public, anon;

grant execute on function
  public.join_class(text, text),
  public.set_member_access(uuid, public.member_role, boolean),
  public.remove_member(uuid),
  public.end_checkout(uuid),
  public.report_content(text, uuid, text),
  public.moderate_content(text, uuid, boolean),
  public.dismiss_report(uuid)
to authenticated;

grant execute on function public.keepalive() to anon, authenticated;

-------------------------------------------------------------------------------
-- Realtime: new channel messages arrive without a refresh
-------------------------------------------------------------------------------

alter publication supabase_realtime add table public.messages;
