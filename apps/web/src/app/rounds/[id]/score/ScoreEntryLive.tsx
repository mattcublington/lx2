'use client'
import { useState, useReducer, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { PLAYER_COLOURS } from '@/lib/player-colours'
import type { ScoringHole, GroupPlayer, EventGroup } from './page'
import { enqueueScore, getQueuedScores, deleteQueuedScore, migrateFromLocalStorage } from '@/lib/offline-queue'
import { markRoundComplete } from '@/app/play/round-actions'

// Prevents concurrent drain runs per scorecard.
const draining = new Set<string>()

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Props {
  scorecardId: string
  eventId: string
  playerName: string
  handicapIndex: number
  format: 'stableford' | 'strokeplay' | 'matchplay'
  allowancePct: number
  roundType: '18' | '9'
  holes: ScoringHole[]
  initialScores: Record<number, number | null>
  initialPickups: Record<number, boolean>
  ntpHoles: number[]
  ldHoles: number[]
  eventPlayerId: string
  selectedTee: string
  eventName: string
  eventDate: string
  groupPlayers: GroupPlayer[]
  initialHole?: number
  shareCode?: string
  isOrganiser?: boolean
  myFlightNumber?: number | null
  allGroups?: EventGroup[]
}

interface State {
  hole: number
  scores: Record<number, number | null>
  pickups: Record<number, boolean>
  showNTP: boolean
  ntpResults: Record<number, string>
  ldResults: Record<number, string>
  showCard: boolean
}

type Action =
  | { type: 'SCORE'; holeInRound: number; v: number }
  | { type: 'PICKUP'; holeInRound: number }
  | { type: 'UNDO'; holeInRound: number }
  | { type: 'SET_HOLE'; idx: number }
  | { type: 'NEXT'; maxIdx: number }
  | { type: 'SKIP_C'; maxIdx: number }
  | { type: 'SAVE_C'; ct: 'ntp' | 'ld'; holeNum: number; dist: string; maxIdx: number }
  | { type: 'TOGGLE_CARD' }

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function allocateStrokes(hc: number, holes: ScoringHole[]): Record<number, number> {
  const result: Record<number, number> = {}
  for (const h of holes) result[h.holeInRound] = 0
  const order = holes
    .filter(h => h.siM !== null)
    .map(h => ({ hir: h.holeInRound, si: h.siM! }))
    .sort((a, b) => a.si - b.si)
  let remaining = hc
  while (remaining > 0) {
    for (const o of order) {
      if (remaining <= 0) break
      result[o.hir] = (result[o.hir] ?? 0) + 1
      remaining--
    }
  }
  return result
}

function pts(gross: number, par: number, hcShots: number): number {
  const d = (gross - hcShots) - par
  return d >= 2 ? 0 : d === 1 ? 1 : d === 0 ? 2 : d === -1 ? 3 : d === -2 ? 4 : 5
}

function ptsLabel(p: number, gross: number, par: number, hcShots: number): string {
  const net = gross - hcShots
  const diff = net - par
  const term = diff <= -3 ? 'albatross'
    : diff === -2 ? 'eagle'
    : diff === -1 ? 'birdie'
    : diff === 0 ? 'par'
    : diff === 1 ? 'bogey'
    : diff === 2 ? 'double'
    : 'triple+'
  if (p === 0) return `blob · net ${net}`
  return `${p === 1 ? '1pt' : p + 'pts'} · net ${term}`
}

function strokeResult(gross: number, par: number): string {
  const diff = gross - par
  if (diff <= -3) return 'Albatross'
  if (diff === -2) return 'Eagle'
  if (diff === -1) return 'Birdie'
  if (diff === 0) return 'Par'
  if (diff === 1) return 'Bogey'
  if (diff === 2) return 'Double'
  return `+${diff}`
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'SCORE':
      return { ...s, scores: { ...s.scores, [a.holeInRound]: a.v }, pickups: { ...s.pickups, [a.holeInRound]: false } }
    case 'PICKUP':
      return { ...s, scores: { ...s.scores, [a.holeInRound]: null }, pickups: { ...s.pickups, [a.holeInRound]: true } }
    case 'UNDO':
      return { ...s, scores: { ...s.scores, [a.holeInRound]: null }, pickups: { ...s.pickups, [a.holeInRound]: false } }
    case 'SET_HOLE': return { ...s, hole: a.idx, showNTP: false }
    case 'NEXT': return { ...s, hole: Math.min(a.maxIdx, s.hole + 1), showNTP: false }
    case 'SKIP_C': return { ...s, showNTP: false, hole: Math.min(a.maxIdx, s.hole + 1) }
    case 'SAVE_C': {
      const k = a.ct === 'ntp' ? 'ntpResults' : 'ldResults'
      return { ...s, [k]: { ...s[k], [a.holeNum]: a.dist }, showNTP: false, hole: Math.min(a.maxIdx, s.hole + 1) }
    }
    case 'TOGGLE_CARD': return { ...s, showCard: !s.showCard }
    default: return s
  }
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const STYLES = `
  /* ── Root ─────────────────────────────────────────────── */
  .sc {
    font-family: var(--font-lexend), 'Lexend', sans-serif;
    background: #F0F4EC;
    min-height: 100dvh;
    max-width: 480px;
    margin: 0 auto;
    padding-bottom: calc(80px + env(safe-area-inset-bottom));
    position: relative;
    color: #1A2E1A;
  }

  /* ── Context bar ───────────────────────────────────────── */
  .sc-bar {
    background: #FFFFFF;
    padding: 0.875rem 1.25rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 2px 8px rgba(26,28,28,0.04);
    position: sticky;
    top: 0;
    z-index: 50;
  }
  .sc-bar-title {
    font-family: var(--font-manrope), 'Manrope', sans-serif;
    font-weight: 700;
    font-size: 0.9375rem;
    color: #1A2E1A;
    letter-spacing: -0.01em;
  }
  .sc-icon-btn {
    width: 40px; height: 40px;
    border-radius: 12px;
    border: none;
    background: transparent;
    color: #44483E;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.2s, color 0.2s;
    flex-shrink: 0;
  }
  .sc-icon-btn:hover { background: rgba(26,28,28,0.05); color: #1A2E1A; }

  /* ── Share code chip ───────────────────────────────────── */
  .sc-share-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.3rem 0.625rem;
    border-radius: 20px;
    border: 1.5px solid rgba(13, 99, 27, 0.25);
    background: rgba(13, 99, 27, 0.07);
    color: #0D631B;
    font-family: var(--font-manrope), 'Manrope', sans-serif;
    font-weight: 700;
    font-size: 0.8125rem;
    letter-spacing: 0.08em;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .sc-share-chip:hover { background: rgba(13, 99, 27, 0.12); border-color: rgba(13, 99, 27, 0.4); }
  .sc-share-chip.copied { background: rgba(13, 99, 27, 0.15); color: #0D631B; border-color: rgba(13, 99, 27, 0.5); }

  /* ── Hole navigation ───────────────────────────────────── */
  .sc-nav {
    background: #FFFFFF;
    padding: 1rem 1.25rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    box-shadow: 0 2px 8px rgba(26,28,28,0.04);
    margin-bottom: 1rem;
  }
  .sc-nav-arr {
    width: 32px; height: 32px;
    border-radius: 50%;
    border: none;
    background: transparent;
    color: #44483E;
    font-size: 18px;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.15s, color 0.15s;
    flex-shrink: 0;
  }
  .sc-nav-arr:hover:not(:disabled) { background: rgba(26,28,28,0.06); color: #1A2E1A; }
  .sc-nav-arr:disabled { color: #D0D8CC; cursor: default; }
  .sc-holes { display: flex; gap: 0.625rem; flex: 1; justify-content: center; }
  .sc-hc {
    width: 48px; height: 48px;
    border-radius: 50%;
    border: 2px solid #D0D8CC;
    background: #FFFFFF;
    color: #72786E;
    font-family: var(--font-manrope), sans-serif;
    font-weight: 700;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
    position: relative;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .sc-hc.active  { background: #0D631B; border-color: #0D631B; color: #FFFFFF; }
  .sc-hc.scored  { border-color: #0D631B; color: #0D631B; }
  .sc-hc-check {
    position: absolute; top: -3px; right: -3px;
    width: 16px; height: 16px;
    border-radius: 50%;
    background: #0D631B;
    color: #FFFFFF;
    font-size: 8px;
    display: flex; align-items: center; justify-content: center;
    border: 2px solid #F0F4EC;
  }

  /* ── Auto-advance banner ───────────────────────────────── */
  .sc-advance {
    margin: 0 1.25rem 0.75rem;
    background: linear-gradient(135deg, rgba(13,99,27,0.1), rgba(61,107,26,0.15));
    border: 1px solid rgba(13,99,27,0.2);
    border-radius: 12px;
    padding: 0.875rem 1rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    animation: sc-slide-down 0.3s ease-out;
  }
  @keyframes sc-slide-down {
    from { opacity: 0; transform: translateY(-8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .sc-advance-icon { color: #0D631B; flex-shrink: 0; }
  .sc-advance-h { font-family: var(--font-lexend), sans-serif; font-size: 0.875rem; font-weight: 500; color: #1A2E1A; }
  .sc-advance-s { font-family: var(--font-lexend), sans-serif; font-size: 0.75rem; color: #72786E; margin-top: 1px; }

  /* ── Hole info card ────────────────────────────────────── */
  .sc-hole-card {
    background: #FFFFFF;
    border-radius: 16px;
    padding: 1.5rem;
    margin: 0 1.25rem 1rem;
    box-shadow: 0 4px 12px rgba(26,28,28,0.04);
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .sc-hole-title {
    font-family: var(--font-manrope), sans-serif;
    font-weight: 800;
    font-size: 2.25rem;
    color: #1A2E1A;
    letter-spacing: -0.02em;
    margin: 0;
    line-height: 1;
  }
  .sc-stroke-badge {
    display: inline-flex;
    margin-top: 0.375rem;
    background: rgba(13,99,27,0.1);
    color: #0D631B;
    font-family: var(--font-lexend), sans-serif;
    font-size: 0.75rem;
    font-weight: 500;
    padding: 0.25rem 0.625rem;
    border-radius: 24px;
  }
  .sc-contest-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    margin-top: 0.375rem;
    font-family: var(--font-lexend), sans-serif;
    font-size: 0.6875rem;
    font-weight: 600;
    padding: 0.25rem 0.625rem;
    border-radius: 10px;
  }
  .sc-contest-badge.ntp { background: #FEF3E2; color: #B8660B; }
  .sc-contest-badge.ld  { background: #E8F4FD; color: #1A6DA0; }
  .sc-hole-stats { display: flex; flex-direction: column; align-items: flex-end; gap: 0.3rem; }
  .sc-stat { display: flex; align-items: baseline; gap: 0.5rem; }
  .sc-stat-lbl {
    font-family: var(--font-lexend), sans-serif;
    font-size: 0.6875rem; color: #72786E;
    text-transform: uppercase; letter-spacing: 0.06em;
  }
  .sc-stat-val {
    font-family: var(--font-manrope), sans-serif;
    font-weight: 700; font-size: 1rem; color: #1A2E1A;
  }

  /* ── Player scoring cards ──────────────────────────────── */
  .sc-players { padding: 0 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .sc-pcard {
    background: #FFFFFF;
    border-radius: 12px;
    padding: 1rem 1.25rem;
    box-shadow: 0 4px 12px rgba(26,28,28,0.04);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    cursor: pointer;
    transition: transform 0.15s, box-shadow 0.15s;
    animation: sc-rise 0.35s ease both;
    -webkit-tap-highlight-color: transparent;
  }
  .sc-pcard:hover { box-shadow: 0 6px 16px rgba(26,28,28,0.08); }
  .sc-pcard:active { transform: scale(0.99); }
  @keyframes sc-rise {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .sc-pcard-left { display: flex; align-items: center; gap: 0.75rem; flex: 1; min-width: 0; }
  .sc-avatar {
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-family: var(--font-manrope), sans-serif;
    font-weight: 700; color: #FFFFFF;
    flex-shrink: 0;
  }
  .sc-player-name {
    font-family: var(--font-lexend), sans-serif;
    font-weight: 500; font-size: 0.9375rem; color: #1A2E1A;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .sc-player-you {
    font-family: var(--font-lexend), sans-serif;
    font-size: 0.6875rem; color: #72786E;
  }
  /* Unscored card accent */
  .sc-pcard.unscored {
    border-left: 3px solid #0D631B;
    animation: sc-rise 0.35s ease both, sc-pulse-border 2s ease-in-out 1s 3;
  }
  @keyframes sc-pulse-border {
    0%, 100% { border-left-color: #0D631B; }
    50%      { border-left-color: #4ade80; }
  }
  /* Unscored right */
  .sc-unscored-r { display: flex; align-items: center; gap: 0.5rem; }
  .sc-enter-prompt { display: flex; flex-direction: column; align-items: flex-end; gap: 0.125rem; }
  .sc-net-par-hint {
    font-family: var(--font-manrope), sans-serif;
    font-weight: 700; font-size: 0.9375rem;
    color: #1A2E1A;
  }
  .sc-tap-hint  {
    font-family: var(--font-lexend), sans-serif;
    font-size: 0.6875rem; color: #0D631B; font-weight: 500;
  }
  .sc-chevron {
    color: #0D631B; opacity: 0.5; flex-shrink: 0;
    width: 18px; height: 18px;
  }
  /* Scored right */
  .sc-scored-r { display: flex; flex-direction: column; align-items: flex-end; gap: 0.25rem; }
  .sc-score-n {
    font-family: var(--font-manrope), sans-serif;
    font-weight: 700; font-size: 1.875rem;
    line-height: 1; letter-spacing: -0.02em;
  }
  .sc-pts-pill {
    background: linear-gradient(135deg, rgba(13,99,27,0.1), rgba(61,107,26,0.12));
    color: #0D631B;
    font-family: var(--font-lexend), sans-serif;
    font-size: 0.6875rem; font-weight: 500;
    padding: 0.2rem 0.625rem;
    border-radius: 24px; white-space: nowrap;
  }
  .sc-pickup-lbl {
    font-family: var(--font-lexend), sans-serif;
    font-size: 0.75rem; color: #72786E; font-style: italic;
  }

  /* ── Bottom action bar ─────────────────────────────────── */
  .sc-bottom {
    position: fixed; bottom: 0; left: 0; right: 0;
    background: #FFFFFF;
    display: flex; align-items: center; gap: 0.625rem;
    padding: 0.875rem 1.25rem;
    padding-bottom: calc(0.875rem + env(safe-area-inset-bottom));
    box-shadow: 0 -2px 8px rgba(26,28,28,0.06);
    z-index: 50;
  }
  .sc-bottom-player { display: flex; align-items: center; gap: 0.5rem; flex: 1; min-width: 0; }
  .sc-bottom-name {
    font-family: var(--font-manrope), sans-serif;
    font-weight: 700; font-size: 0.875rem; color: #1A2E1A; line-height: 1.2;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px;
  }
  .sc-bottom-pts {
    font-family: var(--font-lexend), sans-serif;
    font-size: 0.6875rem; color: #72786E; white-space: nowrap;
  }
  .sc-act-btn {
    background: transparent;
    border: 2px solid rgba(26,28,28,0.18);
    color: #1A2E1A;
    font-family: var(--font-lexend), sans-serif;
    font-weight: 500; font-size: 0.8125rem;
    padding: 0.5rem 0.75rem;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
    text-decoration: none;
    display: inline-flex; align-items: center;
    flex-shrink: 0;
  }
  .sc-act-btn:hover {
    background: #F0F4EC;
    border-color: rgba(26,28,28,0.3);
    transform: translateY(-1px);
  }
  .sc-act-finish {
    background: linear-gradient(135deg, #0D631B 0%, #0a4f15 100%);
    color: #ffffff;
    font-family: var(--font-lexend), sans-serif;
    font-weight: 600; font-size: 0.875rem;
    padding: 0.625rem 1.25rem;
    border-radius: 12px;
    cursor: pointer;
    text-decoration: none;
    display: inline-flex; align-items: center;
    flex-shrink: 0;
    box-shadow: 0 4px 12px rgba(13,99,27,0.2);
    transition: transform 0.15s, box-shadow 0.15s;
  }
  .sc-act-finish:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(13,99,27,0.3); }

  /* ── Finish round banner ───────────────────────────────── */
  .sc-finish {
    margin: 0 1rem 1rem;
    background: linear-gradient(135deg, #0D631B 0%, #0a4f15 100%);
    border-radius: 16px;
    padding: 1.125rem 1.25rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    box-shadow: 0 6px 20px rgba(13,99,27,0.25);
    animation: sc-in 0.3s cubic-bezier(0.2,0,0,1) both;
  }
  .sc-finish-text { flex: 1; }
  .sc-finish-h {
    font-family: var(--font-manrope), sans-serif;
    font-weight: 700; font-size: 0.9375rem; color: #ffffff;
    margin-bottom: 0.125rem;
  }
  .sc-finish-s {
    font-family: var(--font-lexend), sans-serif;
    font-size: 0.8125rem; color: rgba(255,255,255,0.75);
  }
  .sc-finish-btn {
    background: rgba(255,255,255,0.15);
    border: 1.5px solid rgba(255,255,255,0.3);
    color: #ffffff;
    font-family: var(--font-lexend), sans-serif;
    font-weight: 600; font-size: 0.875rem;
    padding: 0.625rem 1rem;
    border-radius: 12px;
    cursor: pointer;
    transition: background 0.15s;
    white-space: nowrap;
    flex-shrink: 0;
    text-decoration: none;
    display: inline-flex; align-items: center;
  }
  .sc-finish-btn:hover { background: rgba(255,255,255,0.25); }

  /* ── Modal overlay ─────────────────────────────────────── */
  .sc-overlay {
    position: fixed; inset: 0;
    background: rgba(26,28,28,0.6);
    z-index: 200;
    display: flex; align-items: center; justify-content: center;
    padding: 1rem;
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
  }
  .sc-modal {
    background: #FFFFFF;
    border-radius: 24px;
    width: 100%; max-width: 380px;
    box-shadow: 0 24px 64px rgba(26,28,28,0.2);
    animation: sc-modal-in 0.28s cubic-bezier(0.2,0,0,1);
    overflow: hidden;
  }
  @keyframes sc-modal-in {
    from { opacity: 0; transform: translateY(24px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  .sc-modal-hd {
    padding: 1.5rem 1.5rem 1rem;
    border-bottom: 1px solid rgba(26,28,28,0.06);
  }
  .sc-modal-player-row { display: flex; align-items: center; gap: 0.75rem; }
  .sc-modal-title {
    font-family: var(--font-manrope), sans-serif;
    font-weight: 700; font-size: 1.125rem; color: #1A2E1A;
  }
  .sc-modal-ctx {
    font-family: var(--font-lexend), sans-serif;
    font-size: 0.875rem; color: #72786E;
    margin-top: 0.25rem; margin-left: 48px;
  }
  .sc-modal-body { padding: 1.5rem; }
  .sc-qs-lbl {
    font-family: var(--font-lexend), sans-serif;
    font-size: 0.6875rem; font-weight: 500; color: #72786E;
    text-transform: uppercase; letter-spacing: 0.06em;
    text-align: center; margin-bottom: 0.75rem;
  }
  .sc-modal-qs { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; margin-bottom: 1.5rem; }
  .sc-mqbtn {
    width: 44px; height: 44px;
    border-radius: 50%;
    border: 2px solid transparent;
    background: rgba(240,244,236,0.6);
    color: #1A2E1A;
    font-family: var(--font-manrope), sans-serif;
    font-weight: 700; font-size: 1.0625rem;
    cursor: pointer;
    transition: all 0.14s;
    display: flex; align-items: center; justify-content: center;
  }
  .sc-mqbtn.par    { border-color: rgba(13,99,27,0.3); }
  .sc-mqbtn.sel    { background: #0D631B; color: #FFFFFF; border-color: #0D631B; }
  .sc-mqbtn:hover:not(.sel) { background: rgba(13,99,27,0.1); border-color: rgba(13,99,27,0.3); }
  .sc-stepper { display: flex; align-items: center; justify-content: center; gap: 1.5rem; margin-bottom: 1rem; }
  .sc-step-btn {
    width: 48px; height: 48px;
    border-radius: 50%; border: none;
    background: #F0F4EC; color: #0D631B;
    font-size: 1.375rem; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.14s;
  }
  .sc-step-btn:hover { background: rgba(13,99,27,0.15); }
  .sc-step-display {
    font-family: var(--font-manrope), sans-serif;
    font-weight: 800; font-size: 3.5rem;
    color: #1A2E1A; min-width: 80px;
    text-align: center; letter-spacing: -0.03em; line-height: 1;
  }
  .sc-step-display.dim { color: #C8D4C8; }
  .sc-feedback {
    background: linear-gradient(135deg, rgba(13,99,27,0.1), rgba(61,107,26,0.14));
    color: #0D631B;
    font-family: var(--font-lexend), sans-serif;
    font-size: 0.875rem; font-weight: 500;
    padding: 0.625rem 1.25rem;
    border-radius: 24px;
    text-align: center;
    display: block; width: fit-content; margin: 0 auto;
  }
  .sc-modal-ft {
    padding: 0 1.5rem 1.5rem;
    display: flex; flex-direction: column; gap: 0.75rem;
  }
  .sc-save-btn {
    width: 100%; padding: 1rem;
    background: linear-gradient(135deg, #0D631B, #0a4f15);
    color: #FFFFFF; border: none;
    border-radius: 16px;
    font-family: var(--font-manrope), sans-serif;
    font-weight: 700; font-size: 1rem;
    cursor: pointer; letter-spacing: -0.01em;
    transition: transform 0.14s, box-shadow 0.14s;
  }
  .sc-save-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(13,99,27,0.25); }
  .sc-save-btn:disabled { opacity: 0.45; cursor: default; }
  .sc-pickup-lnk {
    background: none; border: none;
    color: #923357;
    font-family: var(--font-lexend), sans-serif;
    font-size: 0.8125rem; font-weight: 500;
    cursor: pointer; text-align: center; padding: 0;
  }

  /* ── Settings modal ────────────────────────────────────── */
  .sc-settings {
    background: #FFFFFF;
    border-radius: 24px;
    width: 100%; max-width: 380px;
    box-shadow: 0 12px 32px rgba(26,28,28,0.15);
    animation: sc-modal-in 0.28s cubic-bezier(0.2,0,0,1);
    overflow: hidden;
  }
  .sc-settings-hd {
    padding: 1.75rem 1.5rem 1.25rem;
    border-bottom: 1px solid rgba(26,28,28,0.06);
    display: flex; justify-content: space-between; align-items: center;
  }
  .sc-settings-title {
    font-family: var(--font-manrope), sans-serif;
    font-weight: 700; font-size: 1.5rem; color: #1A2E1A;
    letter-spacing: -0.02em; margin: 0;
  }
  .sc-settings-close {
    width: 40px; height: 40px;
    border-radius: 12px; border: none;
    background: transparent; color: #44483E;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.125rem; transition: background 0.15s;
  }
  .sc-settings-close:hover { background: rgba(26,28,28,0.05); }
  .sc-settings-list { padding: 0.5rem 0; }
  .sc-settings-row {
    display: flex; align-items: center; gap: 1rem;
    padding: 1rem 1.5rem;
    cursor: pointer; transition: background 0.14s;
    text-decoration: none; color: inherit;
    border: none; background: none;
    width: 100%; text-align: left;
  }
  .sc-settings-row:hover { background: #F0F4EC; }
  .sc-settings-ico {
    width: 40px; height: 40px;
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; font-size: 1.125rem;
  }
  .sc-settings-ico.green { background: linear-gradient(135deg, rgba(13,99,27,0.1), rgba(61,107,26,0.12)); }
  .sc-settings-ico.berry { background: rgba(146,51,87,0.1); }
  .sc-settings-lbl { font-family: var(--font-lexend), sans-serif; font-weight: 500; font-size: 1rem; flex: 1; }
  .sc-settings-lbl.berry { color: #923357; }
  .sc-settings-lbl.green { color: #0D631B; }
  .sc-settings-chev { color: #72786E; font-size: 0.9375rem; }
  .sc-settings-div { height: 1px; background: rgba(26,28,28,0.06); margin: 0.5rem 1.5rem; }
  .sc-danger-lbl {
    padding: 0.75rem 1.5rem 0.25rem;
    font-family: var(--font-lexend), sans-serif;
    font-size: 0.75rem; font-weight: 500; color: #72786E;
    text-transform: uppercase; letter-spacing: 0.06em;
  }
  .sc-settings-ft {
    padding: 1rem 1.5rem 1.75rem;
    border-top: 1px solid rgba(26,28,28,0.06);
  }
  .sc-cancel-btn {
    width: 100%; padding: 1rem;
    background: transparent; border: none;
    color: #44483E;
    font-family: var(--font-lexend), sans-serif;
    font-weight: 500; font-size: 1rem;
    cursor: pointer; border-radius: 12px;
    transition: background 0.14s;
  }
  .sc-cancel-btn:hover { background: #F0F4EC; }

  /* ── Group switcher ─────────────────────────────────────── */
  .sc-groups {
    padding: 0.5rem 1.25rem 0.75rem;
    display: flex;
    gap: 0.5rem;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .sc-groups::-webkit-scrollbar { display: none; }
  .sc-group-tab {
    flex-shrink: 0;
    padding: 0.5rem 1rem;
    border-radius: 20px;
    border: 1.5px solid #E0EBE0;
    background: #FFFFFF;
    font-family: var(--font-lexend), 'Lexend', sans-serif;
    font-size: 0.75rem;
    font-weight: 500;
    color: #44483E;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
  }
  .sc-group-tab:hover { border-color: rgba(13,99,27,0.4); }
  .sc-group-tab.active {
    background: #0D631B;
    border-color: #0D631B;
    color: #FFFFFF;
    font-weight: 600;
  }
  .sc-group-tab .sc-group-names {
    display: block;
    font-size: 0.625rem;
    font-weight: 400;
    opacity: 0.7;
    margin-top: 1px;
  }
  .sc-readonly-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    margin-left: 1.25rem;
    margin-bottom: 0.5rem;
    padding: 0.25rem 0.625rem;
    border-radius: 8px;
    background: rgba(13,99,27,0.08);
    font-family: var(--font-lexend), 'Lexend', sans-serif;
    font-size: 0.6875rem;
    font-weight: 500;
    color: #6B8C6B;
  }

  /* ── Contest overlay (NTP / LD) ────────────────────────── */
  .sc-contest-modal {
    background: #FFFFFF;
    border-radius: 24px;
    width: 100%; max-width: 340px;
    box-shadow: 0 24px 64px rgba(26,28,28,0.2);
    animation: sc-modal-in 0.28s cubic-bezier(0.2,0,0,1);
    overflow: hidden;
  }
  .sc-contest-input {
    width: 100%; padding: 0.875rem 1rem;
    border: 2px solid #E0EBE0; border-radius: 12px;
    font-family: var(--font-lexend), sans-serif; font-size: 1rem;
    outline: none; transition: border-color 0.15s; color: #1A2E1A;
  }
  .sc-contest-input:focus { border-color: #0D631B; }

  /* ── Scorecard view ────────────────────────────────────── */
  .sc-card-page {
    max-width: 480px; margin: 0 auto;
    background: #FAFBF8;
    font-family: var(--font-lexend), sans-serif;
    color: #1a2e1a; min-height: 100vh;
  }
  .sc-card-topbar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0.875rem 1rem;
    border-bottom: 1px solid #E0EBE0;
    background: #FFFFFF; position: sticky; top: 0; z-index: 50;
  }
  .sc-card-back {
    background: none; border: none; font-size: 0.875rem;
    color: #0D631B; font-weight: 600; cursor: pointer;
    font-family: var(--font-lexend), sans-serif;
  }
  .sc-card-ttl {
    font-family: var(--font-manrope), sans-serif;
    font-weight: 700; font-size: 1rem; color: #1A2E1A;
  }

  /* ── Responsive centering for bottom bar ───────────────── */
  @media (min-width: 480px) {
    .sc-bottom { max-width: 480px; left: 50%; transform: translateX(-50%); }
  }

  /* ── Scorecard redesign ─────────────────────────────────── */
  .sc-ctx {
    background: #FFFFFF; border-radius: 16px;
    padding: 1.25rem; margin-bottom: 1rem;
    box-shadow: 0 2px 8px rgba(26,28,28,0.05);
  }
  .sc-course {
    font-family: var(--font-manrope), sans-serif;
    font-weight: 700; font-size: 18px; color: #1A2E1A; margin-bottom: 4px;
  }
  .sc-meta {
    font-family: var(--font-lexend), sans-serif;
    font-size: 13px; color: #44483E; margin-bottom: 2px;
  }
  .sc-player {
    font-family: var(--font-lexend), sans-serif;
    font-size: 14px; font-weight: 500; color: #1A2E1A; margin-top: 6px;
  }
  .sc-toggle { display: flex; gap: 8px; margin-bottom: 16px; }
  .sc-pill {
    flex: 1; padding: 10px 12px; border-radius: 24px;
    border: 1.5px solid #d0d8cc; background: transparent;
    font-family: var(--font-lexend), sans-serif;
    font-weight: 500; font-size: 13px; color: #44483E;
    cursor: pointer; transition: all 0.15s;
  }
  .sc-pill.act {
    background: linear-gradient(135deg, #0D631B 0%, #0a4f15 100%);
    color: #FFFFFF; border-color: #0D631B;
  }
  .sc-tbl-wrap {
    margin: 0 16px 16px; border-radius: 16px;
    box-shadow: 0 2px 8px rgba(26,28,28,0.05); overflow: hidden;
  }
  .sc-tbl { width: 100%; border-collapse: collapse; background: #FFFFFF; }
  .sc-th {
    font-size: 10px; font-weight: 500; color: #72786E;
    text-transform: uppercase; letter-spacing: 0.05em;
    padding: 10px 8px; text-align: center;
    border-bottom: 1px solid rgba(26,28,28,0.06);
    background: #F0F4EC;
    font-family: var(--font-lexend), sans-serif;
  }
  .sc-th-hole { text-align: left; padding-left: 14px; }
  .sc-th-player { color: #0D631B; }
  .sc-td {
    padding: 10px 8px; text-align: center;
    font-size: 13px; color: #1A2E1A;
    font-family: var(--font-lexend), sans-serif;
  }
  .sc-td-hole {
    text-align: left; padding-left: 14px;
    font-family: var(--font-manrope), sans-serif;
    font-weight: 700; color: #1A2E1A; font-size: 14px;
  }
  .sc-td-par { color: #72786E; }
  .sc-td-muted { color: #9aaa9a; font-size: 12px; }
  .sc-row { border-bottom: 1px solid rgba(240,244,236,0.8); }
  .sc-row-even { background: rgba(240,244,236,0.35); }
  .sc-row-cur { background: #EDF2E9 !important; }
  .sc-row:active { background: #F0F4EC; }
  .sc-sub td {
    padding: 10px 8px; font-size: 11px; font-weight: 700;
    border-top: 2px solid rgba(26,28,28,0.1);
    border-bottom: 2px solid rgba(26,28,28,0.06);
    background: rgba(240,244,236,0.6);
    font-family: var(--font-manrope), sans-serif;
    text-align: center;
  }
  .sc-sub .sc-td-hole {
    font-size: 10px; text-transform: uppercase; letter-spacing: 0.07em; color: #44483E;
  }
  .sc-total td {
    border-top: 3px solid rgba(13,99,27,0.4) !important;
    background: rgba(13,99,27,0.06) !important;
  }

  /* ── Leaderboard panel ──────────────────────────────────── */
  .sc-lb-page {
    position: fixed; inset: 0;
    background: #F0F4EC;
    z-index: 80;
    overflow-y: auto;
    overscroll-behavior: contain;
    font-family: var(--font-lexend), 'Lexend', sans-serif;
    animation: sc-lb-in 0.22s ease both;
  }
  @keyframes sc-lb-in {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .sc-lb-header {
    background: #F0F4EC;
    padding: 1rem 1.25rem;
    display: flex; align-items: center; justify-content: space-between;
    position: sticky; top: 0; z-index: 10;
  }
  .sc-lb-back {
    width: 40px; height: 40px;
    background: transparent; border: none;
    border-radius: 12px; color: #1A2E1A;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    font-size: 1.25rem; transition: background 0.15s, transform 0.15s;
  }
  .sc-lb-back:hover { background: rgba(26,28,28,0.05); transform: translateX(-2px); }
  .sc-lb-title {
    font-family: var(--font-manrope), 'Manrope', sans-serif;
    font-weight: 700; font-size: 1.125rem; color: #1A2E1A;
    position: absolute; left: 50%; transform: translateX(-50%);
    letter-spacing: -0.01em;
  }
  .sc-lb-tv {
    font-family: var(--font-lexend), sans-serif;
    font-size: 0.75rem; font-weight: 600; color: #0D631B;
    text-decoration: none; padding: 6px 12px;
    border-radius: 8px; border: 1.5px solid rgba(13,99,27,0.3);
    transition: background 0.15s;
  }
  .sc-lb-tv:hover { background: rgba(13,99,27,0.06); }
  .sc-lb-body { padding: 0 1.25rem 80px; display: flex; flex-direction: column; gap: 6px; }
  .sc-lb-status {
    display: flex; align-items: center; justify-content: space-between;
    padding: 4px 2px 8px;
  }
  .sc-lb-live { display: flex; align-items: center; gap: 6px; }
  .sc-lb-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: #4ade80; box-shadow: 0 0 0 2px rgba(74,222,128,0.25);
    animation: sc-lb-pulse 2.2s ease-in-out infinite;
  }
  @keyframes sc-lb-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
  .sc-lb-live-lbl {
    font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.1em;
    text-transform: uppercase; color: #4ade80;
  }
  .sc-lb-count { font-size: 0.75rem; color: #6B8C6B; }
  .sc-lb-progress {
    background: #fff; border-radius: 12px;
    padding: 0.75rem 1rem; text-align: center;
    font-size: 0.875rem; color: #6B8C6B;
    box-shadow: 0 2px 8px rgba(26,28,28,0.04);
  }
  .sc-lb-progress strong { color: #1A2E1A; font-weight: 600; }
  .sc-lb-card {
    background: #fff; border-radius: 14px;
    border: 1px solid #E0EBE0; overflow: hidden;
    cursor: pointer; transition: box-shadow 0.15s, transform 0.15s;
    -webkit-tap-highlight-color: transparent;
  }
  .sc-lb-card:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(13,99,27,0.08); }
  .sc-lb-card.me { background: rgba(240,244,236,0.6); }
  .sc-lb-row { display: flex; align-items: center; padding: 14px 14px; gap: 10px; }
  .sc-lb-rank {
    flex-shrink: 0; width: 30px; height: 30px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-family: var(--font-manrope), sans-serif;
    font-weight: 700; font-size: 0.6875rem;
  }
  .sc-lb-rank.r1 { background: linear-gradient(135deg,#FFD700,#FFA500); color: #1A2E1A; }
  .sc-lb-rank.r2 { background: linear-gradient(135deg,#C0C0C0,#A8A8A8); color: #1A2E1A; }
  .sc-lb-rank.r3 { background: linear-gradient(135deg,#CD7F32,#B8722E); color: #fff; }
  .sc-lb-rank.rx { background: rgba(26,28,28,0.08); color: #44483E; }
  .sc-lb-rank.rns { background: #F9FAFB; color: #9CA3AF; }
  .sc-lb-avatar {
    flex-shrink: 0; width: 36px; height: 36px; border-radius: 50%;
    background: linear-gradient(135deg,#0D631B,#0D631B);
    color: #fff; font-size: 0.75rem; font-weight: 700;
    font-family: var(--font-manrope), sans-serif;
    display: flex; align-items: center; justify-content: center;
  }
  .sc-lb-info { flex: 1; min-width: 0; }
  .sc-lb-name {
    font-weight: 600; font-size: 0.9375rem; color: #1A2E1A;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .sc-lb-name.me { color: #0D631B; }
  .sc-lb-sub { font-size: 0.6875rem; color: #6B8C6B; margin-top: 2px; }
  .sc-lb-scores { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .sc-lb-pts {
    font-family: var(--font-manrope), sans-serif;
    font-weight: 800; font-size: 1.5rem; color: #0D631B;
    letter-spacing: -0.03em; line-height: 1;
  }
  .sc-lb-pts.leader { color: #0D631B; }
  .sc-lb-pill {
    background: linear-gradient(135deg,rgba(13,99,27,0.1),rgba(61,107,26,0.1));
    padding: 0.25rem 0.5rem; border-radius: 8px;
    font-size: 0.6875rem; font-weight: 500; color: #0D631B;
    white-space: nowrap;
  }
  .sc-lb-chev {
    flex-shrink: 0; color: #b0c0b0; transition: transform 0.2s;
  }
  .sc-lb-chev.open { transform: rotate(180deg); }
  /* Expanded scorecard inside lb card */
  .sc-lb-sc {
    border-top: 1px solid rgba(26,28,28,0.06);
    padding: 1rem 1rem 1.25rem;
    overflow-x: auto; scrollbar-width: none;
  }
  .sc-lb-sc::-webkit-scrollbar { display: none; }
  .sc-lb-sc-tbl { width: 100%; border-collapse: collapse; min-width: 200px; }
  .sc-lb-sc-tbl th {
    font-size: 0.6875rem; font-weight: 500; color: #6B8C6B; text-align: center;
    padding: 0.375rem 0.5rem; border-bottom: 1px solid rgba(26,28,28,0.06);
    font-family: var(--font-lexend), sans-serif;
  }
  .sc-lb-sc-tbl td { text-align: center; padding: 0.5rem 0.5rem; border-bottom: 1px solid rgba(26,28,28,0.04); }
  .sc-lb-sc-tbl tr:last-child td { border-bottom: none; }
  .sc-lb-sc-hole {
    width: 26px; height: 26px; border-radius: 50%;
    background: rgba(26,28,28,0.05);
    display: inline-flex; align-items: center; justify-content: center;
    font-family: var(--font-manrope), sans-serif;
    font-weight: 600; font-size: 0.75rem; color: #1A2E1A;
  }
  .sc-lb-sc-par { font-size: 0.875rem; color: #44483E; font-family: var(--font-lexend), sans-serif; }
  .sc-lb-sc-score {
    font-family: var(--font-manrope), sans-serif;
    font-weight: 700; font-size: 0.9375rem;
  }
  .sc-lb-sc-score.under { color: #0D631B; }
  .sc-lb-sc-score.over  { color: #923357; }
  .sc-lb-sc-score.par   { color: #1A2E1A; }
  .sc-lb-sc-score.blank { color: #c0c0c0; font-weight: 400; font-size: 0.8125rem; }
  .sc-lb-sc-pts-cell {
    background: rgba(13,99,27,0.08); padding: 0.15rem 0.375rem;
    border-radius: 5px; font-size: 0.6875rem; font-weight: 500;
    color: #0D631B; display: inline-block;
    font-family: var(--font-lexend), sans-serif;
  }
  .sc-lb-total {
    text-align: right; font-family: var(--font-manrope), sans-serif;
    font-weight: 700; font-size: 0.875rem; color: #0D631B; padding-top: 0.5rem;
  }
  .sc-lb-footer {
    text-align: center; padding: 1rem 0 0.5rem;
  }
  .sc-lb-full-link {
    font-family: var(--font-lexend), sans-serif;
    font-size: 0.8125rem; color: #6B8C6B; text-decoration: underline;
    background: none; border: none; cursor: pointer;
    text-decoration-color: rgba(107,140,107,0.4);
  }
`

// ─── Component ────────────────────────────────────────────────────────────────

export default function ScoreEntryLive(props: Props) {
  const {
    scorecardId, eventId, playerName, handicapIndex, format, allowancePct,
    holes, initialScores, initialPickups, ntpHoles, ldHoles, eventPlayerId,
    selectedTee, eventName, eventDate, groupPlayers, initialHole = 0,
    shareCode, isOrganiser, myFlightNumber, allGroups = [],
  } = props

  const router = useRouter()

  // ── State ──────────────────────────────────────────────────────────────────

  const [liveScores, setLiveScores] = useState<Record<string, Record<number, number | null>>>(() => {
    const init: Record<string, Record<number, number | null>> = {}
    for (const p of groupPlayers) init[p.scorecardId] = { ...p.initialScores }
    return init
  })

  const maxIdx = holes.length - 1

  const [s, d] = useReducer(reducer, {
    hole: initialHole,
    scores: initialScores,
    pickups: initialPickups,
    showNTP: false,
    ntpResults: {},
    ldResults: {},
    showCard: false,
  })

  // New UI state
  const [scoreModalId, setScoreModalId] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [autoAdvance, setAutoAdvance] = useState<{ from: number; to: number } | null>(null)
  const [cDist, setCDist] = useState('')
  const [showContestOverlay, setShowContestOverlay] = useState(false)
  const [cardView, setCardView] = useState<'front9' | 'back9' | 'all18'>('front9')
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)
  const [activeGroup, setActiveGroup] = useState<number | null>(myFlightNumber ?? null)

  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoAdvancedHoles = useRef<Set<number>>(new Set())

  // ── Supabase client ────────────────────────────────────────────────────────

  const sb = useRef(
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
  ).current

  // ── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => { migrateFromLocalStorage(scorecardId) }, [scorecardId])

  // Realtime: subscribe to hole_scores for all scorecards in the group
  useEffect(() => {
    if (groupPlayers.length === 0) return
    const ids = groupPlayers.map(p => p.scorecardId).filter(Boolean)
    if (ids.length === 0) return

    const channel = sb
      .channel('group-hole-scores')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hole_scores' }, (payload) => {
        const row = (payload.new ?? payload.old) as {
          scorecard_id: string; hole_number: number; gross_strokes: number | null
        } | undefined
        if (!row || !ids.includes(row.scorecard_id)) return
        setLiveScores(prev => {
          const next = { ...(prev[row.scorecard_id] ?? {}) }
          if (payload.eventType === 'DELETE') delete next[row.hole_number]
          else next[row.hole_number] = row.gross_strokes ?? null
          return { ...prev, [row.scorecard_id]: next }
        })
      })
      .subscribe()

    return () => { sb.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sb])

  // Auto-advance check triggered by realtime score updates from group members
  useEffect(() => {
    const hir = holes[s.hole]?.holeInRound
    if (!hir) return
    const myScored = (s.scores[hir] != null) || (s.pickups[hir] ?? false)
    if (!myScored) return
    checkAutoAdvance(hir)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveScores])

  // Drain offline queue when back online
  const drainQueue = useCallback(async () => {
    if (draining.has(scorecardId)) return
    draining.add(scorecardId)
    window.dispatchEvent(new CustomEvent('lx2:sync-start'))
    try {
      const queue = await getQueuedScores(scorecardId)
      for (const entry of queue) {
        const { error } = await sb.from('hole_scores').upsert({
          scorecard_id: scorecardId,
          hole_number: entry.hole_number,
          gross_strokes: entry.gross_strokes,
        }, { onConflict: 'scorecard_id,hole_number' })
        if (!error) await deleteQueuedScore(scorecardId, entry.hole_number)
      }
    } finally {
      draining.delete(scorecardId)
      window.dispatchEvent(new CustomEvent('lx2:sync-complete'))
    }
  }, [sb, scorecardId])

  useEffect(() => {
    window.addEventListener('online', drainQueue)
    return () => window.removeEventListener('online', drainQueue)
  }, [drainQueue])

  // ── Must be declared before getRunningTotal() call below (avoids TDZ in production) ──
  const effectiveHc    = Math.round(handicapIndex * allowancePct)
  const strokesPerHole = allocateStrokes(effectiveHc, holes)

  // Mark round complete server-side when all holes are scored
  const { holesPlayed: _hp } = getRunningTotal()
  const roundCompleteForEffect = _hp === holes.length && holes.length > 0
  useEffect(() => {
    if (roundCompleteForEffect) {
      markRoundComplete(scorecardId).catch(() => {/* fire-and-forget */})
    }
  }, [roundCompleteForEffect, scorecardId])

  // ── Derived ────────────────────────────────────────────────────────────────

  const hole = holes[s.hole]!
  const isNTP = ntpHoles.includes(hole.holeInRound)
  const isLD  = ldHoles.includes(hole.holeInRound)
  const isPickup   = s.pickups[hole.holeInRound] ?? false
  const currentScore = s.scores[hole.holeInRound] ?? null
  const hcOnHole = strokesPerHole[hole.holeInRound] ?? 0
  const yards = hole.yards[selectedTee] ?? null

  // ── Running totals ─────────────────────────────────────────────────────────

  function getRunningTotal() {
    let totalPts = 0, totalStrokes = 0, holesPlayed = 0
    for (const h of holes) {
      const sc = s.scores[h.holeInRound]
      const pu = s.pickups[h.holeInRound]
      if (pu) { holesPlayed++; continue }
      if (sc != null) {
        holesPlayed++
        if (format === 'stableford') totalPts += pts(sc, h.par, strokesPerHole[h.holeInRound] ?? 0)
        else totalStrokes += sc
      }
    }
    return { totalPts, totalStrokes, holesPlayed }
  }

  // ── Persistence ────────────────────────────────────────────────────────────

  async function persistScore(holeInRound: number, value: number | null) {
    const entry = { scorecard_id: scorecardId, hole_number: holeInRound, gross_strokes: value, queued_at: Date.now() }
    if (!navigator.onLine) { await enqueueScore(entry); return }
    const { error } = await sb.from('hole_scores').upsert(
      { scorecard_id: scorecardId, hole_number: holeInRound, gross_strokes: value },
      { onConflict: 'scorecard_id,hole_number' },
    )
    if (error) await enqueueScore(entry)
  }

  async function persistScoreForOther(scId: string, holeInRound: number, value: number | null) {
    await sb.from('hole_scores').upsert(
      { scorecard_id: scId, hole_number: holeInRound, gross_strokes: value },
      { onConflict: 'scorecard_id,hole_number' },
    )
  }

  async function persistContest(ct: 'ntp' | 'ld', holeNum: number, distYards: string) {
    const cm = Math.round(parseFloat(distYards) * 91.44)
    if (isNaN(cm) || cm <= 0) return
    await sb.from('contest_entries').upsert(
      {
        event_id: eventId,
        hole_number: holeNum,
        type: ct,
        event_player_id: eventPlayerId,
        distance_cm: cm,
      },
      { onConflict: 'event_id,hole_number,type,event_player_id' },
    )
  }

  // ── Auto-advance ───────────────────────────────────────────────────────────

  function checkAutoAdvance(hir: number) {
    if (autoAdvancedHoles.current.has(hir)) return
    if (s.hole >= maxIdx) return
    const playersWithScorecard = groupPlayers.filter(p => p.scorecardId)

    // Solo play: advance quickly after scoring
    if (playersWithScorecard.length <= 1) {
      autoAdvancedHoles.current.add(hir)
      const nextHoleNum = holes[s.hole + 1]?.holeInRound ?? hir + 1
      setAutoAdvance({ from: hir, to: nextHoleNum })
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current)
      autoAdvanceTimer.current = setTimeout(() => {
        setAutoAdvance(null)
        d({ type: 'NEXT', maxIdx })
      }, 500)
      return
    }

    // Group play: advance once all others have scored this hole
    const allOthersDone = playersWithScorecard
      .filter(p => p.scorecardId !== scorecardId)
      .every(p => hir in (liveScores[p.scorecardId] ?? {}))

    if (allOthersDone) {
      autoAdvancedHoles.current.add(hir)
      const nextHoleNum = holes[s.hole + 1]?.holeInRound ?? hir + 1
      setAutoAdvance({ from: hir, to: nextHoleNum })
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current)
      autoAdvanceTimer.current = setTimeout(() => {
        setAutoAdvance(null)
        d({ type: 'NEXT', maxIdx })
      }, 1800)
    }
  }

  // ── Score actions ──────────────────────────────────────────────────────────

  function tapScore(value: number) {
    d({ type: 'SCORE', holeInRound: hole.holeInRound, v: value })
    persistScore(hole.holeInRound, value)
    // Prefetch next unscored group member
    if (groupPlayers.length > 1) {
      const nextUnscored = groupPlayers.find(pl => {
        if (!pl.scorecardId || pl.scorecardId === scorecardId) return false
        return !(hole.holeInRound in (liveScores[pl.scorecardId] ?? {}))
      })
      if (nextUnscored) router.prefetch(`/rounds/${nextUnscored.scorecardId}/score?hole=${hole.holeInRound}`)
    }
    // Contest holes: show overlay instead of auto-advancing.
    // Do NOT add to autoAdvancedHoles here — that happens in skipContest/saveContest
    // so re-scoring this hole (after navigating back) re-triggers the overlay.
    if (isNTP || isLD) {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current)
      setCDist('')
      setShowContestOverlay(true)
      return
    }
    checkAutoAdvance(hole.holeInRound)
  }

  function tapPickup() {
    d({ type: 'PICKUP', holeInRound: hole.holeInRound })
    persistScore(hole.holeInRound, null)
    checkAutoAdvance(hole.holeInRound)
  }

  function handleModalSave(scId: string, value: number) {
    if (scId === scorecardId) {
      tapScore(value)
    } else {
      setLiveScores(prev => ({
        ...prev,
        [scId]: { ...(prev[scId] ?? {}), [hole.holeInRound]: value },
      }))
      persistScoreForOther(scId, hole.holeInRound, value)
    }
    setScoreModalId(null)
  }

  function handleModalPickup(scId: string) {
    if (scId === scorecardId) {
      tapPickup()
    } else {
      setLiveScores(prev => ({
        ...prev,
        [scId]: { ...(prev[scId] ?? {}), [hole.holeInRound]: null },
      }))
      persistScoreForOther(scId, hole.holeInRound, null)
    }
    setScoreModalId(null)
  }

  function skipContest() {
    autoAdvancedHoles.current.add(hole.holeInRound)
    setShowContestOverlay(false)
    d({ type: 'NEXT', maxIdx })
  }

  function saveContest() {
    if (!cDist) return
    const ct: 'ntp' | 'ld' = ntpHoles.includes(hole.holeInRound) ? 'ntp' : 'ld'
    persistContest(ct, hole.holeInRound, cDist)
    autoAdvancedHoles.current.add(hole.holeInRound)
    d({ type: 'SAVE_C', ct, holeNum: hole.holeInRound, dist: cDist, maxIdx })
    setCDist('')
    setShowContestOverlay(false)
  }

  // ── Derivations for render ─────────────────────────────────────────────────

  const { totalPts, totalStrokes, holesPlayed } = getRunningTotal()
  const myRoundComplete = holesPlayed === holes.length
  const allPlayersComplete = myRoundComplete && groupPlayers
    .filter(p => p.scorecardId && p.scorecardId !== scorecardId)
    .every(p => {
      const pScores = liveScores[p.scorecardId] ?? {}
      return holes.every(h => h.holeInRound in pScores)
    })
  const roundComplete = allPlayersComplete
  const myInitials = playerName.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'

  // 4-hole navigation window
  let winStart = Math.max(0, s.hole - 1)
  if (winStart + 4 > holes.length) winStart = Math.max(0, holes.length - 4)
  const visibleHoles = holes.slice(winStart, winStart + 4).map((h, vi) => ({
    ...h, idx: winStart + vi,
    isActive: winStart + vi === s.hole,
    isScored: (s.scores[h.holeInRound] != null || (s.pickups[h.holeInRound] ?? false)) && (winStart + vi !== s.hole),
  }))

  // Filter players by active group (if groups exist)
  const hasGroups = allGroups.length > 1
  const visiblePlayers = hasGroups && activeGroup !== null
    ? groupPlayers.filter(p => p.flightNumber === activeGroup)
    : groupPlayers

  // Whether we're viewing a group we can score (our own group or we're organiser)
  const canScoreActiveGroup = isOrganiser || activeGroup === null || activeGroup === myFlightNumber

  // Player order: current user first, then others
  const orderedPlayers = [
    ...visiblePlayers.filter(p => p.isCurrentUser && p.scorecardId),
    ...visiblePlayers.filter(p => !p.isCurrentUser && p.scorecardId),
  ]

  const modalPlayer = scoreModalId ? groupPlayers.find(p => p.scorecardId === scoreModalId) : null
  const modalHcOnHole = modalPlayer
    ? (allocateStrokes(Math.round(modalPlayer.handicapIndex * allowancePct), holes)[hole.holeInRound] ?? 0)
    : hcOnHole

  const modalCurrentScore = scoreModalId === scorecardId
    ? currentScore
    : (liveScores[scoreModalId ?? '']?.[hole.holeInRound] ?? null)

  // ── Scorecard view ─────────────────────────────────────────────────────────

  if (s.showCard) {
    const totalPar = holes.reduce((sum, h) => sum + h.par, 0)
    const outPar = holes.slice(0, 9).reduce((sum, h) => sum + h.par, 0)
    const inPar  = holes.slice(9).reduce((sum, h) => sum + h.par, 0)

    const playersWithCard = groupPlayers.filter(p => p.scorecardId)
    const isMulti = playersWithCard.length > 1
    const is18 = holes.length >= 18

    const displayHoles = cardView === 'back9' ? holes.slice(9) : cardView === 'front9' ? holes.slice(0, Math.min(9, holes.length)) : holes

    const getPlayerScores = (p: GroupPlayer): Record<number, number | null | undefined> =>
      p.isCurrentUser && p.scorecardId === scorecardId
        ? s.scores
        : (liveScores[p.scorecardId] ?? p.initialScores ?? {})

    const getPlayerPickup = (p: GroupPlayer, hir: number): boolean =>
      p.isCurrentUser && p.scorecardId === scorecardId ? (s.pickups[hir] ?? false) : false

    const getPlayerStrokes = (p: GroupPlayer): Record<number, number> =>
      allocateStrokes(Math.round((p.handicapIndex ?? handicapIndex) * allowancePct), holes)

    const playerHoleTotal = (p: GroupPlayer, fromIdx: number, toIdx: number): string => {
      const pScores = getPlayerScores(p)
      const pStrokes = getPlayerStrokes(p)
      if (format === 'stableford') {
        let total = 0
        for (let i = fromIdx; i < toIdx; i++) {
          const h = holes[i]!
          const sc = pScores[h.holeInRound]
          if (sc != null && !getPlayerPickup(p, h.holeInRound)) total += pts(sc, h.par, pStrokes[h.holeInRound] ?? 0)
        }
        return total > 0 ? String(total) : '–'
      } else {
        let total = 0; let any = false
        for (let i = fromIdx; i < toIdx; i++) {
          const h = holes[i]!
          const sc = pScores[h.holeInRound]
          if (sc != null && !getPlayerPickup(p, h.holeInRound)) { total += sc; any = true }
        }
        return any ? String(total) : '–'
      }
    }

    const scoreColor = (sc: number | null | undefined, par: number, pu: boolean): string => {
      if (pu || sc == null) return '#9aaa9a'
      if (sc < par) return '#0D631B'
      if (sc === par) return '#1A2E1A'
      return '#923357'
    }

    const currentPlayerObj = playersWithCard.find(p => p.scorecardId === scorecardId)

    const renderSubtotalRow = (label: string, par: number, fromIdx: number, toIdx: number) => (
      <tr key={`sub-${label}`} className={`sc-sub${label === 'TOT' ? ' sc-total' : ''}`}>
        <td className="sc-td sc-td-hole">{label}</td>
        <td className="sc-td sc-td-par">{par}</td>
        {isMulti ? (
          playersWithCard.map(p => (
            <td key={p.scorecardId} className="sc-td" style={{ color: '#0D631B', fontWeight: 700 }}>
              {playerHoleTotal(p, fromIdx, toIdx)}
            </td>
          ))
        ) : (
          <>
            <td className="sc-td sc-td-muted" />
            <td className="sc-td sc-td-muted" />
            <td className="sc-td" style={{ color: '#0D631B', fontWeight: 700 }}>
              {currentPlayerObj ? playerHoleTotal(currentPlayerObj, fromIdx, toIdx) : '–'}
            </td>
            {format === 'stableford' && (
              <td className="sc-td" style={{ color: '#0D631B', fontWeight: 700 }}>
                {currentPlayerObj ? playerHoleTotal(currentPlayerObj, fromIdx, toIdx) : '–'}
              </td>
            )}
          </>
        )}
      </tr>
    )

    const tableRows: JSX.Element[] = []
    displayHoles.forEach((h, di) => {
      const globalIdx = holes.findIndex(hh => hh.holeInRound === h.holeInRound)
      const cur = globalIdx === s.hole
      tableRows.push(
        <tr key={h.holeInRound}
          className={`sc-row${cur ? ' sc-row-cur' : di % 2 !== 0 ? ' sc-row-even' : ''}`}
          style={{ cursor: 'pointer' }}
          onClick={() => { d({ type: 'SET_HOLE', idx: globalIdx }); d({ type: 'TOGGLE_CARD' }) }}>
          <td className="sc-td sc-td-hole">{h.holeInRound}</td>
          <td className="sc-td sc-td-par">{h.par}</td>
          {isMulti ? (
            playersWithCard.map(p => {
              const sc = getPlayerScores(p)[h.holeInRound]
              const pu = getPlayerPickup(p, h.holeInRound)
              return (
                <td key={p.scorecardId} className="sc-td"
                  style={{ color: scoreColor(sc, h.par, pu), fontWeight: sc != null && sc !== h.par ? 600 : 400, opacity: sc == null && !pu ? 0.25 : 1 }}>
                  {pu ? 'NR' : sc != null ? sc : '–'}
                </td>
              )
            })
          ) : (() => {
            const sc = s.scores[h.holeInRound]
            const pu = s.pickups[h.holeInRound] ?? false
            const p = sc != null ? pts(sc, h.par, strokesPerHole[h.holeInRound] ?? 0) : null
            const col = scoreColor(sc, h.par, pu)
            return (
              <>
                <td className="sc-td sc-td-muted">{h.siM ?? '–'}</td>
                <td className="sc-td sc-td-muted">{h.yards[selectedTee] ?? '–'}</td>
                <td className="sc-td" style={{ color: col, fontWeight: sc != null ? 600 : 400 }}>
                  {pu ? 'NR' : sc != null ? sc : '–'}
                </td>
                {format === 'stableford' && (
                  <td className="sc-td" style={{ color: p != null ? (p >= 3 ? '#0D631B' : p === 0 ? '#923357' : '#888') : '#ddd', fontWeight: 600 }}>
                    {pu ? '0' : p != null ? p : '–'}
                  </td>
                )}
              </>
            )
          })()}
        </tr>
      )
      // Insert OUT subtotal inline when showing all 18
      if (cardView === 'all18' && h.holeInRound === 9 && is18) {
        tableRows.push(renderSubtotalRow('OUT', outPar, 0, 9))
      }
    })

    if (cardView === 'front9') tableRows.push(renderSubtotalRow('OUT', outPar, 0, Math.min(9, holes.length)))
    if (cardView === 'back9') tableRows.push(renderSubtotalRow('IN', inPar, 9, holes.length))
    if (cardView === 'all18') {
      tableRows.push(renderSubtotalRow('IN', inPar, 9, 18))
      tableRows.push(renderSubtotalRow('TOT', totalPar, 0, holes.length))
    }
    if (!is18) tableRows.push(renderSubtotalRow('TOT', totalPar, 0, holes.length))

    const formatLabel = format === 'stableford' ? 'Stableford' : format === 'strokeplay' ? 'Stroke Play' : 'Match Play'

    return (
      <div className="sc-card-page">
        <style>{STYLES}</style>

        {/* Header */}
        <div className="sc-card-topbar">
          <button className="sc-card-back" onClick={() => d({ type: 'TOGGLE_CARD' })}>← Scoring</button>
          <div className="sc-card-ttl">Scorecard</div>
          <div style={{ width: 60 }} />
        </div>

        <div style={{ padding: '12px 16px 0' }}>
          {/* Round context card */}
          <div className="sc-ctx">
            <div className="sc-course">{eventName}</div>
            <div className="sc-meta">{eventDate}</div>
            <div className="sc-meta">{formatLabel}{selectedTee ? ` · ${selectedTee} Tees` : ''}</div>
            <div className="sc-player">{playerName} · HC {effectiveHc}</div>
          </div>

          {/* Front 9 / Back 9 / All 18 toggle */}
          {is18 && (
            <div className="sc-toggle">
              <button className={`sc-pill${cardView === 'front9' ? ' act' : ''}`} onClick={() => setCardView('front9')}>Front 9</button>
              <button className={`sc-pill${cardView === 'back9' ? ' act' : ''}`} onClick={() => setCardView('back9')}>Back 9</button>
              <button className={`sc-pill${cardView === 'all18' ? ' act' : ''}`} onClick={() => setCardView('all18')}>All 18</button>
            </div>
          )}
        </div>

        {/* Scorecard table */}
        <div className="sc-tbl-wrap">
          <table className="sc-tbl">
            <thead>
              <tr>
                <th className="sc-th sc-th-hole">Hole</th>
                <th className="sc-th">Par</th>
                {isMulti ? (
                  playersWithCard.map(p => (
                    <th key={p.scorecardId} className={`sc-th${p.scorecardId === scorecardId ? ' sc-th-player' : ''}`}>
                      {p.displayName.split(' ')[0]}{p.isCurrentUser ? ' ★' : ''}
                    </th>
                  ))
                ) : (
                  <>
                    <th className="sc-th">SI</th>
                    <th className="sc-th">Yds</th>
                    <th className="sc-th sc-th-player">{playerName.split(' ')[0]}</th>
                    {format === 'stableford' && <th className="sc-th sc-th-player">Pts</th>}
                  </>
                )}
              </tr>
            </thead>
            <tbody>{tableRows}</tbody>
          </table>
        </div>

        <div style={{ height: 32 }} />
      </div>
    )
  }

  // ── Main scoring view ──────────────────────────────────────────────────────

  return (
    <>
      <style>{STYLES}</style>
      <div className="sc">

        {/* ── Context bar ── */}
        <div className="sc-bar">
          <span className="sc-bar-title">{eventName}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {shareCode && (
              <button
                className={`sc-share-chip${codeCopied ? ' copied' : ''}`}
                onClick={() => {
                  navigator.clipboard.writeText(shareCode).catch(() => {})
                  setCodeCopied(true)
                  setTimeout(() => setCodeCopied(false), 2000)
                }}
                title="Tap to copy — share this code so another group can join"
              >
                {codeCopied ? '✓ Copied' : shareCode}
              </button>
            )}
            <button className="sc-icon-btn" onClick={() => setSettingsOpen(true)} aria-label="Round settings">
              <GearIcon />
            </button>
          </div>
        </div>

        {/* ── Group switcher ── */}
        {hasGroups && (
          <>
            <div className="sc-groups">
              {allGroups.map(g => {
                const names = g.playerNames.map(n => n.split(' ')[0]).join(', ')
                return (
                  <button
                    key={g.flightNumber}
                    className={`sc-group-tab${activeGroup === g.flightNumber ? ' active' : ''}`}
                    onClick={() => setActiveGroup(g.flightNumber)}
                  >
                    {g.label}
                    <span className="sc-group-names">{names}</span>
                  </button>
                )
              })}
            </div>
            {!canScoreActiveGroup && (
              <div className="sc-readonly-badge">
                👁 Viewing only
              </div>
            )}
          </>
        )}

        {/* ── Hole navigation ── */}
        <div className="sc-nav">
          <button className="sc-nav-arr"
            disabled={s.hole === 0}
            onClick={() => d({ type: 'SET_HOLE', idx: Math.max(0, s.hole - 1) })}
            aria-label="Previous hole">
            <ChevLeftIcon />
          </button>
          <div className="sc-holes">
            {visibleHoles.map(h => (
              <button key={h.holeInRound}
                className={`sc-hc${h.isActive ? ' active' : ''}${h.isScored ? ' scored' : ''}`}
                onClick={() => d({ type: 'SET_HOLE', idx: h.idx })}
                aria-label={`Go to hole ${h.holeInRound}`}>
                {h.holeInRound}
                {h.isScored && <span className="sc-hc-check" aria-hidden="true">✓</span>}
              </button>
            ))}
          </div>
          <button className="sc-nav-arr"
            disabled={s.hole === maxIdx}
            onClick={() => d({ type: 'SET_HOLE', idx: Math.min(maxIdx, s.hole + 1) })}
            aria-label="Next hole">
            <ChevRightIcon />
          </button>
        </div>

        {/* ── Auto-advance banner ── */}
        {autoAdvance && (
          <div className="sc-advance">
            <span className="sc-advance-icon"><CheckCircleIcon /></span>
            <div>
              <div className="sc-advance-h">Hole {autoAdvance.from} complete</div>
              <div className="sc-advance-s">Moving to Hole {autoAdvance.to}&hellip;</div>
            </div>
          </div>
        )}

        {/* ── Hole info card ── */}
        <div className="sc-hole-card">
          <div>
            <h1 className="sc-hole-title">Hole {hole.holeInRound}</h1>
            {hcOnHole > 0 && (
              <div className="sc-stroke-badge">+{hcOnHole} shot{hcOnHole > 1 ? 's' : ''}</div>
            )}
            {(isNTP || isLD) && (
              <div className={`sc-contest-badge ${isNTP ? 'ntp' : 'ld'}`}>
                {isNTP ? '🎯 Nearest the pin' : '🏌️ Longest drive'}
              </div>
            )}
          </div>
          <div className="sc-hole-stats">
            <div className="sc-stat">
              <span className="sc-stat-lbl">Par</span>
              <strong className="sc-stat-val">{hole.par}</strong>
            </div>
            {yards !== null && (
              <div className="sc-stat">
                <span className="sc-stat-lbl">Yds</span>
                <strong className="sc-stat-val">{yards}</strong>
              </div>
            )}
            {hole.siM !== null && (
              <div className="sc-stat">
                <span className="sc-stat-lbl">SI</span>
                <strong className="sc-stat-val">{hole.siM}</strong>
              </div>
            )}
          </div>
        </div>

        {/* ── Player scoring cards ── */}
        <div className="sc-players">
          {orderedPlayers.map((p, colorIdx) => {
            const color = PLAYER_COLOURS[Math.min(colorIdx, PLAYER_COLOURS.length - 1)]!
            const initials = p.displayName.split(' ').filter(Boolean).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || '?'
            const isOwn = p.scorecardId === scorecardId

            // Score state for this player on the current hole
            const playerLive = liveScores[p.scorecardId] ?? {}
            const playerScore = isOwn ? currentScore : (playerLive[hole.holeInRound] ?? null)
            const playerPickup = isOwn
              ? isPickup
              : (hole.holeInRound in playerLive && playerLive[hole.holeInRound] === null)
            const playerHcOnHole = isOwn
              ? hcOnHole
              : (allocateStrokes(Math.round(p.handicapIndex * allowancePct), holes)[hole.holeInRound] ?? 0)

            const ptsVal = playerScore !== null ? pts(playerScore, hole.par, playerHcOnHole) : null
            const ptsStr = ptsVal !== null && playerScore !== null
              ? ptsLabel(ptsVal, playerScore, hole.par, playerHcOnHole)
              : null

            const isUnscored = !playerPickup && playerScore === null

            // Running Stableford total for this player
            let playerTotalPts = 0
            let playerHolesPlayed = 0
            if (format === 'stableford') {
              const pScores = isOwn ? s.scores : (liveScores[p.scorecardId] ?? p.initialScores ?? {})
              const pPickups = isOwn ? s.pickups : {}
              const pStrokes = isOwn
                ? strokesPerHole
                : allocateStrokes(Math.round(p.handicapIndex * allowancePct), holes)
              for (const h of holes) {
                const sc = pScores[h.holeInRound]
                const pu = isOwn ? (pPickups[h.holeInRound] ?? false) : false
                if (pu) { playerHolesPlayed++; continue }
                if (sc != null) {
                  playerHolesPlayed++
                  playerTotalPts += pts(sc, h.par, pStrokes[h.holeInRound] ?? 0)
                }
              }
            }

            return (
              <div
                key={p.scorecardId}
                className={`sc-pcard${isUnscored ? ' unscored' : ''}`}
                style={{ animationDelay: `${colorIdx * 0.06}s` }}
                onClick={() => setScoreModalId(p.scorecardId)}
                role="button"
                aria-label={`Enter score for ${p.displayName}`}>

                {/* Left: Avatar + Name */}
                <div className="sc-pcard-left">
                  <div className="sc-avatar" style={{ width: 44, height: 44, background: color, fontSize: '0.875rem' }}>
                    {initials}
                  </div>
                  <div style={{ minWidth: 0, overflow: 'hidden' }}>
                    <div className="sc-player-name">{p.displayName.split(' ')[0]}</div>
                    <div className="sc-player-you">
                      {format === 'stableford' && playerHolesPlayed > 0
                        ? `${playerTotalPts}pts thru ${playerHolesPlayed}`
                        : isOwn ? 'you' : ''}
                    </div>
                  </div>
                </div>

                {/* Right: scored / pickup / unscored state */}
                {playerPickup ? (
                  <div className="sc-scored-r">
                    <span className="sc-pickup-lbl">Pick up</span>
                    <span className="sc-pts-pill">NR · 0pts</span>
                  </div>
                ) : playerScore !== null ? (
                  <div className="sc-scored-r">
                    <span className="sc-score-n" style={{ color }}>{playerScore}</span>
                    <span className="sc-pts-pill">{ptsStr}</span>
                  </div>
                ) : (
                  <div className="sc-unscored-r">
                    <div className="sc-enter-prompt">
                      {playerHcOnHole > 0
                        ? <span className="sc-net-par-hint">Net par {hole.par + playerHcOnHole}</span>
                        : <span className="sc-net-par-hint">Par {hole.par}</span>}
                      <span className="sc-tap-hint">Tap to enter score</span>
                    </div>
                    <svg className="sc-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Finish round banner ── */}
        {roundComplete && (
          <div className="sc-finish">
            <div className="sc-finish-text">
              <div className="sc-finish-h">All holes scored ✓</div>
              <div className="sc-finish-s">
                {format === 'stableford'
                  ? `${totalPts} pts total`
                  : `${totalStrokes} strokes total`}
              </div>
            </div>
            <a href={`/rounds/${scorecardId}`} className="sc-finish-btn">Finish round →</a>
          </div>
        )}

        {/* Bottom spacer */}
        <div style={{ height: 80 }} />

        {/* ── Bottom action bar ── */}
        <div className="sc-bottom">
          <div className="sc-bottom-player">
            <div className="sc-avatar sc-bottom-avatar"
              style={{ width: 36, height: 36, background: PLAYER_COLOURS[0], fontSize: '0.75rem' }}>
              {myInitials}
            </div>
            <div>
              <div className="sc-bottom-name">{playerName.split(' ')[0] || playerName}</div>
              <div className="sc-bottom-pts">
                {holesPlayed > 0
                  ? format === 'stableford'
                    ? `${totalPts}pts · thru ${holesPlayed}`
                    : `${totalStrokes} · thru ${holesPlayed}`
                  : `HC ${effectiveHc}`}
              </div>
            </div>
          </div>
          {roundComplete ? (
            <a href={`/rounds/${scorecardId}`} className="sc-act-finish">
              Finish round →
            </a>
          ) : (
            <>
              <button className="sc-act-btn" onClick={() => d({ type: 'TOGGLE_CARD' })}>
                Scorecard
              </button>
              <button className="sc-act-btn" onClick={() => setShowLeaderboard(true)}>
                Leaderboard
              </button>
            </>
          )}
        </div>

        {/* ── Score entry modal ── */}
        {scoreModalId && modalPlayer && (
          <ScoreModal
            player={modalPlayer}
            isOwn={scoreModalId === scorecardId}
            holeInRound={hole.holeInRound}
            par={hole.par}
            hcOnHole={modalHcOnHole}
            currentScore={modalCurrentScore}
            isPickup={scoreModalId === scorecardId ? isPickup : false}
            format={format}
            onSave={(v) => handleModalSave(scoreModalId, v)}
            onPickup={() => handleModalPickup(scoreModalId)}
            onUndo={scoreModalId === scorecardId ? () => {
              d({ type: 'UNDO', holeInRound: hole.holeInRound })
              persistScore(hole.holeInRound, null)
              setScoreModalId(null)
            } : undefined}
            onClose={() => setScoreModalId(null)}
          />
        )}

        {/* ── Settings modal ── */}
        {settingsOpen && (
          <SettingsModal
            eventId={eventId}
            isOrganiser={!!isOrganiser}
            onScorecard={() => { setSettingsOpen(false); d({ type: 'TOGGLE_CARD' }) }}
            onLeaderboard={() => { setSettingsOpen(false); setShowLeaderboard(true) }}
            onClose={() => setSettingsOpen(false)}
          />
        )}

        {/* ── Leaderboard panel ── */}
        {showLeaderboard && (
          <LeaderboardPanel
            groupPlayers={groupPlayers}
            liveScores={liveScores}
            currentScores={s.scores}
            currentScorecardId={scorecardId}
            holes={holes}
            format={format}
            allowancePct={allowancePct}
            eventId={eventId}
            onClose={() => setShowLeaderboard(false)}
          />
        )}

        {/* ── Contest overlay (NTP / LD) ── */}
        {showContestOverlay && (
          <div className="sc-overlay" onClick={skipContest}>
            <div className="sc-contest-modal" onClick={e => e.stopPropagation()}>
              <div className="sc-modal-hd">
                <h2 className="sc-modal-title">
                  {isNTP ? '🎯 Nearest the Pin' : '🏌️ Longest Drive'}
                </h2>
                <p style={{ fontFamily: 'var(--font-lexend), sans-serif', fontSize: '0.875rem', color: '#72786E', marginTop: '0.5rem' }}>
                  Hole {hole.holeInRound} — record the winner&apos;s distance
                </p>
              </div>
              <div className="sc-modal-body">
                <input
                  className="sc-contest-input"
                  value={cDist}
                  onChange={e => setCDist(e.target.value)}
                  placeholder={isNTP ? 'e.g. 3.5 yards' : 'e.g. 285 yards'}
                  autoFocus
                />
              </div>
              <div className="sc-modal-ft">
                <button className="sc-save-btn" onClick={saveContest} disabled={!cDist}>Save contest</button>
                <button className="sc-pickup-lnk" onClick={skipContest}>Skip</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  )
}

// ─── Score Entry Modal ────────────────────────────────────────────────────────

interface ScoreModalProps {
  player: GroupPlayer
  isOwn: boolean
  holeInRound: number
  par: number
  hcOnHole: number
  currentScore: number | null
  isPickup: boolean
  format: 'stableford' | 'strokeplay' | 'matchplay'
  onSave: (value: number) => void
  onPickup: () => void
  onUndo?: (() => void) | undefined
  onClose: () => void
}

function ScoreModal({
  player, isOwn, holeInRound, par, hcOnHole,
  currentScore, isPickup, format,
  onSave, onPickup, onUndo, onClose,
}: ScoreModalProps) {
  const [selected, setSelected] = useState<number | null>(currentScore)
  const initials = player.displayName.split(' ').filter(Boolean).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || '?'

  // 7 quick-select values centered on par
  const quickVals: number[] = []
  for (let v = Math.max(1, par - 2); v <= par + 4; v++) quickVals.push(v)

  // Feedback text
  const ptsVal = selected !== null ? pts(selected, par, hcOnHole) : null
  const feedbackText = selected === null
    ? null
    : format === 'stableford' && ptsVal !== null
      ? ptsLabel(ptsVal, selected, par, hcOnHole)
      : strokeResult(selected, par)

  const alreadyScored = currentScore !== null || isPickup

  return (
    <div className="sc-overlay" onClick={onClose}>
      <div className="sc-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="sc-modal-hd">
          <div className="sc-modal-player-row">
            <div className="sc-avatar" style={{ width: 36, height: 36, background: '#0D631B', fontSize: '0.75rem' }}>
              {initials}
            </div>
            <h2 className="sc-modal-title">
              {isOwn ? 'Enter your score' : `Score for ${player.displayName.split(' ')[0]}`}
            </h2>
          </div>
          <div className="sc-modal-ctx">
            Hole {holeInRound} · Par {par}
            {hcOnHole > 0 && ` · +${hcOnHole} shot${hcOnHole > 1 ? 's' : ''}`}
          </div>
        </div>

        {/* Body */}
        <div className="sc-modal-body">
          <div className="sc-qs-lbl">Quick select</div>
          <div className="sc-modal-qs">
            {quickVals.map(v => (
              <button key={v}
                className={`sc-mqbtn${v === par ? ' par' : ''}${v === selected ? ' sel' : ''}`}
                onClick={() => setSelected(v)}
                aria-label={`${v} strokes`}>
                {v}
              </button>
            ))}
          </div>

          {/* Stepper */}
          <div className="sc-stepper">
            <button className="sc-step-btn"
              onClick={() => setSelected(v => Math.max(1, (v ?? par) - 1))}
              aria-label="Decrease score">−</button>
            <span className={`sc-step-display${selected === null ? ' dim' : ''}`}>
              {selected ?? '–'}
            </span>
            <button className="sc-step-btn"
              onClick={() => setSelected(v => Math.min(15, (v ?? par) + 1))}
              aria-label="Increase score">+</button>
          </div>

          {/* Feedback pill */}
          {feedbackText && (
            <span className="sc-feedback">{feedbackText}</span>
          )}
        </div>

        {/* Footer */}
        <div className="sc-modal-ft">
          <button className="sc-save-btn"
            disabled={selected === null}
            onClick={() => { if (selected !== null) onSave(selected) }}>
            Save score
          </button>
          {alreadyScored && onUndo ? (
            <button className="sc-pickup-lnk" onClick={onUndo}>
              Undo saved score
            </button>
          ) : (
            <button className="sc-pickup-lnk" onClick={onPickup}>
              Pick up / NR
            </button>
          )}
        </div>

      </div>
    </div>
  )
}

// ─── Settings Modal ───────────────────────────────────────────────────────────

function SettingsModal({
  eventId,
  isOrganiser,
  onScorecard,
  onLeaderboard,
  onClose,
}: {
  eventId: string
  isOrganiser: boolean
  onScorecard: () => void
  onLeaderboard: () => void
  onClose: () => void
}) {
  const router = useRouter()
  const [showCourseWarning, setShowCourseWarning] = useState(false)

  return (
    <div className="sc-overlay" onClick={onClose}>
      <div className="sc-settings" onClick={e => e.stopPropagation()}>

        <div className="sc-settings-hd">
          <h2 className="sc-settings-title">Round Settings</h2>
          <button className="sc-settings-close" onClick={onClose} aria-label="Close settings">✕</button>
        </div>

        <div className="sc-settings-list">
          <button className="sc-settings-row" onClick={onScorecard}>
            <div className="sc-settings-ico green">📋</div>
            <span className="sc-settings-lbl">View scorecard</span>
            <span className="sc-settings-chev">›</span>
          </button>
          <button className="sc-settings-row" onClick={onLeaderboard}>
            <div className="sc-settings-ico green">🏆</div>
            <span className="sc-settings-lbl">Leaderboard</span>
            <span className="sc-settings-chev">›</span>
          </button>
        </div>

        {isOrganiser && (
          <>
            <div className="sc-settings-div" />
            <div className="sc-danger-lbl">Edit setup</div>

            <div className="sc-settings-list">
              <button className="sc-settings-row" onClick={() => setShowCourseWarning(true)}>
                <div className="sc-settings-ico green">⛳</div>
                <span className="sc-settings-lbl">Change course</span>
                <span className="sc-settings-chev">›</span>
              </button>
              <button className="sc-settings-row" onClick={() => router.push(`/events/${eventId}/manage`)}>
                <div className="sc-settings-ico green">👥</div>
                <span className="sc-settings-lbl">Edit players &amp; groups</span>
                <span className="sc-settings-chev">›</span>
              </button>
              <button className="sc-settings-row" onClick={() => router.push(`/events/${eventId}/manage?edit=format`)}>
                <div className="sc-settings-ico green">🏌️</div>
                <span className="sc-settings-lbl">Change game type &amp; tees</span>
                <span className="sc-settings-chev">›</span>
              </button>
            </div>
          </>
        )}

        <div className="sc-settings-div" />
        <div className="sc-danger-lbl">Danger zone</div>

        <div className="sc-settings-list">
          <a className="sc-settings-row" href="/play">
            <div className="sc-settings-ico berry">⚠️</div>
            <span className="sc-settings-lbl berry">Exit round</span>
            <span className="sc-settings-chev">›</span>
          </a>
        </div>

        <div className="sc-settings-ft">
          <button className="sc-cancel-btn" onClick={onClose}>Cancel</button>
        </div>

        {/* ── Course change warning dialog ── */}
        {showCourseWarning && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 200, padding: '1.25rem',
          }} onClick={() => setShowCourseWarning(false)}>
            <div style={{
              background: '#fff', borderRadius: 16, padding: '1.5rem',
              maxWidth: 340, width: '100%',
              boxShadow: '0 12px 40px rgba(26,28,28,0.15)',
            }} onClick={e => e.stopPropagation()}>
              <h3 style={{
                margin: '0 0 0.5rem', fontFamily: "var(--font-manrope), 'Manrope', sans-serif",
                fontWeight: 700, fontSize: '1.125rem', color: '#1A2E1A',
              }}>
                Change course?
              </h3>
              <p style={{
                margin: '0 0 1.25rem', fontFamily: "var(--font-lexend), 'Lexend', sans-serif",
                fontSize: '0.875rem', color: '#6B8C6B', lineHeight: 1.5,
              }}>
                Changing the course will restart all scoring. All scores entered so far will be lost. Are you sure?
              </p>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => setShowCourseWarning(false)}
                  style={{
                    flex: 1, padding: '0.75rem', border: '1.5px solid #E0EBE0', borderRadius: 12,
                    background: '#fff', fontFamily: "var(--font-lexend), sans-serif",
                    fontSize: '0.875rem', fontWeight: 500, color: '#1A2E1A', cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => router.push(`/events/${eventId}/manage?edit=course`)}
                  style={{
                    flex: 1, padding: '0.75rem', border: 'none', borderRadius: 12,
                    background: '#B43C3C', fontFamily: "var(--font-lexend), sans-serif",
                    fontSize: '0.875rem', fontWeight: 600, color: '#fff', cursor: 'pointer',
                  }}
                >
                  Change course
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// ─── Leaderboard Panel ────────────────────────────────────────────────────────

interface LbRow {
  player: GroupPlayer
  thru: number
  score: number        // stableford: total pts; strokeplay: vs-par diff
  perHole: number[]
  grossStrokes: (number | null)[]
  playingHandicap: number
  posLabel: string
}

function computeGroupLeaderboard(
  groupPlayers: GroupPlayer[],
  liveScores: Record<string, Record<number, number | null>>,
  currentScores: Record<number, number | null>,
  currentScorecardId: string,
  holes: ScoringHole[],
  format: 'stableford' | 'strokeplay' | 'matchplay',
  allowancePct: number,
): LbRow[] {
  const rows: LbRow[] = groupPlayers.map(player => {
    const rawScores = player.scorecardId === currentScorecardId
      ? currentScores
      : (liveScores[player.scorecardId] ?? player.initialScores)

    const playingHandicap = Math.round(player.handicapIndex * allowancePct)
    const hcPerHole = allocateStrokes(playingHandicap, holes)

    let totalPts = 0
    let grossTotal = 0
    let parTotal = 0
    let thru = 0
    const perHole: number[] = []
    const grossStrokes: (number | null)[] = []

    for (const h of holes) {
      const gross = rawScores[h.holeInRound] ?? null
      grossStrokes.push(gross)
      if (gross !== null) {
        const hcShots = hcPerHole[h.holeInRound] ?? 0
        if (format === 'stableford') {
          const p = pts(gross, h.par, hcShots)
          perHole.push(p)
          totalPts += p
        } else {
          perHole.push(gross)
          grossTotal += gross
          parTotal += h.par
        }
        thru++
      } else {
        perHole.push(0)
      }
    }

    const score = format === 'stableford' ? totalPts : (grossTotal - parTotal)
    return { player, thru, score, perHole, grossStrokes, playingHandicap, posLabel: '–' }
  })

  rows.sort((a, b) => {
    if (a.thru === 0 && b.thru === 0) return 0
    if (a.thru === 0) return 1
    if (b.thru === 0) return -1
    return format === 'stableford' ? b.score - a.score : a.score - b.score
  })

  // Assign position labels
  let i = 0
  while (i < rows.length) {
    const row = rows[i]!
    if (row.thru === 0) { i++; continue }
    let j = i
    while (j + 1 < rows.length && rows[j + 1]!.thru > 0 && rows[j + 1]!.score === row.score) j++
    const label = j > i ? `T${i + 1}` : `${i + 1}`
    for (let k = i; k <= j; k++) rows[k]!.posLabel = label
    i = j + 1
  }

  return rows
}

function lbRankClass(pos: string, thru: number) {
  if (thru === 0) return 'rns'
  const base = pos.replace('T', '')
  if (base === '1') return 'r1'
  if (base === '2') return 'r2'
  if (base === '3') return 'r3'
  return 'rx'
}

function lbOrdinal(pos: string, thru: number) {
  if (thru === 0) return '–'
  const n = parseInt(pos.replace('T', ''), 10)
  if (isNaN(n)) return pos
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return (pos.startsWith('T') ? 'T' : '') + n + (s[(v - 20) % 10] ?? s[v] ?? 'th')
}

function LeaderboardPanel({
  groupPlayers,
  liveScores,
  currentScores,
  currentScorecardId,
  holes,
  format,
  allowancePct,
  eventId,
  onClose,
}: {
  groupPlayers: GroupPlayer[]
  liveScores: Record<string, Record<number, number | null>>
  currentScores: Record<number, number | null>
  currentScorecardId: string
  holes: ScoringHole[]
  format: 'stableford' | 'strokeplay' | 'matchplay'
  allowancePct: number
  eventId: string
  onClose: () => void
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const rows = computeGroupLeaderboard(
    groupPlayers, liveScores, currentScores, currentScorecardId, holes, format, allowancePct,
  )

  const maxThru = rows.reduce((m, r) => Math.max(m, r.thru), 0)
  const startedCount = rows.filter(r => r.thru > 0).length
  const isEvent = groupPlayers.length > 0 && eventId

  return (
    <div className="sc-lb-page">
      {/* Header */}
      <header className="sc-lb-header">
        <button className="sc-lb-back" onClick={onClose} aria-label="Back to scoring">
          ←
        </button>
        <span className="sc-lb-title">Leaderboard</span>
        {isEvent ? (
          <a className="sc-lb-tv" href={`/events/${eventId}/leaderboard`} target="_blank" rel="noopener noreferrer">
            Full ↗
          </a>
        ) : (
          <span style={{ width: 60 }} />
        )}
      </header>

      <div className="sc-lb-body">
        {/* Live status */}
        <div className="sc-lb-status">
          <div className="sc-lb-live">
            <span className="sc-lb-dot" />
            <span className="sc-lb-live-lbl">Live</span>
          </div>
          <span className="sc-lb-count">{startedCount}/{rows.length} playing</span>
        </div>

        {/* Progress */}
        {maxThru > 0 && (
          <div className="sc-lb-progress">
            <strong>Thru {maxThru} hole{maxThru !== 1 ? 's' : ''}</strong>
            {' · '}
            {rows.filter(r => r.thru > 0).every(r => r.thru === holes.length)
              ? 'Final results'
              : 'Round in progress'}
          </div>
        )}

        {/* Player rows */}
        {rows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#6B8C6B', fontSize: '0.9375rem' }}>
            No players yet.
          </div>
        ) : rows.map(row => {
          const pid = row.player.scorecardId || row.player.displayName
          const isMe = row.player.scorecardId === currentScorecardId
          const isExpanded = expandedId === pid
          const thruLabel = row.thru === 0
            ? 'Not started'
            : row.thru === holes.length ? 'Finished' : `Thru ${row.thru}`
          const subLabel = row.thru > 0
            ? format === 'stableford'
              ? `${row.score} pts · ${thruLabel}`
              : `${row.score === 0 ? 'E' : row.score > 0 ? `+${row.score}` : `${row.score}`} · ${thruLabel}`
            : `HC ${row.playingHandicap} · ${thruLabel}`

          return (
            <div
              key={pid}
              className={`sc-lb-card${isMe ? ' me' : ''}`}
              onClick={() => row.thru > 0 ? setExpandedId(isExpanded ? null : pid) : undefined}
              role={row.thru > 0 ? 'button' : undefined}
              tabIndex={row.thru > 0 ? 0 : undefined}
              onKeyDown={row.thru > 0 ? (e) => { if (e.key === 'Enter' || e.key === ' ') setExpandedId(isExpanded ? null : pid) } : undefined}
              aria-expanded={row.thru > 0 ? isExpanded : undefined}
            >
              <div className="sc-lb-row">
                <div className={`sc-lb-rank ${lbRankClass(row.posLabel, row.thru)}`}>
                  {lbOrdinal(row.posLabel, row.thru)}
                </div>
                <div className="sc-lb-avatar">
                  {row.player.displayName.split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="sc-lb-info">
                  <div className={`sc-lb-name${isMe ? ' me' : ''}`}>{row.player.displayName}</div>
                  <div className="sc-lb-sub">{subLabel}</div>
                </div>
                {row.thru > 0 && (
                  <div className="sc-lb-scores">
                    <span className={`sc-lb-pts${row.posLabel === '1' || row.posLabel === 'T1' ? ' leader' : ''}`}>
                      {format === 'stableford' ? row.score : row.score === 0 ? 'E' : row.score > 0 ? `+${row.score}` : `${row.score}`}
                    </span>
                    {format === 'stableford' && (
                      <span className="sc-lb-pill">{row.score} pts</span>
                    )}
                  </div>
                )}
                {row.thru > 0 && (
                  <svg className={`sc-lb-chev${isExpanded ? ' open' : ''}`} width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>

              {/* Expanded scorecard */}
              {isExpanded && row.thru > 0 && (
                <div className="sc-lb-sc">
                  <table className="sc-lb-sc-tbl">
                    <thead>
                      <tr>
                        <th>Hole</th>
                        <th>Par</th>
                        <th>Score</th>
                        <th>{format === 'stableford' ? 'Pts' : '+/−'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {holes.map((h, idx) => {
                        const gross = row.grossStrokes[idx] ?? null
                        const p = row.perHole[idx] ?? 0
                        const played = gross !== null
                        let scoreClass = 'blank'
                        if (played) {
                          const rel = gross - h.par
                          scoreClass = rel < 0 ? 'under' : rel > 0 ? 'over' : 'par'
                        }
                        const ptLabel = format === 'stableford'
                          ? `${p}pt${p !== 1 ? 's' : ''}`
                          : played ? (gross - h.par === 0 ? 'E' : gross - h.par > 0 ? `+${gross - h.par}` : `${gross - h.par}`) : '–'
                        return (
                          <tr key={h.holeInRound}>
                            <td><span className="sc-lb-sc-hole">{h.holeInRound}</span></td>
                            <td><span className="sc-lb-sc-par">{h.par}</span></td>
                            <td>
                              <span className={`sc-lb-sc-score ${scoreClass}`}>
                                {played ? gross : '–'}
                              </span>
                            </td>
                            <td>
                              {played
                                ? <span className="sc-lb-sc-pts-cell">{ptLabel}</span>
                                : <span style={{ color: '#c0c0c0', fontSize: '0.8125rem' }}>–</span>
                              }
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  <div className="sc-lb-total">
                    {format === 'stableford'
                      ? `Total: ${row.score} pts`
                      : `Total: ${row.score === 0 ? 'E' : row.score > 0 ? `+${row.score}` : `${row.score}`}`
                    }
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* Link to full event leaderboard */}
        {isEvent && (
          <div className="sc-lb-footer">
            <a className="sc-lb-full-link" href={`/events/${eventId}/leaderboard`} target="_blank" rel="noopener noreferrer">
              View full event leaderboard →
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Inline SVG Icons ─────────────────────────────────────────────────────────

function GearIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="1.75"/>
    </svg>
  )
}

function ChevLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <polyline points="15 18 9 12 15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function ChevRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <polyline points="9 18 15 12 9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
      <polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
