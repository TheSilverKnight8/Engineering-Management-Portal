-- Engineering Portal: image storage for posts
-- Run after 0001_schema.sql.
--
-- The app shrinks every image in the browser (max 1600 px, WebP) before upload,
-- so a typical photo is 150-300 KB. The bucket refuses anything over 1 MB.
-- Videos never go here: they are embedded from YouTube.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-images', 'post-images', true, 1048576, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

-- Each person uploads only into a folder named with their own user id.
create policy "Members upload post images to their own folder" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select private.is_member())
  );

create policy "Members list post images" on storage.objects
  for select to authenticated using (bucket_id = 'post-images' and (select private.is_member()));

create policy "Members delete their own post images" on storage.objects
  for delete to authenticated using (
    bucket_id = 'post-images' and (storage.foldername(name))[1] = (select auth.uid())::text
  );
