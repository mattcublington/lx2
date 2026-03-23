# Club Platform Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `apps/club` — the club.lx2.golf console — from scaffold through Phase 1: club auth, member roster, tee sheet config, tee sheet management, online booking (members-only), competition calendar, and admin dashboard.

**Architecture:** New `apps/club` Next.js 15 app in the existing Turborepo monorepo, sharing `@lx2/db`, `@lx2/ui`, `@lx2/scoring` packages. Same Supabase project, new tables with RLS policies separating club admin access from golfer access. New database types added to `packages/db`. Deployed to `club.lx2.golf` via Vercel.

**Tech Stack:** Next.js 15 (App Router), Supabase SSR (`@supabase/ssr`), Tailwind CSS, TypeScript, Turborepo, shadcn/ui components (optional — follow apps/web patterns first)

---

## File Map

### New files — `apps/club/`
```
apps/club/
  package.json
  next.config.ts
  tailwind.config.ts
  tsconfig.json
  postcss.config.mjs
  .env.example
  src/
    app/
      layout.tsx                          # Root layout — dark club theme
      page.tsx                            # Redirect to /dashboard or /auth/login
      auth/
        login/page.tsx                    # Club staff login
        callback/route.ts                 # OAuth callback
      (console)/
        layout.tsx                        # Sidebar nav wrapper (route group)
        dashboard/
          page.tsx                        # Admin command centre
        members/
        page.tsx                          # Member roster list + CSV import
        actions.ts                        # importMembers, linkMember server actions
      teesheet/
        page.tsx                          # Today's tee sheet (default to today)
        [date]/page.tsx                   # Tee sheet for a specific date
        config/page.tsx                   # Tee sheet rules per loop
        config/actions.ts                 # saveTeeSheetRule server action
      booking/
        page.tsx                          # Booking management list
        actions.ts                        # createBooking, cancelBooking server actions
      competitions/
        page.tsx                          # Competition calendar list
        new/page.tsx                      # Create competition form
        [id]/page.tsx                     # Competition detail + entries
        actions.ts                        # createCompetition, updateEntries server actions
    lib/

      supabase/
        client.ts                         # Browser client (copy + adapt from apps/web)
        server.ts                         # Server client (copy + adapt from apps/web)
      teesheet.ts                         # generateSlotsForDate() business logic
      csv.ts                              # parseIntelligentGolfCSV() import logic
    middleware.ts                         # Protect all routes except /auth/*
```

### Modified files — `packages/db/`
```
packages/db/src/index.ts                  # Add new club types (ClubMember, TeeSlot, Booking, etc.)
```

### Modified files — `packages/db/migrations/`
```
packages/db/migrations/
  001_clubs.sql                           # clubs table
  002_club_user_roles.sql                 # club_user_roles + RLS
  003_club_members.sql                    # club_members + RLS
  004_course_loops.sql                    # course_loops (Cumberwell's 5 loops)
  005_tee_sheet_rules.sql                 # tee_sheet_rules + RLS
  006_tee_slots.sql                       # tee_slots + RLS
  007_bookings.sql                        # bookings + RLS
  008_seed_cumberwell.sql                 # Seed: Cumberwell Park club + 5 loops
  009_club_competitions.sql               # club_competitions table + RLS
```

### Modified files — monorepo root
```
.claude/launch.json                       # Add club dev config (port 3001)
```

> **Note:** Turborepo discovers workspaces from the root `package.json` workspaces glob (`"apps/*"`), which already covers `apps/club`. No `turbo.json` change needed.

---

## Task 1: Scaffold apps/club

**Files:**
- Create: `apps/club/package.json`
- Create: `apps/club/next.config.ts`
- Create: `apps/club/tailwind.config.ts`
- Create: `apps/club/tsconfig.json`
- Create: `apps/club/postcss.config.mjs`
- Create: `apps/club/src/app/layout.tsx`
- Create: `apps/club/src/app/page.tsx`
- Modify: `.claude/launch.json`

- [ ] **Step 1: Create apps/club/package.json**

```json
{
  "name": "@lx2/club",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3001",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@lx2/db": "*",
    "@lx2/ui": "*",
    "@lx2/brand": "*",
    "next": "^15.0.4",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@supabase/supabase-js": "^2.46.2",
    "@supabase/ssr": "^0.5.2"
  },
  "devDependencies": {
    "@types/node": "^22",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "tailwindcss": "^3.4.15",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "eslint": "^9",
    "eslint-config-next": "^15.0.4",
    "typescript": "^5.6.3"
  }
}
```

- [ ] **Step 2: Create apps/club/next.config.ts**

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@lx2/db', '@lx2/ui', '@lx2/brand', '@lx2/scoring'],
}

export default nextConfig
```

- [ ] **Step 3: Create apps/club/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create apps/club/postcss.config.mjs**

```js
const config = {
  plugins: { tailwindcss: {} },
}
export default config
```

- [ ] **Step 5: Create apps/club/tailwind.config.ts**

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#E8EDF5',
          100: '#B8C8E0',
          500: '#2563EB',
          600: '#1D4ED8',
          900: '#1E3A5F',
        },
        // Club console uses blue-navy theme distinct from lx2.golf green
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Step 6: Create apps/club/src/app/layout.tsx**

```typescript
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Club Console — LX2',
  description: 'Run your club better.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 7: Create apps/club/src/app/globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #0F172A;
  --foreground: #F1F5F9;
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: system-ui, sans-serif;
}
```

- [ ] **Step 8: Create apps/club/src/app/page.tsx** (redirect to dashboard)

```typescript
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/dashboard')
}
```

- [ ] **Step 9: Update .claude/launch.json to add club config**

Read the current `.claude/launch.json` first, then add the club configuration:

```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "web",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev", "--workspace=apps/web"],
      "port": 3000
    },
    {
      "name": "club",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev", "--workspace=apps/club"],
      "port": 3001
    }
  ]
}
```

- [ ] **Step 10: Install dependencies**

```bash
cd /Users/mattjohnson/Documents/lx2
npm install
```

Expected: `added N packages` with no errors.

- [ ] **Step 11: Verify the app starts**

```bash
npm run dev --workspace=apps/club
```

Expected: `▲ Next.js 15.x.x` on `localhost:3001`. Kill with Ctrl+C after confirming.

- [ ] **Step 12: Commit**

```bash
git add apps/club/ .claude/launch.json
git commit -m "feat(club): scaffold apps/club Next.js app on port 3001"
```

---

## Task 2: Database migrations

**Files:**
- Create: `packages/db/migrations/001_clubs.sql` through `008_seed_cumberwell.sql`

- [ ] **Step 1: Create migrations directory**

```bash
mkdir -p packages/db/migrations
```

- [ ] **Step 2: Create 001_clubs.sql**

```sql
-- clubs
create table if not exists clubs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  address     text,
  logo_url    text,
  created_at  timestamptz not null default now()
);

alter table clubs enable row level security;

-- Anyone can read club info (name, logo) — needed for lx2.golf golfer app
create policy "clubs_public_read" on clubs
  for select using (true);

-- Only service role can insert/update clubs
create policy "clubs_service_write" on clubs
  for all using (auth.role() = 'service_role');
```

- [ ] **Step 3: Create 002_club_user_roles.sql**

```sql
-- club_user_roles — which users are staff at which club, and in what role
create table if not exists club_user_roles (
  id         uuid primary key default gen_random_uuid(),
  club_id    uuid not null references clubs(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('admin', 'secretary', 'bar_staff', 'pro_shop')),
  created_at timestamptz not null default now(),
  unique (club_id, user_id, role)
);

alter table club_user_roles enable row level security;

-- A user can read their own roles
create policy "club_user_roles_own_read" on club_user_roles
  for select using (auth.uid() = user_id);

