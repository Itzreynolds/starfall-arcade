-- Starfall Arcade Platform — Version 1
-- Run this entire file in the Supabase SQL Editor on a NEW Starfall project.
-- Review docs/SETUP.md before enabling real registrations or payments.

create extension if not exists pgcrypto;

-- =========================================================
-- Core tables
-- =========================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text not null,
  display_name text not null default 'Starfall Player',
  avatar_url text,
  bio text not null default '',
  favorite_game text,
  arcade_xp bigint not null default 0 check (arcade_xp >= 0),
  premium_tier text not null default 'free',
  premium_until timestamptz,
  stripe_customer_id text unique,
  email_marketing_opt_in boolean not null default true,
  account_status text not null default 'active' check (account_status in ('active','suspended','banned')),
  banned_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create unique index if not exists profiles_handle_lower_uidx on public.profiles (lower(handle));
create index if not exists profiles_last_seen_idx on public.profiles (last_seen_at desc);
create index if not exists profiles_status_idx on public.profiles (account_status);

create table if not exists public.legal_acceptances (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  document_key text not null,
  version text not null,
  accepted_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.games (
  id text primary key,
  title text not null,
  version_label text not null default 'Version 1',
  status text not null default 'development' check (status in ('development','live','maintenance','retired')),
  play_url text,
  cover_url text,
  description text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null references public.games(id) on delete cascade,
  slot_key text not null default 'main',
  save_version text not null default '1',
  save_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, game_id, slot_key)
);

create index if not exists game_saves_user_updated_idx on public.game_saves(user_id, updated_at desc);

create table if not exists public.save_backups (
  id uuid primary key default gen_random_uuid(),
  save_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null references public.games(id) on delete cascade,
  slot_key text not null,
  save_version text not null,
  save_data jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists save_backups_slot_idx on public.save_backups(user_id, game_id, slot_key, created_at desc);

create table if not exists public.activity_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id text references public.games(id) on delete set null,
  event_type text not null,
  title text not null,
  detail text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activity_events_user_idx on public.activity_events(user_id, created_at desc);
create index if not exists activity_events_game_idx on public.activity_events(game_id, created_at desc);
create index if not exists activity_events_type_idx on public.activity_events(event_type, created_at desc);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  game_id text references public.games(id) on delete cascade,
  name text not null,
  description text not null,
  icon text not null default '🏆',
  xp integer not null default 0 check (xp >= 0),
  hidden boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  primary key(user_id, achievement_id)
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references auth.users(id) on delete set null,
  title text not null,
  body text not null,
  category text not null default 'Platform',
  audience jsonb not null default '{"type":"all"}'::jsonb,
  send_email boolean not null default false,
  active boolean not null default true,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.inbox_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  read_at timestamptz,
  email_delivered_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id, announcement_id)
);

create index if not exists inbox_user_idx on public.inbox_messages(user_id, created_at desc);


create table if not exists public.email_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued','sending','sent','failed')),
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique(user_id, announcement_id)
);

create index if not exists email_queue_status_idx on public.email_queue(status, created_at);

create table if not exists public.products (
  id text primary key,
  name text not null,
  description text not null default '',
  product_type text not null check (product_type in ('one_time','subscription')),
  game_id text references public.games(id) on delete set null,
  stripe_price_id text,
  price_display text,
  entitlements jsonb not null default '[]'::jsonb,
  active boolean not null default false,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text references public.products(id) on delete set null,
  provider text not null default 'stripe',
  provider_session_id text unique,
  provider_payment_id text,
  status text not null default 'pending',
  amount_total bigint,
  currency text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists purchases_user_idx on public.purchases(user_id, created_at desc);

create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entitlement_key text not null,
  source text not null,
  source_ref text not null default '',
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(user_id, entitlement_key, source, source_ref)
);

create index if not exists entitlements_user_idx on public.entitlements(user_id, entitlement_key);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text references public.products(id) on delete set null,
  provider text not null default 'stripe',
  provider_subscription_id text unique,
  status text not null,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.staff_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','senior_staff','staff','developer','support')),
  permissions text[] not null default '{}',
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action_type text not null,
  reason text not null,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action_type text not null,
  target_type text not null,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_idx on public.audit_logs(created_at desc);

