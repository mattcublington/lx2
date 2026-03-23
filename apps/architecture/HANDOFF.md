# Architecture Control Tower — Handoff Brief

This document tells you exactly what exists and how to adapt it for a new project.

---

## What this is

A **local-only Next.js page** that acts as a living architecture reference for a software platform. It is not deployed — it runs on `localhost:3002` (`npm run dev --workspace=apps/architecture`). It has no database and no backend. All data is a single TypeScript constant in one file.

The purpose is to have a single place where you can:
- See every module/agent/capability in the system, its status, and its phase
- Click any module to get full detail in a slide-out drawer (description, features, dependencies, tech approach, links to live URL / spec / code)
- Filter by surface (who owns it), see the dependency graph, and trace user/data journeys end-to-end

---

## The file that matters

Everything — data, types, config, and all rendering — is in one file:

```
apps/architecture/src/app/LX2Architecture.tsx   (~1,250 lines)
```

The `page.tsx` in the same directory just renders `<LX2Architecture />`. There is no other logic.

---

## Core data model

### `Module` — the atomic unit

```typescript
interface Module {
  id: string           // snake_case unique key, e.g. 'score_entry'
  name: string         // Display name, e.g. 'Score entry'
  phase: Phase         // 'mvp' | 'soon' | 'later' | 'future'
  tier: Tier           // Which group/layer this belongs to (you define these)
  status: Status       // 'done' | 'building' | 'planned'
  surface: Surface     // Who owns/uses this (you define these)
  sub: string          // One-line subtitle shown on the card
  desc: string         // Full paragraph description shown in the drawer
  deps: string[]       // IDs of modules this depends on
  data: string[]       // DB tables / data schemas this reads/writes
  liveUrl: string | null   // Link to running instance
  prdUrl: string | null    // Link to spec/PRD document
  codeUrl: string | null   // Link to source code (e.g. GitHub)
  features: string[]   // Bullet list of capabilities
  tech: string         // Technical approach paragraph
}
```

### `Phase` — priority/roadmap position
```typescript
type Phase = 'mvp' | 'soon' | 'later' | 'future'
// Renders as: MVP / P2 / P3 / P4+ badges on cards
```

### `Status` — current build state
```typescript
type Status = 'done' | 'building' | 'planned'
// Drives: green dot, amber dot, grey dot — and the progress bar
```

### `Tier` — how modules are grouped into sections
```typescript
// You define this. LX2 example:
type Tier = 'player-pwa' | 'player-web' | 'organiser' | 'scoring' | 'course' | 'infra' | 'club' | 'api'
// Finance agent example might be:
type Tier = 'ingestion' | 'analysis' | 'reporting' | 'compliance' | 'integration' | 'infra' | 'api'
```

### `Surface` — who owns / uses this
```typescript
// You define this. LX2 example:
type Surface = 'player' | 'organiser' | 'club' | 'shared' | 'api'
// Finance agent example might be:
type Surface = 'analyst' | 'compliance' | 'finance' | 'shared' | 'api'
```

---

## The `modules` record

All modules live in a single `const modules: Record<string, Module>` object. There are no imports from external files, no API calls, no database — just a big TypeScript object literal. Adding a module = adding a key.

LX2 has ~60 modules. The page auto-calculates progress, groups by tier, and builds the dependency view from this single object.

---

## Journey flows

Separately from modules, there is a `journeys` array. Each journey is a sequence of steps that traces a user flow end-to-end. Steps reference module IDs — clicking a step in the journey opens that module's drawer.

```typescript
type JourneyStep = {
  id: string
  label: string        // e.g. 'Ingest trade data'
  sub: string          // e.g. 'Bloomberg feed → normalised schema'
  status: Status       // drives green/amber/grey dot
  moduleId?: string    // links to a module for click-through
  x: number            // SVG position
  y: number            // SVG position
}
```

For a finance agents system, journeys might be:
- "End-of-day P&L run" — ingestion → normalisation → calculation → report → compliance check
- "Trade reconciliation" — raw trades → matching → exceptions → sign-off → audit log
- "Risk alert workflow" — threshold breach → enrichment → notification → escalation

---

## The four views

| Tab | What it shows |
|-----|---------------|
| **All modules** | Cards grouped by tier. Click any card to open the drawer. |
| **Surfaces** | Modules grouped by who owns them. Click any module pill to open drawer. |
| **Dependencies** | Flat list showing what each module depends on. Click deps to navigate. |
| **Journeys** | SVG flow diagrams + step list. Click any step with a moduleId to open drawer. |

---

## The detail drawer

When any module is clicked, a panel slides in from the right (fixed position, `translateX` transition, blurred backdrop). It shows:

1. Name, surface badge, phase badge, status dot
2. Description paragraph
3. Links: Live ↗ / PRD ↗ / Code ↗ (only rendered if non-null)
4. "Depends on" — clickable chips that navigate to dependency modules within the drawer
5. "DB tables / Data sources" — `<code>` chips
6. "Features" — bullet list
7. "Technical approach" — monospace block

