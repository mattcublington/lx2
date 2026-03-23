// Competition palette — four stable player colours, assigned by position.
// Index 0 = you (always), 1–3 = opponents in entry order.
export const PLAYER_COLOURS = [
  '#3a7d44',  // green  — player 1 / you
  '#2a6db5',  // blue   — player 2
  '#b85c2a',  // rust   — player 3
  '#7a3aad',  // purple — player 4
] as const

export type PlayerColour = typeof PLAYER_COLOURS[number]
