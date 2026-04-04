'use client'

import { useState, useRef } from 'react'
import { processScorecard } from '@/lib/scorecard-ocr'
import type { ExtractedCourseData, ExtractedTee } from '@/lib/scorecard-ocr'
import { COUNTRY_NAMES } from '@/lib/countries'
import { createClient } from '@/lib/supabase/client'

// ── Design tokens (match NewRoundWizard) ─────────────────────────────────────

const FE = {
  forestPrimary: '#1A2E1A',
  greenDark: '#0D631B',
  greenLight: '#0a4f15',
  sageBg: '#F0F4EC',
  white: '#FFFFFF',
  onPrimary: '#1A2E1A',
  onSecondary: '#44483E',
  onTertiary: '#72786E',
  shadowFloat: '0 4px 12px rgba(26, 28, 28, 0.04)',
  shadowHover: '0 6px 16px rgba(26, 28, 28, 0.08)',
  borderGhost: '1px solid rgba(26, 28, 28, 0.12)',
  gradientGreen: 'linear-gradient(135deg, #0D631B 0%, #0a4f15 100%)',
} as const

const font = {
  display: "'Manrope', sans-serif",
  body: "'Lexend', sans-serif",
} as const

// ── Types ────────────────────────────────────────────────────────────────────

type Phase = 'form' | 'uploading' | 'review'

interface Props {
  onDone: (data: ExtractedCourseData, uploadId: string) => void
  onCancel: () => void
}

// ── Image compression (resize large phone photos for faster upload) ──────────

