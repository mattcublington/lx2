// ─── @lx2/predictions — Virtual currency betting engine for golf events ──────

export type {
  PlayerForm,
  OddsConfig,
  FractionalOdds,
  SelectionOdds,
  MarketOdds,
  OverUnderMarket,
  OverUnderSelection,
} from './types'

export {
  STABLEFORD_HOLE_VARIANCE,
  BASE_POINTS_PER_HOLE,
} from './types'

export {
  erf,
  normalCdf,
  probABeatsB,
} from './math'

export {
  calculateWinProbabilities,
  generateOutrightMarket,
  generateH2HMarket,
  generateTop3Market,
  generateLastPlaceMarket,
  generateOverUnderMarket,
  generateAllMarkets,
  probabilityToFractionalOdds,
  fractionalToDecimal,
} from './odds'

export type {
  BetToSettle,
  SelectionResult,
  SettledBet,
} from './settlement'

export {
  calculatePayout,
  settleBets,
  calculateDeadHeatDivisor,
  resolveOutrightResults,
  resolveTop3Results,
  resolveLastPlaceResults,
  resolveH2HResult,
} from './settlement'
