-- Engineering Portal: tool status announcements and the alert bell
-- Run after 0004_announcements.sql.
--
-- When a tool is marked as needing maintenance, or marked operational again,
-- the database posts an announcement. The alert bell in the app counts the
-- announcements a member has not seen yet (every kind except "joined").

alter table public.announcements
  add column kind text not null default 'post' check (kind in ('post', 'joined', 'maintenance', 'fixed')),
  -- Set on maintenance and fixed announcements, so the app can link to the tool.
  add column item_id uuid references public.inventory_items (id) on delete cascade;

update public.announcements set kind = 'joined' where joined_id is not null;

create or replace function private.announce_join() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.announcements (author_id, kind, joined_id) values (null, 'joined', new.id);
  return new;
end;
$$;

create function private.announce_tool_status() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  who text := coalesce(private.current_name(), 'Someone');
begin
  if new.archived_at is not null then
    return new;
  end if;

  if new.status = 'needs_maintenance' and (tg_op = 'INSERT' or old.status <> 'needs_maintenance') then
    insert into public.announcements (author_id, kind, item_id, title, body)
    values (null, 'maintenance', new.id, new.name || ' needs maintenance',
            concat_ws(E'\n\n', nullif(btrim(new.status_note), ''), 'Marked by ' || who || '.'));
  elsif tg_op = 'UPDATE' and new.status = 'operational' and old.status = 'needs_maintenance' then
    insert into public.announcements (author_id, kind, item_id, title, body)
    values (null, 'fixed', new.id, new.name || ' is working again', 'Marked operational by ' || who || '.');
  end if;
  return new;
end;
$$;

create trigger inventory_items_announce_status after insert or update of status on public.inventory_items
  for each row execute function private.announce_tool_status();

-- New announcements reach open apps right away, so the bell updates live.
alter publication supabase_realtime add table public.announcements;

-------------------------------------------------------------------------------
-- When each member last opened Announcements
-------------------------------------------------------------------------------

create table public.announcement_reads (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  seen_at timestamptz not null default now()
);

alter table public.announcement_reads enable row level security;

create policy "Members see when they last read announcements" on public.announcement_reads
  for select to authenticated using (user_id = (select auth.uid()));

grant select on public.announcement_reads to authenticated;

-- Called when a member opens Announcements.
create function public.mark_announcements_seen() returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare
  result timestamptz;
begin
  if not private.is_member() then
    raise exception 'Join the class first.' using errcode = '42501';
  end if;
  insert into public.announcement_reads (user_id, seen_at) values (auth.uid(), now())
  on conflict (user_id) do update set seen_at = excluded.seen_at
  returning seen_at into result;
  return result;
end;
$$;

revoke execute on function public.mark_announcements_seen() from public, anon;
grant execute on function public.mark_announcements_seen() to authenticated;
