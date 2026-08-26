-- Movementum Friends V1. Run through Supabase migrations or the SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.social_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint social_profiles_username_format check (username = lower(username) and username ~ '^[a-z0-9_]{3,20}$'),
  constraint social_profiles_display_name_length check (char_length(btrim(display_name)) between 1 and 40)
);
create unique index if not exists social_profiles_username_unique on public.social_profiles (lower(username));
create index if not exists social_profiles_username_prefix on public.social_profiles (username text_pattern_ops);

create type public.friendship_status as enum ('pending', 'accepted');
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status public.friendship_status not null default 'pending',
  pair_low uuid generated always as (least(requester_id, addressee_id)) stored,
  pair_high uuid generated always as (greatest(requester_id, addressee_id)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friendships_not_self check (requester_id <> addressee_id),
  constraint friendships_unique_pair unique (pair_low, pair_high)
);
create index if not exists friendships_requester_idx on public.friendships (requester_id, status);
create index if not exists friendships_addressee_idx on public.friendships (addressee_id, status);

create type public.social_today_status as enum ('inactive', 'active-unclassified', 'workout', 'light');
create table if not exists public.social_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  level integer not null check (level >= 1),
  current_streak integer not null check (current_streak >= 0),
  today_status public.social_today_status not null,
  today_perfect boolean not null default false,
  today_xp integer not null check (today_xp >= 0),
  daily_target integer not null check (daily_target > 0),
  snapshot_date date not null,
  updated_at timestamptz not null default now()
);

alter table public.social_profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.social_progress enable row level security;

create policy "authenticated users discover social profiles"
on public.social_profiles for select to authenticated using (true);
create policy "users insert their own social profile"
on public.social_profiles for insert to authenticated with check (user_id = auth.uid());
create policy "users update their own social profile"
on public.social_profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "participants read friendships"
on public.friendships for select to authenticated
using (requester_id = auth.uid() or addressee_id = auth.uid());

create policy "users read own or accepted friend progress"
on public.social_progress for select to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester_id = auth.uid() and f.addressee_id = social_progress.user_id)
        or (f.addressee_id = auth.uid() and f.requester_id = social_progress.user_id))
  )
);
create policy "users insert their own social progress"
on public.social_progress for insert to authenticated with check (user_id = auth.uid());
create policy "users update their own social progress"
on public.social_progress for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke insert, update, delete on public.friendships from anon, authenticated;
grant select on public.social_profiles, public.friendships, public.social_progress to authenticated;
grant insert, update on public.social_profiles, public.social_progress to authenticated;

create or replace function public.send_friend_request(target_user_id uuid)
returns public.friendships
language plpgsql security definer set search_path = public, pg_temp
as $$
declare result public.friendships;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if target_user_id = auth.uid() then raise exception 'cannot friend yourself' using errcode = '22023'; end if;
  if not exists (select 1 from public.social_profiles where user_id = target_user_id) then raise exception 'profile not found' using errcode = 'P0002'; end if;
  insert into public.friendships (requester_id, addressee_id)
  values (auth.uid(), target_user_id)
  on conflict (pair_low, pair_high) do update set updated_at = public.friendships.updated_at
  returning * into result;
  return result;
end $$;

create or replace function public.accept_friend_request(friendship_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.friendships set status = 'accepted', updated_at = now()
  where id = friendship_id and addressee_id = auth.uid() and status = 'pending';
  if not found then raise exception 'request not found' using errcode = 'P0002'; end if;
end $$;

create or replace function public.decline_friend_request(friendship_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  delete from public.friendships where id = friendship_id and addressee_id = auth.uid() and status = 'pending';
  if not found then raise exception 'request not found' using errcode = 'P0002'; end if;
end $$;

create or replace function public.cancel_friend_request(friendship_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  delete from public.friendships where id = friendship_id and requester_id = auth.uid() and status = 'pending';
  if not found then raise exception 'request not found' using errcode = 'P0002'; end if;
end $$;

create or replace function public.remove_friend(friendship_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  delete from public.friendships
  where id = friendship_id and status = 'accepted' and (requester_id = auth.uid() or addressee_id = auth.uid());
  if not found then raise exception 'friendship not found' using errcode = 'P0002'; end if;
end $$;

revoke all on function public.send_friend_request(uuid) from public;
revoke all on function public.accept_friend_request(uuid) from public;
revoke all on function public.decline_friend_request(uuid) from public;
revoke all on function public.cancel_friend_request(uuid) from public;
revoke all on function public.remove_friend(uuid) from public;
grant execute on function public.send_friend_request(uuid), public.accept_friend_request(uuid), public.decline_friend_request(uuid), public.cancel_friend_request(uuid), public.remove_friend(uuid) to authenticated;
