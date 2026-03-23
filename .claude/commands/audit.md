---
name: audit
description: Run a full project health check — types, lint, RLS, design system, schema drift
model: claude-sonnet-4-6
---

Run a full LX2 health audit. Report findings as CRITICAL / WARNING / NOTE.

## Step 1: Type safety
- `npx tsc --noEmit` — zero errors required
- Check no `ignoreBuildErrors` in any next.config
- Check no `@ts-ignore` or untyped `any` without explanation

## Step 2: Build
- `turbo run build` — must complete cleanly for all apps

## Step 3: Lint
- `turbo run lint` — zero warnings

## Step 4: Tests
- `turbo run test` — all passing

## Step 5: RLS audit
- Connect to Supabase via MCP
- List all tables in public schema
- For each table, verify RLS is enabled AND at least one policy exists
- Flag any table with RLS enabled but no policies (this means NO access, which is also a bug)
- Flag any table with overly permissive policies (e.g. `using (true)`)

## Step 6: Schema drift
- Compare live DB schema against migration files
- Flag any differences

## Step 7: Design system compliance
- Scan all .tsx files for:
  - Hardcoded hex colours not in the approved palette
  - Tailwind utility classes in component files (should only be in globals.css)
  - Inline styles (should use CSS-in-JSX <style> blocks)
  - Wrong fonts (anything not Manrope, Lexend, DM Serif Display, DM Sans)
  - Missing CSS variables for colours

## Step 8: Dead code
- Find unused exports
- Find files with no imports
- Find TODO/FIXME/HACK comments

## Step 9: Vision check
- List all user-facing pages
- For each, ask: would a golfer on the 14th hole in the rain understand this in 3 seconds?
- Flag any page that fails this test

## Output
Produce a summary table: Area → Critical → Warning → Note counts
Then list each finding with severity, file, line (if applicable), and suggested fix.