-- A club admin can read all roles for their club
create policy "club_user_roles_admin_read" on club_user_roles
  for select using (
    exists (
      select 1 from club_user_roles cur
      where cur.club_id = club_user_roles.club_id
        and cur.user_id = auth.uid()
        and cur.role = 'admin'
    )
  );

-- A club admin can insert/update roles for their club
create policy "club_user_roles_admin_write" on club_user_roles
  for insert with check (
    exists (
      select 1 from club_user_roles cur
      where cur.club_id = club_user_roles.club_id
        and cur.user_id = auth.uid()
        and cur.role = 'admin'
    )
  );

-- Helper function: is the current user a staff member of a given club?
create or replace function is_club_staff(p_club_id uuid)
returns boolean
language sql security definer
as $$
  select exists (
    select 1 from club_user_roles
    where club_id = p_club_id and user_id = auth.uid()
  );
$$;

-- Helper function: does the current user have a specific role?
create or replace function has_club_role(p_club_id uuid, p_role text)
returns boolean
language sql security definer
as $$
  select exists (
    select 1 from club_user_roles
    where club_id = p_club_id and user_id = auth.uid() and role = p_role
  );
$$;
```

- [ ] **Step 4: Create 003_club_members.sql**

```sql
-- club_members — member roster, importable from intelligentgolf CSV
create table if not exists club_members (
  id              uuid primary key default gen_random_uuid(),
  club_id         uuid not null references clubs(id) on delete cascade,
  user_id         uuid references auth.users(id) on delete set null, -- nullable until linked
  email           text not null,
  display_name    text not null,
  membership_type text not null default 'full'
                  check (membership_type in ('full', 'junior', 'senior', 'associate', 'visitor', 'five_day')),
  handicap_index  numeric(4,1),
  status          text not null default 'active'
                  check (status in ('active', 'suspended', 'lapsed')),
  cdh_number      text,           -- WHS certificate number (for Phase 4 WHS integration)
  imported_at     timestamptz,
  linked_at       timestamptz,
  created_at      timestamptz not null default now(),
  unique (club_id, email)
);

alter table club_members enable row level security;

-- Club staff can read their club's members
create policy "club_members_staff_read" on club_members
  for select using (is_club_staff(club_id));

-- Club staff can insert/update members
create policy "club_members_staff_write" on club_members
  for all using (is_club_staff(club_id));

-- A linked golfer can read their own membership record
create policy "club_members_own_read" on club_members
  for select using (auth.uid() = user_id);
```

- [ ] **Step 5: Create 004_course_loops.sql**

```sql
-- course_loops — the bookable loops at a club (Cumberwell has 5 × 9-hole loops)
create table if not exists course_loops (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references clubs(id) on delete cascade,
  name        text not null,         -- e.g. "Red", "Yellow", "Blue", "Orange", "Par 3"
  holes       smallint not null default 9,
  par         smallint,
  colour_hex  text,                  -- for UI display
  sort_order  smallint not null default 0,
  created_at  timestamptz not null default now()
);

alter table course_loops enable row level security;

-- Anyone can read loop info (needed for booking UI)
create policy "course_loops_public_read" on course_loops
  for select using (true);

-- Club staff can manage loops
create policy "course_loops_staff_write" on course_loops
  for all using (is_club_staff(club_id));
```

- [ ] **Step 6: Create 005_tee_sheet_rules.sql**

```sql
-- tee_sheet_rules — defines slot generation for each loop
create table if not exists tee_sheet_rules (
  id                    uuid primary key default gen_random_uuid(),
  club_id               uuid not null references clubs(id) on delete cascade,
  loop_id               uuid not null references course_loops(id) on delete cascade,
  slot_interval_minutes smallint not null default 10,
  capacity_per_slot     smallint not null default 4,
  open_time             time not null default '07:00',
  close_time            time not null default '17:00',
  member_only_until     time,          -- e.g. '09:00' on weekends
  applies_weekdays      boolean not null default true,
  applies_weekends      boolean not null default true,
  valid_from            date not null default current_date,
  valid_to              date,          -- null = indefinite
  created_at            timestamptz not null default now()
);

alter table tee_sheet_rules enable row level security;

-- Club staff read/write
create policy "tee_sheet_rules_staff" on tee_sheet_rules
  for all using (is_club_staff(club_id));
```

- [ ] **Step 7: Create 006_tee_slots.sql**

```sql
-- tee_slots — generated inventory; one row per slot per date per loop
create table if not exists tee_slots (
  id           uuid primary key default gen_random_uuid(),
  club_id      uuid not null references clubs(id) on delete cascade,
  loop_id      uuid not null references course_loops(id) on delete cascade,
  slot_date    date not null,
  slot_time    time not null,
  capacity     smallint not null default 4,
  booked_count smallint not null default 0,
  slot_type    text not null default 'member'
               check (slot_type in ('member', 'visitor', 'society', 'blocked')),
  price_pence  integer not null default 0,
  created_at   timestamptz not null default now(),
  unique (loop_id, slot_date, slot_time)
);

alter table tee_slots enable row level security;

-- Club staff full access
create policy "tee_slots_staff" on tee_slots
  for all using (is_club_staff(club_id));

-- Any authenticated user can read available member/visitor slots (for booking UI)
create policy "tee_slots_public_read" on tee_slots
  for select using (
    slot_type in ('member', 'visitor')
    and booked_count < capacity
  );
```

- [ ] **Step 8: Create 007_bookings.sql**

```sql
-- bookings — one row per booking (a golfer + optional guests on a tee slot)
create table if not exists bookings (
  id           uuid primary key default gen_random_uuid(),
  tee_slot_id  uuid not null references tee_slots(id) on delete restrict,
  user_id      uuid not null references auth.users(id) on delete restrict,
  guests       smallint not null default 0,
  status       text not null default 'confirmed'
               check (status in ('confirmed', 'cancelled', 'no_show')),
  payment_id   text,         -- Stripe payment intent (Phase 1b+)
  notes        text,
  created_at   timestamptz not null default now(),
  cancelled_at timestamptz
);

alter table bookings enable row level security;

-- Club staff can read all bookings at their club
create policy "bookings_staff_read" on bookings
  for select using (
    exists (
      select 1 from tee_slots ts
      where ts.id = bookings.tee_slot_id
        and is_club_staff(ts.club_id)
    )
  );

-- Club staff can update bookings (cancel, mark no-show)
create policy "bookings_staff_update" on bookings
  for update using (
    exists (
      select 1 from tee_slots ts
      where ts.id = bookings.tee_slot_id
        and is_club_staff(ts.club_id)
    )
  );

-- A user can read their own bookings
create policy "bookings_own_read" on bookings
  for select using (auth.uid() = user_id);

-- A user can create bookings for themselves
create policy "bookings_own_insert" on bookings
  for insert with check (auth.uid() = user_id);

-- A user can cancel their own booking
create policy "bookings_own_cancel" on bookings
  for update using (auth.uid() = user_id)
  with check (status = 'cancelled');

-- Trigger: keep booked_count in sync on tee_slots
create or replace function update_tee_slot_booked_count()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' and NEW.status = 'confirmed' then
    update tee_slots set booked_count = booked_count + 1 + NEW.guests
    where id = NEW.tee_slot_id;
  elsif TG_OP = 'UPDATE' and OLD.status = 'confirmed' and NEW.status = 'cancelled' then
    update tee_slots set booked_count = booked_count - 1 - OLD.guests
    where id = NEW.tee_slot_id;
  end if;
  return NEW;
end;
$$;

create trigger bookings_count_trigger
  after insert or update on bookings
  for each row execute function update_tee_slot_booked_count();
```

- [ ] **Step 9: Create 008_seed_cumberwell.sql**

```sql
-- Seed: Cumberwell Park
-- Run ONCE in dev/staging. Production seed should be run manually.