-- =========================================================
-- Utility / staff permission functions
-- =========================================================

create or replace function public.role_default_permissions(role_name text)
returns text[]
language sql
immutable
as $$
  select case role_name
    when 'owner' then array['*']::text[]
    when 'admin' then array[
      'analytics.read','users.read','moderation.write','saves.read',
      'purchases.read','purchases.manage','announcements.write',
      'games.read','games.write','store.manage','staff.read','staff.manage','audit.read'
    ]::text[]
    when 'senior_staff' then array[
      'analytics.read','users.read','moderation.write','saves.read',
      'announcements.write','staff.read','audit.read'
    ]::text[]
    when 'staff' then array['users.read','moderation.write','announcements.write']::text[]
    when 'developer' then array['analytics.read','games.read','games.write','saves.read','audit.read']::text[]
    when 'support' then array['users.read','saves.read']::text[]
    else '{}'::text[]
  end
$$;

create or replace function public.current_staff_context()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.staff_members%rowtype;
  perms text[];
begin
  select * into s from public.staff_members where user_id = auth.uid() and active = true;
  if not found then return jsonb_build_object('active', false); end if;
  perms := array(select distinct unnest(public.role_default_permissions(s.role) || coalesce(s.permissions,'{}'::text[])));
  return jsonb_build_object('active', true, 'role', s.role, 'permissions', perms);
end
$$;

create or replace function public.has_staff_permission(permission_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  ctx jsonb;
begin
  ctx := public.current_staff_context();
  if coalesce((ctx->>'active')::boolean,false) is false then return false; end if;
  return (ctx->>'role') = 'owner'
    or '*' = any(array(select jsonb_array_elements_text(ctx->'permissions')))
    or permission_name = any(array(select jsonb_array_elements_text(ctx->'permissions')));
end
$$;

revoke all on function public.current_staff_context() from public;
grant execute on function public.current_staff_context() to authenticated;
revoke all on function public.has_staff_permission(text) from public;
grant execute on function public.has_staff_permission(text) to authenticated;


create or replace function public.account_is_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.profiles
    where id=auth.uid() and account_status='active'
  )
$$;

revoke all on function public.account_is_active() from public;
grant execute on function public.account_is_active() to authenticated;

-- =========================================================
-- Account creation / profile hooks
-- =========================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  desired_handle text;
  display_value text;
  marketing_value boolean;
  accepted text;
begin
  desired_handle := regexp_replace(coalesce(new.raw_user_meta_data->>'handle',''), '[^A-Za-z0-9_]', '', 'g');
  if length(desired_handle) < 3 then desired_handle := 'player_' || substr(new.id::text,1,8); end if;
  if exists(select 1 from public.profiles where lower(handle)=lower(desired_handle)) then
    desired_handle := left(desired_handle,19) || '_' || substr(new.id::text,1,4);
  end if;
  display_value := left(coalesce(nullif(new.raw_user_meta_data->>'display_name',''),'Starfall Player'),60);
  marketing_value := coalesce((new.raw_user_meta_data->>'email_marketing_opt_in')::boolean,true);
  accepted := new.raw_user_meta_data->>'terms_accepted_at';

  insert into public.profiles(id,handle,display_name,email_marketing_opt_in)
  values(new.id,desired_handle,display_value,marketing_value)
  on conflict(id) do nothing;

  if accepted is not null then
    insert into public.legal_acceptances(user_id,document_key,version,accepted_at)
    values(new.id,'terms_and_privacy','version-1',coalesce(accepted::timestamptz,now()));
  end if;
  return new;
end
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles for each row execute procedure public.touch_updated_at();
drop trigger if exists games_touch on public.games;
create trigger games_touch before update on public.games for each row execute procedure public.touch_updated_at();
drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products for each row execute procedure public.touch_updated_at();
drop trigger if exists purchases_touch on public.purchases;
create trigger purchases_touch before update on public.purchases for each row execute procedure public.touch_updated_at();
drop trigger if exists subscriptions_touch on public.subscriptions;
create trigger subscriptions_touch before update on public.subscriptions for each row execute procedure public.touch_updated_at();
drop trigger if exists staff_touch on public.staff_members;
create trigger staff_touch before update on public.staff_members for each row execute procedure public.touch_updated_at();

