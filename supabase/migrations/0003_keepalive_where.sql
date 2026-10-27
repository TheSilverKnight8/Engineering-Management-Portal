-- Engineering Portal: fix keepalive() for API calls
-- Run after 0002_storage.sql.
--
-- Supabase loads pg-safeupdate for requests through its API. It refuses an
-- UPDATE without a WHERE clause (error 21000, sent back as HTTP 400), so the
-- daily keep-alive call failed. heartbeat has one row with id = true, so
-- "where id" still updates that row. "create or replace" keeps the grants.

create or replace function public.keepalive() returns timestamptz
language sql volatile security definer set search_path = '' as $$
  update private.heartbeat set at = now() where id returning at;
$$;
