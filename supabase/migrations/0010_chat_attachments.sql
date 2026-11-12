-- Engineering Portal: pictures and files in group chats
-- Run after 0009_profile_pictures.sql.
--
-- A message can carry up to 4 attachments. Pictures are shrunk in the browser
-- (like post photos); other files are stored as they are, up to 10 MB each.
-- Programs and scripts are refused. Files live in a private bucket,
-- "group-files", in a folder per group and per sender:
--   <group id>/<sender id>/<random name>
-- Only the group's members and moderators can read them (the app uses
-- short-lived signed links). The sender or a moderator can delete them.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('group-files', 'group-files', false, 10485760, null)
on conflict (id) do nothing;

-- File names the app and the database refuse: programs and scripts.
create function private.is_blocked_file(name text) returns boolean
language sql immutable set search_path = '' as $$
  select name ~* '\.(exe|msi|msp|bat|cmd|com|scr|pif|cpl|ps1|psm1|vbs|vbe|js|jse|wsf|wsh|hta|jar|apk|app|dmg|pkg|deb|rpm|sh|reg|lnk|dll)$';
$$;

-- True when the signed-in member may read files in this storage path's group folder.
create function private.can_read_group_file(name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_moderator() or exists (
    select 1 from public.group_members gm
    where gm.group_id::text = (storage.foldername(name))[1] and gm.user_id = (select auth.uid())
  );
$$;
grant execute on function private.can_read_group_file(text) to authenticated;

create policy "Group members and moderators read group files" on storage.objects
  for select to authenticated using (bucket_id = 'group-files' and (select private.can_read_group_file(name)));

create policy "Group members upload files to their own folder in the group" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'group-files'
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and exists (
      select 1 from public.group_members gm
      where gm.group_id::text = (storage.foldername(name))[1] and gm.user_id = (select auth.uid())
    )
    and not private.is_blocked_file(name)
  );

create policy "Senders and moderators delete group files" on storage.objects
  for delete to authenticated using (
    bucket_id = 'group-files'
    and ((storage.foldername(name))[2] = (select auth.uid())::text or (select private.is_moderator()))
  );

-------------------------------------------------------------------------------
-- Messages carry the attachment list
-------------------------------------------------------------------------------

-- [{"path", "name", "size", "type", "kind": "image" | "file"}]
alter table public.messages add column attachments jsonb not null default '[]'
  check (jsonb_typeof(attachments) = 'array' and jsonb_array_length(attachments) <= 4);

-- A message needs text, attachments, or both.
alter table public.messages drop constraint messages_body_check;
alter table public.messages add constraint messages_body_check check (
  char_length(body) <= 2000
  and (char_length(btrim(body)) >= 1 or jsonb_array_length(attachments) >= 1)
);

grant insert (group_id, body, attachments) on public.messages to authenticated;

-- Each attachment must be a file the sender put in this group's folder.
create function private.check_message_attachments() returns trigger
language plpgsql set search_path = '' as $$
declare
  a jsonb;
begin
  for a in select value from jsonb_array_elements(new.attachments) loop
    if jsonb_typeof(a) is distinct from 'object'
       or coalesce(a ->> 'kind', '') not in ('image', 'file')
       or char_length(coalesce(a ->> 'name', '')) not between 1 and 200
       or not starts_with(coalesce(a ->> 'path', ''), new.group_id::text || '/' || new.author_id::text || '/')
       or private.is_blocked_file(a ->> 'path') then
      raise exception 'An attachment is not valid.' using errcode = '22023';
    end if;
  end loop;
  return new;
end;
$$;

create trigger messages_check_attachments before insert on public.messages
  for each row execute function private.check_message_attachments();
