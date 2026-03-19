# LX2

Golf scoring, stats and society management.

**lx2.golf** — combining individual round tracking and statistics with society event management and club tools.

## Monorepo structure

```
lx2/
├── apps/
│   ├── web/              # Next.js main product       → lx2.golf
│   └── architecture/     # Architecture dashboard     → architecture.lx2.golf
├── packages/
│   ├── scoring/          # Pure TypeScript scoring engines (Stableford, Match Play, etc.)
│   ├── db/               # Supabase types + SQL migrations
│   ├── ui/               # Shared React components
│   └── config/           # Module registry — single source of truth for architecture
├── turbo.json
└── package.json
```

## Prerequisites

- Node 20+ (`nvm use 20`)
- npm 10+

## Getting started

```bash
# Install all dependencies
npm install

# Start both apps in dev mode
npm run dev

# Or start individually:
cd apps/web && npm run dev          # → localhost:3000
cd apps/architecture && npm run dev # → localhost:3001
```

## Environment variables

Copy `.env.example` to `.env.local` in the web app and fill in the values:

```bash
cp apps/web/.env.example apps/web/.env.local
```

You need:
- **Supabase** — create a project at supabase.com, copy URL + anon key
- **Stripe** — create an account at stripe.com, copy test keys

## Scoring engines

The pure TypeScript scoring engines live in `packages/scoring` with zero framework dependency.

```bash
# Run tests
cd packages/scoring && npm test

# Watch mode
cd packages/scoring && npm run test:watch
```

## Database

SQL migrations live in `packages/db/migrations/`. Run them via:
- Supabase dashboard > SQL editor, or
- `supabase db push` (if Supabase CLI is set up locally)

## Deployments

| App | Branch | URL |
|-----|--------|-----|
| web | `main` | lx2.golf |
| architecture | `main` | architecture.lx2.golf |

Both apps deploy automatically to Vercel on push to `main`. Every PR gets a preview URL.

## Architecture

The module registry at `packages/config/src/modules.ts` is the single source of truth for the platform architecture. The dashboard at `apps/architecture` imports directly from it — update the registry, the dashboard updates.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (magic links) |
| Realtime | Supabase Realtime (WebSockets) |
| Styling | Tailwind CSS + shadcn/ui |
| Hosting | Vercel |
| Payments | Stripe Checkout |
| Scoring | `@lx2/scoring` (pure TypeScript) |
| Course data | golfcourseapi.com (bulk import) |
| Monorepo | Turborepo |

## Name

LX2 — Roman numerals for 72, par for a standard 18-hole course. The number every golfer is chasing.
