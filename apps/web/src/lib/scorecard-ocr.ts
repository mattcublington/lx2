'use server'

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
    model: 'claude-sonnet-4-20250514',
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
            text: `You are a golf scorecard data extractor. Extract structured data from this physical golf scorecard photograph.

The uploader has suggested the following (use as hints only — trust what you read on the card):
- Club name hint: "${userClubName}"
- Course name hint: "${userCourseName}"
- Country hint: "${userCountry}"

Extract ALL tees visible on the scorecard. For each tee, extract the hole-by-hole data.
Some scorecards have many tees (6 or more) — extract every single one. Tees may be labelled
by colour (Yellow, White, Red, Blue, Black, etc.) or by name (e.g. Protea, Championship, Medal).

Respond with ONLY valid JSON matching this exact schema (no markdown, no explanation):
{
  "courseName": "string — the course name as printed on the card",
  "clubName": "string — the club name as printed on the card",
  "location": "string or null — any location info visible on the card",
  "distanceUnit": "string — 'metres' or 'yards', based on what the card uses (check for a note like 'measurements are in metres')",
  "tees": [
    {
      "teeName": "string — e.g. 'Yellow', 'White', 'Red', 'Championship', 'Protea'",
      "teeColour": "string — normalised colour: Yellow, White, Red, Blue, Green, Black, Orange, Purple. If the tee has a name but no obvious colour, pick the closest match or use the name",
      "courseRating": "number or null — the men's course rating (CR) for this tee if visible",
      "slopeRating": "number or null — the men's slope rating (SR) for this tee if visible",
      "courseRatingWomen": "number or null — the women's/ladies' course rating if visible",
      "slopeRatingWomen": "number or null — the women's/ladies' slope rating if visible",
      "par": "number or null — total par for this tee if visible",
      "holes": [
        {
          "hole": "number — hole number 1-18",
          "par": "number — par for this hole",
          "si": "number — stroke index",
          "yards": "number — distance from this tee IN THE ORIGINAL UNIT shown on the card (do NOT convert metres to yards)"
        }
      ]
    }
  ]
}

Rules:
- Extract EVERY tee visible — do not stop at 5. Some scorecards have 6-8 tees.
- Tees are often shown as coloured rows/columns of distances. Each distinct row of distances is a separate tee.
- CRITICAL: Look very carefully for Course Rating (CR) and Slope Rating (SR/Slope).
  These are often in a SEPARATE TABLE or FOOTER at the bottom/corner of the scorecard.
  Common labels: "C.R/S.R", "CR/SR", "C.R.", "S.R.", "SSS", "CSS", "Course Rating",
  "Standard Scratch", "Slope". They may be in very small print at the edges of the card.
  Look at ALL four corners and edges. On this card, check the bottom-right corner especially.
- CR/SR values are often shown PER TEE with separate rows for Men and Ladies/Women.
  Look for rows labelled "Men"/"Ladies", "M"/"L", "Gentlemen"/"Ladies".
  Put men's values in courseRating/slopeRating, women's in courseRatingWomen/slopeRatingWomen.
  If CR/SR is shown as a single table (not per-tee), apply it to the most likely tee
  (usually the championship or primary tee).
- If only one set of CR/SR is shown (no gender split), put it in courseRating/slopeRating
  and set women's fields to null
- If CR/SR is genuinely not visible anywhere on the card, use null
- Do NOT convert metres to yards — keep the original distances as printed on the card
- Stroke index is sometimes labelled "SI", "S.I.", "Index", or "Hcp"
- Total distance rows ("Out", "In", "Total") should be ignored for hole data but used to verify
- Return ONLY the JSON object, no other text`,
          },
        ],
      },
    ],
  })

  const textBlock = response.content.find(b => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  // Parse the JSON response, stripping any accidental markdown fencing
  let jsonStr = textBlock.text.trim()
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
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
