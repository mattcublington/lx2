'use client'

import { useState, useRef } from 'react'
import { uploadScorecard } from '@/lib/scorecard-ocr'
import type { ExtractedCourseData, ExtractedTee } from '@/lib/scorecard-ocr'
import { COUNTRY_NAMES } from '@/lib/countries'

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

// ── Component ────────────────────────────────────────────────────────────────

export default function ScorecardUpload({ onDone, onCancel }: Props) {
  const [phase, setPhase] = useState<Phase>('form')
  const [courseName, setCourseName] = useState('')
  const [country, setCountry] = useState('England')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [extractedData, setExtractedData] = useState<ExtractedCourseData | null>(null)
  const [uploadId, setUploadId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

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
    setError('')
    setPhase('uploading')

    const formData = new FormData()
    formData.set('image', file)
    formData.set('courseName', courseName)
    formData.set('country', country)

    const result = await uploadScorecard(formData)

    if (!result.success || !result.extractedData || !result.uploadId) {
      setError(result.error ?? 'Upload failed')
      setPhase('form')
      return
    }

    setExtractedData(result.extractedData)
    setUploadId(result.uploadId)
    setPhase('review')
  }

  // ── Form phase ─────────────────────────────────────────────────────────────

  if (phase === 'form') {
    return (
      <div style={{ padding: '1.25rem' }}>
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

        {/* Course name */}
        <label style={{ display: 'block', marginBottom: '1rem' }}>
          <span style={{ fontFamily: font.body, fontSize: 14, fontWeight: 500, color: FE.onPrimary, display: 'block', marginBottom: '0.375rem' }}>
            Course name
          </span>
          <input
            type="text"
            value={courseName}
            onChange={e => setCourseName(e.target.value)}
            placeholder="e.g. Cumberwell Park"
            maxLength={100}
            style={{
              width: '100%', padding: '0.875rem 1rem',
              background: FE.white, border: FE.borderGhost, borderRadius: 12,
              fontFamily: font.body, fontSize: 16, color: FE.onPrimary,
              outline: 'none', boxSizing: 'border-box',
            }}
          />
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
          disabled={!file}
          style={{
            width: '100%', padding: '1.125rem', marginTop: '1.5rem',
            background: !file ? 'rgba(26,28,28,0.12)' : FE.gradientGreen,
            color: !file ? FE.onTertiary : FE.white,
            border: 'none', borderRadius: 16,
            fontFamily: font.display, fontWeight: 700, fontSize: 16,
            cursor: !file ? 'default' : 'pointer',
            boxShadow: !file ? 'none' : '0 8px 24px rgba(13, 99, 27, 0.15)',
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
      <div style={{ padding: '3rem 1.25rem', textAlign: 'center' }}>
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

  // ── Review phase ───────────────────────────────────────────────────────────

  if (!extractedData || !uploadId) return null

  return (
    <div style={{ padding: '1.25rem', paddingBottom: 100 }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, fontFamily: font.display, fontWeight: 700, fontSize: 22, color: FE.forestPrimary, marginBottom: '0.25rem' }}>
          Check the details
        </h2>
        <p style={{ margin: 0, fontFamily: font.body, fontSize: 14, color: FE.onTertiary }}>
          Review what we extracted from the scorecard
        </p>
      </div>

      {/* Course summary card */}
      <div style={{
        background: FE.white, borderRadius: 16, padding: '1.25rem',
        boxShadow: FE.shadowFloat, marginBottom: '1rem',
        borderLeft: `4px solid ${FE.greenDark}`,
      }}>
        <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 18, color: FE.onPrimary, marginBottom: '0.25rem' }}>
          {extractedData.courseName}
        </div>
        <div style={{ fontFamily: font.body, fontSize: 14, color: FE.onTertiary }}>
          {extractedData.clubName}
          {extractedData.location ? ` \u00B7 ${extractedData.location}` : ''}
        </div>
      </div>

      {/* Tee details */}
      {extractedData.tees.map((tee: ExtractedTee, i: number) => (
        <div key={i} style={{
          background: FE.white, borderRadius: 16, padding: '1rem',
          boxShadow: FE.shadowFloat, marginBottom: '0.75rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <TeeSwatch colour={tee.teeColour} />
            <div>
              <div style={{ fontFamily: font.display, fontWeight: 600, fontSize: 16, color: FE.onPrimary }}>
                {tee.teeName} tees
              </div>
              <div style={{ fontFamily: font.body, fontSize: 13, color: FE.onTertiary }}>
                {tee.holes.length} holes
                {tee.par ? ` \u00B7 Par ${tee.par}` : ''}
                {tee.courseRating ? ` \u00B7 CR ${tee.courseRating}` : ''}
                {tee.slopeRating ? ` \u00B7 Slope ${tee.slopeRating}` : ''}
              </div>
            </div>
          </div>

          {/* Compact hole grid */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 2,
            fontSize: 11, fontFamily: font.body, textAlign: 'center',
          }}>
            {tee.holes.slice(0, 9).map(h => (
              <div key={h.hole} style={{ padding: '0.25rem 0' }}>
                <div style={{ color: FE.onTertiary, fontWeight: 400 }}>{h.hole}</div>
                <div style={{ color: FE.onPrimary, fontWeight: 600 }}>{h.par}</div>
                <div style={{ color: FE.onTertiary }}>{h.yards}y</div>
              </div>
            ))}
          </div>
          {tee.holes.length > 9 && (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 2,
              fontSize: 11, fontFamily: font.body, textAlign: 'center', marginTop: 4,
              borderTop: FE.borderGhost, paddingTop: 4,
            }}>
              {tee.holes.slice(9, 18).map(h => (
                <div key={h.hole} style={{ padding: '0.25rem 0' }}>
                  <div style={{ color: FE.onTertiary, fontWeight: 400 }}>{h.hole}</div>
                  <div style={{ color: FE.onPrimary, fontWeight: 600 }}>{h.par}</div>
                  <div style={{ color: FE.onTertiary }}>{h.yards}y</div>
                </div>
              ))}
            </div>
          )}
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
