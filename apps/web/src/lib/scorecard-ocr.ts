'use server'

// Allow up to 60 seconds for OCR processing (Claude API + image analysis)
export const maxDuration = 60

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { continentForCountry } from '@/lib/countries'

// ── Types ────────────────────────────────────────────────────────────────────

export interface ExtractedHole {
  hole: number
  par: number
  si: number
  yards: number
}

export interface ExtractedTee {
  teeName: string
  teeColour: string
  courseRating: number | null
  slopeRating: number | null
  courseRatingWomen: number | null
  slopeRatingWomen: number | null
  par: number | null
  holes: ExtractedHole[]
}

export interface ExtractedCourseData {
  courseName: string
  clubName: string
  location: string | null
  distanceUnit: 'metres' | 'yards'
  tees: ExtractedTee[]
}

export interface ScorecardUploadResult {
  success: boolean
  error?: string
  uploadId?: string
  extractedData?: ExtractedCourseData
}

// ── Rate limiting ────────────────────────────────────────────────────────────

const MAX_UPLOADS_PER_DAY = 20

async function checkRateLimit(userId: string): Promise<boolean> {
  const admin = createAdminClient()
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { count } = await admin
    .from('scorecard_uploads')
    .select('*', { count: 'exact', head: true })
    .eq('uploaded_by', userId)
    .gte('created_at', todayStart.toISOString())

  return (count ?? 0) < MAX_UPLOADS_PER_DAY
}

// ── Input sanitisation (prompt injection prevention) ─────────────────────────

const MAX_FIELD_LENGTH = 100
const ALLOWED_CHARS = /^[a-zA-Z0-9\s\-'.,&()\/]+$/

function sanitiseUserInput(input: string): string {
  const trimmed = input.trim().slice(0, MAX_FIELD_LENGTH)
  if (!ALLOWED_CHARS.test(trimmed)) {
    // Strip any characters that aren't in our allowlist
    return trimmed.replace(/[^a-zA-Z0-9\s\-'.,&()\/]/g, '')
  }
  return trimmed
}

// ── Claude Vision extraction ─────────────────────────────────────────────────

async function extractScorecardData(
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp',
  userClubName: string,
  userCourseName: string,
  userCountry: string,
): Promise<ExtractedCourseData> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured')

  const anthropic = new Anthropic({ apiKey })

  // User-provided fields are passed as structured data in the system prompt,
  // separate from the instruction. The instruction itself is fixed and cannot
  // be altered by user input. The sanitised values are only used as hints —
  // Claude will override them with what it actually reads from the card.
  const response = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 16384,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: imageBase64 },
          },
          {
            type: 'text',
            text: `You are a golf scorecard data extractor. Extract structured data from this scorecard photograph.

Hints from the uploader (trust the card over these):
- Club: "${userClubName}", Course: "${userCourseName}", Country: "${userCountry}"

CRITICAL INSTRUCTIONS FOR ACCURACY:
1. The image may be ROTATED. Orient yourself by finding readable text (club name, "Hole", "Par",
   "SI") and mentally rotate so you can read it naturally before extracting ANY numbers.
2. Scorecards have ROWS (or COLUMNS) of distances, one per tee. Each tee has a different total.
   The LONGEST tee has the highest total. The SHORTEST has the lowest.
   Read ONE COMPLETE ROW AT A TIME. For each tee, trace that single row across all 18 holes.
   Do NOT jump between rows — that causes mixed-up values.
3. After extracting each tee, SUM the 9-hole and 18-hole distances and compare to the
   "Out"/"In"/"Total" printed on the card. If your sum doesn't match, re-read that row.
4. Check the EDGES and CORNERS of the card for a Course Rating / Slope Rating table.
   Common labels: "C.R/S.R", "CR/SR", "C.R.", "S.R.", "SSS", "CSS", "Slope".
   Often split into Men and Ladies rows. These are small numbers like 71.2 / 128.

Output ONLY valid JSON (no markdown, no other text):
{
  "courseName": "string",
  "clubName": "string",
  "location": "string or null",
  "distanceUnit": "'metres' or 'yards' — check for notes like 'measurements are in metres'",
  "tees": [
    {
      "teeName": "string — as printed, e.g. 'Protea', 'Blue Crane', 'Yellow'",
      "teeColour": "string — normalised: Yellow, White, Red, Blue, Green, Black, Orange, Purple",
      "courseRating": "number or null — men's CR",
      "slopeRating": "number or null — men's SR",
      "courseRatingWomen": "number or null — women's/ladies' CR",
      "slopeRatingWomen": "number or null — women's/ladies' SR",
      "par": "number or null",
      "holes": [
        { "hole": 1, "par": 4, "si": 11, "yards": 382 }
      ]
    }
  ]
}

Rules:
- Extract EVERY tee — do not skip any. Order from longest to shortest.
- "yards" field = distance in the ORIGINAL unit on the card (do NOT convert metres to yards)
- Stroke index labels: "SI", "S.I.", "Index", "Hcp"
- Omit "Out"/"In"/"Total" summary rows from holes array
- For CR/SR split by Men/Ladies: men → courseRating/slopeRating, women → courseRatingWomen/slopeRatingWomen`,
          },
        ],
      },
    ],
  })

  const textBlock = response.content.find(b => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  // Parse the JSON response, stripping any accidental markdown fencing or preamble
  let jsonStr = textBlock.text.trim()
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }
  // If the response contains text before JSON, extract just the JSON object
  const jsonStart = jsonStr.indexOf('{')
  const jsonEnd = jsonStr.lastIndexOf('}')
  if (jsonStart > 0 && jsonEnd > jsonStart) {
    jsonStr = jsonStr.slice(jsonStart, jsonEnd + 1)
  }

  let parsed: ExtractedCourseData
  try {
    parsed = JSON.parse(jsonStr) as ExtractedCourseData
  } catch {
    console.error('[scorecard-ocr] JSON parse failed. Raw response:', jsonStr.slice(0, 500))
    throw new Error('Could not read the scorecard. Please try again with a clearer photo.')
  }

  // Fall back to user-provided names if Claude returned empty strings
  if (!parsed.courseName && userCourseName) parsed.courseName = userCourseName
  if (!parsed.clubName && userClubName) parsed.clubName = userClubName

  // Basic validation
  if (!parsed.courseName && !parsed.clubName) {
    console.error('[scorecard-ocr] Extraction empty. Parsed:', JSON.stringify(parsed).slice(0, 500))
    throw new Error('Could not read the scorecard. Make sure the full card is visible and well-lit, then try again.')
  }

  if (!Array.isArray(parsed.tees) || parsed.tees.length === 0) {
    console.error('[scorecard-ocr] No tees extracted. Parsed:', JSON.stringify(parsed).slice(0, 500))
    throw new Error('Could not read hole data from the scorecard. Try a closer, straight-on photo with all holes visible.')
  }

  // Default distance unit to yards if not specified
  if (!parsed.distanceUnit) parsed.distanceUnit = 'yards'

  // Ensure women's rating fields exist (Claude may omit them from the JSON)
  for (const tee of parsed.tees) {
    if (tee.courseRatingWomen === undefined) tee.courseRatingWomen = null
    if (tee.slopeRatingWomen === undefined) tee.slopeRatingWomen = null
  }

  return parsed
}