-- =========================================================
-- Save backup trigger (keeps latest 10 backups per slot)
-- =========================================================

create or replace function public.backup_game_save()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.save_data is distinct from new.save_data then
    insert into public.save_backups(save_id,user_id,game_id,slot_key,save_version,save_data)
    values(old.id,old.user_id,old.game_id,old.slot_key,old.save_version,old.save_data);

    delete from public.save_backups b
    where b.id in (
      select id from public.save_backups
      where user_id=old.user_id and game_id=old.game_id and slot_key=old.slot_key
      order by created_at desc offset 10
    );
  end if;
  new.updated_at := now();
  return new;
end
$$;

drop trigger if exists game_save_backup on public.game_saves;
create trigger game_save_backup before update on public.game_saves
for each row execute procedure public.backup_game_save();

-- =========================================================
-- Achievement XP
-- =========================================================

create or replace function public.award_achievement_xp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare amount integer;
begin
  select xp into amount from public.achievements where id = new.achievement_id;
  update public.profiles set arcade_xp = arcade_xp + coalesce(amount,0), updated_at=now() where id=new.user_id;
  return new;
end
$$;

drop trigger if exists achievement_xp_trigger on public.user_achievements;
create trigger achievement_xp_trigger after insert on public.user_achievements
for each row execute procedure public.award_achievement_xp();

-- =========================================================
-- Staff RPCs
-- =========================================================

create or replace function public.staff_dashboard_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.has_staff_permission('analytics.read') then raise exception 'Permission denied'; end if;

  select jsonb_build_object(
    'users_total', (select count(*) from public.profiles),
    'users_24h', (select count(*) from public.profiles where created_at >= now()-interval '24 hours'),
    'active_7d', (select count(*) from public.profiles where last_seen_at >= now()-interval '7 days'),
    'premium_active', (select count(*) from public.profiles where premium_tier <> 'free' and (premium_until is null or premium_until > now())),
    'purchases_30d', (select count(*) from public.purchases where created_at >= now()-interval '30 days' and status in ('paid','complete')),
    'game_events_24h', (select count(*) from public.activity_events where created_at >= now()-interval '24 hours'),
    'unread_inbox', (select count(*) from public.inbox_messages where read_at is null),
    'cloud_saves', (select count(*) from public.game_saves),
    'achievements_unlocked', (select count(*) from public.user_achievements),
    'staff_count', (select count(*) from public.staff_members where active=true),
    'registrations_7d', (
      select jsonb_agg(jsonb_build_object('label',to_char(d.day,'Dy'),'date',d.day::date,'count',coalesce(c.count,0)) order by d.day)
      from generate_series(date_trunc('day',now())-interval '6 days',date_trunc('day',now()),interval '1 day') d(day)
      left join (
        select date_trunc('day',created_at) day,count(*) count from public.profiles
        where created_at >= date_trunc('day',now())-interval '6 days'
        group by 1
      ) c using(day)
    )
  ) into result;

  return result;
end
$$;

