-- Run AFTER you create your own Starfall account.
-- Replace the email below with the email address used for YOUR Starfall account.
-- This makes that account the protected Owner account.

do $$
declare owner_id uuid;
begin
  select id into owner_id from auth.users where lower(email)=lower('YOUR_OWNER_EMAIL_HERE');
  if owner_id is null then
    raise exception 'No Starfall account found for that email. Create and confirm the account first.';
  end if;

  insert into public.staff_members(user_id,role,permissions,active,created_by)
  values(owner_id,'owner',array['*']::text[],true,owner_id)
  on conflict(user_id) do update set role='owner',permissions=array['*']::text[],active=true,updated_at=now();

  insert into public.audit_logs(actor_id,action_type,target_type,target_id,details)
  values(owner_id,'owner_bootstrapped','user',owner_id::text,'{"source":"manual bootstrap"}'::jsonb);
end $$;
