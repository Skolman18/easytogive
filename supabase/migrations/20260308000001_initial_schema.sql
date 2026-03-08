-- ================================================================
-- EasyToGive — Initial Schema
-- ================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ----------------------------------------------------------------
-- ORGANIZATIONS
-- ----------------------------------------------------------------
create type org_category as enum (
  'churches',
  'animal-rescue',
  'nonprofits',
  'education',
  'environment',
  'local'
);

create table if not exists organizations (
  id            text primary key,          -- slug, e.g. 'grace-community-church'
  name          text        not null,
  tagline       text        not null default '',
  description   text        not null default '',
  category      org_category not null,
  location      text        not null default '',
  raised        integer     not null default 0,
  goal          integer     not null default 0,
  donors        integer     not null default 0,
  verified      boolean     not null default false,
  featured      boolean     not null default false,
  image_url     text        not null default '',
  cover_url     text        not null default '',
  ein           text        not null default '',
  founded       integer,
  website       text        not null default '',
  impact_stats  jsonb       not null default '[]',
  tags          text[]      not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- USERS (extends Supabase auth.users)
-- ----------------------------------------------------------------
create table if not exists users (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text        not null default '',
  email         text        not null default '',
  phone         text        not null default '',
  avatar_url    text        not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- DONATIONS
-- ----------------------------------------------------------------
create table if not exists donations (
  id            uuid        primary key default uuid_generate_v4(),
  user_id       uuid        references users(id) on delete set null,
  org_id        text        not null references organizations(id),
  amount        integer     not null check (amount > 0),  -- cents
  receipt_id    text        not null,
  donated_at    timestamptz not null default now()
);

create index if not exists donations_user_id_idx on donations(user_id);
create index if not exists donations_org_id_idx  on donations(org_id);
create index if not exists donations_receipt_idx on donations(receipt_id);

-- ----------------------------------------------------------------
-- PORTFOLIO ALLOCATIONS
-- ----------------------------------------------------------------
create table if not exists portfolio_allocations (
  id            uuid        primary key default uuid_generate_v4(),
  user_id       uuid        not null references users(id) on delete cascade,
  org_id        text        not null references organizations(id),
  percentage    integer     not null check (percentage >= 0 and percentage <= 100),
  color         text        not null default '#1a7a4a',
  sort_order    integer     not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, org_id)
);

create index if not exists portfolio_user_id_idx on portfolio_allocations(user_id);

-- ----------------------------------------------------------------
-- WATCHLIST
-- ----------------------------------------------------------------
create table if not exists watchlist (
  id            uuid        primary key default uuid_generate_v4(),
  user_id       uuid        not null references users(id) on delete cascade,
  org_id        text        not null references organizations(id),
  created_at    timestamptz not null default now(),
  unique (user_id, org_id)
);

create index if not exists watchlist_user_id_idx on watchlist(user_id);

-- ----------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ----------------------------------------------------------------
alter table organizations         enable row level security;
alter table users                 enable row level security;
alter table donations             enable row level security;
alter table portfolio_allocations enable row level security;
alter table watchlist             enable row level security;

-- Organizations: anyone can read; only service role can write
create policy "Organizations are publicly readable"
  on organizations for select
  using (true);

-- Users: only the owner can read/update their own row
create policy "Users can read own profile"
  on users for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on users for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on users for insert
  with check (auth.uid() = id);

-- Donations: users can read/insert their own
create policy "Users can read own donations"
  on donations for select
  using (auth.uid() = user_id);

create policy "Users can insert own donations"
  on donations for insert
  with check (auth.uid() = user_id);

-- Portfolio: users manage their own allocations
create policy "Users can read own portfolio"
  on portfolio_allocations for select
  using (auth.uid() = user_id);

create policy "Users can insert own portfolio"
  on portfolio_allocations for insert
  with check (auth.uid() = user_id);

create policy "Users can update own portfolio"
  on portfolio_allocations for update
  using (auth.uid() = user_id);

create policy "Users can delete own portfolio"
  on portfolio_allocations for delete
  using (auth.uid() = user_id);

-- Watchlist: users manage their own watchlist
create policy "Users can read own watchlist"
  on watchlist for select
  using (auth.uid() = user_id);

create policy "Users can insert own watchlist"
  on watchlist for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own watchlist"
  on watchlist for delete
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------
-- SEED: Organizations
-- ----------------------------------------------------------------
insert into organizations
  (id, name, tagline, description, category, location, raised, goal, donors, verified, featured, image_url, cover_url, ein, founded, website, impact_stats, tags)
values
  (
    'grace-community-church',
    'Grace Community Church',
    'Serving our neighbors since 1978',
    'Grace Community Church has been a cornerstone of our city for over four decades. We run weekly food pantries, after-school tutoring programs, and emergency housing assistance for families in crisis. Every dollar given goes directly to community programs with zero administrative overhead taken from donations.',
    'churches',
    'Austin, TX',
    128400, 200000, 847, true, true,
    'https://images.unsplash.com/photo-1438032005730-c779502df39b?w=600&q=80',
    'https://images.unsplash.com/photo-1519817650390-64a93db51149?w=1200&q=80',
    '74-1234567', 1978, 'https://gracecc.org',
    '[{"label":"Meals served monthly","value":"3,200+"},{"label":"Families housed","value":"124"},{"label":"Students tutored","value":"89"}]',
    array['food','housing','community','youth']
  ),
  (
    'second-chance-rescue',
    'Second Chance Animal Rescue',
    'Every animal deserves a loving home',
    'We are a no-kill shelter dedicated to rescuing abandoned and abused animals across the tri-county area. Our foster network of 200+ volunteers has helped place over 12,000 animals into permanent homes since 2005. We also offer low-cost spay/neuter clinics and pet food banks for families facing hardship.',
    'animal-rescue',
    'Nashville, TN',
    67200, 100000, 1203, true, true,
    'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600&q=80',
    'https://images.unsplash.com/photo-1601758125946-6ec2ef64daf8?w=1200&q=80',
    '62-2345678', 2005, 'https://secondchancerescue.org',
    '[{"label":"Animals rescued yearly","value":"1,400+"},{"label":"Adoption rate","value":"98%"},{"label":"Foster volunteers","value":"200+"}]',
    array['animals','shelter','foster','no-kill']
  ),
  (
    'clean-rivers-project',
    'Clean Rivers Project',
    'Protecting waterways for future generations',
    'The Clean Rivers Project organizes watershed cleanups, advocates for stronger water quality legislation, and runs environmental education programs in K-12 schools. Our citizen science network monitors water quality at 47 sites across the state, providing critical data to regulatory agencies.',
    'environment',
    'Portland, OR',
    94100, 150000, 2341, true, true,
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80',
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=80',
    '93-3456789', 2011, 'https://cleanriversproject.org',
    '[{"label":"Pounds of trash removed","value":"180,000"},{"label":"Monitoring sites","value":"47"},{"label":"Students reached","value":"8,500"}]',
    array['water','cleanup','advocacy','education']
  ),
  (
    'literacy-first',
    'Literacy First Foundation',
    'Reading opens every door',
    'Literacy First provides free tutoring, books, and reading programs to underserved children ages 5-18. Our signature Summer Reading Camp has helped over 6,000 children gain grade-level reading skills since 2008. We partner with 34 public schools and 12 libraries to deliver programming where it''s needed most.',
    'education',
    'Chicago, IL',
    211500, 300000, 3892, true, true,
    'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&q=80',
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&q=80',
    '36-4567890', 2008, 'https://literacyfirst.org',
    '[{"label":"Children served yearly","value":"4,200"},{"label":"Reading improvement avg","value":"2.1 grade levels"},{"label":"Books distributed","value":"95,000+"}]',
    array['reading','youth','tutoring','schools']
  ),
  (
    'neighbors-helping-neighbors',
    'Neighbors Helping Neighbors',
    'Building community, one family at a time',
    'A hyperlocal nonprofit serving the east side of Denver through emergency rent assistance, utility bill support, and a free store stocked with household essentials. We believe every neighbor deserves dignity, and we provide wraparound support without bureaucratic barriers.',
    'local',
    'Denver, CO',
    43800, 75000, 612, true, false,
    'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=600&q=80',
    'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=1200&q=80',
    '84-5678901', 2016, 'https://neighborshelpingneighbors.org',
    '[{"label":"Families assisted monthly","value":"340"},{"label":"Evictions prevented","value":"127"},{"label":"Volunteer hours logged","value":"11,400"}]',
    array['rent','utilities','emergency','community']
  ),
  (
    'highland-presbyterian',
    'Highland Presbyterian Church',
    'Faith in action, love in service',
    'Highland Presbyterian is a welcoming congregation with a deep commitment to justice and mercy. Our outreach arm operates a weekly meal service for unhoused neighbors, a refugee resettlement program, and a community garden that donates 100% of its harvest to local food banks.',
    'churches',
    'Louisville, KY',
    88900, 120000, 534, true, false,
    'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&q=80',
    'https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?w=1200&q=80',
    '61-6789012', 1923, 'https://highlandpres.org',
    '[{"label":"Meals served weekly","value":"280"},{"label":"Refugees resettled","value":"34 families"},{"label":"Pounds of produce donated","value":"4,200"}]',
    array['refugee','food','garden','community']
  ),
  (
    'stem-for-all',
    'STEM for All Initiative',
    'Closing the opportunity gap in science and tech',
    'STEM for All provides free robotics clubs, coding bootcamps, and science fair mentorship to Title I schools. Our hardware lending library lets students borrow laptops, microscopes, and lab equipment. Over 90% of our alumni report pursuing STEM-related studies or careers.',
    'education',
    'Atlanta, GA',
    156700, 250000, 1876, true, false,
    'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=600&q=80',
    'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200&q=80',
    '58-7890123', 2013, 'https://stemforall.org',
    '[{"label":"Students enrolled yearly","value":"2,800"},{"label":"Schools partnered","value":"41"},{"label":"STEM alumni in college","value":"91%"}]',
    array['coding','robotics','youth','STEM']
  ),
  (
    'urban-tree-canopy',
    'Urban Tree Canopy Alliance',
    'Greening our cities, cooling our streets',
    'We plant, maintain, and protect trees in urban neighborhoods that lack green space — with a focus on heat islands and communities with limited access to parks. Each tree is maintained for five years to ensure survival. We''ve planted 42,000 trees across 18 cities and counting.',
    'environment',
    'Phoenix, AZ',
    72300, 110000, 988, true, false,
    'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=600&q=80',
    'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1200&q=80',
    '85-8901234', 2017, 'https://urbantreecanopy.org',
    '[{"label":"Trees planted","value":"42,000"},{"label":"Cities served","value":"18"},{"label":"5-year survival rate","value":"87%"}]',
    array['trees','urban','heat','environment']
  ),
  (
    'paws-and-claws',
    'Paws & Claws Sanctuary',
    'Sanctuary for animals great and small',
    'A licensed wildlife rehabilitation center and domestic animal sanctuary in the Texas Hill Country. We care for injured wildlife, exotic animals surrendered from unsuitable situations, and senior dogs and cats who have trouble finding adopters. Our acreage gives every animal room to heal.',
    'animal-rescue',
    'Fredericksburg, TX',
    38400, 80000, 741, false, false,
    'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=600&q=80',
    'https://images.unsplash.com/photo-1425082661705-1834bfd09dca?w=1200&q=80',
    'Pending', 2020, 'https://pawsandclaws.org',
    '[{"label":"Animals in care","value":"120"},{"label":"Wildlife rehabbed yearly","value":"600+"},{"label":"Acres of sanctuary","value":"34"}]',
    array['wildlife','sanctuary','senior pets','rehab']
  ),
  (
    'eastside-community-fund',
    'Eastside Community Fund',
    'Investing in people, not programs',
    'The Eastside Community Fund gives unrestricted cash grants directly to low-income residents experiencing financial emergencies — medical bills, car repairs, childcare gaps — with no strings attached. We trust our neighbors to know what they need. 95 cents of every dollar goes directly to recipients.',
    'local',
    'Seattle, WA',
    189200, 250000, 4231, true, false,
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&q=80',
    'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=1200&q=80',
    '91-9012345', 2019, 'https://eastsidecommunityfund.org',
    '[{"label":"Grants distributed","value":"$1.2M"},{"label":"Residents helped","value":"2,100"},{"label":"Overhead rate","value":"5%"}]',
    array['direct cash','emergency','trust-based']
  ),
  (
    'bethel-tabernacle',
    'Bethel Tabernacle Ministries',
    'Hope for the whole person',
    'Bethel Tabernacle runs one of the largest urban ministry networks in the mid-Atlantic, including addiction recovery programs, transitional housing, a GED prep academy, and a community health clinic. We serve everyone regardless of faith background, and every program is free of charge.',
    'churches',
    'Baltimore, MD',
    312000, 500000, 2109, true, false,
    'https://images.unsplash.com/photo-1460355976672-71b23b8be6bc?w=600&q=80',
    'https://images.unsplash.com/photo-1477281765962-ef34e8bb0967?w=1200&q=80',
    '52-0123456', 1987, 'https://betheltab.org',
    '[{"label":"In recovery program","value":"380"},{"label":"GED graduates yearly","value":"95"},{"label":"Clinic visits annually","value":"7,400"}]',
    array['recovery','housing','health','education']
  ),
  (
    'ocean-keepers',
    'Ocean Keepers Alliance',
    'Clean oceans, thriving seas',
    'Ocean Keepers organizes beach cleanups, ocean plastic removal expeditions, and advocates for single-use plastic bans at the local and state level. Our underwater cleanup dives have removed over 80,000 pounds of ghost gear — abandoned fishing nets that entangle marine wildlife.',
    'environment',
    'San Diego, CA',
    118600, 180000, 3102, true, false,
    'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=600&q=80',
    'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&q=80',
    '95-1234560', 2014, 'https://oceankeepers.org',
    '[{"label":"Ghost gear removed","value":"80,000 lbs"},{"label":"Beach miles cleaned","value":"340"},{"label":"Plastic bans passed","value":"12"}]',
    array['ocean','plastic','marine','policy']
  )
on conflict (id) do update set
  name        = excluded.name,
  tagline     = excluded.tagline,
  description = excluded.description,
  category    = excluded.category,
  location    = excluded.location,
  raised      = excluded.raised,
  goal        = excluded.goal,
  donors      = excluded.donors,
  verified    = excluded.verified,
  featured    = excluded.featured,
  image_url   = excluded.image_url,
  cover_url   = excluded.cover_url,
  ein         = excluded.ein,
  founded     = excluded.founded,
  website     = excluded.website,
  impact_stats = excluded.impact_stats,
  tags        = excluded.tags,
  updated_at  = now();