create or replace function public.staff_search_users(
  search_text text default '',
  result_limit integer default 50,
  result_offset integer default 0
)
returns table(
  id uuid, display_name text, handle text, email_hint text, account_status text,
  arcade_xp bigint, premium_tier text, created_at timestamptz, last_seen_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.has_staff_permission('users.read') then raise exception 'Permission denied'; end if;
  return query
  select p.id,p.display_name,p.handle,
    case when u.email is null then null
      else regexp_replace(u.email,'(^.).*(@.*$)','\1•••\2') end as email_hint,
    p.account_status,p.arcade_xp,p.premium_tier,p.created_at,p.last_seen_at
  from public.profiles p
  join auth.users u on u.id=p.id
  where coalesce(search_text,'')=''
     or p.id::text ilike '%'||search_text||'%'
     or p.display_name ilike '%'||search_text||'%'
     or p.handle ilike '%'||search_text||'%'
     or u.email ilike '%'||search_text||'%'
  order by p.created_at desc
  limit greatest(1,least(result_limit,100)) offset greatest(result_offset,0);
end
$$;

create or replace function public.staff_user_detail(target_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_staff_permission('users.read') then raise exception 'Permission denied'; end if;
  return jsonb_build_object(
    'profile',(select to_jsonb(p) from public.profiles p where id=target_user),
    'staff',(select to_jsonb(s) from public.staff_members s where user_id=target_user),
    'counts',jsonb_build_object(
      'saves',(select count(*) from public.game_saves where user_id=target_user),
      'achievements',(select count(*) from public.user_achievements where user_id=target_user),
      'purchases',(select count(*) from public.purchases where user_id=target_user),
      'entitlements',(select count(*) from public.entitlements where user_id=target_user)
    ),
    'recent_activity',coalesce((select jsonb_agg(to_jsonb(x)) from (
      select id,game_id,event_type,title,detail,created_at from public.activity_events
      where user_id=target_user order by created_at desc limit 15
    ) x),'[]'::jsonb)
  );
end
$$;

create or replace function public.staff_set_account_status(
  target_user uuid, new_status text, reason_text text, until_time timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_staff_permission('moderation.write') then raise exception 'Permission denied'; end if;
  if new_status not in ('active','suspended','banned') then raise exception 'Invalid status'; end if;
  if exists(select 1 from public.staff_members where user_id=target_user and role='owner' and active) and
     (select coalesce(current_staff_context()->>'role','')) <> 'owner' then
    raise exception 'Only the owner can moderate an owner account';
  end if;

  update public.profiles set account_status=new_status,banned_until=until_time,updated_at=now() where id=target_user;
  insert into public.moderation_actions(target_user_id,actor_id,action_type,reason,expires_at)
  values(target_user,auth.uid(),new_status,coalesce(nullif(reason_text,''),'No reason supplied'),until_time);
  insert into public.audit_logs(actor_id,action_type,target_type,target_id,details)
  values(auth.uid(),'account_status_changed','user',target_user::text,jsonb_build_object('status',new_status,'reason',reason_text,'until',until_time));
end
$$;

create or replace function public.staff_grant_entitlement(
  target_user uuid, entitlement_name text, expiry_time timestamptz default null, reason_text text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare ref text;
begin
  if not public.has_staff_permission('purchases.manage') then raise exception 'Permission denied'; end if;
  if length(trim(entitlement_name)) < 3 then raise exception 'Invalid entitlement'; end if;
  ref := gen_random_uuid()::text;
  insert into public.entitlements(user_id,entitlement_key,source,source_ref,expires_at,metadata)
  values(target_user,trim(entitlement_name),'staff',ref,expiry_time,jsonb_build_object('reason',reason_text,'actor',auth.uid()));
  insert into public.audit_logs(actor_id,action_type,target_type,target_id,details)
  values(auth.uid(),'entitlement_granted','user',target_user::text,jsonb_build_object('entitlement',entitlement_name,'expires',expiry_time,'reason',reason_text));
end
$$;

create or replace function public.staff_set_role(
  target_user uuid, new_role text, custom_permissions text[] default '{}'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare actor_role text;
declare target_role text;
begin
  if not public.has_staff_permission('staff.manage') then raise exception 'Permission denied'; end if;
  actor_role := public.current_staff_context()->>'role';
  select role into target_role from public.staff_members where user_id=target_user;

  if target_role='owner' and actor_role<>'owner' then raise exception 'Only the owner can change an owner account'; end if;
  if new_role in ('owner','admin') and actor_role<>'owner' then raise exception 'Only the owner can grant owner/admin access'; end if;

  if new_role='none' then
    delete from public.staff_members where user_id=target_user;
  elsif new_role in ('owner','admin','senior_staff','staff','developer','support') then
    insert into public.staff_members(user_id,role,permissions,active,created_by)
    values(target_user,new_role,coalesce(custom_permissions,'{}'::text[]),true,auth.uid())
    on conflict(user_id) do update set role=excluded.role,permissions=excluded.permissions,active=true,updated_at=now();
  else
    raise exception 'Invalid staff role';
  end if;

  insert into public.audit_logs(actor_id,action_type,target_type,target_id,details)
  values(auth.uid(),'staff_role_changed','user',target_user::text,jsonb_build_object('old_role',target_role,'new_role',new_role));
end
$$;

create or replace function public.staff_create_announcement(
  announcement_title text,
  announcement_body text,
  announcement_category text,
  announcement_audience jsonb,
  should_email boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare aid uuid;
declare recipient_count integer;
declare atype text;
declare avalue text;
begin
  if not public.has_staff_permission('announcements.write') then raise exception 'Permission denied'; end if;
  if length(trim(announcement_title)) < 2 or length(trim(announcement_body)) < 2 then raise exception 'Title and body required'; end if;

  atype := coalesce(announcement_audience->>'type','all');
  avalue := announcement_audience->>'value';

  insert into public.announcements(author_id,title,body,category,audience,send_email)
  values(auth.uid(),left(trim(announcement_title),120),left(trim(announcement_body),5000),coalesce(announcement_category,'Platform'),announcement_audience,should_email)
  returning id into aid;

  insert into public.inbox_messages(user_id,announcement_id)
  select p.id, aid
  from public.profiles p
  where p.account_status <> 'banned'
    and (
      atype='all'
      or (atype='premium' and p.premium_tier <> 'free' and (p.premium_until is null or p.premium_until>now()))
      or (atype='inactive30' and p.last_seen_at < now()-interval '30 days')
      or (atype='game' and exists(select 1 from public.activity_events a where a.user_id=p.id and a.game_id=avalue))
      or (atype='user' and p.id::text=avalue)
    )
  on conflict(user_id,announcement_id) do nothing;

  get diagnostics recipient_count = row_count;

  if should_email then
    insert into public.email_queue(user_id,announcement_id)
    select m.user_id, aid
    from public.inbox_messages m
    join public.profiles p on p.id=m.user_id
    where m.announcement_id=aid and p.email_marketing_opt_in=true
    on conflict(user_id,announcement_id) do nothing;
  end if;

  insert into public.audit_logs(actor_id,action_type,target_type,target_id,details)
  values(auth.uid(),'announcement_published','announcement',aid::text,jsonb_build_object('audience',announcement_audience,'recipients',recipient_count,'email',should_email));

  return jsonb_build_object(
    'announcement_id',aid,
    'recipients',recipient_count,
    'email_queued',(select count(*) from public.email_queue where announcement_id=aid and status='queued')
  );
end
$$;

-- =========================================================
-- RLS
-- =========================================================

alter table public.profiles enable row level security;
alter table public.legal_acceptances enable row level security;
alter table public.games enable row level security;
alter table public.game_saves enable row level security;
alter table public.save_backups enable row level security;
alter table public.activity_events enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.announcements enable row level security;
alter table public.inbox_messages enable row level security;
alter table public.email_queue enable row level security;
alter table public.products enable row level security;
alter table public.purchases enable row level security;
alter table public.entitlements enable row level security;
alter table public.subscriptions enable row level security;
alter table public.staff_members enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles for select to authenticated using (id=auth.uid() or public.has_staff_permission('users.read'));
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles for update to authenticated using (id=auth.uid()) with check (id=auth.uid());

drop policy if exists legal_self_read on public.legal_acceptances;
create policy legal_self_read on public.legal_acceptances for select to authenticated using (user_id=auth.uid());

drop policy if exists games_public_read on public.games;
create policy games_public_read on public.games for select using (status in ('live','development','maintenance') or public.has_staff_permission('games.read'));
drop policy if exists games_staff_write on public.games;
create policy games_staff_write on public.games for all to authenticated using (public.has_staff_permission('games.write')) with check (public.has_staff_permission('games.write'));

drop policy if exists saves_owner_all on public.game_saves;
drop policy if exists saves_owner_read on public.game_saves;
drop policy if exists saves_owner_insert on public.game_saves;
drop policy if exists saves_owner_update on public.game_saves;
drop policy if exists saves_owner_delete on public.game_saves;
create policy saves_owner_read on public.game_saves for select to authenticated
  using (user_id=auth.uid() or public.has_staff_permission('saves.read'));
create policy saves_owner_insert on public.game_saves for insert to authenticated
  with check (user_id=auth.uid() and public.account_is_active());
create policy saves_owner_update on public.game_saves for update to authenticated
  using (user_id=auth.uid() and public.account_is_active())
  with check (user_id=auth.uid() and public.account_is_active());
create policy saves_owner_delete on public.game_saves for delete to authenticated
  using (user_id=auth.uid() and public.account_is_active());

drop policy if exists backups_owner_read on public.save_backups;
create policy backups_owner_read on public.save_backups for select to authenticated using (user_id=auth.uid() or public.has_staff_permission('saves.read'));

drop policy if exists activity_owner_read on public.activity_events;
create policy activity_owner_read on public.activity_events for select to authenticated using (user_id=auth.uid() or public.has_staff_permission('analytics.read') or public.has_staff_permission('users.read'));
drop policy if exists activity_owner_insert on public.activity_events;
create policy activity_owner_insert on public.activity_events for insert to authenticated
  with check (user_id=auth.uid() and public.account_is_active());

drop policy if exists achievements_read on public.achievements;
create policy achievements_read on public.achievements for select using (active=true or public.has_staff_permission('games.read'));
drop policy if exists user_achievements_read on public.user_achievements;
create policy user_achievements_read on public.user_achievements for select to authenticated using (user_id=auth.uid() or public.has_staff_permission('users.read'));

drop policy if exists inbox_owner_read on public.inbox_messages;
create policy inbox_owner_read on public.inbox_messages for select to authenticated using (user_id=auth.uid() or public.has_staff_permission('announcements.write'));
drop policy if exists inbox_owner_update on public.inbox_messages;
create policy inbox_owner_update on public.inbox_messages for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
drop policy if exists announcements_recipient_read on public.announcements;
create policy announcements_recipient_read on public.announcements for select to authenticated using (
  public.has_staff_permission('announcements.write') or
  exists(select 1 from public.inbox_messages m where m.announcement_id=id and m.user_id=auth.uid())
);

drop policy if exists email_queue_staff_read on public.email_queue;
create policy email_queue_staff_read on public.email_queue for select to authenticated using (public.has_staff_permission('announcements.write'));

drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products for select using (active=true or public.has_staff_permission('store.manage'));
drop policy if exists products_staff_write on public.products;
create policy products_staff_write on public.products for all to authenticated using (public.has_staff_permission('store.manage')) with check (public.has_staff_permission('store.manage'));

drop policy if exists purchases_owner_read on public.purchases;
create policy purchases_owner_read on public.purchases for select to authenticated using (user_id=auth.uid() or public.has_staff_permission('purchases.read'));
drop policy if exists entitlements_owner_read on public.entitlements;
create policy entitlements_owner_read on public.entitlements for select to authenticated using (user_id=auth.uid() or public.has_staff_permission('purchases.read'));
drop policy if exists subscriptions_owner_read on public.subscriptions;
create policy subscriptions_owner_read on public.subscriptions for select to authenticated using (user_id=auth.uid() or public.has_staff_permission('purchases.read'));

drop policy if exists staff_read_policy on public.staff_members;
create policy staff_read_policy on public.staff_members for select to authenticated using (user_id=auth.uid() or public.has_staff_permission('staff.read'));

drop policy if exists moderation_staff_read on public.moderation_actions;
create policy moderation_staff_read on public.moderation_actions for select to authenticated using (public.has_staff_permission('users.read'));
drop policy if exists audit_staff_read on public.audit_logs;
create policy audit_staff_read on public.audit_logs for select to authenticated using (public.has_staff_permission('audit.read'));

-- =========================================================
-- Avatar storage
-- =========================================================

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('avatars','avatars',true,2097152,array['image/png','image/jpeg','image/webp'])
on conflict(id) do update set public=true,file_size_limit=2097152,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists avatar_public_read on storage.objects;
create policy avatar_public_read on storage.objects for select using (bucket_id='avatars');
drop policy if exists avatar_owner_insert on storage.objects;
create policy avatar_owner_insert on storage.objects for insert to authenticated with check (
  bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text
);
drop policy if exists avatar_owner_update on storage.objects;
create policy avatar_owner_update on storage.objects for update to authenticated using (
  bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text
) with check (
  bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text
);
drop policy if exists avatar_owner_delete on storage.objects;
create policy avatar_owner_delete on storage.objects for delete to authenticated using (
  bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text
);

-- =========================================================
-- Seed Version 1 content
-- =========================================================

insert into public.games(id,title,version_label,status,play_url,cover_url,description)
values(
  'stable-empire','Stable Empire','Version 1','live',
  'https://itzreynolds.github.io/stable-empire/',
  'assets/img/stable-empire-cover.png',
  'Build the stable. Raise the bloodline. Grow the empire.'
)
on conflict(id) do update set
  title=excluded.title,version_label='Version 1',status=excluded.status,
  play_url=excluded.play_url,cover_url=excluded.cover_url,description=excluded.description;

insert into public.achievements(code,game_id,name,description,icon,xp,sort_order,metadata)
values
('starfall_first_login',null,'Welcome to Starfall','Sign in to your Starfall account for the first time.','★',50,10,'{"event":"first_login"}'),
('starfall_profile_ready',null,'Known Across the Stars','Complete your Starfall player profile.','🌟',75,20,'{"event":"profile_ready"}'),
('starfall_first_game',null,'First World','Launch your first Starfall game while signed in.','🎮',100,30,'{"event":"game_launch"}'),
('stable_empire_first_launch','stable-empire','Welcome to the Stable','Launch Stable Empire through your connected Starfall account.','🐎',100,100,'{"event":"game_launch"}'),
('stable_empire_cloud_save','stable-empire','Saved Among the Stars','Create your first Stable Empire cloud save.','☁️',150,110,'{"event":"cloud_save"}')
on conflict(code) do update set name=excluded.name,description=excluded.description,icon=excluded.icon,xp=excluded.xp,metadata=excluded.metadata;

insert into public.products(id,name,description,product_type,game_id,stripe_price_id,price_display,entitlements,active,sort_order)
values(
  'starfall-premium-monthly',
  'Starfall Premium',
  'Optional platform membership. Configure the final perks and Stripe price before activation.',
  'subscription',null,null,'Price not configured',
  '["starfall.premium"]'::jsonb,false,10
)
on conflict(id) do nothing;


-- =========================================================
-- Explicit database grants (least privilege for browser users)
-- =========================================================

grant usage on schema public to anon, authenticated;

grant select on public.games, public.achievements to anon, authenticated;
grant select on public.products to anon, authenticated;

grant select on public.profiles to authenticated;
revoke update on public.profiles from authenticated;
grant update(display_name,handle,avatar_url,bio,favorite_game,email_marketing_opt_in,last_seen_at,updated_at)
  on public.profiles to authenticated;

grant select on public.legal_acceptances to authenticated;

grant select,insert,update,delete on public.game_saves to authenticated;
grant select on public.save_backups to authenticated;
grant select,insert on public.activity_events to authenticated;
grant usage,select on sequence public.activity_events_id_seq to authenticated;

grant select on public.user_achievements to authenticated;
grant select on public.announcements to authenticated;
grant select on public.inbox_messages to authenticated;
grant select on public.email_queue to authenticated;
revoke update on public.inbox_messages from authenticated;
grant update(read_at) on public.inbox_messages to authenticated;

grant select on public.purchases, public.entitlements, public.subscriptions to authenticated;
grant select on public.staff_members, public.moderation_actions, public.audit_logs to authenticated;
grant usage,select on sequence public.audit_logs_id_seq to authenticated;

-- Product/game writes are available only where RLS confirms a matching staff permission.
grant insert,update,delete on public.products, public.games to authenticated;

revoke all on function public.staff_dashboard_stats() from public;
revoke all on function public.staff_search_users(text,integer,integer) from public;
revoke all on function public.staff_user_detail(uuid) from public;
revoke all on function public.staff_set_account_status(uuid,text,text,timestamptz) from public;
revoke all on function public.staff_grant_entitlement(uuid,text,timestamptz,text) from public;
revoke all on function public.staff_set_role(uuid,text,text[]) from public;
revoke all on function public.staff_create_announcement(text,text,text,jsonb,boolean) from public;

grant execute on function public.staff_dashboard_stats() to authenticated;
grant execute on function public.staff_search_users(text,integer,integer) to authenticated;
grant execute on function public.staff_user_detail(uuid) to authenticated;
grant execute on function public.staff_set_account_status(uuid,text,text,timestamptz) to authenticated;
grant execute on function public.staff_grant_entitlement(uuid,text,timestamptz,text) to authenticated;
grant execute on function public.staff_set_role(uuid,text,text[]) to authenticated;
grant execute on function public.staff_create_announcement(text,text,text,jsonb,boolean) to authenticated;
