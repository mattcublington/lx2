# ADR 002: Supabase (PostgreSQL) over Firebase

**Date:** March 2026  
**Status:** Accepted

## Decision

Use Supabase (hosted PostgreSQL) as the database, auth, and realtime layer.

## Reasoning

- Relational data model is essential for event → player → scorecard → score relationships
- SQL makes leaderboard queries straightforward (complex aggregations, countback tiebreakers)
- Supabase Realtime (WebSockets) enables live leaderboard updates without a separate service
- Row Level Security enforced at the database level — security doesn't depend on application code
- Migration path to self-hosted Postgres if we outgrow Supabase

## Consequences

- RLS policies must be written and audited carefully before launch
- Supabase free tier limits (500MB database, 50k auth users) are sufficient for MVP
- WHS handicap integration (Phase 4) will require ISV licence from England Golf regardless of database choice
