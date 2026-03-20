# ADR 001: Monorepo with Turborepo

**Date:** March 2026  
**Status:** Accepted

## Decision

Use a Turborepo monorepo with `apps/web`, `apps/architecture`, and shared `packages/`.

## Reasoning

The scoring engines need to be shared between the web app and eventually a React Native mobile app. A monorepo avoids the complexity of publishing packages to npm while keeping everything in sync. Turborepo handles build caching and task orchestration.

## Consequences

- All apps and packages share a single `node_modules` at the root
- TypeScript paths and package references require careful configuration
- Vercel deploys each app separately, pointing at the correct root directory
