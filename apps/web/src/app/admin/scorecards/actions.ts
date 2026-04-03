'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ExtractedCourseData } from '@/lib/scorecard-ocr'

// ── Types ────────────────────────────────────────────────────────────────────

export interface UploadRow {
  id: string
  course_name: string | null
  country: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  uploader_name: string | null
  extracted_course_name: string | null
  tee_count: number
}

export interface DuplicateCandidate {
  id: string
  name: string
  club: string | null
  verified: boolean
  source: string
}

export interface UploadDetail {
  id: string
  image_url: string
  course_name: string | null
  country: string | null
  continent: string | null
  status: 'pending' | 'approved' | 'rejected'
  reviewed_by: string | null
  reviewed_at: string | null
  review_notes: string | null
  course_id: string | null
  created_at: string
  extracted_data: ExtractedCourseData | null
  uploader_name: string | null
  reviewer_name: string | null
  duplicate_candidates: DuplicateCandidate[]
}

export interface ActionResult {
  ok: boolean
  error?: string
}

// ── Auth guard ───────────────────────────────────────────────────────────────

async function requireAdmin(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!(profile as { is_admin?: boolean } | null)?.is_admin) {
    throw new Error('Not authorized')
  }

  return user.id
}

// ── List uploads ─────────────────────────────────────────────────────────────

export async function listUploads(status?: 'pending' | 'approved' | 'rejected'): Promise<UploadRow[]> {
  await requireAdmin()
  const admin = createAdminClient()

  const query = admin
    .from('scorecard_uploads')
    .select('id, course_name, country, status, created_at, uploaded_by, extracted_data')
    .order('created_at', { ascending: false })

  const { data, error } = status
    ? await query.eq('status', status)
    : await query

  if (error) throw new Error(error.message)
  const rows = data ?? []

  const uploaderIds = [...new Set(rows.map(r => r.uploaded_by as string))]
  const { data: uploaders } = uploaderIds.length
    ? await admin.from('users').select('id, display_name').in('id', uploaderIds)
    : { data: [] }

  const nameMap = Object.fromEntries(
    (uploaders ?? []).map(u => [u.id as string, u.display_name as string | null])
  )

  return rows.map(r => {
    const extracted = r.extracted_data as ExtractedCourseData | null
    return {
      id: r.id as string,
      course_name: r.course_name as string | null,
      country: r.country as string | null,
      status: r.status as 'pending' | 'approved' | 'rejected',
      created_at: r.created_at as string,
      uploader_name: nameMap[r.uploaded_by as string] ?? null,
      extracted_course_name: extracted?.courseName ?? null,
      tee_count: extracted?.tees?.length ?? 0,
    }
  })
}

// ── Get single upload ────────────────────────────────────────────────────────

export async function getUploadDetail(id: string): Promise<UploadDetail | null> {
  await requireAdmin()
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('scorecard_uploads')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return null

  const [uploaderResult, reviewerResult] = await Promise.all([
    admin.from('users').select('display_name, email').eq('id', data.uploaded_by as string).single(),
    data.reviewed_by
      ? admin.from('users').select('display_name').eq('id', data.reviewed_by as string).single()
      : Promise.resolve({ data: null }),
  ])

  const extracted = (data.extracted_data as ExtractedCourseData | null) ?? null
  const searchName = extracted?.courseName ?? (data.course_name as string | null) ?? ''

  // Find potential duplicate courses in the database
  const duplicateCandidates: DuplicateCandidate[] = []
  if (searchName) {
    // Search by trigram-style: split words and look for overlap
    const words = searchName.split(/\s+/).filter(w => w.length > 3)
    const searchTerms = [searchName, ...words].slice(0, 3)

    const results = await Promise.all(
      searchTerms.map(term =>
        admin
          .from('courses')
          .select('id, name, club, verified, source')
          .ilike('name', `%${term}%`)
          .limit(5)
      )
    )

    const seen = new Set<string>()
    for (const { data: courses } of results) {
      for (const c of courses ?? []) {
        if (!seen.has(c.id as string)) {
          seen.add(c.id as string)
          duplicateCandidates.push({
            id: c.id as string,
            name: c.name as string,
            club: c.club as string | null,
            verified: c.verified as boolean,
            source: c.source as string,
          })
        }
      }
    }
  }

  return {
    id: data.id as string,
    image_url: data.image_url as string,
    course_name: data.course_name as string | null,
    country: data.country as string | null,
    continent: data.continent as string | null,
    status: data.status as 'pending' | 'approved' | 'rejected',
    reviewed_by: data.reviewed_by as string | null,
    reviewed_at: data.reviewed_at as string | null,
    review_notes: data.review_notes as string | null,
    course_id: data.course_id as string | null,
    created_at: data.created_at as string,
    extracted_data: extracted,
    uploader_name:
      (uploaderResult.data?.display_name as string | null) ??
      (uploaderResult.data?.email as string | null) ??
      null,
    reviewer_name: (reviewerResult.data?.display_name as string | null) ?? null,
    duplicate_candidates: duplicateCandidates,
  }
}

