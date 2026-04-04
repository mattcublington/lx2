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

IMPORTANT: The scorecard image may be rotated (landscape card photographed in portrait, or vice versa).
Mentally rotate the image so you can read the text correctly before extracting any numbers.
Read each number carefully from the card — do NOT guess or interpolate values.

The uploader has suggested the following (use as hints only — trust what you read on the card):
- Club name hint: "${userClubName}"
- Course name hint: "${userCourseName}"
- Country hint: "${userCountry}"

Before generating JSON, carefully examine the card:
1. How many distinct tee rows of distances are there? Each coloured row of numbers is a separate tee.
   Common: 3-6 tees. Some cards have more. Count carefully and extract ALL of them.
2. What unit are distances in? Look for notes like "measurements are in metres".
3. Look for Course Rating (CR) and Slope Rating (SR) — often in small print at the edges or
   corners of the card, in a separate table. Labels include: "C.R/S.R", "CR/SR", "C.R.", "S.R.",
   "SSS", "CSS", "Course Rating", "Slope". They may be split by Men/Ladies.

Output ONLY valid JSON (no markdown fencing, no other text) matching this schema:
{
  "courseName": "string",
  "clubName": "string",
  "location": "string or null",
  "distanceUnit": "'metres' or 'yards'",
  "tees": [
    {
      "teeName": "string — the name as shown on card, e.g. 'Protea', 'Blue Crane', 'Yellow'",
      "teeColour": "string — normalised: Yellow, White, Red, Blue, Green, Black, Orange, Purple",
      "courseRating": "number or null — men's CR for this tee",
      "slopeRating": "number or null — men's SR for this tee",
      "courseRatingWomen": "number or null — women's/ladies' CR for this tee",
      "slopeRatingWomen": "number or null — women's/ladies' SR for this tee",
      "par": "number or null — total par",
      "holes": [
        { "hole": 1, "par": 4, "si": 11, "yards": 382 }
      ]
    }
  ]
}

Rules:
- Extract EVERY tee. Do not skip any.
- Read each distance value directly from the card. Do NOT estimate, hallucinate, or mix up rows.
  Verify by checking that each tee's total matches the "Out"/"In"/"Total" shown on the card.
- Do NOT convert units — keep distances exactly as printed on the card.
- Stroke index may be labelled "SI", "S.I.", "Index", or "Hcp".
- Ignore "Out"/"In"/"Total" summary rows — only extract individual hole data.
- For CR/SR: if split by Men/Ladies, use courseRating+slopeRating for men,
  courseRatingWomen+slopeRatingWomen for women. If CR/SR applies to the whole course
  rather than a specific tee, attach it to the first/longest tee.`,
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
