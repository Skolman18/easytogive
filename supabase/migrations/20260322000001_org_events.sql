-- supabase/migrations/20260322000001_org_events.sql

create table org_events (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references organizations(id) on delete cascade,
  event_type text not null check (event_type in ('card_click', 'profile_view')),
  created_at timestamptz not null default now()
);

create index org_events_org_id_created_at_idx
  on org_events (org_id, created_at desc);

alter table org_events enable row level security;

-- Anyone can insert (anonymous tracking)
create policy "Public insert on org_events"
  on org_events for insert
  with check (true);

-- Org owners can only read their own org's events
create policy "Org owners can read their own events"
  on org_events for select
  using (
    org_id in (
      select id from organizations where owner_user_id = auth.uid()
    )
  );
