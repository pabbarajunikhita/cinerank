-- Run once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Creates a public bucket for ranking photos. Anyone can VIEW photos (profiles are
-- public), but users can only upload/replace/delete files inside their own folder,
-- named by their user id: ranking-photos/<user id>/<file>.jpg

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ranking-photos', 'ranking-photos', true, 5242880, array['image/jpeg'])
on conflict (id) do nothing;

create policy "Users upload photos to their own folder"
on storage.objects for insert to authenticated
with check (bucket_id = 'ranking-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users update their own photos"
on storage.objects for update to authenticated
using (bucket_id = 'ranking-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users delete their own photos"
on storage.objects for delete to authenticated
using (bucket_id = 'ranking-photos' and (storage.foldername(name))[1] = auth.uid()::text);