Clicking a dependency chip opens that module's drawer directly (no close/reopen animation — just swaps content).

---

## Config you must define for a new project

Four config objects drive all the colours, labels, and groupings. These are the only things you need to rewrite for a new domain:

```typescript
// 1. Tier order (left-to-right in section order)
const tierOrder: Tier[] = [...]

// 2. Per-tier display config
const tierConfig: Record<Tier, {
  label: string       // Section heading
  note?: string       // Italic footnote under the tier
  surfaceTag: string  // Tag shown next to heading
  color: string       // Hex colour for dot
}> = {...}

// 3. Per-surface display config
const surfaceConfig: Record<Surface, {
  label: string
  color: string
  bg: string          // Light tint for badges
}> = {...}

// 4. Vision banner text (the big green card at the top)
// Just edit the JSX directly — it's hardcoded prose
```

Phase and status configs are generic enough to reuse unchanged.

---

## Progress bar

Auto-calculated from the `modules` object:

```typescript
const allMods  = Object.values(modules)
const mvpMods  = allMods.filter(m => m.phase === 'mvp')
const done     = allMods.filter(m => m.status === 'done').length
const building = allMods.filter(m => m.status === 'building').length
const mvpDone  = mvpMods.filter(m => m.status === 'done').length
// Renders: "X of Y MVP modules · X Done · X Building · X Planned"
```

No configuration needed — just keep statuses accurate.

---

## What to change for a Finance Agents control tower

1. **Rename types**: `Tier` and `Surface` to match your domain
2. **Rewrite `tierConfig`** and **`surfaceConfig`** with your groups and colours
3. **Replace the vision banner** prose (the dark green card at top)
4. **Replace `modules`** with your agents/capabilities — same shape, different data
5. **Replace `journeys`** with your agent workflows
6. **Update the two-app overview cards** (currently "lx2.golf" and "club.lx2.golf") — replace with your system's two main surfaces or delete if not applicable
7. **Change the header logo** — swap `lx2-logo.svg` for your own, or replace with a text wordmark

Everything else (drawer, transitions, tab views, dependency graph, progress bar, journey SVG renderer) is reusable as-is.

---

## Suggested tier structure for Finance Agents

```typescript
type Tier =
  | 'ingestion'     // Data feeds: Bloomberg, Reuters, internal systems
  | 'normalisation' // Clean, validate, schema-map raw data
  | 'analysis'      // Agent computations: P&L, risk, attribution
  | 'reporting'     // Output: dashboards, PDFs, email digests
  | 'compliance'    // Reg reporting: MiFID, Basel, internal audit
  | 'integration'   // Outbound: ERP, downstream systems, APIs
  | 'infra'         // Auth, orchestration, logging, storage

type Surface =
  | 'analyst'       // Front-office analyst tooling
  | 'risk'          // Risk/compliance team
  | 'ops'           // Operations and reconciliation
  | 'shared'        // Shared infrastructure
  | 'api'           // External integrations
```

---

## Prompt to give work-Claude

```
I have a working "architecture control tower" page built in Next.js.
It's a single React component (~1,250 lines) that renders an interactive
module reference with:
- Cards grouped by tier, each with status (done/building/planned) and phase (MVP/P2/P3/P4)
- A slide-out drawer with full module detail (description, features, deps, DB tables, tech, links)
- Four views: All modules / Surfaces / Dependencies / Journeys
- SVG journey flow diagrams that link to module drawers
- Auto-calculated progress bar

The data model is a single TypeScript `modules: Record<string, Module>` object —
no database, no API, everything in one file.

I want you to build the same thing for my Finance Agents project.
I'll paste the full source component for you to use as the template.

My domain:
- Tiers: [describe your groupings]
- Surfaces: [who uses what]
- Agents/modules to define: [list them]
- Journeys to map: [list your key workflows]

Please:
1. Rename all LX2-specific types and config to finance-agent equivalents
2. Replace the modules data with my agents
3. Replace the journeys with my workflows
4. Keep all the rendering logic, drawer, transitions, and views exactly as-is
5. Update the vision banner and header for my project

[PASTE THE FULL LX2Architecture.tsx SOURCE BELOW THIS LINE]
```

---

## Files to copy to your work project

```
apps/architecture/src/app/LX2Architecture.tsx   ← the whole thing
apps/architecture/src/app/page.tsx              ← 3 lines, just renders <LX2Architecture />
apps/architecture/package.json                  ← Next.js app config
apps/architecture/tsconfig.json                 ← TypeScript config
apps/architecture/next.config.ts                ← minimal Next.js config
apps/architecture/public/                       ← swap lx2-logo.svg for your logo
```

It's a self-contained Next.js app. Drop it in, run `npm install && npm run dev`, done.
