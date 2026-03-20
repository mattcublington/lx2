# ADR 003: Pure TypeScript scoring engines with no framework dependency

**Date:** March 2026  
**Status:** Accepted

## Decision

All scoring logic (Stableford, Stroke Play, Match Play, Handicap) lives in `packages/scoring` as pure TypeScript functions with zero React, Next.js, or Supabase dependency.

## Reasoning

- Scoring maths must be tested independently of the UI
- Engines will be shared between web app and future React Native app
- Pure functions are trivial to test exhaustively — input strokes, assert points
- No risk of database latency or network errors affecting score calculation

## Consequences

- All scoring engines must be fully covered by Vitest tests before use in production
- Any database interaction (reading course data, writing scores) happens in the Next.js layer, not in the engines
- The engines operate on plain TypeScript types defined in `packages/scoring/src/types.ts`
