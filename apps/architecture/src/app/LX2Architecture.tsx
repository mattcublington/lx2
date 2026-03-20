'use client'
import { useState } from "react";

// ─── Module registry ──────────────────────────────────────────────────────────

const GITHUB = "https://github.com/mattcublington/lx2/blob/main"
const APP = "https://lx2.golf"

const modules: Record<string, Module> = {
  score_entry: {
    name: "Score entry", phase: "mvp", tier: "player", status: "building",
    sub: "Hole-by-hole, offline-first",
    desc: "Mobile-first hole-by-hole score input. The core interaction during a round.",
    deps: ["handicap", "course_db", "auth"],
    data: ["hole_scores", "scorecards"],
    liveUrl: `${APP}/score`,
    prdUrl: `${GITHUB}/docs/prd/score-entry.md`,
    codeUrl: `${GITHUB}/apps/web/src/app/score/ScoreEntry.tsx`,
    features: [
      "One-tap score entry per hole with large targets",
      "Running Stableford points after each hole",
      "Match Play status display",
      "Offline queue — scores saved locally, synced on reconnect",
      "NTP/LD result entry on designated holes",
      "Full scorecard view",
      "Auto-advance to next player after entry",
    ],
    tech: "Next.js App Router. useReducer for local state. Supabase Realtime for sync.",
  },
  leaderboard: {
    name: "Live leaderboard", phase: "mvp", tier: "player", status: "planned",
    sub: "Real-time, TV mode",
    desc: "Real-time ranking page that auto-updates as scores arrive. Shareable URL. TV mode for clubhouse screens.",
    deps: ["stableford", "strokeplay", "matchplay", "realtime", "course_db"],
    data: ["scorecards", "hole_scores", "events", "event_players"],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: [
      "Auto-updating positions via Supabase Realtime",
      "Format-aware: Stableford / Stroke Play / Match Play",
      "Through X holes indicator per player",
      "NTP/LD results panel",
      "TV mode: full-screen, large typography",
      "Shareable URL with OG preview",
      "Countback tiebreaker display",
    ],
    tech: "Supabase Realtime subscription on hole_scores. Client-side scoring engine recalculates on each change.",
  },
  results: {
    name: "Results & history", phase: "mvp", tier: "player", status: "planned",
    sub: "Permanent shareable page",
    desc: "Permanent results page at a stable URL. Final standings, NTP/LD winners, prize info.",
    deps: ["stableford", "strokeplay", "event_create", "course_db"],
    data: ["events", "scorecards", "contest_entries"],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: [
      "Final standings with positions, scores/points, handicap used",
      "NTP/LD contest winners with distances",
      "Full scorecard view per player",
      "Share buttons (WhatsApp, copy link)",
      "Persistent URL — never expires",
    ],
    tech: "Next.js ISR once event is finalised. Cached at edge.",
  },
  profiles: {
    name: "Player profiles", phase: "soon", tier: "player", status: "planned",
    sub: "Stats across events",
    desc: "Cumulative stats across all events. The hook for repeat engagement.",
    deps: ["auth", "stableford", "results"],
    data: ["users", "scorecards", "events"],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: [
      "Win/loss/draw record across events",
      "Average Stableford points, scoring average",
      "Best and worst rounds",
      "Handicap trend over time",
    ],
    tech: "Server-rendered with aggregation queries. Materialised views if needed.",
  },
  event_create: {
    name: "Event creation", phase: "mvp", tier: "organiser", status: "building",
    sub: "Date, course, format, fee, NTP/LD",
    desc: "The organiser creates an event — selects course, format, entry fee, side contests. Top of the funnel. Everything flows from here.",
    deps: ["course_db", "auth", "payments"],
    data: ["events", "courses"],
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/event-creation.md`, codeUrl: null,
    features: [
      "Select course from UK database with typeahead",
      "Choose format: Stableford, Stroke Play, Match Play",
      "Set entry fee (or free event)",
      "Designate NTP/LD holes",
      "Set max players and group size",
      "Configure handicap allowance",
      "Generate unique shareable invite link",
      "Duplicate event for recurring fixtures",
    ],
    tech: "Next.js form page. Writes to events table. Course search uses Supabase full-text search.",
  },
  invite: {
    name: "Invite & RSVP", phase: "mvp", tier: "organiser", status: "planned",
    sub: "Shareable link, no account needed",
    desc: "Players tap a link, see event details, enter name and handicap, confirm attendance. No account required.",
    deps: ["event_create", "auth"],
    data: ["event_players", "users"],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: [
      "Shareable URL with OG preview for WhatsApp/iMessage",
      "No account required — just name, email, handicap",
      "Progressive account creation (optional)",
      "RSVP status: confirmed / declined / waitlisted",
      "Organiser can manually add players",
      "Email confirmation with calendar invite",
    ],
    tech: "Public Next.js page. Supabase anonymous auth for RSVP.",
  },
  payments: {
    name: "Payments", phase: "mvp", tier: "organiser", status: "planned",
    sub: "Stripe Checkout, live tracker",
    desc: "Stripe Checkout for entry fee collection. Organiser sees real-time payment status.",
    deps: ["invite", "event_create"],
    data: ["event_players"],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: [
      "Stripe Checkout in RSVP flow",
      "Real-time payment status on dashboard",
      "Manual mark-as-paid for cash",
      "Payment reminder emails",
      "Stripe Connect for club payouts (Phase 3)",
    ],
    tech: "Stripe Checkout Session via Next.js API route. Webhook updates Supabase.",
  },
  dashboard: {
    name: "Organiser dashboard", phase: "mvp", tier: "organiser", status: "planned",
    sub: "Flights, status, proxy scoring",
    desc: "The organiser's command centre. Player list, payment status, flight management, proxy score entry.",
    deps: ["event_create", "invite", "payments", "score_entry"],
    data: ["events", "event_players", "scorecards"],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: [
      "Player list with RSVP and payment status",
      "Drag-and-drop flight management",
      "Auto-generate balanced flights from handicaps",
      "Proxy score entry for any player",
      "Print-friendly draw sheet",
      "Finalise event and generate results",
      "Export results to CSV",
    ],
    tech: "Next.js desktop-optimised page. Supabase Realtime for live status.",
  },
  stableford: {
    name: "Stableford engine", phase: "mvp", tier: "scoring", status: "done",
    sub: "Points from net score vs par",
    desc: "Calculates Stableford points from gross strokes, par, and handicap strokes. Most common UK society format.",
    deps: ["handicap"],
    data: [],
    liveUrl: null,
    prdUrl: null,
    codeUrl: `${GITHUB}/packages/scoring/src/stableford.ts`,
    features: [
      "Net score = gross minus handicap strokes on hole",
      "0/1/2/3/4/5 points (double bogey to albatross)",
      "Pick-up handling: 0 points",
      "Countback: back 9, 6, 3, last hole",
      "95% allowance (configurable)",
    ],
    tech: "Pure TypeScript in @lx2/scoring. Zero database dependency. Fully tested.",
  },
  strokeplay: {
    name: "Stroke play engine", phase: "mvp", tier: "scoring", status: "done",
    sub: "Gross and net totals",
    desc: "Gross strokes minus playing handicap = net score. Lower is better.",
    deps: ["handicap"],
    data: [],
    liveUrl: null, prdUrl: null,
    codeUrl: `${GITHUB}/packages/scoring/src/strokeplay.ts`,
    features: [
      "Gross total = sum of strokes",
      "Net total = gross minus playing handicap",
      "Relative to par display (+3, -1, E)",
      "NR for incomplete rounds",
    ],
    tech: "Pure TypeScript in @lx2/scoring. Shares handicap logic with Stableford.",
  },
  matchplay: {
    name: "Match play engine", phase: "mvp", tier: "scoring", status: "done",
    sub: "Holes up/down, early close",
    desc: "Hole-by-hole contest. Lower net score wins each hole. Match ends early when result is certain.",
    deps: ["handicap"],
    data: [],
    liveUrl: null, prdUrl: null,
    codeUrl: `${GITHUB}/packages/scoring/src/matchplay.ts`,
    features: [
      "Hole-by-hole: win / lose / halve",
      "Handicap = DIFFERENCE between two players",
      "Match status: '2 up', 'all square', '1 down'",
      "Early termination: '4 and 3'",
      "Dormie detection",
    ],
    tech: "Pure TypeScript in @lx2/scoring. Different interface from Stableford/Stroke Play.",
  },
  handicap: {
    name: "Handicap engine", phase: "mvp", tier: "scoring", status: "done",
    sub: "Index → playing HC via slope",
    desc: "Converts handicap index to playing handicap using WHS formula. Distributes strokes by stroke index. Shared by all engines.",
    deps: ["course_db"],
    data: [],
    liveUrl: null, prdUrl: null,
    codeUrl: `${GITHUB}/packages/scoring/src/handicap.ts`,
    features: [
      "Playing HC = round(Index × Slope/113 + (Rating − Par)) × allowance",
      "Stroke distribution by stroke index",
      "Plus handicap support",
      "Manual handicap entry (MVP)",
      "WHS API lookup (Phase 4)",
    ],
    tech: "Pure TypeScript in @lx2/scoring. Fully tested with Vitest.",
  },
  ntp_ld: {
    name: "NTP / Longest Drive", phase: "mvp", tier: "scoring", status: "building",
    sub: "Side contest tracking",
    desc: "Side contest result capture on designated holes. Runs alongside main scoring format.",
    deps: ["event_create"],
    data: ["contest_entries"],
    liveUrl: `${APP}/score`,
    prdUrl: null, codeUrl: null,
    features: [
      "Organiser designates NTP and LD holes at event creation",
      "Player name + distance recorded per contest",
      "Winners shown on leaderboard and results",
      "Multiple contests per event",
    ],
    tech: "contest_entries table. UI built into score entry overlay.",
  },
  skins: {
    name: "Skins engine", phase: "soon", tier: "scoring", status: "planned",
    sub: "Carry-over pot per hole",
    desc: "Each hole is worth a pot. Carry-over if tied. Runs alongside Stableford.",
    deps: ["stableford", "handicap"],
    data: [],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: [
      "Each hole worth 1 skin (carry-over if tied)",
      "Configurable skin value",
      "Works alongside Stableford main event",
    ],
    tech: "Extension of @lx2/scoring. Operates on completed hole_scores.",
  },
  rvb: {
    name: "Reds vs Blues", phase: "soon", tier: "scoring", status: "planned",
    sub: "Ryder Cup team format",
    desc: "Two teams, multiple Match Play pairings. Aggregate team score. The hero format for golf trips.",
    deps: ["matchplay", "handicap"],
    data: ["events", "event_players"],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: [
      "Two teams with configurable names and colours",
      "Multiple concurrent match play pairings",
      "Aggregate team score",
      "Up to 72 players",
      "Projected result from current match states",
    ],
    tech: "Extends Match Play engine. Additional UI for team composition.",
  },
  course_db: {
    name: "Course database", phase: "mvp", tier: "course", status: "planned",
    sub: "Par, SI, yardage, slope, rating",
    desc: "UK golf course data seeded from golfcourseapi.com (~30,000 courses). Manually verified for active courses.",
    deps: [],
    data: ["courses", "course_holes", "course_tees"],
    liveUrl: null,
    prdUrl: `${GITHUB}/docs/db/schema-notes.md`,
    codeUrl: `${GITHUB}/packages/db/migrations/001_initial_schema.sql`,
    features: [
      "~30,000 UK courses from golfcourseapi.com",
      "Per hole: par, stroke index",
      "Per tee: yardage, slope, course rating",
      "Typeahead course search",
      "Admin: manual entry/edit",
      "Cumberwell Park 5 loops pre-verified",
    ],
    tech: "Supabase tables: courses, course_holes, course_tees. Bulk import script.",
  },
  auth: {
    name: "Authentication", phase: "mvp", tier: "infra", status: "planned",
    sub: "Magic links + anonymous play",
    desc: "Magic link email auth. Players can score a full round before being prompted to create an account.",
    deps: [],
    data: ["users"],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: [
      "Email magic link (no password)",
      "Anonymous play: score first, account later",
      "Google and Apple OAuth (Phase 2)",
      "Row-level security on all tables",
    ],
    tech: "Supabase Auth. Anonymous session with progressive account creation.",
  },
  realtime: {
    name: "Realtime layer", phase: "mvp", tier: "infra", status: "planned",
    sub: "WebSocket subscriptions",
    desc: "Live score updates pushed to leaderboard clients the moment a hole is saved.",
    deps: ["auth"],
    data: ["hole_scores", "scorecards"],
    liveUrl: null, prdUrl: null, codeUrl: `${GITHUB}/packages/db/migrations/001_initial_schema.sql`,
    features: [
      "Supabase Realtime on hole_scores and scorecards",
      "Client-side recalculation on each change",
      "Presence: show which players are scoring",
      "Reconnection with state reconciliation",
    ],
    tech: "Supabase Realtime (postgres_changes). Enabled in migration.",
  },
  pwa: {
    name: "PWA / offline mode", phase: "soon", tier: "infra", status: "planned",
    sub: "Add to home screen, offline scoring",
    desc: "Service worker caches the app. Scores written to IndexedDB offline, synced on reconnect.",
    deps: ["score_entry", "auth"],
    data: [],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: [
      "Service worker for offline scorecard",
      "IndexedDB buffering of scores",
      "Background sync on reconnect",
      "Add to home screen prompt",
      "Works on iOS Safari and Android Chrome",
    ],
    tech: "next-pwa. Workbox. IndexedDB via idb library.",
  },
  club_erp: {
    name: "Club ERP layer", phase: "later", tier: "club", status: "planned",
    sub: "Cumberwell-first integration",
    desc: "Full club management: members, competitions, tee time booking. Pilot target: Cumberwell Park.",
    deps: ["event_create", "auth", "payments"],
    data: ["events", "users"],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: [
      "Member management (intelligentgolf import)",
      "Competition calendar",
      "Tee time booking (replaces golfbook/255it)",
      "Club admin dashboard",
    ],
    tech: "Extended Supabase schema. intelligentgolf export format integration.",
  },
  whs: {
    name: "WHS integration", phase: "later", tier: "course", status: "planned",
    sub: "Live handicap lookup",
    desc: "Live WHS handicap lookup via England Golf / DotGolf API. Requires ISV licence.",
    deps: ["handicap", "auth"],
    data: ["users"],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: [
      "Handicap index lookup by CDH number",
      "Auto-populate on player record",
      "Submit qualifying round results",
      "Requires ISV licence from England Golf",
    ],
    tech: "DotGolf API. Manual entry remains as fallback.",
  },
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface Module {
  name: string; phase: string; tier: string; status: string
  sub: string; desc: string; deps: string[]; data: string[]
  liveUrl: string | null; prdUrl: string | null; codeUrl: string | null
  features: string[]; tech: string
}

// ─── Config ──────────────────────────────────────────────────────────────────

const tierOrder = ["player", "organiser", "scoring", "course", "infra", "club"]
const tierLabels: Record<string, string> = {
  player: "Player-facing experience",
  organiser: "Organiser tools",
  scoring: "Scoring engines",
  course: "Course & handicap data",
  infra: "Platform infrastructure",
  club: "Club-facing (phase 3–4)",
}
const tierNotes: Record<string, string> = {
  scoring: "Pure TypeScript in @lx2/scoring — zero database dependency. Fully tested.",
  infra: "Shared by all tiers above",
}

const phaseColors: Record<string, { bg: string; text: string; label: string }> = {
  mvp:    { bg: "#E8F5EE", text: "#1D9E75", label: "MVP" },
  soon:   { bg: "#E6F1FB", text: "#185FA5", label: "P2" },
  later:  { bg: "#FAEEDA", text: "#854F0B", label: "P3" },
  future: { bg: "#F1EFE8", text: "#5F5E5A", label: "P4" },
}

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  done:     { color: "#1D9E75", bg: "#E8F5EE", label: "Done" },
  building: { color: "#B8660B", bg: "#FEF3E2", label: "Building" },
  planned:  { color: "#9CA3AF", bg: "#F3F4F6", label: "Planned" },
}

const legendItems = [
  { phase: "mvp",    label: "MVP" },
  { phase: "soon",   label: "Phase 2" },
  { phase: "later",  label: "Phase 3" },
  { phase: "future", label: "Phase 4+" },
]

// ─── Component ───────────────────────────────────────────────────────────────

export default function LX2Architecture() {
  const [selected, setSelected] = useState<string | null>(null)
  const [view, setView] = useState<"modules" | "deps">("modules")
  const mod = selected ? modules[selected] : null

  const grouped: Record<string, (Module & { id: string })[]> = {}
  for (const [id, m] of Object.entries(modules)) {
    if (!grouped[m.tier]) grouped[m.tier] = []
    grouped[m.tier]!.push({ id, ...m })
  }

  // Build stats
  const allMods = Object.values(modules)
  const done = allMods.filter(m => m.status === "done").length
  const building = allMods.filter(m => m.status === "building").length
  const planned = allMods.filter(m => m.status === "planned").length
  const mvpMods = allMods.filter(m => m.phase === "mvp")
  const mvpDone = mvpMods.filter(m => m.status === "done").length

  return (
    <div className="p-4 max-w-3xl mx-auto" style={{ fontFamily: "system-ui, -apple-system, sans-serif", color: "#111" }}>

      {/* Build progress bar */}
      <div className="mb-5 p-3 rounded-xl" style={{ background: "rgba(0,0,0,0.03)", border: "0.5px solid rgba(0,0,0,0.08)" }}>
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">MVP progress</div>
          <div className="text-xs text-gray-400">{mvpDone} of {mvpMods.length} modules</div>
        </div>
        <div className="h-1.5 rounded-full" style={{ background: "rgba(0,0,0,0.08)" }}>
          <div className="h-1.5 rounded-full" style={{ width: `${(mvpDone / mvpMods.length) * 100}%`, background: "#1D9E75", transition: "width 0.3s" }} />
        </div>
        <div className="flex gap-4 mt-2">
          {[{ label: "Done", n: done, color: "#1D9E75" }, { label: "Building", n: building, color: "#B8660B" }, { label: "Planned", n: planned, color: "#9CA3AF" }].map(s => (
            <div key={s.label} className="flex items-center gap-1 text-xs" style={{ color: s.color }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
              {s.n} {s.label}
            </div>
          ))}
        </div>
      </div>

      {/* View toggle */}
      <div className="flex gap-2 mb-4">
        {(["modules", "deps"] as const).map(v => (
          <button key={v} onClick={() => setView(v)} className="text-xs px-3 py-1.5 rounded-lg" style={{ background: view === v ? "#111" : "transparent", color: view === v ? "#fff" : "#6b7280", border: view === v ? "none" : "0.5px solid rgba(0,0,0,0.15)", cursor: "pointer", fontWeight: view === v ? 500 : 400 }}>
            {v === "modules" ? "All modules" : "Dependencies"}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4">
        {legendItems.map((l) => (
          <div key={l.phase} className="flex items-center gap-1.5 text-xs text-gray-500">
            <div className="w-2 h-2 rounded-sm" style={{ background: phaseColors[l.phase]!.text }} />
            {l.label}
          </div>
        ))}
      </div>

      {/* Deps view */}
      {view === "deps" && (
        <div className="mb-6">
          {Object.entries(modules).filter(([,m]) => m.deps.length > 0).map(([id, m]) => (
            <div key={id} className="flex items-start gap-2 py-1.5 text-xs border-b" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
              <div className="font-medium" style={{ minWidth: 160, color: phaseColors[m.phase]!.text }}>{m.name}</div>
              <div className="flex flex-wrap gap-1">
                {m.deps.map(dep => {
                  const depMod = Object.entries(modules).find(([id]) => id === dep)
                  return (
                    <span key={dep} className="px-1.5 py-0.5 rounded text-xs cursor-pointer"
                      style={{ background: depMod ? phaseColors[depMod[1].phase]!.bg : "#f3f4f6", color: depMod ? phaseColors[depMod[1].phase]!.text : "#6b7280", border: `0.5px solid ${depMod ? phaseColors[depMod[1].phase]!.text + "40" : "rgba(0,0,0,0.1)"}` }}
                      onClick={() => { setSelected(dep); setView("modules") }}>
                      → {depMod ? depMod[1].name : dep}
                    </span>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modules view */}
      {view === "modules" && tierOrder.map((tier) => (
        <div key={tier} className="mb-1">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 mt-5">
            {tierLabels[tier]}
          </div>
          <div className="flex flex-wrap gap-2">
            {(grouped[tier] || []).map((m) => {
              const pc = phaseColors[m.phase]!
              const sc = statusConfig[m.status]!
              const isSel = selected === m.id
              return (
                <button key={m.id} onClick={() => setSelected(isSel ? null : m.id)}
                  className="text-left relative rounded-xl px-3 py-2.5 transition-all"
                  style={{ flex: "1 1 150px", minWidth: 140, maxWidth: 220, background: isSel ? "rgba(59,130,246,0.06)" : "transparent", border: isSel ? "1.5px solid rgba(59,130,246,0.4)" : "0.5px solid rgba(0,0,0,0.1)", cursor: "pointer" }}>
                  <span className="absolute top-1.5 right-2 text-[10px] font-medium px-1.5 py-0.5 rounded"
                    style={{ background: pc.bg, color: pc.text }}>{pc.label}</span>
                  <div className="text-sm font-medium pr-8" style={{ color: "#111" }}>{m.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5 leading-tight">{m.sub}</div>
                  <div className="flex items-center gap-1 mt-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: sc.color }} />
                    <span className="text-[10px]" style={{ color: sc.color }}>{sc.label}</span>
                  </div>
                </button>
              )
            })}
          </div>
          {tierNotes[tier] && (
            <div className="text-[11px] text-gray-400 italic mt-1 ml-1">↑ {tierNotes[tier]} ↑</div>
          )}
        </div>
      ))}

      {/* Detail panel */}
      {mod && (
        <div className="mt-5 rounded-xl p-5" style={{ background: "rgba(0,0,0,0.03)", border: "0.5px solid rgba(0,0,0,0.08)" }}>
          <div className="flex items-start justify-between gap-3 mb-1">
            <div className="text-base font-medium" style={{ color: "#111" }}>{mod.name}</div>
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="w-2 h-2 rounded-full" style={{ background: statusConfig[mod.status]!.color }} />
              <span className="text-xs" style={{ color: statusConfig[mod.status]!.color }}>{statusConfig[mod.status]!.label}</span>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-1 leading-relaxed">{mod.desc}</p>

          {/* Links row */}
          <div className="flex flex-wrap gap-2 mt-3">
            {mod.liveUrl && (
              <a href={mod.liveUrl} target="_blank" rel="noreferrer" className="text-xs px-2.5 py-1 rounded-lg no-underline" style={{ background: "#E8F5EE", color: "#1D9E75", border: "0.5px solid #1D9E7540" }}>
                ↗ Live
              </a>
            )}
            {mod.prdUrl && (
              <a href={mod.prdUrl} target="_blank" rel="noreferrer" className="text-xs px-2.5 py-1 rounded-lg no-underline" style={{ background: "#E6F1FB", color: "#185FA5", border: "0.5px solid #185FA540" }}>
                ↗ PRD
              </a>
            )}
            {mod.codeUrl && (
              <a href={mod.codeUrl} target="_blank" rel="noreferrer" className="text-xs px-2.5 py-1 rounded-lg no-underline" style={{ background: "#F1EFE8", color: "#5F5E5A", border: "0.5px solid rgba(0,0,0,0.1)" }}>
                ↗ Code
              </a>
            )}
          </div>

          {mod.deps.length > 0 && (
            <>
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-4 mb-1.5">Depends on</div>
              <div className="flex flex-wrap gap-1.5">
                {mod.deps.map((dep) => {
                  const depMod = modules[dep]
                  return (
                    <button key={dep} onClick={() => setSelected(dep)}
                      className="text-xs px-2 py-0.5 rounded border cursor-pointer"
                      style={{ borderColor: "rgba(0,0,0,0.1)", background: depMod ? phaseColors[depMod.phase]!.bg : "transparent", color: depMod ? phaseColors[depMod.phase]!.text : "#6b7280" }}>
                      {depMod ? depMod.name : dep}
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {mod.data.length > 0 && (
            <>
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-3 mb-1.5">DB tables</div>
              <div className="flex flex-wrap gap-1.5">
                {mod.data.map((d) => (
                  <code key={d} className="text-xs px-2 py-0.5 rounded border" style={{ borderColor: "rgba(0,0,0,0.1)", fontFamily: "monospace", fontSize: 11, color: "#6b7280" }}>{d}</code>
                ))}
              </div>
            </>
          )}

          <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-3 mb-1.5">Features</div>
          <ol className="text-sm text-gray-700 leading-relaxed pl-4 list-decimal">
            {mod.features.map((f, i) => <li key={i} className="mb-0.5">{f}</li>)}
          </ol>

          <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-3 mb-1.5">Technical approach</div>
          <p className="text-sm text-gray-600 leading-relaxed">{mod.tech}</p>
        </div>
      )}
    </div>
  )
}
