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
  par: number | null
  holes: ExtractedHole[]
}

export interface ExtractedCourseData {
  courseName: string
  clubName: string
  location: string | null
  tees: ExtractedTee[]
}

export interface ScorecardUploadResult {
  success: boolean
  error?: string
  uploadId?: string
  extractedData?: ExtractedCourseData
}

// ── Rate limiting ────────────────────────────────────────────────────────────

const MAX_UPLOADS_PER_DAY = 5

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
    max_tokens: 4096,
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

Respond with ONLY valid JSON matching this exact schema (no markdown, no explanation):
{
  "courseName": "string — the course name as printed on the card",
  "clubName": "string — the club name as printed on the card",
  "location": "string or null — any location info visible on the card",
  "tees": [
    {
      "teeName": "string — e.g. 'Yellow', 'White', 'Red'",
      "teeColour": "string — normalised colour: Yellow, White, Red, Blue, Green, Black, Orange, Purple",
      "courseRating": "number or null — the course rating for this tee if visible",
      "slopeRating": "number or null — the slope rating for this tee if visible",
      "par": "number or null — total par for this tee if visible",
      "holes": [
        {
          "hole": "number — hole number 1-18",
          "par": "number — par for this hole",
          "si": "number — stroke index",
          "yards": "number — yardage from this tee"
        }
      ]
    }
  ]
}

Rules:
- Extract EVERY tee colour visible (there are often 3-5 tees on a scorecard)
- If course rating or slope rating is not visible for a tee, use null
- If yardage is in metres, convert to yards (multiply by 1.094 and round)
- Stroke index is sometimes labelled "SI", "S.I.", "Index", or "Hcp"
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

  const parsed = JSON.parse(jsonStr) as ExtractedCourseData

  // Basic validation
  if (!parsed.courseName || !Array.isArray(parsed.tees) || parsed.tees.length === 0) {
    throw new Error('Could not extract valid course data from the scorecard image')
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
