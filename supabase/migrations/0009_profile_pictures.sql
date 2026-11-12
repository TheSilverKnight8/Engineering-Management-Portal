-- Engineering Portal: profile pictures
-- Run after 0008_notifications.sql.
--
-- Each member can set a profile picture. The app lets them drag and zoom to
-- frame it, shrinks it to a small square image in the browser, and uploads it
-- into their own folder in the "post-images" bucket. Moderators can remove a
-- picture; the member then shows their initials again and can upload another.

alter table public.profiles add column avatar_path text check (char_length(avatar_path) <= 200);

grant update (avatar_path) on public.profiles to authenticated;

-- A member's picture must be a file in their own folder.
create function private.check_avatar_path() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.avatar_path is not null and split_part(new.avatar_path, '/', 1) <> new.id::text then
    raise exception 'A profile picture must be in your own folder.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_check_avatar before insert or update of avatar_path on public.profiles
  for each row execute function private.check_avatar_path();

-- Moderators remove a member's picture. Returns the file's path so the app
-- can delete the file too.
create function public.remove_profile_picture(member uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  old_path text;
begin
  if not private.is_moderator() then
    raise exception 'Only moderators can do this.' using errcode = '42501';
  end if;
  select avatar_path into old_path from public.profiles where id = member for update;
  update public.profiles set avatar_path = null where id = member;
  return old_path;
end;
$$;

revoke execute on function public.remove_profile_picture(uuid) from public, anon;
grant execute on function public.remove_profile_picture(uuid) to authenticated;

-- So a removed picture (or a removed post's photo) is deleted, not only unlinked.
create policy "Moderators delete post images" on storage.objects
  for delete to authenticated using (bucket_id = 'post-images' and (select private.is_moderator()));
