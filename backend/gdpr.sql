-- ============================================================
-- Deadreckoner — GDPR obligations made real.
-- The privacy policy now commits to these; this makes them true.
-- Run once in Supabase SQL Editor.
-- ============================================================

-- ── 1. Log retention (policy states 24 months) ─────────────
create or replace function public.purge_old_events()
returns integer language plpgsql security definer set search_path = public as $$
declare v_deleted integer;
begin
  delete from public.events where created_at < now() - interval '24 months';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.purge_old_events() from public, anon, authenticated;

-- Schedule it if pg_cron is available; harmless if not.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('purge-old-events', '0 3 1 * *', 'select public.purge_old_events();');
  end if;
exception when others then
  raise notice 'pg_cron not configured — run purge_old_events() manually or via a scheduled Edge Function.';
end $$;

-- ── 2. Data subject export (right of access + portability) ──
create or replace function public.export_my_data()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_ws uuid; v_out jsonb;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select workspace_id into v_ws from public.workspace_members where user_id = v_uid limit 1;

  select jsonb_build_object(
    'exported_at', now(),
    'account', (select jsonb_build_object('id', id, 'email', email, 'created_at', created_at)
                from auth.users where id = v_uid),
    'workspace', (select jsonb_build_object('id', id, 'name', name, 'plan', plan, 'created_at', created_at)
                  from public.workspaces where id = v_ws),
    'my_role', (select role from public.workspace_members where user_id = v_uid and workspace_id = v_ws),
    'my_requests', coalesce((select jsonb_agg(to_jsonb(r) - 'workspace_id')
                             from public.requests r where r.created_by = v_uid), '[]'::jsonb),
    'my_submissions', coalesce((select jsonb_agg(to_jsonb(s) - 'workspace_id')
                                from public.asset_submissions s where s.submitted_by = v_uid), '[]'::jsonb),
    'my_activity', coalesce((select jsonb_agg(jsonb_build_object(
                                'event_type', e.event_type, 'created_at', e.created_at, 'metadata', e.metadata))
                             from public.events e where e.user_id = v_uid), '[]'::jsonb)
  ) into v_out;
  return v_out;
end;
$$;

grant execute on function public.export_my_data() to authenticated;

-- ── 3. Data subject erasure (right to be forgotten) ────────
-- Anonymises the caller's traces without destroying workspace history
-- that other members legitimately rely on.
create or replace function public.erase_my_data()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_events integer; v_ws uuid; v_role text; v_admins integer;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select workspace_id, role into v_ws, v_role
  from public.workspace_members where user_id = v_uid limit 1;

  -- A workspace must not be left without an admin.
  if v_role = 'admin' and v_ws is not null then
    select count(*) into v_admins
    from public.workspace_members where workspace_id = v_ws and role = 'admin';
    if v_admins <= 1 then
      raise exception 'You are the only admin of this workspace. Transfer admin to someone else, or delete the workspace, before erasing your data.';
    end if;
  end if;

  update public.events set user_id = null, metadata = '{}'::jsonb where user_id = v_uid;
  get diagnostics v_events = row_count;

  update public.requests set created_by = null where created_by = v_uid;
  update public.requests set assigned_to = null where assigned_to = v_uid;
  update public.asset_submissions set submitted_by = null where submitted_by = v_uid;
  update public.asset_submissions set reviewed_by = null where reviewed_by = v_uid;
  delete from public.workspace_members where user_id = v_uid;

  return jsonb_build_object(
    'status', 'anonymised',
    'events_anonymised', v_events,
    'note', 'Account removal from authentication is completed separately; contact privacy@deadreckoner.dev to finish deletion.'
  );
end;
$$;

grant execute on function public.erase_my_data() to authenticated;

-- ── 4. Feedback capture (CSAT / NPS / CES) ─────────────────
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  kind text not null check (kind in ('csat','nps','ces')),
  score integer not null,
  comment text,
  context text,
  created_at timestamptz not null default now()
);

create index if not exists feedback_workspace_idx on public.feedback(workspace_id);
create index if not exists feedback_kind_idx on public.feedback(kind);

alter table public.feedback enable row level security;

create policy "feedback_insert_own" on public.feedback
  for insert with check (user_id = auth.uid());

create policy "feedback_select_own" on public.feedback
  for select using (user_id = auth.uid());
