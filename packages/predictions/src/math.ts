// ─── Mathematical utilities for the odds engine ──────────────────────────────

/**
 * Error function approximation (Abramowitz & Stegun 7.1.26).
 * Accurate to ~1.5×10⁻⁷ — more than sufficient for odds calculation.
 */
export function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1
  const a = Math.abs(x)

  const t = 1.0 / (1.0 + 0.3275911 * a)
  const y =
    1.0 -
    (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-a * a)

  return sign * y
}

/**
 * Standard normal CDF: Φ(x) = P(Z ≤ x)
 */
export function normalCdf(x: number): number {
  return 0.5 * (1.0 + erf(x / Math.SQRT2))
}

/**
 * Probability that player A beats player B given:
 * - gap: expected score difference (A - B), positive means A is favoured
 * - varianceA: remaining scoring variance for A
 * - varianceB: remaining scoring variance for B
 *
 * Uses: P(A > B) = Φ(gap / √(varA + varB))
 */
export function probABeatsB(
  gap: number,
  varianceA: number,
  varianceB: number,
): number {
  const totalVar = varianceA + varianceB
  if (totalVar <= 0) return gap > 0 ? 1.0 : gap < 0 ? 0.0 : 0.5
  return normalCdf(gap / Math.sqrt(totalVar))
}