// ── Main action (receives storage path, NOT the image file) ──────────────────

export async function processScorecard(
  storagePath: string,
  contentType: string,
  clubName: string,
  courseName: string,
  country: string,
): Promise<ScorecardUploadResult> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    // Rate limit check
    const withinLimit = await checkRateLimit(user.id)
    if (!withinLimit) {
      return { success: false, error: `You can upload up to ${MAX_UPLOADS_PER_DAY} scorecards per day. Try again tomorrow.` }
    }

    // Sanitise user-provided text fields
    const safeClubName = sanitiseUserInput(clubName)
    const safeCourseName = sanitiseUserInput(courseName)
    const safeCountry = sanitiseUserInput(country)
    const continent = safeCountry ? continentForCountry(safeCountry) : ''

    // Validate storage path format (userId/timestamp.ext)
    const pathPattern = /^[a-f0-9-]+\/\d+\.(jpg|png|webp)$/
    if (!pathPattern.test(storagePath)) {
      return { success: false, error: 'Invalid storage path' }
    }

    // Verify the file belongs to this user
    if (!storagePath.startsWith(user.id + '/')) {
      return { success: false, error: 'Unauthorized' }
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validTypes.includes(contentType)) {
      return { success: false, error: 'Image must be JPEG, PNG, or WebP' }
    }

    // Download the image from storage for OCR
    const admin = createAdminClient()
    const { data: fileData, error: downloadErr } = await admin.storage
      .from('scorecard-uploads')
      .download(storagePath)

    if (downloadErr || !fileData) {
      throw new Error(`Failed to read uploaded image: ${downloadErr?.message ?? 'unknown'}`)
    }

    // Run Claude Vision OCR
    const buffer = await fileData.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    const extracted = await extractScorecardData(
      base64,
      contentType as 'image/jpeg' | 'image/png' | 'image/webp',
      safeClubName,
      safeCourseName,
      safeCountry,
    )

    // Save the upload record
    const { data: upload, error: insertErr } = await admin
      .from('scorecard_uploads')
      .insert({
        uploaded_by: user.id,
        image_url: storagePath,
        course_name: safeCourseName || extracted.courseName,
        country: safeCountry || null,
        continent: continent || null,
        extracted_data: extracted,
        status: 'pending',
      })
      .select('id')
      .single()

    if (insertErr || !upload) {
      throw new Error(`Failed to save upload: ${insertErr?.message ?? 'unknown'}`)
    }

    return {
      success: true,
      uploadId: upload.id,
      extractedData: extracted,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    console.error('[scorecard-ocr]', message)
    return { success: false, error: message }
  }
}

// ── Signed URL helper (for reviewing uploads — bucket is private) ────────────

export async function getSignedImageUrl(storagePath: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data, error } = await admin.storage
    .from('scorecard-uploads')
    .createSignedUrl(storagePath, 3600) // 1 hour expiry
  if (error || !data) return null
  return data.signedUrl
}
