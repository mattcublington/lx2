# PRD: API Documentation Portal

**Module:** `api_docs`
**Phase:** Later
**Status:** Planned
**Last updated:** March 2026

---

## Problem

APIs are only as useful as their documentation. Without clear, interactive, up-to-date documentation, third-party developers cannot integrate with LX2 efficiently. Poor documentation leads to support tickets, incorrect implementations, and frustrated partners. As LX2 exposes both a booking API and a full partner API, developers need a single place to understand endpoints, authentication, data models, error handling, and best practices.

The documentation must be more than a static page — developers expect interactive playgrounds where they can test API calls, see real responses, and understand the data model without writing code first.

## Goal

Provide a comprehensive, interactive API documentation portal that enables third-party developers to understand, test, and integrate with LX2 APIs with minimal support.

## Users

- **Primary:** Third-party developers building integrations
- **Secondary:** Club website developers, internal LX2 developers, partnership/sales team (for demos)

## Core requirements

### Must have

- **OpenAPI specification:**
  - Full OpenAPI 3.1 specification for all API endpoints
  - Machine-readable YAML/JSON spec downloadable from the portal
  - Spec auto-generated from API route definitions (single source of truth)
  - Covers: paths, operations, parameters, request bodies, responses, schemas, security schemes
- **Documentation site:**
  - Hosted at `docs.lx2.golf` or `developers.lx2.golf`
  - Clean, readable design consistent with LX2 branding
  - Navigation: overview, authentication, endpoints (grouped by resource), data models, webhooks, errors, changelog
  - Searchable: full-text search across all documentation
  - Mobile-responsive for reading on any device
- **Interactive playground:**
  - "Try it" functionality on every endpoint
  - Developer enters their API key (stored in browser only)
  - Fill in parameters, see request being built
  - Execute request and see formatted response
  - Copy request as cURL, JavaScript (fetch), Python (requests)
  - Sandbox mode: playground hits test environment, not production
- **Authentication guide:**
  - Step-by-step guide to obtaining an API key
  - How to authenticate requests (header format)
  - OAuth 2.0 flow documentation (if applicable)
  - Webhook signature verification guide with code examples
  - Security best practices (key rotation, secure storage)
- **Code examples:**
  - Examples for every endpoint in:
    - cURL
    - JavaScript/TypeScript (fetch and axios)
    - Python (requests library)
  - Complete integration examples:
    - "Display tee time availability on your website"
    - "Sync member data with your CRM"
    - "Publish competition results to your website"
  - Copy-to-clipboard on all code blocks
- **Data model reference:**
  - Schema documentation for all objects (Member, Booking, Competition, etc.)
  - Field descriptions, types, constraints, required/optional
  - Enum values documented
  - Relationship diagrams (which objects reference which)
- **Error reference:**
  - All error codes documented with description and resolution steps
  - Common error scenarios with troubleshooting advice
  - HTTP status code usage explained
- **Webhook reference:**
  - All webhook event types documented
  - Example payloads for each event
  - Delivery retry behaviour
  - Signature verification code in multiple languages
- **Changelog:**
  - Dated entries for all API changes
  - Breaking changes highlighted with migration guide
  - Deprecation notices with timeline
  - RSS feed for changelog updates
- **Versioning:**
  - Documentation for current and previous API versions
  - Version selector in navigation
  - Migration guides between versions
  - Deprecation timeline clearly displayed

### Should have

- SDKs and client libraries:
  - `@lx2/api-client` npm package (TypeScript)
  - `lx2-api` PyPI package (Python)
  - Auto-generated from OpenAPI spec
  - Published and documented on the portal
- Getting started guide: from zero to first API call in under 10 minutes
- Rate limiting documentation with tier details
- Webhook testing tool: trigger test events from the portal
- API status page: current uptime, response times, incident history
- Community forum or discussion board for developer questions
- Partner showcase: examples of live integrations built by partners

### Won't have (this phase)

- Video tutorials
- Multi-language documentation (English only initially)
- Developer certification programme
- Paid API access portal (billing, metering)
- Postman collection (auto-generated from OpenAPI spec as a stretch goal)

## Technical approach

- Documentation site built with a static site generator (Nextra, Docusaurus, or Mintlify)
- OpenAPI spec rendered via Redoc or Scalar
- Interactive playground via Scalar or custom component using the OpenAPI spec
- Deployed as a static site (Vercel, Netlify, or Cloudflare Pages)
- Source content in Markdown, co-located with the API code for maintainability
- CI/CD: spec validation on PR, docs auto-deploy on merge to main

## Open questions

- [ ] Should the docs site be public (anyone can read) or require developer registration?
- [ ] Do we want to build on Mintlify (hosted, polished) or self-host with Nextra/Docusaurus?
- [ ] Should the sandbox environment use synthetic data or anonymised copies of a real club's data?
- [ ] How do we handle versioning of the OpenAPI spec alongside versioning of the docs site?
- [ ] Should we provide a Postman/Insomnia collection alongside the OpenAPI spec?

## Links

- Component: `docs.lx2.golf` or `developers.lx2.golf` (future)
- Related PRD: `docs/prd/booking-api.md`
- Related PRD: `docs/prd/partner-api.md`