insert into clubs (id, name, slug, address)
values (
  '00000000-0000-0000-0000-000000000001',
  'Cumberwell Park',
  'cumberwell-park',
  'Bradford-on-Avon, Wiltshire, BA15 2PQ'
) on conflict (slug) do nothing;

insert into course_loops (club_id, name, holes, par, colour_hex, sort_order)
values
  ('00000000-0000-0000-0000-000000000001', 'Red',    9, 35, '#DC2626', 1),
  ('00000000-0000-0000-0000-000000000001', 'Yellow', 9, 35, '#CA8A04', 2),
  ('00000000-0000-0000-0000-000000000001', 'Blue',   9, 35, '#2563EB', 3),
  ('00000000-0000-0000-0000-000000000001', 'Orange', 9, 35, '#EA580C', 4),
  ('00000000-0000-0000-0000-000000000001', 'Par 3',  9, 27, '#16A34A', 5)
on conflict do nothing;
```

- [ ] **Step 10: Run migrations against Supabase**

In Supabase Dashboard → SQL Editor, run each migration file in order (001 through 008).

Verify: tables appear in Table Editor. Check that RLS is enabled on each.

> **Known RLS limitation:** The `club_user_roles` `admin_write` policy checks for an existing admin row — so the very first admin cannot be inserted through the API (no admin row exists yet to satisfy the check). The first admin **must** be inserted directly via Supabase SQL Editor (bypassing RLS), which is what Task 12 Step 2 does. All subsequent staff additions can go through the UI once at least one admin exists.

- [ ] **Step 11: Commit**

```bash
git add packages/db/migrations/
git commit -m "feat(db): add club platform tables — clubs, members, tee sheet, bookings"
```

---

## Task 3: Club database types

**Files:**
- Modify: `packages/db/src/types.ts`

> **Note:** `packages/db/src/index.ts` only contains `export * from './types.js'`. The types live in `types.ts` — edit that file, not `index.ts`.

- [ ] **Step 1: Add club types to packages/db/src/types.ts**

Read the current file first, then append these types:

```typescript
// ─── Club Platform Types ──────────────────────────────────────────────────────

export type ClubRole = 'admin' | 'secretary' | 'bar_staff' | 'pro_shop'
export type MembershipType = 'full' | 'junior' | 'senior' | 'associate' | 'visitor' | 'five_day'
export type MemberStatus = 'active' | 'suspended' | 'lapsed'
export type SlotType = 'member' | 'visitor' | 'society' | 'blocked'
export type BookingStatus = 'confirmed' | 'cancelled' | 'no_show'

export interface Club {
  id: string
  name: string
  slug: string
  address: string | null
  logo_url: string | null
  created_at: string
}

export interface CourseLoop {
  id: string
  club_id: string
  name: string
  holes: number
  par: number | null
  colour_hex: string | null
  sort_order: number
  created_at: string
}

export interface ClubUserRole {
  id: string
  club_id: string
  user_id: string
  role: ClubRole
  created_at: string
}

export interface ClubMember {
  id: string
  club_id: string
  user_id: string | null
  email: string
  display_name: string
  membership_type: MembershipType
  handicap_index: number | null
  status: MemberStatus
  cdh_number: string | null
  imported_at: string | null
  linked_at: string | null
  created_at: string
}

export interface TeeSheetRule {
  id: string
  club_id: string
  loop_id: string
  slot_interval_minutes: number
  capacity_per_slot: number
  open_time: string       // "HH:MM"
  close_time: string      // "HH:MM"
  member_only_until: string | null
  applies_weekdays: boolean
  applies_weekends: boolean
  valid_from: string      // ISO date
  valid_to: string | null
  created_at: string
}

export interface TeeSlot {
  id: string
  club_id: string
  loop_id: string
  slot_date: string       // ISO date
  slot_time: string       // "HH:MM"
  capacity: number
  booked_count: number
  slot_type: SlotType
  price_pence: number
  created_at: string
}

export interface TeeSlotWithLoop extends TeeSlot {
  course_loops: Pick<CourseLoop, 'name' | 'colour_hex'>
}

export interface Booking {
  id: string
  tee_slot_id: string
  user_id: string
  guests: number
  status: BookingStatus
  payment_id: string | null
  notes: string | null
  created_at: string
  cancelled_at: string | null
}

export interface BookingWithSlot extends Booking {
  tee_slots: Pick<TeeSlot, 'slot_date' | 'slot_time' | 'loop_id'>
  users?: Pick<User, 'display_name' | 'email'>
}
```

- [ ] **Step 2: Verify types compile**

```bash
cd /Users/mattjohnson/Documents/lx2
npm run type-check --workspace=packages/db
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/db/src/index.ts
git commit -m "feat(db): add club platform TypeScript types"
```

---

## Task 4: Club auth (Supabase client + middleware + login page)

**Files:**
- Create: `apps/club/src/lib/supabase/client.ts`
- Create: `apps/club/src/lib/supabase/server.ts`
- Create: `apps/club/src/middleware.ts`
- Create: `apps/club/src/app/auth/login/page.tsx`
- Create: `apps/club/src/app/auth/callback/route.ts`
- Create: `apps/club/.env.example`

- [ ] **Step 1: Create apps/club/.env.example**

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_CLUB_ID=00000000-0000-0000-0000-000000000001
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

Copy `.env.local` from `apps/web/` and update `NEXT_PUBLIC_APP_URL` to `http://localhost:3001`. The Supabase credentials are the same — it's the same project.

- [ ] **Step 2: Create apps/club/src/lib/supabase/client.ts**

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 3: Create apps/club/src/lib/supabase/server.ts**

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch { /* ignored in Server Components */ }
        },
      },
    }
  )
}
```

- [ ] **Step 4: Create apps/club/src/middleware.ts**

> **Known gap:** Middleware only verifies a valid Supabase session — it does not check `club_user_roles`. A regular lx2.golf golfer with a valid session could reach club console pages. Their data reads will return empty results (blocked by RLS `is_club_staff()` checks), but the UI will load. For Phase 1 with a single pilot club this is acceptable. Add a `club_user_roles` check in `(console)/layout.tsx` before Phase 2 opens wider access.

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!auth|_next/static|_next/image|favicon.ico).*)',
  ],
}
```

