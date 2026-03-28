#!/usr/bin/env tsx
/**
 * generate-courses.ts
 *
 * Reads all club JSON files in packages/course-data/ and writes
 * apps/web/src/lib/courses.ts.
 *
 * Usage:
 *   npx tsx scripts/generate-courses.ts
 *
 * Add a new course: create or edit a JSON file in packages/course-data/
 * and re-run this script. Do not hand-edit courses.ts directly.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ClubData, ClubCombination, ClubLoop } from '../packages/course-data/schema.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DATA_DIR = path.join(ROOT, 'packages', 'course-data')
const OUT_FILE = path.join(ROOT, 'apps', 'web', 'src', 'lib', 'courses.ts')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildHolesFromLoops(
  combination: ClubCombination,
  loops: Record<string, ClubLoop>,
): string {
  const frontLoop = loops[combination.front]
  const backLoop  = loops[combination.back]

  if (!frontLoop) throw new Error(`Loop "${combination.front}" not found for combination "${combination.id}"`)
  if (!backLoop)  throw new Error(`Loop "${combination.back}"  not found for combination "${combination.id}"`)

  const lines: string[] = []

  frontLoop.holes.forEach((hole, i) => {
    const si = combination.frontSI ? (combination.frontSI[i] ?? hole.si) : hole.si
    const metresPart = hole.metres !== undefined ? `, metres: ${hole.metres}` : ''
    lines.push(
      `      { num: ${String(i + 1).padStart(2)},  par: ${hole.par}, si: ${String(si).padStart(2)},  yards: ${hole.yards}${metresPart} },`
    )
  })

  backLoop.holes.forEach((hole, i) => {
    const si = combination.backSI ? (combination.backSI[i] ?? hole.si) : hole.si
    const metresPart = hole.metres !== undefined ? `, metres: ${hole.metres}` : ''
    lines.push(
      `      { num: ${String(i + 10).padStart(2)}, par: ${hole.par}, si: ${String(si).padStart(2)},  yards: ${hole.yards}${metresPart} },`
    )
  })

  return lines.join('\n')
}

function renderTeeRatings(teeRatings: Record<string, { slopeRating: number; courseRating: number }>): string {
  const entries = Object.entries(teeRatings)
    .map(([tee, r]) => `${JSON.stringify(tee)}: { slopeRating: ${r.slopeRating}, courseRating: ${r.courseRating} }`)
    .join(', ')
  return `    teeRatings: { ${entries} },`
}

function renderCombination(combo: ClubCombination, loops: Record<string, ClubLoop>, clubData: ClubData): string {
  const lines: string[] = []
  lines.push(`  {`)
  lines.push(`    id: '${combo.id}',`)
  lines.push(`    name: '${combo.name}',`)
  lines.push(`    club: '${clubData.club}',`)
  lines.push(`    location: '${clubData.location}',`)
  lines.push(`    country: '${clubData.country}',`)
  lines.push(`    continent: '${clubData.continent}',`)
  lines.push(`    slopeRating: ${combo.slopeRating}, courseRating: ${combo.courseRating}, par: ${combo.par},`)
  lines.push(`    tees: ${JSON.stringify(combo.tees)},`)
  lines.push(`    defaultRatingTee: '${combo.defaultRatingTee}',`)
  if (combo.teeRatings && Object.keys(combo.teeRatings).length > 0) {
    lines.push(renderTeeRatings(combo.teeRatings))
  }
  lines.push(`    holes: [`)
  lines.push(buildHolesFromLoops(combo, loops))
  lines.push(`    ],`)
  lines.push(`  },`)
  return lines.join('\n')
}

function renderCourse(course: NonNullable<ClubData['courses']>[number], clubData: ClubData): string {
  const lines: string[] = []
  lines.push(`  {`)
  lines.push(`    id: '${course.id}',`)
  lines.push(`    name: '${course.name}',`)
  lines.push(`    club: '${clubData.club}',`)
  lines.push(`    location: '${clubData.location}',`)
  lines.push(`    country: '${clubData.country}',`)
  lines.push(`    continent: '${clubData.continent}',`)
  lines.push(`    slopeRating: ${course.slopeRating}, courseRating: ${course.courseRating}, par: ${course.par},`)
  lines.push(`    tees: ${JSON.stringify(course.tees)},`)
  lines.push(`    defaultRatingTee: '${course.defaultRatingTee}',`)
  if (course.teeRatings && Object.keys(course.teeRatings).length > 0) {
    lines.push(renderTeeRatings(course.teeRatings))
  }
  lines.push(`    holes: [`)
  course.holes.forEach(hole => {
    const metresPart = hole.metres !== undefined ? `, metres: ${hole.metres}` : ''
    lines.push(
      `      { num: ${String(hole.par < 0 ? hole.par : hole.par).padStart(2)}, par: ${hole.par}, si: ${String(hole.si).padStart(2)},  yards: ${hole.yards}${metresPart} },`
    )
  })
  lines.push(`    ],`)
  lines.push(`  },`)
  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const jsonFiles = fs.readdirSync(DATA_DIR)
  .filter(f => f.endsWith('.json'))
  .sort()

const allCourseBlocks: string[] = []
const clubHeaders: string[] = []

for (const file of jsonFiles) {
  const filePath = path.join(DATA_DIR, file)
  const raw = fs.readFileSync(filePath, 'utf8')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- reviver removes non-standard _comment fields
  const data = JSON.parse(raw, (key, value) => key === '_comment' ? undefined : value) as ClubData

  const clubHeader =
    `  // ${'═'.repeat(72)}\n` +
    `  // ${data.club.toUpperCase()} — ${data.location}\n` +
    `  // ${'═'.repeat(72)}`
  clubHeaders.push(data.club)

  if (data.loops && data.combinations) {
    // Loop-based facility
    allCourseBlocks.push(clubHeader)
    for (const combo of data.combinations) {
      allCourseBlocks.push(renderCombination(combo, data.loops, data))
    }
  } else if (data.courses) {
    // Standard club
    allCourseBlocks.push(clubHeader)
    for (const course of data.courses) {
      allCourseBlocks.push(renderCourse(course, data))
    }
  } else {
    console.warn(`Warning: ${file} has neither loops+combinations nor courses — skipping`)
  }
}

const output = `// AUTO-GENERATED — do not edit directly.
// Source: packages/course-data/*.json
// Regenerate: npx tsx scripts/generate-courses.ts
//
// Clubs: ${clubHeaders.join(', ')}

export interface CourseHole {
  num: number
  par: number
  si: number       // stroke index (men's where separate; 0 = missing data)
  yards: number    // White/standard tee yardage
  metres?: number  // White/standard tee metres; if absent, derive from yards
}

export interface Course {
  id: string
  name: string
  club: string
  location: string
  country: string
  continent: string
  holes: CourseHole[]
  slopeRating: number
  courseRating: number
  par: number
  tees: string[]
  defaultRatingTee: string  // which tee colour the slopeRating/courseRating apply to; '' if no WHS
  // Per-tee ratings (men's). Used when combination_tees DB lookup is unavailable.
  // Keys match entries in tees[]. Only include tees with known USGA ratings.
  teeRatings?: Record<string, { slopeRating: number; courseRating: number }>
}

export const COURSES: Course[] = [
${allCourseBlocks.join('\n')}
]

export function getCourse(id: string): Course | undefined {
  return COURSES.find(c => c.id === id)
}
`

fs.writeFileSync(OUT_FILE, output, 'utf8')
console.log(`✓ Written ${OUT_FILE}`)
console.log(`  Clubs: ${clubHeaders.join(', ')}`)
