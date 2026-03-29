'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { placeBet } from '../predictions/actions'

interface Selection {
  id: string
  label: string
  odds_numerator: number
  odds_denominator: number
  event_player_id: string | null
}

interface Market {
  id: string
  market_type: string
  title: string
  status: string
  selections: Selection[]
}

interface UserBet {
  id: string
  selection_id: string
  stake: number
  odds_numerator: number
  odds_denominator: number
  potential_payout: number
  status: string
}

interface Props {
  eventId: string
  markets: Market[]
  userCredits: number | null
  userBets: UserBet[]
  maxBetPct: number
  isLoggedIn: boolean
}

function formatOdds(num: number, den: number): string {
  return `${num}/${den}`
}

const MARKET_ORDER = ['outright', 'head_to_head', 'top_3', 'group_winner', 'last_place', 'over_under']

const MARKET_ICON: Record<string, string> = {
  outright: '🏆',
  head_to_head: '⚔️',
  top_3: '🥇',
  group_winner: '👥',
  last_place: '🤡',
  over_under: '📊',
}

export default function BetSlip({
  eventId,
  markets,
  userCredits,
  userBets,
  maxBetPct,
  isLoggedIn,
}: Props) {
  const [activeTab, setActiveTab] = useState<string>('outright')
  const [selectedSelection, setSelectedSelection] = useState<Selection | null>(null)
  const [stakeStr, setStakeStr] = useState('')
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  // Live odds via Realtime
  const [liveSelections, setLiveSelections] = useState<Map<string, { odds_numerator: number; odds_denominator: number }>>(new Map())

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`predictions-${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'prediction_selections' },
        payload => {
          const row = payload.new as {
            id: string
            odds_numerator: number
            odds_denominator: number
          }
          if (!row?.id) return
          setLiveSelections(prev => {
            const next = new Map(prev)
            next.set(row.id, { odds_numerator: row.odds_numerator, odds_denominator: row.odds_denominator })
            return next
          })
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [eventId])

  // Merge live odds with initial data
  const getOdds = useCallback((sel: Selection) => {
    const live = liveSelections.get(sel.id)
    return live ?? { odds_numerator: sel.odds_numerator, odds_denominator: sel.odds_denominator }
  }, [liveSelections])

  const credits = userCredits ?? 0
  const maxBet = Math.floor(credits * maxBetPct / 100)

  const sortedMarkets = [...markets].sort((a, b) =>
    MARKET_ORDER.indexOf(a.market_type) - MARKET_ORDER.indexOf(b.market_type)
  )

  // Group markets by type
  const marketsByType = new Map<string, Market[]>()
  for (const m of sortedMarkets) {
    const existing = marketsByType.get(m.market_type) ?? []
    existing.push(m)
    marketsByType.set(m.market_type, existing)
  }

  const availableTypes = [...marketsByType.keys()]

  const activeMarkets = marketsByType.get(activeTab) ?? []

  // Check which selections user already bet on
  const bettedSelections = new Set(userBets.map(b => b.selection_id))

  function handleSelectSelection(sel: Selection) {
    if (bettedSelections.has(sel.id)) return
    setSelectedSelection(sel)
    setStakeStr('')
    setErrorMsg(null)
    setSuccessMsg(null)
  }

  function handlePlaceBet() {
    if (!selectedSelection) return
    const stake = parseInt(stakeStr, 10)
    if (isNaN(stake) || stake <= 0) {
      setErrorMsg('Enter a valid stake')
      return
    }
    setErrorMsg(null)
    setSuccessMsg(null)

    startTransition(async () => {
      const result = await placeBet(eventId, selectedSelection.id, stake)
      if (result.error) {
        setErrorMsg(result.error)
      } else {
        setSuccessMsg(`Bet placed! ${stake} credits on ${selectedSelection.label}`)
        setSelectedSelection(null)
        setStakeStr('')
      }
    })
  }

  return (
    <>
      <style>{`
        .bs-wrap {
          margin: 12px 16px 0;
          font-family: var(--font-dm-sans), 'DM Sans', sans-serif;
          animation: lb-in 0.28s ease both;
          animation-delay: 0.1s;
        }

        .bs-header {
          background: #fff;
          border-radius: 16px 16px 0 0;
          border: 1px solid #E0EBE0;
          border-bottom: none;
          padding: 16px 20px 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          -webkit-tap-highlight-color: transparent;
        }
        .bs-header:hover { background: #fafcfa; }

        .bs-header-left {
          display: flex; align-items: center; gap: 10px;
        }
        .bs-header-title {
          font-weight: 700; font-size: 0.9375rem; color: #1A2E1A;
          font-family: var(--font-manrope), 'Manrope', sans-serif;
        }
        .bs-credits-pill {
          background: linear-gradient(135deg, rgba(13,99,27,0.1), rgba(61,107,26,0.1));
          padding: 4px 10px; border-radius: 8px;
          font-size: 0.75rem; font-weight: 600; color: #0D631B;
        }
        .bs-chevron {
          color: #c0ccc0; transition: transform 0.2s ease;
        }
        .bs-chevron.open { transform: rotate(180deg); }

        .bs-body {
          background: #fff;
          border: 1px solid #E0EBE0;
          border-top: none;
          border-radius: 0 0 16px 16px;
          padding: 0 16px 16px;
          overflow: hidden;
        }

        /* Tab bar */
        .bs-tabs {
          display: flex; gap: 4px; padding: 8px 0 12px;
          overflow-x: auto; scrollbar-width: none;
        }
        .bs-tabs::-webkit-scrollbar { display: none; }
        .bs-tab {
          padding: 6px 12px; border-radius: 8px;
          border: 1.5px solid #E0EBE0; background: #fff;
          font-size: 0.75rem; font-weight: 500; color: #6B8C6B;
          cursor: pointer; white-space: nowrap; transition: all 0.15s;
          font-family: var(--font-dm-sans), sans-serif;
        }
        .bs-tab:hover { border-color: #0D631B; }
        .bs-tab.active {
          background: #0D631B; border-color: #0D631B; color: #fff; font-weight: 600;
        }

        /* Market card */
        .bs-market {
          margin-bottom: 12px;
        }
        .bs-market-title {
          font-size: 0.8125rem; font-weight: 600; color: #1A2E1A;
          margin-bottom: 8px;
        }
        .bs-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 6px;
        }

        /* Selection card */
        .bs-sel {
          padding: 10px 12px; border-radius: 10px;
          border: 1.5px solid #E0EBE0; background: #fff;
          cursor: pointer; transition: all 0.15s;
          display: flex; flex-direction: column; gap: 2px;
          -webkit-tap-highlight-color: transparent;
        }
        .bs-sel:hover { border-color: #0D631B; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(13,99,27,0.08); }
        .bs-sel.selected { border-color: #0D631B; background: #F0F9F1; }
        .bs-sel.betted { border-color: #fbbf24; background: #fffbeb; cursor: default; }
        .bs-sel.betted:hover { transform: none; box-shadow: none; }
        .bs-sel-name {
          font-size: 0.8125rem; font-weight: 500; color: #1A2E1A;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .bs-sel-odds {
          font-family: var(--font-manrope), 'Manrope', sans-serif;
          font-weight: 800; font-size: 1rem; color: #0D631B;
          letter-spacing: -0.02em;
        }
        .bs-sel-betted-label {
          font-size: 0.6875rem; color: #92400E; font-weight: 600;
        }

        /* Bet slip drawer */
        .bs-drawer {
          margin-top: 12px; padding: 14px;
          background: #F0F9F1; border-radius: 12px;
          border: 1px solid #E0EBE0;
        }
        .bs-drawer-title {
          font-size: 0.8125rem; font-weight: 600; color: #1A2E1A; margin-bottom: 8px;
        }
        .bs-drawer-sel {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 10px;
        }
        .bs-drawer-name { font-size: 0.875rem; font-weight: 500; color: #1A2E1A; }
        .bs-drawer-odds {
          font-family: var(--font-manrope), 'Manrope', sans-serif;
          font-weight: 800; font-size: 1.125rem; color: #0D631B;
        }
        .bs-stake-row {
          display: flex; gap: 8px; align-items: center; margin-bottom: 8px;
        }
        .bs-stake-input {
          flex: 1; padding: 10px 14px;
          border: 1.5px solid #d1d5db; border-radius: 10px;
          font-size: 0.9375rem; font-family: var(--font-dm-sans), sans-serif;
          color: #1A2E1A; outline: none; background: #fff;
          transition: border-color 0.15s;
        }
        .bs-stake-input:focus { border-color: #0D631B; }
        .bs-place-btn {
          padding: 10px 20px; border: none; border-radius: 10px;
          background: #0D631B; color: #fff; font-size: 0.875rem;
          font-weight: 600; font-family: var(--font-dm-sans), sans-serif;
          cursor: pointer; transition: background 0.15s; white-space: nowrap;
        }
        .bs-place-btn:hover { background: #0a4f15; }
        .bs-place-btn:disabled { background: #9ca3af; cursor: default; }
        .bs-payout {
          font-size: 0.75rem; color: #6B8C6B;
        }
        .bs-payout strong { color: #0D631B; }

        /* My bets section */
        .bs-bets-title {
          font-size: 0.75rem; font-weight: 600; color: #6B8C6B;
          text-transform: uppercase; letter-spacing: 0.06em;
          margin: 16px 0 8px;
        }
        .bs-bet-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 8px 0; border-bottom: 1px solid #f0f4f0;
          font-size: 0.8125rem;
        }
        .bs-bet-row:last-child { border-bottom: none; }
        .bs-bet-status {
          font-size: 0.6875rem; font-weight: 700; padding: 2px 6px;
          border-radius: 5px;
        }
        .bs-bet-status.placed { background: #E0EBE0; color: #6B8C6B; }
        .bs-bet-status.won { background: #bbf7d0; color: #15803d; }
        .bs-bet-status.lost { background: #fecaca; color: #b91c1c; }
        .bs-bet-status.void { background: #fef3c7; color: #92400e; }

        .bs-msg {
          margin-top: 8px; padding: 8px 12px; border-radius: 8px;
          font-size: 0.8125rem; text-align: center;
        }
        .bs-msg.error { background: #fef2f2; color: #dc2626; }
        .bs-msg.success { background: #f0fdf4; color: #15803d; }
        .bs-login-cta {
          text-align: center; padding: 20px; color: #6B8C6B;
          font-size: 0.875rem;
        }
        .bs-login-cta a {
          color: #0D631B; font-weight: 600; text-decoration: none;
        }
      `}</style>

      <div className="bs-wrap">
        {/* Collapsible header */}
        <div className="bs-header" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="bs-header-left">
            <span className="bs-header-title">🎲 Predictions</span>
            {isLoggedIn && (
              <span className="bs-credits-pill">{credits.toLocaleString()} credits</span>
            )}
          </div>
          <svg
            className={`bs-chevron ${isExpanded ? 'open' : ''}`}
            width="16" height="16" viewBox="0 0 16 16" fill="none"
          >
            <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {isExpanded && (
          <div className="bs-body">
            {/* Market type tabs */}
            <div className="bs-tabs">
              {availableTypes.map(t => (
                <button
                  key={t}
                  className={`bs-tab ${activeTab === t ? 'active' : ''}`}
                  onClick={() => { setActiveTab(t); setSelectedSelection(null) }}
                >
                  {MARKET_ICON[t] ?? ''} {t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </button>
              ))}
            </div>

            {/* Markets */}
            {activeMarkets.map(market => (
              <div key={market.id} className="bs-market">
                {activeMarkets.length > 1 && (
                  <div className="bs-market-title">{market.title}</div>
                )}
                <div className="bs-grid">
                  {market.selections.map(sel => {
                    const hasBet = bettedSelections.has(sel.id)
                    const isSelected = selectedSelection?.id === sel.id
                    const userBet = userBets.find(b => b.selection_id === sel.id)
                    const odds = getOdds(sel)
                    return (
                      <div
                        key={sel.id}
                        className={`bs-sel ${isSelected ? 'selected' : ''} ${hasBet ? 'betted' : ''}`}
                        onClick={() => !hasBet && market.status === 'open' && handleSelectSelection(sel)}
                      >
                        <span className="bs-sel-name">{sel.label}</span>
                        <span className="bs-sel-odds">{formatOdds(odds.odds_numerator, odds.odds_denominator)}</span>
                        {hasBet && userBet && (
                          <span className="bs-sel-betted-label">
                            {userBet.stake} staked &middot; {userBet.potential_payout} to win
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* Bet placement drawer */}
            {selectedSelection && isLoggedIn && (() => {
              const selOdds = getOdds(selectedSelection)
              return (
                <div className="bs-drawer">
                  <div className="bs-drawer-title">Place bet</div>
                  <div className="bs-drawer-sel">
                    <span className="bs-drawer-name">{selectedSelection.label}</span>
                    <span className="bs-drawer-odds">
                      {formatOdds(selOdds.odds_numerator, selOdds.odds_denominator)}
                    </span>
                  </div>
                  <div className="bs-stake-row">
                    <input
                      className="bs-stake-input"
                      type="number"
                      min={1}
                      max={maxBet}
                      value={stakeStr}
                      placeholder={`Stake (max ${maxBet})`}
                      onChange={e => setStakeStr(e.target.value)}
                    />
                    <button
                      className="bs-place-btn"
                      onClick={handlePlaceBet}
                      disabled={isPending || !stakeStr}
                    >
                      {isPending ? 'Placing…' : 'Place bet'}
                    </button>
                  </div>
                  {stakeStr && parseInt(stakeStr, 10) > 0 && (
                    <div className="bs-payout">
                      Returns: <strong>
                        {Math.round(parseInt(stakeStr, 10) + parseInt(stakeStr, 10) * selOdds.odds_numerator / selOdds.odds_denominator).toLocaleString()}
                      </strong> credits
                    </div>
                  )}
                </div>
              )
            })()}

            {!isLoggedIn && selectedSelection && (
              <div className="bs-login-cta">
                <a href={`/auth/login?redirect=/events/${eventId}/leaderboard`}>Log in</a> to place bets
              </div>
            )}

            {errorMsg && <div className="bs-msg error">{errorMsg}</div>}
            {successMsg && <div className="bs-msg success">{successMsg}</div>}

            {/* My bets */}
            {userBets.length > 0 && (
              <>
                <div className="bs-bets-title">My bets</div>
                {userBets.map(bet => {
                  // Find the selection label
                  const sel = markets.flatMap(m => m.selections).find(s => s.id === bet.selection_id)
                  return (
                    <div key={bet.id} className="bs-bet-row">
                      <div>
                        <span style={{ fontWeight: 500, color: '#1A2E1A' }}>{sel?.label ?? '—'}</span>
                        <span style={{ color: '#6B8C6B', marginLeft: 8 }}>
                          {bet.stake} @ {formatOdds(bet.odds_numerator, bet.odds_denominator)}
                        </span>
                      </div>
                      <span className={`bs-bet-status ${bet.status}`}>
                        {bet.status === 'placed' ? 'Open' : bet.status.toUpperCase()}
                      </span>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}
      </div>
    </>
  )
}
