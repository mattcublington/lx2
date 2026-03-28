'use client'

import { useState, useTransition, useRef } from 'react'
import Link from 'next/link'
import { importCourseJson, type ImportResult } from './actions'

export default function ImportClient() {
  const [json, setJson]         = useState('')
  const [result, setResult]     = useState<ImportResult | null>(null)
  const [isPending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setJson(ev.target?.result as string)
    reader.readAsText(file)
  }

  const handleImport = () => {
    if (!json.trim()) return
    setResult(null)
    startTransition(async () => {
      const res = await importCourseJson(json)
      setResult(res)
    })
  }

  return (
    <div style={{ padding: 32, maxWidth: 800 }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/courses" style={{ color: '#64748B', fontSize: 13, textDecoration: 'none' }}>
          ← Courses
        </Link>
      </div>

      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px' }}>Import Course JSON</h1>
      <p style={{ color: '#94A3B8', fontSize: 14, margin: '0 0 32px' }}>
        Paste or upload a club JSON file following the{' '}
        <code style={{ background: '#1E293B', padding: '2px 6px', borderRadius: 4 }}>packages/course-data/schema.ts</code>{' '}
        format. Both loop-based (27-hole) and flat 18-hole formats are supported.
      </p>

      {/* File upload */}
      <div style={{ marginBottom: 16 }}>
        <label
          htmlFor="json-file"
          style={{
            display: 'inline-block', background: '#1E293B', border: '1px solid #334155',
            borderRadius: 8, padding: '8px 16px', fontSize: 14, cursor: 'pointer', color: '#CBD5E1',
          }}
        >
          Choose file…
        </label>
        <input
          id="json-file"
          ref={fileRef}
          type="file"
          accept=".json"
          onChange={handleFile}
          style={{ display: 'none' }}
        />
        <span style={{ marginLeft: 12, fontSize: 13, color: '#64748B' }}>
          {json ? `${Math.round(json.length / 1024)}KB loaded` : 'No file selected'}
        </span>
      </div>

      {/* Text area */}
      <textarea
        value={json}
        onChange={e => setJson(e.target.value)}
        placeholder={'{\n  "club": "My Golf Club",\n  "location": "...",\n  ...\n}'}
        style={{
          width: '100%', minHeight: 300, background: '#0F172A', border: '1px solid #334155',
          borderRadius: 10, padding: 16, color: '#F1F5F9', fontFamily: 'monospace', fontSize: 13,
          resize: 'vertical', boxSizing: 'border-box',
        }}
        spellCheck={false}
      />

      {/* Result */}
      {result && (
        <div style={{
          marginTop: 16, padding: '12px 16px', borderRadius: 8,
          background: result.success ? '#052e16' : '#450a0a',
          border: `1px solid ${result.success ? '#166534' : '#991b1b'}`,
          color: result.success ? '#4ADE80' : '#F87171',
        }}>
          <div style={{ fontWeight: 600, marginBottom: result.coursesImported ? 8 : 0 }}>
            {result.message}
          </div>
          {result.coursesImported && (
            <ul style={{ margin: 0, padding: '0 0 0 20px', fontSize: 13, color: '#86EFAC' }}>
              {result.coursesImported.map(name => <li key={name}>{name}</li>)}
            </ul>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <button
          onClick={handleImport}
          disabled={isPending || !json.trim()}
          style={{
            background: isPending || !json.trim() ? '#334155' : '#3B82F6',
            color: '#fff', border: 'none', borderRadius: 8,
            padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: isPending || !json.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          {isPending ? 'Importing…' : 'Import'}
        </button>
        <button
          onClick={() => { setJson(''); setResult(null); if (fileRef.current) fileRef.current.value = '' }}
          style={{
            background: 'transparent', color: '#64748B', border: '1px solid #334155',
            borderRadius: 8, padding: '10px 24px', fontSize: 14, cursor: 'pointer',
          }}
        >
          Clear
        </button>
      </div>

      {/* Format guide */}
      <details style={{ marginTop: 40 }}>
        <summary style={{ color: '#64748B', cursor: 'pointer', fontSize: 14, userSelect: 'none' }}>
          JSON format reference
        </summary>
        <pre style={{
          marginTop: 12, background: '#0F172A', border: '1px solid #334155',
          borderRadius: 8, padding: 16, fontSize: 12, color: '#94A3B8', overflow: 'auto',
        }}>
{`// Loop-based facility (e.g. 27-hole)
{
  "club": "Royal Canberra Golf Club",
  "location": "Yarralumla, ACT",
  "country": "Australia",
  "continent": "Oceania",
  "loops": {
    "a": { "holes": [ { "par": 5, "si": 11, "yards": 492, "metres": 506 }, ... ] },
    "b": { "holes": [ ... ] }
  },
  "combinations": [
    {
      "id": "royal-canberra-westbourne",
      "name": "Royal Canberra — Westbourne",
      "front": "a", "back": "b",
      "par": 72,
      "tees": ["Blue", "White", "Red"],
      "defaultRatingTee": "White",
      "slopeRating": 121, "courseRating": 71.6,
      "teeRatings": {
        "Blue":  { "slopeRating": 123, "courseRating": 73.1 },
        "White": { "slopeRating": 121, "courseRating": 71.6 }
      },
      "backSI": [8, 16, 2, 12, 4, 18, 6, 14, 10]
    }
  ]
}

// Standard 18-hole club
{
  "club": "St Andrews Links",
  "location": "St Andrews, Fife",
  "country": "Scotland",
  "continent": "Europe",
  "courses": [
    {
      "id": "st-andrews-old",
      "name": "St Andrews — Old Course",
      "par": 72, "slopeRating": 133, "courseRating": 73.1,
      "tees": ["White", "Yellow", "Red"],
      "defaultRatingTee": "White",
      "holes": [ { "par": 4, "si": 9, "yards": 376 }, ... ]
    }
  ]
}`}
        </pre>
      </details>
    </div>
  )
}