// ── Approve ──────────────────────────────────────────────────────────────────

export async function approveUpload(id: string, notes: string): Promise<ActionResult> {
  let adminId: string
  try { adminId = await requireAdmin() } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Not authorized' }
  }

  const admin = createAdminClient()

  // Fetch full upload — we need uploader + geo for the course row
  const { data: upload, error: fetchErr } = await admin
    .from('scorecard_uploads')
    .select('course_name, extracted_data, uploaded_by, country, continent')
    .eq('id', id)
    .single()

  if (fetchErr || !upload) return { ok: false, error: 'Upload not found' }

  // Mark upload as approved
  const { error: approveErr } = await admin
    .from('scorecard_uploads')
    .update({
      status: 'approved',
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
      review_notes: notes.trim() || null,
    })
    .eq('id', id)

  if (approveErr) return { ok: false, error: approveErr.message }

  // ── Persist course to the main database ──────────────────────────────────
  const extracted = upload.extracted_data as ExtractedCourseData | null
  const courseName = extracted?.courseName ?? (upload.course_name as string | null)

  if (courseName && extracted?.tees?.length) {
    const tees = extracted.tees

    // Use the tee with the most holes as the primary reference
    const primaryTee = tees.reduce((best, t) =>
      t.holes.length >= best.holes.length ? t : best
    )
    const holeCount = primaryTee.holes.length
    const sumPar = primaryTee.holes.reduce((s, h) => s + (h.par ?? 0), 0)
    const totalPar = (primaryTee.par ?? sumPar) || null

    // 1. Upsert the course row (unique on name)
    const { data: course, error: courseErr } = await admin
      .from('courses')
      .upsert({
        name: courseName,
        club: extracted.clubName ?? null,
        location: extracted.location ?? (upload.country as string | null) ?? null,
        holes_count: holeCount,
        source: 'ocr',
        verified: true,
        submitted_by: upload.uploaded_by as string,
        country: upload.country as string | null,
        continent: upload.continent as string | null,
        slope_rating: primaryTee.slopeRating ?? null,
        course_rating: primaryTee.courseRating ?? null,
        par: totalPar,
      }, { onConflict: 'name' })
      .select('id')
      .single()

    if (courseErr) return { ok: false, error: `Course upsert failed: ${courseErr.message}` }
    const courseId = course.id as string

    // 2. Upsert course_holes — par + stroke_index per hole (from primary tee)
    const holeRows = primaryTee.holes
      .filter(h => h.par != null && h.si != null)
      .map(h => ({
        course_id: courseId,
        hole_number: h.hole,
        par: h.par as number,
        stroke_index: h.si as number,
      }))

    if (holeRows.length > 0) {
      const { error: holesErr } = await admin
        .from('course_holes')
        .upsert(holeRows, { onConflict: 'course_id,hole_number' })
      if (holesErr) return { ok: false, error: `Holes upsert failed: ${holesErr.message}` }
    }

    // 3. Upsert course_tees — one row per extracted tee colour
    for (const tee of tees) {
      const yardages = tee.holes
        .slice()
        .sort((a, b) => a.hole - b.hole)
        .map(h => h.yards)
        .filter((y): y is number => y != null)

      if (yardages.length === 0) continue

      const { error: teeErr } = await admin
        .from('course_tees')
        .upsert({
          course_id: courseId,
          tee_name: tee.teeName,
          yardages,
          total_yards: yardages.reduce((s, y) => s + y, 0),
          slope_rating: tee.slopeRating ?? null,
          course_rating: tee.courseRating ?? null,
        }, { onConflict: 'course_id,tee_name' })
      if (teeErr) return { ok: false, error: `Tee upsert failed (${tee.teeName}): ${teeErr.message}` }
    }

    // 4. Link the upload row back to the course
    await admin
      .from('scorecard_uploads')
      .update({ course_id: courseId })
      .eq('id', id)
  }

  revalidatePath('/admin/scorecards')
  revalidatePath(`/admin/scorecards/${id}`)
  return { ok: true }
}

