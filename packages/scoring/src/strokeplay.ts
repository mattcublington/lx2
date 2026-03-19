import type { StrokePlayInput, StrokePlayResult } from './types.js'

/**
 * Calculate stroke play result.
 * nR (No Return) if any hole is null.
 */
export function calculateStrokePlay(input: StrokePlayInput): StrokePlayResult {
  const { holes, grossStrokes, playingHandicap } = input

  const hasPickUp = grossStrokes.some((s) => s === null)

  if (hasPickUp) {
    return { grossTotal: null, netTotal: null, relativeToPar: null, nR: true }
  }

  const grossTotal = (grossStrokes as number[]).reduce((sum, s) => sum + s, 0)
  const netTotal = grossTotal - playingHandicap
  const coursePar = holes.reduce((sum, h) => sum + h.par, 0)

  return {
    grossTotal,
    netTotal,
    relativeToPar: netTotal - coursePar,
    nR: false,
  }
}
