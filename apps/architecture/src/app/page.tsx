'use client'
import LX2Architecture from './LX2Architecture'

export default function ArchitecturePage() {
  return (
    <div className="min-h-screen" style={{ background: '#fafaf9' }}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-baseline gap-3 mb-6">
          <h1 className="text-2xl font-medium">
            LX<span style={{ color: '#1D9E75' }}>2</span>
          </h1>
          <span className="text-sm text-gray-400">Platform architecture</span>
        </div>
        <LX2Architecture />
      </div>
    </div>
  )
}
