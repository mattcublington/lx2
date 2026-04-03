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
}

// ── Auth guard ───────────────────────────────────────────────────────────────

async function requireAdmin(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // is_admin added by migration 013 — cast needed until types regenerated
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

  // Batch-fetch uploader names
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

  const { data: uploader } = await admin
    .from('users')
    .select('display_name, email')
    .eq('id', data.uploaded_by as string)
    .single()

  let reviewerName: string | null = null
  if (data.reviewed_by) {
    const { data: reviewer } = await admin
      .from('users')
      .select('display_name')
      .eq('id', data.reviewed_by as string)
      .single()
    reviewerName = (reviewer?.display_name as string | null) ?? null
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
    extracted_data: (data.extracted_data as ExtractedCourseData | null) ?? null,
    uploader_name:
      (uploader?.display_name as string | null) ??
      (uploader?.email as string | null) ??
      null,
    reviewer_name: reviewerName,
  }
}

// ── Approve ──────────────────────────────────────────────────────────────────

export async function approveUpload(id: string, notes: string): Promise<void> {
  const adminId = await requireAdmin()
  const admin = createAdminClient()

  const { data: upload, error: fetchErr } = await admin
    .from('scorecard_uploads')
    .select('course_name, extracted_data')
    .eq('id', id)
    .single()

  if (fetchErr || !upload) throw new Error('Upload not found')

  const { error } = await admin
    .from('scorecard_uploads')
    .update({
      status: 'approved',
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
      review_notes: notes.trim() || null,
    })
    .eq('id', id)

  if (error) throw new Error(error.message)

  // Mark the OCR-created course as verified
  const extracted = upload.extracted_data as ExtractedCourseData | null
  const courseName = extracted?.courseName ?? (upload.course_name as string | null)
  if (courseName) {
    await admin
      .from('courses')
      .update({ verified: true })
      .eq('name', courseName)
      .eq('source', 'ocr')
      .eq('verified', false)
  }

  revalidatePath('/admin/scorecards')
  revalidatePath(`/admin/scorecards/${id}`)
}

// ── Reject ───────────────────────────────────────────────────────────────────

export async function rejectUpload(id: string, notes: string): Promise<void> {
  if (!notes.trim()) throw new Error('A rejection reason is required')

  const adminId = await requireAdmin()
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

  if (error) throw new Error(error.message)

  revalidatePath('/admin/scorecards')
  revalidatePath(`/admin/scorecards/${id}`)
}
