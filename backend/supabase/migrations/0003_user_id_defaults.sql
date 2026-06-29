-- Default user_id columns to the authenticated user.
-- Without this, client inserts that omit user_id store NULL and fail the
-- RLS check `user_id = auth.uid()`. Run this in the SQL editor if you already
-- applied 0001 before this fix.

alter table public.habits      alter column user_id set default auth.uid();
alter table public.checkins    alter column user_id set default auth.uid();
alter table public.devices     alter column user_id set default auth.uid();
alter table public.match_queue alter column user_id set default auth.uid();
