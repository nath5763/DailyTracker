create extension if not exists pgcrypto;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  share_id uuid not null unique default gen_random_uuid(),
  display_name text not null check (char_length(display_name) between 2 and 32),
  avatar_color text not null default '#dfff4f' check (avatar_color in ('#dfff4f','#ff8db6','#a8c7ff','#ffba6b','#bba7ff')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.games (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  source_url text not null,
  release_timezone text not null,
  ranking_direction text not null check (ranking_direction in ('lower','higher')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.leaderboards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(user_id) on delete cascade,
  name text not null check (char_length(name) between 2 and 48),
  created_at timestamptz not null default now()
);

create table public.leaderboard_members (
  leaderboard_id uuid not null references public.leaderboards(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  added_by uuid not null references public.profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (leaderboard_id, user_id)
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  game_id uuid not null references public.games(id) on delete restrict,
  puzzle_key text not null check (char_length(puzzle_key) between 1 and 80),
  played_on date not null,
  primary_score numeric not null check (primary_score >= 1),
  metrics jsonb not null default '{}'::jsonb,
  raw_text text not null check (char_length(raw_text) between 1 and 10000),
  parser_version integer not null check (parser_version > 0),
  created_at timestamptz not null default now(),
  unique (user_id, game_id, puzzle_key)
);

create index submissions_user_game_date_idx on public.submissions(user_id, game_id, played_on desc);
create index submissions_game_date_score_idx on public.submissions(game_id, played_on desc, primary_score);
create index leaderboard_members_user_idx on public.leaderboard_members(user_id, leaderboard_id);

insert into public.games (slug, name, source_url, release_timezone, ranking_direction)
values ('fermi', 'Fermi.gg', 'https://fermi.gg', 'America/New_York', 'lower')
on conflict (slug) do nothing;

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger profiles_touch_updated_at before update on public.profiles for each row execute function public.touch_updated_at();

create or replace function public.is_leaderboard_member(board uuid)
returns boolean language sql stable security definer set search_path = public set row_security = off as $$
  select exists(select 1 from public.leaderboard_members where leaderboard_id = board and user_id = auth.uid());
$$;

create or replace function public.owns_leaderboard(board uuid)
returns boolean language sql stable security definer set search_path = public set row_security = off as $$
  select exists(select 1 from public.leaderboards where id = board and owner_id = auth.uid());
$$;

create or replace function public.shares_leaderboard(other_account uuid)
returns boolean language sql stable security definer set search_path = public set row_security = off as $$
  select exists(
    select 1 from public.leaderboard_members mine
    join public.leaderboard_members theirs on theirs.leaderboard_id = mine.leaderboard_id
    where mine.user_id = auth.uid() and theirs.user_id = other_account
  );
$$;

create or replace function public.complete_onboarding(display_name_input text, avatar_color_input text)
returns uuid language plpgsql security definer set search_path = public set row_security = off as $$
declare account uuid := auth.uid(); board uuid; shared uuid;
begin
  if account is null then raise exception 'authentication required'; end if;
  if char_length(trim(display_name_input)) not between 2 and 32 then raise exception 'invalid display name'; end if;
  if avatar_color_input not in ('#dfff4f','#ff8db6','#a8c7ff','#ffba6b','#bba7ff') then raise exception 'invalid color'; end if;
  insert into public.profiles(user_id, display_name, avatar_color) values(account, trim(display_name_input), avatar_color_input)
  on conflict (user_id) do nothing returning share_id into shared;
  if shared is null then select share_id into shared from public.profiles where user_id = account; end if;
  if not exists(select 1 from public.leaderboards where owner_id = account) then
    insert into public.leaderboards(owner_id, name) values(account, 'My Friends') returning id into board;
    insert into public.leaderboard_members(leaderboard_id, user_id, added_by) values(board, account, account);
  end if;
  return shared;
end;
$$;

create or replace function public.create_leaderboard(name_input text)
returns uuid language plpgsql security definer set search_path = public set row_security = off as $$
declare account uuid := auth.uid(); board uuid;
begin
  if account is null or not exists(select 1 from public.profiles where user_id = account) then raise exception 'profile required'; end if;
  if char_length(trim(name_input)) not between 2 and 48 then raise exception 'invalid name'; end if;
  insert into public.leaderboards(owner_id, name) values(account, trim(name_input)) returning id into board;
  insert into public.leaderboard_members(leaderboard_id, user_id, added_by) values(board, account, account);
  return board;
end;
$$;

create or replace function public.add_leaderboard_member(leaderboard_input uuid, share_id_input uuid)
returns void language plpgsql security definer set search_path = public set row_security = off as $$
declare account uuid := auth.uid(); target uuid;
begin
  if not public.owns_leaderboard(leaderboard_input) then raise exception 'not authorized'; end if;
  select user_id into target from public.profiles where share_id = share_id_input;
  if target is null then raise exception 'account not found'; end if;
  insert into public.leaderboard_members(leaderboard_id, user_id, added_by) values(leaderboard_input, target, account);
end;
$$;

create or replace function public.remove_leaderboard_member(leaderboard_input uuid, user_id_input uuid)
returns void language plpgsql security definer set search_path = public set row_security = off as $$
declare account uuid := auth.uid(); owner uuid;
begin
  if not public.owns_leaderboard(leaderboard_input) then raise exception 'not authorized'; end if;
  select owner_id into owner from public.leaderboards where id = leaderboard_input;
  if user_id_input = owner then raise exception 'owner cannot be removed'; end if;
  delete from public.leaderboard_members where leaderboard_id = leaderboard_input and user_id = user_id_input;
end;
$$;

revoke all on function public.complete_onboarding(text,text) from public;
revoke all on function public.create_leaderboard(text) from public;
revoke all on function public.add_leaderboard_member(uuid,uuid) from public;
revoke all on function public.remove_leaderboard_member(uuid,uuid) from public;
revoke all on function public.is_leaderboard_member(uuid) from public;
revoke all on function public.owns_leaderboard(uuid) from public;
revoke all on function public.shares_leaderboard(uuid) from public;
grant execute on function public.complete_onboarding(text,text) to authenticated;
grant execute on function public.create_leaderboard(text) to authenticated;
grant execute on function public.add_leaderboard_member(uuid,uuid) to authenticated;
grant execute on function public.remove_leaderboard_member(uuid,uuid) to authenticated;
grant execute on function public.is_leaderboard_member(uuid) to authenticated;
grant execute on function public.owns_leaderboard(uuid) to authenticated;
grant execute on function public.shares_leaderboard(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.leaderboards enable row level security;
alter table public.leaderboard_members enable row level security;
alter table public.submissions enable row level security;

create policy profiles_read_shared on public.profiles for select to authenticated using (user_id = auth.uid() or public.shares_leaderboard(user_id));
create policy profiles_update_self on public.profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy games_read on public.games for select to authenticated using (true);
create policy leaderboards_read_members on public.leaderboards for select to authenticated using (public.is_leaderboard_member(id));
create policy leaderboards_update_owner on public.leaderboards for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy leaderboards_delete_owner on public.leaderboards for delete to authenticated using (owner_id = auth.uid());
create policy members_read_group on public.leaderboard_members for select to authenticated using (public.is_leaderboard_member(leaderboard_id));
create policy submissions_read_shared on public.submissions for select to authenticated using (user_id = auth.uid() or public.shares_leaderboard(user_id));
create policy submissions_insert_self on public.submissions for insert to authenticated with check (user_id = auth.uid());

grant select, update on public.profiles to authenticated;
grant select on public.games to authenticated;
grant select, update, delete on public.leaderboards to authenticated;
grant select on public.leaderboard_members to authenticated;
grant select, insert on public.submissions to authenticated;
