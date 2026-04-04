import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// One-off cleanup route — delete after use
// DELETE /api/cleanup-test-uploads
export async function DELETE() {
  const admin = createAdminClient()

  // Delete all pending scorecard uploads (test data from today)
  const { data: pending } = await admin
    .from('scorecard_uploads')
    .select('id, status')
    .in('status', ['pending', 'rejected'])

  const count = pending?.length ?? 0
  if (count === 0) {
    return NextResponse.json({ ok: true, message: 'No pending/rejected uploads to delete', count: 0 })
  }

  const { error } = await admin
    .from('scorecard_uploads')
    .delete()
    .in('status', ['pending', 'rejected'])

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, count, message: `Deleted ${count} test uploads` })
}
