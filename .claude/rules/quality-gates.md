---
paths:
  - "apps/**/*.tsx"
  - "apps/**/*.ts"
  - "packages/**/*.ts"
---

# Quality gates — enforced on every file edit

## Before writing any code
- Read CLAUDE.md for the full design system and coding rules
- Check if this change needs a database migration
- Check if this change needs an RLS policy update

## After every file edit
- Run `npx tsc --noEmit` and fix any errors introduced
- No `any` types without an inline comment explaining why
- No `@ts-ignore` — fix the underlying issue
- No `ignoreBuildErrors` — ever
- No hardcoded data that should come from the database or configuration
- No Tailwind utility classes in component files (only in globals.css)
- No inline styles — use CSS-in-JSX <style> blocks
- Only approved colours from the brand token palette
- Only approved fonts (Manrope, Lexend, DM Serif Display, DM Sans)

## After every feature completion
- Run the full audit: `/audit`
- Write or update the PRD in docs/prd/
- Update the architecture module status if a module moved from planned → building → done
