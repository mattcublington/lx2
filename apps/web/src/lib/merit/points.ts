export interface MeritPlayerStanding {
  userId: string
  displayName: string
  position: number
}

export interface MeritEventResult {
  entryId: string
  multiplier: number
  standings: MeritPlayerStanding[]
}

export interface MeritConfig {
  pointsTemplate: Record<string, number>
  participationPoints: number
  bestOf: number | null
}

export interface MeritStanding {
  userId: string
  displayName: string
  eventPoints: Record<string, number>
  total: number
  wins: number
  position: number
}

function lookupPoints(template: Record<string, number>, position: number): number {
  const key = String(position)
  if (key in template) return template[key]!
  if ('default' in template) return template['default']!
  return 0
}

export function computeMeritStandings(
  events: MeritEventResult[],
  config: MeritConfig,
): MeritStanding[] {
  if (events.length === 0) return []

  const playerMap = new Map<string, {
    displayName: string
    eventPoints: Map<string, number>
    allPoints: number[]
    wins: number
    secondPlaces: number
  }>()

  for (const event of events) {
    for (const player of event.standings) {
      if (!playerMap.has(player.userId)) {
        playerMap.set(player.userId, {
          displayName: player.displayName,
          eventPoints: new Map(),
          allPoints: [],
          wins: 0,
          secondPlaces: 0,
        })
      }

      const entry = playerMap.get(player.userId)!
      const basePoints = lookupPoints(config.pointsTemplate, player.position)
      // Multiplier applies only to position-based points, NOT participation
      const points = Math.round(basePoints * event.multiplier) + config.participationPoints
      entry.eventPoints.set(event.entryId, points)
      entry.allPoints.push(points)

      if (player.position === 1) entry.wins++
      if (player.position === 2) entry.secondPlaces++
    }
  }

  const standings: MeritStanding[] = []

  for (const [userId, data] of playerMap) {
    const sorted = [...data.allPoints].sort((a, b) => b - a)
    const counted = config.bestOf
      ? sorted.slice(0, Math.min(config.bestOf, sorted.length))
      : sorted

    const total = counted.reduce((s, v) => s + v, 0)

    const eventPointsObj: Record<string, number> = {}
    for (const [entryId, pts] of data.eventPoints) {
      eventPointsObj[entryId] = pts
    }

    standings.push({
      userId,
      displayName: data.displayName,
      eventPoints: eventPointsObj,
      total,
      wins: data.wins,
      position: 0,
    })
  }

  // Sort: highest total → most wins → most 2nd places → alphabetical
  standings.sort((a, b) => {
    if (a.total !== b.total) return b.total - a.total
    if (a.wins !== b.wins) return b.wins - a.wins
    const aSeconds = playerMap.get(a.userId)!.secondPlaces
    const bSeconds = playerMap.get(b.userId)!.secondPlaces
    if (aSeconds !== bSeconds) return bSeconds - aSeconds
    return a.displayName.localeCompare(b.displayName)
  })

  standings.forEach((s, i) => { s.position = i + 1 })

  return standings
}