- [ ] **Step 5: Create apps/club/src/app/auth/callback/route.ts**

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const redirect = searchParams.get('redirect') ?? '/dashboard'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(new URL(redirect, request.url))
}
```

- [ ] **Step 6: Create apps/club/src/app/auth/login/page.tsx**

```typescript
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') ?? '/dashboard'
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      window.location.href = redirect
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0F172A' }}>
      <div style={{ width: '100%', maxWidth: 400, padding: 32 }}>
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#F1F5F9', margin: '0 0 8px' }}>Club Console</h1>
          <p style={{ color: '#94A3B8', margin: 0, fontSize: 14 }}>Run your club better.</p>
        </div>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ padding: '12px 16px', borderRadius: 8, border: '1px solid #334155', background: '#1E293B', color: '#F1F5F9', fontSize: 15 }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ padding: '12px 16px', borderRadius: 8, border: '1px solid #334155', background: '#1E293B', color: '#F1F5F9', fontSize: 15 }}
          />
          {error && (
            <p style={{ color: '#F87171', fontSize: 14, margin: 0 }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{ padding: '12px 16px', borderRadius: 8, background: '#2563EB', color: '#fff', fontWeight: 600, fontSize: 15, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
```

- [ ] **Step 7: Type-check**

```bash
npm run type-check --workspace=apps/club
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add apps/club/src/lib apps/club/src/middleware.ts apps/club/src/app/auth apps/club/.env.example
git commit -m "feat(club): add Supabase auth — login page, middleware, OAuth callback"
```

---

## Task 5: Shared club nav layout

**Files:**
- Create: `apps/club/src/app/(console)/layout.tsx`
- Create: `apps/club/src/app/(console)/dashboard/page.tsx`

Wrap all authenticated routes in a route group `(console)` with a persistent sidebar nav.

- [ ] **Step 1: Move dashboard under (console) group — create apps/club/src/app/(console)/layout.tsx**

```typescript
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/dashboard',     label: 'Dashboard',    icon: '⌂' },
  { href: '/teesheet',      label: 'Tee Sheet',    icon: '⛳' },
  { href: '/members',       label: 'Members',      icon: '👥' },
  { href: '/competitions',  label: 'Competitions', icon: '🏆' },
  { href: '/teesheet/config', label: 'Sheet Config', icon: '⚙' },
]

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0F172A', color: '#F1F5F9' }}>
      {/* Sidebar */}
      <aside style={{ width: 220, background: '#1E293B', borderRight: '1px solid #334155', display: 'flex', flexDirection: 'column', padding: '24px 0' }}>
        <div style={{ padding: '0 20px 24px', borderBottom: '1px solid #334155' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#93C5FD', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Club Console</div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Cumberwell Park</div>
        </div>
        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, color: '#CBD5E1', textDecoration: 'none', fontSize: 14 }}
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div style={{ padding: '16px 20px', borderTop: '1px solid #334155' }}>
          <p style={{ margin: 0, fontSize: 12, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
        </div>
      </aside>
      {/* Main */}
      <main style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Update apps/club/src/app/page.tsx to redirect to /(console)/dashboard**

The redirect already points to `/dashboard` — no change needed. But move the dashboard page to `(console)`:

```bash
mkdir -p apps/club/src/app/\(console\)/dashboard
```

- [ ] **Step 3: Create apps/club/src/app/(console)/dashboard/page.tsx** (stub — full content in Task 10)

```typescript
export default function DashboardPage() {
  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px' }}>Dashboard</h1>
      <p style={{ color: '#94A3B8' }}>Today&apos;s club at a glance.</p>
    </div>
  )
}
```

- [ ] **Step 4: Delete the old apps/club/src/app/dashboard/ if it exists**

Only if a stray file was created in Task 1 step 8 — check first.

- [ ] **Step 5: Verify dev server renders correctly at localhost:3001/dashboard**

```bash
npm run dev --workspace=apps/club
```

Navigate to `localhost:3001` — should redirect to `/dashboard` with sidebar visible.

- [ ] **Step 6: Commit**

```bash
git add apps/club/src/app/
git commit -m "feat(club): add console layout with sidebar nav"
```

---

## Task 6: Member roster

**Files:**
- Create: `apps/club/src/lib/csv.ts`
- Create: `apps/club/src/app/(console)/members/page.tsx`
- Create: `apps/club/src/app/(console)/members/actions.ts`

- [ ] **Step 1: Create apps/club/src/lib/csv.ts — intelligentgolf CSV parser**

```typescript
// Parses an intelligentgolf member export CSV
// Expected columns (intelligentgolf standard export):
//   CDH No, Surname, Forename, Email, Membership Cat, Handicap Index, Status
// Column names may vary — we match by common patterns

export interface ParsedMember {
  email: string
  display_name: string
  membership_type: string
  handicap_index: number | null
  cdh_number: string | null
}

export function parseIntelligentGolfCSV(csvText: string): ParsedMember[] {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''))

  const col = (names: string[]): number => {
    for (const name of names) {
      const i = headers.findIndex(h => h.includes(name))
      if (i !== -1) return i
    }
    return -1
  }

  const emailCol     = col(['email'])
  const surnameCol   = col(['surname', 'last name', 'lastname'])
  const forenameCol  = col(['forename', 'first name', 'firstname', 'given name'])
  const membershipCol= col(['membership', 'category', 'cat'])
  const handicapCol  = col(['handicap', 'hi', 'index'])
  const cdhCol       = col(['cdh', 'certificate'])

  if (emailCol === -1) throw new Error('CSV must contain an email column')

  const MEMBERSHIP_MAP: Record<string, string> = {
    'full': 'full',
    'gent': 'full',
    'lady': 'full',
    'junior': 'junior',
    'senior': 'senior',
    'associate': 'associate',
    'five day': 'five_day',
    '5 day': 'five_day',
    'visitor': 'visitor',
  }

  return lines.slice(1)
    .filter(line => line.trim())
    .map(line => {
      const cells = line.split(',').map(c => c.trim().replace(/"/g, ''))
      const email = cells[emailCol]?.toLowerCase()
      if (!email || !email.includes('@')) return null

      const surname  = surnameCol !== -1 ? cells[surnameCol] ?? '' : ''
      const forename = forenameCol !== -1 ? cells[forenameCol] ?? '' : ''
      const display_name = [forename, surname].filter(Boolean).join(' ') || email

      const rawMembership = membershipCol !== -1 ? cells[membershipCol]?.toLowerCase() ?? '' : ''
      const membership_type = Object.entries(MEMBERSHIP_MAP).find(([k]) =>
        rawMembership.includes(k)
      )?.[1] ?? 'full'

      const rawHandicap = handicapCol !== -1 ? cells[handicapCol] : ''
      const handicap_index = rawHandicap ? parseFloat(rawHandicap) : null

      const cdh_number = cdhCol !== -1 ? cells[cdhCol] || null : null

      return { email, display_name, membership_type, handicap_index, cdh_number }
    })
    .filter((m): m is ParsedMember => m !== null)
}
```

- [ ] **Step 2: Create apps/club/src/app/(console)/members/actions.ts**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { parseIntelligentGolfCSV } from '@/lib/csv'

const CLUB_ID = process.env.NEXT_PUBLIC_CLUB_ID!

export async function importMembersFromCSV(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const file = formData.get('file') as File | null
  if (!file) return { error: 'No file provided' }

  const text = await file.text()
  let members
  try {
    members = parseIntelligentGolfCSV(text)
  } catch (e) {
    return { error: (e as Error).message }
  }

  if (members.length === 0) return { error: 'No valid members found in CSV' }

  const rows = members.map(m => ({
    club_id: CLUB_ID,
    email: m.email,
    display_name: m.display_name,
    membership_type: m.membership_type,
    handicap_index: m.handicap_index,
    cdh_number: m.cdh_number,
    imported_at: new Date().toISOString(),
  }))

  const { error } = await supabase
    .from('club_members')
    .upsert(rows, { onConflict: 'club_id,email', ignoreDuplicates: false })

  if (error) return { error: error.message }
  return { success: true, count: rows.length }
}
```

- [ ] **Step 3: Create apps/club/src/app/(console)/members/page.tsx**

```typescript
import { createClient } from '@/lib/supabase/server'
import { importMembersFromCSV } from './actions'

const CLUB_ID = process.env.NEXT_PUBLIC_CLUB_ID!

export default async function MembersPage() {
  const supabase = await createClient()

  const { data: members } = await supabase
    .from('club_members')
    .select('*')
    .eq('club_id', CLUB_ID)
    .order('display_name')

  const linked = members?.filter(m => m.user_id).length ?? 0

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Members</h1>
          <p style={{ color: '#64748B', margin: 0, fontSize: 13 }}>
            {members?.length ?? 0} members · {linked} linked to lx2.golf accounts
          </p>
        </div>
        {/* Import form */}
        <form action={importMembersFromCSV} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#1E293B', border: '1px solid #334155', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13, color: '#CBD5E1' }}>
            <span>Import CSV</span>
            <input name="file" type="file" accept=".csv" style={{ display: 'none' }} />
          </label>
          <button type="submit" style={{ padding: '8px 16px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Upload
          </button>
        </form>
      </div>

      {/* Members table */}
      <div style={{ background: '#1E293B', borderRadius: 12, overflow: 'hidden', border: '1px solid #334155' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #334155' }}>
              {['Name', 'Email', 'Type', 'HCP', 'Status', 'Linked'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#64748B', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(members ?? []).map(m => (
              <tr key={m.id} style={{ borderBottom: '1px solid #1E293B' }}>
                <td style={{ padding: '10px 16px', color: '#F1F5F9' }}>{m.display_name}</td>
                <td style={{ padding: '10px 16px', color: '#94A3B8' }}>{m.email}</td>
                <td style={{ padding: '10px 16px', color: '#94A3B8', textTransform: 'capitalize' }}>{m.membership_type.replace('_', ' ')}</td>
                <td style={{ padding: '10px 16px', color: '#94A3B8' }}>{m.handicap_index ?? '—'}</td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: m.status === 'active' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: m.status === 'active' ? '#4ADE80' : '#F87171' }}>
                    {m.status}
                  </span>
                </td>
                <td style={{ padding: '10px 16px' }}>
                  {m.user_id ? <span style={{ color: '#4ADE80', fontSize: 12 }}>✓ linked</span> : <span style={{ color: '#64748B', fontSize: 12 }}>not linked</span>}
                </td>
              </tr>
            ))}
            {(members ?? []).length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#475569' }}>
                  No members yet. Import a CSV from intelligentgolf to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Type-check**

```bash
npm run type-check --workspace=apps/club
```

- [ ] **Step 5: Commit**

```bash
git add apps/club/src/lib/csv.ts apps/club/src/app/\(console\)/members/
git commit -m "feat(club): member roster with intelligentgolf CSV import"
```

---

## Task 7: Tee sheet config

**Files:**
- Create: `apps/club/src/app/(console)/teesheet/config/page.tsx`
- Create: `apps/club/src/app/(console)/teesheet/config/actions.ts`

- [ ] **Step 1: Create teesheet/config/actions.ts**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const CLUB_ID = process.env.NEXT_PUBLIC_CLUB_ID!

export async function saveTeeSheetRule(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const rule = {
    club_id: CLUB_ID,
    loop_id: formData.get('loop_id') as string,
    slot_interval_minutes: parseInt(formData.get('slot_interval_minutes') as string),
    capacity_per_slot: parseInt(formData.get('capacity_per_slot') as string),
    open_time: formData.get('open_time') as string,
    close_time: formData.get('close_time') as string,
    member_only_until: (formData.get('member_only_until') as string) || null,
    applies_weekdays: formData.get('applies_weekdays') === 'true',
    applies_weekends: formData.get('applies_weekends') === 'true',
    valid_from: formData.get('valid_from') as string,
    valid_to: (formData.get('valid_to') as string) || null,
  }

  const { error } = await supabase.from('tee_sheet_rules').insert(rule)
  if (error) return { error: error.message }

  revalidatePath('/teesheet/config')
  return { success: true }
}
```

- [ ] **Step 2: Create teesheet/config/page.tsx**

```typescript
import { createClient } from '@/lib/supabase/server'
import { saveTeeSheetRule } from './actions'

const CLUB_ID = process.env.NEXT_PUBLIC_CLUB_ID!

export default async function TeesheetConfigPage() {
  const supabase = await createClient()

  const [{ data: loops }, { data: rules }] = await Promise.all([
    supabase.from('course_loops').select('*').eq('club_id', CLUB_ID).order('sort_order'),
    supabase.from('tee_sheet_rules').select('*, course_loops(name)').eq('club_id', CLUB_ID).order('created_at', { ascending: false }),
  ])

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Tee Sheet Configuration</h1>
      <p style={{ color: '#64748B', margin: '0 0 32px', fontSize: 13 }}>Define slot rules for each loop. Slots are generated daily from these rules.</p>

      {/* New rule form */}
      <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 12, padding: 24, marginBottom: 32 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 16px' }}>Add Rule</h2>
        <form action={saveTeeSheetRule} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#94A3B8', gridColumn: '1 / -1' }}>
            Loop
            <select name="loop_id" required style={{ padding: '8px 12px', borderRadius: 6, background: '#0F172A', border: '1px solid #334155', color: '#F1F5F9', fontSize: 14 }}>
              {(loops ?? []).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </label>
          {[
            { name: 'slot_interval_minutes', label: 'Interval (mins)', type: 'number', defaultValue: '10' },
            { name: 'capacity_per_slot', label: 'Capacity (players)', type: 'number', defaultValue: '4' },
            { name: 'open_time', label: 'Open time', type: 'time', defaultValue: '07:00' },
            { name: 'close_time', label: 'Last tee time', type: 'time', defaultValue: '17:00' },
            { name: 'member_only_until', label: 'Members-only until', type: 'time', defaultValue: '' },
            { name: 'valid_from', label: 'Valid from', type: 'date', defaultValue: new Date().toISOString().split('T')[0] },
            { name: 'valid_to', label: 'Valid to (optional)', type: 'date', defaultValue: '' },
          ].map(f => (
            <label key={f.name} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#94A3B8' }}>
              {f.label}
              <input name={f.name} type={f.type} defaultValue={f.defaultValue} style={{ padding: '8px 12px', borderRadius: 6, background: '#0F172A', border: '1px solid #334155', color: '#F1F5F9', fontSize: 14 }} />
            </label>
          ))}
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 16 }}>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, color: '#CBD5E1', cursor: 'pointer' }}>
              <input type="hidden" name="applies_weekdays" value="false" />
              <input type="checkbox" name="applies_weekdays" value="true" defaultChecked style={{ width: 16, height: 16 }} />
              Weekdays
            </label>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, color: '#CBD5E1', cursor: 'pointer' }}>
              <input type="hidden" name="applies_weekends" value="false" />
              <input type="checkbox" name="applies_weekends" value="true" defaultChecked style={{ width: 16, height: 16 }} />
              Weekends
            </label>
          </div>
          <button type="submit" style={{ gridColumn: '1 / -1', padding: '10px 16px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Save Rule
          </button>
        </form>
      </div>

      {/* Existing rules */}
      <h2 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 12px' }}>Active Rules ({rules?.length ?? 0})</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(rules ?? []).map(r => (
          <div key={r.id} style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 8, padding: '12px 16px', display: 'flex', gap: 24, fontSize: 13 }}>
            <span style={{ fontWeight: 600, color: '#93C5FD', minWidth: 80 }}>{(r.course_loops as any)?.name}</span>
            <span style={{ color: '#94A3B8' }}>Every {r.slot_interval_minutes} min</span>
            <span style={{ color: '#94A3B8' }}>{r.open_time}–{r.close_time}</span>
            <span style={{ color: '#94A3B8' }}>{r.capacity_per_slot} players/slot</span>
            {r.member_only_until && <span style={{ color: '#FCD34D' }}>Members only until {r.member_only_until}</span>}
            <span style={{ color: '#475569', marginLeft: 'auto' }}>from {r.valid_from}{r.valid_to ? ` to ${r.valid_to}` : ''}</span>
          </div>
        ))}
        {(rules ?? []).length === 0 && (
          <p style={{ color: '#475569', fontSize: 13 }}>No rules yet. Add one above to start generating tee slots.</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/club/src/app/\(console\)/teesheet/config/
git commit -m "feat(club): tee sheet config — slot rules per loop"
```

---

## Task 8: Tee sheet generation and view

**Files:**
- Create: `apps/club/src/lib/teesheet.ts`
- Create: `apps/club/src/app/(console)/teesheet/page.tsx`
- Create: `apps/club/src/app/(console)/teesheet/[date]/page.tsx`
- Create: `apps/club/src/app/(console)/teesheet/actions.ts`

- [ ] **Step 1: Create apps/club/src/lib/teesheet.ts — slot generation logic**

```typescript
// Pure function: given rules for a loop and a target date, returns the slots to generate.
// This logic runs in a server action and is also callable from a cron job (Phase 2).

import type { TeeSheetRule } from '@lx2/db'

export interface SlotToCreate {
  club_id: string
  loop_id: string
  slot_date: string  // ISO date
  slot_time: string  // "HH:MM"
  capacity: number
  slot_type: 'member' | 'visitor'
  price_pence: number
}

function pad(n: number) { return n.toString().padStart(2, '0') }

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(m: number): string {
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`
}

export function generateSlotsForDate(
  rules: TeeSheetRule[],
  date: string
): SlotToCreate[] {
  const dayOfWeek = new Date(date + 'T00:00:00').getDay()
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

  const slots: SlotToCreate[] = []

  for (const rule of rules) {
    // Check if rule applies to this day type
    if (isWeekend && !rule.applies_weekends) continue
    if (!isWeekend && !rule.applies_weekdays) continue

    // Check date validity
    if (rule.valid_from > date) continue
    if (rule.valid_to && rule.valid_to < date) continue

    const startMin = timeToMinutes(rule.open_time)
    const endMin   = timeToMinutes(rule.close_time)
    const interval = rule.slot_interval_minutes
    const memberOnlyUntilMin = rule.member_only_until
      ? timeToMinutes(rule.member_only_until) : 0

    for (let min = startMin; min <= endMin; min += interval) {
      const slotTime = minutesToTime(min)
      const isMemberOnly = isWeekend && memberOnlyUntilMin > 0 && min < memberOnlyUntilMin

      slots.push({
        club_id: rule.club_id,
        loop_id: rule.loop_id,
        slot_date: date,
        slot_time: slotTime,
        capacity: rule.capacity_per_slot,
        slot_type: isMemberOnly ? 'member' : 'visitor',
        price_pence: 0, // Phase 1: pricing in Phase 2
      })
    }
  }

  return slots
}
```

- [ ] **Step 2: Create teesheet/actions.ts**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { generateSlotsForDate } from '@/lib/teesheet'
import { revalidatePath } from 'next/cache'
import type { TeeSheetRule } from '@lx2/db'

const CLUB_ID = process.env.NEXT_PUBLIC_CLUB_ID!

export async function generateSlotsAction(date: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: rules } = await supabase
    .from('tee_sheet_rules')
    .select('*')
    .eq('club_id', CLUB_ID)

  if (!rules?.length) return { error: 'No tee sheet rules configured' }

  const slots = generateSlotsForDate(rules as TeeSheetRule[], date)
  if (!slots.length) return { error: 'No slots generated for this date' }

  const { error } = await supabase
    .from('tee_slots')
    .upsert(slots, { onConflict: 'loop_id,slot_date,slot_time', ignoreDuplicates: true })

  if (error) return { error: error.message }

  revalidatePath(`/teesheet/${date}`)
  return { success: true, count: slots.length }
}

export async function blockSlotAction(slotId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('tee_slots')
    .update({ slot_type: 'blocked' })
    .eq('id', slotId)
  if (error) return { error: error.message }
  return { success: true }
}
```

- [ ] **Step 3: Create teesheet/page.tsx (redirect to today)**

```typescript
import { redirect } from 'next/navigation'

export default function TeesheetIndexPage() {
  const today = new Date().toISOString().split('T')[0]
  redirect(`/teesheet/${today}`)
}
```

- [ ] **Step 4: Create teesheet/[date]/page.tsx**

```typescript
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { generateSlotsAction } from '../actions'

const CLUB_ID = process.env.NEXT_PUBLIC_CLUB_ID!

function dateNav(date: string, delta: number): string {
  const d = new Date(date + 'T00:00:00')
  d.setDate(d.getDate() + delta)
  return d.toISOString().split('T')[0]
}

export default async function TeesheetDatePage({ params }: { params: Promise<{ date: string }> }) {
  const { date: rawDate } = await params
  // Validate date param — malformed values produce Invalid Date and break slot generation
  const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : new Date().toISOString().split('T')[0]
  const supabase = await createClient()

  const [{ data: loops }, { data: slots }] = await Promise.all([
    supabase.from('course_loops').select('*').eq('club_id', CLUB_ID).order('sort_order'),
    supabase
      .from('tee_slots')
      .select('*, bookings(id, user_id, guests, status, users:user_id(display_name,email))')
      .eq('club_id', CLUB_ID)
      .eq('slot_date', date)
      .order('slot_time'),
  ])

  const slotsByLoop = (loops ?? []).reduce<Record<string, typeof slots>>((acc, loop) => {
    acc[loop.id] = (slots ?? []).filter(s => s.loop_id === loop.id)
    return acc
  }, {})

  const displayDate = new Date(date + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  return (
    <div style={{ padding: 32 }}>
      {/* Header + date navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <Link href={`/teesheet/${dateNav(date, -1)}`} style={{ color: '#94A3B8', textDecoration: 'none', fontSize: 20 }}>‹</Link>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Tee Sheet</h1>
          <p style={{ color: '#94A3B8', margin: 0, fontSize: 13 }}>{displayDate}</p>
        </div>
        <Link href={`/teesheet/${dateNav(date, 1)}`} style={{ color: '#94A3B8', textDecoration: 'none', fontSize: 20 }}>›</Link>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <form action={generateSlotsAction.bind(null, date)}>
            <button type="submit" style={{ padding: '8px 14px', background: '#1E293B', border: '1px solid #334155', color: '#CBD5E1', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>
              Generate Slots
            </button>
          </form>
        </div>
      </div>

      {/* Loop columns */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${(loops ?? []).length}, minmax(180px, 1fr))`, gap: 16, overflowX: 'auto' }}>
        {(loops ?? []).map(loop => (
          <div key={loop.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: loop.colour_hex ?? '#94A3B8' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>{loop.name}</span>
              <span style={{ fontSize: 11, color: '#64748B' }}>{loop.holes}h</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {(slotsByLoop[loop.id] ?? []).map(slot => {
                const bookings = (slot.bookings as any[]) ?? []
                const confirmedBookings = bookings.filter(b => b.status === 'confirmed')
                const isFull = slot.booked_count >= slot.capacity
                const isBlocked = slot.slot_type === 'blocked'
                return (
                  <div
                    key={slot.id}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 6,
                      background: isBlocked ? 'rgba(71,85,105,0.3)' : isFull ? 'rgba(34,197,94,0.08)' : '#1E293B',
                      border: `1px solid ${isBlocked ? '#334155' : isFull ? 'rgba(34,197,94,0.2)' : '#334155'}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#E2E8F0' }}>{slot.slot_time.slice(0, 5)}</span>
                      <span style={{ fontSize: 11, color: isFull ? '#4ADE80' : '#64748B' }}>
                        {slot.booked_count}/{slot.capacity}
                      </span>
                    </div>
                    {confirmedBookings.map((b: any) => (
                      <div key={b.id} style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                        {b.users?.display_name ?? b.users?.email ?? 'Booked'}
                        {b.guests > 0 ? ` +${b.guests}` : ''}
                      </div>
                    ))}
                  </div>
                )
              })}
              {(slotsByLoop[loop.id] ?? []).length === 0 && (
                <p style={{ color: '#475569', fontSize: 12, margin: 0 }}>No slots. Generate above.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/club/src/lib/teesheet.ts apps/club/src/app/\(console\)/teesheet/
git commit -m "feat(club): tee sheet view with slot generation — 5-loop grid, date nav"
```

---

## Task 9: Competition calendar

**Files:**
- Create: `apps/club/src/app/(console)/competitions/page.tsx`
- Create: `apps/club/src/app/(console)/competitions/new/page.tsx`
- Create: `apps/club/src/app/(console)/competitions/actions.ts`

> **Note:** Phase 1 competition calendar is admin-side only. Golfers continue to enter via intelligentgolf until Phase 2 when `club_competition_entry` is built on lx2.golf.

- [ ] **Step 1: Create competitions/actions.ts**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const CLUB_ID = process.env.NEXT_PUBLIC_CLUB_ID!

export async function createCompetition(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Phase 1: competitions use the existing `events` table from apps/web
  // They're created as events with is_club_competition = true (add this column in a migration)
  // For now, we store competition metadata in a new club_competitions table
  const comp = {
    club_id: CLUB_ID,
    name: formData.get('name') as string,
    competition_date: formData.get('competition_date') as string,
    format: formData.get('format') as string,
    loop_ids: (formData.getAll('loop_ids') as string[]),
    entry_fee_pence: parseInt(formData.get('entry_fee_pounds') as string ?? '0') * 100,
    max_entries: formData.get('max_entries') ? parseInt(formData.get('max_entries') as string) : null,
    notes: formData.get('notes') as string || null,
  }

  const { error } = await supabase.from('club_competitions').insert(comp)
  if (error) return { error: error.message }

  revalidatePath('/competitions')
  return { success: true }
}
```

- [ ] **Step 2: Add club_competitions migration**

Create `packages/db/migrations/009_club_competitions.sql`:

```sql
create table if not exists club_competitions (
  id               uuid primary key default gen_random_uuid(),
  club_id          uuid not null references clubs(id) on delete cascade,
  name             text not null,
  competition_date date not null,
  format           text not null default 'stableford'
                   check (format in ('stableford', 'strokeplay', 'matchplay', 'texas_scramble', 'pairs_betterball')),
  loop_ids         uuid[] not null default '{}',  -- which loops are used
  entry_fee_pence  integer not null default 0,
  max_entries      integer,
  entries_count    integer not null default 0,
  notes            text,
  status           text not null default 'scheduled'
                   check (status in ('scheduled', 'entries_open', 'closed', 'in_progress', 'completed', 'cancelled')),
  created_at       timestamptz not null default now()
);

alter table club_competitions enable row level security;

create policy "club_competitions_staff" on club_competitions
  for all using (is_club_staff(club_id));

-- Public read for golfer app (Phase 2)
create policy "club_competitions_public_read" on club_competitions
  for select using (status in ('entries_open', 'completed'));
```

Run this in Supabase Dashboard → SQL Editor.

- [ ] **Step 3: Create competitions/page.tsx**

```typescript
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

const CLUB_ID = process.env.NEXT_PUBLIC_CLUB_ID!

const FORMAT_LABELS: Record<string, string> = {
  stableford: 'Stableford',
  strokeplay: 'Stroke Play',
  matchplay: 'Match Play',
  texas_scramble: 'Texas Scramble',
  pairs_betterball: 'Pairs Betterball',
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  scheduled: { bg: 'rgba(99,102,241,0.15)', text: '#A5B4FC' },
  entries_open: { bg: 'rgba(34,197,94,0.15)', text: '#4ADE80' },
  closed: { bg: 'rgba(234,179,8,0.15)', text: '#FDE047' },
  in_progress: { bg: 'rgba(59,130,246,0.15)', text: '#93C5FD' },
  completed: { bg: 'rgba(71,85,105,0.2)', text: '#94A3B8' },
  cancelled: { bg: 'rgba(239,68,68,0.1)', text: '#F87171' },
}

export default async function CompetitionsPage() {
  const supabase = await createClient()
  const { data: competitions } = await supabase
    .from('club_competitions')
    .select('*')
    .eq('club_id', CLUB_ID)
    .order('competition_date')

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Competitions</h1>
          <p style={{ color: '#64748B', margin: 0, fontSize: 13 }}>Club competition calendar for the season.</p>
        </div>
        <Link href="/competitions/new" style={{ padding: '8px 16px', background: '#2563EB', color: '#fff', textDecoration: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
          + New Competition
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(competitions ?? []).map(comp => {
          const statusStyle = STATUS_COLORS[comp.status] ?? STATUS_COLORS.scheduled
          return (
            <Link
              key={comp.id}
              href={`/competitions/${comp.id}`}
              style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#1E293B', border: '1px solid #334155', borderRadius: 10, padding: '14px 18px', textDecoration: 'none', color: 'inherit' }}
            >
              <div style={{ minWidth: 80, textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#F1F5F9', lineHeight: 1 }}>
                  {new Date(comp.competition_date + 'T00:00:00').getDate()}
                </div>
                <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {new Date(comp.competition_date + 'T00:00:00').toLocaleString('en-GB', { month: 'short' })}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#F1F5F9' }}>{comp.name}</div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                  {FORMAT_LABELS[comp.format] ?? comp.format}
                  {comp.entry_fee_pence > 0 ? ` · £${(comp.entry_fee_pence / 100).toFixed(2)} entry` : ' · Free entry'}
                  {comp.max_entries ? ` · Max ${comp.max_entries}` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 12, color: '#64748B' }}>{comp.entries_count} entries</span>
                <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, ...statusStyle }}>
                  {comp.status.replace('_', ' ')}
                </span>
              </div>
            </Link>
          )
        })}
        {(competitions ?? []).length === 0 && (
          <div style={{ textAlign: 'center', padding: 48, color: '#475569' }}>
            <p style={{ fontSize: 15, margin: '0 0 8px' }}>No competitions yet.</p>
            <p style={{ fontSize: 13 }}>Add your full season schedule to get started.</p>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create competitions/new/page.tsx**

```typescript
import { createCompetition } from '../actions'
import Link from 'next/link'

export default function NewCompetitionPage() {
  return (
    <div style={{ padding: 32, maxWidth: 640 }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/competitions" style={{ fontSize: 13, color: '#64748B', textDecoration: 'none' }}>← Back to Competitions</Link>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '8px 0 0' }}>New Competition</h1>
      </div>
      <form action={createCompetition} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[
          { name: 'name', label: 'Competition name', type: 'text', placeholder: 'e.g. Monthly Medal — April' },
          { name: 'competition_date', label: 'Date', type: 'date', placeholder: '' },
          { name: 'entry_fee_pounds', label: 'Entry fee (£)', type: 'number', placeholder: '0' },
          { name: 'max_entries', label: 'Max entries (optional)', type: 'number', placeholder: '' },
        ].map(f => (
          <label key={f.name} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: '#94A3B8' }}>
            {f.label}
            <input
              name={f.name}
              type={f.type}
              placeholder={f.placeholder}
              required={f.name !== 'max_entries'}
              style={{ padding: '10px 14px', borderRadius: 8, background: '#1E293B', border: '1px solid #334155', color: '#F1F5F9', fontSize: 14 }}
            />
          </label>
        ))}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: '#94A3B8' }}>
          Format
          <select name="format" style={{ padding: '10px 14px', borderRadius: 8, background: '#1E293B', border: '1px solid #334155', color: '#F1F5F9', fontSize: 14 }}>
            <option value="stableford">Stableford</option>
            <option value="strokeplay">Stroke Play</option>
            <option value="matchplay">Match Play</option>
            <option value="texas_scramble">Texas Scramble</option>
            <option value="pairs_betterball">Pairs Betterball</option>
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: '#94A3B8' }}>
          Notes (optional)
          <textarea
            name="notes"
            rows={3}
            placeholder="Any additional details..."
            style={{ padding: '10px 14px', borderRadius: 8, background: '#1E293B', border: '1px solid #334155', color: '#F1F5F9', fontSize: 14, resize: 'vertical' }}
          />
        </label>
        <button type="submit" style={{ padding: '12px 16px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
          Create Competition
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add packages/db/migrations/009_club_competitions.sql apps/club/src/app/\(console\)/competitions/
git commit -m "feat(club): competition calendar — list, create, season schedule"
```

---

## Task 10: Admin dashboard

**Files:**
- Modify: `apps/club/src/app/(console)/dashboard/page.tsx`

- [ ] **Step 1: Replace dashboard stub with real content**

```typescript
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

const CLUB_ID = process.env.NEXT_PUBLIC_CLUB_ID!

export default async function DashboardPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const [
    { count: memberCount },
    { data: todaySlots },
    { data: upcomingComps },
  ] = await Promise.all([
    supabase.from('club_members').select('*', { count: 'exact', head: true }).eq('club_id', CLUB_ID).eq('status', 'active'),
    supabase.from('tee_slots').select('id, slot_time, booked_count, capacity, course_loops(name, colour_hex)').eq('club_id', CLUB_ID).eq('slot_date', today).order('slot_time'),
    supabase.from('club_competitions').select('id, name, competition_date, status, entries_count').eq('club_id', CLUB_ID).gte('competition_date', today).order('competition_date').limit(3),
  ])

  const totalRoundsToday = (todaySlots ?? []).reduce((sum, s) => sum + s.booked_count, 0)
  const totalSlotsToday = (todaySlots ?? []).length

  const displayDate = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

  return (
    <div style={{ padding: 32 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px' }}>Dashboard</h1>
        <p style={{ color: '#64748B', margin: 0, fontSize: 13 }}>{displayDate}</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Active Members', value: memberCount ?? 0, color: '#4ADE80', link: '/members' },
          { label: 'Rounds Today', value: totalRoundsToday, sub: `${totalSlotsToday} slots available`, color: '#60A5FA', link: `/teesheet/${today}` },
          { label: 'Upcoming Comps', value: upcomingComps?.length ?? 0, color: '#C084FC', link: '/competitions' },
        ].map(card => (
          <Link key={card.label} href={card.link} style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 12, padding: 20, textDecoration: 'none', display: 'block' }}>
            <div style={{ fontSize: 12, color: '#64748B', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{card.label}</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: card.color, lineHeight: 1 }}>{card.value}</div>
            {card.sub && <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>{card.sub}</div>}
          </Link>
        ))}
      </div>

      {/* Today's tee sheet summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Today&apos;s Sheet</h2>
            <Link href={`/teesheet/${today}`} style={{ fontSize: 12, color: '#60A5FA', textDecoration: 'none' }}>View full →</Link>
          </div>
          {totalSlotsToday === 0 ? (
            <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 10, padding: 24, textAlign: 'center', color: '#475569', fontSize: 13 }}>
              No slots generated yet.{' '}
              <Link href={`/teesheet/${today}`} style={{ color: '#60A5FA' }}>Generate →</Link>
            </div>
          ) : (
            <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 10, overflow: 'hidden' }}>
              {(todaySlots ?? []).slice(0, 8).map(slot => (
                <div key={slot.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px', borderBottom: '1px solid #0F172A' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: (slot.course_loops as any)?.colour_hex ?? '#64748B', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: '#CBD5E1', minWidth: 45 }}>{slot.slot_time.slice(0, 5)}</span>
                  <span style={{ fontSize: 12, color: '#64748B' }}>{(slot.course_loops as any)?.name}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: slot.booked_count > 0 ? '#4ADE80' : '#475569' }}>
                    {slot.booked_count}/{slot.capacity}
                  </span>
                </div>
              ))}
              {totalSlotsToday > 8 && (
                <div style={{ padding: '8px 14px', fontSize: 12, color: '#475569', textAlign: 'center' }}>
                  +{totalSlotsToday - 8} more slots
                </div>
              )}
            </div>
          )}
        </div>

        {/* Upcoming competitions */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Upcoming Competitions</h2>
            <Link href="/competitions" style={{ fontSize: 12, color: '#60A5FA', textDecoration: 'none' }}>All →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(upcomingComps ?? []).length === 0 ? (
              <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 10, padding: 24, textAlign: 'center', color: '#475569', fontSize: 13 }}>
                No upcoming competitions.{' '}
                <Link href="/competitions/new" style={{ color: '#60A5FA' }}>Add one →</Link>
              </div>
            ) : (upcomingComps ?? []).map(comp => (
              <Link key={comp.id} href={`/competitions/${comp.id}`} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#1E293B', border: '1px solid #334155', borderRadius: 10, padding: '12px 16px', textDecoration: 'none' }}>
                <div style={{ textAlign: 'center', minWidth: 40 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#C084FC', lineHeight: 1 }}>
                    {new Date(comp.competition_date + 'T00:00:00').getDate()}
                  </div>
                  <div style={{ fontSize: 10, color: '#64748B', textTransform: 'uppercase' }}>
                    {new Date(comp.competition_date + 'T00:00:00').toLocaleString('en-GB', { month: 'short' })}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#F1F5F9' }}>{comp.name}</div>
                  <div style={{ fontSize: 11, color: '#64748B' }}>{comp.entries_count} entries</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check the whole club app**

```bash
npm run type-check --workspace=apps/club
```

Expected: no errors (or only `any` type warnings which are acceptable for Phase 1).

- [ ] **Step 3: Commit**

```bash
git add apps/club/src/app/\(console\)/dashboard/page.tsx
git commit -m "feat(club): admin dashboard — members, today's sheet, upcoming competitions"
```

---

## Task 11: Deploy to Vercel as club.lx2.golf

**Files:** Vercel dashboard + `.env` config

- [ ] **Step 1: Create Vercel project for apps/club**

In Vercel Dashboard:
- New Project → Import the `lx2` repo → Select **Root Directory: `apps/club`**
- Project name: `lx2-club`
- Framework: Next.js (auto-detected)

- [ ] **Step 2: Set environment variables in Vercel**

Add these in Vercel Dashboard → Settings → Environment Variables:
- `NEXT_PUBLIC_SUPABASE_URL` — same value as apps/web
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — same value as apps/web
- `NEXT_PUBLIC_CLUB_ID` — `00000000-0000-0000-0000-000000000001` (Cumberwell Park seed ID)
- `NEXT_PUBLIC_APP_URL` — `https://club.lx2.golf`

- [ ] **Step 3: Add club.lx2.golf domain**

Vercel Dashboard → lx2-club project → Settings → Domains → Add `club.lx2.golf`

In your DNS provider (Vercel Domains or wherever lx2.golf DNS lives): add CNAME `club` → `cname.vercel-dns.com`.

- [ ] **Step 4: Deploy**

```bash
git push origin main
```

Vercel auto-deploys. Check the deployment logs for any build errors.

- [ ] **Step 5: Verify production**

Navigate to `https://club.lx2.golf` — should redirect to login. Sign in with your Supabase user. Confirm dashboard loads.

---

## Task 12: Onboard first club admin user

- [ ] **Step 1: Create your admin user in Supabase Auth**

If you don't already have an account, go to Supabase Dashboard → Authentication → Users → Invite User. Use your email.

- [ ] **Step 2: Add club_user_roles record**

In Supabase Dashboard → SQL Editor:

```sql
insert into club_user_roles (club_id, user_id, role)
values (
  '00000000-0000-0000-0000-000000000001',
  (select id from auth.users where email = 'your@email.com'),
  'admin'
);
```

- [ ] **Step 3: Set initial tee sheet rules in the UI**

Navigate to `club.lx2.golf/teesheet/config`. Add rules for each of Cumberwell's 5 loops. Suggested defaults:
- Interval: 10 minutes
- Capacity: 4 players
- Open: 07:00, Close: 17:00
- Members-only until: 09:00 (weekends)

- [ ] **Step 4: Generate today's slots**

Navigate to `club.lx2.golf/teesheet` — click "Generate Slots". Verify all 5 loops populate.

- [ ] **Step 5: Commit any fixes found during manual testing**

---

## What's NOT in this plan (Phase 2+)

- `club_booking` — self-service golfer booking (depends on Stripe Connect decision re Open Questions)
- `tee_booking` on lx2.golf — golfer-facing booking UI
- `club_competition_entry` — online entry from lx2.golf
- `my_club_dashboard` — golfer's club view
- Membership billing, pricing rules, communications, EPOS
- WHS integration (requires ISV licence)
- Multi-loop round pairing (blocked by Open Question on loop combinations)

Resolve the Open Questions in the spec (`docs/superpowers/specs/2026-03-23-club-platform-design.md`) before starting Phase 2 booking work.