// ── Reject ───────────────────────────────────────────────────────────────────

export async function rejectUpload(id: string, notes: string): Promise<ActionResult> {
  if (!notes.trim()) return { ok: false, error: 'A rejection reason is required' }

  let adminId: string
  try { adminId = await requireAdmin() } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Not authorized' }
  }

  const admin = createAdminClient()

  const { error } = await admin
    .from('scorecard_uploads')
    .update({
      status: 'rejected',
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
      review_notes: notes.trim(),
    })
    .eq('id', id)

  if (error) return { ok: false, error: error.message }

  revalidatePath('/admin/scorecards')
  revalidatePath(`/admin/scorecards/${id}`)
  return { ok: true }
}

// ── Delete single upload ─────────────────────────────────────────────────────

export async function deleteUpload(id: string): Promise<ActionResult> {
  try { await requireAdmin() } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Not authorized' }
  }

  const admin = createAdminClient()

  // Only allow deleting rejected uploads
  const { data: upload } = await admin
    .from('scorecard_uploads')
    .select('status, image_url')
    .eq('id', id)
    .single()

  if (!upload) return { ok: false, error: 'Upload not found' }
  if ((upload.status as string) !== 'rejected') {
    return { ok: false, error: 'Only rejected uploads can be deleted' }
  }

  const { error } = await admin
    .from('scorecard_uploads')
    .delete()
    .eq('id', id)

  if (error) return { ok: false, error: error.message }

  revalidatePath('/admin/scorecards')
  return { ok: true }
}

// ── Delete all rejected ───────────────────────────────────────────────────────

export async function deleteAllRejected(): Promise<ActionResult & { count?: number }> {
  try { await requireAdmin() } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Not authorized' }
  }

  const admin = createAdminClient()

  const { data: rejected } = await admin
    .from('scorecard_uploads')
    .select('id')
    .eq('status', 'rejected')

  const count = rejected?.length ?? 0
  if (count === 0) return { ok: true, count: 0 }

  const { error } = await admin
    .from('scorecard_uploads')
    .delete()
    .eq('status', 'rejected')

  if (error) return { ok: false, error: error.message }

  revalidatePath('/admin/scorecards')
  return { ok: true, count }
}

// ── Edit extracted data ───────────────────────────────────────────────────────

export async function updateUploadData(
  id: string,
  patch: { course_name?: string; extracted_data?: ExtractedCourseData }
): Promise<ActionResult> {
  try { await requireAdmin() } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Not authorized' }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('scorecard_uploads')
    .update(patch)
    .eq('id', id)

  if (error) return { ok: false, error: error.message }

  revalidatePath(`/admin/scorecards/${id}`)
  return { ok: true }
}
