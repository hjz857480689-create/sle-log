-- SLE记录簿 1.0 — Supabase schema
-- Run this file once in Supabase Dashboard -> SQL Editor.
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  nickname text not null default '新用户',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists user_app_state_set_updated_at on public.user_app_state;
create trigger user_app_state_set_updated_at before update on public.user_app_state
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, username, nickname)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'username', new.id::text), coalesce(new.raw_user_meta_data ->> 'nickname', '新用户'))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.user_app_state enable row level security;

drop policy if exists "users_select_own_profile" on public.profiles;
create policy "users_select_own_profile" on public.profiles
for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "users_update_own_profile" on public.profiles;
create policy "users_update_own_profile" on public.profiles
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "users_select_own_state" on public.user_app_state;
create policy "users_select_own_state" on public.user_app_state
for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "users_insert_own_state" on public.user_app_state;
create policy "users_insert_own_state" on public.user_app_state
for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "users_update_own_state" on public.user_app_state;
create policy "users_update_own_state" on public.user_app_state
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
drop policy if exists "users_delete_own_state" on public.user_app_state;
create policy "users_delete_own_state" on public.user_app_state
for delete to authenticated using ((select auth.uid()) = user_id);

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.user_app_state to authenticated;
revoke all on public.profiles from anon;
revoke all on public.user_app_state from anon;

-- Allows a signed-in user to delete only their own Auth user.
create or replace function public.delete_current_user()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_user uuid := auth.uid();
begin
  if target_user is null then raise exception 'Authentication required'; end if;
  delete from auth.users where id = target_user;
end;
$$;

revoke all on function public.delete_current_user() from public, anon;
grant execute on function public.delete_current_user() to authenticated;
