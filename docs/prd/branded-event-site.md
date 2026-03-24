# PRD: Branded Event Site

**Module:** `branded_event_site`
**Phase:** Soon
**Status:** Planned
**Last updated:** March 2026

---

## Problem

The current event landing page is functional but generic. Society organisers running annual tournaments, corporate golf days, or charity events want a branded experience — their logo, their colours, sponsor visibility. They share this URL widely (email invites, social media, printed materials) and it represents their event's identity. A plain white page with a form doesn't cut it for a "Captain's Day" with 72 players and three sponsors.

## Goal

Upgrade the event landing page into a customisable tournament microsite with branding, sponsor logos, and a shareable URL suitable for pre-event promotion and post-event results.

## Users

- **Primary:** Society organisers running premium or recurring events who want a professional-looking event page
- **Secondary:** Corporate event coordinators who need sponsor branding and PDF exports
- **Tertiary:** Players and spectators sharing the event link publicly

## Core requirements

### Must have

- **Custom branding per event:**
  - Event logo upload (displayed in header, max 400x200px, stored in Supabase Storage)
  - Primary colour override (used for buttons, accents, badges — hex picker with preview)
  - Secondary colour override (text, borders)
  - Hero image upload or selection from LX2 stock library (golf course photos)
  - Custom event description (rich text: bold, italic, links — stored as markdown)

- **Sponsor section:**
  - Up to 6 sponsor logos per event (uploaded images, stored in Supabase Storage)
  - Sponsor name and optional URL (clicking logo opens sponsor site)
  - Tiered display: "Headline Sponsor" (large, top) and "Partners" (smaller, grid)
  - Displayed on event page, leaderboard footer, and results page

- **Enhanced event page layout:**
  - Large hero banner with event logo overlaid
  - Event description section below details card
  - Schedule / itinerary section (optional): tee times, dinner, prize-giving — simple time + text entries
  - Course information section: course name, address, course rating, slope rating
  - Sponsor logos section
  - All existing event landing functionality preserved (join form, player list, leaderboard link)

- **Shareable URL:**
  - Clean URL: `/events/[id]` (same as current, enhanced when branding is configured)
  - OG meta tags: event name as title, description, hero image as `og:image`
  - Twitter card support

- **PDF results export:**
  - Generate PDF of final leaderboard with event branding
  - Include: event name, date, course, format, full standings, NTP/LD winners, sponsor logos
  - Download button on results page (organiser only initially, later public)

### Should have

- Colour theme preview in organiser settings before publishing
- Dark mode variant for evening/awards events
- QR code generation for printed materials (encodes event URL)
- Template system: save branding as a template for recurring events

### Won't have (this phase)

- Custom domain per event (e.g. captainsday.lx2.golf)
- Video embed on event page
- Ticket sales / paid entry via the branded page (uses existing entry fee flow)
- Multi-language event pages
- Email campaign builder

## Data model

```sql
event_branding (
  event_id uuid PRIMARY KEY REFERENCES events(id),
  logo_path text,              -- Supabase Storage path
  hero_image_path text,        -- Supabase Storage path
  primary_color text,          -- hex e.g. '#1a3c6e'
  secondary_color text,        -- hex
  description_md text,         -- markdown
  schedule jsonb,              -- [{time: '08:00', label: 'Registration'}, ...]
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

event_sponsors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id),
  name text NOT NULL,
  logo_path text NOT NULL,     -- Supabase Storage path
  url text,                    -- optional sponsor website
  tier text DEFAULT 'partner', -- 'headline' | 'partner'
  sort_order smallint DEFAULT 0,
  created_at timestamptz DEFAULT now()
)
```

## Storage

- Bucket: `event-assets` (public read, authenticated write)
- Path pattern: `events/<event_id>/logo.png`, `events/<event_id>/hero.jpg`, `events/<event_id>/sponsors/<sponsor_id>.png`
- Max file size: 2MB per image
- Accepted formats: PNG, JPG, WebP, SVG (logos only)

## Open questions

- [ ] Should branding be a paid feature? (Likely yes — "Pro" tier)
- [ ] Do we need an approval flow for sponsor logos? (Probably not for MVP)
- [ ] PDF generation: server-side (Puppeteer/Playwright) or client-side (jsPDF)?
- [ ] Should the custom colours apply to the leaderboard page as well?
- [ ] How do we handle colour accessibility? (Auto-contrast check on custom colours)

## Links

- Event landing page: `apps/web/src/app/events/[id]/page.tsx`
- Event creation wizard: `apps/web/src/app/events/new/NewEventWizard.tsx`
- Related PRD: `docs/prd/event-landing.md`
- Related PRD: `docs/prd/event-creation.md`
- Related PRD: `docs/prd/results.md`
