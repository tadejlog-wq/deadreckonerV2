-- ============================================================
-- Deadreckoner — plans, seat enforcement, trials.
-- Run once in Supabase SQL Editor.
-- Fixes: advertised seat limits were never enforced anywhere,
-- so a Starter workspace could add unlimited members.
-- ============================================================

alter table public.workspaces
  add column if not exists plan text not null default 'trial'
    check (plan in ('trial','starter','team','enterprise')),
  add column if not exists trial_ends_at timestamptz default (now() + interval '14 days');

-- Seat allowance per plan. Enterprise = unlimited (null).
create or replace function public.plan_seat_limit(p_plan text)
returns integer language sql immutable as $$
  select case p_plan
    when 'trial' then 3
    when 'starter' then 3
    when 'team' then 10
    when 'enterprise' then null
    else 1 end;
$$;

-- Refuse a member insert that would exceed the workspace's allowance.
create or replace function public.enforce_seat_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_plan text; v_limit integer; v_count integer;
begin
  select plan into v_plan from public.workspaces where id = new.workspace_id;
  v_limit := public.plan_seat_limit(coalesce(v_plan, 'trial'));
  if v_limit is null then return new; end if;

  select count(*) into v_count
  from public.workspace_members where workspace_id = new.workspace_id;

  if v_count >= v_limit then
    raise exception 'Seat limit reached for the % plan (% seats). Upgrade to add more members.', v_plan, v_limit
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists workspace_members_seat_limit on public.workspace_members;
create trigger workspace_members_seat_limit
  before insert on public.workspace_members
  for each row execute function public.enforce_seat_limit();

-- Convenience view for the UI: seats used, allowed, and trial state.
create or replace view public.workspace_plan_status as
select
  w.id as workspace_id,
  w.plan,
  w.trial_ends_at,
  (w.plan = 'trial' and w.trial_ends_at > now()) as trial_active,
  greatest(0, extract(day from (w.trial_ends_at - now()))::int) as trial_days_left,
  public.plan_seat_limit(w.plan) as seat_limit,
  (select count(*) from public.workspace_members m where m.workspace_id = w.id) as seats_used
from public.workspaces w;

alter view public.workspace_plan_status set (security_invoker = on);
revoke all on public.workspace_plan_status from anon;

-- ── Segmentation fields captured at onboarding ─────────────
alter table public.workspaces
  add column if not exists industry text,
  add column if not exists company_size text,
  add column if not exists owner_role text;