function compressImage(file: File, maxDimension = 2400, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      if (width > maxDimension || height > maxDimension) {
        const scale = maxDimension / Math.max(width, height)
        width = Math.round(width * scale)
        height = Math.round(height * scale)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas not supported')); return }
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('Compression failed')),
        'image/jpeg',
        quality,
      )
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ScorecardUpload({ onDone, onCancel }: Props) {
  const [phase, setPhase] = useState<Phase>('form')
  const [clubName, setClubName] = useState('')
  const [courseName, setCourseName] = useState('')
  const [country, setCountry] = useState('England')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [extractedData, setExtractedData] = useState<ExtractedCourseData | null>(null)
  const [uploadId, setUploadId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const courseNameRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setError('')
    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result as string)
    reader.readAsDataURL(f)
  }

  const handleUpload = async () => {
    if (!file) return
    if (!clubName.trim()) { setError('Please enter the club name'); return }
    if (!courseName.trim()) { setError('Please enter the course name'); return }
    setError('')
    setPhase('uploading')

    try {
      // 1. Compress the image (phone photos are often 5-10MB, resize to ~1-2MB)
      const compressed = await compressImage(file)

      // 2. Upload compressed image directly to Supabase Storage from the client
      //    (bypasses Vercel's 4.5MB serverless function body limit)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Not authenticated'); setPhase('form'); return }

      const storagePath = `${user.id}/${Date.now()}.jpg`

      const { error: uploadErr } = await supabase.storage
        .from('scorecard-uploads')
        .upload(storagePath, compressed, { contentType: 'image/jpeg', upsert: false })

      if (uploadErr) { setError(`Upload failed: ${uploadErr.message}`); setPhase('form'); return }

      // 3. Call server action with just the path (tiny payload)
      const result = await processScorecard(storagePath, 'image/jpeg', clubName, courseName, country)

      if (!result.success || !result.extractedData || !result.uploadId) {
        setError(result.error ?? 'Upload failed')
        setPhase('form')
        return
      }

      setExtractedData(result.extractedData)
      setUploadId(result.uploadId)
      setPhase('review')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setError(msg.includes('timed out') || msg.includes('timeout')
        ? 'The request timed out. Please try again — it usually works on the second attempt.'
        : `Something went wrong: ${msg}`)
      setPhase('form')
    }
  }

  // ── Form phase ─────────────────────────────────────────────────────────────

  if (phase === 'form') {
    return (
      <div style={{ flex: 1, overflowY: 'auto' as const, padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <button onClick={onCancel} aria-label="Go back" style={{
            width: 40, height: 40, background: 'transparent', border: 'none', borderRadius: 12,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12 4L6 10L12 16" stroke={FE.forestPrimary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div>
            <h2 style={{ margin: 0, fontFamily: font.display, fontWeight: 700, fontSize: 22, color: FE.forestPrimary }}>
              Add a course
            </h2>
            <p style={{ margin: 0, fontFamily: font.body, fontSize: 14, color: FE.onTertiary }}>
              Photograph the scorecard and we&apos;ll do the rest
            </p>
          </div>
        </div>

        {/* Club name */}
        <label style={{ display: 'block', marginBottom: '1rem' }}>
          <span style={{ fontFamily: font.body, fontSize: 14, fontWeight: 500, color: FE.onPrimary, display: 'block', marginBottom: '0.375rem' }}>
            Club name <span style={{ color: '#dc2626' }}>*</span>
          </span>
          <input
            type="text"
            value={clubName}
            onChange={e => setClubName(e.target.value)}
            placeholder="e.g. Cumberwell Park Golf Club"
            maxLength={100}
            enterKeyHint="next"
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); courseNameRef.current?.focus() } }}
            style={{
              width: '100%', padding: '0.875rem 1rem',
              background: FE.white, border: FE.borderGhost, borderRadius: 12,
              fontFamily: font.body, fontSize: 16, color: FE.onPrimary,
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </label>

        {/* Course name */}
        <label style={{ display: 'block', marginBottom: '1rem' }}>
          <span style={{ fontFamily: font.body, fontSize: 14, fontWeight: 500, color: FE.onPrimary, display: 'block', marginBottom: '0.375rem' }}>
            Course name <span style={{ color: '#dc2626' }}>*</span>
          </span>
          <input
            ref={courseNameRef}
            type="text"
            value={courseName}
            onChange={e => setCourseName(e.target.value)}
            placeholder="e.g. Red Course"
            maxLength={100}
            enterKeyHint="done"
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur() } }}
            style={{
              width: '100%', padding: '0.875rem 1rem',
              background: FE.white, border: FE.borderGhost, borderRadius: 12,
              fontFamily: font.body, fontSize: 16, color: FE.onPrimary,
              outline: 'none', boxSizing: 'border-box',
            }}
          />
          <span style={{ fontFamily: font.body, fontSize: 12, color: FE.onTertiary, marginTop: '0.25rem', display: 'block' }}>
            If the club has multiple courses
          </span>
        </label>

        {/* Country */}
        <label style={{ display: 'block', marginBottom: '1.5rem' }}>
          <span style={{ fontFamily: font.body, fontSize: 14, fontWeight: 500, color: FE.onPrimary, display: 'block', marginBottom: '0.375rem' }}>
            Country
          </span>
          <select
            value={country}
            onChange={e => setCountry(e.target.value)}
            style={{
              width: '100%', padding: '0.75rem',
              border: FE.borderGhost, borderRadius: 12,
              fontFamily: font.body, fontSize: 15, color: FE.onPrimary,
              background: `${FE.white} url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%2372786E' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat right 0.75rem center`,
              appearance: 'none', paddingRight: '2.5rem',
              cursor: 'pointer', outline: 'none',
            }}
          >
            {COUNTRY_NAMES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>

        {/* Photo upload */}
        <div
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${preview ? FE.greenDark : 'rgba(26,28,28,0.2)'}`,
            borderRadius: 16, padding: preview ? 0 : '2rem',
            textAlign: 'center', cursor: 'pointer', overflow: 'hidden',
            background: preview ? 'transparent' : 'rgba(13, 99, 27, 0.02)',
            transition: 'all 0.2s',
          }}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- blob URL preview, not optimisable by next/image
            <img
              src={preview}
              alt="Scorecard preview"
              style={{ width: '100%', display: 'block', borderRadius: 14 }}
            />
          ) : (
            <>
              <div style={{
                width: 56, height: 56, margin: '0 auto 1rem', borderRadius: '50%',
                background: 'rgba(13, 99, 27, 0.08)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="5" width="20" height="15" rx="3" stroke={FE.greenDark} strokeWidth="1.5"/>
                  <circle cx="12" cy="12.5" r="3.5" stroke={FE.greenDark} strokeWidth="1.5"/>
                  <circle cx="17.5" cy="8" r="1" fill={FE.greenDark}/>
                </svg>
              </div>
              <p style={{ fontFamily: font.display, fontWeight: 600, fontSize: 16, color: FE.onPrimary, margin: '0 0 0.25rem' }}>
                Tap to photograph the scorecard
              </p>
              <p style={{ fontFamily: font.body, fontSize: 13, color: FE.onTertiary, margin: 0 }}>
                JPEG, PNG, or WebP up to 10 MB
              </p>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>

        {preview && (
          <button
            onClick={() => { setFile(null); setPreview(null) }}
            style={{
              fontFamily: font.body, fontSize: 13, color: FE.onTertiary,
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '0.5rem 0', display: 'block', margin: '0.5rem auto 0',
            }}
          >
            Remove photo
          </button>
        )}

        {error && (
          <div style={{
            marginTop: '1rem', padding: '0.75rem 1rem', borderRadius: 12,
            background: '#FEF2F2', border: '1px solid #FECACA',
            fontFamily: font.body, fontSize: 14, color: '#991B1B',
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || !clubName.trim() || !courseName.trim()}
          style={{
            width: '100%', padding: '1.125rem', marginTop: '1.5rem',
            background: (!file || !clubName.trim() || !courseName.trim()) ? 'rgba(26,28,28,0.12)' : FE.gradientGreen,
            color: (!file || !clubName.trim() || !courseName.trim()) ? FE.onTertiary : FE.white,
            border: 'none', borderRadius: 16,
            fontFamily: font.display, fontWeight: 700, fontSize: 16,
            cursor: (!file || !clubName.trim() || !courseName.trim()) ? 'default' : 'pointer',
            boxShadow: (!file || !clubName.trim() || !courseName.trim()) ? 'none' : '0 8px 24px rgba(13, 99, 27, 0.15)',
            transition: 'all 0.2s ease-in-out',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 16V8M12 8L9 11M12 8L15 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M20 16V18C20 19.1 19.1 20 18 20H6C4.9 20 4 19.1 4 18V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Upload &amp; extract
        </button>

        <p style={{
          fontFamily: font.body, fontSize: 12, color: FE.onTertiary,
          textAlign: 'center', marginTop: '1rem', lineHeight: 1.5,
        }}>
          Course data will be available instantly for your round.
          <br/>An admin will verify it to make it permanent.
        </p>
      </div>
    )
  }

  // ── Uploading phase ────────────────────────────────────────────────────────

  if (phase === 'uploading') {
    return (
      <div style={{ flex: 1, overflowY: 'auto' as const, padding: '3rem 1.25rem', textAlign: 'center' }}>
        <div style={{
          width: 64, height: 64, margin: '0 auto 1.5rem', borderRadius: '50%',
          background: 'rgba(13, 99, 27, 0.08)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 28, height: 28, border: '3px solid rgba(13,99,27,0.2)',
            borderTopColor: FE.greenDark, borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
        </div>
        <h2 style={{ fontFamily: font.display, fontWeight: 700, fontSize: 20, color: FE.forestPrimary, marginBottom: '0.5rem' }}>
          Reading your scorecard...
        </h2>
        <p style={{ fontFamily: font.body, fontSize: 15, color: FE.onTertiary, margin: 0, lineHeight: 1.5 }}>
          Extracting course data, tees, and hole info.
          <br/>This usually takes 5-10 seconds.
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  // ── Review phase (editable) ────────────────────────────────────────────────

  if (!extractedData || !uploadId) return null

  // Editing helpers — mutate extractedData in-place (state object)
  const updateCourseName = (val: string) => {
    setExtractedData({ ...extractedData, courseName: val.slice(0, 100) })
  }
  const updateClubName = (val: string) => {
    setExtractedData({ ...extractedData, clubName: val.slice(0, 100) })
  }
  const updateTeeRating = (teeIdx: number, field: 'courseRating' | 'slopeRating' | 'courseRatingWomen' | 'slopeRatingWomen', val: string) => {
    const num = val === '' ? null : parseFloat(val)
    if (num !== null && isNaN(num)) return
    const tees = [...extractedData.tees]
    tees[teeIdx] = { ...tees[teeIdx]!, [field]: num }
    setExtractedData({ ...extractedData, tees })
  }
  const updateHole = (teeIdx: number, holeIdx: number, field: 'par' | 'si' | 'yards', val: string) => {
    const num = parseInt(val, 10)
    if (isNaN(num) || num < 0) return
    // Clamp values to sensible ranges
    const clamped = field === 'par' ? Math.min(num, 7)
      : field === 'si' ? Math.min(num, 18)
      : Math.min(num, 700)
    const tees = [...extractedData.tees]
    const holes = [...tees[teeIdx]!.holes]
    holes[holeIdx] = { ...holes[holeIdx]!, [field]: clamped }
    tees[teeIdx] = { ...tees[teeIdx]!, holes }
    // Recalculate total par for this tee
    tees[teeIdx] = { ...tees[teeIdx]!, par: holes.reduce((s, h) => s + h.par, 0) }
    setExtractedData({ ...extractedData, tees })
  }

  const inputStyle = {
    fontFamily: font.body, fontSize: 15, color: FE.onPrimary,
    background: FE.sageBg, border: FE.borderGhost, borderRadius: 10,
    padding: '0.625rem 0.75rem', width: '100%', outline: 'none',
    boxSizing: 'border-box' as const,
  }
  const smallInputStyle = {
    ...inputStyle, fontSize: 12, padding: '0.375rem 0.25rem',
    textAlign: 'center' as const, width: '100%',
  }
  const labelStyle = {
    fontFamily: font.body, fontSize: 12, fontWeight: 500 as const,
    color: FE.onTertiary, display: 'block', marginBottom: '0.25rem',
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto' as const, padding: '1.25rem', paddingBottom: 100 }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, fontFamily: font.display, fontWeight: 700, fontSize: 22, color: FE.forestPrimary, marginBottom: '0.25rem' }}>
          Check &amp; edit
        </h2>
        <p style={{ margin: 0, fontFamily: font.body, fontSize: 14, color: FE.onTertiary }}>
          Tap any value to correct it
        </p>
      </div>

      {/* Editable course summary */}
      <div style={{
        background: FE.white, borderRadius: 16, padding: '1.25rem',
        boxShadow: FE.shadowFloat, marginBottom: '1rem',
        borderLeft: `4px solid ${FE.greenDark}`,
      }}>
        <label style={{ display: 'block', marginBottom: '0.75rem' }}>
          <span style={labelStyle}>Course name</span>
          <input type="text" value={extractedData.courseName} onChange={e => updateCourseName(e.target.value)}
            maxLength={100} style={inputStyle} />
        </label>
        <label style={{ display: 'block' }}>
          <span style={labelStyle}>Club name</span>
          <input type="text" value={extractedData.clubName} onChange={e => updateClubName(e.target.value)}
            maxLength={100} style={inputStyle} />
        </label>
      </div>

      {/* Editable tee details */}
      {extractedData.tees.map((tee: ExtractedTee, ti: number) => (
        <div key={ti} style={{
          background: FE.white, borderRadius: 16, padding: '1rem',
          boxShadow: FE.shadowFloat, marginBottom: '0.75rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <TeeSwatch colour={tee.teeColour} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: font.display, fontWeight: 600, fontSize: 16, color: FE.onPrimary }}>
                {tee.teeName} tees
              </div>
              <div style={{ fontFamily: font.body, fontSize: 13, color: FE.onTertiary }}>
                {tee.holes.length} holes · Par {tee.par ?? '–'}
              </div>
            </div>
          </div>

          {/* CR / Slope inline editors — Men */}
          <div style={{ fontFamily: font.body, fontSize: 11, fontWeight: 600, color: FE.onTertiary, marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Men</div>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <label style={{ flex: 1 }}>
              <span style={labelStyle}>Course rating</span>
              <input type="number" inputMode="decimal" step="0.1" min="50" max="90"
                value={tee.courseRating ?? ''} onChange={e => updateTeeRating(ti, 'courseRating', e.target.value)}
                placeholder="e.g. 71.2" style={inputStyle} />
            </label>
            <label style={{ flex: 1 }}>
              <span style={labelStyle}>Slope rating</span>
              <input type="number" inputMode="numeric" min="55" max="155"
                value={tee.slopeRating ?? ''} onChange={e => updateTeeRating(ti, 'slopeRating', e.target.value)}
                placeholder="e.g. 128" style={inputStyle} />
            </label>
          </div>

          {/* CR / Slope inline editors — Women */}
          <div style={{ fontFamily: font.body, fontSize: 11, fontWeight: 600, color: FE.onTertiary, marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Women</div>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <label style={{ flex: 1 }}>
              <span style={labelStyle}>Course rating</span>
              <input type="number" inputMode="decimal" step="0.1" min="50" max="90"
                value={tee.courseRatingWomen ?? ''} onChange={e => updateTeeRating(ti, 'courseRatingWomen', e.target.value)}
                placeholder="e.g. 73.5" style={inputStyle} />
            </label>
            <label style={{ flex: 1 }}>
              <span style={labelStyle}>Slope rating</span>
              <input type="number" inputMode="numeric" min="55" max="155"
                value={tee.slopeRatingWomen ?? ''} onChange={e => updateTeeRating(ti, 'slopeRatingWomen', e.target.value)}
                placeholder="e.g. 135" style={inputStyle} />
            </label>
          </div>

          {/* Editable hole grid */}
          {[tee.holes.slice(0, 9), tee.holes.slice(9, 18)].filter(g => g.length > 0).map((group, gi) => (
            <div key={gi} style={{
              display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 3,
              fontSize: 11, fontFamily: font.body, textAlign: 'center',
              ...(gi > 0 ? { marginTop: 6, borderTop: FE.borderGhost, paddingTop: 6 } : {}),
            }}>
              {group.map((h, hi) => {
                const holeIdx = gi * 9 + hi
                return (
                  <div key={h.hole}>
                    <div style={{ color: FE.onTertiary, fontWeight: 400, marginBottom: 2 }}>{h.hole}</div>
                    <input type="number" inputMode="numeric" min={3} max={7}
                      value={h.par} onChange={e => updateHole(ti, holeIdx, 'par', e.target.value)}
                      aria-label={`Hole ${h.hole} par`}
                      style={{ ...smallInputStyle, fontWeight: 600 }} />
                    <input type="number" inputMode="numeric" min={1} max={18}
                      value={h.si} onChange={e => updateHole(ti, holeIdx, 'si', e.target.value)}
                      aria-label={`Hole ${h.hole} stroke index`}
                      style={{ ...smallInputStyle, color: FE.onTertiary, marginTop: 2 }} />
                    <input type="number" inputMode="numeric" min={50} max={700}
                      value={h.yards} onChange={e => updateHole(ti, holeIdx, 'yards', e.target.value)}
                      aria-label={`Hole ${h.hole} ${extractedData.distanceUnit === 'metres' ? 'metres' : 'yards'}`}
                      style={{ ...smallInputStyle, color: FE.onTertiary, marginTop: 2 }} />
                  </div>
                )
              })}
            </div>
          ))}

          {/* Grid legend */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontFamily: font.body, fontSize: 10, color: FE.onTertiary }}>
            <span>Top = par</span>
            <span>Middle = SI</span>
            <span>Bottom = {extractedData.distanceUnit === 'metres' ? 'metres' : 'yards'}</span>
          </div>
        </div>
      ))}

      {/* Action buttons */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: FE.white, padding: '1rem 1.25rem', boxShadow: '0 -2px 8px rgba(26, 28, 28, 0.06)', zIndex: 50 }}>
        <div style={{ maxWidth: 430, margin: '0 auto', display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => { setPhase('form'); setExtractedData(null) }}
            style={{
              flex: 1, padding: '1rem', background: FE.white, border: FE.borderGhost,
              borderRadius: 16, fontFamily: font.display, fontWeight: 600, fontSize: 15,
              color: FE.onPrimary, cursor: 'pointer',
            }}
          >
            Re-upload
          </button>
          <button
            onClick={() => onDone(extractedData, uploadId)}
            style={{
              flex: 2, padding: '1rem',
              background: FE.gradientGreen, color: FE.white,
              border: 'none', borderRadius: 16,
              fontFamily: font.display, fontWeight: 700, fontSize: 15,
              cursor: 'pointer', boxShadow: '0 8px 24px rgba(13, 99, 27, 0.15)',
            }}
          >
            Use this course
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Tee colour swatch ────────────────────────────────────────────────────────

const TEE_COLOURS: Record<string, string> = {
  Yellow: '#ca8a04', White: '#f9fafb', Red: '#dc2626', Blue: '#2563eb',
  Green: '#15803d', Black: '#1f2937', Orange: '#ea580c', Purple: '#7c3aed',
}

function TeeSwatch({ colour }: { colour: string }) {
  const bg = TEE_COLOURS[colour] ?? '#9ca3af'
  const isLight = colour === 'White' || colour === 'Yellow'
  return (
    <div style={{
      width: 28, height: 28, borderRadius: 8, background: bg, flexShrink: 0,
      border: isLight ? '1px solid #d1d5db' : 'none',
    }} />
  )
}
